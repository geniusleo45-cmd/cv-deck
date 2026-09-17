"use client";

import { useCart } from "@/components/cart/CartProvider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ShoppingBag, Trash2, Plus, Minus, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export function CartSheet() {
  const { items, itemCount, total, setQuantity, removeItem, clearCart } = useCart();
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="relative gap-2">
          <ShoppingBag className="h-4 w-4" />
          <span className="hidden sm:inline">Cart</span>
          {itemCount > 0 && (
            <span className="ml-1 rounded-full bg-blue-600 px-2 py-0.5 text-xs text-white font-bold">
              {itemCount}
            </span>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md max-h-[90vh] flex flex-col p-6">
        <DialogHeader className="flex flex-row items-center justify-between border-b pb-3">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <ShoppingBag className="h-5 w-5 text-blue-600" />
            Your Shopping Cart ({itemCount})
          </DialogTitle>
          {items.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearCart}
              className="text-xs text-red-600 hover:text-red-800"
            >
              Clear All
            </Button>
          )}
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4 space-y-4 max-h-[50vh]">
          {items.length === 0 ? (
            <div className="text-center py-12 space-y-3">
              <ShoppingBag className="h-12 w-12 text-gray-300 mx-auto" />
              <p className="text-gray-500 font-medium">Your cart is currently empty</p>
              <Button size="sm" onClick={() => setOpen(false)} asChild>
                <Link href="/dashboard/marketplace">Explore Marketplace</Link>
              </Button>
            </div>
          ) : (
            items.map((item) => (
              <div
                key={item.productId}
                className="flex items-center justify-between gap-3 p-3 rounded-lg border bg-gray-50 dark:bg-gray-900"
              >
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-semibold truncate text-gray-900 dark:text-gray-100">
                    {item.name}
                  </h4>
                  <p className="text-xs text-blue-600 font-bold mt-1">
                    ₦{item.price.toLocaleString()}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center border rounded-md bg-white dark:bg-gray-800">
                    <button
                      onClick={() => setQuantity(item.productId, item.quantity - 1)}
                      aria-label={`Decrease ${item.name} quantity`}
                      className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="px-2 text-xs font-semibold">{item.quantity}</span>
                    <button
                      onClick={() => setQuantity(item.productId, item.quantity + 1)}
                      disabled={item.quantity >= item.maxQuantity}
                      aria-label={`Increase ${item.name} quantity`}
                      className="p-1 text-gray-600 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-35 dark:hover:bg-gray-700"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                  <span className="sr-only">{item.maxQuantity} available</span>
                  <button
                    onClick={() => removeItem(item.productId)}
                    aria-label={`Remove ${item.name} from cart`}
                    className="text-gray-400 hover:text-red-600 p-1"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {items.length > 0 && (
          <div className="border-t pt-4 space-y-4">
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600 dark:text-gray-400 font-medium">Subtotal</span>
              <span className="text-lg font-bold text-gray-900 dark:text-gray-100">
                ₦{total.toLocaleString()}
              </span>
            </div>
            <Button
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold gap-2"
              onClick={() => setOpen(false)}
              asChild
            >
              <Link href="/dashboard/cart">
                Proceed to Checkout <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
