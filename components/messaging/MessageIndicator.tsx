"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { MessageSquare } from "lucide-react";

export function MessageIndicator({ className }: { className: string }) {
  const [count, setCount] = useState(0);

  const refreshCount = useCallback(() => {
    fetch("/api/messages/unread")
      .then((response) => response.ok ? response.json() : null)
      .then((data) => setCount(data?.unreadCount || 0))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    refreshCount();
    const interval = window.setInterval(refreshCount, 30000);
    window.addEventListener("messages-updated", refreshCount);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("messages-updated", refreshCount);
    };
  }, [refreshCount]);

  return <Link href="/dashboard/messages" className={`relative ${className}`}><MessageSquare className="h-4 w-4" /> Messages{count > 0 && <span className="rounded-full bg-red-600 px-1.5 py-0.5 text-[10px] font-black leading-none text-white">{count > 9 ? "9+" : count}</span>}</Link>;
}
