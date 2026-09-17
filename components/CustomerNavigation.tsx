"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Package, ShoppingBag, ShoppingCart, Store, UserRound } from "lucide-react";
import { useCart } from "@/components/cart/CartProvider";
import LogoutButton from "@/components/LogoutButton";
import { cn } from "@/lib/utils";

const navigation = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/marketplace", label: "Marketplace", icon: Store },
  { href: "/dashboard/orders", label: "My orders", icon: Package },
  { href: "/dashboard/cart", label: "Cart", icon: ShoppingCart },
  { href: "/dashboard/profile", label: "Profile", icon: UserRound },
];

type CustomerNavigationProps = { user: { name?: string | null; email?: string | null } };

export default function CustomerNavigation({ user }: CustomerNavigationProps) {
  const pathname = usePathname();
  const { itemCount } = useCart();
  const initial = user.name?.trim().charAt(0).toUpperCase() || "C";

  return <aside className="flex w-full flex-col border-b border-border bg-card lg:min-h-screen lg:w-72 lg:border-r lg:border-b-0">
    <div className="flex items-center gap-3 px-5 py-5 lg:px-6"><div className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground"><ShoppingBag className="size-5" /></div><div><p className="font-semibold tracking-tight">CV Deck</p><p className="text-xs text-muted-foreground">Customer portal</p></div></div>
    <nav className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-col lg:px-4">
      {navigation.map(({ href, label, icon: Icon }) => { const isActive = pathname === href; return <Link key={href} href={href} className={cn("flex shrink-0 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors", isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground")}><Icon className="size-4" />{label}{href === "/dashboard/cart" && itemCount > 0 && <span className={cn("ml-auto rounded-full px-2 py-0.5 text-xs", isActive ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-foreground")}>{itemCount}</span>}</Link>; })}
    </nav>
    <div className="hidden border-t border-border p-4 lg:mt-auto lg:block"><div className="mb-4 flex items-center gap-3 px-2"><div className="flex size-9 items-center justify-center rounded-full bg-muted text-sm font-semibold">{initial}</div><div className="min-w-0"><p className="truncate text-sm font-medium">{user.name || "Customer"}</p><p className="truncate text-xs text-muted-foreground">{user.email}</p></div></div><LogoutButton /></div>
  </aside>;
}
