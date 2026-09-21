"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
export function NotificationBell() { const [count, setCount] = useState(0); useEffect(() => { fetch("/api/notifications").then((r) => r.ok ? r.json() : null).then((d) => setCount(d?.unreadCount || 0)).catch(() => undefined); }, []); return <Button variant="ghost" size="icon" className="relative" asChild><Link href="/dashboard/notifications" aria-label="View notifications"><Bell className="h-5 w-5" />{count > 0 && <span className="absolute -right-1 -top-1 rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">{count > 9 ? "9+" : count}</span>}</Link></Button>; }
