"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

type Mode = "request" | "reset" | "verify" | "resend";
type Preview = { to: string; subject: string; href: string; expiresAt: string };

export function RecoveryForm({ mode, enabled }: { mode: Mode; enabled: boolean }) {
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [preview, setPreview] = useState<Preview | null>(null);
  const tokenRead = useRef(false);
  useEffect(() => {
    if (tokenRead.current || (mode !== "reset" && mode !== "verify")) return;
    tokenRead.current = true;
    setToken(new URLSearchParams(window.location.hash.slice(1)).get("token") || "");
    // Keep the secret out of subsequent referrers/history. GET never consumes it.
    window.history.replaceState(null, "", window.location.pathname);
  }, [mode]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setError(""); setMessage(""); setPreview(null);
    if (mode === "reset" && data.get("password") !== data.get("confirm")) { setError("Passwords do not match."); return; }
    setBusy(true);
    try {
      const consuming = mode === "reset" || mode === "verify";
      const response = await fetch("/api/account/recovery", {
        method: consuming ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ purpose: mode === "request" || mode === "reset" ? "RESET_PASSWORD" : "VERIFY_EMAIL",
          ...(consuming ? { token } : mode === "request" ? { email: data.get("email") } : {}),
          ...(mode === "reset" ? { password: data.get("password") } : {}),
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to complete your request.");
      setMessage(result.message); setPreview(result.preview || null);
      if (consuming) { setDone(true); setToken(""); }
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Unable to connect. Please try again."); }
    finally { setBusy(false); }
  }

  if (!enabled) return <p className="rounded-xl bg-gray-50 p-4 text-sm text-gray-600 dark:bg-gray-800 dark:text-gray-300">Email delivery is not configured yet. This feature is not available on the live site. Existing accounts can still sign in normally.</p>;
  return <div className="space-y-4">
    <p className="text-xs text-amber-700 dark:text-amber-300">Local development preview only — no real email will be sent.</p>
    {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
    {message && <p role="status" className="text-sm text-green-700 dark:text-green-300">{message}</p>}
    {!done && <form onSubmit={submit} className="space-y-4">
      {mode === "request" && <label className="block text-sm font-semibold">Account email<input name="email" type="email" autoComplete="email" maxLength={254} required className="mt-2 w-full rounded-lg border bg-transparent p-3" /></label>}
      {mode === "reset" && <><label className="block text-sm font-semibold">New password<input name="password" type="password" autoComplete="new-password" minLength={12} maxLength={72} required className="mt-2 w-full rounded-lg border bg-transparent p-3" /></label><label className="block text-sm font-semibold">Confirm password<input name="confirm" type="password" autoComplete="new-password" minLength={12} maxLength={72} required className="mt-2 w-full rounded-lg border bg-transparent p-3" /></label><p className="text-xs text-gray-500">Use 12–72 characters, at most 72 UTF-8 bytes. Resetting signs out existing sessions.</p></>}
      {(mode === "verify" || mode === "reset") && !token && <p className="text-sm">No link token found. Request a new link or reopen your preview link.</p>}
      <Button type="submit" disabled={busy || ((mode === "verify" || mode === "reset") && !token)}>{busy ? "Please wait…" : mode === "request" ? "Request reset link" : mode === "reset" ? "Save new password" : mode === "resend" ? "Send / resend verification link" : "Confirm email verification"}</Button>
    </form>}
    {preview && <section className="space-y-2 rounded-xl border p-4 text-sm"><h3 className="font-bold">Development email preview</h3><p className="break-all">To: {preview.to}</p><p>{preview.subject}</p><a href={preview.href} rel="noreferrer" className="font-bold text-blue-600 underline">Open secure link</a><p className="text-xs">Expires: {new Date(preview.expiresAt).toLocaleString()}</p></section>}
    {done && <Link className="text-sm font-bold text-blue-600 underline" href={mode === "reset" ? "/login" : "/dashboard/profile"}>{mode === "reset" ? "Sign in" : "Return to profile"}</Link>}
  </div>;
}
