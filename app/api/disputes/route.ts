import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  orderId: z.string().min(1),
  reason: z.enum(["ITEM_NOT_RECEIVED", "ITEM_NOT_AS_DESCRIBED", "DAMAGED_OR_FAULTY", "OTHER"]),
  details: z.string().trim().min(10, "Please provide at least 10 characters.").max(1200),
});

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Please sign in to request order support." }, { status: 401 });
    const input = schema.parse(await request.json());
    const order = await prisma.order.findFirst({ where: { id: input.orderId, userId: user.id }, include: { payment: true } });
    if (!order) return NextResponse.json({ error: "Order not found." }, { status: 404 });
    if (order.status === "CANCELLED" || order.payment?.status !== "SUCCESS") return NextResponse.json({ error: "Support requests are available for paid orders only." }, { status: 400 });

    const dispute = await prisma.dispute.create({ data: { ...input, userId: user.id } });
    const admins = await prisma.user.findMany({ where: { role: "ADMIN" }, select: { id: true } });
    if (admins.length) await prisma.notification.createMany({ data: admins.map((admin) => ({ userId: admin.id, type: "SYSTEM", title: "New order support request", message: `Order #${order.orderNumber} needs review.`, link: "/dashboard/admin/disputes" })) });
    return NextResponse.json(dispute, { status: 201 });
  } catch (error: any) {
    if (error.name === "ZodError") return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    if (error.code === "P2002") return NextResponse.json({ error: "A support request already exists for this order." }, { status: 409 });
    return NextResponse.json({ error: "Unable to submit the support request." }, { status: 500 });
  }
}
