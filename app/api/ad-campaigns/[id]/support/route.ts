import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

const supportRequestSchema = z.object({
  reason: z.enum([
    "PAYMENT_COMPLETED_NOT_ACTIVATED",
    "CHECKOUT_LINK_UNAVAILABLE",
    "PAYMENT_PROVIDER_ERROR",
    "OTHER",
  ]),
  details: z.string().trim().min(10, "Please provide at least 10 characters.").max(1200),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "VENDOR") {
      return NextResponse.json({ error: "Vendor access required." }, { status: 403 });
    }

    const { id } = await params;
    const input = supportRequestSchema.parse(await request.json());
    const supportRequest = await prisma.$transaction(async (tx) => {
      const campaign = await tx.adCampaign.findFirst({
        where: {
          id,
          status: "PENDING_PAYMENT",
          paymentProvider: { not: null },
          paymentReference: { not: null },
          vendor: { userId: user.id },
        },
        select: {
          id: true,
          product: { select: { name: true } },
        },
      });
      if (!campaign) return null;

      const created = await tx.adCampaignSupportRequest.create({
        data: {
          campaignId: campaign.id,
          userId: user.id,
          reason: input.reason,
          details: input.details,
        },
      });
      const admins = await tx.user.findMany({
        where: { role: "ADMIN" },
        select: { id: true },
      });
      if (admins.length) {
        await tx.notification.createMany({
          data: admins.map((admin) => ({
            userId: admin.id,
            type: "SYSTEM",
            title: "Premium Listing payment support request",
            message: `${campaign.product.name} needs payment reconciliation.`,
            link: "/dashboard/admin/advertising/payment-support",
          })),
        });
      }
      return created;
    });

    if (!supportRequest) {
      return NextResponse.json(
        { error: "This Premium Listing is not awaiting a payment-reconciliation request." },
        { status: 409 }
      );
    }

    return NextResponse.json(supportRequest, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || "Invalid support request." }, { status: 400 });
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "A payment-reconciliation request already exists for this Premium Listing." }, { status: 409 });
    }
    console.error("Premium Listing payment support request failed:", error);
    return NextResponse.json({ error: "Unable to submit the payment-reconciliation request." }, { status: 500 });
  }
}
