"use client";

import { useState } from "react";
import { Heart } from "lucide-react";
import { useRouter } from "next/navigation";

export function RemoveWishlistButton({ productId }: { productId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function remove() {
    setLoading(true);
    const response = await fetch("/api/wishlist", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ productId }) });
    if (response.ok) router.refresh();
    else setLoading(false);
  }

  return <button type="button" onClick={remove} disabled={loading} className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 disabled:opacity-50"><Heart className="h-3.5 w-3.5 fill-red-500" />{loading ? "Removing..." : "Remove"}</button>;
}
