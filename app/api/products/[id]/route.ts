import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { productSchema } from "@/lib/validations/product";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        vendor: {
          include: {
            user: {
              select: { name: true, email: true, phone: true, avatar: true },
            },
          },
        },
        reviews: {
          include: {
            user: {
              select: { name: true, avatar: true },
            },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    return NextResponse.json(product);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch product" }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const sessionUser = await getCurrentUser();
    if (!sessionUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const product = await prisma.product.findUnique({ where: { id } });

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Check ownership or admin
    if (sessionUser.role !== "ADMIN" && product.vendorId !== sessionUser.vendorId) {
      return NextResponse.json({ error: "Forbidden: You do not own this product" }, { status: 403 });
    }

    const body = await req.json();
    const validated = productSchema.partial().parse(body);
    if (validated.images && validated.images.length > 8) {
      const now = new Date();
      const premium = await prisma.adCampaign.findFirst({ where: { productId: id, status: "ACTIVE", startsAt: { lte: now }, endsAt: { gt: now } }, select: { id: true } });
      let previous: string[] = [];
      try { const parsed = JSON.parse(product.images); if (Array.isArray(parsed)) previous = parsed; } catch {}
      const retainingExisting = validated.images.length <= previous.length && validated.images.every((image) => previous.includes(image));
      if (!premium && !retainingExisting) return NextResponse.json({ error: "Standard listings allow 8 images. An active Premium Listing is required to add more, up to 15." }, { status: 400 });
    }

    const updatedProduct = await prisma.product.update({
      where: { id },
      data: {
        ...validated,
        images: validated.images ? JSON.stringify(validated.images) : undefined,
        specs: validated.specs ? JSON.stringify(validated.specs) : undefined,
      },
    });

    const priceDropped = validated.price !== undefined && validated.price < product.price;
    const backInStock = (product.stock <= 0 || product.status !== "ACTIVE") && updatedProduct.stock > 0 && updatedProduct.status === "ACTIVE";
    if (priceDropped || backInStock) {
      try {
        const savedByUsers = await prisma.wishlistItem.findMany({ where: { productId: product.id }, select: { userId: true } });
        if (savedByUsers.length) {
          await prisma.notification.createMany({
            data: savedByUsers.map(({ userId }) => ({
              userId,
              type: "SYSTEM",
              title: priceDropped && backInStock ? "A saved product is back and cheaper" : priceDropped ? "A saved product is now cheaper" : "A saved product is back in stock",
              message: priceDropped && backInStock ? `“${product.name}” is available again and dropped from ₦${product.price.toLocaleString()} to ₦${updatedProduct.price.toLocaleString()}.` : priceDropped ? `“${product.name}” dropped from ₦${product.price.toLocaleString()} to ₦${updatedProduct.price.toLocaleString()}.` : `“${product.name}” is available again with ${updatedProduct.stock} unit${updatedProduct.stock === 1 ? "" : "s"} in stock.`,
              link: `/dashboard/marketplace/${product.id}`,
            })),
          });
        }
      } catch (notificationError) {
        console.error("Unable to send saved-product alerts:", notificationError);
      }
    }

    return NextResponse.json(updatedProduct);
  } catch (error: any) {
    if (error.name === "ZodError") {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to update product" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const sessionUser = await getCurrentUser();
    if (!sessionUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const product = await prisma.product.findUnique({ where: { id } });

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    if (sessionUser.role !== "ADMIN" && product.vendorId !== sessionUser.vendorId) {
      return NextResponse.json({ error: "Forbidden: You do not own this product" }, { status: 403 });
    }

    await prisma.product.delete({ where: { id } });
    return NextResponse.json({ message: "Product deleted successfully" });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete product" }, { status: 500 });
  }
}
