"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, Store, ShieldCheck, CheckCircle, ImagePlus } from "lucide-react";

export default function ProfilePage() {
  const { data: session, update } = useSession();
  const user = session?.user;

  const [name, setName] = useState(user?.name || "");
  const [phone, setPhone] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [bio, setBio] = useState("");
  const [avatar, setAvatar] = useState("");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
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
        setDeliveryAddress(data.deliveryAddress || "");
        setBio(data.bio || "");
        setAvatar(data.avatar || "");
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
        body: JSON.stringify({ name, phone, bio, deliveryAddress, avatar }),
      });

      if (res.ok) {
        setSuccess(true);
        update({ name, image: avatar });
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

  const uploadAvatar = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > 2 * 1024 * 1024) { setError("Choose an image file that is 2 MB or smaller."); return; }
    try {
      setError(""); setUploadingAvatar(true);
      const signatureResponse = await fetch("/api/uploads/avatar-signature", { method: "POST" });
      const signature = await signatureResponse.json();
      if (!signatureResponse.ok) throw new Error(signature.error || "Unable to prepare the profile image upload.");
      const data = new FormData();
      data.append("file", file); data.append("api_key", signature.apiKey); data.append("timestamp", String(signature.timestamp)); data.append("signature", signature.signature); data.append("folder", signature.folder);
      const response = await fetch(`https://api.cloudinary.com/v1_1/${signature.cloudName}/image/upload`, { method: "POST", body: data });
      const result = await response.json();
      if (!response.ok || !result.secure_url) throw new Error(result.error?.message || "Cloudinary could not upload this image.");
      setAvatar(result.secure_url);
    } catch (uploadError) { setError(uploadError instanceof Error ? uploadError.message : "Unable to upload profile image."); }
    finally { setUploadingAvatar(false); }
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
          <div className="relative flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-blue-600 text-lg font-bold text-white">
            {avatar ? <Image src={avatar} alt="Profile avatar" fill sizes="56px" className="object-cover" /> : (name ? name.slice(0, 2).toUpperCase() : "CV")}
          </div>
          <div>
            <h3 className="font-bold text-gray-900 dark:text-white text-base">{name || user?.email}</h3>
            <span className="inline-block rounded-full bg-blue-100 dark:bg-blue-900 px-2.5 py-0.5 text-[10px] font-bold text-blue-700 dark:text-blue-300 uppercase mt-0.5">
              Role: {user?.role}
            </span>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-bold text-gray-700 dark:text-gray-300">Profile photo</Label>
          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-blue-300 bg-blue-50 px-4 py-3 text-xs font-bold text-blue-700 dark:bg-blue-950/30 dark:text-blue-300"><ImagePlus className="h-4 w-4" />{uploadingAvatar ? "Uploading photo..." : "Upload profile photo"}<input type="file" accept="image/*" disabled={uploadingAvatar} className="sr-only" onChange={uploadAvatar} /></label>
          <p className="text-[11px] text-gray-500">PNG, JPG, or WebP up to 2 MB. Save Profile to apply it everywhere.</p>
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
          <Label className="text-xs font-bold text-gray-700 dark:text-gray-300">Default Delivery Address</Label>
          <textarea value={deliveryAddress} onChange={(e) => setDeliveryAddress(e.target.value)} rows={2} placeholder="e.g. 14 Opebi Road, Ikeja, Lagos" className="w-full rounded-md border bg-white p-3 text-xs text-gray-900 dark:bg-gray-800 dark:text-gray-100" />
          <p className="text-[11px] text-gray-500">This pre-fills checkout and can be changed for each order.</p>
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

        <Button type="submit" disabled={saving || uploadingAvatar} className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6">
          {uploadingAvatar ? "Uploading photo..." : saving ? "Saving Changes..." : "Save Profile"}
        </Button>
      </form>
    </div>
  );
}
