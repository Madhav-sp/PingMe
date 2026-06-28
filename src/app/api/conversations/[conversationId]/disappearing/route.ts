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
  const { mode } = body; // "24h" | "7d" | "30d" | "off"

  if (!["24h", "7d", "30d", "off"].includes(mode)) {
    return NextResponse.json({ error: "Invalid disappearing mode" }, { status: 400 });
  }

  // Verify participant
  const participant = await prisma.conversationParticipant.findUnique({
    where: {
      userId_conversationId: {
        userId,
        conversationId,
      },
    },
  });

  if (!participant) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const conversation = await prisma.conversation.update({
    where: { id: conversationId },
    data: { disappearingMode: mode },
  });

  return NextResponse.json({ success: true, mode: conversation.disappearingMode });
}
