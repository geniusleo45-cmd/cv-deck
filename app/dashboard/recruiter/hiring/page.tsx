import { RecruiterWorkspace } from "@/components/recruiter/RecruiterWorkspace";
export default async function Page({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  return <RecruiterWorkspace kind="JOB" page={(await searchParams).page} />;
}
