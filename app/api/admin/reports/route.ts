import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

const statusSchema = z.object({ id: z.string().min(1), status: z.enum(["REVIEWED", "DISMISSED"]) });
const moderationSchema = z.object({ id: z.string().min(1), action: z.enum(["HIDE_PRODUCT", "RESTORE_PRODUCT", "SUSPEND_VENDOR", "RESTORE_VENDOR"]) });

export async function PUT(request: Request) {
  try {
    await requireAdmin();
    const body = await request.json();

    if (body.action) {
      const input = moderationSchema.parse(body);
      const report = await prisma.report.findUnique({ where: { id: input.id } });
      if (!report) return NextResponse.json({ error: "Report not found." }, { status: 404 });
      if (input.action === "HIDE_PRODUCT" || input.action === "RESTORE_PRODUCT") {
        if (report.targetType !== "PRODUCT") return NextResponse.json({ error: "Only product reports can change a listing." }, { status: 400 });
        const product = await prisma.product.findUnique({ where: { id: report.targetId }, select: { id: true, name: true, vendor: { select: { userId: true, businessName: true } } } });
        if (!product) return NextResponse.json({ error: "The reported product no longer exists." }, { status: 404 });
        const productStatus = input.action === "HIDE_PRODUCT" ? "INACTIVE" : "ACTIVE";
        await prisma.$transaction([
          prisma.product.update({ where: { id: product.id }, data: { status: productStatus } }),
          prisma.report.update({ where: { id: report.id }, data: { status: "REVIEWED" } }),
          prisma.notification.create({ data: { userId: product.vendor.userId, type: "SYSTEM", title: productStatus === "INACTIVE" ? "Product listing paused by CV Deck" : "Product listing restored by CV Deck", message: productStatus === "INACTIVE" ? `Your listing “${product.name}” has been removed from public marketplace results following an admin review.` : `Your listing “${product.name}” has been restored to public marketplace results.`, link: "/dashboard/vendor/products" } }),
        ]);
        return NextResponse.json({ status: "REVIEWED", productStatus });
      }

      if (report.targetType !== "VENDOR") return NextResponse.json({ error: "Only vendor reports can change a shop." }, { status: 400 });
      const vendor = await prisma.vendor.findUnique({ where: { id: report.targetId }, select: { id: true, userId: true, businessName: true } });
      if (!vendor) return NextResponse.json({ error: "The reported vendor no longer exists." }, { status: 404 });
      const vendorStatus = input.action === "SUSPEND_VENDOR" ? "REJECTED" : "VERIFIED";
      await prisma.$transaction([
        prisma.vendor.update({ where: { id: vendor.id }, data: { status: vendorStatus, verifiedAt: vendorStatus === "VERIFIED" ? new Date() : null } }),
        prisma.report.update({ where: { id: report.id }, data: { status: "REVIEWED" } }),
        prisma.notification.create({ data: { userId: vendor.userId, type: "SYSTEM", title: vendorStatus === "REJECTED" ? "Shop paused by CV Deck" : "Shop restored by CV Deck", message: vendorStatus === "REJECTED" ? `${vendor.businessName} has been removed from public marketplace listings following an admin review.` : `${vendor.businessName} has been restored to public marketplace listings.`, link: "/dashboard/vendor" } }),
      ]);
      return NextResponse.json({ status: "REVIEWED", vendorStatus });
    }

    const input = statusSchema.parse(body);
    const report = await prisma.report.update({ where: { id: input.id }, data: { status: input.status } });
    return NextResponse.json(report);
  } catch (error: any) {
    if (error.name === "ZodError") return NextResponse.json({ error: "Invalid report update." }, { status: 400 });
    return NextResponse.json({ error: "Unable to update report." }, { status: 500 });
  }
}
