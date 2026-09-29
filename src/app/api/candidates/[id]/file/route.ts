import { NextResponse } from "next/server";
import { fail, handleError, idParam } from "@/lib/http";
import { getRepo } from "@/lib/server";

export const runtime = "nodejs";

/** Redirects to a 10-minute signed URL for the original CV in the private bucket. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const id = await idParam(params);
    const repo = getRepo();
    const c = await repo.getCandidate(id);
    if (!c?.original_file_url) return fail("No file stored for this candidate.", 404, "not_found");
    const url = await repo.signedFileUrl(c.original_file_url);
    if (!url) return fail("Could not create a download link.", 502, "storage");
    return NextResponse.redirect(url, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return handleError(e, "file");
  }
}
