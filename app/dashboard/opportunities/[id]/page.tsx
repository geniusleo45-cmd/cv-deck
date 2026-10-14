import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { isVerifiedApplicant, responseVisibility } from "@/lib/recruiterOpportunities";
import { OpportunityAction, OpportunityResponseForm } from "@/components/recruiter/OpportunityForms";

export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ page?: string; response?: string }> }) {
  const session = await requireAuth();
  const { id } = await params;
  const query = await searchParams;
  const selectedResponse = typeof query.response === "string" ? query.response : undefined;
  const page = selectedResponse ? 1 : Math.min(10000, Math.max(1, Number.parseInt(query.page || "1", 10) || 1));
  const [listing, user] = await Promise.all([
    prisma.recruiterOpportunity.findUnique({ where: { id }, include: { owner: { select: { recruiterProfile: { select: { companyName: true } } } } } }),
    prisma.user.findUnique({ where: { id: session.id }, select: { role: true, vendorProfile: { select: { status: true } }, recruiterProfile: { select: { verified: true } } } }),
  ]);
  if (!listing) notFound();
  const owner = listing.ownerId === session.id;
  const responses = await prisma.opportunityResponse.findMany({
    where: { ...responseVisibility(id, session.id, listing.ownerId), ...(owner && selectedResponse ? { id: selectedResponse } : {}) },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }], skip: owner ? (page - 1) * 20 : 0, take: owner ? 21 : 1,
    select: { id: true, message: true, quoteAmount: true, status: true, createdAt: true, applicantId: true, applicant: { select: { name: true, role: true, vendorProfile: { select: { id: true, businessName: true, status: true } }, recruiterProfile: { select: { verified: true } } } } },
  });
  const open = listing.status === "OPEN" && listing.closesAt > new Date();
  return <section className="mx-auto min-w-0 max-w-4xl space-y-6">
    <Link href={owner ? `/dashboard/recruiter/${listing.kind === "JOB" ? "hiring" : "procurement"}` : "/dashboard/opportunities"} className="text-sm font-bold text-purple-700 dark:text-purple-300">← Back to opportunities</Link>
    <header className="space-y-3 rounded-2xl border bg-white p-5 dark:bg-gray-900 sm:p-7"><p className="text-xs font-bold text-purple-700 dark:text-purple-300">{listing.kind === "JOB" ? "JOB / TECHNICIAN PROJECT" : "PROCUREMENT REQUEST"} · {open ? "OPEN" : "CLOSED / EXPIRED"}</p><h1 className="break-words text-2xl font-black">{listing.title}</h1><p className="break-words text-sm text-gray-500">{listing.owner.recruiterProfile?.companyName || "Recruiter"} · {listing.location}</p><p className="text-sm text-gray-500">Closes {listing.closesAt.toLocaleDateString("en-NG", { timeZone: "UTC" })} at 23:59 UTC</p>{listing.quantity && <p className="font-bold">Quantity: {listing.quantity.toLocaleString()} units</p>}<p className="whitespace-pre-wrap break-words text-sm leading-6">{listing.description}</p>{listing.terms && <div className="rounded-xl bg-gray-50 p-4 dark:bg-gray-800"><h2 className="text-sm font-bold">Terms / compensation / budget</h2><p className="mt-2 whitespace-pre-wrap break-words text-sm">{listing.terms}</p></div>}{owner && open && <OpportunityAction id={id} />}</header>
    {owner && <h2 className="text-lg font-bold">{listing.kind === "JOB" ? "Applications" : "Quotations"}</h2>}
    {owner && selectedResponse && <Link href={`/dashboard/opportunities/${id}`} className="text-sm font-bold text-purple-700 dark:text-purple-300">View all responses</Link>}
    {owner && !responses.length && <p className="rounded-xl border border-dashed p-5 text-sm text-gray-500">No responses on this page yet.</p>}
    {responses.slice(0, 20).map((response) => <article key={response.id} className="min-w-0 space-y-3 rounded-2xl border p-5">
      <h3 className="break-words font-bold">{owner ? response.applicant.vendorProfile?.businessName || response.applicant.name || "Applicant" : "Your response"}</h3>
      <p className="text-xs font-bold">{response.status} · {isVerifiedApplicant(response.applicant) ? "Currently verified" : "Not currently verified"}</p>
      {response.quoteAmount !== null && <p className="text-lg font-bold">₦{Number(response.quoteAmount).toLocaleString("en-NG", { minimumFractionDigits: 2 })} total</p>}
      <p className="whitespace-pre-wrap break-words text-sm leading-6">{response.message}</p>
      {owner && <><div className="flex flex-wrap gap-4 text-sm font-bold text-purple-700 dark:text-purple-300"><Link href={`/dashboard/messages?receiverId=${response.applicantId}`}>Message applicant</Link>{response.applicant.vendorProfile && <Link href={`/vendors/${response.applicant.vendorProfile.id}`}>View business profile</Link>}</div><OpportunityAction key={`${response.id}-${response.status}`} id={id} responseId={response.id} initialStatus={response.status} /></>}
    </article>)}
    {owner && <nav aria-label="Response pages" className="flex gap-4 text-sm font-bold text-purple-700 dark:text-purple-300">{page > 1 && <Link href={`/dashboard/opportunities/${id}?page=${page - 1}`}>Previous</Link>}{responses.length > 20 && <Link href={`/dashboard/opportunities/${id}?page=${page + 1}`}>Next</Link>}</nav>}
    {!owner && !responses.length && (open && isVerifiedApplicant(user) ? <OpportunityResponseForm id={id} kind={listing.kind} /> : <div className="rounded-xl border p-5 text-sm"><p>{!open ? "This opportunity is no longer accepting responses." : "Only admin-verified vendor or recruiter accounts may apply or quote. Registration alone does not count as verification."}</p>{open && user?.role === "VENDOR" && <Link href="/dashboard/vendor/verification" className="mt-3 inline-block font-bold text-purple-700 dark:text-purple-300">View verification status</Link>}</div>)}
    <p className="text-xs text-gray-500">Selection does not create an employment agreement, purchase order or payment. Confirm terms with the other party before proceeding.</p>
  </section>;
}
