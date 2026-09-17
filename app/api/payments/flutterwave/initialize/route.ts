import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const inputSchema = z.object({ orderId: z.string().min(1) });

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Please sign in to pay for an order." }, { status: 401 });
  if (!process.env.FLW_SECRET_KEY) return NextResponse.json({ error: "Payments are not configured yet. Add FLW_SECRET_KEY to enable checkout." }, { status: 503 });
  const input = inputSchema.safeParse(await request.json().catch(() => null));
  if (!input.success) return NextResponse.json({ error: "Invalid order." }, { status: 400 });
  const order = await prisma.order.findFirst({ where: { id: input.data.orderId, userId: session.user.id }, include: { payment: true, user: { select: { email: true, name: true, phone: true } } } });
  if (!order) return NextResponse.json({ error: "Order not found." }, { status: 404 });
  if (order.status !== "PENDING") return NextResponse.json({ error: "This order is no longer awaiting payment." }, { status: 409 });
  if (order.payment?.status === "SUCCESS") return NextResponse.json({ error: "This order has already been paid for." }, { status: 409 });
  if (order.payment?.status === "PENDING" && order.payment.authorizationUrl) return NextResponse.json({ authorizationUrl: order.payment.authorizationUrl });

  const reference = `cvdeck-${order.id}-${Date.now()}`;
  const redirectUrl = new URL("/dashboard/payment/callback", request.url).toString();
  const response = await fetch("https://api.flutterwave.com/v3/payments", { method: "POST", headers: { Authorization: `Bearer ${process.env.FLW_SECRET_KEY}`, "Content-Type": "application/json" }, body: JSON.stringify({ tx_ref: reference, amount: order.totalAmount, currency: "NGN", redirect_url: redirectUrl, payment_options: "card, ussd, banktransfer, account, internetbanking, nqr, enaira, opay", customer: { email: order.user.email, name: order.user.name || undefined, phonenumber: order.user.phone || undefined }, customizations: { title: "CV Deck", description: `Payment for order ${order.id.slice(-8).toUpperCase()}` } }) });
  const result = await response.json();
  if (!response.ok || result.status !== "success" || !result.data?.link) return NextResponse.json({ error: result.message || "Unable to start payment." }, { status: 502 });
  await prisma.payment.upsert({ where: { orderId: order.id }, create: { orderId: order.id, provider: "FLUTTERWAVE", reference, amount: order.totalAmount, authorizationUrl: result.data.link }, update: { provider: "FLUTTERWAVE", reference, amount: order.totalAmount, status: "PENDING", authorizationUrl: result.data.link, verifiedAt: null } });
  return NextResponse.json({ authorizationUrl: result.data.link });
}
