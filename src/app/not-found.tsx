import { NotFoundView } from "@/components/not-found-view";

/** Any URL with no page behind it. */
export default function NotFound() {
  return <NotFoundView title="Page not found" body="There is nothing at this address. The link may be incomplete or out of date." />;
}
