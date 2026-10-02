import { randomUUID } from "crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const VISITOR_COOKIE = "cvdeck_ad_visitor";
const EVENT_TYPES = new Set(["IMPRESSION", "CLICK"]);

function utcDay(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }

  const input = await request.json().catch(() => null) as { type?: unknown } | null;
  if (typeof input?.type !== "string" || !EVENT_TYPES.has(input.type)) {
    return NextResponse.json({ error: "Invalid campaign event." }, { status: 400 });
  }
  const eventType = input.type as "IMPRESSION" | "CLICK";

  const { id } = await params;
  const now = new Date();
  const campaign = await prisma.adCampaign.findFirst({
    where: {
      id,
      status: "ACTIVE",
      startsAt: { lte: now },
      endsAt: { gt: now },
      product: {
        status: "ACTIVE",
        stock: { gt: 0 },
        vendor: { status: "VERIFIED" },
      },
    },
    select: { id: true },
  });

  if (!campaign) {
    return NextResponse.json({ recorded: false });
  }

  const cookieStore = await cookies();
  const existingVisitorId = cookieStore.get(VISITOR_COOKIE)?.value;
  const visitorId = existingVisitorId && /^[a-f0-9-]{36}$/i.test(existingVisitorId)
    ? existingVisitorId
    : randomUUID();
  const shouldSetVisitorCookie = visitorId !== existingVisitorId;

  try {
    await prisma.adCampaignEvent.upsert({
      where: {
        campaignId_type_visitorId_day: {
          campaignId: campaign.id,
          type: eventType,
          visitorId,
          day: utcDay(now),
        },
      },
      create: {
        campaignId: campaign.id,
        type: eventType,
        visitorId,
        day: utcDay(now),
      },
      update: {},
    });
  } catch (error) {
    console.error("Premium Listing event tracking failed:", error);
    return NextResponse.json({ recorded: false }, { status: 500 });
  }

  const response = NextResponse.json({ recorded: true });
  if (shouldSetVisitorCookie) {
    response.cookies.set({
      name: VISITOR_COOKIE,
      value: visitorId,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
  }
  return response;
}
