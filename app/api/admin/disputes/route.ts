import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

const schema = z.object({ id: z.string().min(1), status: z.enum(["OPEN", "UNDER_REVIEW", "RESOLVED", "REJECTED"]), adminNote: z.string().trim().max(1200).optional() });

export async function PUT(request: Request) {
  try {
    await requireAdmin();
    const input = schema.parse(await request.json());
    const dispute = await prisma.dispute.update({ where: { id: input.id }, data: { status: input.status, adminNote: input.adminNote || null }, include: { order: { select: { orderNumber: true } } } });
    await prisma.notification.create({ data: { userId: dispute.userId, type: "SYSTEM", title: "Order support request updated", message: `Your request for order #${dispute.order.orderNumber} is now ${input.status.toLowerCase().replace("_", " ")}.`, link: "/dashboard/orders" } });
    return NextResponse.json(dispute);
  } catch (error: any) {
    if (error.name === "ZodError") return NextResponse.json({ error: "Invalid support update." }, { status: 400 });
    return NextResponse.json({ error: "Unable to update the support request." }, { status: 500 });
  }
}
