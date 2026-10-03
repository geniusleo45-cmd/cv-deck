import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { premiumPackages, type PremiumPackage } from "@/lib/premiumListings";

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
