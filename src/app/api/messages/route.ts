import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { encrypt } from "@/lib/encryption";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const senderId = (session.user as Record<string, unknown>).id as string;
  const body = await req.json();
  const { content, conversationId, type = "TEXT", replyToId, fileUrl, fileName, fileSize } = body;

  if (!content || !conversationId) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  // Verify user is a participant
  const participant = await prisma.conversationParticipant.findFirst({
    where: { conversationId, userId: senderId },
  });

  if (!participant) {
    return NextResponse.json({ error: "Not a participant" }, { status: 403 });
  }

  // Get receiver
  const otherParticipant = await prisma.conversationParticipant.findFirst({
    where: { conversationId, userId: { not: senderId } },
  });

  if (!otherParticipant) {
    return NextResponse.json({ error: "Conversation invalid" }, { status: 400 });
  }

  // Encrypt message content
  const { ciphertext, iv } = encrypt(content, conversationId);

  const message = await prisma.message.create({
    data: {
      conversationId,
      senderId,
      receiverId: otherParticipant.userId,
      content: ciphertext,
      contentIv: iv,
      type,
      replyToId,
      fileUrl,
      fileName,
      fileSize,
      status: "SENT",
    },
    include: {
      sender: {
        select: {
          id: true,
          username: true,
          displayName: true,
          image: true,
        },
      },
      replyTo: {
        select: {
          id: true,
          content: true,
          contentIv: true,
          senderId: true,
          conversationId: true,
        },
      },
    },
  });

  // Update conversation last message
  await prisma.conversation.update({
    where: { id: conversationId },
    data: {
      lastMessage: ciphertext,
      lastMessageAt: new Date(),
    },
  });

  // Increment unread count for receiver
  await prisma.conversationParticipant.updateMany({
    where: { conversationId, userId: otherParticipant.userId },
    data: { unreadCount: { increment: 1 } },
  });

  // Return decrypted message to client
  return NextResponse.json({
    message: {
      ...message,
      content, // Return plain text to sender
    },
  }, { status: 201 });
}
