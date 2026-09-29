import { DatabaseZap } from "lucide-react";

export function SetupNotice({ missing, message }: { missing?: string[]; message?: string }) {
  return (
    <section className="border-y border-line py-6" aria-labelledby="setup-title">
      <div className="flex items-start gap-3">
        <DatabaseZap className="mt-0.5 size-4.5 shrink-0 text-muted" aria-hidden />
        <div className="max-w-[62ch]">
          <h2 id="setup-title" className="text-name font-semibold text-ink">
            {missing ? "Connect the database to start screening" : "The candidate list couldn't load"}
          </h2>
          {missing ? (
            <>
              <p className="mt-1 text-body text-muted">These server variables are not set yet. Add them to .env.local (or Vercel → Settings → Environment Variables), then restart.</p>
              <ul className="mt-3 flex flex-wrap gap-1.5">
                {missing.map((m) => (
                  <li key={m} className="rounded-sm border border-line bg-canvas px-1.5 py-0.5 font-mono text-meta text-ink-2">
                    {m}
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-meta text-muted">Run supabase/schema.sql in the Supabase SQL editor first. It creates the tables, the private CV bucket and the v1 rubric.</p>
            </>
          ) : (
            <p className="mt-1 text-body text-muted">{message} Check that supabase/schema.sql has been run on this project and the keys are correct.</p>
          )}
        </div>
      </div>
    </section>
  );
}
