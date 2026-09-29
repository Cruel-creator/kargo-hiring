import type { Metadata } from "next";
import { PageHeader } from "@/components/shell";
import { UploadForm } from "@/components/upload-form";

export const metadata: Metadata = { title: "Screen a candidate" };

export default function UploadPage() {
  return (
    <>
      <PageHeader title="Screen a candidate" description="Upload a CV and choose the role they applied for. Screening runs automatically; you decide what happens next." upload={false} />
      <UploadForm />
    </>
  );
}
