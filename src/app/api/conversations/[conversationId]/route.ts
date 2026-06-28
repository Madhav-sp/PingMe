import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as Record<string, unknown>).id as string;
  const { conversationId } = await params;
  const { searchParams } = new URL(req.url);
  const deleteType = searchParams.get("type") || "forMe"; // "forMe" | "permanent"

  // Check if user is part of the conversation
  const participant = await prisma.conversationParticipant.findUnique({
    where: {
      userId_conversationId: {
        userId,
        conversationId,
      },
    },
  });

  if (!participant) {
    return NextResponse.json({ error: "Conversation not found or unauthorized" }, { status: 404 });
  }

  if (deleteType === "permanent") {
    // Delete conversation permanently (cascades to participants and messages)
    await prisma.conversation.delete({
      where: { id: conversationId },
    });
    return NextResponse.json({ success: true, type: "permanent" });
  }

  // "Delete for me": Set clearedHistoryAt and reset unread count
  const now = new Date();
  await prisma.conversationParticipant.update({
    where: {
      userId_conversationId: {
        userId,
        conversationId,
      },
    },
    data: {
      clearedHistoryAt: now,
      unreadCount: 0,
      isArchived: false,
    },
  });

  // Push userId into deletedForIds of existing messages so they don't appear for this user
  await prisma.message.updateMany({
    where: { conversationId },
    data: {
      deletedForIds: {
        push: userId,
      },
    },
  });

  return NextResponse.json({ success: true, type: "forMe", clearedAt: now });
}
