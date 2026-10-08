"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { CartSheet } from "@/components/cart/CartSheet";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { MessageIndicator } from "@/components/messaging/MessageIndicator";
import { ThemeToggle } from "@/components/ThemeToggle";
import { AccountMenu } from "./AccountMenu";
import { Bell, Laptop, LogOut, Briefcase, Store, Menu, LayoutDashboard, Package, UserRound } from "lucide-react";

export function Navbar() {
  const { data: session } = useSession();
  const user = session?.user;
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const mobileMenuRef = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const dismissMenu = (event: PointerEvent) => {
      if (!mobileMenuRef.current?.contains(event.target as Node)) setMobileMenuOpen(false);
    };
    const dismissOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileMenuOpen(false);
    };
    document.addEventListener("pointerdown", dismissMenu);
    document.addEventListener("keydown", dismissOnEscape);
    return () => {
      document.removeEventListener("pointerdown", dismissMenu);
      document.removeEventListener("keydown", dismissOnEscape);
    };
  }, [mobileMenuOpen]);

  return (
    <header data-site-header className="sticky top-0 z-40 w-full border-b bg-white/95 dark:bg-gray-950/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
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
          {session && (
            <Link
              href="/dashboard"
              className="text-gray-700 hover:text-blue-600 dark:text-gray-300 transition-colors flex items-center gap-1"
            >
              <LayoutDashboard className="h-4 w-4" /> Dashboard
            </Link>
          )}
          {session && <MessageIndicator className="flex items-center gap-1 text-gray-700 transition-colors hover:text-blue-600 dark:text-gray-300" />}
        </nav>

        <details ref={mobileMenuRef} open={mobileMenuOpen} onToggle={(event) => setMobileMenuOpen(event.currentTarget.open)} className="group relative md:hidden">
          <summary className="flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-lg border text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-900 [&::-webkit-details-marker]:hidden" aria-label="Open navigation menu">
            <Menu className="h-5 w-5" />
          </summary>
          <nav onClick={(event) => { if ((event.target as HTMLElement).closest("a")) setMobileMenuOpen(false); }} className="absolute right-0 top-12 z-50 w-56 rounded-xl border bg-white p-2 shadow-xl dark:bg-gray-950">
            <Link href="/dashboard/marketplace" className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold text-gray-700 hover:bg-blue-50 hover:text-blue-700 dark:text-gray-200 dark:hover:bg-blue-950/40"><Store className="h-4 w-4" /> Marketplace</Link>
            <Link href="/vendors" className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold text-gray-700 hover:bg-blue-50 hover:text-blue-700 dark:text-gray-200 dark:hover:bg-blue-950/40"><Store className="h-4 w-4" /> Verified vendors</Link>
            <Link href="/recruiters" className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold text-gray-700 hover:bg-blue-50 hover:text-blue-700 dark:text-gray-200 dark:hover:bg-blue-950/40"><Briefcase className="h-4 w-4" /> Recruiter hub</Link>
            {session ? <><Link href="/dashboard" className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold text-gray-700 hover:bg-blue-50 hover:text-blue-700 dark:text-gray-200 dark:hover:bg-blue-950/40"><LayoutDashboard className="h-4 w-4" /> My dashboard</Link><Link href="/dashboard/orders" className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold text-gray-700 hover:bg-blue-50 hover:text-blue-700 dark:text-gray-200 dark:hover:bg-blue-950/40"><Package className="h-4 w-4" /> Orders</Link><MessageIndicator className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold text-gray-700 hover:bg-blue-50 hover:text-blue-700 dark:text-gray-200 dark:hover:bg-blue-950/40" /><Link href="/dashboard/notifications" className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold text-gray-700 hover:bg-blue-50 hover:text-blue-700 dark:text-gray-200 dark:hover:bg-blue-950/40"><Bell className="h-4 w-4" /> Notifications</Link><Link href="/dashboard/profile" className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold text-gray-700 hover:bg-blue-50 hover:text-blue-700 dark:text-gray-200 dark:hover:bg-blue-950/40"><UserRound className="h-4 w-4" /> Profile settings</Link><div className="mt-1 flex items-center justify-between border-t px-3 pt-2 text-sm font-semibold text-gray-700 dark:text-gray-200"><span>Appearance</span><ThemeToggle /></div><button type="button" onClick={() => { setMobileMenuOpen(false); signOut({ callbackUrl: "/" }); }} className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"><LogOut className="h-4 w-4" /> Log out</button></> : <div className="mt-1 space-y-1 border-t pt-2"><Link href="/login" className="block rounded-lg px-3 py-2.5 text-sm font-semibold text-gray-700 hover:bg-blue-50 hover:text-blue-700 dark:text-gray-200 dark:hover:bg-blue-950/40">Log in</Link><Link href="/register" className="block rounded-lg bg-blue-600 px-3 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">Create an account</Link></div>}
          </nav>
        </details>

        {/* User Actions */}
        <div className="flex items-center gap-1 sm:gap-3">
          <div className="hidden sm:block"><ThemeToggle /></div>
          <CartSheet />

          {session ? (
            <>
              <NotificationBell />
              <AccountMenu />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => signOut({ callbackUrl: "/" })}
                aria-label="Log out"
                className="hidden text-gray-600 hover:text-red-600 sm:inline-flex"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <div className="hidden items-center gap-2 sm:flex">
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
      <div className="container mx-auto px-4 pb-2 sm:px-6">
        <form action="/dashboard/search" role="search" className="mx-auto flex max-w-2xl gap-2">
          <input type="search" name="query" aria-label="Search CV Deck" placeholder="Search products, vendors, recruiters, technicians…" minLength={2} maxLength={100} required className="min-w-0 flex-1 rounded-lg border bg-gray-50 px-3 py-1.5 text-sm dark:bg-gray-900" />
          <button type="submit" className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white">Search</button>
        </form>
      </div>
    </header>
  );
}
