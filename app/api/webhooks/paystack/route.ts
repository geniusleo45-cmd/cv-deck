import { createHmac, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type PaystackWebhook = { event?: string; data?: { reference?: string } };

export async function POST(request: Request) {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  const signature = request.headers.get("x-paystack-signature");
  const rawBody = await request.text();
  if (!secret || !signature) return NextResponse.json({ error: "Invalid webhook signature." }, { status: 401 });
  const expected = createHmac("sha512", secret).update(rawBody).digest("hex");
  const signaturesMatch = signature.length === expected.length && timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  if (!signaturesMatch) return NextResponse.json({ error: "Invalid webhook signature." }, { status: 401 });
  const payload = JSON.parse(rawBody) as PaystackWebhook;
  const reference = payload.data?.reference;
  if (payload.event !== "charge.success" || !reference) return NextResponse.json({ received: true });
  const payment = await prisma.payment.findFirst({ where: { reference, provider: "PAYSTACK" }, include: { order: { select: { status: true } } } });
  if (!payment || payment.status === "SUCCESS" || payment.order.status === "CANCELLED") return NextResponse.json({ received: true });
  const response = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, { headers: { Authorization: `Bearer ${secret}` } });
  const result = await response.json();
  const isPaid = response.ok && result.status === true && result.data?.status === "success" && result.data?.reference === reference && result.data?.currency === "NGN" && result.data?.amount >= Math.round(payment.amount * 100);
  if (!isPaid) return NextResponse.json({ received: true });
  await prisma.$transaction([prisma.payment.update({ where: { id: payment.id }, data: { status: "SUCCESS", verifiedAt: new Date() } }), prisma.order.update({ where: { id: payment.orderId }, data: { status: "PROCESSING" } })]);
  return NextResponse.json({ received: true });
}
