import type { Metadata } from "next";
import { SettingsView } from "@/components/flows/settings-view";
import { configStatus, getRepo, publicMessage } from "@/lib/server";
import type { Role, RubricCriterion } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const cfg = configStatus();
  let rubrics: Record<Role, RubricCriterion[]> | null = null;
  let rubricError: string | null = null;
  try {
    const repo = getRepo();
    const [pm, spm] = await Promise.all([repo.getActiveRubric("PM"), repo.getActiveRubric("SPM")]);
    rubrics = { PM: pm, SPM: spm };
  } catch (e) {
    rubricError = publicMessage(e);
  }

  const checks: [string, boolean, string][] = [
    ["Supabase", cfg.supabaseUrl && cfg.supabaseKey, cfg.usingServiceRole ? "Service role key (server only)" : cfg.supabaseKey ? "Anon key only: RLS will block writes. Add SUPABASE_SERVICE_ROLE_KEY." : "Not configured"],
    ["Gemini", cfg.gemini, cfg.gemini ? `Model ${cfg.geminiModel}` : "GEMINI_API_KEY not set"],
    ["Resend", cfg.resend, cfg.resend ? "API key set" : "RESEND_API_KEY not set. Sending is disabled."],
    ["Sender", !!cfg.fromEmail, cfg.fromEmail ?? "HIRING_FROM_EMAIL not set"],
  ];

  return <SettingsView rubrics={rubrics} rubricError={rubricError} checks={checks} redirectTo={cfg.redirectTo ?? null} />;
}
