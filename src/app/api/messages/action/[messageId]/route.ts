import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { encrypt } from "@/lib/encryption";
import { destroyCloudinaryFile } from "@/lib/cloudinaryDestroy";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ messageId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as Record<string, unknown>).id as string;
  const { messageId } = await params;
  const body = await req.json();
  const { action, content, emoji } = body;

  const message = await prisma.message.findUnique({
    where: { id: messageId },
  });

  if (!message) {
    return NextResponse.json({ error: "Message not found" }, { status: 404 });
  }

  switch (action) {
    case "edit": {
      if (message.senderId !== userId) {
        return NextResponse.json({ error: "Can only edit your own messages" }, { status: 403 });
      }
      const { ciphertext, iv } = encrypt(content, message.conversationId);
      const updated = await prisma.message.update({
        where: { id: messageId },
        data: { content: ciphertext, contentIv: iv, isEdited: true },
      });
      return NextResponse.json({ message: { ...updated, content } });
    }

    case "deleteForMe": {
      await prisma.message.update({
        where: { id: messageId },
        data: { deletedForIds: { push: userId } },
      });
      return NextResponse.json({ success: true });
    }

    case "deleteForAll": {
      if (message.senderId !== userId) {
        return NextResponse.json({ error: "Can only delete your own messages" }, { status: 403 });
      }
      if (message.fileUrl) {
        await destroyCloudinaryFile(message.fileUrl);
      }
      await prisma.message.update({
        where: { id: messageId },
        data: { deletedForAll: true, content: "", contentIv: null, fileUrl: null, fileName: null, fileSize: null },
      });
      return NextResponse.json({ success: true });
    }

    case "viewOnce": {
      // Receiver or sender can trigger view once closure
      if (message.fileUrl) {
        await destroyCloudinaryFile(message.fileUrl);
      }
      await prisma.message.update({
        where: { id: messageId },
        data: { content: "🔥 Expired snap", contentIv: null, fileUrl: null, fileName: null, fileSize: null, deletedForAll: true },
      });
      return NextResponse.json({ success: true });
    }

    case "react": {
      if (!emoji) {
        return NextResponse.json({ error: "Emoji required" }, { status: 400 });
      }
      const existing = await prisma.reaction.findFirst({
        where: { messageId, userId, emoji },
      });
      if (existing) {
        await prisma.reaction.delete({ where: { id: existing.id } });
        return NextResponse.json({ removed: true });
      }
      const reaction = await prisma.reaction.create({
        data: { messageId, userId, emoji },
      });
      return NextResponse.json({ reaction });
    }

    case "markDelivered": {
      if (message.receiverId !== userId) {
        return NextResponse.json({ error: "Not authorized" }, { status: 403 });
      }
      await prisma.message.update({
        where: { id: messageId },
        data: { status: "DELIVERED" },
      });
      return NextResponse.json({ success: true });
    }

    case "markRead": {
      if (message.receiverId !== userId) {
        return NextResponse.json({ error: "Not authorized" }, { status: 403 });
      }
      await prisma.message.update({
        where: { id: messageId },
        data: { status: "READ" },
      });
      return NextResponse.json({ success: true });
    }

    default:
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }
}
