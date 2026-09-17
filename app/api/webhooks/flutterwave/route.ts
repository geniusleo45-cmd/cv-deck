import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type FlutterwaveWebhook = {
  event?: string;
  data?: {
    id?: number | string;
    tx_ref?: string;
    status?: string;
    amount?: number;
    currency?: string;
  };
};

export async function POST(request: Request) {
  const secretHash = process.env.FLW_WEBHOOK_SECRET_HASH;
  const signature = request.headers.get("verif-hash");

  if (!secretHash || !signature || signature !== secretHash) {
    return NextResponse.json({ error: "Invalid webhook signature." }, { status: 401 });
  }

  const payload = await request.json().catch(() => null) as FlutterwaveWebhook | null;
  const reference = payload?.data?.tx_ref;
  const transactionId = payload?.data?.id;

  // Acknowledge unrelated events and incomplete payment notifications quickly.
  if (!reference || !transactionId || payload.data?.status !== "successful") {
    return NextResponse.json({ received: true });
  }

  const payment = await prisma.payment.findFirst({
    where: { reference, provider: "FLUTTERWAVE" },
    include: { order: { select: { status: true } } },
  });

  // Duplicate events or payments that do not belong to CV Deck are safe to ignore.
  if (!payment || payment.status === "SUCCESS" || payment.order.status === "CANCELLED") {
    return NextResponse.json({ received: true });
  }

  if (!process.env.FLW_SECRET_KEY) {
    return NextResponse.json({ error: "Payment verification is not configured." }, { status: 500 });
  }

  const verificationResponse = await fetch(
    `https://api.flutterwave.com/v3/transactions/${encodeURIComponent(String(transactionId))}/verify`,
    { headers: { Authorization: `Bearer ${process.env.FLW_SECRET_KEY}` } }
  );
  const verification = await verificationResponse.json();
  const isVerified = verificationResponse.ok
    && verification.status === "success"
    && verification.data?.status === "successful"
    && verification.data?.tx_ref === payment.reference
    && verification.data?.currency === "NGN"
    && verification.data?.amount >= payment.amount;

  if (!isVerified) {
    return NextResponse.json({ received: true });
  }

  await prisma.$transaction([
    prisma.payment.update({
      where: { id: payment.id },
      data: { status: "SUCCESS", verifiedAt: new Date() },
    }),
    prisma.order.update({
      where: { id: payment.orderId },
      data: { status: "PROCESSING" },
    }),
  ]);

  return NextResponse.json({ received: true });
}
