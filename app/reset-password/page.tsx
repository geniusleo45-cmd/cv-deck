import Link from "next/link";
import { RecoveryForm } from "@/components/account/RecoveryForm";
import { emailPreviewEnabled } from "@/lib/accountRecovery";
export const dynamic = "force-dynamic";
export const metadata = { title: "Reset password | CV Deck", robots: { index: false, follow: false }, referrer: "no-referrer" as const };
export default function ResetPasswordPage() {
  return <main className="mx-auto my-12 max-w-md space-y-6 rounded-2xl border p-6"><h1 className="text-2xl font-bold">Reset password</h1><RecoveryForm mode="reset" enabled={emailPreviewEnabled()} /><Link className="inline-block text-sm text-blue-600 underline" href="/forgot-password">Request another link</Link></main>;
}
