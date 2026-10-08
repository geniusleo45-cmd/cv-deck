"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function AccountMenu() {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") { setOpen(false); trigger.current?.focus(); } };
    document.addEventListener("pointerdown", outside); document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", outside); document.removeEventListener("keydown", escape); };
  }, [open]);
  return <div ref={root} className="relative" onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}>
    <button ref={trigger} type="button" aria-label="Account options" aria-expanded={open} onClick={() => setOpen(!open)} className="rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600">
      <Avatar className="h-9 w-9 border"><AvatarImage src={session?.user?.image || ""} alt="" /><AvatarFallback>{session?.user?.name?.slice(0, 2).toUpperCase() || "CV"}</AvatarFallback></Avatar>
    </button>
    {open && <nav aria-label="Account options" className="absolute right-0 top-12 z-50 w-56 rounded-xl border bg-white p-2 shadow-xl dark:bg-gray-950" onClick={(event) => { if ((event.target as HTMLElement).closest("a")) setOpen(false); }}>
      {[ ["View My Profile", "/dashboard/profile/view"], ["Account settings", "/dashboard/profile"], ["My dashboard", "/dashboard"], ["My orders", "/dashboard/orders"], ["Saved items", "/dashboard/wishlist"], ["Messages", "/dashboard/messages"] ].map(([label, href]) => <Link key={href} href={href} className="block rounded-lg px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800">{label}</Link>)}
      <button type="button" onClick={() => { setOpen(false); void signOut({ callbackUrl: "/" }); }} className="w-full rounded-lg px-3 py-2 text-left text-sm text-red-600">Log out</button>
    </nav>}
  </div>;
}
