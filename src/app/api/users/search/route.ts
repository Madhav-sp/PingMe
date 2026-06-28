import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const query = req.nextUrl.searchParams.get("q");
  if (!query || query.length < 1) {
    return NextResponse.json({ users: [] });
  }

  const currentUserId = (session.user as Record<string, unknown>).id as string;

  // Get blocked user IDs
  const blocked = await prisma.blockedUser.findMany({
    where: {
      OR: [{ blockerId: currentUserId }, { blockedId: currentUserId }],
    },
  });
  const blockedIds = blocked.map((b) =>
    b.blockerId === currentUserId ? b.blockedId : b.blockerId
  );

  const users = await prisma.user.findMany({
    where: {
      AND: [
        { id: { not: currentUserId } },
        { id: { notIn: blockedIds } },
        {
          OR: [
            { username: { contains: query, mode: "insensitive" } },
            { displayName: { contains: query, mode: "insensitive" } },
          ],
        },
      ],
    },
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
    take: 10,
  });

  return NextResponse.json({ users });
}
