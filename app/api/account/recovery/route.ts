import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { consumeAccountToken, consumeSchema, emailPreviewEnabled, issueAccountToken, localPreviewRequest, requestSchema } from "@/lib/accountRecovery";

const headers = { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" };
const unavailable = () => NextResponse.json({ error: "Email delivery is not configured yet. You can still sign in with your existing password." }, { status: 503, headers });

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401, headers });
  const account = await prisma.user.findUnique({ where: { id: user.id }, select: { emailVerifiedAt: true } });
  return NextResponse.json({ verified: Boolean(account?.emailVerifiedAt), previewEnabled: emailPreviewEnabled() }, { headers });
}

export async function POST(req: Request) {
  if (!localPreviewRequest(req)) return unavailable();
  const input = requestSchema.safeParse(await req.json().catch(() => null));
  if (!input.success) return NextResponse.json({ error: "Enter a valid request and email address." }, { status: 400, headers });
  try {
    const { purpose, email } = input.data;
    let userId: string | undefined;
    if (purpose === "VERIFY_EMAIL") {
      userId = (await getCurrentUser())?.id;
      if (!userId) return NextResponse.json({ error: "Please sign in." }, { status: 401, headers });
    } else {
      if (!email) return NextResponse.json({ error: "Enter your email address." }, { status: 400, headers });
      userId = (await prisma.user.findUnique({ where: { email }, select: { id: true } }))?.id;
    }
    const issued = userId ? await issueAccountToken(userId, purpose) : null;
    const preview = issued ? {
      to: issued.email,
      subject: purpose === "RESET_PASSWORD" ? "Reset your CV Deck password" : "Verify your CV Deck email",
      href: `${purpose === "RESET_PASSWORD" ? "/reset-password" : "/verify-email"}#token=${issued.token}`,
      expiresAt: issued.expiresAt.toISOString(),
    } : undefined;
    return NextResponse.json({ message: "If eligible, a local preview is available below. Wait 60 seconds before requesting another link. No email was sent.", preview }, { headers });
  } catch {
    return NextResponse.json({ error: "Unable to prepare the link. Please try again." }, { status: 500, headers });
  }
}

export async function PATCH(req: Request) {
  if (!localPreviewRequest(req)) return unavailable();
  const input = consumeSchema.safeParse(await req.json().catch(() => null));
  if (!input.success) return NextResponse.json({ error: "Use a valid link and a password of 12–72 characters (at most 72 UTF-8 bytes)." }, { status: 400, headers });
  try {
    if (!await consumeAccountToken(input.data)) return NextResponse.json({ error: "This link is invalid, expired or already used. Please request another." }, { status: 400, headers });
    return NextResponse.json({ message: input.data.purpose === "RESET_PASSWORD" ? "Password updated. Sign in again with your new password." : "Email verified. This does not change your business verification status." }, { headers });
  } catch {
    return NextResponse.json({ error: "Unable to complete this request. Please try again." }, { status: 500, headers });
  }
}
