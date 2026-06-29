import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { encrypt } from "@/lib/encryption";
import { sendPushNotificationToUser } from "@/lib/webPush";

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

  // Check if blocked
  const blocked = await prisma.blockedUser.findFirst({
    where: {
      OR: [
        { blockerId: senderId, blockedId: otherParticipant.userId },
        { blockerId: otherParticipant.userId, blockedId: senderId },
      ],
    },
  });

  if (blocked) {
    return NextResponse.json({ error: "Cannot send message to blocked user" }, { status: 403 });
  }

  // Check conversation disappearing mode
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
  });

  let expiresAt: Date | null = null;
  if (conversation?.disappearingMode && conversation.disappearingMode !== "off") {
    const now = new Date();
    if (conversation.disappearingMode === "24h") expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    else if (conversation.disappearingMode === "7d") expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    else if (conversation.disappearingMode === "30d") expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
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
      expiresAt,
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

  // Check receiver preference for auto-unarchive
  const receiverUser = await prisma.user.findUnique({
    where: { id: otherParticipant.userId },
    select: { keepArchived: true },
  });

  const updateParticipantData: { unreadCount: { increment: number }; isArchived?: boolean } = {
    unreadCount: { increment: 1 },
  };

  if (!receiverUser?.keepArchived) {
    updateParticipantData.isArchived = false;
  }

  // Increment unread count for receiver and conditionally unarchive
  await prisma.conversationParticipant.updateMany({
    where: { conversationId, userId: otherParticipant.userId },
    data: updateParticipantData,
  });

  // Trigger background Web Push delivery asynchronously without blocking response
  let pushBody = content;
  if (type === "IMAGE") pushBody = "📷 Photo";
  else if (type === "VIDEO") pushBody = "📹 Video";
  else if (type === "AUDIO") pushBody = "🎤 Voice message";
  else if (type === "FILE") pushBody = `📎 ${fileName || "Attachment"}`;

  sendPushNotificationToUser(otherParticipant.userId, {
    title: message.sender.displayName || message.sender.username || "New message",
    body: pushBody,
    icon: message.sender.image || "/icons/icon-192x192.png",
    url: `/chat/${conversationId}`,
    conversationId,
    messageId: message.id,
    senderName: message.sender.displayName || message.sender.username,
    senderAvatar: message.sender.image || undefined,
  }).catch((err) => console.error("[Messages API] Background push failed:", err));

  // Return decrypted message to client
  return NextResponse.json({
    message: {
      ...message,
      content, // Return plain text to sender
    },
  }, { status: 201 });
}
