"use client";

import { useEffect, useRef, useCallback, useState, use } from "react";
import { useSession } from "next-auth/react";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowDown,
  Phone,
  Video,
  MoreVertical,
  Menu,
  Loader2,
  Shield,
  Send,
  Smile,
  Paperclip,
  Mic,
  Reply,
  X,
  Check,
  CheckCheck,
  Pencil,
  Trash2,
  Copy,
} from "lucide-react";
import { useSocket } from "@/providers/SocketProvider";
import { useChatStore } from "@/stores/useChatStore";
import { useCallStore } from "@/stores/useCallStore";
import type { Message } from "@/types";
import { cn, formatTime, getInitials } from "@/lib/utils";
import { toast } from "sonner";

export default function ChatViewPage({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  const { conversationId } = use(params);
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const { emit, on, off } = useSocket();
  const {
    selectedUser,
    replyingTo,
    setReplyingTo,
    isMobileView,
    setIsSidebarOpen,
  } = useChatStore();
  const { startCall } = useCallStore();

  const [messageInput, setMessageInput] = useState("");
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    message: Message;
  } | null>(null);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const currentUserId = (session?.user as Record<string, unknown>)?.id as string;

  // Fetch messages with infinite scroll
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteQuery({
    queryKey: ["messages", conversationId],
    queryFn: async ({ pageParam }) => {
      const url = new URL(`/api/messages/${conversationId}`, window.location.origin);
      if (pageParam) url.searchParams.set("cursor", pageParam);
      url.searchParams.set("limit", "30");
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: undefined as string | undefined,
    select: (data) => ({
      pages: data.pages,
      pageParams: data.pageParams,
    }),
  });

  const allMessages: Message[] =
    data?.pages?.flatMap((page) => page.data) || [];

  // Socket: receive messages
  const handleReceiveMessage = useCallback(
    (msg: unknown) => {
      const message = msg as Message & { conversationId: string };
      if (message.conversationId === conversationId) {
        queryClient.setQueryData(
          ["messages", conversationId],
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (old: any) => {
            if (!old || !old.pages || old.pages.length === 0) return old;
            // Check if message already exists across any page
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const exists = old.pages.some((page: any) =>
              page.data.some((m: Message) => m.id === message.id)
            );
            if (exists) return old;

            const firstPage = old.pages[0];
            return {
              ...old,
              pages: [
                {
                  ...firstPage,
                  data: [...firstPage.data, message],
                },
                ...old.pages.slice(1),
              ],
            };
          }
        );
        queryClient.invalidateQueries({ queryKey: ["conversations"] });
        // Mark as read
        emit("markRead", {
          messageId: message.id,
          conversationId,
          senderId: message.senderId,
        });
      }
    },
    [conversationId, queryClient, emit]
  );

  // Socket: typing indicator
  const handleTyping = useCallback(
    (payload: unknown) => {
      const data = payload as { userId: string; conversationId: string; isTyping: boolean };
      if (data.conversationId === conversationId && data.userId !== currentUserId) {
        setTypingUsers((prev) =>
          data.isTyping
            ? [...new Set([...prev, data.userId])]
            : prev.filter((id) => id !== data.userId)
        );
      }
    },
    [conversationId, currentUserId]
  );

  // Socket: read receipt
  const handleReadReceipt = useCallback(
    (payload: unknown) => {
      const data = payload as { messageId: string; conversationId: string };
      if (data.conversationId === conversationId) {
        queryClient.setQueryData(
          ["messages", conversationId],
          (old: typeof data) => {
            if (!old) return old;
            return old;
          }
        );
        queryClient.invalidateQueries({
          queryKey: ["messages", conversationId],
        });
      }
    },
    [conversationId, queryClient]
  );

  useEffect(() => {
    on("receiveMessage", handleReceiveMessage);
    on("typing", handleTyping);
    on("readReceipt", handleReadReceipt);
    return () => {
      off("receiveMessage", handleReceiveMessage);
      off("typing", handleTyping);
      off("readReceipt", handleReadReceipt);
    };
  }, [on, off, handleReceiveMessage, handleTyping, handleReadReceipt]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (!showScrollButton) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [allMessages.length, showScrollButton]);

  // Scroll detection
  const handleScroll = () => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    setShowScrollButton(scrollHeight - scrollTop - clientHeight > 200);

    // Load more when scrolling near top
    if (scrollTop < 100 && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  };

  // Send message
  const handleSend = async () => {
    const content = messageInput.trim();
    if (!content || !currentUserId) return;

    const tempId = `temp-${Date.now()}`;

    // Optimistic update
    const optimisticMessage: Message = {
      id: tempId,
      conversationId,
      senderId: currentUserId,
      receiverId: selectedUser?.id || "",
      content,
      type: "TEXT",
      status: "SENT",
      isEdited: false,
      deletedForAll: false,
      reactions: [],
      replyToId: replyingTo?.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tempId,
      isPending: true,
    };

    queryClient.setQueryData(
      ["messages", conversationId],
      (old: typeof data) => {
        if (!old) return old;
        const lastPage = old.pages[old.pages.length - 1];
        return {
          ...old,
          pages: [
            ...old.pages.slice(0, -1),
            { ...lastPage, data: [...lastPage.data, optimisticMessage] },
          ],
        };
      }
    );

    setMessageInput("");
    setReplyingTo(null);
    inputRef.current?.focus();

    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content,
          conversationId,
          type: "TEXT",
          replyToId: replyingTo?.id,
        }),
      });

      if (!res.ok) throw new Error("Failed to send");

      const { message } = await res.json();

      // Replace optimistic with real message
      queryClient.setQueryData(
        ["messages", conversationId],
        (old: typeof data) => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              data: page.data.map((m: Message) =>
                m.tempId === tempId ? { ...message, isPending: false } : m
              ),
            })),
          };
        }
      );

      // Emit via socket for real-time delivery
      emit("sendMessage", {
        ...message,
        conversationId,
      });

      // Refetch conversations for sidebar update
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    } catch {
      // Remove optimistic message on failure
      queryClient.setQueryData(
        ["messages", conversationId],
        (old: typeof data) => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              data: page.data.filter((m: Message) => m.tempId !== tempId),
            })),
          };
        }
      );
      toast.error("Failed to send message");
    }
  };

  // Typing indicator
  const handleInputChange = (value: string) => {
    setMessageInput(value);
    emit("typing", { conversationId, isTyping: true });

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      emit("typing", { conversationId, isTyping: false });
    }, 2000);
  };

  // Message actions
  const handleMessageAction = async (action: string, message: Message) => {
    setContextMenu(null);

    switch (action) {
      case "reply":
        setReplyingTo({
          id: message.id,
          content: message.content,
          senderName:
            message.senderId === currentUserId
              ? "You"
              : selectedUser?.displayName || "User",
        });
        inputRef.current?.focus();
        break;

      case "copy":
        await navigator.clipboard.writeText(message.content);
        toast.success("Copied to clipboard");
        break;

      case "edit":
        setMessageInput(message.content);
        // TODO: implement edit mode
        break;

      case "deleteForMe":
        try {
          await fetch(`/api/messages/action/${message.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "deleteForMe" }),
          });
          queryClient.invalidateQueries({
            queryKey: ["messages", conversationId],
          });
          toast.success("Message deleted");
        } catch {
          toast.error("Failed to delete");
        }
        break;

      case "deleteForAll":
        try {
          await fetch(`/api/messages/action/${message.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "deleteForAll" }),
          });
          queryClient.invalidateQueries({
            queryKey: ["messages", conversationId],
          });
          toast.success("Message deleted for everyone");
        } catch {
          toast.error("Failed to delete");
        }
        break;
    }
  };

  // React to message
  const handleReaction = async (messageId: string, emoji: string) => {
    try {
      await fetch(`/api/messages/action/${messageId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "react", emoji }),
      });
      queryClient.invalidateQueries({
        queryKey: ["messages", conversationId],
      });
    } catch {
      toast.error("Failed to react");
    }
  };

  const statusIcon = (status: string, senderId: string) => {
    if (senderId !== currentUserId) return null;
    switch (status) {
      case "SENT":
        return <Check className="w-3 h-3 text-muted-foreground" />;
      case "DELIVERED":
        return <CheckCheck className="w-3 h-3 text-muted-foreground" />;
      case "READ":
        return <CheckCheck className="w-3 h-3 text-primary" />;
      default:
        return null;
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full min-h-0">
      {/* Chat Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card/80 backdrop-blur-xl flex-shrink-0">
        <div className="flex items-center gap-3">
          {isMobileView && (
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="p-1.5 rounded-lg hover:bg-accent transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}
          <div className="relative">
            {selectedUser?.image ? (
              <img
                src={selectedUser.image}
                alt={selectedUser.displayName}
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary">
                {selectedUser ? getInitials(selectedUser.displayName) : "?"}
              </div>
            )}
            {selectedUser?.isOnline && (
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-online rounded-full border-2 border-card" />
            )}
          </div>
          <div>
            <h3 className="font-semibold text-sm">
              {selectedUser?.displayName || "Chat"}
            </h3>
            <p className="text-xs text-muted-foreground">
              {typingUsers.length > 0
                ? "typing..."
                : selectedUser?.isOnline
                ? "Online"
                : `Last seen ${selectedUser?.lastSeen ? formatTime(selectedUser.lastSeen) : "unknown"}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              if (!selectedUser) return;
              startCall(selectedUser, "voice");
            }}
            className="p-2 rounded-lg hover:bg-accent transition-colors"
          >
            <Phone className="w-4 h-4 text-muted-foreground" />
          </button>
          <button
            onClick={() => {
              if (!selectedUser) return;
              startCall(selectedUser, "video");
            }}
            className="p-2 rounded-lg hover:bg-accent transition-colors"
          >
            <Video className="w-4 h-4 text-muted-foreground" />
          </button>
          <button className="p-2 rounded-lg hover:bg-accent transition-colors">
            <MoreVertical className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Encryption Badge */}
      <div className="flex items-center justify-center py-2 bg-primary/5">
        <div className="flex items-center gap-1.5 text-[10px] text-primary/70">
          <Shield className="w-3 h-3" />
          Messages are encrypted
        </div>
      </div>

      {/* Messages */}
      <div
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-1 min-h-0"
      >
        {isFetchingNextPage && (
          <div className="flex justify-center py-3">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        )}

        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          allMessages.map((msg, idx) => {
            const isMe = msg.senderId === currentUserId;
            const showAvatar =
              idx === 0 ||
              allMessages[idx - 1]?.senderId !== msg.senderId;
            const isDeleted = msg.deletedForAll;

            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.2 }}
                className={cn(
                  "flex gap-2",
                  isMe ? "justify-end" : "justify-start",
                  !showAvatar && "ml-10"
                )}
                onContextMenu={(e) => {
                  e.preventDefault();
                  if (!isDeleted) {
                    setContextMenu({ x: e.clientX, y: e.clientY, message: msg });
                  }
                }}
              >
                {!isMe && showAvatar && (
                  <div className="flex-shrink-0 mt-auto">
                    {selectedUser?.image ? (
                      <img
                        src={selectedUser.image}
                        alt=""
                        className="w-7 h-7 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-medium text-primary">
                        {selectedUser ? getInitials(selectedUser.displayName) : "?"}
                      </div>
                    )}
                  </div>
                )}

                <div className={cn("max-w-[70%] group", isMe && "order-first")}>
                  {/* Reply Preview */}
                  {msg.replyTo && !isDeleted && (
                    <div
                      className={cn(
                        "text-xs px-3 py-1.5 rounded-t-xl border-l-2 mb-0.5",
                        isMe
                          ? "bg-primary/20 border-primary/50 ml-auto"
                          : "bg-muted border-muted-foreground/30"
                      )}
                    >
                      <p className="font-medium opacity-70 truncate">
                        {(msg.replyTo as unknown as { sender?: { displayName: string } })?.sender?.displayName || "User"}
                      </p>
                      <p className="opacity-60 truncate">{msg.replyTo.content}</p>
                    </div>
                  )}

                  {/* Message Bubble */}
                  <div
                    className={cn(
                      "px-3.5 py-2 rounded-2xl relative inline-block",
                      isMe
                        ? "bg-message-sent text-message-sent-foreground rounded-br-md"
                        : "bg-message-received text-message-received-foreground rounded-bl-md",
                      isDeleted && "opacity-60 italic",
                      msg.isPending && "opacity-70"
                    )}
                  >
                    {isDeleted ? (
                      <p className="text-sm">🚫 This message was deleted</p>
                    ) : (
                      <>
                        {/* File/Image Preview */}
                        {msg.type === "IMAGE" && msg.fileUrl && (
                          <img
                            src={msg.fileUrl}
                            alt="Shared image"
                            className="max-w-full rounded-lg mb-1 max-h-60 object-cover"
                          />
                        )}
                        {msg.type === "FILE" && msg.fileUrl && (
                          <a
                            href={msg.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-black/10 mb-1 hover:bg-black/20 transition-colors"
                          >
                            <Paperclip className="w-4 h-4" />
                            <span className="text-sm truncate">
                              {msg.fileName || "File"}
                            </span>
                          </a>
                        )}
                        <p className="text-sm whitespace-pre-wrap break-words">
                          {msg.content}
                        </p>
                      </>
                    )}

                    {/* Time & Status */}
                    <div
                      className={cn(
                        "flex items-center gap-1 mt-1",
                        isMe ? "justify-end" : "justify-start"
                      )}
                    >
                      {msg.isEdited && (
                        <span className="text-[10px] opacity-50">edited</span>
                      )}
                      <span className="text-[10px] opacity-50">
                        {formatTime(msg.createdAt)}
                      </span>
                      {statusIcon(msg.status, msg.senderId)}
                      {msg.isPending && (
                        <Loader2 className="w-2.5 h-2.5 animate-spin opacity-50" />
                      )}
                    </div>
                  </div>

                  {/* Reactions */}
                  {msg.reactions && msg.reactions.length > 0 && (
                    <div className={cn("flex gap-1 mt-0.5", isMe && "justify-end")}>
                      {Object.entries(
                        msg.reactions.reduce(
                          (acc: Record<string, number>, r) => {
                            acc[r.emoji] = (acc[r.emoji] || 0) + 1;
                            return acc;
                          },
                          {}
                        )
                      ).map(([emoji, count]) => (
                        <button
                          key={emoji}
                          onClick={() => handleReaction(msg.id, emoji)}
                          className="text-xs px-1.5 py-0.5 rounded-full bg-card border border-border hover:scale-110 transition-transform"
                        >
                          {emoji} {(count as number) > 1 && count}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Quick Reactions */}
                  {!isDeleted && (
                    <div
                      className={cn(
                        "hidden group-hover:flex gap-0.5 mt-0.5",
                        isMe ? "justify-end" : "justify-start"
                      )}
                    >
                      {["❤️", "😂", "👍", "😮", "😢", "🔥"].map((emoji) => (
                        <button
                          key={emoji}
                          onClick={() => handleReaction(msg.id, emoji)}
                          className="text-sm hover:scale-125 transition-transform p-0.5"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })
        )}

        {/* Typing Indicator */}
        <AnimatePresence>
          {typingUsers.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="flex items-center gap-2 px-4 py-2"
            >
              <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="w-2 h-2 rounded-full bg-typing"
                    animate={{ y: [0, -4, 0] }}
                    transition={{
                      duration: 0.6,
                      repeat: Infinity,
                      delay: i * 0.15,
                    }}
                  />
                ))}
              </div>
              <span className="text-xs text-muted-foreground">typing...</span>
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={messagesEndRef} />
      </div>

      {/* Scroll to bottom button */}
      <AnimatePresence>
        {showScrollButton && (
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            onClick={() =>
              messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
            }
            className="absolute bottom-28 right-6 p-2.5 rounded-full bg-card border border-border shadow-lg hover:bg-accent transition-colors z-10"
          >
            <ArrowDown className="w-4 h-4" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Reply Preview */}
      <AnimatePresence>
        {replyingTo && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="px-4 py-2 bg-card border-t border-border flex items-center gap-3"
          >
            <Reply className="w-4 h-4 text-primary flex-shrink-0" />
            <div className="flex-1 min-w-0 border-l-2 border-primary pl-3">
              <p className="text-xs font-medium text-primary">
                {replyingTo.senderName}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {replyingTo.content}
              </p>
            </div>
            <button
              onClick={() => setReplyingTo(null)}
              className="p-1 rounded-full hover:bg-accent"
            >
              <X className="w-3 h-3" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Message Input */}
      <div className="px-4 py-3 border-t border-border bg-card/80 backdrop-blur-xl flex-shrink-0">
        <div className="flex items-end gap-2">
          <button className="p-2.5 rounded-xl hover:bg-accent transition-colors flex-shrink-0 mb-0.5">
            <Paperclip className="w-5 h-5 text-muted-foreground" />
          </button>

          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={messageInput}
              onChange={(e) => handleInputChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Type a message..."
              rows={1}
              className="w-full px-4 py-2.5 rounded-xl bg-background border border-input focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none transition-all text-sm resize-none max-h-32"
              style={{ minHeight: "42px" }}
            />
          </div>

          <button className="p-2.5 rounded-xl hover:bg-accent transition-colors flex-shrink-0 mb-0.5">
            <Smile className="w-5 h-5 text-muted-foreground" />
          </button>

          {messageInput.trim() ? (
            <motion.button
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              onClick={handleSend}
              className="p-2.5 rounded-xl bg-primary text-primary-foreground hover:opacity-90 transition-all flex-shrink-0 mb-0.5"
              whileTap={{ scale: 0.9 }}
            >
              <Send className="w-5 h-5" />
            </motion.button>
          ) : (
            <button className="p-2.5 rounded-xl hover:bg-accent transition-colors flex-shrink-0 mb-0.5">
              <Mic className="w-5 h-5 text-muted-foreground" />
            </button>
          )}
        </div>
      </div>

      {/* Context Menu */}
      <AnimatePresence>
        {contextMenu && (
          <>
            <div
              className="fixed inset-0 z-50"
              onClick={() => setContextMenu(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="fixed z-50 bg-popover border border-border rounded-xl shadow-xl py-1 min-w-[160px]"
              style={{
                left: Math.min(contextMenu.x, window.innerWidth - 180),
                top: Math.min(contextMenu.y, window.innerHeight - 280),
              }}
            >
              <button
                onClick={() =>
                  handleMessageAction("reply", contextMenu.message)
                }
                className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent transition-colors"
              >
                <Reply className="w-4 h-4" /> Reply
              </button>
              <button
                onClick={() =>
                  handleMessageAction("copy", contextMenu.message)
                }
                className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent transition-colors"
              >
                <Copy className="w-4 h-4" /> Copy
              </button>
              {contextMenu.message.senderId === currentUserId && (
                <button
                  onClick={() =>
                    handleMessageAction("edit", contextMenu.message)
                  }
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent transition-colors"
                >
                  <Pencil className="w-4 h-4" /> Edit
                </button>
              )}
              <div className="h-px bg-border my-1" />
              <button
                onClick={() =>
                  handleMessageAction("deleteForMe", contextMenu.message)
                }
                className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent transition-colors text-destructive"
              >
                <Trash2 className="w-4 h-4" /> Delete for me
              </button>
              {contextMenu.message.senderId === currentUserId && (
                <button
                  onClick={() =>
                    handleMessageAction("deleteForAll", contextMenu.message)
                  }
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent transition-colors text-destructive"
                >
                  <Trash2 className="w-4 h-4" /> Delete for everyone
                </button>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
