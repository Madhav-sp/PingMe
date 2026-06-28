import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as Record<string, unknown>).id as string;
  const { conversationId } = await params;
  const body = await req.json();
  const { isArchived, conversationIds, keepArchived } = body;

  // If updating user preference for auto-unarchive
  if (typeof keepArchived === "boolean") {
    await prisma.user.update({
      where: { id: userId },
      data: { keepArchived },
    });
    return NextResponse.json({ success: true, keepArchived });
  }

  // If bulk archive / unarchive
  if (Array.isArray(conversationIds) && typeof isArchived === "boolean") {
    await prisma.conversationParticipant.updateMany({
      where: {
        userId,
        conversationId: { in: conversationIds },
      },
      data: { isArchived },
    });
    return NextResponse.json({ success: true, count: conversationIds.length });
  }

  // Single conversation toggle
  if (typeof isArchived === "boolean") {
    const updated = await prisma.conversationParticipant.update({
      where: {
        userId_conversationId: {
          userId,
          conversationId,
        },
      },
      data: { isArchived },
    });
    return NextResponse.json({ success: true, isArchived: updated.isArchived });
  }

  return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
}
