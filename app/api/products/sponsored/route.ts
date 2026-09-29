import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const SPONSORED_PRODUCT_LIMIT = 6;

export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    const now = new Date();

    // Campaign status alone is not enough: this protects marketplace visitors from
    // seeing a listing after its paid promotion window has elapsed.
    const campaigns = await prisma.adCampaign.findMany({
      where: {
        status: "ACTIVE",
        startsAt: { lte: now },
        endsAt: { gt: now },
        product: {
          status: "ACTIVE",
          stock: { gt: 0 },
          vendor: { status: "VERIFIED" },
        },
      },
      include: {
        product: {
          include: {
            category: { select: { name: true } },
            vendor: {
              select: {
                id: true,
                businessName: true,
                officeAddress: true,
                status: true,
                rating: true,
              },
            },
            wishlistItems: currentUser
              ? { where: { userId: currentUser.id }, select: { id: true } }
              : false,
          },
        },
      },
      orderBy: [{ startsAt: "desc" }, { createdAt: "desc" }],
      // A product can have more than one overlapping campaign. Fetch a small
      // buffer, then show each sponsored product once.
      take: SPONSORED_PRODUCT_LIMIT * 4,
    });

    const seenProductIds = new Set<string>();
    const products = campaigns
      .flatMap((campaign) => {
        if (seenProductIds.has(campaign.product.id)) return [];
        seenProductIds.add(campaign.product.id);
        return [campaign.product];
      })
      .slice(0, SPONSORED_PRODUCT_LIMIT);

    return NextResponse.json({ products });
  } catch (error) {
    console.error("Sponsored products GET Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch sponsored products" },
      { status: 500 },
    );
  }
}
