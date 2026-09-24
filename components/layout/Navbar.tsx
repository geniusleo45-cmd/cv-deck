"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { CartSheet } from "@/components/cart/CartSheet";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Laptop, LogOut, Briefcase, Store } from "lucide-react";

export function Navbar() {
  const { data: session } = useSession();
  const user = session?.user;

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
          <ThemeToggle />
          <CartSheet />

          {session ? (
            <>
              <NotificationBell />
              <Button
                variant="ghost"
                className="relative h-9 w-9 rounded-full"
                asChild
              >
                <Link href="/dashboard/profile" aria-label="Open profile settings">
                  <Avatar className="h-9 w-9 border border-gray-200">
                    <AvatarImage src={user?.image || ""} alt={user?.name || "User"} />
                    <AvatarFallback className="bg-blue-600 text-white font-bold text-xs">
                      {user?.name ? user.name.slice(0, 2).toUpperCase() : "CV"}
                    </AvatarFallback>
                  </Avatar>
                </Link>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => signOut({ callbackUrl: "/" })}
                aria-label="Log out"
                className="text-gray-600 hover:text-red-600"
              >
                <LogOut className="h-4 w-4" />
              </Button>
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
