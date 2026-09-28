"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";

export type CartItem = {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  maxQuantity: number;
  image?: string;
  vendorId?: string;
  vendorName?: string;
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

    return [{ productId: item.productId, name: item.name, price: item.price, quantity, maxQuantity, image: typeof item.image === "string" ? item.image : undefined, vendorId: typeof item.vendorId === "string" ? item.vendorId : undefined, vendorName: typeof item.vendorName === "string" ? item.vendorName : undefined }];
  });
}

function mapServerCart(data: any): CartItem[] {
  return (data.cart?.items || []).flatMap((item: any): CartItem[] => {
    const product = item.product;
    if (!product || product.stock <= 0 || product.status !== "ACTIVE") return [];
    let image: string | undefined;
    try { image = JSON.parse(product.images)[0]; } catch {}
    return [{ productId: product.id, name: product.name, price: product.price, quantity: Math.min(item.quantity, product.stock), maxQuantity: product.stock, image, vendorId: product.vendor?.id, vendorName: product.vendor?.businessName }];
  });
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const [items, setItems] = useState<CartItem[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);
  const storageKey = session?.user?.id ? `cv-deck-cart:${session.user.id}` : null;

  const refreshServerCart = useCallback(async () => {
    const response = await fetch("/api/cart");
    if (!response.ok) throw new Error("Unable to load saved cart.");
    const data = await response.json();
    const serverItems = mapServerCart(data);
    setItems(serverItems);
    return serverItems;
  }, []);

  useEffect(() => {
    if (status === "loading" || !storageKey) return;

    setIsHydrated(false);
    try {
      const savedCart = window.localStorage.getItem(storageKey);
      const legacyCart = window.localStorage.getItem(legacyStorageKey);
      const browserItems = readCart(savedCart || legacyCart);
      refreshServerCart().then(async (serverItems) => {
        if (!serverItems.length && browserItems.length) {
          await Promise.all(browserItems.map((item) => fetch("/api/cart", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ productId: item.productId, quantity: item.quantity }) })));
          await refreshServerCart();
        }
        if (legacyCart && !savedCart) window.localStorage.removeItem(legacyStorageKey);
      }).catch(() => setItems(browserItems));
    } catch {
      window.localStorage.removeItem(storageKey);
      setItems([]);
    } finally {
      setIsHydrated(true);
    }
  }, [refreshServerCart, status, storageKey]);

  useEffect(() => {
    if (isHydrated && storageKey) window.localStorage.setItem(storageKey, JSON.stringify(items));
  }, [isHydrated, items, storageKey]);

  const value = useMemo(() => ({
    items,
    itemCount: items.reduce((count, item) => count + item.quantity, 0),
    total: items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    addItem: (newItem: Omit<CartItem, "quantity">) => {
      void fetch("/api/cart", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ productId: newItem.productId, quantity: 1 }) }).then(() => refreshServerCart()).catch(() => undefined);
      setItems((currentItems) => {
      const existingItem = currentItems.find((item) => item.productId === newItem.productId);
      if (!existingItem) return [...currentItems, { ...newItem, quantity: 1 }];
      return currentItems.map((item) => item.productId === newItem.productId ? { ...item, quantity: Math.min(item.quantity + 1, item.maxQuantity) } : item);
      });
    },
    setQuantity: (productId: string, quantity: number) => {
      const current = items.find((item) => item.productId === productId);
      if (current) void fetch("/api/cart", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ productId, quantity: quantity - current.quantity }) }).then(() => refreshServerCart()).catch(() => undefined);
      setItems((currentItems) => currentItems.flatMap((item) => {
      if (item.productId !== productId) return [item];
      if (quantity <= 0) return [];
      return [{ ...item, quantity: Math.min(quantity, item.maxQuantity) }];
      }));
    },
    removeItem: (productId: string) => {
      const current = items.find((item) => item.productId === productId);
      if (current) void fetch("/api/cart", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ productId, quantity: -current.quantity }) }).then(() => refreshServerCart()).catch(() => undefined);
      setItems((currentItems) => currentItems.filter((item) => item.productId !== productId));
    },
    clearCart: () => { void fetch("/api/cart", { method: "DELETE" }).catch(() => undefined); setItems([]); },
  }), [items, refreshServerCart]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within a CartProvider");
  return context;
}
