import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { verificationSubmitSchema } from "@/lib/validations/vendor";

export async function POST(req: Request) {
  try {
    const sessionUser = await getCurrentUser();
    if (!sessionUser || sessionUser.role !== "VENDOR") {
      return NextResponse.json({ error: "Only vendors can submit verification requests" }, { status: 403 });
    }

    const vendor = await prisma.vendor.findUnique({
      where: { userId: sessionUser.id },
    });

    if (!vendor) {
      return NextResponse.json({ error: "Vendor profile not found" }, { status: 404 });
    }

    const body = await req.json();
    const validated = verificationSubmitSchema.parse(body);

    const verification = await prisma.vendorVerification.create({
      data: {
        vendorId: vendor.id,
        documentType: validated.documentType,
        documentUrl: validated.documentUrl,
        status: "PENDING",
      },
    });

    // Update vendor status to PENDING
    await prisma.vendor.update({
      where: { id: vendor.id },
      data: { status: "PENDING" },
    });

    // Notify admins
    const admins = await prisma.user.findMany({ where: { role: "ADMIN" } });
    for (const admin of admins) {
      await prisma.notification.create({
        data: {
          userId: admin.id,
          type: "VENDOR_VERIFICATION",
          title: "New Vendor Verification Submitted",
          message: `${vendor.businessName} submitted verification document (${validated.documentType}).`,
          link: "/dashboard/admin",
        },
      });
    }

    return NextResponse.json(verification, { status: 201 });
  } catch (error: any) {
    if (error.name === "ZodError") {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to submit verification document" }, { status: 500 });
  }
}
