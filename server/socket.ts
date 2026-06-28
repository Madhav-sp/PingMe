import { Server as SocketIOServer } from "socket.io";
import type { Server as HTTPServer } from "http";

export interface SocketServer extends HTTPServer {
  io?: SocketIOServer;
}

// Store online users: userId -> socketId
const onlineUsers = new Map<string, string>();

export function initSocketServer(server: SocketServer): SocketIOServer {
  if (server.io) {
    return server.io;
  }

  const io = new SocketIOServer(server, {
    path: "/api/socket/io",
    addTrailingSlash: false,
    cors: {
      origin: process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || true,
      methods: ["GET", "POST"],
      credentials: true,
    },
    transports: ["websocket", "polling"],
    pingInterval: 25000,
    pingTimeout: 60000,
  });

  io.on("connection", (socket) => {
    const userId = socket.handshake.auth?.userId as string;

    socket.on("join", (uid: string) => {
      socket.join(`user:${uid}`);
      onlineUsers.set(uid, socket.id);

      // Broadcast online status
      io.emit("onlineStatus", {
        userId: uid,
        isOnline: true,
        lastSeen: new Date().toISOString(),
      });
    });

    socket.on("sendMessage", (data) => {
      const { receiverId, conversationId } = data;

      // Emit to receiver ONLY (sender uses optimistic update)
      io.to(`user:${receiverId}`).emit("receiveMessage", {
        ...data,
        conversationId,
      });

      // Also notify about new message for sidebar update
      io.to(`user:${receiverId}`).emit("newMessage", {
        conversationId,
        senderId: data.senderId,
      });
    });

    socket.on("typing", (data: { conversationId: string; isTyping: boolean }) => {
      // Find the other user in the conversation and send them the typing indicator
      socket.broadcast.emit("typing", {
        userId,
        conversationId: data.conversationId,
        isTyping: data.isTyping,
      });
    });

    socket.on("markRead", (data: { messageId: string; conversationId: string; senderId: string }) => {
      // Notify message sender about read receipt
      io.to(`user:${data.senderId}`).emit("readReceipt", {
        messageId: data.messageId,
        conversationId: data.conversationId,
        readBy: userId,
      });
    });

    // WebRTC Signaling
    socket.on("call:offer", (data: { to: string; offer: RTCSessionDescriptionInit; callType: string; caller: unknown }) => {
      io.to(`user:${data.to}`).emit("call:incoming", {
        from: userId,
        offer: data.offer,
        callType: data.callType,
        caller: data.caller,
      });
    });

    socket.on("call:answer", (data: { to: string; answer: RTCSessionDescriptionInit }) => {
      io.to(`user:${data.to}`).emit("call:answered", {
        from: userId,
        answer: data.answer,
      });
    });

    socket.on("call:ice-candidate", (data: { to: string; candidate: RTCIceCandidateInit }) => {
      io.to(`user:${data.to}`).emit("call:ice-candidate", {
        from: userId,
        candidate: data.candidate,
      });
    });

    socket.on("call:end", (data: { to: string }) => {
      io.to(`user:${data.to}`).emit("call:ended", { from: userId });
    });

    socket.on("call:reject", (data: { to: string }) => {
      io.to(`user:${data.to}`).emit("call:rejected", { from: userId });
    });

    socket.on("disconnect", () => {
      onlineUsers.delete(userId);

      if (userId) {
        io.emit("onlineStatus", {
          userId,
          isOnline: false,
          lastSeen: new Date().toISOString(),
        });
      }
    });
  });

  server.io = io;
  return io;
}

export { onlineUsers };
