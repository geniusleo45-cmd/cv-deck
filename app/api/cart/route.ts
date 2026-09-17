import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

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
                  select: { businessName: true },
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

    const { productId, quantity = 1 } = await req.json();

    if (!productId) {
      return NextResponse.json({ error: "Product ID is required" }, { status: 400 });
    }

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
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
      const newQuantity = existingItem.quantity + quantity;
      if (newQuantity <= 0) {
        await prisma.cartItem.delete({ where: { id: existingItem.id } });
      } else {
        await prisma.cartItem.update({
          where: { id: existingItem.id },
          data: { quantity: newQuantity },
        });
      }
    } else {
      if (quantity > 0) {
        await prisma.cartItem.create({
          data: {
            cartId: cart.id,
            productId,
            quantity,
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
