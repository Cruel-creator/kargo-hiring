import { ButtonLink, EmptyState } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="pt-16">
      <EmptyState title="Candidate not found" body="This candidate may have been removed, or the link is incomplete." action={<ButtonLink href="/">Back to candidates</ButtonLink>} />
    </div>
  );
}
