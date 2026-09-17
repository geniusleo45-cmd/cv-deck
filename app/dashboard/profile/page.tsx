"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, Store, ShieldCheck, CheckCircle } from "lucide-react";

export default function ProfilePage() {
  const { data: session, update } = useSession();
  const user = session?.user;

  const [name, setName] = useState(user?.name || "");
  const [phone, setPhone] = useState("");
  const [bio, setBio] = useState("");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const fetchProfile = async () => {
    try {
      const res = await fetch("/api/profile");
      if (res.ok) {
        const data = await res.json();
        setName(data.name || "");
        setPhone(data.phone || "");
        setBio(data.bio || "");
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccess(false);
    setError("");

    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, bio }),
      });

      if (res.ok) {
        setSuccess(true);
        update();
        setTimeout(() => setSuccess(false), 3000);
      } else {
        const data = await res.json();
        setError(data.error || "Failed to update profile");
      }
    } catch (e) {
      setError("An unexpected error occurred");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="border-b pb-4">
        <h1 className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-2">
          <User className="h-7 w-7 text-blue-600" /> Account Profile Settings
        </h1>
        <p className="text-xs text-gray-500 mt-1">
          Manage your personal details and Computer Village marketplace credentials.
        </p>
      </div>

      {success && (
        <div className="p-3 text-xs font-semibold text-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 flex items-center gap-2">
          <CheckCircle className="h-4 w-4 text-emerald-600" /> Profile updated successfully!
        </div>
      )}

      {error && (
        <div className="p-3 text-xs font-semibold text-red-600 bg-red-50 dark:bg-red-950/40 rounded-xl border border-red-200">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="rounded-2xl border bg-white dark:bg-gray-900 p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-4 border-b pb-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-white font-bold text-lg">
            {name ? name.slice(0, 2).toUpperCase() : "CV"}
          </div>
          <div>
            <h3 className="font-bold text-gray-900 dark:text-white text-base">{name || user?.email}</h3>
            <span className="inline-block rounded-full bg-blue-100 dark:bg-blue-900 px-2.5 py-0.5 text-[10px] font-bold text-blue-700 dark:text-blue-300 uppercase mt-0.5">
              Role: {user?.role}
            </span>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-bold text-gray-700 dark:text-gray-300">Full Name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} required />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-bold text-gray-700 dark:text-gray-300">Email Address (Read-only)</Label>
          <Input value={user?.email || ""} disabled className="bg-gray-100 dark:bg-gray-800" />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-bold text-gray-700 dark:text-gray-300">Phone Number</Label>
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+234 801 234 5678" />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-bold text-gray-700 dark:text-gray-300">Bio / Description</Label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={3}
            placeholder="Tell us about yourself or your Computer Village business..."
            className="w-full rounded-md border bg-white dark:bg-gray-800 p-3 text-xs text-gray-900 dark:text-gray-100"
          />
        </div>

        <Button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6">
          {saving ? "Saving Changes..." : "Save Profile"}
        </Button>
      </form>
    </div>
  );
}
