import { createHash } from "crypto";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/rbac";

const FOLDER = "cv-deck/products";

export async function POST() {
  const user = await getCurrentUser();
  if (!user || (user.role !== "VENDOR" && user.role !== "ADMIN")) {
    return NextResponse.json({ error: "Only vendors can upload product images." }, { status: 403 });
  }

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    return NextResponse.json(
      { error: "Cloudinary is not configured. Add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET." },
      { status: 503 },
    );
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const signature = createHash("sha1")
    .update(`folder=${FOLDER}&timestamp=${timestamp}${apiSecret}`)
    .digest("hex");

  return NextResponse.json({ cloudName, apiKey, timestamp, signature, folder: FOLDER });
}
