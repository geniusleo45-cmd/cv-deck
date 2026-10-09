import Link from "next/link";
import { requireAdmin } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { CheckPaymentButton } from "./CheckPaymentButton";
import { ResolutionEditor } from "./ResolutionEditor";

export default async function PaymentReviewPage({ searchParams }: { searchParams: Promise<{ reference?: string }> }) {
  await requireAdmin();
  const reference = (await searchParams).reference?.slice(0, 200) || "";
  const history = await prisma.paymentReviewEntry.findMany({ where: reference ? { paymentReference: { contains: reference, mode: "insensitive" } } : {}, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 100 });
  // Allow in-flight initialization to finish before surfacing a missing link.
  const cutoff = new Date(Date.now() - 5 * 60 * 1000);
  const [interruptedOrders, interruptedCampaigns] = await Promise.all([
    prisma.payment.findMany({
      where: { provider: "PAYSTACK", status: { in: ["PENDING", "FAILED"] }, verifiedAt: null, authorizationUrl: null, createdAt: { lt: cutoff } },
      include: { order: { select: { orderNumber: true, status: true, user: { select: { email: true } } } } },
      orderBy: { createdAt: "asc" }, take: 100,
    }),
    prisma.adCampaign.findMany({
      where: { paymentProvider: "PAYSTACK", status: "PENDING_PAYMENT", paymentReference: { not: null }, authorizationUrl: null, updatedAt: { lt: cutoff } },
      include: { product: { select: { name: true } }, vendor: { select: { businessName: true } } },
      orderBy: { updatedAt: "asc" }, take: 100,
    }),
  ]);
  const payments = await prisma.payment.findMany({
    where: { status: "SUCCESS", verifiedAt: { not: null }, order: { status: "CANCELLED" } },
    include: { order: { select: { orderNumber: true, user: { select: { name: true, email: true } } } } },
    orderBy: { verifiedAt: "desc" },
    take: 100,
  });
  const latestReviews = await prisma.paymentReviewEntry.findMany({
    where: { OR: [
      { kind: "order", targetId: { in: [...interruptedOrders, ...payments].map((payment) => payment.id) } },
      { kind: "campaign", targetId: { in: interruptedCampaigns.map((campaign) => campaign.id) } },
    ] },
    distinct: ["kind", "targetId"], orderBy: [{ createdAt: "desc" }, { id: "desc" }],
  });
  const reviewStatus = (kind: string, id: string) => latestReviews.find((entry) => entry.kind === kind && entry.targetId === id)?.status.replaceAll("_", " ") || "NOT REVIEWED";
  return <section className="space-y-6">
    <h1 className="text-2xl font-black">Payment review</h1>
    <section className="space-y-3">
      <h2 className="text-lg font-bold">Interrupted Paystack checkouts</h2>
      <p className="text-sm text-gray-500">Preserved references without a checkout link after a five-minute grace period. Payment is not confirmed. Check the reference with Paystack before requesting another payment. This list may also include failed or expired attempts; a missing link alone does not prove a network failure. Up to 100 orders and 100 Premium Listings, oldest first.</p>
      {!interruptedOrders.length && !interruptedCampaigns.length && <p>No interrupted checkouts awaiting review.</p>}
      {interruptedOrders.map((payment) => <article key={payment.id} className="rounded-xl border p-4 text-sm">
        <h3 className="font-bold">Order #{payment.order.orderNumber}</h3>
        <p>{payment.order.user.email} · ₦{payment.amount.toLocaleString()}</p>
        <p>Order: {payment.order.status} · Payment: {payment.status} (not verified)</p>
        <p className="break-all">Reference: {payment.reference}</p>
        <p>Created: {payment.createdAt.toISOString()}</p>
        <CheckPaymentButton id={payment.id} kind="order" />
        <p className="mt-2 font-semibold">Manual review: {reviewStatus("order", payment.id)}</p>
        <ResolutionEditor targetId={payment.id} kind="order" />
        <p className="mt-2 font-semibold">Do not fulfill or reopen a cancelled order. Confirm the provider outcome before taking action.</p>
      </article>)}
      {interruptedCampaigns.map((campaign) => <article key={campaign.id} className="rounded-xl border p-4 text-sm">
        <h3 className="font-bold">Premium Listing: {campaign.product.name}</h3>
        <p>{campaign.vendor.businessName} · ₦{campaign.amount.toLocaleString()}</p>
        <p className="break-all">Reference: {campaign.paymentReference}</p>
        <p>Payment not verified; do not activate manually.</p>
        <CheckPaymentButton id={campaign.id} kind="campaign" />
        <p className="mt-2 font-semibold">Manual review: {reviewStatus("campaign", campaign.id)}</p>
        <ResolutionEditor targetId={campaign.id} kind="campaign" />
        <Link href="/dashboard/admin/advertising/payment-support" className="font-bold text-blue-600">Open advertising support</Link>
      </article>)}
    </section>
    <h2 className="text-lg font-bold">Verified payments on cancelled orders</h2>
    <p className="text-sm text-gray-500">These orders remain cancelled and must not be fulfilled. Check each reference in the provider dashboard and handle any refund manually. Record the outcome below; Admin notes are not independent confirmation of an external refund. Resolved cases remain visible for audit. Showing the latest 100 verified payments.</p>
    <Link href="/dashboard/admin/orders" className="text-sm font-bold text-blue-600">Back to global orders</Link>
    {payments.length === 0 && <p>No verified payments on cancelled orders.</p>}
    <div className="space-y-3">{payments.map((payment) => <article key={payment.id} className="rounded-xl border p-4">
      <h2 className="font-bold">Order #{payment.order.orderNumber}</h2>
      <p className="text-sm">{payment.order.user.name || payment.order.user.email} · {payment.order.user.email}</p>
      <p className="text-sm">{payment.provider} · Expected order amount: ₦{payment.amount.toLocaleString()}</p>
      <p className="break-all text-sm">Reference: {payment.reference}</p>
      <p className="text-xs text-gray-500">Verified: {payment.verifiedAt?.toISOString()}</p>
      <p className="mt-2 text-sm font-bold text-amber-700 dark:text-amber-300">Payment verified; order cancelled. Manual provider review required.</p>
      <ResolutionEditor targetId={payment.id} kind="order" />
      <p className="mt-2 text-sm font-semibold">Manual review: {reviewStatus("order", payment.id)}</p>
    </article>)}</div>
    <section className="space-y-3">
      <h2 className="text-lg font-bold">Review history</h2>
      <form className="flex flex-wrap gap-2">
        <input name="reference" aria-label="Search history by payment reference" placeholder="Search payment reference" defaultValue={reference} maxLength={200} className="min-w-0 rounded border bg-background p-2 text-sm" />
        <button className="rounded border px-3 py-2 text-sm">Search history</button>
        {reference && <Link href="/dashboard/admin/payment-review" className="p-2 text-sm underline">Clear</Link>}
      </form>
      <p className="text-sm text-gray-500">Latest 100 entries, newest first. Previous entries are retained, including after checkout reconciliation. Statuses describe manual review only, not payment state.</p>
      {!history.length && <p>No reviews recorded yet.</p>}
      {history.map((entry) => <article key={entry.id} className="space-y-1 rounded-xl border p-4 text-sm">
        <p className="font-bold">{entry.kind === "order" ? "Order payment" : "Premium Listing"} · {entry.status.replaceAll("_", " ")}</p>
        <p className="break-all">Payment reference: {entry.paymentReference}</p>
        <p className="whitespace-pre-wrap break-words">{entry.note}</p>
        {entry.externalReference && <p className="break-all">External reference: {entry.externalReference}</p>}
        <p className="text-xs text-gray-500">Recorded by {entry.adminName} · {entry.createdAt.toISOString()}</p>
        <ResolutionEditor targetId={entry.targetId} kind={entry.kind === "order" ? "order" : "campaign"} />
      </article>)}
    </section>
  </section>;
}
