"use client";

import { useState } from "react";
import { useCart } from "@/components/cart/CartProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShoppingBag, Star, CheckCircle, Heart, Share2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { ReportButton } from "@/components/ReportButton";

interface ReviewItem {
  id: string;
  rating: number;
  comment: string;
  createdAt: Date;
  user: { name: string | null; avatar: string | null };
}

export function ProductDetailClient({
  productId,
  name,
  price,
  stock,
  reviews,
  sessionUserId,
  canReview,
  initiallyWishlisted,
}: {
  productId: string;
  name: string;
  price: number;
  stock: number;
  reviews: ReviewItem[];
  sessionUserId?: string;
  canReview: boolean;
  initiallyWishlisted: boolean;
}) {
  const { addItem } = useCart();
  const router = useRouter();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [added, setAdded] = useState(false);
  const [wishlisted, setWishlisted] = useState(initiallyWishlisted);
  const [savingWishlist, setSavingWishlist] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  const handleAddToCart = () => {
    addItem({
      productId,
      name,
      price,
      maxQuantity: stock,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim() || !sessionUserId) return;

    try {
      setSubmitting(true);
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId,
          rating,
          comment,
        }),
      });

      if (res.ok) {
        setComment("");
        router.refresh();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  const toggleWishlist = async () => {
    if (!sessionUserId) {
      router.push("/login");
      return;
    }
    setSavingWishlist(true);
    try {
      const response = await fetch("/api/wishlist", {
        method: wishlisted ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId }),
      });
      if (!response.ok) throw new Error("Unable to update saved products.");
      setWishlisted((current) => !current);
    } finally {
      setSavingWishlist(false);
    }
  };

  const shareProduct = async () => {
    const shareData = { title: `${name} | CV Deck`, text: `Take a look at ${name} on CV Deck.`, url: window.location.href };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
        return;
      }
      await navigator.clipboard.writeText(shareData.url);
      setLinkCopied(true);
      window.setTimeout(() => setLinkCopied(false), 1800);
    } catch (error) {
      if ((error as Error).name !== "AbortError") console.error("Unable to share product", error);
    }
  };

  return (
    <div className="space-y-6 border-t pt-4 pb-20 lg:pb-0">
      {/* Add to Cart CTA */}
      <div className="flex items-center gap-3">
        <Button
          size="lg"
          disabled={stock <= 0}
          onClick={handleAddToCart}
          className={`flex-1 font-bold text-base shadow-lg gap-2 ${
            added
              ? "bg-emerald-600 hover:bg-emerald-700 text-white"
              : "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20"
          }`}
        >
          {added ? (
            <>
              <CheckCircle className="h-5 w-5" /> Added to Shopping Cart!
            </>
          ) : (
            <>
              <ShoppingBag className="h-5 w-5" />
              {stock > 0 ? `Add to Cart (Stock: ${stock})` : "Sold Out"}
            </>
          )}
        </Button>
        <Button type="button" variant="outline" size="lg" onClick={toggleWishlist} disabled={savingWishlist} className="gap-2 font-bold" aria-pressed={wishlisted}>
          <Heart className={`h-5 w-5 ${wishlisted ? "fill-red-500 text-red-500" : ""}`} />
          <span className="hidden sm:inline">{wishlisted ? "Saved" : "Save"}</span>
        </Button>
        <Button type="button" variant="outline" size="lg" onClick={shareProduct} className="gap-2 font-bold" aria-label="Share product">
          {linkCopied ? <CheckCircle className="h-5 w-5 text-emerald-600" /> : <Share2 className="h-5 w-5" />}
          <span className="hidden sm:inline">{linkCopied ? "Link copied" : "Share"}</span>
        </Button>
      </div>

      <div className="flex justify-end"><ReportButton targetType="PRODUCT" targetId={productId} /></div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-white/95 p-3 shadow-[0_-8px_24px_rgba(0,0,0,0.08)] backdrop-blur dark:bg-gray-950/95 lg:hidden">
        <Button
          size="lg"
          disabled={stock <= 0}
          onClick={handleAddToCart}
          className={`w-full gap-2 font-bold ${added ? "bg-emerald-600 hover:bg-emerald-700" : "bg-blue-600 hover:bg-blue-700"}`}
        >
          {added ? <CheckCircle className="h-5 w-5" /> : <ShoppingBag className="h-5 w-5" />}
          {stock > 0 ? (added ? "Added to Cart" : `Add to Cart · ₦${price.toLocaleString()}`) : "Sold Out"}
        </Button>
      </div>

      {/* Reviews & Rating Section */}
      <div className="space-y-4 pt-4 border-t">
        <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center justify-between">
          <span>Customer Reviews ({reviews.length})</span>
          <span className="text-xs font-semibold text-amber-500 flex items-center gap-1">
            <Star className="h-4 w-4 fill-amber-400" />
            {reviews.length > 0
              ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
              : "No reviews"}
          </span>
        </h3>

        {/* Submit Review Form */}
        {canReview && (
          <form onSubmit={handleReviewSubmit} className="p-4 border rounded-2xl bg-gray-50 dark:bg-gray-800/40 space-y-3">
            <h4 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">
              Write a Verified Review
            </h4>

            <div className="flex items-center gap-2">
              <Label className="text-xs text-gray-600">Rating:</Label>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className="p-1 text-amber-400 hover:scale-110 transition-transform"
                  >
                    <Star className={`h-4 w-4 ${star <= rating ? "fill-amber-400" : "text-gray-300"}`} />
                  </button>
                ))}
              </div>
            </div>

            <Input
              placeholder="Share your experience with this Computer Village gadget..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              required
              className="text-xs bg-white dark:bg-gray-900"
            />

            <Button type="submit" disabled={submitting || !comment.trim()} size="sm" className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs">
              {submitting ? "Submitting..." : "Submit Review"}
            </Button>
          </form>
        )}
        {sessionUserId && !canReview && <p className="rounded-xl border border-dashed p-3 text-xs text-gray-500">Reviews are available after a delivered purchase. You can leave one review per product.</p>}

        {/* Reviews List */}
        <div className="space-y-3">
          {reviews.map((rev) => (
            <div key={rev.id} className="p-3 border rounded-xl space-y-1 bg-white dark:bg-gray-900 text-xs">
              <div className="flex items-center justify-between font-bold text-gray-900 dark:text-white">
                <span>{rev.user.name || "Verified Shopper"}</span>
                <span className="flex items-center gap-1 text-amber-500 font-semibold">
                  <Star className="h-3 w-3 fill-amber-400" /> {rev.rating}/5
                </span>
              </div>
              <p className="text-gray-600 dark:text-gray-300">{rev.comment}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
