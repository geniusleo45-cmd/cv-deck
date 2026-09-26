import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { notifyVendorsOfPaidOrder } from "@/lib/orderNotifications";

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

    const updatedPayment = await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: "SUCCESS",
        verifiedAt: new Date(),
      },
    });

    await prisma.order.update({
      where: { id: payment.orderId },
      data: { status: "PROCESSING" },
    });
    await notifyVendorsOfPaidOrder(payment.orderId);

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
