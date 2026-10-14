import Link from "next/link";
import { requireRecruiter } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

export default async function RecruiterDashboardPage() {
  const user = await requireRecruiter();
  const now = new Date();
  const [profile, jobs, requests, responses, unread, recent] = await Promise.all([
    prisma.recruiterProfile.findUnique({ where: { userId: user.id }, select: { companyName: true, industry: true } }),
    prisma.recruiterOpportunity.count({ where: { ownerId: user.id, kind: "JOB", status: "OPEN", closesAt: { gt: now } } }),
    prisma.recruiterOpportunity.count({ where: { ownerId: user.id, kind: "PROCUREMENT", status: "OPEN", closesAt: { gt: now } } }),
    prisma.opportunityResponse.count({ where: { opportunity: { ownerId: user.id }, status: "SUBMITTED" } }),
    prisma.message.count({ where: { receiverId: user.id, read: false } }),
    prisma.recruiterOpportunity.findMany({ where: { ownerId: user.id }, orderBy: { createdAt: "desc" }, take: 6, select: { id: true, title: true, kind: true, _count: { select: { responses: true } } } }),
  ]);
  return <section className="min-w-0 space-y-6">
    <header className="rounded-3xl bg-gradient-to-br from-purple-900 to-indigo-950 p-6 text-white sm:p-8"><p className="text-xs font-bold uppercase tracking-widest text-purple-200">Recruiter workspace</p><h1 className="mt-3 break-words text-2xl font-black sm:text-3xl">{profile?.companyName || "Hiring & procurement"}</h1><p className="mt-3 max-w-2xl text-sm text-purple-100">Find people for your team and suppliers for your business. Applications and quotations are restricted to verified accounts.</p><Link href="/dashboard/recruiter/profile" className="mt-4 inline-block text-sm font-bold underline">{profile ? "Edit company profile" : "Complete your company profile to publish"}</Link></header>
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{[
      { label: "Open jobs / projects", value: jobs, href: "/dashboard/recruiter/hiring" },
      { label: "Open purchase requests", value: requests, href: "/dashboard/recruiter/procurement" },
      { label: "Responses to review", value: responses, href: "/dashboard/recruiter/responses" },
      { label: "Unread messages", value: unread, href: "/dashboard/messages" },
    ].map((item) => <Link key={item.label} href={item.href} className="min-w-0 rounded-2xl border bg-white p-4 dark:bg-gray-900"><p className="text-xs text-gray-500">{item.label}</p><p className="mt-2 text-2xl font-black">{item.value}</p></Link>)}</div>
    <div className="grid gap-4 md:grid-cols-2">
      <Link href="/dashboard/recruiter/hiring" className="rounded-2xl border bg-white p-6 hover:border-purple-400 dark:bg-gray-900"><h2 className="text-xl font-black">Hiring</h2><p className="mt-2 text-sm text-gray-500">Post a job or technician project. Review experience, shortlist applicants and select candidates.</p><p className="mt-5 text-sm font-bold text-purple-700 dark:text-purple-300">Manage hiring →</p></Link>
      <Link href="/dashboard/recruiter/procurement" className="rounded-2xl border bg-white p-6 hover:border-purple-400 dark:bg-gray-900"><h2 className="text-xl font-black">Procurement</h2><p className="mt-2 text-sm text-gray-500">Specify equipment, quantities and delivery needs. Receive total quotations and compare supplier responses.</p><p className="mt-5 text-sm font-bold text-purple-700 dark:text-purple-300">Manage procurement →</p></Link>
    </div>
    <section id="recent" className="space-y-3"><h2 className="text-lg font-bold">Recent opportunities</h2>{!recent.length && <p className="rounded-xl border border-dashed p-6 text-sm text-gray-500">Your published jobs and purchase requests will appear here.</p>}{recent.map((item) => <Link key={item.id} href={`/dashboard/opportunities/${item.id}`} className="block rounded-xl border p-4"><p className="break-words font-semibold">{item.title}</p><p className="mt-1 text-xs text-gray-500">{item.kind === "JOB" ? "Hiring" : "Procurement"} · {item._count.responses} responses</p></Link>)}</section>
    <nav aria-label="Recruiter tools" className="flex flex-wrap gap-3 text-sm font-bold text-purple-700 dark:text-purple-300"><Link href="/vendors">Vendor directory</Link><Link href="/dashboard/marketplace">Marketplace</Link><Link href="/dashboard/orders">My purchases</Link><Link href="/dashboard/opportunities">Browse opportunities</Link></nav>
  </section>;
}
