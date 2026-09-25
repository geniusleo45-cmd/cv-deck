"use client";

import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCart } from "@/components/cart/CartProvider";
import { ShoppingBag, ShieldCheck, MapPin, Star, CheckCircle, Heart } from "lucide-react";
import { useState } from "react";

interface ProductCardProps {
  compact?: boolean;
  product: {
    id: string;
    name: string;
    description: string;
    price: number;
    compareAtPrice?: number | null;
    stock: number;
    condition: string;
    locationZone: string;
    images: string; // JSON string array
    vendor: {
      id: string;
      businessName: string;
      officeAddress: string;
      status: string;
      rating: number;
    };
    category?: {
      name: string;
    };
    wishlistItems?: { id: string }[];
  };
}

export function ProductCard({ product, compact = false }: ProductCardProps) {
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);
  const [saved, setSaved] = useState((product.wishlistItems?.length ?? 0) > 0);
  const [saving, setSaving] = useState(false);

  let imageUrl = "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=600&q=80";
  try {
    const parsed = JSON.parse(product.images);
    if (Array.isArray(parsed) && parsed.length > 0) imageUrl = parsed[0];
  } catch (e) {
    // fallback
  }

  const getConditionColor = (cond: string) => {
    switch (cond) {
      case "NEW":
        return "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300";
      case "REFURBISHED":
        return "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300";
      default:
        return "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300";
    }
  };

  const handleAddToCart = () => {
    addItem({
      productId: product.id,
      name: product.name,
      price: product.price,
      maxQuantity: product.stock,
    });
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1600);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch("/api/wishlist", {
        method: saved ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: product.id }),
      });
      if (!response.ok) throw new Error("Unable to update saved products.");
      setSaved((current) => !current);
    } catch (error) {
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={`group flex overflow-hidden rounded-2xl border bg-white shadow-sm transition-all duration-200 hover:shadow-lg dark:bg-gray-900 ${compact ? "flex-row" : "flex-col"}`}>
      {/* Product Image Header */}
      <div className={`relative shrink-0 overflow-hidden bg-gray-100 dark:bg-gray-800 ${compact ? "h-28 w-28 sm:h-32 sm:w-40" : "aspect-[4/3] w-full"}`}>
        <Image
          src={imageUrl}
          alt={product.name}
          fill
          sizes={compact ? "(max-width: 640px) 112px, 160px" : "(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"}
          className="h-full w-full object-cover object-center group-hover:scale-105 transition-transform duration-300"
        />
        <div className={`absolute left-2 top-2 flex flex-wrap gap-1 ${compact ? "max-w-[70px]" : "left-3 top-3 gap-1.5"}`}>
          <Badge className={`font-bold text-[10px] uppercase px-2 py-0.5 ${getConditionColor(product.condition)}`}>
            {product.condition}
          </Badge>
          {!compact && product.vendor.status === "VERIFIED" && (
            <Badge className="bg-purple-600 text-white text-[10px] font-bold gap-1 px-2 py-0.5">
              <ShieldCheck className="h-3 w-3" /> Verified Vendor
            </Badge>
          )}
        </div>
        <Button
          type="button"
          variant="secondary"
          size="icon"
          onClick={handleSave}
          disabled={saving}
          aria-label={saved ? `Remove ${product.name} from saved products` : `Save ${product.name}`}
          aria-pressed={saved}
          className={`absolute right-2 top-2 rounded-full bg-white/95 text-gray-700 shadow-sm hover:bg-white dark:bg-gray-900/95 dark:text-gray-100 ${compact ? "h-7 w-7" : "right-3 top-3 h-9 w-9"}`}
        >
          <Heart className={`h-4 w-4 ${saved ? "fill-red-500 text-red-500" : ""}`} />
        </Button>
      </div>

      {/* Product Details Content */}
      <div className={`flex min-w-0 flex-1 flex-col justify-between ${compact ? "space-y-1.5 p-3" : "space-y-3 p-4"}`}>
        <div>
          <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
            <span>{product.category?.name || "Hardware"}</span>
            <span className="flex items-center gap-1 font-semibold text-gray-700 dark:text-gray-300">
              <MapPin className="h-3 w-3 text-blue-600" /> {product.locationZone}
            </span>
          </div>

          <Link href={`/dashboard/marketplace/${product.id}`}>
            <h3 className="font-bold text-gray-900 dark:text-gray-100 text-base line-clamp-2 hover:text-blue-600 transition-colors">
              {product.name}
            </h3>
          </Link>

          {!compact && <p className="mt-1.5 line-clamp-2 text-xs text-gray-500">
            {product.description}
          </p>}
        </div>

        {/* Vendor info badge */}
        {!compact && <div className="flex items-center justify-between border-t pt-2 text-xs text-gray-600 dark:text-gray-400">
          <Link href={`/vendors/${product.vendor.id}`} className="max-w-[150px] truncate font-semibold hover:text-blue-600">
            {product.vendor.businessName}
          </Link>
          <div className="flex items-center gap-1 text-amber-500 font-bold">
            <Star className="h-3.5 w-3.5 fill-amber-400" />
            <span>{product.vendor.rating > 0 ? product.vendor.rating : "New"}</span>
          </div>
        </div>}

        {/* Price and Cart CTA */}
        <div className="flex items-center justify-between pt-1">
          <div className="min-w-0">
            <div className={`${compact ? "text-base" : "text-lg"} font-black text-gray-900 dark:text-white`}>
              ₦{product.price.toLocaleString()}
            </div>
            {!compact && product.compareAtPrice && product.compareAtPrice > product.price && (
              <div className="text-xs text-gray-400 line-through">
                ₦{product.compareAtPrice.toLocaleString()}
              </div>
            )}
          </div>

          <Button
            size="sm"
            disabled={product.stock <= 0 || added}
            onClick={handleAddToCart}
            className={`font-bold gap-1.5 shadow-sm text-white ${added ? "bg-emerald-600 hover:bg-emerald-700" : "bg-blue-600 hover:bg-blue-700"}`}
          >
            {added ? <CheckCircle className="h-4 w-4" /> : <ShoppingBag className="h-4 w-4" />}
            {product.stock <= 0 ? "Sold Out" : added ? "Added" : "Add"}
          </Button>
        </div>
      </div>
    </div>
  );
}
