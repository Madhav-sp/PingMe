import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as Record<string, unknown>).id as string;
    const body = await req.json();
    const { endpoint, keys } = body;

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return NextResponse.json({ error: "Missing subscription endpoint or keys" }, { status: 400 });
    }

    console.log(`[Push API] Registering push subscription for user ${userId}...`);

    // Upsert subscription to avoid duplicate key errors
    const sub = await prisma.pushSubscription.upsert({
      where: { endpoint },
      update: {
        userId,
        p256dh: keys.p256dh,
        auth: keys.auth,
        updatedAt: new Date(),
      },
      create: {
        userId,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
      },
    });

    console.log(`[Push API] Subscription registered successfully (ID: ${sub.id})`);
    return NextResponse.json({ success: true, id: sub.id }, { status: 200 });
  } catch (error: unknown) {
    console.error("[Push API] Error storing subscription:", error);
    return NextResponse.json({ error: "Failed to store push subscription" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { endpoint } = body;

    if (!endpoint) {
      return NextResponse.json({ error: "Missing endpoint" }, { status: 400 });
    }

    console.log(`[Push API] Removing push subscription endpoint...`);
    await prisma.pushSubscription.deleteMany({
      where: { endpoint },
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: unknown) {
    console.error("[Push API] Error removing subscription:", error);
    return NextResponse.json({ error: "Failed to remove push subscription" }, { status: 500 });
  }
}
