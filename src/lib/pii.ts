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
const URL_RE = /\b(?:https?:\/\/|www\.)[^\s)>\]]+/gi;
const PROFILE_RE =
  /\b(?:[a-z0-9-]+\.)*(?:linkedin\.com|github\.com|gitlab\.com|behance\.net|dribbble\.com|medium\.com|twitter\.com|x\.com|instagram\.com|facebook\.com|about\.me|wa\.me|t\.me)(?:\/[^\s)>\]]*)?/gi;
const BARE_DOMAIN_RE = /\b[a-z0-9-]+(?:\.[a-z0-9-]+)*\.(?:me|dev|io|site|xyz|page)(?:\/[^\s)>\]]*)?\b/gi;
const PHONE_CANDIDATE_RE = /(?<![\w+])(\+?\d[\d\s().-]{7,18}\d)(?!\w)/g;
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

/** Phone-looking digit runs: 10–13 digits, not a year range or date. */
export function findPhones(text: string): string[] {
  const out: string[] = [];
  for (const m of text.matchAll(PHONE_CANDIDATE_RE)) {
    const raw = m[1].trim();
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

  if (email) {
    const local = email.split("@")[0];
    const parts = local.split(/[._-]/).filter((p) => /^[a-z]{2,}$/i.test(p));
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

export function extractPII(text: string): ExtractedPII {
  const email = text.match(EMAIL_RE)?.[0]?.toLowerCase() ?? null;
  const phone = findPhones(text.replace(EMAIL_RE, " "))[0] ?? null;
  return {
    candidate_name: extractName(text, email),
    candidate_email: email,
    candidate_phone: phone ? phone.replace(/\s+/g, " ") : null,
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
  let out = text;

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
    if (idx < 6 && isLikelyNameLine(line)) return "[CANDIDATE]";
    if (ADDRESS_HINT_RE.test(line) && (PIN_RE.test(line) || /,.*,/.test(line)) && line.length < 160 && idx < 15) {
      return addressReplacement(line);
    }
    if (PIN_RE.test(line) && /,/.test(line) && idx < 10 && line.length < 120) return addressReplacement(line);
    return line;
  });
  out = lines.join("\n");

  const names = [pii.candidate_name, ...knownNames].filter((n): n is string => !!n && n.trim().length > 0);
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
