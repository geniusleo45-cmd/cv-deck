"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";

export type CartItem = {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  maxQuantity: number;
};

type CartContextValue = {
  items: CartItem[];
  itemCount: number;
  total: number;
  addItem: (item: Omit<CartItem, "quantity">) => void;
  setQuantity: (productId: string, quantity: number) => void;
  removeItem: (productId: string) => void;
  clearCart: () => void;
};

const CartContext = createContext<CartContextValue | undefined>(undefined);
const legacyStorageKey = "cv-deck-cart";

function readCart(rawCart: string | null): CartItem[] {
  if (!rawCart) return [];

  const parsed = JSON.parse(rawCart);
  if (!Array.isArray(parsed)) return [];

  return parsed.flatMap((item): CartItem[] => {
    if (
      !item ||
      typeof item.productId !== "string" ||
      typeof item.name !== "string" ||
      typeof item.price !== "number" ||
      !Number.isFinite(item.price) ||
      typeof item.quantity !== "number"
    ) {
      return [];
    }

    const maxQuantity = typeof item.maxQuantity === "number" && item.maxQuantity > 0
      ? Math.floor(item.maxQuantity)
      : Math.max(1, Math.floor(item.quantity));
    const quantity = Math.min(Math.max(1, Math.floor(item.quantity)), maxQuantity);

    return [{ productId: item.productId, name: item.name, price: item.price, quantity, maxQuantity }];
  });
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const [items, setItems] = useState<CartItem[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);
  const storageKey = session?.user?.id ? `cv-deck-cart:${session.user.id}` : null;

  useEffect(() => {
    if (status === "loading" || !storageKey) return;

    setIsHydrated(false);
    try {
      const savedCart = window.localStorage.getItem(storageKey);
      const legacyCart = window.localStorage.getItem(legacyStorageKey);
      setItems(readCart(savedCart || legacyCart));
      if (legacyCart && !savedCart) window.localStorage.removeItem(legacyStorageKey);
    } catch {
      window.localStorage.removeItem(storageKey);
      setItems([]);
    } finally {
      setIsHydrated(true);
    }
  }, [status, storageKey]);

  useEffect(() => {
    if (isHydrated && storageKey) window.localStorage.setItem(storageKey, JSON.stringify(items));
  }, [isHydrated, items, storageKey]);

  const value = useMemo(() => ({
    items,
    itemCount: items.reduce((count, item) => count + item.quantity, 0),
    total: items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    addItem: (newItem: Omit<CartItem, "quantity">) => setItems((currentItems) => {
      const existingItem = currentItems.find((item) => item.productId === newItem.productId);
      if (!existingItem) return [...currentItems, { ...newItem, quantity: 1 }];
      return currentItems.map((item) => item.productId === newItem.productId ? { ...item, quantity: Math.min(item.quantity + 1, item.maxQuantity) } : item);
    }),
    setQuantity: (productId: string, quantity: number) => setItems((currentItems) => currentItems.flatMap((item) => {
      if (item.productId !== productId) return [item];
      if (quantity <= 0) return [];
      return [{ ...item, quantity: Math.min(quantity, item.maxQuantity) }];
    })),
    removeItem: (productId: string) => setItems((currentItems) => currentItems.filter((item) => item.productId !== productId)),
    clearCart: () => setItems([]),
  }), [items]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within a CartProvider");
  return context;
}
