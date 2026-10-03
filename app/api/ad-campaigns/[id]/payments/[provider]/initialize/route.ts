import { NextResponse } from "next/server";
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

  const campaign = await prisma.adCampaign.findFirst({
    where: { id, vendor: { userId: user.id } },
    include: {
      vendor: {
        include: { user: { select: { email: true, name: true, phone: true } } },
      },
      product: { select: { id: true, name: true, status: true, stock: true } },
    },
  });

  if (!campaign) {
    return NextResponse.json({ error: "Premium Listing not found." }, { status: 404 });
  }
  if (campaign.vendor.status !== "VERIFIED") {
    return NextResponse.json({ error: "Your shop must be verified before purchasing Premium Listings." }, { status: 403 });
  }
  if (campaign.status === "ACTIVE") {
    return NextResponse.json({ error: "This Premium Listing is already active." }, { status: 409 });
  }
  if (campaign.status !== "PENDING_PAYMENT") {
    return NextResponse.json({ error: "This Premium Listing can no longer be paid for." }, { status: 409 });
  }
  if (campaign.product.status !== "ACTIVE" || campaign.product.stock < 1) {
    return NextResponse.json({ error: "The promoted product must remain active and in stock." }, { status: 409 });
  }

  const now = new Date();
  await prisma.adCampaign.updateMany({
    where: { productId: campaign.product.id, status: "ACTIVE", endsAt: { lte: now } },
    data: { status: "EXPIRED", authorizationUrl: null },
  });
  const existingActive = await prisma.adCampaign.findFirst({
    where: { productId: campaign.product.id, status: "ACTIVE", endsAt: { gt: now } },
    select: { id: true },
  });
  if (existingActive) {
    return NextResponse.json({ error: "This product already has an active Premium Listing." }, { status: 409 });
  }

  const providerName = provider.toUpperCase();
  if (campaign.paymentReference) {
    if (campaign.paymentProvider === providerName && campaign.authorizationUrl) {
      return NextResponse.json({ authorizationUrl: campaign.authorizationUrl });
    }
    if (campaign.paymentProvider === providerName) {
      return NextResponse.json({ error: "Your payment checkout is being prepared. Please try again in a moment." }, { status: 409 });
    }
    return NextResponse.json({ error: `This Premium Listing already has a ${campaign.paymentProvider === "PAYSTACK" ? "Paystack" : "Flutterwave"} checkout. Resume that checkout to keep its payment reference secure.` }, { status: 409 });
  }

  const gatewaySecret = provider === "paystack" ? process.env.PAYSTACK_SECRET_KEY : process.env.FLW_SECRET_KEY;
  if (!gatewaySecret) {
    return NextResponse.json({ error: provider === "paystack" ? "Payments are not configured yet. Add PAYSTACK_SECRET_KEY to enable Paystack." : "Payments are not configured yet. Add FLW_SECRET_KEY to enable Flutterwave." }, { status: 503 });
  }

  const reference = `cvdeck-ad-${campaign.id}-${Date.now()}`;
  const reserved = await prisma.adCampaign.updateMany({
    where: {
      id: campaign.id,
      status: "PENDING_PAYMENT",
      paymentProvider: null,
      paymentReference: null,
    },
    data: { paymentProvider: providerName, paymentReference: reference },
  });

  if (!reserved.count) {
    const latestCampaign = await prisma.adCampaign.findUnique({
      where: { id: campaign.id },
      select: { status: true, paymentProvider: true, authorizationUrl: true },
    });
    if (latestCampaign?.status === "ACTIVE") {
      return NextResponse.json({ error: "This Premium Listing is already active." }, { status: 409 });
    }
    if (latestCampaign?.paymentProvider === providerName && latestCampaign.authorizationUrl) {
      return NextResponse.json({ authorizationUrl: latestCampaign.authorizationUrl });
    }
    return NextResponse.json({ error: "A payment checkout is already being prepared for this Premium Listing. Please try again in a moment." }, { status: 409 });
  }

  const callbackUrl = new URL("/dashboard/vendor/advertise/callback", request.url);
  callbackUrl.searchParams.set("provider", provider);
  callbackUrl.searchParams.set("campaignId", campaign.id);

  if (provider === "paystack") {
    let response: Response;
    let result: { status?: boolean; message?: string; data?: { authorization_url?: string } };
    try {
      response = await fetch("https://api.paystack.co/transaction/initialize", {
        method: "POST",
        headers: { Authorization: `Bearer ${gatewaySecret}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          email: campaign.vendor.user.email,
          amount: Math.round(campaign.amount * 100),
          currency: "NGN",
          reference,
          callback_url: callbackUrl.toString(),
          metadata: {
            campaignId: campaign.id,
            productId: campaign.product.id,
            purpose: "premium_listing",
            vendorName: campaign.vendor.user.name || undefined,
            phone: campaign.vendor.user.phone || undefined,
          },
        }),
      });
      result = await response.json().catch(() => ({}));
    } catch {
      await prisma.adCampaign.updateMany({ where: { id: campaign.id, paymentProvider: providerName, paymentReference: reference, status: "PENDING_PAYMENT" }, data: { paymentProvider: null, paymentReference: null, authorizationUrl: null } });
      return NextResponse.json({ error: "Unable to reach Paystack. Please try again." }, { status: 502 });
    }
    if (!response.ok || !result.status || !result.data?.authorization_url) {
      await prisma.adCampaign.updateMany({ where: { id: campaign.id, paymentProvider: providerName, paymentReference: reference, status: "PENDING_PAYMENT" }, data: { paymentProvider: null, paymentReference: null, authorizationUrl: null } });
      return NextResponse.json({ error: result.message || "Unable to start Paystack payment." }, { status: 502 });
    }

    await prisma.adCampaign.updateMany({
      where: { id: campaign.id, paymentProvider: providerName, paymentReference: reference, status: "PENDING_PAYMENT" },
      data: {
        authorizationUrl: result.data.authorization_url,
      },
    });
    return NextResponse.json({ authorizationUrl: result.data.authorization_url });
  }

  let response: Response;
  let result: { status?: string; message?: string; data?: { link?: string } };
  try {
    response = await fetch("https://api.flutterwave.com/v3/payments", {
      method: "POST",
      headers: { Authorization: `Bearer ${gatewaySecret}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        tx_ref: reference,
        amount: campaign.amount,
        currency: "NGN",
        redirect_url: callbackUrl.toString(),
        payment_options: "card, ussd, banktransfer, account, internetbanking, nqr, enaira, opay",
        customer: {
          email: campaign.vendor.user.email,
          name: campaign.vendor.user.name || undefined,
          phonenumber: campaign.vendor.user.phone || undefined,
        },
        customizations: {
          title: "CV Deck Premium Listing",
          description: `Promote ${campaign.product.name}`,
        },
        meta: { campaignId: campaign.id, productId: campaign.product.id, purpose: "premium_listing" },
      }),
    });
    result = await response.json().catch(() => ({}));
  } catch {
    await prisma.adCampaign.updateMany({ where: { id: campaign.id, paymentProvider: providerName, paymentReference: reference, status: "PENDING_PAYMENT" }, data: { paymentProvider: null, paymentReference: null, authorizationUrl: null } });
    return NextResponse.json({ error: "Unable to reach Flutterwave. Please try again." }, { status: 502 });
  }
  if (!response.ok || result.status !== "success" || !result.data?.link) {
    await prisma.adCampaign.updateMany({ where: { id: campaign.id, paymentProvider: providerName, paymentReference: reference, status: "PENDING_PAYMENT" }, data: { paymentProvider: null, paymentReference: null, authorizationUrl: null } });
    return NextResponse.json({ error: result.message || "Unable to start Flutterwave payment." }, { status: 502 });
  }

  await prisma.adCampaign.updateMany({
    where: { id: campaign.id, paymentProvider: providerName, paymentReference: reference, status: "PENDING_PAYMENT" },
    data: {
      authorizationUrl: result.data.link,
    },
  });
  return NextResponse.json({ authorizationUrl: result.data.link });
}
