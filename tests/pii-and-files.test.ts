import { describe, expect, it } from "vitest";
import { anonymise, extractPII, findPIILeaks, findPhones } from "../src/lib/pii";
import { detectFileKind, extractText, FileValidationError, ExtractionError } from "../src/lib/extract";
import { runPipeline } from "../src/lib/pipeline";
import { evidenceInCv } from "../src/lib/ai";
import { fakeGemini, fixture, memoryRepo } from "./helpers";

describe("7. CV containing PII in multiple locations", () => {
  const text = fixture("pii-multi.txt");
  const pii = extractPII(text);
  const anon = anonymise(text, pii);

  it("extracts name, email and phone for separate storage", () => {
    expect(pii.candidate_name).toBe("Meera Raghunathan");
    expect(pii.candidate_email).toBe("meera.raghunathan@example.com");
    expect(pii.candidate_phone).toBe("+91-98190-66324");
    expect(pii.location_hint).toBe("Thane");
  });

  it("removes every direct identifier, wherever it appears", () => {
    for (const leak of [
      "Meera", "Raghunathan", "meera.raghunathan@example.com", "meera.r.alt@example.in", "98190", "2654 8830",
      "linkedin.com", "github.com", "Lodha Paradise", "400601", "14/03/1991", "Female", "Married", "Hindu", "Indian",
    ]) {
      expect(anon, `leaked: ${leak}`).not.toContain(leak);
    }
    expect(findPIILeaks(anon, pii)).toEqual([]);
  });

  it("keeps work evidence and city-level location, and neutralises pronouns", () => {
    expect(anon).toContain("Owned the carrier integration platform used by 220 shippers.");
    expect(anon).toContain("Location: Thane");
    expect(anon).not.toMatch(/\bher\b/i);
  });

  it("the leak gate catches anything left behind", () => {
    expect(findPIILeaks("Contact Meera at x@y.com or +91 98190 66324", pii)).toEqual(
      expect.arrayContaining(["email address", "phone number", "candidate name"]),
    );
  });

  it("the pipeline refuses to call Gemini if stored CV text still contains PII", async () => {
    const mem = memoryRepo();
    const c = await mem.repo.createCandidate({ role_applied: "PM", original_file_name: "cv.txt", original_file_type: "text/plain" });
    await mem.repo.updateCandidate(c.id, {
      candidate_name: "Tanvi Kulkarni",
      anonymised_cv_text: "Tanvi Kulkarni owned the shipment tracking module end to end.",
    });
    const g = fakeGemini({});
    expect(await runPipeline(c.id, { repo: mem.repo, gemini: g.client }, "score")).toBe("scoring_failed");
    expect((await mem.repo.getCandidate(c.id))!.error_message).toMatch(/Privacy check failed/);
    expect(g.calls).toHaveLength(0);
  });

  it("strips the full PII set from every fixture before any Gemini call", async () => {
    for (const f of ["strong-pm.txt", "strong-spm.txt", "technical-no-pm.txt", "discovery-weak-tech.txt", "missing-email.txt", "missing-phone.txt"]) {
      const t = fixture(f);
      const p = extractPII(t);
      expect(p.candidate_name, f).toBeTruthy();
      expect(findPIILeaks(anonymise(t, p), p), f).toEqual([]);
    }
  });

  it("does not treat year ranges as phone numbers", () => {
    expect(findPhones("Product Manager 2019 - 2023 2024")).toEqual([]);
    expect(findPhones("Call +1 (312) 847-1928")).toEqual(["+1 (312) 847-1928"]);
  });

  it("verifies quoted evidence against the anonymised CV", () => {
    expect(evidenceInCv("Owned the carrier integration platform ... 220 shippers", anon)).toBe(true);
    expect(evidenceInCv("Led a team of 40 engineers at Google", anon)).toBe(false);
  });
});

describe("7b. two-column PDF with glued duplicate contact text", () => {
  // Synthetic. Mirrors a real template's text layer: sidebar first, the header last, and every
  // contact item printed twice with no separator (name, phone, and link label + link).
  const text = [
    "Scholastic Achievements",
    "• Secured a top 1% rank in a national engineering entrance examination",
    "Experience",
    "• Owned the dispatch tracking feature end to end; late-delivery tickets fell 30%.",
    "• She interviewed 25 fleet operators before scoping the rebuild.",
    "Education",
    "B.Tech, Mechanical Engineering [2021-2025]",
    "Riya ShahRIYA SHAH squad_7@example.edu",
    "+91 98765 4321098765 43210",
    "riya-shah-pmlinkedin.com/in/riya-shah-pm",
  ].join("\n");
  const pii = extractPII(text);
  const anon = anonymise(text, pii);

  it("finds the name beside the contact block and ungludes its duplicate", () => {
    expect(pii.candidate_name).toBe("Riya Shah");
    expect(pii.candidate_email).toBe("squad_7@example.edu");
    expect(pii.candidate_phone).toBeTruthy();
  });

  it("removes the glued name, doubled phone and glued profile link", () => {
    for (const leak of ["Riya", "RIYA", "Shah", "98765", "43210", "linkedin.com", "riya-shah-pm"]) {
      expect(anon, `leaked: ${leak}`).not.toContain(leak);
    }
    expect(findPIILeaks(anon, pii)).toEqual([]);
    expect(anon).toContain("Owned the dispatch tracking feature end to end; late-delivery tickets fell 30%.");
  });

  it("treats a doubled phone number as a phone", () => {
    expect(findPhones("+91 98765 4321098765 43210")).toHaveLength(1);
    expect(findPIILeaks("Call +91 98765 4321098765 43210", {})).toContain("phone number");
  });

  it("falls back to the name in a profile link when no name line exists", () => {
    const t = "Experience\n• Shipped the carrier API\nsquad_9@example.edu\nlinkedin.com/in/arjun-rao-pm";
    expect(extractPII(t).candidate_name).toBe("Arjun Rao");
  });
});

describe("8. invalid file", () => {
  const enc = (s: string) => new TextEncoder().encode(s);

  it("rejects unsupported, disguised, empty and oversized files", () => {
    expect(() => detectFileKind("cv.exe", enc("MZ..."))).toThrow(FileValidationError);
    expect(() => detectFileKind("cv.pdf", enc("MZ this is not a pdf"))).toThrow(/not a valid PDF/);
    expect(() => detectFileKind("cv.docx", enc("%PDF-1.4"))).toThrow(/not a valid Word/);
    expect(() => detectFileKind("cv.doc", enc("whatever"))).toThrow(/Legacy/);
    expect(() => detectFileKind("cv.txt", new Uint8Array([104, 0, 105]))).toThrow(/binary/);
    expect(() => detectFileKind("cv.pdf", new Uint8Array())).toThrow(/empty/);
    expect(() => detectFileKind("cv.pdf", new Uint8Array(5 * 1024 * 1024 + 1))).toThrow(/5 MB/);
    expect(detectFileKind("CV.PDF", enc("%PDF-1.7 ..."))).toBe("pdf");
  });

  it("fails extraction for a corrupted PDF and for near-empty text", async () => {
    await expect(extractText("pdf", enc("%PDF-1.4 garbage garbage"))).rejects.toThrow(ExtractionError);
    await expect(extractText("txt", enc("hello"))).rejects.toThrow(/scanned image/);
  });

  it("extracts text from a real PDF", async () => {
    const pdf = makePdf(["Aarav Joshi", "Product Manager at Railyard Tech", "Owned the depot scheduling product from discovery to launch and cut idle truck time by 23 percent across 18 depots in Maharashtra.", "Interviewed 25 depot supervisors before writing the first spec and shipped weekly releases for nine months."]);
    const text = await extractText(detectFileKind("cv.pdf", pdf), pdf);
    expect(text).toContain("Railyard Tech");
    expect(text).toContain("23 percent");
  });

  it("marks the candidate extraction_failed (no Gemini call) for an unreadable upload", async () => {
    const mem = memoryRepo();
    const c = await mem.repo.createCandidate({ role_applied: "PM", original_file_name: "cv.pdf", original_file_type: "application/pdf" });
    await mem.repo.uploadFile("x/cv.pdf", enc("%PDF-1.4 broken"), "application/pdf");
    await mem.repo.updateCandidate(c.id, { original_file_url: "x/cv.pdf" });
    const g = fakeGemini({});
    expect(await runPipeline(c.id, { repo: mem.repo, gemini: g.client })).toBe("extraction_failed");
    expect((await mem.repo.getCandidate(c.id))!.error_message).toMatch(/could not be read/);
    expect(g.calls).toHaveLength(0);
  });
});

/** Minimal valid single-page PDF with Helvetica text lines (correct xref offsets). */
function makePdf(lines: string[]): Uint8Array {
  const esc = (s: string) => s.replace(/[\\()]/g, (m) => `\\${m}`);
  const content = `BT /F1 11 Tf 50 780 Td 14 TL ${lines.map((l) => `(${esc(l)}) Tj T*`).join(" ")} ET`;
  const objs = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let out = "%PDF-1.4\n";
  const offsets: number[] = [];
  objs.forEach((o, i) => {
    offsets.push(out.length);
    out += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const xref = out.length;
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${offsets.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("")}`;
  out += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new TextEncoder().encode(out);
}
