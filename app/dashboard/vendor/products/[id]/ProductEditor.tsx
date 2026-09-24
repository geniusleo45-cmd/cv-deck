"use client";

import Image from "next/image";
import { ChangeEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, Trash2 } from "lucide-react";

const MAX_IMAGES = 3;
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
type UploadSignature = { cloudName: string; apiKey: string; timestamp: number; signature: string; folder: string };
type Product = { id: string; name: string; price: number; stock: number; status: string; images: string[] };

export function ProductEditor({ product }: { product: Product }) {
  const router = useRouter();
  const [images, setImages] = useState(product.images);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function uploadImages(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    if (!files.length) return;
    if (images.length + files.length > MAX_IMAGES) return setError(`You can upload up to ${MAX_IMAGES} product images.`);
    if (files.some((file) => !file.type.startsWith("image/"))) return setError("Please select image files only.");
    if (files.some((file) => file.size > MAX_IMAGE_SIZE)) return setError("Each image must be 5 MB or smaller.");

    try {
      setError("");
      setUploading(true);
      const signatureResponse = await fetch("/api/uploads/product-image-signature", { method: "POST" });
      const signature = await signatureResponse.json() as UploadSignature & { error?: string };
      if (!signatureResponse.ok) throw new Error(signature.error || "Unable to prepare your image upload.");
      const uploads = await Promise.all(files.map(async (file) => {
        const data = new FormData();
        data.append("file", file);
        data.append("api_key", signature.apiKey);
        data.append("timestamp", String(signature.timestamp));
        data.append("signature", signature.signature);
        data.append("folder", signature.folder);
        const response = await fetch(`https://api.cloudinary.com/v1_1/${signature.cloudName}/image/upload`, { method: "POST", body: data });
        const result = await response.json() as { secure_url?: string; error?: { message?: string } };
        if (!response.ok || !result.secure_url) throw new Error(result.error?.message || "Cloudinary could not upload this image.");
        return result.secure_url;
      }));
      setImages((current) => [...current, ...uploads]);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Unable to upload one or more images.");
    } finally { setUploading(false); }
  }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!images.length) return setError("Upload at least one product image before saving.");
    setSaving(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const response = await fetch(`/api/products/${product.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: form.get("name"), price: Number(form.get("price")), stock: Number(form.get("stock")), status: form.get("status"), images }) });
    const result = await response.json();
    if (!response.ok) { setError(result.error || "Unable to update product."); setSaving(false); return; }
    router.push("/dashboard/vendor/products");
    router.refresh();
  }

  async function remove() {
    if (!window.confirm(`Delete ${product.name}? This cannot be undone.`)) return;
    setDeleting(true);
    const response = await fetch(`/api/products/${product.id}`, { method: "DELETE" });
    if (!response.ok) { setError("Unable to delete product."); setDeleting(false); return; }
    router.push("/dashboard/vendor/products");
    router.refresh();
  }

  return <form onSubmit={save} className="grid max-w-2xl gap-4 rounded-2xl border bg-white p-6 dark:bg-gray-900">
    <label>Name<input name="name" defaultValue={product.name} className="mt-1 w-full rounded border p-2" /></label>
    <label>Price<input name="price" type="number" defaultValue={product.price} className="mt-1 w-full rounded border p-2" /></label>
    <label>Stock<input name="stock" type="number" defaultValue={product.stock} className="mt-1 w-full rounded border p-2" /></label>
    <label>Status<select name="status" defaultValue={product.status} className="mt-1 w-full rounded border p-2"><option>ACTIVE</option><option>INACTIVE</option><option>SOLD_OUT</option></select></label>
    <section className="space-y-3 border-t pt-4"><div><h2 className="text-sm font-bold">Product images</h2><p className="text-xs text-gray-500">Upload up to {MAX_IMAGES} Cloudinary-hosted images, 5 MB each.</p></div><label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-blue-300 bg-blue-50 px-4 py-5 text-sm font-semibold text-blue-700 dark:bg-blue-950/30 dark:text-blue-300"><ImagePlus className="h-5 w-5" />{uploading ? "Uploading images..." : "Upload image"}<input type="file" accept="image/*" multiple disabled={uploading} className="sr-only" onChange={uploadImages} /></label>{images.length > 0 && <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{images.map((image, index) => <div key={image} className="relative aspect-[4/3] overflow-hidden rounded-lg border bg-gray-100"><Image src={image} alt={`Product image ${index + 1}`} fill className="object-cover" /><button type="button" onClick={() => setImages((current) => current.filter((_, imageIndex) => imageIndex !== index))} className="absolute right-2 top-2 rounded-full bg-white/90 p-1.5 text-red-600 shadow" aria-label={`Remove image ${index + 1}`}><Trash2 className="h-4 w-4" /></button></div>)}</div>}</section>
    {error && <p className="text-sm text-red-600">{error}</p>}<div className="flex gap-3"><button disabled={saving || uploading} className="rounded bg-blue-600 px-4 py-2 font-bold text-white disabled:opacity-60">{uploading ? "Uploading images..." : saving ? "Saving..." : "Save changes"}</button><button type="button" onClick={remove} disabled={deleting} className="rounded border border-red-300 px-4 py-2 font-bold text-red-700">{deleting ? "Deleting..." : "Delete listing"}</button></div>
  </form>;
}
