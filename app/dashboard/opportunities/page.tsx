import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { requireAuth } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

export default async function Page({ searchParams }: { searchParams: Promise<{ kind?: string; view?: string; page?: string; query?: string }> }) {
  const user = await requireAuth();
  const query = await searchParams;
  const kind = query.kind === "JOB" || query.kind === "PROCUREMENT" ? query.kind : undefined;
  const mine = query.view === "mine";
  const search = (typeof query.query === "string" ? query.query : "").trim().slice(0, 100);
  const page = Math.min(10000, Math.max(1, Number.parseInt(query.page || "1", 10) || 1));
  const where: Prisma.RecruiterOpportunityWhereInput = { kind, ...(mine ? { responses: { some: { applicantId: user.id } } } : { status: "OPEN", closesAt: { gt: new Date() } }), ...(search ? { OR: [{ title: { contains: search, mode: "insensitive" } }, { location: { contains: search, mode: "insensitive" } }] } : {}) };
  const listings = await prisma.recruiterOpportunity.findMany({ where, orderBy: [{ createdAt: "desc" }, { id: "desc" }], skip: (page - 1) * 20, take: 21, select: { id: true, title: true, location: true, kind: true, closesAt: true, status: true, owner: { select: { recruiterProfile: { select: { companyName: true } } } }, responses: { where: { applicantId: user.id }, select: { status: true } } } });
  function pageUrl(next: number) { return `/dashboard/opportunities?${new URLSearchParams({ kind: kind || "", view: mine ? "mine" : "open", query: search, page: String(next) })}`; }
  return <section className="min-w-0 space-y-5">
    <header><h1 className="text-2xl font-black">Jobs & procurement opportunities</h1><p className="mt-2 text-sm text-gray-500">Browse jobs, technician projects and bulk-purchase requests. Only admin-verified vendor or recruiter accounts can apply or quote.</p></header>
    <form className="grid gap-3 rounded-2xl border p-4 sm:grid-cols-2 lg:grid-cols-4">
      <label className="min-w-0 text-xs font-bold">Search<input name="query" defaultValue={search} maxLength={100} placeholder="Title or location" className="mt-1 w-full rounded-lg border bg-white p-2 text-base dark:bg-gray-900" /></label>
      <label className="text-xs font-bold">Type<select name="kind" defaultValue={kind || ""} className="mt-1 w-full rounded-lg border bg-white p-2 text-base dark:bg-gray-900"><option value="">All opportunities</option><option value="JOB">Jobs & projects</option><option value="PROCUREMENT">Procurement</option></select></label>
      <label className="text-xs font-bold">Show<select name="view" defaultValue={mine ? "mine" : "open"} className="mt-1 w-full rounded-lg border bg-white p-2 text-base dark:bg-gray-900"><option value="open">Open opportunities</option><option value="mine">My applications & quotes</option></select></label>
      <button className="self-end rounded-lg bg-purple-700 px-4 py-2 font-bold text-white">Search</button>
    </form>
    <div className="grid gap-4 md:grid-cols-2">{listings.slice(0, 20).map((listing) => <Link key={listing.id} href={`/dashboard/opportunities/${listing.id}`} className="min-w-0 space-y-2 rounded-2xl border bg-white p-5 hover:border-purple-400 dark:bg-gray-900"><p className="text-xs font-bold text-purple-700 dark:text-purple-300">{listing.kind === "JOB" ? "JOB / PROJECT" : "PROCUREMENT"}</p><h2 className="break-words text-lg font-bold">{listing.title}</h2><p className="break-words text-sm text-gray-500">{listing.owner.recruiterProfile?.companyName || "Recruiter"} · {listing.location}</p><p className="text-xs text-gray-500">Closes {listing.closesAt.toLocaleDateString("en-NG", { timeZone: "UTC" })} (UTC) · {listing.status === "OPEN" && listing.closesAt <= new Date() ? "EXPIRED" : listing.status}</p>{listing.responses[0] && <p className="text-sm font-bold">Your response: {listing.responses[0].status.toLowerCase()}</p>}</Link>)}</div>
    {!listings.length && <p className="rounded-xl border border-dashed p-6 text-sm text-gray-500">No opportunities match this view.</p>}
    <nav aria-label="Opportunity pages" className="flex gap-4 text-sm font-bold text-purple-700 dark:text-purple-300">{page > 1 && <Link href={pageUrl(page - 1)}>Previous</Link>}{listings.length > 20 && <Link href={pageUrl(page + 1)}>Next</Link>}</nav>
  </section>;
}
