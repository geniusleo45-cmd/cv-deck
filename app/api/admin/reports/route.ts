import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

const statusSchema = z.object({ id: z.string().min(1), status: z.enum(["REVIEWED", "DISMISSED"]) });
const moderationSchema = z.object({ id: z.string().min(1), action: z.enum(["HIDE_PRODUCT", "RESTORE_PRODUCT"]) });

export async function PUT(request: Request) {
  try {
    await requireAdmin();
    const body = await request.json();

    if (body.action) {
      const input = moderationSchema.parse(body);
      const report = await prisma.report.findUnique({ where: { id: input.id } });
      if (!report) return NextResponse.json({ error: "Report not found." }, { status: 404 });
      if (report.targetType !== "PRODUCT") return NextResponse.json({ error: "Only product reports can change a listing." }, { status: 400 });

      const product = await prisma.product.findUnique({ where: { id: report.targetId }, select: { id: true } });
      if (!product) return NextResponse.json({ error: "The reported product no longer exists." }, { status: 404 });

      const productStatus = input.action === "HIDE_PRODUCT" ? "INACTIVE" : "ACTIVE";
      await prisma.$transaction([
        prisma.product.update({ where: { id: product.id }, data: { status: productStatus } }),
        prisma.report.update({ where: { id: report.id }, data: { status: "REVIEWED" } }),
      ]);
      return NextResponse.json({ status: "REVIEWED", productStatus });
    }

    const input = statusSchema.parse(body);
    const report = await prisma.report.update({ where: { id: input.id }, data: { status: input.status } });
    return NextResponse.json(report);
  } catch (error: any) {
    if (error.name === "ZodError") return NextResponse.json({ error: "Invalid report update." }, { status: 400 });
    return NextResponse.json({ error: "Unable to update report." }, { status: 500 });
  }
}
