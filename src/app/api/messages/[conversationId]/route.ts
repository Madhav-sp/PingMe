import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { decrypt } from "@/lib/encryption";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as Record<string, unknown>).id as string;
  const { conversationId } = await params;
  const cursor = req.nextUrl.searchParams.get("cursor");
  const limit = parseInt(req.nextUrl.searchParams.get("limit") || "30");

  // Verify participant
  const participant = await prisma.conversationParticipant.findFirst({
    where: { conversationId, userId },
  });

  if (!participant) {
    return NextResponse.json({ error: "Not a participant" }, { status: 403 });
  }

  const rawMessages = await prisma.message.findMany({
    where: {
      conversationId,
    },
    ...(cursor && {
      cursor: { id: cursor },
      skip: 1,
    }),
    take: limit + 15, // Fetch extra buffer in case some are filtered out
    orderBy: { createdAt: "desc" },
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
          sender: {
            select: { displayName: true },
          },
        },
      },
      reactions: true,
    },
  });

  const now = new Date();

  // Asynchronously clean up expired messages in background
  const expiredIds = rawMessages
    .filter((msg) => msg.expiresAt && msg.expiresAt <= now)
    .map((msg) => msg.id);

  if (expiredIds.length > 0) {
    prisma.message.deleteMany({ where: { id: { in: expiredIds } } }).catch(console.error);
  }

  // Filter out deleted, cleared, or expired messages safely in JS
  const validMessages = rawMessages.filter(
    (msg) =>
      (!msg.deletedForAll || msg.senderId === userId) &&
      !(msg.deletedForIds || []).includes(userId) &&
      (!msg.expiresAt || msg.expiresAt > now) &&
      (!participant.clearedHistoryAt || msg.createdAt > participant.clearedHistoryAt)
  );

  const hasMore = validMessages.length > limit;
  const data = hasMore ? validMessages.slice(0, limit) : validMessages;

  // Decrypt messages
  const decryptedMessages = data
    .map((msg) => {
      let content = msg.content;
      if (msg.contentIv) {
        try {
          content = decrypt(msg.content, msg.contentIv, conversationId);
        } catch {
          content = "[Encrypted message]";
        }
      }

      let replyContent: string | undefined;
      if (msg.replyTo?.contentIv) {
        try {
          replyContent = decrypt(msg.replyTo.content, msg.replyTo.contentIv, msg.replyTo.conversationId);
        } catch {
          replyContent = "[Encrypted message]";
        }
      }

      return {
        ...msg,
        content,
        deletedForIds: undefined,
        replyTo: msg.replyTo
          ? {
              ...msg.replyTo,
              content: replyContent || msg.replyTo.content,
              contentIv: undefined,
            }
          : null,
        contentIv: undefined,
      };
    })
    .reverse(); // Reverse to show oldest first

  // Reset unread count and mark received messages as READ
  await Promise.all([
    prisma.conversationParticipant.updateMany({
      where: { conversationId, userId },
      data: { unreadCount: 0, lastReadAt: new Date() },
    }),
    prisma.message.updateMany({
      where: {
        conversationId,
        receiverId: userId,
        status: { not: "READ" },
      },
      data: { status: "READ" },
    }),
  ]);

  return NextResponse.json({
    data: decryptedMessages,
    nextCursor: hasMore ? data[data.length - 1].id : null,
    hasMore,
  });
}
