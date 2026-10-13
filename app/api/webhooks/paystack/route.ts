import { createHmac, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { activateVerifiedPremiumListing } from "@/lib/adCampaignNotifications";
import { prisma } from "@/lib/prisma";
import { completeVerifiedOrderPayment } from "@/lib/orderNotifications";

const webhookSchema = z.object({ event: z.string(), data: z.object({ reference: z.string().min(1).max(500).optional() }).optional() });

export async function POST(request: Request) {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  const signature = request.headers.get("x-paystack-signature");
  const rawBody = await request.text();
  if (!secret || !signature || !/^[a-f0-9]{128}$/i.test(signature)) return NextResponse.json({ error: "Invalid webhook signature." }, { status: 401 });
  const expected = createHmac("sha512", secret).update(rawBody).digest("hex");
  const signaturesMatch = signature.length === expected.length && timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  if (!signaturesMatch) return NextResponse.json({ error: "Invalid webhook signature." }, { status: 401 });
  const parsed = webhookSchema.safeParse(await Promise.resolve().then(() => JSON.parse(rawBody)).catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid webhook payload." }, { status: 400 });
  const payload = parsed.data;
  const reference = payload.data?.reference;
  if (payload.event !== "charge.success" || !reference) return NextResponse.json({ received: true });
  try {
  const payment = await prisma.payment.findFirst({ where: { reference, provider: "PAYSTACK" }, include: { order: { select: { status: true } } } });
  if (!payment) {
    const campaign = await prisma.adCampaign.findFirst({
      where: { paymentReference: reference, paymentProvider: "PAYSTACK" },
      include: { vendor: { select: { userId: true } }, product: { select: { name: true } } },
    });
    if (!campaign || !["PENDING_PAYMENT", "CANCELLED"].includes(campaign.status)) return NextResponse.json({ received: true });

    const response = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, { headers: { Authorization: `Bearer ${secret}` }, cache: "no-store", signal: AbortSignal.timeout(15000) });
    if (!response.ok) return NextResponse.json({ error: "Payment verification temporarily unavailable." }, { status: 503 });
    const result = await response.json();
    if (result.status !== true) return NextResponse.json({ error: "Payment verification could not be completed." }, { status: 503 });
    const isPaid = response.ok
      && result.status === true
      && result.data?.status === "success"
      && result.data?.reference === reference
      && result.data?.currency === "NGN"
      && typeof result.data?.amount === "number" && Number.isFinite(result.data.amount)
      && result.data?.amount >= Math.round(campaign.amount * 100);
    if (isPaid) await activateVerifiedPremiumListing(campaign, "PAYSTACK", reference);
    return NextResponse.json({ received: true });
  }

  if (payment.status === "SUCCESS") return NextResponse.json({ received: true });
  const response = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, { headers: { Authorization: `Bearer ${secret}` }, cache: "no-store", signal: AbortSignal.timeout(15000) });
  if (!response.ok) return NextResponse.json({ error: "Payment verification temporarily unavailable." }, { status: 503 });
  const result = await response.json();
  if (result.status !== true) return NextResponse.json({ error: "Payment verification could not be completed." }, { status: 503 });
  const isPaid = response.ok && result.status === true && result.data?.status === "success" && result.data?.reference === reference && result.data?.currency === "NGN" && typeof result.data?.amount === "number" && Number.isFinite(result.data.amount) && result.data.amount >= Math.round(payment.amount * 100);
  if (!isPaid) return NextResponse.json({ received: true });
  await completeVerifiedOrderPayment(payment.id);
  return NextResponse.json({ received: true });
  } catch {
    return NextResponse.json({ error: "Payment verification temporarily unavailable." }, { status: 503 });
  }
}
