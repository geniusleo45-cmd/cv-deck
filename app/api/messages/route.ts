import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { sendMessageSchema } from "@/lib/validations/message";

export async function GET() {
  try {
    const sessionUser = await getCurrentUser();
    if (!sessionUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find conversations where sessionUser is either sender or receiver of messages
    const conversations = await prisma.conversation.findMany({
      where: {
        messages: {
          some: {
            OR: [
              { senderId: sessionUser.id },
              { receiverId: sessionUser.id },
            ],
          },
        },
      },
      include: {
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          include: {
            sender: { select: { id: true, name: true, avatar: true, role: true } },
            receiver: { select: { id: true, name: true, avatar: true, role: true } },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json(conversations);
  } catch (error) {
    console.error("Messages GET Error:", error);
    return NextResponse.json({ error: "Failed to fetch conversations" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const sessionUser = await getCurrentUser();
    if (!sessionUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const validated = sendMessageSchema.parse(body);

    if (validated.receiverId === sessionUser.id) {
      return NextResponse.json({ error: "Cannot message yourself" }, { status: 400 });
    }

    // Check if conversation already exists between these 2 users
    let conversation = await prisma.conversation.findFirst({
      where: {
        messages: {
          some: {
            OR: [
              { senderId: sessionUser.id, receiverId: validated.receiverId },
              { senderId: validated.receiverId, receiverId: sessionUser.id },
            ],
          },
        },
      },
    });

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          subject: validated.subject || "Inquiry on Computer Village Marketplace",
        },
      });
    }

    const message = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        senderId: sessionUser.id,
        receiverId: validated.receiverId,
        content: validated.content,
      },
      include: {
        sender: { select: { id: true, name: true, avatar: true } },
        receiver: { select: { id: true, name: true, avatar: true } },
      },
    });

    // Notify receiver
    await prisma.notification.create({
      data: {
        userId: validated.receiverId,
        type: "MESSAGE",
        title: `New message from ${sessionUser.name || "a user"}`,
        message: validated.content.slice(0, 80) + (validated.content.length > 80 ? "..." : ""),
        link: `/dashboard/messages?conversationId=${conversation.id}`,
      },
    });

    return NextResponse.json(message, { status: 201 });
  } catch (error: any) {
    if (error.name === "ZodError") {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    console.error("Messages POST Error:", error);
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
  }
}
