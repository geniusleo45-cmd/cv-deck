import { NextResponse } from "next/server";

// Disabled in every environment. Use provider sandbox checkout for testing.
export async function POST() {
  return NextResponse.json(
    { error: "Mock payments are disabled. Use Paystack or Flutterwave checkout." },
    { status: 410 }
  );
}
