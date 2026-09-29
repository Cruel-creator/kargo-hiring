import { after } from "next/server";
import { detectFileKind, FileValidationError, mimeFor } from "@/lib/extract";
import { fail, handleError, json } from "@/lib/http";
import { runPipeline } from "@/lib/pipeline";
import { getGemini, getRepo } from "@/lib/server";
import { ROLES, type Role } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: Request) {
  try {
    const form = await req.formData().catch(() => null);
    if (!form) return fail("Expected a multipart form upload.", 400, "bad_form");
    const file = form.get("file");
    const role = String(form.get("role") ?? "") as Role;
    if (!ROLES.includes(role)) return fail("Choose the role the candidate applied for.", 400, "bad_role");
    if (!(file instanceof File)) return fail("Attach a CV file.", 400, "no_file");

    const bytes = new Uint8Array(await file.arrayBuffer());
    let kind;
    try {
      kind = detectFileKind(file.name, bytes);
    } catch (e) {
      if (e instanceof FileValidationError) return fail(e.message, 400, "invalid_file");
      throw e;
    }

    const repo = getRepo();
    const safeName = file.name.replace(/[^\w.\- ]+/g, "_").slice(-120) || `cv.${kind}`;
    const candidate = await repo.createCandidate({ role_applied: role, original_file_name: safeName, original_file_type: mimeFor(kind) });
    const path = `${candidate.id}/${safeName}`;
    try {
      await repo.uploadFile(path, bytes, mimeFor(kind));
    } catch (e) {
      await repo.updateCandidate(candidate.id, { processing_status: "extraction_failed", error_message: "The file could not be stored. Upload it again." });
      throw e;
    }
    await repo.updateCandidate(candidate.id, { original_file_url: path });
    await repo.addEvent(candidate.id, "uploaded", `Applied for ${role}`).catch(() => {});

    // Screening continues after the response; the UI polls the status endpoint.
    const gemini = getGemini();
    after(() => runPipeline(candidate.id, { repo, gemini }).then(() => undefined));

    return json({ id: candidate.id, processing_status: "uploaded" }, 201);
  } catch (e) {
    return handleError(e, "upload");
  }
}
