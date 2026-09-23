import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

const inputSchema = z.object({ productId: z.string().min(1) });

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Please sign in to save products." }, { status: 401 });
  const input = inputSchema.safeParse(await request.json().catch(() => null));
  if (!input.success) return NextResponse.json({ error: "Invalid product." }, { status: 400 });
  const product = await prisma.product.findFirst({ where: { id: input.data.productId, status: "ACTIVE" }, select: { id: true } });
  if (!product) return NextResponse.json({ error: "Product not found." }, { status: 404 });
  const item = await prisma.wishlistItem.upsert({ where: { userId_productId: { userId: user.id, productId: product.id } }, create: { userId: user.id, productId: product.id }, update: {} });
  return NextResponse.json(item, { status: 201 });
}

export async function DELETE(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Please sign in to manage saved products." }, { status: 401 });
  const input = inputSchema.safeParse(await request.json().catch(() => null));
  if (!input.success) return NextResponse.json({ error: "Invalid product." }, { status: 400 });
  await prisma.wishlistItem.deleteMany({ where: { userId: user.id, productId: input.data.productId } });
  return NextResponse.json({ removed: true });
}
