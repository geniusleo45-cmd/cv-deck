import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { sendMessageSchema } from "@/lib/validations/message";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    const sessionUser = await getCurrentUser();
    if (!sessionUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { conversationId } = await params;

    const messages = await prisma.message.findMany({
      where: { conversationId, OR: [{ senderId: sessionUser.id }, { receiverId: sessionUser.id }] },
      include: {
        sender: { select: { id: true, name: true, avatar: true, role: true } },
        receiver: { select: { id: true, name: true, avatar: true, role: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    // Mark unread messages received by sessionUser as read
    await prisma.message.updateMany({
      where: {
        conversationId,
        receiverId: sessionUser.id,
        read: false,
      },
      data: { read: true },
    });

    return NextResponse.json(messages);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch thread messages" }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    const sessionUser = await getCurrentUser();
    if (!sessionUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { conversationId } = await params;
    const input = sendMessageSchema.safeParse(await req.json().catch(() => null));
    if (!input.success) return NextResponse.json({ error: "A valid recipient and message of 1–2000 characters are required." }, { status: 400 });
    const { content, receiverId } = input.data;

    // The first message defines the original two-person thread. Merely appearing
    // in any later message must not grant permission to add a third participant.
    const first = await prisma.message.findFirst({ where: { conversationId }, orderBy: [{ createdAt: "asc" }, { id: "asc" }], select: { senderId: true, receiverId: true } });
    const recipient = first?.senderId === sessionUser.id ? first.receiverId : first?.receiverId === sessionUser.id ? first.senderId : null;
    if (!recipient || receiverId !== recipient || receiverId === sessionUser.id) return NextResponse.json({ error: "You cannot send messages to this recipient in this conversation." }, { status: 403 });

    const message = await prisma.message.create({
      data: {
        conversationId,
        senderId: sessionUser.id,
        receiverId,
        content,
      },
      include: {
        sender: { select: { id: true, name: true, avatar: true } },
      },
    });

    await Promise.all([
      prisma.conversation.update({ where: { id: conversationId }, data: { updatedAt: new Date() } }),
      prisma.notification.create({
        data: {
          userId: receiverId,
          type: "MESSAGE",
          title: `New message from ${sessionUser.name || "a CV Deck user"}`,
          message: content.slice(0, 80) + (content.length > 80 ? "..." : ""),
          link: `/dashboard/messages?conversationId=${conversationId}`,
        },
      }),
    ]);

    return NextResponse.json(message, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to send reply" }, { status: 500 });
  }
}
