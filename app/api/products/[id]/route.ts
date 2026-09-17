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

    const updatedProduct = await prisma.product.update({
      where: { id },
      data: {
        ...validated,
        images: validated.images ? JSON.stringify(validated.images) : undefined,
        specs: validated.specs ? JSON.stringify(validated.specs) : undefined,
      },
    });

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
