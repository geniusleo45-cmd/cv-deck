import { RecruiterWorkspace } from "@/components/recruiter/RecruiterWorkspace";
export default async function Page({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  return <RecruiterWorkspace kind="PROCUREMENT" page={(await searchParams).page} />;
}
