"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return <main className="min-h-screen bg-gray-50 p-6 text-gray-900"><div className="mx-auto flex min-h-[80vh] max-w-md flex-col items-center justify-center text-center"><AlertTriangle className="h-12 w-12 text-amber-500" /><h1 className="mt-5 text-2xl font-black">Something went wrong</h1><p className="mt-2 text-sm text-gray-500">We could not load this part of CV Deck. Please try again.</p><div className="mt-6 flex gap-3"><button onClick={reset} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white"><RefreshCw className="h-4 w-4" /> Try again</button><Link href="/" className="rounded-lg border px-4 py-2 text-sm font-bold">Home</Link></div></div></main>;
}
