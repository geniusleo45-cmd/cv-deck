"use client";

import Image from "next/image";
import { ChangeEvent, FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, Plus, Trash2 } from "lucide-react";

type Specification = { key: string; value: string };

const MAX_IMAGES = 3;
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

type UploadSignature = {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  folder: string;
};

export function NewProductForm({ categories }: { categories: { id: string; name: string }[] }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [specifications, setSpecifications] = useState<Specification[]>([{ key: "", value: "" }]);

  async function handleImages(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    if (!files.length) return;
    if (images.length + files.length > MAX_IMAGES) {
      setError(`You can upload up to ${MAX_IMAGES} product images.`);
      return;
    }
    if (files.some((file) => !file.type.startsWith("image/"))) {
      setError("Please select image files only.");
      return;
    }
    if (files.some((file) => file.size > MAX_IMAGE_SIZE)) {
      setError("Each image must be 5 MB or smaller.");
      return;
    }
    try {
      setError("");
      setUploading(true);
      const signatureResponse = await fetch("/api/uploads/product-image-signature", { method: "POST" });
      const signatureData = await signatureResponse.json() as UploadSignature & { error?: string };
      if (!signatureResponse.ok) throw new Error(signatureData.error || "Unable to prepare your image upload.");

      const uploadedImages = await Promise.all(files.map(async (file) => {
        const uploadData = new FormData();
        uploadData.append("file", file);
        uploadData.append("api_key", signatureData.apiKey);
        uploadData.append("timestamp", String(signatureData.timestamp));
        uploadData.append("signature", signatureData.signature);
        uploadData.append("folder", signatureData.folder);
        const uploadResponse = await fetch(`https://api.cloudinary.com/v1_1/${signatureData.cloudName}/image/upload`, {
          method: "POST",
          body: uploadData,
        });
        const uploadResult = await uploadResponse.json() as { secure_url?: string; error?: { message?: string } };
        if (!uploadResponse.ok || !uploadResult.secure_url) {
          throw new Error(uploadResult.error?.message || "Cloudinary could not upload this image.");
        }
        return uploadResult.secure_url;
      }));
      setImages((current) => [...current, ...uploadedImages]);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "One or more images could not be uploaded. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  function updateSpecification(index: number, field: keyof Specification, value: string) {
    setSpecifications((current) => current.map((specification, specificationIndex) =>
      specificationIndex === index ? { ...specification, [field]: value } : specification,
    ));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const specs = Object.fromEntries(specifications.map(({ key, value }) => [key.trim(), value.trim()] as const).filter(([key, value]) => key && value));
    const response = await fetch("/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: form.get("name"), description: form.get("description"), price: Number(form.get("price")), stock: Number(form.get("stock")), categoryId: form.get("categoryId"), condition: form.get("condition"), locationZone: form.get("locationZone"), images, specs }),
    });
    const result = await response.json();
    if (!response.ok) {
      setError(result.error || "Unable to create product.");
      setSaving(false);
      return;
    }
    router.push("/dashboard/vendor/products");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="grid gap-5 rounded-2xl border bg-white p-6 dark:bg-gray-900 md:grid-cols-2">
      <label className="grid gap-1 text-sm font-semibold">Product name<input name="name" required minLength={3} className="rounded-lg border p-2 font-normal dark:bg-gray-800" /></label>
      <label className="grid gap-1 text-sm font-semibold">Category<select name="categoryId" required className="rounded-lg border p-2 font-normal dark:bg-gray-800"><option value="">Choose a category</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
      <label className="grid gap-1 text-sm font-semibold md:col-span-2">Description<textarea name="description" required minLength={10} rows={4} className="rounded-lg border p-2 font-normal dark:bg-gray-800" /></label>
      <label className="grid gap-1 text-sm font-semibold">Price (₦)<input name="price" type="number" min="1" required className="rounded-lg border p-2 font-normal dark:bg-gray-800" /></label>
      <label className="grid gap-1 text-sm font-semibold">Stock quantity<input name="stock" type="number" min="0" required className="rounded-lg border p-2 font-normal dark:bg-gray-800" /></label>
      <label className="grid gap-1 text-sm font-semibold">Condition<select name="condition" defaultValue="NEW" className="rounded-lg border p-2 font-normal dark:bg-gray-800"><option value="NEW">New</option><option value="REFURBISHED">Refurbished</option><option value="USED">Used</option></select></label>
      <label className="grid gap-1 text-sm font-semibold">Computer Village zone<input name="locationZone" defaultValue="Computer Village Ikeja" required className="rounded-lg border p-2 font-normal dark:bg-gray-800" /></label>

      <section className="grid gap-3 md:col-span-2" aria-labelledby="images-heading">
        <div><h2 id="images-heading" className="text-sm font-semibold">Upload your images</h2><p className="text-xs text-gray-500">Images are securely uploaded to Cloudinary. Add up to {MAX_IMAGES} images, up to 5 MB each.</p></div>
        <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-blue-300 bg-blue-50 px-4 py-6 text-sm font-semibold text-blue-700 transition hover:bg-blue-100 dark:bg-blue-950/30 dark:text-blue-300"><ImagePlus className="h-5 w-5" />{uploading ? "Uploading images..." : "Choose image files"}<input type="file" accept="image/*" multiple disabled={uploading} className="sr-only" onChange={handleImages} /></label>
        {images.length > 0 && <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{images.map((image, index) => <div key={image} className="relative aspect-[4/3] overflow-hidden rounded-lg border bg-gray-100"><Image src={image} alt={`Selected product image ${index + 1}`} fill unoptimized className="object-cover" /><button type="button" onClick={() => setImages((current) => current.filter((_, imageIndex) => imageIndex !== index))} className="absolute right-2 top-2 rounded-full bg-white/90 p-1.5 text-red-600 shadow hover:bg-white" aria-label={`Remove image ${index + 1}`}><Trash2 className="h-4 w-4" /></button></div>)}</div>}
      </section>

      <section className="grid gap-3 md:col-span-2" aria-labelledby="specifications-heading">
        <div className="flex items-center justify-between gap-3"><div><h2 id="specifications-heading" className="text-sm font-semibold">Product specifications</h2><p className="text-xs text-gray-500">Add each specification as a label and its value.</p></div><button type="button" onClick={() => setSpecifications((current) => [...current, { key: "", value: "" }])} className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-xs font-bold text-blue-700 hover:bg-blue-50 dark:text-blue-300"><Plus className="h-4 w-4" />Add specification</button></div>
        <div className="grid gap-2">{specifications.map((specification, index) => <div key={index} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] gap-2"><input value={specification.key} onChange={(event) => updateSpecification(index, "key", event.target.value)} placeholder="e.g. RAM" className="min-w-0 rounded-lg border p-2 text-sm dark:bg-gray-800" /><input value={specification.value} onChange={(event) => updateSpecification(index, "value", event.target.value)} placeholder="e.g. 16 GB" className="min-w-0 rounded-lg border p-2 text-sm dark:bg-gray-800" /><button type="button" disabled={specifications.length === 1} onClick={() => setSpecifications((current) => current.filter((_, specificationIndex) => specificationIndex !== index))} className="rounded-lg border px-2 text-red-600 disabled:cursor-not-allowed disabled:opacity-40" aria-label={`Remove specification ${index + 1}`}><Trash2 className="h-4 w-4" /></button></div>)}</div>
      </section>

      {error && <p className="text-sm text-red-600 md:col-span-2">{error}</p>}
      <div className="md:col-span-2"><button disabled={saving || uploading} className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60">{uploading ? "Uploading images..." : saving ? "Creating listing..." : "Create product listing"}</button></div>
    </form>
  );
}
