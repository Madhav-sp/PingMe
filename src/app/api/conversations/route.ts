import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { decrypt } from "@/lib/encryption";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as Record<string, unknown>).id as string;

  const participations = await prisma.conversationParticipant.findMany({
    where: { userId },
    include: {
      conversation: {
        include: {
          participants: {
            where: { userId: { not: userId } },
            include: {
              user: {
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
          },
          messages: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: {
              content: true,
              contentIv: true,
              type: true,
              senderId: true,
              createdAt: true,
              conversationId: true,
            },
          },
        },
      },
    },
    orderBy: {
      conversation: { lastMessageAt: "desc" },
    },
  });

  const conversations = participations.map((p) => {
    const otherParticipant = p.conversation.participants[0];
    const lastMsg = p.conversation.messages[0];
    let lastMessagePreview = p.conversation.lastMessage;

    if (lastMsg && lastMsg.contentIv) {
      try {
        const decrypted = decrypt(lastMsg.content, lastMsg.contentIv, lastMsg.conversationId);
        lastMessagePreview = decrypted.length > 50 ? decrypted.slice(0, 50) + "..." : decrypted;
      } catch {
        lastMessagePreview = "[Encrypted message]";
      }
    }

    if (lastMsg?.type !== "TEXT") {
      const typeLabels: Record<string, string> = {
        IMAGE: "📷 Photo",
        FILE: "📎 File",
        VOICE: "🎤 Voice message",
        GIF: "GIF",
      };
      lastMessagePreview = typeLabels[lastMsg?.type || "TEXT"] || lastMessagePreview;
    }

    return {
      id: p.conversation.id,
      lastMessage: lastMessagePreview,
      lastMessageAt: p.conversation.lastMessageAt,
      createdAt: p.conversation.createdAt,
      updatedAt: p.conversation.updatedAt,
      participant: otherParticipant?.user || null,
      unreadCount: p.unreadCount,
    };
  });

  return NextResponse.json({ conversations });
}
