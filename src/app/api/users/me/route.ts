import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as Record<string, unknown>).id as string;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      username: true,
      displayName: true,
      image: true,
      bio: true,
      lastSeen: true,
      isOnline: true,
      createdAt: true,
      accounts: {
        select: { provider: true },
      },
    },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({ user });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as Record<string, unknown>).id as string;
  const body = await req.json();
  const { displayName, username, bio, image } = body;

  // Check username uniqueness if changing
  if (username) {
    const existing = await prisma.user.findFirst({
      where: { username, id: { not: userId } },
    });
    if (existing) {
      return NextResponse.json(
        { error: "Username is already taken" },
        { status: 409 }
      );
    }
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(displayName && { displayName }),
      ...(username && { username }),
      ...(bio !== undefined && { bio }),
      ...(image && { image }),
    },
    select: {
      id: true,
      email: true,
      username: true,
      displayName: true,
      image: true,
      bio: true,
    },
  });

  return NextResponse.json({ user: updatedUser });
}

export async function DELETE() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as Record<string, unknown>).id as string;

  // Delete user and cascade
  await prisma.user.delete({ where: { id: userId } });

  return NextResponse.json({ success: true });
}

// Password change - separate endpoint
export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as Record<string, unknown>).id as string;
  const body = await req.json();
  const { currentPassword, newPassword } = body;

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.hashedPassword) {
    return NextResponse.json(
      { error: "Cannot change password for OAuth accounts" },
      { status: 400 }
    );
  }

  const isValid = await bcrypt.compare(currentPassword, user.hashedPassword);
  if (!isValid) {
    return NextResponse.json(
      { error: "Current password is incorrect" },
      { status: 400 }
    );
  }

  const hashedPassword = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({
    where: { id: userId },
    data: { hashedPassword },
  });

  return NextResponse.json({ success: true });
}
