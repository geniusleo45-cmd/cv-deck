import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { premiumPackages, type PremiumPackage } from "@/lib/premiumListings";

export async function DELETE(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "VENDOR") return NextResponse.json({ error: "Vendor access required." }, { status: 403 });
  const input = await request.json().catch(() => null);
  if (typeof input?.id !== "string" || !input.id) return NextResponse.json({ error: "Choose a Premium Listing." }, { status: 400 });
  const campaign = await prisma.adCampaign.findFirst({ where: { id: input.id, vendor: { userId: user.id } } });
  if (!campaign) return NextResponse.json({ error: "Premium Listing not found." }, { status: 404 });
  if (campaign.status === "CANCELLED") return NextResponse.json({ cancelled: true });
  const cancelled = await prisma.$transaction(async (tx) => {
    // Serialize against reservation and payment finalization; preserve the old
    // reference and amount so a late payment remains attributable to this listing.
    const changed = await tx.adCampaign.updateMany({
      where: { id: campaign.id, vendor: { userId: user.id }, status: "PENDING_PAYMENT" },
      data: { status: "CANCELLED", authorizationUrl: null },
    });
    if (!changed.count) return false;
    const latest = await tx.adCampaign.findUniqueOrThrow({ where: { id: campaign.id } });
    if (latest.paymentReference) {
      await tx.adCampaignSupportRequest.upsert({
        where: { campaignId: campaign.id },
        create: { campaignId: campaign.id, userId: user.id, reason: "CANCELLED_CHECKOUT", details: "Vendor cancelled the listing after checkout was reserved. Payment outcome is unconfirmed. Reconcile the preserved reference; do not activate this listing. No refund has been issued." },
        update: { status: "OPEN" },
      });
      const admins = await tx.user.findMany({ where: { role: "ADMIN" }, select: { id: true } });
      await tx.notification.createMany({ data: admins.map((admin) => ({ userId: admin.id, type: "SYSTEM" as const, title: "Cancelled Premium Listing checkout", message: "A vendor cancelled a listing with an existing checkout. Review its payment reference before resolving the case.", link: "/dashboard/admin/advertising/payment-support" })) });
    }
    return true;
  });
  if (!cancelled) return NextResponse.json({ error: "This listing has already been processed. Refresh to see its current status; active or paid listings cannot be cancelled here." }, { status: 409 });
  return NextResponse.json({ cancelled: true });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "VENDOR") return NextResponse.json({ error: "Vendor access required." }, { status: 403 });

  const input = await request.json().catch(() => null);
  const packageName = input?.package as PremiumPackage;
  if (!input?.productId || !packageName || !premiumPackages[packageName]) return NextResponse.json({ error: "Choose an eligible product and Premium Listing package." }, { status: 400 });

  const vendor = await prisma.vendor.findUnique({ where: { userId: user.id } });
  if (!vendor || vendor.status !== "VERIFIED") return NextResponse.json({ error: "Only verified vendors can purchase Premium Listings." }, { status: 403 });
  const product = await prisma.product.findFirst({ where: { id: input.productId, vendorId: vendor.id, status: "ACTIVE", stock: { gt: 0 } }, select: { id: true } });
  if (!product) return NextResponse.json({ error: "Choose one of your active, in-stock products." }, { status: 400 });

  const now = new Date();
  await prisma.adCampaign.updateMany({
    where: { vendorId: vendor.id, productId: product.id, status: "ACTIVE", endsAt: { lte: now } },
    data: { status: "EXPIRED", authorizationUrl: null },
  });

  const existingActive = await prisma.adCampaign.findFirst({
    where: { vendorId: vendor.id, productId: product.id, status: "ACTIVE", endsAt: { gt: now } },
    orderBy: { endsAt: "desc" },
  });
  if (existingActive) return NextResponse.json({ error: "This product already has an active Premium Listing." }, { status: 409 });

  const pendingCampaign = await prisma.adCampaign.findFirst({
    where: { vendorId: vendor.id, productId: product.id, status: "PENDING_PAYMENT" },
    orderBy: { createdAt: "desc" },
  });
  if (pendingCampaign) return NextResponse.json(pendingCampaign);

  const campaign = await prisma.adCampaign.create({ data: { vendorId: vendor.id, productId: product.id, package: packageName, amount: premiumPackages[packageName].amount, status: "PENDING_PAYMENT" } });
  return NextResponse.json(campaign, { status: 201 });
}
