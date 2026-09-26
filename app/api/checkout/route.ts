import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { checkoutSchema } from "@/lib/validations/order";
import { z } from "zod";

const requestSchema = checkoutSchema.extend({
  items: z.array(z.object({ productId: z.string().min(1), quantity: z.number().int().positive() })).min(1),
});

export async function POST(req: Request) {
  try {
    const sessionUser = await getCurrentUser();
    if (!sessionUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const validated = requestSchema.parse(body);
    const quantities = new Map<string, number>();
    for (const item of validated.items) quantities.set(item.productId, (quantities.get(item.productId) || 0) + item.quantity);
    const products = await prisma.product.findMany({ where: { id: { in: [...quantities.keys()] }, status: "ACTIVE" }, include: { vendor: { select: { userId: true } } } });
    if (products.length !== quantities.size) {
      return NextResponse.json({ error: "One or more products are unavailable." }, { status: 400 });
    }
    if (products.some((product) => product.stock < (quantities.get(product.id) || 0))) {
      return NextResponse.json({ error: "One or more products do not have enough stock." }, { status: 400 });
    }
    if (products.length === 0) {
      return NextResponse.json({ error: "Shopping cart is empty" }, { status: 400 });
    }

    const totalAmount = products.reduce((acc, product) => acc + product.price * (quantities.get(product.id) || 0), 0);

    const orderNumber = `CVD-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`;

    const order = await prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
      data: {
        orderNumber,
        userId: sessionUser.id,
        totalAmount,
        shippingAddress: validated.shippingAddress,
        status: "PENDING",
        items: {
          create: products.map((product) => ({
            productId: product.id,
            quantity: quantities.get(product.id) || 0,
            price: product.price,
          })),
        },
      },
      include: {
        items: true,
      },
      });
      for (const product of products) {
        const quantity = quantities.get(product.id) || 0;
        const updated = await tx.product.updateMany({ where: { id: product.id, stock: { gte: quantity } }, data: { stock: { decrement: quantity } } });
        if (updated.count !== 1) throw new Error("A product changed while you were checking out.");
      }

      const stockAlerts = products.flatMap((product) => {
        const remainingStock = product.stock - (quantities.get(product.id) || 0);
        if (product.stock <= 5 || remainingStock > 5) return [];
        return [{ userId: product.vendor.userId, type: "SYSTEM" as const, title: remainingStock === 0 ? "Product is out of stock" : "Low stock alert", message: remainingStock === 0 ? `“${product.name}” is now out of stock after an order reservation.` : `“${product.name}” is down to ${remainingStock} unit${remainingStock === 1 ? "" : "s"} after an order reservation.`, link: `/dashboard/vendor/products/${product.id}` }];
      });
      if (stockAlerts.length) await tx.notification.createMany({ data: stockAlerts });

    // Send order confirmation notification
      await tx.notification.create({
      data: {
        userId: sessionUser.id,
        type: "ORDER_STATUS",
        title: "Order Placed Successfully",
        message: `Order #${order.orderNumber} for ₦${totalAmount.toLocaleString()} has been placed. Provider: ${validated.paymentProvider}`,
        link: `/dashboard/orders`,
      },
      });
      await tx.user.update({
        where: { id: sessionUser.id },
        data: { phone: validated.phone, deliveryAddress: validated.shippingAddress },
      });
      return order;
    });

    return NextResponse.json({
      order,
    });
  } catch (error: any) {
    if (error.name === "ZodError") {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    console.error("Checkout POST Error:", error);
    return NextResponse.json({ error: "Failed to process checkout" }, { status: 500 });
  }
}
