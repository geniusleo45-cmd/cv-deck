"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

const field = "mt-1 w-full min-w-0 rounded-xl border bg-white p-3 text-base font-normal dark:bg-gray-900";
const button = "rounded-xl bg-purple-700 px-4 py-3 text-sm font-bold text-white disabled:opacity-50";

export function OpportunityCreateForm({ kind }: { kind: "JOB" | "PROCUREMENT" }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const procurement = kind === "PROCUREMENT";
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const data = new FormData(event.currentTarget);
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/recruiter-opportunities", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
        kind, title: data.get("title"), description: data.get("description"), location: data.get("location"), terms: data.get("terms"),
        ...(procurement ? { quantity: Number(data.get("quantity")) } : {}),
        closesAt: new Date(`${data.get("closesAt")}T23:59:59.000Z`).toISOString(),
      }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to publish.");
      router.push(`/dashboard/opportunities/${result.id}`); router.refresh();
    } catch (error) { setError(error instanceof Error ? error.message : "Unable to publish."); }
    finally { setBusy(false); }
  }
  return <details className="rounded-2xl border bg-white p-5 dark:bg-gray-900">
    <summary className="cursor-pointer font-bold text-purple-700 dark:text-purple-300">{procurement ? "Create a procurement request" : "Post a job or technician project"}</summary>
    <form onSubmit={submit} className="mt-5 space-y-4">
      <p className="text-sm text-gray-500">Visible to signed-in CV Deck users. Only verified accounts can respond. Do not include private addresses or sensitive documents.</p>
      <label className="block text-sm font-semibold">{procurement ? "Product or equipment needed" : "Job / project title"}<input name="title" required minLength={5} maxLength={140} className={field} /></label>
      <label className="block text-sm font-semibold">{procurement ? "Specifications, delivery requirements and warranty expectations" : "Responsibilities, required skills and experience"}<textarea name="description" required minLength={30} maxLength={6000} rows={6} className={field} /></label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-semibold">{procurement ? "Delivery area" : "Work location / remote"}<input name="location" required minLength={2} maxLength={160} className={field} /></label>
        <label className="block text-sm font-semibold">Closing date (end of day UTC)<input name="closesAt" type="date" required className={field} /></label>
      </div>
      {procurement && <label className="block text-sm font-semibold">Total units required<input name="quantity" type="number" required min={1} max={1000000} step={1} className={field} /></label>}
      <label className="block text-sm font-semibold">{procurement ? "Budget and purchasing terms (optional)" : "Employment type, duration and compensation (optional)"}<textarea name="terms" rows={2} maxLength={500} className={field} /></label>
      <p role="alert" className="text-sm text-red-600">{error}</p>
      <button type="submit" disabled={busy} className={button}>{busy ? "Publishing…" : procurement ? "Publish request" : "Publish job"}</button>
    </form>
  </details>;
}

export function OpportunityResponseForm({ id, kind }: { id: string; kind: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const procurement = kind === "PROCUREMENT";
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || submitted) return;
    const data = new FormData(event.currentTarget);
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/recruiter-opportunities/${id}/responses`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: data.get("message"), ...(procurement ? { quoteAmount: Number(data.get("quoteAmount")) } : {}) }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to submit.");
      setSubmitted(true); router.refresh();
    } catch (error) { setError(error instanceof Error ? error.message : "Unable to submit."); }
    finally { setBusy(false); }
  }
  if (submitted) return <p role="status" className="rounded-xl border p-4 text-sm">Response submitted. The recruiter has been notified.</p>;
  return <form onSubmit={submit} className="space-y-4 rounded-2xl border p-5">
    <h2 className="text-lg font-bold">{procurement ? "Submit quotation" : "Apply for this opportunity"}</h2>
    <p className="text-sm text-gray-500">Your response is shared only with the recruiter. No payment is collected here.</p>
    <label className="block text-sm font-semibold">{procurement ? "Availability, specifications, delivery and quotation terms" : "Relevant experience, qualifications and availability"}<textarea name="message" required minLength={30} maxLength={4000} rows={5} className={field} /></label>
    {procurement && <label className="block text-sm font-semibold">Total quotation for all requested units (NGN)<input name="quoteAmount" type="number" required min="0.01" max="999999999" step="0.01" className={field} /></label>}
    <p role="alert" className="text-sm text-red-600">{error}</p>
    <button disabled={busy} className={button}>{busy ? "Submitting…" : procurement ? "Send quotation" : "Submit application"}</button>
  </form>;
}

export function OpportunityAction({ id, responseId, initialStatus }: { id: string; responseId?: string; initialStatus?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState(initialStatus === "SUBMITTED" ? "SHORTLISTED" : initialStatus || "SHORTLISTED");
  async function save() {
    if (busy) return;
    if (!responseId && !window.confirm("Close this opportunity to new responses? Existing responses remain available.")) return;
    setBusy(true); setMessage("");
    try {
      const response = await fetch(`/api/recruiter-opportunities/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(responseId ? { responseId, status } : { action: "close" }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to update.");
      setMessage("Updated."); router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to update."); }
    finally { setBusy(false); }
  }
  return <div className="space-y-2">
    <div className="flex flex-wrap gap-2">
      {responseId && <select aria-label="Response status" value={status} disabled={busy} onChange={(event) => setStatus(event.target.value)} className="min-w-0 rounded-lg border bg-white p-2 text-sm dark:bg-gray-900"><option value="SHORTLISTED">Shortlisted</option><option value="SELECTED">Selected</option><option value="DECLINED">Declined</option></select>}
      <button type="button" disabled={busy} onClick={save} className="rounded-lg border px-3 py-2 text-sm font-bold disabled:opacity-50">{busy ? "Saving…" : responseId ? "Update response" : "Close opportunity"}</button>
    </div>
    <p role="status" className="text-sm">{message}</p>
  </div>;
}
