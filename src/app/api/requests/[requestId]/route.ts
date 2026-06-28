import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ requestId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as Record<string, unknown>).id as string;
  const { requestId } = await params;
  const body = await req.json();
  const { action } = body; // "accept" or "reject"

  const request = await prisma.chatRequest.findUnique({
    where: { id: requestId },
    include: {
      sender: { select: { displayName: true } },
    },
  });

  if (!request) {
    return NextResponse.json({ error: "Request not found" }, { status: 404 });
  }

  if (request.receiverId !== userId) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  if (request.status !== "PENDING") {
    return NextResponse.json(
      { error: "Request already processed" },
      { status: 400 }
    );
  }

  if (action === "accept") {
    // Create conversation
    const conversation = await prisma.conversation.create({
      data: {
        participants: {
          create: [
            { userId: request.senderId },
            { userId: request.receiverId },
          ],
        },
      },
    });

    await prisma.chatRequest.update({
      where: { id: requestId },
      data: { status: "ACCEPTED" },
    });

    // Notify sender
    await prisma.notification.create({
      data: {
        userId: request.senderId,
        type: "REQUEST_ACCEPTED",
        title: "Request accepted!",
        body: `${(session.user as Record<string, unknown>).displayName || session.user.name} accepted your message request`,
        data: { conversationId: conversation.id },
      },
    });

    return NextResponse.json({
      status: "ACCEPTED",
      conversationId: conversation.id,
    });
  } else if (action === "reject") {
    await prisma.chatRequest.update({
      where: { id: requestId },
      data: { status: "REJECTED" },
    });

    await prisma.notification.create({
      data: {
        userId: request.senderId,
        type: "REQUEST_REJECTED",
        title: "Request declined",
        body: "Your message request was declined",
      },
    });

    return NextResponse.json({ status: "REJECTED" });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
