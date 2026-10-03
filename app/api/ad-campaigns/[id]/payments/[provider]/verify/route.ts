import { NextResponse } from "next/server";
import { activateVerifiedPremiumListing } from "@/lib/adCampaignNotifications";
import { getCurrentUser } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

type Provider = "paystack" | "flutterwave";

function isProvider(value: string): value is Provider {
  return value === "paystack" || value === "flutterwave";
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; provider: string }> }
) {
  const user = await getCurrentUser();
  if (!user || user.role !== "VENDOR") {
    return NextResponse.json({ error: "Vendor access required." }, { status: 403 });
  }

  const { id, provider } = await params;
  if (!isProvider(provider)) {
    return NextResponse.json({ error: "Choose Paystack or Flutterwave." }, { status: 400 });
  }

  const input = await request.json().catch(() => null) as {
    reference?: unknown;
    txRef?: unknown;
    transactionId?: unknown;
  } | null;
  const reference = provider === "paystack" ? input?.reference : input?.txRef;
  if (typeof reference !== "string" || !reference) {
    return NextResponse.json({ error: "The payment reference is missing." }, { status: 400 });
  }

  const campaign = await prisma.adCampaign.findFirst({
    where: { id, vendor: { userId: user.id } },
    include: {
      vendor: { select: { userId: true } },
      product: { select: { name: true } },
    },
  });
  if (!campaign) {
    return NextResponse.json({ error: "Premium Listing not found." }, { status: 404 });
  }
  if (campaign.status === "ACTIVE") {
    return NextResponse.json({ campaign, alreadyActive: true });
  }
  if (campaign.status !== "PENDING_PAYMENT" || campaign.paymentReference !== reference || campaign.paymentProvider !== provider.toUpperCase()) {
    return NextResponse.json({ error: "This payment does not match the Premium Listing." }, { status: 400 });
  }

  let paid = false;
  if (provider === "paystack") {
    const secret = process.env.PAYSTACK_SECRET_KEY;
    if (!secret) return NextResponse.json({ error: "Payments are not configured yet." }, { status: 503 });
    const response = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: { Authorization: `Bearer ${secret}` },
    });
    const result = await response.json();
    paid = response.ok
      && result.status === true
      && result.data?.status === "success"
      && result.data?.reference === reference
      && result.data?.currency === "NGN"
      && result.data?.amount >= Math.round(campaign.amount * 100);
  } else {
    const transactionId = input?.transactionId;
    if (typeof transactionId !== "string" || !transactionId) {
      return NextResponse.json({ error: "Flutterwave did not return a transaction ID." }, { status: 400 });
    }
    const secret = process.env.FLW_SECRET_KEY;
    if (!secret) return NextResponse.json({ error: "Payments are not configured yet." }, { status: 503 });
    const response = await fetch(`https://api.flutterwave.com/v3/transactions/${encodeURIComponent(transactionId)}/verify`, {
      headers: { Authorization: `Bearer ${secret}` },
    });
    const result = await response.json();
    paid = response.ok
      && result.status === "success"
      && result.data?.status === "successful"
      && result.data?.tx_ref === reference
      && result.data?.currency === "NGN"
      && result.data?.amount >= campaign.amount;
  }

  if (!paid) {
    return NextResponse.json({ error: "Payment was not completed." }, { status: 400 });
  }

  const activation = await activateVerifiedPremiumListing(campaign, provider.toUpperCase() as "PAYSTACK" | "FLUTTERWAVE", reference);
  const activeCampaign = await prisma.adCampaign.findUnique({ where: { id: campaign.id } });
  if (activation === "product-already-promoted") {
    return NextResponse.json({ error: "Your payment was confirmed, but another Premium Listing is already active for this product. Please contact CV Deck support so we can resolve the placement." }, { status: 409 });
  }
  if (activation === "ineligible") {
    return NextResponse.json({ error: "Your payment was confirmed, but the product is no longer active and in stock. Please contact CV Deck support before it can be promoted." }, { status: 409 });
  }
  if (activation !== "activated" && activeCampaign?.status !== "ACTIVE") {
    return NextResponse.json({ error: "Your payment was confirmed, but the Premium Listing could not be finalized. Please contact CV Deck support." }, { status: 409 });
  }
  return NextResponse.json({ campaign: activeCampaign, alreadyActive: activation !== "activated" });
}
