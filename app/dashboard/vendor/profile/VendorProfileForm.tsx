"use client";

import Image from "next/image";
import { ChangeEvent, useState } from "react";
import { CheckCircle, ImagePlus, ShieldCheck } from "lucide-react";

type Vendor = { businessName: string; officeAddress: string; phone: string; businessRegNumber: string; bankDetails: string; logo: string; banner: string; status: string };
type ImageField = "logo" | "banner";
type UploadSignature = { cloudName: string; apiKey: string; timestamp: number; signature: string; folder: string };
const MAX_IMAGE_SIZE = 2 * 1024 * 1024;

export function VendorProfileForm({ vendor }: { vendor: Vendor }) {
  const [form, setForm] = useState(vendor);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<ImageField | null>(null);
  const [message, setMessage] = useState("");
  const update = (key: keyof Vendor, value: string) => setForm((current) => ({ ...current, [key]: value }));

  async function uploadBrandImage(field: ImageField, event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) return setMessage("Please choose an image file.");
    if (file.size > MAX_IMAGE_SIZE) return setMessage("Logo and banner images must be 2 MB or smaller.");
    try {
      setMessage("");
      setUploading(field);
      const signatureResponse = await fetch("/api/uploads/vendor-branding-signature", { method: "POST" });
      const signature = await signatureResponse.json() as UploadSignature & { error?: string };
      if (!signatureResponse.ok) throw new Error(signature.error || "Unable to prepare your image upload.");
      const data = new FormData();
      data.append("file", file);
      data.append("api_key", signature.apiKey);
      data.append("timestamp", String(signature.timestamp));
      data.append("signature", signature.signature);
      data.append("folder", signature.folder);
      const response = await fetch(`https://api.cloudinary.com/v1_1/${signature.cloudName}/image/upload`, { method: "POST", body: data });
      const result = await response.json() as { secure_url?: string; error?: { message?: string } };
      if (!response.ok || !result.secure_url) throw new Error(result.error?.message || "Cloudinary could not upload this image.");
      update(field, result.secure_url);
      setMessage(`${field === "logo" ? "Logo" : "Banner"} uploaded. Save your profile to publish it.`);
    } catch (uploadError) { setMessage(uploadError instanceof Error ? uploadError.message : "Unable to upload image."); }
    finally { setUploading(null); }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault(); setSaving(true); setMessage("");
    const response = await fetch("/api/vendors", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const data = await response.json(); setMessage(response.ok ? "Business profile saved." : data.error || "Unable to save profile."); setSaving(false);
  }

  const imageUpload = (field: ImageField, title: string, description: string) => <section className="space-y-2"><div><h2 className="text-sm font-semibold">{title}</h2><p className="text-xs text-gray-500">{description} PNG, JPG, or WebP up to 2 MB.</p></div><label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-blue-300 bg-blue-50 px-4 py-5 text-sm font-semibold text-blue-700 dark:bg-blue-950/30 dark:text-blue-300"><ImagePlus className="h-5 w-5" />{uploading === field ? "Uploading..." : `Upload ${field === "logo" ? "logo" : "banner"} image`}<input type="file" accept="image/*" disabled={Boolean(uploading)} className="sr-only" onChange={(event) => uploadBrandImage(field, event)} /></label>{form[field] && <div className={`relative overflow-hidden rounded-lg border bg-gray-100 ${field === "logo" ? "h-24 w-24" : "aspect-[3/1]"}`}><Image src={form[field]} alt={`${form.businessName} ${field}`} fill className="object-cover" /></div>}</section>;

  return <form onSubmit={submit} className="grid gap-5 rounded-2xl border bg-white p-6 dark:bg-gray-900 md:grid-cols-2"><div className="md:col-span-2 flex items-center gap-2 rounded-xl bg-blue-50 p-3 text-sm font-bold text-blue-800 dark:bg-blue-950/30 dark:text-blue-300"><ShieldCheck className="h-5 w-5" /> Verification status: {form.status}</div><label className="grid gap-1 text-sm font-semibold">Business name<input required value={form.businessName} onChange={(e) => update("businessName", e.target.value)} className="rounded-lg border p-2 font-normal dark:bg-gray-800" /></label><label className="grid gap-1 text-sm font-semibold">Business phone<input value={form.phone} onChange={(e) => update("phone", e.target.value)} className="rounded-lg border p-2 font-normal dark:bg-gray-800" /></label><label className="grid gap-1 text-sm font-semibold md:col-span-2">Shop address<textarea required value={form.officeAddress} onChange={(e) => update("officeAddress", e.target.value)} rows={2} className="rounded-lg border p-2 font-normal dark:bg-gray-800" /></label><label className="grid gap-1 text-sm font-semibold">Business registration number<input value={form.businessRegNumber} onChange={(e) => update("businessRegNumber", e.target.value)} className="rounded-lg border p-2 font-normal dark:bg-gray-800" /></label><label className="grid gap-1 text-sm font-semibold">Payout / bank details<input value={form.bankDetails} onChange={(e) => update("bankDetails", e.target.value)} placeholder="Bank · Account name · Number" className="rounded-lg border p-2 font-normal dark:bg-gray-800" /></label><div>{imageUpload("logo", "Logo upload image", "Your shop mark or logo.")}</div><div>{imageUpload("banner", "Banner upload image", "A wide image for your business profile.")}</div><div className="md:col-span-2 flex items-center gap-3"><button disabled={saving || Boolean(uploading)} className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60">{uploading ? "Uploading image..." : saving ? "Saving..." : "Save business profile"}</button>{message && <p className={`text-sm ${message === "Business profile saved." ? "text-emerald-600" : "text-red-600"}`}>{message === "Business profile saved." && <CheckCircle className="mr-1 inline h-4 w-4" />}{message}</p>}</div></form>;
}
