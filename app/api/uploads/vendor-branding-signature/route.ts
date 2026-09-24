import { createHash } from "crypto";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/rbac";

export async function POST() {
  const user = await getCurrentUser();
  if (!user || (user.role !== "VENDOR" && user.role !== "ADMIN")) return NextResponse.json({ error: "Vendor access required." }, { status: 403 });
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) return NextResponse.json({ error: "Cloudinary is not configured." }, { status: 503 });
  const folder = `cv-deck/vendors/${user.id}`;
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = createHash("sha1").update(`folder=${folder}&timestamp=${timestamp}${apiSecret}`).digest("hex");
  return NextResponse.json({ cloudName, apiKey, timestamp, signature, folder });
}
