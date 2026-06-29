import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const currentUserId = (session.user as Record<string, unknown>).id as string;
  const { userId } = await params;

  if (!userId) {
    return NextResponse.json({ error: "Missing user ID" }, { status: 400 });
  }

  const isBlockedRecord = await prisma.blockedUser.findFirst({
    where: { blockerId: currentUserId, blockedId: userId },
  });

  const hasBlockedMeRecord = await prisma.blockedUser.findFirst({
    where: { blockerId: userId, blockedId: currentUserId },
  });

  return NextResponse.json({
    isBlocked: !!isBlockedRecord,
    hasBlockedMe: !!hasBlockedMeRecord,
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const currentUserId = (session.user as Record<string, unknown>).id as string;
  const { userId } = await params;

  if (!userId || userId === currentUserId) {
    return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
  }

  const body = await req.json();
  const { block } = body;

  if (block) {
    // Check if already blocked
    const existing = await prisma.blockedUser.findFirst({
      where: { blockerId: currentUserId, blockedId: userId },
    });
    if (!existing) {
      await prisma.blockedUser.create({
        data: { blockerId: currentUserId, blockedId: userId },
      });
    }
  } else {
    await prisma.blockedUser.deleteMany({
      where: { blockerId: currentUserId, blockedId: userId },
    });
  }

  return NextResponse.json({ success: true, isBlocked: !!block });
}
