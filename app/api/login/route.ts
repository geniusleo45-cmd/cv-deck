import { NextResponse } from "next/server";

// The app signs in through NextAuth. This legacy endpoint only checked a password
// without creating a session, duplicating the credential-checking surface.
export async function POST() {
  return NextResponse.json(
    { error: "This login endpoint is retired. Please sign in through /login." },
    { status: 410, headers: { "Cache-Control": "no-store" } }
  );
}
