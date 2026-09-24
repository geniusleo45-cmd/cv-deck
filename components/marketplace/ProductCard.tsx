"use client";

import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCart } from "@/components/cart/CartProvider";
import { ShoppingBag, ShieldCheck, MapPin, Star, CheckCircle, Heart } from "lucide-react";
import { useState } from "react";

interface ProductCardProps {
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

export function ProductCard({ product }: ProductCardProps) {
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
    <div className="group flex flex-col rounded-2xl border bg-white dark:bg-gray-900 overflow-hidden shadow-sm hover:shadow-lg transition-all duration-200">
      {/* Product Image Header */}
      <div className="relative aspect-[4/3] w-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
        <Image
          src={imageUrl}
          alt={product.name}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
          className="h-full w-full object-cover object-center group-hover:scale-105 transition-transform duration-300"
        />
        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
          <Badge className={`font-bold text-[10px] uppercase px-2 py-0.5 ${getConditionColor(product.condition)}`}>
            {product.condition}
          </Badge>
          {product.vendor.status === "VERIFIED" && (
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
          className="absolute right-3 top-3 h-9 w-9 rounded-full bg-white/95 text-gray-700 shadow-sm hover:bg-white dark:bg-gray-900/95 dark:text-gray-100"
        >
          <Heart className={`h-4 w-4 ${saved ? "fill-red-500 text-red-500" : ""}`} />
        </Button>
      </div>

      {/* Product Details Content */}
      <div className="flex flex-1 flex-col p-4 justify-between space-y-3">
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

          <p className="text-xs text-gray-500 line-clamp-2 mt-1.5">
            {product.description}
          </p>
        </div>

        {/* Vendor info badge */}
        <div className="pt-2 border-t flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
          <span className="font-semibold truncate max-w-[150px]">
            {product.vendor.businessName}
          </span>
          <div className="flex items-center gap-1 text-amber-500 font-bold">
            <Star className="h-3.5 w-3.5 fill-amber-400" />
            <span>{product.vendor.rating > 0 ? product.vendor.rating : "New"}</span>
          </div>
        </div>

        {/* Price and Cart CTA */}
        <div className="flex items-center justify-between pt-1">
          <div>
            <div className="text-lg font-black text-gray-900 dark:text-white">
              ₦{product.price.toLocaleString()}
            </div>
            {product.compareAtPrice && product.compareAtPrice > product.price && (
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
