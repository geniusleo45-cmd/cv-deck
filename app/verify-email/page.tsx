import { RecoveryForm } from "@/components/account/RecoveryForm";
import { emailPreviewEnabled } from "@/lib/accountRecovery";
export const dynamic = "force-dynamic";
export const metadata = { title: "Verify email | CV Deck", robots: { index: false, follow: false }, referrer: "no-referrer" as const };
export default function VerifyEmailPage() {
  return <main className="mx-auto my-12 max-w-md space-y-6 rounded-2xl border p-6"><h1 className="text-2xl font-bold">Verify your email</h1><p className="text-sm">Confirm below to verify the email address linked to this request.</p><RecoveryForm mode="verify" enabled={emailPreviewEnabled()} /></main>;
}
