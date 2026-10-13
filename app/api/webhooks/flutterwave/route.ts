import { NextResponse } from "next/server";
import { z } from "zod";
import { activateVerifiedPremiumListing } from "@/lib/adCampaignNotifications";
import { prisma } from "@/lib/prisma";
import { completeVerifiedOrderPayment } from "@/lib/orderNotifications";

const webhookSchema = z.object({ event: z.string(), data: z.object({
  id: z.union([z.number().int().positive(), z.string().regex(/^\d+$/).max(100)]).optional(),
  tx_ref: z.string().min(1).max(500).optional(), status: z.string().optional(),
}).optional() });

export async function POST(request: Request) {
  const secretHash = process.env.FLW_WEBHOOK_SECRET_HASH;
  const signature = request.headers.get("verif-hash");

  if (!secretHash || !signature || signature !== secretHash) {
    return NextResponse.json({ error: "Invalid webhook signature." }, { status: 401 });
  }

  const parsed = webhookSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid webhook payload." }, { status: 400 });
  const payload = parsed.data;
  const reference = payload?.data?.tx_ref;
  const transactionId = payload?.data?.id;

  // Acknowledge unrelated events and incomplete payment notifications quickly.
  if (payload.event !== "charge.completed" || !reference || !transactionId || payload.data?.status !== "successful") {
    return NextResponse.json({ received: true });
  }

  try {
  const payment = await prisma.payment.findFirst({
    where: { reference, provider: "FLUTTERWAVE" },
    include: { order: { select: { status: true } } },
  });
  const campaign = payment
    ? null
    : await prisma.adCampaign.findFirst({
      where: { paymentReference: reference, paymentProvider: "FLUTTERWAVE" },
      include: { vendor: { select: { userId: true } }, product: { select: { name: true } } },
    });

  // Duplicate events or payments that do not belong to CV Deck are safe to ignore.
  if ((!payment && (!campaign || !["PENDING_PAYMENT", "CANCELLED"].includes(campaign.status))) || payment?.status === "SUCCESS") {
    return NextResponse.json({ received: true });
  }

  if (!process.env.FLW_SECRET_KEY) {
    return NextResponse.json({ error: "Payment verification is not configured." }, { status: 500 });
  }

  const verificationResponse = await fetch(
    `https://api.flutterwave.com/v3/transactions/${encodeURIComponent(String(transactionId))}/verify`,
    { headers: { Authorization: `Bearer ${process.env.FLW_SECRET_KEY}` }, cache: "no-store", signal: AbortSignal.timeout(15000) }
  );
  if (!verificationResponse.ok) return NextResponse.json({ error: "Payment verification temporarily unavailable." }, { status: 503 });
  const verification = await verificationResponse.json();
  if (verification.status !== "success") return NextResponse.json({ error: "Payment verification could not be completed." }, { status: 503 });
  const isVerified = verificationResponse.ok
    && verification.status === "success"
    && verification.data?.status === "successful"
    && verification.data?.tx_ref === reference
    && verification.data?.currency === "NGN"
    && typeof verification.data?.amount === "number" && Number.isFinite(verification.data.amount)
    && verification.data?.amount >= (payment?.amount ?? campaign!.amount);

  if (!isVerified) {
    return NextResponse.json({ received: true });
  }

  if (campaign) {
    await activateVerifiedPremiumListing(campaign, "FLUTTERWAVE", reference);
    return NextResponse.json({ received: true });
  }
  if (!payment) return NextResponse.json({ received: true });

  await completeVerifiedOrderPayment(payment.id);

  return NextResponse.json({ received: true });
  } catch {
    return NextResponse.json({ error: "Payment verification temporarily unavailable." }, { status: 503 });
  }
}
