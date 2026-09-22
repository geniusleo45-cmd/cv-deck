"use client";

import { ChangeEvent, FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { FileUp, X } from "lucide-react";

const MAX_DOCUMENT_SIZE = 2 * 1024 * 1024;

function readDocument(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Unable to read the document."));
    reader.readAsDataURL(file);
  });
}

export function VerificationForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [document, setDocument] = useState<{ name: string; data: string } | null>(null);

  async function selectDocument(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!["application/pdf", "image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Upload a PDF, JPG, PNG, or WebP document.");
      return;
    }
    if (file.size > MAX_DOCUMENT_SIZE) {
      setError("The document must be 2 MB or smaller.");
      return;
    }
    try {
      setError("");
      setDocument({ name: file.name, data: await readDocument(file) });
    } catch {
      setError("The document could not be read. Please try again.");
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!document) {
      setError("Upload a verification document before submitting.");
      return;
    }
    setLoading(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/vendors/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documentType: form.get("documentType"), documentUrl: document.data }),
    });
    const result = await response.json();
    if (!response.ok) {
      setError(result.error || "Unable to submit verification.");
      setLoading(false);
      return;
    }
    setDocument(null);
    event.currentTarget.reset();
    router.refresh();
    setLoading(false);
  }

  return (
    <form onSubmit={submit} className="mt-6 grid gap-4 rounded-xl border p-5">
      <div><h2 className="font-bold">Submit verification document</h2><p className="mt-1 text-xs text-gray-500">We accept a PDF or clear image of your business document.</p></div>
      <label className="grid gap-1 text-sm font-semibold">Document type<select name="documentType" required className="rounded-lg border p-2 font-normal dark:bg-gray-800"><option value="">Choose a document</option><option>CAC registration</option><option>Government ID</option><option>Utility bill</option></select></label>
      <div className="grid gap-2"><p className="text-sm font-semibold">Upload your document</p><label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-blue-300 bg-blue-50 px-4 py-6 text-sm font-semibold text-blue-700 hover:bg-blue-100 dark:bg-blue-950/30 dark:text-blue-300"><FileUp className="h-5 w-5" />Choose a PDF or image<input type="file" accept="application/pdf,image/jpeg,image/png,image/webp" className="sr-only" onChange={selectDocument} /></label><p className="text-xs text-gray-500">PDF, JPG, PNG, or WebP · maximum 2 MB</p></div>
      {document && <div className="flex items-center justify-between gap-3 rounded-lg border bg-gray-50 p-3 text-sm dark:bg-gray-800"><span className="truncate font-medium">{document.name}</span><button type="button" onClick={() => setDocument(null)} className="rounded p-1 text-red-600 hover:bg-red-50" aria-label="Remove selected document"><X className="h-4 w-4" /></button></div>}
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button disabled={loading} className="w-fit rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-60">{loading ? "Submitting..." : "Submit for review"}</button>
    </form>
  );
}
