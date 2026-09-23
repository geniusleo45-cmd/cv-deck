import { Loader2 } from "lucide-react";
export default function Loading() { return <div className="flex min-h-80 flex-col items-center justify-center gap-3 text-gray-500"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /><p className="text-sm font-semibold">Loading your CV Deck workspace...</p></div>; }
