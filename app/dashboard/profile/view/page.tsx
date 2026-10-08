import Link from "next/link";
import { requireAuth } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

export default async function MyProfilePage() {
  const session = await requireAuth();
  const user = await prisma.user.findUniqueOrThrow({ where: { id: session.id }, select: { name: true, email: true, bio: true, role: true, vendorProfile: { select: { id: true, businessName: true } } } });
  return <section className="mx-auto max-w-2xl space-y-4 rounded-2xl border p-6">
    <h1 className="text-2xl font-bold">My Profile</h1><p className="text-sm text-gray-500">Your private account overview.</p>
    <h2 className="text-xl font-bold">{user.name || "CV Deck member"}</h2><p>{user.email}</p><p>{user.role}</p><p className="whitespace-pre-wrap">{user.bio || "No bio added yet."}</p>
    {user.vendorProfile && <Link className="block font-bold text-blue-600" href={`/vendors/${user.vendorProfile.id}`}>View public shop: {user.vendorProfile.businessName}</Link>}
    <Link href="/dashboard/profile" className="block font-bold text-blue-600">Edit account profile</Link>
  </section>;
}
