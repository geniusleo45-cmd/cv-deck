"use client";

import { useState } from "react";
import { Check, Heart } from "lucide-react";
import { useCart } from "./CartProvider";

export function SaveCartItemButton({ productId }: { productId: string }) {
  const { removeItem } = useCart();
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");

  async function saveForLater() {
    setState("saving");

    try {
      const response = await fetch("/api/wishlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId }),
      });

      if (!response.ok) throw new Error("Unable to save product.");

      removeItem(productId);
      setState("saved");
    } catch {
      setState("error");
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={saveForLater}
        disabled={state === "saving" || state === "saved"}
        className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:underline disabled:cursor-not-allowed disabled:opacity-60"
      >
        {state === "saved" ? <Check className="h-3.5 w-3.5" /> : <Heart className="h-3.5 w-3.5" />}
        {state === "saving" ? "Saving…" : state === "saved" ? "Saved" : "Save for later"}
      </button>
      {state === "error" && <span role="alert" className="text-[10px] font-medium text-red-600">Could not save item.</span>}
    </div>
  );
}
