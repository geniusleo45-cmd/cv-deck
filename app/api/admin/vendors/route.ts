import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { adminVerifyVendorSchema } from "@/lib/validations/vendor";

export async function GET() {
  try {
    const sessionUser = await getCurrentUser();
    if (!sessionUser || sessionUser.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const verifications = await prisma.vendorVerification.findMany({
      include: {
        vendor: {
          include: {
            user: { select: { name: true, email: true, phone: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(verifications);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch verifications" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const sessionUser = await getCurrentUser();
    if (!sessionUser || sessionUser.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const body = await req.json();
    const validated = adminVerifyVendorSchema.parse(body);

    const vendorStatus = validated.status === "APPROVED" ? "VERIFIED" : "REJECTED";

    const vendor = await prisma.vendor.update({
      where: { id: validated.vendorId },
      data: {
        status: vendorStatus,
        verifiedAt: validated.status === "APPROVED" ? new Date() : null,
      },
      include: { user: true },
    });

    // Update pending verifications for this vendor
    await prisma.vendorVerification.updateMany({
      where: { vendorId: validated.vendorId, status: "PENDING" },
      data: {
        status: validated.status,
        adminNotes: validated.adminNotes || `Verification ${validated.status.toLowerCase()} by admin.`,
      },
    });

    // Notify vendor
    await prisma.notification.create({
      data: {
        userId: vendor.userId,
        type: "VENDOR_VERIFICATION",
        title: `Verification Status: ${validated.status}`,
        message: `Your vendor verification request for ${vendor.businessName} has been ${validated.status.toLowerCase()}.`,
        link: "/dashboard/vendor",
      },
    });

    return NextResponse.json(vendor);
  } catch (error: any) {
    if (error.name === "ZodError") {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to update vendor verification status" }, { status: 500 });
  }
}
