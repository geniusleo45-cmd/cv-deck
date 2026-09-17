"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { CartSheet } from "@/components/cart/CartSheet";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Laptop, User, ShieldCheck, ShoppingBag, LogOut, LayoutDashboard, Briefcase, Store } from "lucide-react";

export function Navbar() {
  const { data: session } = useSession();
  const user = session?.user;

  const getDashboardLink = () => {
    if (!user) return "/dashboard";
    switch (user.role) {
      case "ADMIN":
        return "/dashboard/admin";
      case "VENDOR":
        return "/dashboard/vendor";
      case "RECRUITER":
        return "/dashboard/recruiter";
      default:
        return "/dashboard/customer";
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-white/95 dark:bg-gray-950/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white font-bold shadow-md shadow-blue-500/20">
            <Laptop className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xl font-black tracking-tight text-gray-900 dark:text-white">
              CV<span className="text-blue-600">DECK</span>
            </span>
            <span className="block text-[10px] font-semibold text-gray-500 uppercase tracking-widest -mt-1">
              Computer Village
            </span>
          </div>
        </Link>

        {/* Navigation Links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
          <Link
            href="/dashboard/marketplace"
            className="text-gray-700 hover:text-blue-600 dark:text-gray-300 transition-colors"
          >
            Marketplace
          </Link>
          <Link
            href="/vendors"
            className="text-gray-700 hover:text-blue-600 dark:text-gray-300 transition-colors flex items-center gap-1"
          >
            <Store className="h-4 w-4" /> Verified Vendors
          </Link>
          <Link
            href="/recruiters"
            className="text-gray-700 hover:text-blue-600 dark:text-gray-300 transition-colors flex items-center gap-1"
          >
            <Briefcase className="h-4 w-4" /> Recruiter Hub
          </Link>
        </nav>

        {/* User Actions */}
        <div className="flex items-center gap-3">
          <CartSheet />

          {session ? (
            <>
              <NotificationBell />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                    <Avatar className="h-9 w-9 border border-gray-200">
                      <AvatarImage src={user?.image || ""} alt={user?.name || "User"} />
                      <AvatarFallback className="bg-blue-600 text-white font-bold text-xs">
                        {user?.name ? user.name.slice(0, 2).toUpperCase() : "CV"}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-semibold leading-none">{user?.name}</p>
                      <p className="text-xs leading-none text-gray-500">{user?.email}</p>
                      <span className="mt-1 inline-flex items-center rounded-full bg-blue-100 dark:bg-blue-900/50 px-2 py-0.5 text-[10px] font-bold text-blue-700 dark:text-blue-300 uppercase">
                        {user?.role}
                      </span>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href={getDashboardLink()} className="cursor-pointer flex items-center gap-2">
                      <LayoutDashboard className="h-4 w-4" /> Dashboard
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard/profile" className="cursor-pointer flex items-center gap-2">
                      <User className="h-4 w-4" /> Profile Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard/orders" className="cursor-pointer flex items-center gap-2">
                      <ShoppingBag className="h-4 w-4" /> My Orders
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => signOut({ callbackUrl: "/" })}
                    className="cursor-pointer text-red-600 focus:text-red-600 flex items-center gap-2"
                  >
                    <LogOut className="h-4 w-4" /> Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" asChild>
                <Link href="/login">Log in</Link>
              </Button>
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white font-semibold" asChild>
                <Link href="/register">Register</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
