import Link from "next/link";
import { requireRecruiter } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

export default async function Page({ searchParams }: { searchParams: Promise<{ page?: string; view?: string }> }) {
  const user = await requireRecruiter();
  const query = await searchParams;
  const all = query.view === "all";
  const page = Math.min(10000, Math.max(1, Number.parseInt(query.page || "1", 10) || 1));
  const responses = await prisma.opportunityResponse.findMany({ where: { opportunity: { ownerId: user.id }, ...(all ? {} : { status: "SUBMITTED" }) }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], skip: (page - 1) * 20, take: 21, select: { id: true, status: true, opportunityId: true, quoteAmount: true, applicant: { select: { name: true, vendorProfile: { select: { businessName: true } } } }, opportunity: { select: { title: true, kind: true } } } });
  return <section className="space-y-5"><h1 className="text-2xl font-black">Applications & quotations</h1><nav aria-label="Response filters" className="flex flex-wrap gap-4 text-sm font-bold text-purple-700 dark:text-purple-300"><Link href="/dashboard/recruiter">Overview</Link><Link href="/dashboard/recruiter/responses" aria-current={!all ? "page" : undefined}>Awaiting review</Link><Link href="/dashboard/recruiter/responses?view=all" aria-current={all ? "page" : undefined}>All responses</Link></nav>
    {!responses.length && <p className="rounded-xl border border-dashed p-6 text-sm text-gray-500">No responses in this view.</p>}
    {responses.slice(0, 20).map((response) => <Link key={response.id} href={`/dashboard/opportunities/${response.opportunityId}?response=${response.id}`} className="block min-w-0 rounded-2xl border bg-white p-5 dark:bg-gray-900"><h2 className="break-words font-bold">{response.opportunity.title}</h2><p className="mt-2 break-words text-sm">{response.applicant.vendorProfile?.businessName || response.applicant.name || "Applicant"}</p><p className="mt-2 text-xs text-gray-500">{response.opportunity.kind === "JOB" ? "Application" : "Quotation"} · {response.status}{response.quoteAmount !== null ? ` · ₦${Number(response.quoteAmount).toLocaleString("en-NG", { minimumFractionDigits: 2 })} total` : ""}</p></Link>)}
    <nav aria-label="Response inbox pages" className="flex gap-4 text-sm font-bold text-purple-700 dark:text-purple-300">{page > 1 && <Link href={`?view=${all ? "all" : "pending"}&page=${page - 1}`}>Previous</Link>}{responses.length > 20 && <Link href={`?view=${all ? "all" : "pending"}&page=${page + 1}`}>Next</Link>}</nav>
  </section>;
}
