import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/rbac";
import { AdminVendorReviewQueue } from "../AdminVendorReviewQueue";

export default async function AdminVerificationsPage() {
  await requireAdmin();
  const verifications = await prisma.vendorVerification.findMany({ where: { status: "PENDING" }, include: { vendor: { include: { user: { select: { name: true, email: true, phone: true } } } } }, orderBy: { createdAt: "desc" } });
  return <section className="space-y-6"><div><h1 className="text-2xl font-black">Vendor verification queue</h1><p className="mt-1 text-sm text-gray-500">Review documents and approve verified Computer Village shops.</p></div><div className="rounded-2xl border bg-white p-6 dark:bg-gray-900"><AdminVendorReviewQueue verifications={verifications} /></div></section>;
}
