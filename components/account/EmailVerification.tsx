"use client";
import { useEffect, useState } from "react";
import { RecoveryForm } from "./RecoveryForm";

export function EmailVerification() {
  const [status, setStatus] = useState<{ verified: boolean; previewEnabled: boolean } | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    fetch("/api/account/recovery", { cache: "no-store" }).then(async (response) => {
      if (!response.ok) throw new Error("Status unavailable");
      setStatus(await response.json());
    }).catch(() => setFailed(true));
  }, []);
  return <section className="space-y-3 rounded-2xl border bg-white p-6 dark:bg-gray-900">
    <h2 className="font-bold">Email verification</h2>
    <p className="text-sm">{failed ? "Unable to load verification status. Refresh to try again." : !status ? "Loading status…" : status.verified ? "Email verified" : "Email not yet verified"}</p>
    <p className="text-xs text-gray-500">Email ownership is separate from vendor approval and eligibility to apply for jobs.</p>
    {status && !status.verified && <RecoveryForm mode="resend" enabled={status.previewEnabled} />}
  </section>;
}
