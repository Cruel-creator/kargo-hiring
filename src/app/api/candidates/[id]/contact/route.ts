import { updateContact } from "@/lib/actions";
import { handleError, idParam, json, readJson } from "@/lib/http";
import { getRepo } from "@/lib/server";

export const runtime = "nodejs";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const id = await idParam(params);
    const body = await readJson<{ name?: string | null; email?: string | null; phone?: string | null }>(req);
    await updateContact(getRepo(), id, body);
    return json({ ok: true });
  } catch (e) {
    return handleError(e, "contact");
  }
}
