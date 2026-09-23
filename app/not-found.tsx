import Link from "next/link";
import { SearchX } from "lucide-react";
export default function NotFound() { return <main className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center p-6 text-center"><SearchX className="h-12 w-12 text-blue-600" /><h1 className="mt-5 text-2xl font-black">Page not found</h1><p className="mt-2 text-sm text-gray-500">The page or marketplace listing you requested is unavailable.</p><Link href="/dashboard/marketplace" className="mt-6 rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white">Browse marketplace</Link></main>; }
