import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notifyVendorsOfPaidOrder } from "@/lib/orderNotifications";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  const reference = new URL(request.url).searchParams.get("reference");
  if (!session?.user?.id || !reference) return NextResponse.json({ error: "Invalid payment verification request." }, { status: 400 });
  if (!process.env.PAYSTACK_SECRET_KEY) return NextResponse.json({ error: "Payments are not configured yet." }, { status: 503 });
  const payment = await prisma.payment.findFirst({ where: { reference, provider: "PAYSTACK", order: { userId: session.user.id } }, include: { order: { select: { status: true } } } });
  if (!payment) return NextResponse.json({ error: "Payment not found." }, { status: 404 });
  if (payment.status === "SUCCESS") return NextResponse.json({ orderId: payment.orderId });
  if (payment.order.status === "CANCELLED") return NextResponse.json({ error: "This order has been cancelled." }, { status: 409 });
  const response = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, { headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` } });
  const result = await response.json();
  const isPaid = response.ok && result.status === true && result.data?.status === "success" && result.data?.reference === reference && result.data?.currency === "NGN" && result.data?.amount >= Math.round(payment.amount * 100);
  if (!isPaid) { if (result.data?.status === "failed") await prisma.payment.update({ where: { id: payment.id }, data: { status: "FAILED" } }); return NextResponse.json({ error: "Payment was not completed." }, { status: 400 }); }
  await prisma.$transaction([prisma.payment.update({ where: { id: payment.id }, data: { status: "SUCCESS", verifiedAt: new Date() } }), prisma.order.update({ where: { id: payment.orderId }, data: { status: "PROCESSING" } })]);
  await notifyVendorsOfPaidOrder(payment.orderId);
  return NextResponse.json({ orderId: payment.orderId });
}
