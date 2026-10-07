import Link from "next/link";
import { requireAdmin } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

export default async function PaymentReviewPage() {
  await requireAdmin();
  const payments = await prisma.payment.findMany({
    where: { status: "SUCCESS", verifiedAt: { not: null }, order: { status: "CANCELLED" } },
    include: { order: { select: { orderNumber: true, user: { select: { name: true, email: true } } } } },
    orderBy: { verifiedAt: "desc" },
    take: 100,
  });
  return <section className="space-y-6">
    <h1 className="text-2xl font-black">Cancelled-order payment review</h1>
    <p className="text-sm text-gray-500">Payment received — needs review. These orders remain cancelled and must not be fulfilled. Check each reference in the provider dashboard and handle any refund manually. This read-only list does not track external refund completion; keep your resolution record with the provider. Showing the latest 100 verified payments.</p>
    <Link href="/dashboard/admin/orders" className="text-sm font-bold text-blue-600">Back to global orders</Link>
    {payments.length === 0 && <p>No verified payments on cancelled orders.</p>}
    <div className="space-y-3">{payments.map((payment) => <article key={payment.id} className="rounded-xl border p-4">
      <h2 className="font-bold">Order #{payment.order.orderNumber}</h2>
      <p className="text-sm">{payment.order.user.name || payment.order.user.email} · {payment.order.user.email}</p>
      <p className="text-sm">{payment.provider} · Expected order amount: ₦{payment.amount.toLocaleString()}</p>
      <p className="break-all text-sm">Reference: {payment.reference}</p>
      <p className="text-xs text-gray-500">Verified: {payment.verifiedAt?.toISOString()}</p>
      <p className="mt-2 text-sm font-bold text-amber-700 dark:text-amber-300">Payment verified; order cancelled. Manual provider review required.</p>
    </article>)}</div>
  </section>;
}
