import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

const updateSupportRequestSchema = z.object({
  id: z.string().min(1),
  status: z.enum(["OPEN", "UNDER_REVIEW", "RESOLVED", "REJECTED"]),
  adminNote: z.string().trim().max(1200).optional(),
});

export async function PUT(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Administrator access required." }, { status: 403 });
    }

    const input = updateSupportRequestSchema.parse(await request.json());
    const existing = await prisma.adCampaignSupportRequest.findUnique({
      where: { id: input.id },
      select: {
        id: true,
        userId: true,
        status: true,
        adminNote: true,
        campaign: { select: { id: true, product: { select: { name: true } } } },
      },
    });
    if (!existing) {
      return NextResponse.json({ error: "Payment-reconciliation request not found." }, { status: 404 });
    }

    const adminNote = input.adminNote || null;
    const changed = existing.status !== input.status || existing.adminNote !== adminNote;
    const supportRequest = await prisma.adCampaignSupportRequest.update({
      where: { id: existing.id },
      data: { status: input.status, adminNote },
    });

    if (changed) {
      await prisma.notification.create({
        data: {
          userId: existing.userId,
          type: "SYSTEM",
          title: "Premium Listing payment support updated",
          message: `Your payment-reconciliation request for ${existing.campaign.product.name} is now ${input.status.toLowerCase().replaceAll("_", " ")}.`,
          link: `/dashboard/vendor/advertise?campaign=${encodeURIComponent(existing.campaign.id)}`,
        },
      });
    }

    return NextResponse.json(supportRequest);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || "Invalid support update." }, { status: 400 });
    }
    console.error("Premium Listing payment support update failed:", error);
    return NextResponse.json({ error: "Unable to update the payment-reconciliation request." }, { status: 500 });
  }
}
