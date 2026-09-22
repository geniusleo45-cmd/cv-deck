import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const inputSchema = z.object({ orderId: z.string().min(1) });

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Please sign in to pay for an order." }, { status: 401 });
  if (!process.env.PAYSTACK_SECRET_KEY) return NextResponse.json({ error: "Payments are not configured yet. Add PAYSTACK_SECRET_KEY to enable Paystack." }, { status: 503 });

  const input = inputSchema.safeParse(await request.json().catch(() => null));
  if (!input.success) return NextResponse.json({ error: "Invalid order." }, { status: 400 });
  const order = await prisma.order.findFirst({ where: { id: input.data.orderId, userId: session.user.id }, include: { payment: true, user: { select: { email: true, name: true, phone: true } } } });
  if (!order) return NextResponse.json({ error: "Order not found." }, { status: 404 });
  if (order.status !== "PENDING") return NextResponse.json({ error: "This order is no longer awaiting payment." }, { status: 409 });
  if (order.payment?.status === "SUCCESS") return NextResponse.json({ error: "This order has already been paid for." }, { status: 409 });
  if (order.payment?.provider === "PAYSTACK" && order.payment.authorizationUrl) return NextResponse.json({ authorizationUrl: order.payment.authorizationUrl });

  const reference = `cvdeck-${order.id}-${Date.now()}`;
  const callbackUrl = new URL("/dashboard/payment/callback", request.url);
  callbackUrl.searchParams.set("provider", "paystack");
  const response = await fetch("https://api.paystack.co/transaction/initialize", { method: "POST", headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`, "Content-Type": "application/json" }, body: JSON.stringify({ email: order.user.email, amount: Math.round(order.totalAmount * 100), currency: "NGN", reference, callback_url: callbackUrl.toString(), metadata: { orderId: order.id, customerName: order.user.name || undefined, phone: order.user.phone || undefined } }) });
  const result = await response.json();
  if (!response.ok || !result.status || !result.data?.authorization_url) return NextResponse.json({ error: result.message || "Unable to start Paystack payment." }, { status: 502 });
  await prisma.payment.upsert({ where: { orderId: order.id }, create: { orderId: order.id, provider: "PAYSTACK", reference, amount: order.totalAmount, authorizationUrl: result.data.authorization_url }, update: { provider: "PAYSTACK", reference, amount: order.totalAmount, status: "PENDING", authorizationUrl: result.data.authorization_url, verifiedAt: null } });
  return NextResponse.json({ authorizationUrl: result.data.authorization_url });
}
