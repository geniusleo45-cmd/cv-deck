import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { reviewSchema } from "@/lib/validations/review";

const vendorReplySchema = z.object({ reviewId: z.string().min(1), reply: z.string().trim().min(3, "Reply must be at least 3 characters.").max(1000, "Reply is too long.") });

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
      select: { id: true, name: true, vendorId: true, vendor: { select: { userId: true } } },
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

    await prisma.notification.create({
      data: {
        userId: product.vendor.userId,
        type: "SYSTEM",
        title: "New verified product review",
        message: `${review.user.name || "A customer"} left a ${review.rating}/5 review for “${product.name}”.`,
        link: `/dashboard/marketplace/${product.id}#reviews`,
      },
    });

    return NextResponse.json(review, { status: 201 });
  } catch (error: any) {
    if (error.name === "ZodError") {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to submit review" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const sessionUser = await getCurrentUser();
    if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const input = vendorReplySchema.parse(await req.json());
    const vendor = await prisma.vendor.findUnique({ where: { userId: sessionUser.id }, select: { id: true } });
    if (!vendor) return NextResponse.json({ error: "Only the product vendor can reply to reviews." }, { status: 403 });

    const review = await prisma.review.findUnique({ where: { id: input.reviewId }, select: { id: true, vendorId: true, userId: true, product: { select: { id: true, name: true } } } });
    if (!review || review.vendorId !== vendor.id) return NextResponse.json({ error: "Review not found." }, { status: 404 });

    const updatedReview = await prisma.review.update({ where: { id: review.id }, data: { vendorReply: input.reply, vendorRepliedAt: new Date() } });
    await prisma.notification.create({ data: { userId: review.userId, type: "SYSTEM", title: "Vendor replied to your review", message: `The vendor replied to your review of “${review.product.name}”.`, link: `/dashboard/marketplace/${review.product.id}#reviews` } });
    return NextResponse.json(updatedReview);
  } catch (error: any) {
    if (error.name === "ZodError") return NextResponse.json({ error: "Invalid vendor reply." }, { status: 400 });
    return NextResponse.json({ error: "Unable to save vendor reply." }, { status: 500 });
  }
}
