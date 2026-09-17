"use client";

import { useState } from "react";

type ProfileFormProps = { name: string; email: string; phone: string | null };

export default function ProfileForm({ name, email, phone }: ProfileFormProps) {
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function saveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setIsSaving(true);
    const formData = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: formData.get("name"), phone: formData.get("phone") }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to save your profile.");
      setMessage("Profile saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save your profile.");
    } finally {
      setIsSaving(false);
    }
  }

  return <form onSubmit={saveProfile} className="mt-6 space-y-5"><div><label htmlFor="name" className="text-sm font-medium">Full name</label><input id="name" name="name" defaultValue={name} required minLength={2} maxLength={80} className="mt-2 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring" /></div><div><label htmlFor="email" className="text-sm font-medium">Email address</label><input id="email" value={email} readOnly className="mt-2 w-full cursor-not-allowed rounded-lg border border-input bg-muted px-3 py-2.5 text-sm text-muted-foreground" /><p className="mt-2 text-xs text-muted-foreground">Email changes are not available yet.</p></div><div><label htmlFor="phone" className="text-sm font-medium">Phone number <span className="font-normal text-muted-foreground">(optional)</span></label><input id="phone" name="phone" type="tel" defaultValue={phone || ""} maxLength={25} placeholder="e.g. +234 800 000 0000" className="mt-2 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring" /></div><button type="submit" disabled={isSaving} className="inline-flex rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60">{isSaving ? "Saving..." : "Save changes"}</button>{message && <p role="status" className="text-sm text-muted-foreground">{message}</p>}</form>;
}
