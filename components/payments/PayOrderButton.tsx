"use client";
import { useState } from "react";
export function PayOrderButton({ orderId }: { orderId: string }) {
  const [loading, setLoading] = useState(false); const [error, setError] = useState("");
  async function pay() { setLoading(true); setError(""); try { const response = await fetch("/api/payments/flutterwave/initialize", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderId }) }); const result = await response.json(); if (!response.ok) throw new Error(result.error || "Unable to open Flutterwave checkout."); window.location.assign(result.authorizationUrl); } catch (err) { setError(err instanceof Error ? err.message : "Unable to open Flutterwave checkout."); setLoading(false); } }
  return <div className="mt-3 text-right"><button type="button" onClick={pay} disabled={loading} className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-60">{loading ? "Opening checkout..." : "Pay with Flutterwave"}</button>{error && <p className="mt-2 text-xs text-red-600">{error}</p>}</div>;
}
