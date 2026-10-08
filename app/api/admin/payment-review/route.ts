import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { completeVerifiedOrderPayment } from "@/lib/orderNotifications";
import { activateVerifiedPremiumListing } from "@/lib/adCampaignNotifications";

const inputSchema = z.object({ id: z.string().min(1), kind: z.enum(["order", "campaign"]) });

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "Administrator access required." }, { status: 403 });
  const input = inputSchema.safeParse(await request.json().catch(() => null));
  if (!input.success) return NextResponse.json({ error: "Invalid payment review request." }, { status: 400 });
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) return NextResponse.json({ error: "Paystack is not configured." }, { status: 503 });
  try {
    const payment = input.data.kind === "order" ? await prisma.payment.findFirst({ where: { id: input.data.id, provider: "PAYSTACK" } }) : null;
    const campaign = input.data.kind === "campaign" ? await prisma.adCampaign.findFirst({
      where: { id: input.data.id, paymentProvider: "PAYSTACK" },
      include: { vendor: { select: { userId: true } }, product: { select: { name: true } } },
    }) : null;
    const reference = payment?.reference || campaign?.paymentReference;
    if (!reference) return NextResponse.json({ error: "Paystack reference not found." }, { status: 404 });
    const response = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: { Authorization: `Bearer ${secret}` }, cache: "no-store", signal: AbortSignal.timeout(15000),
    });
    const result = await response.json();
    if (!response.ok || result.status !== true) return NextResponse.json({ error: "Paystack could not verify this reference. No records changed; review it with Paystack support." }, { status: 502 });
    if (result.data?.status !== "success") return NextResponse.json({ message: "Paystack has not confirmed a successful payment. The reference is preserved; no new checkout or refund was created." });
    const amount = payment?.amount ?? campaign!.amount;
    if (result.data.reference !== reference || result.data.currency !== "NGN" || typeof result.data.amount !== "number" || !Number.isFinite(result.data.amount) || result.data.amount < Math.round(amount * 100)) {
      return NextResponse.json({ error: "Payment details do not match. Manual provider review required; no records changed." }, { status: 409 });
    }
    if (payment) {
      const outcome = await completeVerifiedOrderPayment(payment.id);
      if (outcome === "missing") return NextResponse.json({ error: "Payment no longer exists." }, { status: 404 });
      return NextResponse.json({ message: outcome === "cancelled" ? "Payment recorded. Order remains cancelled; manual refund review is required." : "Payment verified and reconciled. No new charge was created." });
    }
    if (!campaign) return NextResponse.json({ error: "Campaign not found." }, { status: 404 });
    if (campaign.status !== "PENDING_PAYMENT") return NextResponse.json({ message: "Payment verified. Campaign already processed; no placement changes made." });
    const outcome = await activateVerifiedPremiumListing(campaign, "PAYSTACK", reference);
    if (outcome === "ineligible" || outcome === "product-already-promoted") return NextResponse.json({ error: "Payment confirmed, but placement cannot be activated. Review the advertising support case; no refund was issued." }, { status: 409 });
    return NextResponse.json({ message: "Payment verified and campaign reconciled. No new charge was created." });
  } catch {
    return NextResponse.json({ error: "Verification could not finish. Refresh and retry the same reference; do not request another payment." }, { status: 503 });
  }
}
