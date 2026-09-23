import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/rbac";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ProductDetailClient } from "./ProductDetailClient";
import { ProductImageGallery } from "./ProductImageGallery";
import { ShieldCheck, MapPin, Star, ArrowLeft, Store, MessageSquare } from "lucide-react";

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ productId: string }>;
}) {
  const { productId } = await params;
  const sessionUser = await getCurrentUser();

  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      category: true,
      vendor: {
        include: {
          user: { select: { id: true, name: true, email: true, phone: true } },
        },
      },
      reviews: {
        include: {
          user: { select: { name: true, avatar: true } },
        },
        orderBy: { createdAt: "desc" },
      },
      wishlistItems: {
        where: { userId: sessionUser?.id || "__anonymous__" },
        select: { id: true },
      },
    },
  });

  if (!product) {
    notFound();
  }

  const reviewEligibility = sessionUser?.id
    ? await Promise.all([
        prisma.orderItem.findFirst({ where: { productId, order: { userId: sessionUser.id, status: "DELIVERED" } }, select: { id: true } }),
        prisma.review.findFirst({ where: { productId, userId: sessionUser.id }, select: { id: true } }),
      ])
    : [null, null];
  const canReview = Boolean(reviewEligibility[0]) && !reviewEligibility[1];

  let images: string[] = [];
  try {
    images = JSON.parse(product.images);
    if (!Array.isArray(images) || images.length === 0) {
      images = ["https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=800&q=80"];
    }
  } catch (e) {
    images = ["https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=800&q=80"];
  }

  let specs: Record<string, string> = {};
  try {
    specs = JSON.parse(product.specs);
  } catch (e) {
    // fallback
  }

  return (
    <div className="space-y-6">
      {/* Back Link */}
      <Button variant="ghost" size="sm" asChild className="gap-2 text-xs text-gray-600">
        <Link href="/dashboard/marketplace">
          <ArrowLeft className="h-4 w-4" /> Back to Marketplace
        </Link>
      </Button>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 bg-white dark:bg-gray-900 border rounded-3xl p-6 sm:p-8 shadow-sm">
        {/* Left Image Gallery */}
        <div className="space-y-4">
          <div className="relative">
            <ProductImageGallery images={images} productName={product.name} />
            <div className="absolute top-4 left-4 flex gap-2">
              <Badge className="bg-blue-600 text-white font-bold text-xs">
                {product.condition}
              </Badge>
              {product.vendor.status === "VERIFIED" && (
                <Badge className="bg-purple-600 text-white font-bold text-xs gap-1">
                  <ShieldCheck className="h-3.5 w-3.5" /> Verified Vendor
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Right Info Section */}
        <div className="space-y-6 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span className="font-semibold">{product.category.name}</span>
              <span className="flex items-center gap-1 text-gray-700 dark:text-gray-300 font-semibold">
                <MapPin className="h-3.5 w-3.5 text-blue-600" /> {product.locationZone}
              </span>
            </div>

            <h1 className="text-2xl font-black text-gray-900 dark:text-white leading-tight">
              {product.name}
            </h1>

            {/* Price */}
            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-black text-gray-900 dark:text-white">
                ₦{product.price.toLocaleString()}
              </span>
              {product.compareAtPrice && (
                <span className="text-base text-gray-400 line-through">
                  ₦{product.compareAtPrice.toLocaleString()}
                </span>
              )}
            </div>

            <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
              {product.description}
            </p>

            {/* Vendor Card Box */}
            <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/60 border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-700 font-bold text-sm">
                  <Store className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-gray-900 dark:text-white flex items-center gap-1.5">
                    {product.vendor.businessName}
                    {product.vendor.status === "VERIFIED" && (
                      <ShieldCheck className="h-4 w-4 text-purple-600" />
                    )}
                  </h4>
                  <p className="text-xs text-gray-500">{product.vendor.officeAddress}</p>
                </div>
              </div>

              <Button size="sm" variant="outline" asChild className="gap-1 text-xs font-bold">
                <Link href={`/dashboard/messages?receiverId=${product.vendor.user.id}`}>
                  <MessageSquare className="h-3.5 w-3.5" /> Message Vendor
                </Link>
              </Button>
            </div>

            {/* Technical Specifications */}
            {Object.keys(specs).length > 0 && (
              <div className="space-y-2 pt-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">
                  Technical Specifications
                </h3>
                <div className="grid grid-cols-2 gap-2 text-xs border rounded-xl p-3 bg-gray-50/50 dark:bg-gray-800/40">
                  {Object.entries(specs).map(([key, val]) => (
                    <div key={key}>
                      <span className="text-gray-500">{key}: </span>
                      <span className="font-semibold text-gray-900 dark:text-gray-200">{val}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Interactive Client Add-to-Cart & Review Submission */}
          <ProductDetailClient
            productId={product.id}
            name={product.name}
            price={product.price}
            stock={product.stock}
            reviews={product.reviews}
            sessionUserId={sessionUser?.id}
            canReview={canReview}
            initiallyWishlisted={product.wishlistItems.length > 0}
          />
        </div>
      </div>
    </div>
  );
}
