import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = (session.user as Record<string, unknown>).id as string;
    const { conversationId } = await params;
    const { isTyping } = await req.json();

    await prisma.conversationParticipant.updateMany({
      where: {
        conversationId,
        userId,
      },
      data: {
        typingAt: isTyping ? new Date() : null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Typing POST error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = (session.user as Record<string, unknown>).id as string;
    const { conversationId } = await params;

    // Find other participants who typed within the last 4 seconds
    const fourSecondsAgo = new Date(Date.now() - 4000);
    const typingParticipants = await prisma.conversationParticipant.findMany({
      where: {
        conversationId,
        userId: { not: userId },
        typingAt: { gt: fourSecondsAgo },
      },
      select: { userId: true },
    });

    return NextResponse.json({
      typingUsers: typingParticipants.map((p) => p.userId),
    });
  } catch (error) {
    console.error("Typing GET error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
