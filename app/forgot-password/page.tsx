import Link from "next/link";
import { RecoveryForm } from "@/components/account/RecoveryForm";
import { emailPreviewEnabled } from "@/lib/accountRecovery";
export const dynamic = "force-dynamic";
export const metadata = { title: "Forgot password | CV Deck", robots: { index: false, follow: false }, referrer: "no-referrer" as const };
export default function ForgotPasswordPage() {
  return <main className="mx-auto my-12 max-w-md space-y-6 rounded-2xl border p-6"><h1 className="text-2xl font-bold">Forgot password?</h1><p className="text-sm">Request a secure, single-use password reset link.</p><RecoveryForm mode="request" enabled={emailPreviewEnabled()} /><Link className="inline-block text-sm text-blue-600 underline" href="/login">Back to sign in</Link></main>;
}
