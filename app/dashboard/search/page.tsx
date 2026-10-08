import Link from "next/link";
import { requireAuth } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ query?: string | string[] }> }) {
  const user = await requireAuth();
  const params = await searchParams;
  const query = (typeof params.query === "string" ? params.query : "").trim().slice(0, 100);
  if (query.length < 2) return <section><h1 className="text-2xl font-bold">Search CV Deck</h1><p className="mt-2">Enter at least two characters in the search bar above.</p></section>;
  const contains = { contains: query, mode: "insensitive" as const };
  const [products, vendors, recruiters, people] = await Promise.all([
    prisma.product.findMany({ where: { status: "ACTIVE", vendor: { status: "VERIFIED" }, OR: [{ name: contains }, { description: contains }, { category: { name: contains } }] }, select: { id: true, name: true, price: true }, orderBy: { createdAt: "desc" }, take: 12 }),
    prisma.vendor.findMany({ where: { status: "VERIFIED", OR: [{ businessName: contains }, { officeAddress: contains }] }, select: { id: true, businessName: true, officeAddress: true }, orderBy: { businessName: "asc" }, take: 12 }),
    prisma.recruiterProfile.findMany({ where: { OR: [{ companyName: contains }, { industry: contains }, { user: { name: contains } }] }, select: { id: true, userId: true, companyName: true, industry: true }, orderBy: { companyName: "asc" }, take: 12 }),
    prisma.user.findMany({ where: { id: { not: user.id }, role: { not: "ADMIN" }, OR: [{ name: contains }, { bio: contains }] }, select: { id: true, name: true, bio: true }, orderBy: { name: "asc" }, take: 12 }),
  ]);
  const groups = [
    { title: "Products", rows: products.map(p => ({ id: p.id, title: p.name, detail: `₦${p.price.toLocaleString()}`, href: `/dashboard/marketplace/${p.id}` })) },
    { title: "Vendors", rows: vendors.map(v => ({ id: v.id, title: v.businessName, detail: v.officeAddress, href: `/vendors/${v.id}` })) },
    { title: "Recruiters", rows: recruiters.map(r => ({ id: r.id, title: r.companyName, detail: r.industry || "Recruiter profile", href: `/dashboard/messages?receiverId=${encodeURIComponent(r.userId)}` })) },
    { title: "People and services", rows: people.map(p => ({ id: p.id, title: p.name || "CV Deck member", detail: p.bio?.slice(0, 180) || "Member profile", href: `/dashboard/messages?receiverId=${encodeURIComponent(p.id)}` })) },
  ];
  return <section className="space-y-6">
    <div><h1 className="text-2xl font-bold">Search results for “{query}”</h1><p className="mt-2 text-sm text-gray-500">Up to 12 matches per category. Technician and service matches use member names and descriptions; they are not certification claims. Recruiter and people links open a conversation.</p></div>
    {groups.map(group => <section key={group.title} className="space-y-3"><h2 className="text-lg font-bold">{group.title}</h2>{!group.rows.length && <p className="text-sm text-gray-500">No matches in this category.</p>}<div className="grid gap-3 sm:grid-cols-2">{group.rows.map(row => <Link key={row.id} href={row.href} className="rounded-xl border bg-white p-4 hover:border-blue-500 dark:bg-gray-900"><h3 className="font-semibold">{row.title}</h3><p className="mt-1 break-words text-sm text-gray-500">{row.detail}</p></Link>)}</div></section>)}
  </section>;
}
