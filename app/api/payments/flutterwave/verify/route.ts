import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { completeVerifiedOrderPayment } from "@/lib/orderNotifications";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  const url = new URL(request.url);
  const reference = url.searchParams.get("reference");
  const transactionId = url.searchParams.get("transactionId");
  if (!session?.user?.id || !reference || !transactionId) return NextResponse.json({ error: "Invalid payment verification request." }, { status: 400 });
  if (!process.env.FLW_SECRET_KEY) return NextResponse.json({ error: "Payments are not configured yet." }, { status: 503 });
  const payment = await prisma.payment.findFirst({ where: { reference, provider: "FLUTTERWAVE", order: { userId: session.user.id } }, include: { order: { select: { status: true } } } });
  if (!payment) return NextResponse.json({ error: "Payment not found." }, { status: 404 });
  if (payment.status === "SUCCESS") return payment.order.status === "CANCELLED"
    ? NextResponse.json({ error: "Payment received for a cancelled order. Contact support for manual review; no automatic refund has been issued." }, { status: 409 })
    : NextResponse.json({ orderId: payment.orderId });
  const response = await fetch(`https://api.flutterwave.com/v3/transactions/${encodeURIComponent(transactionId)}/verify`, { headers: { Authorization: `Bearer ${process.env.FLW_SECRET_KEY}` } });
  const result = await response.json();
  const isPaid = response.ok && result.status === "success" && result.data?.status === "successful" && result.data?.tx_ref === reference && result.data?.amount >= payment.amount && result.data?.currency === "NGN";
  if (!isPaid) { if (response.ok && result.data?.status === "failed") await prisma.payment.updateMany({ where: { id: payment.id, status: "PENDING" }, data: { status: "FAILED" } }); return NextResponse.json({ error: "Payment was not completed." }, { status: 400 }); }
  const finalization = await completeVerifiedOrderPayment(payment.id);
  if (finalization === "cancelled") return NextResponse.json({ error: "Payment received for a cancelled order. Contact support for manual review; no automatic refund has been issued." }, { status: 409 });
  if (finalization === "missing") return NextResponse.json({ error: "Payment not found." }, { status: 404 });
  return NextResponse.json({ orderId: payment.orderId });
}
