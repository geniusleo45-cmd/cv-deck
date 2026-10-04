import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { completeVerifiedOrderPayment } from "@/lib/orderNotifications";

export async function POST(req: Request) {
  try {
    const { reference } = await req.json();

    if (!reference) {
      return NextResponse.json({ error: "Payment reference required" }, { status: 400 });
    }

    const payment = await prisma.payment.findUnique({
      where: { reference },
      include: { order: true },
    });

    if (!payment) {
      return NextResponse.json({ error: "Payment record not found" }, { status: 404 });
    }

    if (payment.status === "SUCCESS") {
      return NextResponse.json({ status: "SUCCESS", payment, message: "Payment already verified." });
    }

    const finalization = await completeVerifiedOrderPayment(payment.id);
    if (finalization === "cancelled") return NextResponse.json({ error: "This order has been cancelled." }, { status: 409 });
    if (finalization === "missing") return NextResponse.json({ error: "Payment record not found" }, { status: 404 });
    const updatedPayment = await prisma.payment.findUnique({ where: { id: payment.id } });

    return NextResponse.json({
      status: "SUCCESS",
      payment: updatedPayment,
      message: "Payment verified successfully!",
    });
  } catch (error) {
    console.error("Mock verify error:", error);
    return NextResponse.json({ error: "Payment verification failed" }, { status: 500 });
  }
}
