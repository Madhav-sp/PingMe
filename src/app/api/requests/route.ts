import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

// Send a chat request or list requests
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const senderId = (session.user as Record<string, unknown>).id as string;
  const body = await req.json();
  const { receiverId, message } = body;

  if (!receiverId) {
    return NextResponse.json({ error: "Receiver ID is required" }, { status: 400 });
  }

  if (senderId === receiverId) {
    return NextResponse.json({ error: "Cannot send request to yourself" }, { status: 400 });
  }

  // Check if blocked
  const blocked = await prisma.blockedUser.findFirst({
    where: {
      OR: [
        { blockerId: senderId, blockedId: receiverId },
        { blockerId: receiverId, blockedId: senderId },
      ],
    },
  });
  if (blocked) {
    return NextResponse.json({ error: "Cannot send request" }, { status: 403 });
  }

  // Check if already connected (conversation exists)
  const existingConvo = await prisma.conversation.findFirst({
    where: {
      AND: [
        { participants: { some: { userId: senderId } } },
        { participants: { some: { userId: receiverId } } },
      ],
    },
  });
  if (existingConvo) {
    return NextResponse.json(
      { success: true, alreadyConnected: true, conversationId: existingConvo.id },
      { status: 200 }
    );
  }

  // Check if request already exists
  const existingRequest = await prisma.chatRequest.findFirst({
    where: {
      OR: [
        { senderId, receiverId },
        { senderId: receiverId, receiverId: senderId },
      ],
    },
  });

  if (existingRequest) {
    if (existingRequest.status === "PENDING") {
      // If they sent us a request, auto-accept
      if (existingRequest.senderId === receiverId) {
        const conversation = await prisma.conversation.create({
          data: {
            participants: {
              create: [
                { userId: senderId },
                { userId: receiverId },
              ],
            },
          },
        });

        await prisma.chatRequest.update({
          where: { id: existingRequest.id },
          data: { status: "ACCEPTED" },
        });

        // Create notification
        await prisma.notification.create({
          data: {
            userId: receiverId,
            type: "REQUEST_ACCEPTED",
            title: "Request accepted",
            body: `${(session.user as Record<string, unknown>).displayName || session.user.name} accepted your message request`,
            data: { conversationId: conversation.id },
          },
        });

        return NextResponse.json({ conversationId: conversation.id, autoAccepted: true }, { status: 201 });
      }
      return NextResponse.json({ error: "Request already sent" }, { status: 409 });
    }
    if (existingRequest.status === "REJECTED") {
      // Allow re-sending after rejection
      await prisma.chatRequest.update({
        where: { id: existingRequest.id },
        data: { status: "PENDING", message, senderId, receiverId },
      });
      return NextResponse.json({ request: existingRequest }, { status: 201 });
    }
  }

  const request = await prisma.chatRequest.create({
    data: {
      senderId,
      receiverId,
      message,
    },
  });

  // Create notification for receiver
  await prisma.notification.create({
    data: {
      userId: receiverId,
      type: "MESSAGE_REQUEST",
      title: "New message request",
      body: `${(session.user as Record<string, unknown>).displayName || session.user.name} wants to chat with you`,
      data: { requestId: request.id },
    },
  });

  return NextResponse.json({ request }, { status: 201 });
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as Record<string, unknown>).id as string;
  const type = req.nextUrl.searchParams.get("type") || "received";
  const status = req.nextUrl.searchParams.get("status") || "PENDING";

  const where = type === "sent"
    ? { senderId: userId, status }
    : { receiverId: userId, status };

  const requests = await prisma.chatRequest.findMany({
    where,
    include: {
      sender: {
        select: {
          id: true,
          username: true,
          displayName: true,
          image: true,
          bio: true,
          isOnline: true,
          lastSeen: true,
          createdAt: true,
        },
      },
      receiver: {
        select: {
          id: true,
          username: true,
          displayName: true,
          image: true,
          bio: true,
          isOnline: true,
          lastSeen: true,
          createdAt: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ requests });
}
