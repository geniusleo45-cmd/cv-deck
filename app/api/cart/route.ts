import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getCurrentUser } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

const visitorCookieName = "cvdeck_ad_visitor";

function utcDay(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export async function GET() {
  try {
    const sessionUser = await getCurrentUser();
    if (!sessionUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const cart = await prisma.cart.findUnique({
      where: { userId: sessionUser.id },
      include: {
        items: {
          include: {
            product: {
              include: {
                vendor: {
                  select: { id: true, businessName: true },
                },
              },
            },
          },
        },
      },
    });

    if (!cart) {
      return NextResponse.json({ items: [], total: 0 });
    }

    const total = cart.items.reduce(
      (acc, item) => acc + item.product.price * item.quantity,
      0
    );

    return NextResponse.json({ cart, total });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch cart" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const sessionUser = await getCurrentUser();
    if (!sessionUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { productId, quantity = 1, campaignId } = await req.json();
    const requestedQuantity = Number(quantity);

    if (!productId) {
      return NextResponse.json({ error: "Product ID is required" }, { status: 400 });
    }
    if (!Number.isInteger(requestedQuantity) || requestedQuantity === 0) {
      return NextResponse.json({ error: "Quantity must be a non-zero whole number." }, { status: 400 });
    }

    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: { vendor: { select: { status: true } } },
    });
    if (!product || product.status !== "ACTIVE" || product.vendor.status !== "VERIFIED") {
      return NextResponse.json({ error: "This product is not currently available." }, { status: 400 });
    }

    // A campaign source is optional and can only be retained when it came from
    // this browser's recorded sponsored-card add on the current UTC day. If the
    // evidence is missing or stale, the item still enters the cart normally.
    let campaignAttribution: { id: string } | null = null;
    if (requestedQuantity > 0 && typeof campaignId === "string" && campaignId.trim()) {
      const now = new Date();
      const visitorId = (await cookies()).get(visitorCookieName)?.value;
      const hasValidVisitorId = Boolean(visitorId && /^[a-f0-9-]{36}$/i.test(visitorId));

      if (hasValidVisitorId) {
        const campaign = await prisma.adCampaign.findFirst({
          where: {
            id: campaignId.trim(),
            productId,
            status: "ACTIVE",
            startsAt: { lte: now },
            endsAt: { gt: now },
            product: {
              status: "ACTIVE",
              stock: { gt: 0 },
              vendor: { status: "VERIFIED" },
            },
          },
          select: { id: true },
        });

        if (campaign) {
          const sponsoredAdd = await prisma.adCampaignEvent.findUnique({
            where: {
              campaignId_type_visitorId_day: {
                campaignId: campaign.id,
                type: "ADD_TO_CART",
                visitorId: visitorId!,
                day: utcDay(now),
              },
            },
            select: { id: true },
          });
          if (sponsoredAdd) campaignAttribution = campaign;
        }
      }
    }

    let cart = await prisma.cart.findUnique({
      where: { userId: sessionUser.id },
    });

    if (!cart) {
      cart = await prisma.cart.create({
        data: { userId: sessionUser.id },
      });
    }

    const existingItem = await prisma.cartItem.findFirst({
      where: { cartId: cart.id, productId },
    });

    if (existingItem) {
      const newQuantity = existingItem.quantity + requestedQuantity;
      if (newQuantity > product.stock) {
        return NextResponse.json({ error: `Only ${product.stock} unit${product.stock === 1 ? "" : "s"} are available.` }, { status: 400 });
      }
      if (newQuantity <= 0) {
        await prisma.cartItem.delete({ where: { id: existingItem.id } });
      } else {
        const existingAttributedQuantity = Math.min(
          Math.max(existingItem.attributedQuantity, 0),
          existingItem.quantity
        );
        const canExtendCampaignAttribution = Boolean(
          campaignAttribution &&
          (!existingItem.adCampaignId || existingItem.adCampaignId === campaignAttribution.id)
        );
        await prisma.cartItem.update({
          where: { id: existingItem.id },
          data: {
            quantity: newQuantity,
            adCampaignId: canExtendCampaignAttribution
              ? campaignAttribution!.id
              : existingItem.adCampaignId,
            attributedQuantity: canExtendCampaignAttribution
              ? Math.min(newQuantity, existingAttributedQuantity + requestedQuantity)
              : Math.min(existingAttributedQuantity, newQuantity),
          },
        });
      }
    } else {
      if (requestedQuantity > 0) {
        if (requestedQuantity > product.stock) {
          return NextResponse.json({ error: `Only ${product.stock} unit${product.stock === 1 ? "" : "s"} are available.` }, { status: 400 });
        }
        await prisma.cartItem.create({
          data: {
            cartId: cart.id,
            productId,
            quantity: requestedQuantity,
            adCampaignId: campaignAttribution?.id,
            attributedQuantity: campaignAttribution ? requestedQuantity : 0,
          },
        });
      }
    }

    const updatedCart = await prisma.cart.findUnique({
      where: { userId: sessionUser.id },
      include: {
        items: {
          include: { product: true },
        },
      },
    });

    return NextResponse.json(updatedCart);
  } catch (error) {
    console.error("Cart POST error:", error);
    return NextResponse.json({ error: "Failed to update cart" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const sessionUser = await getCurrentUser();
    if (!sessionUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const cartItemId = searchParams.get("cartItemId");

    const cart = await prisma.cart.findUnique({ where: { userId: sessionUser.id } });
    if (!cart) {
      return NextResponse.json({ message: "Cart empty" });
    }

    if (cartItemId) {
      await prisma.cartItem.deleteMany({
        where: { id: cartItemId, cartId: cart.id },
      });
    } else {
      await prisma.cartItem.deleteMany({
        where: { cartId: cart.id },
      });
    }

    return NextResponse.json({ message: "Cart item removed" });
  } catch (error) {
    return NextResponse.json({ error: "Failed to clear cart" }, { status: 500 });
  }
}
