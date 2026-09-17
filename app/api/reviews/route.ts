import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { reviewSchema } from "@/lib/validations/review";

export async function POST(req: Request) {
  try {
    const sessionUser = await getCurrentUser();
    if (!sessionUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const validated = reviewSchema.parse(body);

    const product = await prisma.product.findUnique({
      where: { id: validated.productId },
      select: { vendorId: true },
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const deliveredPurchase = await prisma.orderItem.findFirst({
      where: {
        productId: validated.productId,
        order: { userId: sessionUser.id, status: "DELIVERED" },
      },
      select: { id: true },
    });
    if (!deliveredPurchase) {
      return NextResponse.json({ error: "Reviews are available after this product has been delivered." }, { status: 403 });
    }

    const existingReview = await prisma.review.findFirst({
      where: { productId: validated.productId, userId: sessionUser.id },
      select: { id: true },
    });
    if (existingReview) {
      return NextResponse.json({ error: "You have already reviewed this product." }, { status: 409 });
    }

    const review = await prisma.review.create({
      data: {
        productId: validated.productId,
        userId: sessionUser.id,
        rating: validated.rating,
        comment: validated.comment,
        vendorId: product.vendorId,
      },
      include: {
        user: { select: { name: true, avatar: true } },
      },
    });

    // Update Vendor average rating
    const vendorReviews = await prisma.review.findMany({
      where: { vendorId: product.vendorId },
      select: { rating: true },
    });

    const avgRating =
      vendorReviews.reduce((sum, r) => sum + r.rating, 0) / vendorReviews.length;

    await prisma.vendor.update({
      where: { id: product.vendorId },
      data: { rating: Math.round(avgRating * 10) / 10 },
    });

    return NextResponse.json(review, { status: 201 });
  } catch (error: any) {
    if (error.name === "ZodError") {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to submit review" }, { status: 500 });
  }
}
