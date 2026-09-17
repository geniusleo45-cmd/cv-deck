"use client";

import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";

export default function LogoutButton() {
  async function handleLogout() {
    await signOut({
      callbackUrl: "/login",
    });
  }

  return (
    <button
      onClick={handleLogout}
      className="inline-flex items-center gap-2 rounded-lg bg-black px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-800"
    >
      <LogOut className="size-4" />
      Logout
    </button>
  );
}
