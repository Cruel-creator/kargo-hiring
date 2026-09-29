import { NotFoundView } from "@/components/not-found-view";

/** Rendered when the candidate route calls notFound(): a malformed id, or no candidate with that id. */
export default function CandidateNotFound() {
  return <NotFoundView title="Candidate not found" body="This candidate may have been removed, or the link is incomplete." />;
}
