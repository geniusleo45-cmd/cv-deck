"use client";

import Link from "next/link";
import { useState } from "react";
import { Check, CheckCheck, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";

type NotificationItem = { id: string; title: string; message: string; link: string | null; read: boolean; createdAt: string };

export function NotificationList({ notifications: initialNotifications }: { notifications: NotificationItem[] }) {
  const [notifications, setNotifications] = useState(initialNotifications);
  const [updating, setUpdating] = useState(false);
  const unreadCount = notifications.filter((notification) => !notification.read).length;

  async function markRead(id?: string) {
    setUpdating(true);
    const response = await fetch("/api/notifications", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(id ? { id } : {}) });
    if (response.ok) { setNotifications((current) => current.map((notification) => id && notification.id !== id ? notification : { ...notification, read: true })); window.dispatchEvent(new Event("notifications-updated")); }
    setUpdating(false);
  }

  if (!notifications.length) return <p className="rounded-xl border p-6 text-gray-500">No notifications yet.</p>;

  return <div className="space-y-4"><div className="flex items-center justify-between gap-3"><p className="text-sm text-gray-500">{unreadCount ? `${unreadCount} unread notification${unreadCount === 1 ? "" : "s"}` : "You are all caught up."}</p><Button type="button" variant="outline" size="sm" disabled={!unreadCount || updating} onClick={() => markRead()} className="gap-1.5 text-xs"><CheckCheck className="h-4 w-4" /> Mark all read</Button></div><div className="space-y-3">{notifications.map((notification) => <article key={notification.id} className={`flex gap-3 rounded-xl border p-4 transition ${notification.read ? "bg-white dark:bg-gray-900" : "border-blue-200 bg-blue-50/60 dark:border-blue-900 dark:bg-blue-950/20"}`}><div className="pt-1">{notification.read ? <Check className="h-4 w-4 text-emerald-600" /> : <Circle className="h-3 w-3 fill-blue-600 text-blue-600" />}</div><div className="min-w-0 flex-1"><Link href={notification.link || "/dashboard"} onClick={() => { if (!notification.read) void markRead(notification.id); }} className="block"><p className="font-bold text-gray-900 dark:text-white">{notification.title}</p><p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{notification.message}</p><p className="mt-2 text-xs text-gray-500">{new Date(notification.createdAt).toLocaleString()}</p></Link></div>{!notification.read && <Button type="button" variant="ghost" size="icon" onClick={() => markRead(notification.id)} disabled={updating} aria-label="Mark notification as read" className="shrink-0 text-blue-700"><Check className="h-4 w-4" /></Button>}</article>)}</div></div>;
}
