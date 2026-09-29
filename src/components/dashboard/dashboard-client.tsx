"use client";

import { useMemo, useState } from "react";
import { CandidateList } from "@/components/candidate-list";
import type { EmailType, Role } from "@/lib/types";
import type { CandidateRowView } from "@/lib/view";
import { EntranceStyles, useEntrance } from "./entrance";
import type { NextEvidence } from "./evidence";
import { Masthead } from "./masthead";
import { buildQueue } from "./queue";

export interface DashboardClientProps {
  title: string;
  rows: CandidateRowView[];
  view: Role | "all";
  cross: boolean;
  total: number;
  evidence: Record<string, NextEvidence>;
  problem: boolean;
  linkBase: string;
  emailTypes: Record<string, EmailType>;
}

export function DashboardClient({ title, rows, view, cross, total, evidence, problem, linkBase, emailTypes }: DashboardClientProps) {
  const queue = useMemo(() => buildQueue(rows, view), [rows, view]);
  const [pinned, setPinned] = useState<string | null>(null);
  const current = queue.find((q) => q.row.id === pinned) ?? queue[0] ?? null; // pinned by id, so a poll refresh never moves the headline
  const entrance = useEntrance();

  return (
    <>
      <EntranceStyles />
      <Masthead title={title} rows={rows} view={view} total={total} queue={queue} current={current} onPin={setPinned} evidence={evidence} problem={problem} linkBase={linkBase} entrance={entrance} emailTypes={emailTypes} />
      {problem || total === 0 ? null : (
        <CandidateList rows={rows} view={view} cross={cross} totalCandidates={total} nextId={current?.row.id ?? null} linkBase={linkBase} entrance={entrance} emailTypes={emailTypes} />
      )}
    </>
  );
}
