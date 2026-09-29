/**
 * PII separation and anonymisation. Deterministic, local, no AI involved.
 *
 * extractPII()      pulls name / email / phone out of the raw CV text for separate storage.
 * anonymise()       returns the CV with direct identifiers removed. This is the ONLY text Gemini sees.
 * findPIILeaks()    a hard gate run before any Gemini call; any hit blocks the call.
 */

export interface ExtractedPII {
  candidate_name: string | null;
  candidate_email: string | null;
  candidate_phone: string | null;
  location_hint: string | null;
}

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const HAS_EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
// Links take the whole token they sit in: PDF text layers often glue a link's label onto it
// ("riya-shah-pmlinkedin.com/in/riya-shah-pm"), so there is no word boundary to anchor on.
const URL_RE = /[^\s()<>[\]]*?(?:https?:\/\/|www\.)[^\s)>\]]+/gi;
const PROFILE_RE =
  /[^\s()<>[\]]*?(?:linkedin\.com|github\.com|gitlab\.com|behance\.net|dribbble\.com|medium\.com|twitter\.com|x\.com|instagram\.com|facebook\.com|about\.me|wa\.me|t\.me)(?:\/[^\s)>\]]*)?/gi;
const BARE_DOMAIN_RE = /\b[a-z0-9-]+(?:\.[a-z0-9-]+)*\.(?:me|dev|io|site|xyz|page)(?:\/[^\s)>\]]*)?\b/gi;
const PHONE_CANDIDATE_RE = /(?<![\w+])(\+?\d[\d\s().-]{7,18}\d)(?!\w)/g;
// A number printed twice with no separator ("+91 98765 4321098765 43210"). Same line only.
const LONG_DIGIT_RUN_RE = /(?<![\w+])\+?\d[\d \t().-]{16,38}\d(?!\w)/g;
const REPEATED_NUMBER_RE = /(\d{10,12})\d{0,3}\1/;
// Text layers also repeat header items ("Riya ShahRIYA SHAH"); the backreference is case-insensitive.
const GLUED_REPEAT_RE = /(^|[\s|•·,])([A-Za-z][A-Za-z .'’-]{2,40}?)[ \t]*\2(?![A-Za-z])/gim;
// A name-like phrase printed twice at the start of a line ("Riya ShahRIYA SHAH"). Templates double
// their name heading in the text layer, so this outranks any name-like line near the top.
const DOUBLED_NAME_RE = /^\s*([A-Za-z][A-Za-z'’.-]*(?:[ \t]+[A-Za-z][A-Za-z'’.-]*){1,3})[ \t]*\1(?![A-Za-z])/i;
const SLUG_NON_NAME = new Set(["pm", "spm", "apm", "product", "manager", "mba", "profile", "official", "cv", "resume", "india", "dev", "engineer"]);
const TITLE_RE = /^(?:mr|mrs|ms|miss|dr|shri|smt|kumari)\.?\s+/i;

const PERSONAL_LABELS = [
  "date of birth", "dob", "d.o.b", "born", "age", "gender", "sex", "marital status", "married", "nationality",
  "religion", "caste", "category", "father's name", "fathers name", "father name", "mother's name", "mother name",
  "spouse", "husband", "wife", "children", "passport", "passport no", "aadhaar", "aadhar", "pan", "pan no",
  "blood group", "health", "disability", "height", "weight", "photo", "photograph", "languages known",
  "hobbies", "permanent address", "current address", "residential address", "address", "residence",
  "home", "email", "e-mail", "mail", "phone", "mobile", "mob", "cell", "tel", "telephone", "contact",
  "contact no", "whatsapp", "linkedin", "github", "portfolio", "website", "skype", "name", "full name",
];

const CITIES = [
  "Mumbai", "Navi Mumbai", "Thane", "Bombay", "Pune", "Bengaluru", "Bangalore", "Delhi", "New Delhi", "Gurugram",
  "Gurgaon", "Noida", "Hyderabad", "Chennai", "Kolkata", "Ahmedabad", "Jaipur", "Surat", "Indore", "Kochi",
  "Chandigarh", "Lucknow", "Nagpur", "Goa", "Coimbatore", "Vadodara", "Bhopal", "Visakhapatnam",
  "Dubai", "Singapore", "London", "San Francisco", "New York", "Berlin", "Remote",
];

const HEADING_WORDS = new Set(
  (
    "resume curriculum vitae cv profile summary experience education skills product manager senior engineer " +
    "contact objective projects certifications languages references work professional about career key " +
    "achievements personal details information india page lead head director analyst associate consultant " +
    "developer designer owner founder intern technical core competencies employment history tools interests " +
    "responsibilities overview highlights"
  ).split(" "),
);

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const digitsOf = (s: string) => s.replace(/\D/g, "");

function titleCase(s: string) {
  return s
    .toLowerCase()
    .split(/\s+/)
    .map((w) => w.replace(/(^|[-'’])([a-z])/g, (_, p, c) => p + c.toUpperCase()))
    .join(" ");
}

/** Collapses header items a PDF text layer printed twice with no separator. */
export function unglueRepeats(text: string): string {
  return text.replace(GLUED_REPEAT_RE, "$1$2");
}

/** Phone-looking digit runs: 10–13 digits (or one number printed twice), not a year range or date. */
export function findPhones(text: string): string[] {
  const out: string[] = [];
  for (const m of text.matchAll(LONG_DIGIT_RUN_RE)) {
    if (REPEATED_NUMBER_RE.test(digitsOf(m[0]))) out.push(m[0].trim());
  }
  for (const m of text.matchAll(PHONE_CANDIDATE_RE)) {
    const raw = m[1].trim();
    if (out.some((o) => o.includes(raw))) continue;
    const d = digitsOf(raw);
    if (d.length < 10 || d.length > 13) continue;
    if (/^(?:19|20)\d{2}\D+(?:19|20)\d{2}/.test(raw)) continue; // 2019 - 2023 ...
    if (/^\d{1,2}[./-]\d{1,2}[./-]\d{2,4}/.test(raw)) continue; // dates
    out.push(raw);
  }
  return out;
}

export function isLikelyNameLine(line: string): boolean {
  const seg = line.split(/[|•·–—,:]/)[0].replace(TITLE_RE, "").trim();
  if (!seg || seg.length > 40 || /\d|@|\//.test(seg)) return false;
  const tokens = seg.split(/\s+/);
  if (tokens.length < 2 || tokens.length > 4) return false;
  if (tokens.some((t) => HEADING_WORDS.has(t.toLowerCase().replace(/[^a-z]/g, "")))) return false;
  if (tokens.some((t) => CITIES.some((c) => c.toLowerCase() === t.toLowerCase()))) return false;
  return tokens.every((t) => /^[A-Z][A-Za-z'’.-]*$/.test(t) || /^[A-Z][A-Z'’.-]+$/.test(t));
}

function nameFromLine(line: string): string {
  const seg = line.split(/[|•·–—,:]/)[0].replace(TITLE_RE, "").trim();
  return seg === seg.toUpperCase() ? titleCase(seg) : seg;
}

export function extractName(text: string, email?: string | null): string | null {
  const labelled = text.match(/^\s*(?:full\s+)?name\s*[:\-–]\s*([A-Za-z][A-Za-z .'’-]{2,60})\s*$/im);
  if (labelled && isLikelyNameLine(labelled[1])) return nameFromLine(labelled[1]);

  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean).slice(0, 6);
  for (const l of lines) if (isLikelyNameLine(l)) return nameFromLine(l);

  // Two-column templates can put the header last: look beside the email and phone lines,
  // nearest first, with the contact details themselves stripped out of the line.
  const all = text.split("\n").map((l) => l.trim());
  const anchors = all.flatMap((l, i) => (HAS_EMAIL_RE.test(l) || findPhones(l).length > 0 ? [i] : []));
  for (const a of anchors) {
    for (const i of [a, a - 1, a + 1, a - 2, a + 2, a - 3, a + 3]) {
      const l = all[i];
      if (!l) continue;
      const stripped = l.replace(EMAIL_RE, " ").replace(URL_RE, " ").replace(PROFILE_RE, " ");
      const bare = findPhones(stripped).reduce((s, p) => s.split(p).join(" "), stripped).replace(/\s+/g, " ").trim();
      if (bare && isLikelyNameLine(bare)) return nameFromLine(bare);
    }
  }

  if (email) {
    const local = email.split("@")[0];
    const parts = local.split(/[._-]/).filter((p) => /^[a-z]{2,}$/i.test(p));
    if (parts.length >= 2 && parts.length <= 3) return titleCase(parts.join(" "));
  }

  const slug = text.match(/linkedin\.com\/in\/([a-z0-9-]+)/i)?.[1];
  if (slug) {
    const parts = slug.split("-").filter((p) => /^[a-z]{2,}$/i.test(p) && !SLUG_NON_NAME.has(p.toLowerCase()));
    if (parts.length >= 2 && parts.length <= 3) return titleCase(parts.join(" "));
  }
  return null;
}

export function extractLocationHint(text: string): string | null {
  const labelled = text.match(/^\s*(?:location|based in|current location|city|address|current address|residence)\s*[:\-–]\s*(.+)$/im);
  const header = text.split("\n").slice(0, 12).join("\n");
  for (const source of [labelled?.[1] ?? "", header]) {
    for (const city of CITIES) {
      if (new RegExp(`\\b${esc(city)}\\b`, "i").test(source)) return city === "Bombay" ? "Mumbai" : city;
    }
  }
  return null;
}

/** Stores one copy of a number the text layer printed twice. */
function singlePhone(raw: string): string {
  const d = digitsOf(raw);
  const m = d.match(REPEATED_NUMBER_RE);
  if (!m || d.length <= 13) return raw.replace(/\s+/g, " ");
  const prefix = d.slice(0, m.index);
  return (raw.startsWith("+") && prefix ? `+${prefix} ` : "") + m[1];
}

function findDoubledName(raw: string): string | null {
  for (const line of raw.split("\n")) {
    const m = line.match(DOUBLED_NAME_RE);
    if (m && isLikelyNameLine(m[1])) return nameFromLine(m[1]);
  }
  return null;
}

export function extractPII(raw: string): ExtractedPII {
  const text = unglueRepeats(raw);
  const email = text.match(EMAIL_RE)?.[0]?.toLowerCase() ?? null;
  const phone = findPhones(text.replace(EMAIL_RE, " "))[0] ?? null;
  return {
    candidate_name: findDoubledName(raw) ?? extractName(text, email),
    candidate_email: email,
    candidate_phone: phone ? singlePhone(phone) : null,
    location_hint: extractLocationHint(text),
  };
}

function nameTokens(name: string | null | undefined): string[] {
  if (!name) return [];
  return name
    .replace(TITLE_RE, "")
    .split(/[\s.]+/)
    .map((t) => t.replace(/[^A-Za-z'’-]/g, ""))
    .filter((t) => t.length >= 3);
}

const ADDRESS_HINT_RE =
  /\b(?:road|rd\.?|street|st\.|marg|nagar|flat|apt\.?|apartment|sector|lane|society|colony|chawl|bldg|building|floor|wing|plot|house no|h\.?\s?no|near|opp\.?|west|east)\b/i;
const PIN_RE = /\b\d{3}\s?\d{3}\b/;

/**
 * Removes direct identifiers. `knownNames` should include any stored/corrected name so a
 * manually fixed PII record is also stripped on re-runs.
 */
export function anonymise(text: string, pii: Pick<ExtractedPII, "candidate_name" | "location_hint">, knownNames: string[] = []): string {
  let out = unglueRepeats(text);
  const names = [pii.candidate_name, ...knownNames].filter((n): n is string => !!n && n.trim().length > 0);
  const knownTokens = names.flatMap(nameTokens).map((t) => t.toLowerCase());

  out = out.replace(EMAIL_RE, "[EMAIL]");
  out = out.replace(URL_RE, "[LINK]");
  out = out.replace(PROFILE_RE, "[LINK]");
  out = out.replace(BARE_DOMAIN_RE, "[LINK]");
  for (const p of findPhones(out)) out = out.split(p).join("[PHONE]");

  const lines = out.split("\n").map((line, idx) => {
    const labelMatch = line.match(/^\s*([A-Za-z'’. ]{2,28}?)\s*[:\-–]\s*(.*)$/);
    if (labelMatch) {
      const label = labelMatch[1].toLowerCase().trim();
      if (PERSONAL_LABELS.includes(label)) {
        if (/address|residence|home/.test(label)) return addressReplacement(labelMatch[2]);
        if (/^(?:name|full name)$/.test(label)) return "[CANDIDATE]";
        if (/email|mail|phone|mobile|mob|cell|tel|contact|whatsapp|linkedin|github|portfolio|website|skype/.test(label)) return "[CONTACT REMOVED]";
        return "[PERSONAL DETAIL REMOVED]";
      }
    }
    // A name-like line near the top is blanked when no name is known, or when it holds the known
    // name. A tagline ("Venture Builder | ...") is kept once the real name has been found elsewhere.
    if (idx < 6 && isLikelyNameLine(line)) {
      const seg = line.split(/[|•·–—,:]/)[0].toLowerCase();
      if (!knownTokens.length || knownTokens.some((t) => new RegExp(`(?<![a-z])${esc(t)}(?![a-z])`).test(seg))) return "[CANDIDATE]";
    }
    if (ADDRESS_HINT_RE.test(line) && (PIN_RE.test(line) || /,.*,/.test(line)) && line.length < 160 && idx < 15) {
      return addressReplacement(line);
    }
    if (PIN_RE.test(line) && /,/.test(line) && idx < 10 && line.length < 120) return addressReplacement(line);
    return line;
  });
  out = lines.join("\n");

  for (const full of names) {
    out = out.replace(new RegExp(`\\b${esc(full.trim()).replace(/\s+/g, "\\s+")}\\b`, "gi"), "[CANDIDATE]");
  }
  for (const tok of names.flatMap(nameTokens)) {
    out = out.replace(new RegExp(`(?<![A-Za-z])${esc(tok)}(?![A-Za-z])`, "gi"), "[CANDIDATE]");
  }
  // Gendered pronouns are a personal characteristic; neutralise them.
  out = out
    .replace(/\b(?:she|he)\b/gi, (m) => (m[0] === m[0].toUpperCase() ? "They" : "they"))
    .replace(/\b(?:her|his)\b/gi, (m) => (m[0] === m[0].toUpperCase() ? "Their" : "their"))
    .replace(/\bhim\b/gi, "them")
    .replace(/\b(?:herself|himself)\b/gi, "themselves");
  out = out.replace(/(?:\[CANDIDATE\][\s.]*){2,}/g, "[CANDIDATE] ");
  out = out.replace(/(?:\[(?:PHONE|EMAIL|LINK)\][\s|•·,/]*){2,}/g, "[CONTACT REMOVED]\n");
  return out.replace(/\n{3,}/g, "\n\n").trim();

  function addressReplacement(line: string) {
    const city = CITIES.find((c) => new RegExp(`\\b${esc(c)}\\b`, "i").test(line)) ?? null;
    const shown = city === "Bombay" ? "Mumbai" : city;
    return shown ? `[ADDRESS REMOVED] Location: ${shown}` : "[ADDRESS REMOVED]";
  }
}

/** Returns a list of leak descriptions (never the PII values themselves). Empty means safe to send. */
export function findPIILeaks(anonymised: string, pii: { candidate_name?: string | null; candidate_email?: string | null; candidate_phone?: string | null }): string[] {
  const leaks: string[] = [];
  if (EMAIL_RE.test(anonymised)) leaks.push("email address");
  EMAIL_RE.lastIndex = 0;
  if (findPhones(anonymised).length > 0) leaks.push("phone number");
  if (pii.candidate_phone && digitsOf(pii.candidate_phone).length >= 10 && digitsOf(anonymised).includes(digitsOf(pii.candidate_phone))) {
    // digits-only check can false-positive on long number runs; only flag if the exact formatted phone appears
    if (anonymised.includes(pii.candidate_phone)) leaks.push("stored phone number");
  }
  if (pii.candidate_email && anonymised.toLowerCase().includes(pii.candidate_email.toLowerCase())) leaks.push("stored email");
  if (/linkedin\.com|github\.com/i.test(anonymised)) leaks.push("profile link");
  for (const tok of nameTokens(pii.candidate_name)) {
    if (new RegExp(`(?<![A-Za-z])${esc(tok)}(?![A-Za-z])`, "i").test(anonymised)) {
      leaks.push("candidate name");
      break;
    }
  }
  return leaks;
}

export function firstName(name: string | null | undefined): string | null {
  if (!name) return null;
  const t = name.replace(TITLE_RE, "").trim().split(/\s+/)[0];
  return t && /^[A-Za-z'’-]+$/.test(t) ? t : null;
}
