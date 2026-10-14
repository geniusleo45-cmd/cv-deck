import Link from "next/link";
import { requireRecruiter } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { OpportunityCreateForm } from "./OpportunityForms";

export async function RecruiterWorkspace({ kind, page }: { kind: "JOB" | "PROCUREMENT"; page?: string }) {
  const user = await requireRecruiter();
  const currentPage = Math.min(10000, Math.max(1, Number.parseInt(page || "1", 10) || 1));
  const listings = await prisma.recruiterOpportunity.findMany({ where: { ownerId: user.id, kind }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], skip: (currentPage - 1) * 20, take: 21, select: { id: true, title: true, status: true, closesAt: true, location: true, _count: { select: { responses: true } } } });
  const procurement = kind === "PROCUREMENT";
  const path = `/dashboard/recruiter/${procurement ? "procurement" : "hiring"}`;
  return <section className="min-w-0 space-y-6">
    <Link href="/dashboard/recruiter" className="text-sm font-bold text-purple-700 dark:text-purple-300">← Recruiter overview</Link>
    <header><h1 className="text-2xl font-black">{procurement ? "Procurement requests" : "Hiring & technician projects"}</h1><p className="mt-2 text-sm text-gray-500">{procurement ? "Describe what you need and compare quotations from verified accounts." : "Publish opportunities and review applications from verified accounts."}</p></header>
    {user.role === "RECRUITER" && <OpportunityCreateForm kind={kind} />}
    <div className="space-y-3">
      {!listings.length && <p className="rounded-xl border border-dashed p-6 text-sm text-gray-500">No {procurement ? "procurement requests" : "jobs or projects"} on this page. Publish your first opportunity above.</p>}
      {listings.slice(0, 20).map((listing) => <Link key={listing.id} href={`/dashboard/opportunities/${listing.id}`} className="block min-w-0 rounded-2xl border bg-white p-5 hover:border-purple-400 dark:bg-gray-900">
        <p className="break-words font-bold">{listing.title}</p><p className="mt-2 text-sm text-gray-500">{listing.status === "OPEN" && listing.closesAt <= new Date() ? "EXPIRED" : listing.status} · {listing._count.responses} responses</p><p className="mt-1 break-words text-sm text-gray-500">{listing.location} · Closes {listing.closesAt.toLocaleDateString("en-NG", { timeZone: "UTC" })} (UTC)</p>
      </Link>)}
    </div>
    <nav aria-label="Listing pages" className="flex gap-4 text-sm font-bold text-purple-700 dark:text-purple-300">{currentPage > 1 && <Link href={`${path}?page=${currentPage - 1}`}>Previous</Link>}{listings.length > 20 && <Link href={`${path}?page=${currentPage + 1}`}>Next</Link>}</nav>
    <p className="text-xs text-gray-500">Selection is a review status only. Agree employment or purchasing terms separately; no order or payment is created automatically.</p>
  </section>;
}
