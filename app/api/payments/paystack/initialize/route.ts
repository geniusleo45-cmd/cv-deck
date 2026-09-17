import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const sessionUser = await getCurrentUser();
    if (!sessionUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { orderId } = await req.json();

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { payment: true, user: true },
    });

    if (!order || !order.payment) {
      return NextResponse.json({ error: "Order or payment record not found" }, { status: 404 });
    }

    const paystackSecret = process.env.PAYSTACK_SECRET_KEY;

    if (!paystackSecret) {
      // Fallback to Mock Payment URL if secret key is not set
      const mockUrl = `/dashboard/payment/callback?reference=${order.payment.reference}&status=success`;
      return NextResponse.json({ authorization_url: mockUrl, mock: true });
    }

    // Call Paystack API
    const response = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${paystackSecret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: order.user.email,
        amount: Math.round(order.totalAmount * 100), // Kobo conversion
        reference: order.payment.reference,
        callback_url: `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/dashboard/payment/callback`,
      }),
    });

    const data = await response.json();
    if (data.status) {
      await prisma.payment.update({
        where: { id: order.payment.id },
        data: { authorizationUrl: data.data.authorization_url, provider: "PAYSTACK" },
      });
      return NextResponse.json({ authorization_url: data.data.authorization_url });
    }

    return NextResponse.json({ error: data.message || "Paystack initialization failed" }, { status: 400 });
  } catch (error) {
    console.error("Paystack Init Error:", error);
    return NextResponse.json({ error: "Failed to initialize payment" }, { status: 500 });
  }
}
