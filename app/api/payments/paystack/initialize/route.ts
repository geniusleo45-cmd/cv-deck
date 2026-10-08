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
  if (order.payment && order.payment.provider !== "PAYSTACK") return NextResponse.json({ error: "This order already has a checkout with another provider. Resume that checkout to preserve its payment reference." }, { status: 409 });
  if (order.payment?.provider === "PAYSTACK" && order.payment.authorizationUrl) return NextResponse.json({ authorizationUrl: order.payment.authorizationUrl });

  if (order.payment) return NextResponse.json({ error: "This payment reference is reserved but its checkout link is unavailable. Contact support to reconcile it before starting another payment." }, { status: 409 });
  const reference = `cvdeck-${order.id}-${Date.now()}`;
  // Persist before contacting Paystack. The unique orderId prevents two callers
  // from creating competing checkouts; ambiguous failures retain this reference.
  try {
    await prisma.payment.create({ data: { orderId: order.id, provider: "PAYSTACK", reference, amount: order.totalAmount } });
  } catch {
    return NextResponse.json({ error: "Checkout could not be reserved. Refresh to resume any existing payment; do not start another payment." }, { status: 409 });
  }
  const callbackUrl = new URL("/dashboard/payment/callback", request.url);
  callbackUrl.searchParams.set("provider", "paystack");
  let response: Response;
  let result;
  try {
    response = await fetch("https://api.paystack.co/transaction/initialize", { method: "POST", signal: AbortSignal.timeout(15000), headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`, "Content-Type": "application/json" }, body: JSON.stringify({ email: order.user.email, amount: Math.round(order.totalAmount * 100), currency: "NGN", reference, callback_url: callbackUrl.toString(), metadata: { orderId: order.id, customerName: order.user.name || undefined, phone: order.user.phone || undefined } }) });
    result = await response.json();
  } catch {
    return NextResponse.json({ error: "Paystack checkout could not be confirmed. Your reference is preserved; contact support before attempting another payment." }, { status: 502 });
  }
  if (!response.ok || !result.status || !result.data?.authorization_url) return NextResponse.json({ error: result.message || "Unable to start Paystack payment." }, { status: 502 });
  const saved = await prisma.payment.updateMany({ where: { orderId: order.id, provider: "PAYSTACK", reference, status: "PENDING", order: { status: "PENDING" } }, data: { authorizationUrl: result.data.authorization_url } });
  if (!saved.count) return NextResponse.json({ error: "The order or payment changed. Refresh your orders before continuing." }, { status: 409 });
  return NextResponse.json({ authorizationUrl: result.data.authorization_url });
}
