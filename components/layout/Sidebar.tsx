"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  LayoutDashboard,
  ShoppingBag,
  Package,
  Store,
  Users,
  ShieldCheck,
  MessageSquare,
  BarChart3,
  User,
  Settings,
  Briefcase,
  PlusCircle,
  Heart,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export function DashboardSidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const role = session?.user?.role || "CUSTOMER";

  const getNavItems = () => {
    switch (role) {
      case "ADMIN":
        return [
          { href: "/dashboard/admin", label: "Overview", icon: LayoutDashboard },
          { href: "/dashboard/admin/verifications", label: "Vendor Verification Queue", icon: ShieldCheck },
          { href: "/dashboard/admin/users", label: "User Management", icon: Users },
          { href: "/dashboard/admin/products", label: "Marketplace Products", icon: Package },
          { href: "/dashboard/admin/orders", label: "Global Orders", icon: ShoppingBag },
          { href: "/dashboard/admin/analytics", label: "Analytics & Reports", icon: BarChart3 },
          { href: "/dashboard/messages", label: "Messages", icon: MessageSquare },
          { href: "/dashboard/profile", label: "Settings", icon: Settings },
        ];
      case "VENDOR":
        return [
          { href: "/dashboard/vendor", label: "Vendor Dashboard", icon: LayoutDashboard },
          { href: "/dashboard/vendor/products", label: "My Inventory", icon: Package },
          { href: "/dashboard/vendor/orders", label: "Customer Orders", icon: ShoppingBag },
          { href: "/dashboard/vendor/verification", label: "Verification Status", icon: ShieldCheck },
          { href: "/dashboard/messages", label: "Messages & Inquiries", icon: MessageSquare },
          { href: "/dashboard/vendor/profile", label: "Business Profile", icon: User },
        ];
      case "RECRUITER":
        return [
          { href: "/dashboard/recruiter", label: "Procurement Hub", icon: Briefcase },
          { href: "/vendors", label: "Vendor Directory", icon: Store },
          { href: "/dashboard/messages", label: "Direct Inquiries", icon: MessageSquare },
          { href: "/dashboard/orders", label: "Corporate Orders", icon: ShoppingBag },
          { href: "/dashboard/profile", label: "Company Profile", icon: User },
        ];
      default: // CUSTOMER
        return [
          { href: "/dashboard/customer", label: "My Overview", icon: LayoutDashboard },
          { href: "/dashboard/marketplace", label: "Browse Marketplace", icon: Store },
          { href: "/dashboard/orders", label: "My Orders & Tracking", icon: ShoppingBag },
          { href: "/dashboard/cart", label: "Shopping Cart", icon: Package },
          { href: "/dashboard/wishlist", label: "Saved Products", icon: Heart },
          { href: "/dashboard/messages", label: "Messages", icon: MessageSquare },
          { href: "/dashboard/profile", label: "Account Settings", icon: Settings },
        ];
    }
  };

  const navItems = getNavItems();

  return (
    <aside className="w-full shrink-0 rounded-xl border bg-gray-50/50 p-3 dark:bg-gray-900/50 lg:min-h-[calc(100vh-4rem)] lg:w-64 lg:rounded-none lg:border-y-0 lg:border-l-0 lg:border-r lg:p-4">
      <div>
        <div className="px-3 py-2">
          <h2 className="mb-4 hidden text-xs font-bold uppercase tracking-wider text-gray-500 lg:block">
            {role} PORTAL
          </h2>
          <nav className="flex gap-1 overflow-x-auto pb-1 lg:block lg:space-y-1 lg:overflow-visible lg:pb-0">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || (item.href.includes("tab=") && pathname.startsWith(item.href.split("?")[0]));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors lg:gap-3 lg:py-2.5",
                    isActive
                      ? "bg-blue-600 text-white font-semibold shadow-sm"
                      : "text-gray-700 hover:bg-gray-200/60 dark:text-gray-300 dark:hover:bg-gray-800"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {role === "VENDOR" && (
        <div className="mt-6 hidden space-y-2 rounded-xl border border-blue-100 bg-blue-50 p-3 text-center dark:border-blue-900/50 dark:bg-blue-950/40 lg:block">
          <p className="text-xs font-semibold text-blue-900 dark:text-blue-200">
            Have new tech stock?
          </p>
          <Button size="sm" className="w-full bg-blue-600 hover:bg-blue-700 text-white gap-1" asChild>
          <Link href="/dashboard/vendor/products/new">
              <PlusCircle className="h-3.5 w-3.5" /> Add Product
            </Link>
          </Button>
        </div>
      )}
    </aside>
  );
}
