"use client";

import { useEffect, useRef, useCallback, useState, use } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowDown,
  Phone,
  Video,
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
  MoreVertical,
  Archive,
  Clock,
  Camera,
  Ban,
} from "lucide-react";
import { MediaUploadModal } from "@/components/chat/MediaUploadModal";
import { MediaViewerModal, type MediaItem } from "@/components/chat/MediaViewerModal";
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
  const router = useRouter();
  const queryClient = useQueryClient();
  const { emit, on, off } = useSocket();
  const {
    selectedUser,
    replyingTo,
    setReplyingTo,
    isMobileView,
    setIsSidebarOpen,
    archivedIds,
    toggleArchive,
    disappearingSettings,
    setDisappearing,
    clearChat,
  } = useChatStore();
  const { startCall } = useCallStore();

  const [messageInput, setMessageInput] = useState("");
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    message: Message;
  } | null>(null);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [showConvOptions, setShowConvOptions] = useState(false);

  const [selectedUploadFile, setSelectedUploadFile] = useState<File | null>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [viewerInitialIndex, setViewerInitialIndex] = useState(0);
  const [isViewerOpen, setIsViewerOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);

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
    refetchInterval: 2500,
  });

  // Serverless polling for typing indicators
  useQuery({
    queryKey: ["typing", conversationId],
    queryFn: async () => {
      const res = await fetch(`/api/conversations/${conversationId}/typing`);
      if (!res.ok) return null;
      const json = await res.json();
      if (json.typingUsers) {
        setTypingUsers((prev) => Array.from(new Set([...prev, ...json.typingUsers])));
      }
      return json;
    },
    refetchInterval: 2000,
  });

  // Block status query
  const { data: blockData, refetch: refetchBlock } = useQuery({
    queryKey: ["blockStatus", selectedUser?.id],
    queryFn: async () => {
      if (!selectedUser?.id) return { isBlocked: false, hasBlockedMe: false };
      const res = await fetch(`/api/users/${selectedUser.id}/block`);
      if (!res.ok) return { isBlocked: false, hasBlockedMe: false };
      return res.json();
    },
    enabled: !!selectedUser?.id,
  });
  const isBlocked = blockData?.isBlocked || false;

  const handleToggleBlock = async () => {
    if (!selectedUser) return;
    const nextState = !isBlocked;
    if (nextState && !confirm(`Are you sure you want to ${nextState ? "block" : "unblock"} ${selectedUser.displayName}?`)) return;
    try {
      const res = await fetch(`/api/users/${selectedUser.id}/block`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ block: nextState }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success(nextState ? `Blocked ${selectedUser.displayName}` : `Unblocked ${selectedUser.displayName}`);
      refetchBlock();
    } catch {
      toast.error("Failed to update block status");
    }
  };

  const rawMessages = data?.pages?.flatMap((page) => page.data) || [];
  const uniqueMessagesMap = new Map<string, Message>();
  rawMessages.forEach((msg, idx) => {
    if (msg) uniqueMessagesMap.set(msg.id || msg.tempId || `temp_${idx}`, msg);
  });
  const allMessages: Message[] = Array.from(uniqueMessagesMap.values()).sort(
    (a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime()
  );

  // Stop typing on chat switch or unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      emit("typing", { conversationId, isTyping: false });
      fetch(`/api/conversations/${conversationId}/typing`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isTyping: false }),
      }).catch(() => {});
    };
  }, [conversationId, emit]);

  // Emit markRead when chat opens
  useEffect(() => {
    emit("markRead", { conversationId });
  }, [conversationId, emit]);

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
      const data = payload as { messageId?: string; conversationId: string };
      if (data.conversationId === conversationId) {
        queryClient.setQueryData(
          ["messages", conversationId],
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (old: any) => {
            if (!old || !old.pages) return old;
            return {
              ...old,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              pages: old.pages.map((page: any) => ({
                ...page,
                data: page.data.map((m: Message) => {
                  if (m.senderId === currentUserId && m.status !== "READ") {
                    if (!data.messageId || m.id === data.messageId) {
                      return { ...m, status: "READ" };
                    }
                  }
                  return m;
                }),
              })),
            };
          }
        );
        queryClient.invalidateQueries({
          queryKey: ["messages", conversationId],
        });
      }
    },
    [conversationId, queryClient, currentUserId]
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

  const POPULAR_EMOJIS = [
    "😃", "😂", "🤣", "😊", "🥰", "😍", "😘", "😉", "🤪", "😎", "🤩", "🥳", "😭", "😤", "😡", "🤯",
    "🥺", "👻", "💩", "💀", "👽", "👾", "🤖", "🎃", "😺", "🤲", "👐", "🙌", "👏", "👍", "👎", "👊",
    "✊", "🤛", "🤜", "🤞", "✌️", "🤟", "🤘", "👌", "🤌", "🤏", "👈", "👉", "👆", "👇", "☝️", "✋",
    "🔥", "✨", "🌟", "💖", "💗", "💙", "💚", "💛", "💜", "💯", "🎉", "⚡", "☕", "🍕", "🍔", "🍺"
  ];

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const types = ["audio/mp4", "audio/webm;codecs=opus", "audio/webm", "audio/aac", "audio/ogg"];
      const supportedType = types.find((t) => MediaRecorder.isTypeSupported(t)) || "";
      const options = supportedType ? { mimeType: supportedType } : undefined;
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const mime = mediaRecorder.mimeType || supportedType || "audio/webm";
        const audioBlob = new Blob(audioChunksRef.current, { type: mime });
        stream.getTracks().forEach((track) => track.stop());

        if (audioChunksRef.current.length === 0) return;

        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64Audio = reader.result as string;
          if (base64Audio) {
            const tempId = `temp-voice-${Date.now()}`;
            const voiceMsg: Message = {
              id: tempId,
              tempId,
              conversationId,
              senderId: currentUserId,
              receiverId: selectedUser?.id || "",
              content: "🎤 Voice message",
              type: "AUDIO",
              fileUrl: base64Audio,
              fileName: `voice-${Date.now()}.webm`,
              status: "SENT",
              isEdited: false,
              deletedForAll: false,
              reactions: [],
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              isPending: true,
            };

            // Optimistic insert into first page
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            queryClient.setQueryData(["messages", conversationId], (old: any) => {
              if (!old || !old.pages || old.pages.length === 0) return old;
              const firstPage = old.pages[0];
              return {
                ...old,
                pages: [{ ...firstPage, data: [...firstPage.data, voiceMsg] }, ...old.pages.slice(1)],
              };
            });

            try {
              const res = await fetch("/api/messages", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  content: "🎤 Voice message",
                  conversationId,
                  type: "AUDIO",
                  fileUrl: base64Audio,
                  fileName: "voice.webm",
                }),
              });
              if (res.ok) {
                const { message } = await res.json();
                emit("sendMessage", { ...message, conversationId });
                queryClient.invalidateQueries({ queryKey: ["messages", conversationId] });
              }
            } catch {
              toast.error("Failed to send voice message");
            }
          }
        };
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      recordingTimerRef.current = setInterval(() => setRecordingTime((t) => t + 1), 1000);
    } catch {
      toast.error("Microphone access denied");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      audioChunksRef.current = [];
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      toast("Voice message cancelled");
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
        const firstPage = old.pages[0];
        return {
          ...old,
          pages: [
            { ...firstPage, data: [...firstPage.data, optimisticMessage] },
            ...old.pages.slice(1),
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

  const handleSendMedia = async (mediaData: { url: string; fileName: string; fileSize: number; type: string }) => {
    const tempId = `temp-${Date.now()}`;
    const content = mediaData.fileName || "Media Attachment";
    const optimisticMessage: Message = {
      id: tempId,
      conversationId,
      senderId: currentUserId,
      receiverId: selectedUser?.id || "",
      content,
      type: mediaData.type as "TEXT" | "IMAGE" | "VIDEO" | "FILE" | "VOICE" | "AUDIO" | "GIF",
      fileUrl: mediaData.url,
      fileName: mediaData.fileName,
      fileSize: mediaData.fileSize,
      status: "SENT",
      isEdited: false,
      deletedForAll: false,
      reactions: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tempId,
      isPending: true,
    };

    queryClient.setQueryData(["messages", conversationId], (old: typeof data) => {
      if (!old) return old;
      const firstPage = old.pages[0];
      return {
        ...old,
        pages: [{ ...firstPage, data: [...firstPage.data, optimisticMessage] }, ...old.pages.slice(1)],
      };
    });

    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content,
          conversationId,
          type: mediaData.type,
          fileUrl: mediaData.url,
          fileName: mediaData.fileName,
          fileSize: mediaData.fileSize,
        }),
      });
      if (!res.ok) throw new Error("Failed to send media");
      const { message } = await res.json();

      queryClient.setQueryData(["messages", conversationId], (old: typeof data) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            data: page.data.map((m: Message) => (m.tempId === tempId ? { ...message, isPending: false } : m)),
          })),
        };
      });

      emit("sendMessage", { ...message, conversationId });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    } catch {
      queryClient.setQueryData(["messages", conversationId], (old: typeof data) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            data: page.data.filter((m: Message) => m.tempId !== tempId),
          })),
        };
      });
      toast.error("Failed to send media");
    }
  };

  // Typing indicator
  const handleInputChange = (value: string) => {
    setMessageInput(value);
    emit("typing", { conversationId, isTyping: true });
    fetch(`/api/conversations/${conversationId}/typing`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isTyping: true }),
    }).catch(() => {});

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      emit("typing", { conversationId, isTyping: false });
      fetch(`/api/conversations/${conversationId}/typing`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isTyping: false }),
      }).catch(() => {});
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
        return <span title="Sent"><Check className="w-3.5 h-3.5 text-muted-foreground" /></span>;
      case "DELIVERED":
        return <span title="Delivered"><CheckCheck className="w-3.5 h-3.5 text-muted-foreground" /></span>;
      case "READ":
        return <span title="Seen"><CheckCheck className="w-3.5 h-3.5 text-blue-500 drop-shadow-sm" /></span>;
      default:
        return null;
    }
  };

  const handleDeleteConversation = async () => {
    if (!confirm("Are you sure you want to delete this entire chat conversation? This action cannot be undone.")) return;
    try {
      const res = await fetch(`/api/conversations/${conversationId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      toast.success("Chat conversation deleted");
      clearChat();
      router.push("/chat");
    } catch {
      toast.error("Failed to delete chat");
    }
  };

  const currentDisappearing = disappearingSettings[conversationId] || "off";
  const isArchived = archivedIds.includes(conversationId);

  const allMediaItems: MediaItem[] = allMessages
    .filter((m) => m.fileUrl && !m.deletedForAll && !(m.deletedForIds || []).includes(currentUserId))
    .map((m) => ({
      id: m.id,
      url: m.fileUrl!,
      fileName: m.fileName || m.content,
      type: m.type,
      senderId: m.senderId,
    }));

  const handleOpenMedia = (mediaUrl: string) => {
    const idx = allMediaItems.findIndex((item) => item.url === mediaUrl);
    setViewerInitialIndex(idx >= 0 ? idx : 0);
    setIsViewerOpen(true);
  };

  return (
    <div className="flex-1 flex flex-col h-[100dvh] max-h-[100dvh] min-h-0 relative overflow-hidden bg-background">
      {/* Notion/Claude Inspired Top Navigation Bar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-border bg-card/90 backdrop-blur-md flex-shrink-0 relative z-20">
        <div className="flex items-center gap-3">
          {isMobileView && (
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="p-1.5 rounded-lg hover:bg-accent transition-colors text-muted-foreground"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}
          <div className="relative">
            {selectedUser?.image ? (
              <img
                src={selectedUser.image}
                alt={selectedUser.displayName}
                className="w-9 h-9 rounded-full object-cover border border-border"
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center text-xs font-semibold text-foreground">
                {selectedUser ? getInitials(selectedUser.displayName) : "?"}
              </div>
            )}
            {selectedUser?.isOnline && (
              <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-online rounded-full border-2 border-card" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-sm leading-tight text-foreground">
                {selectedUser?.displayName || "Chat"}
              </h3>
              {isArchived && (
                <span className="px-1.5 py-0.5 text-[10px] bg-secondary text-muted-foreground rounded font-medium flex items-center gap-1">
                  <Archive className="w-3 h-3" /> Archived
                </span>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground">
              {typingUsers.length > 0
                ? "typing..."
                : selectedUser?.isOnline
                ? "Online"
                : `Last seen ${selectedUser?.lastSeen ? formatTime(selectedUser.lastSeen) : "recently"}`}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              if (!selectedUser) return;
              startCall(selectedUser, "voice");
            }}
            className="p-2 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
            title="Voice Call"
          >
            <Phone className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              if (!selectedUser) return;
              startCall(selectedUser, "video");
            }}
            className="p-2 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
            title="Video Call"
          >
            <Video className="w-4 h-4" />
          </button>
          <button
            onClick={handleToggleBlock}
            className={cn(
              "p-2 rounded-lg transition-colors",
              isBlocked ? "bg-destructive/10 text-destructive hover:bg-destructive/20" : "hover:bg-accent text-muted-foreground hover:text-foreground"
            )}
            title={isBlocked ? "Unblock User" : "Block User"}
          >
            <Ban className="w-4 h-4" />
          </button>

          {/* More Options Menu Button */}
          <div className="relative">
            <button
              onClick={() => setShowConvOptions((prev) => !prev)}
              className={cn(
                "p-2 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors",
                showConvOptions && "bg-accent text-foreground"
              )}
              title="Chat Options"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {/* Dropdown Menu */}
            <AnimatePresence>
              {showConvOptions && (
                <>
                  <div
                    className="fixed inset-0 z-30"
                    onClick={() => setShowConvOptions(false)}
                  />
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -5 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -5 }}
                    className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-border bg-popover shadow-xl z-40 p-1.5 space-y-1 text-xs"
                  >
                    {/* Disappearing Messages Toggle */}
                    <div className="px-2.5 py-1.5 border-b border-border">
                      <div className="flex items-center gap-1.5 font-semibold text-foreground mb-1">
                        <Clock className="w-3.5 h-3.5 text-primary" /> Disappearing Messages
                      </div>
                      <div className="grid grid-cols-3 gap-1 mt-1">
                        {(["off", "24h", "7d"] as const).map((timer) => (
                          <button
                            key={timer}
                            onClick={() => {
                              setDisappearing(conversationId, timer);
                              toast.info(timer === "off" ? "Disappearing messages turned off" : `Disappearing timer set to ${timer}`);
                              setShowConvOptions(false);
                            }}
                            className={cn(
                              "py-1 rounded text-[10px] font-medium transition-colors border",
                              currentDisappearing === timer
                                ? "bg-primary text-primary-foreground border-primary"
                                : "bg-secondary/50 text-muted-foreground border-transparent hover:bg-secondary"
                            )}
                          >
                            {timer === "off" ? "Off" : timer}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Archive Button */}
                    <button
                      onClick={() => {
                        toggleArchive(conversationId);
                        toast.success(isArchived ? "Chat unarchived" : "Chat moved to archive");
                        setShowConvOptions(false);
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-accent text-left transition-colors font-medium text-foreground"
                    >
                      <Archive className="w-3.5 h-3.5 text-muted-foreground" />
                      {isArchived ? "Unarchive Conversation" : "Archive Conversation"}
                    </button>

                    {/* Block User Button */}
                    <button
                      onClick={() => {
                        setShowConvOptions(false);
                        handleToggleBlock();
                      }}
                      className={cn(
                        "w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left transition-colors font-medium",
                        isBlocked ? "hover:bg-accent text-foreground" : "hover:bg-destructive/10 text-destructive"
                      )}
                    >
                      <Ban className="w-3.5 h-3.5" />
                      {isBlocked ? "Unblock Contact" : "Block Contact"}
                    </button>

                    {/* Delete Chat Button */}
                    <button
                      onClick={() => {
                        setShowConvOptions(false);
                        handleDeleteConversation();
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-destructive/10 text-left transition-colors font-medium text-destructive"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete Chat
                    </button>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Encryption & Disappearing Badges */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-2 py-1.5 px-4 bg-primary/5 text-[10px] text-primary/70 border-b border-primary/10">
        <div className="flex items-center gap-1.5">
          <Shield className="w-3 h-3" />
          Messages are end-to-end encrypted
        </div>
        {currentDisappearing !== "off" && (
          <div className="flex items-center gap-1 font-semibold text-amber-600 dark:text-amber-400">
            <span>•</span>
            <Clock className="w-3 h-3 animate-pulse" />
            Disappearing messages set to {currentDisappearing}
          </div>
        )}
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
                            onClick={() => handleOpenMedia(msg.fileUrl!)}
                            className="max-w-full rounded-lg mb-1 max-h-60 object-cover cursor-pointer hover:opacity-95 transition-opacity"
                          />
                        )}
                        {msg.fileUrl && (msg.type === "VIDEO" || (msg.type === "FILE" && (msg.fileUrl.endsWith(".mp4") || msg.fileUrl.endsWith(".webm")))) ? (
                          <div
                            onClick={() => handleOpenMedia(msg.fileUrl!)}
                            className="relative max-w-full rounded-lg mb-1 max-h-60 overflow-hidden cursor-pointer group/vid"
                          >
                            <video src={msg.fileUrl} className="max-w-full max-h-60 object-cover" />
                            <div className="absolute inset-0 bg-black/30 flex items-center justify-center group-hover/vid:bg-black/40 transition-colors">
                              <Video className="w-8 h-8 text-white animate-pulse" />
                            </div>
                          </div>
                        ) : msg.type === "FILE" && msg.fileUrl ? (
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
                        ) : null}
                        {(msg.type === "AUDIO" || msg.type === "VOICE") && msg.fileUrl && (
                          <div className="my-1.5 flex items-center gap-2 bg-black/10 p-2 rounded-xl">
                            <audio controls src={msg.fileUrl} className="w-56 h-8" />
                          </div>
                        )}
                        {msg.content !== "🎤 Voice message" && (
                          <p className="text-sm whitespace-pre-wrap break-words">
                            {msg.content}
                          </p>
                        )}
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
      <div className="px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] border-t border-border bg-card/80 backdrop-blur-xl flex-shrink-0">
        {isBlocked ? (
          <div className="flex items-center justify-between w-full bg-destructive/10 text-destructive px-4 py-3 rounded-xl font-medium text-sm">
            <span>You blocked this contact. Unblock to send messages.</span>
            <button
              onClick={handleToggleBlock}
              className="px-3 py-1.5 bg-destructive text-destructive-foreground rounded-lg text-xs font-semibold hover:opacity-90 transition-opacity"
            >
              Unblock
            </button>
          </div>
        ) : isRecording ? (
          <div className="flex items-center justify-between w-full bg-destructive/10 text-destructive px-4 py-2 rounded-xl">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-destructive animate-pulse" />
              <span className="font-medium text-sm">
                Recording {Math.floor(recordingTime / 60)}:{String(recordingTime % 60).padStart(2, "0")}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={cancelRecording}
                className="px-3 py-1.5 rounded-lg hover:bg-destructive/20 text-xs font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={stopRecording}
                className="px-3 py-1.5 rounded-lg bg-destructive text-destructive-foreground text-xs font-semibold hover:opacity-90 flex items-center gap-1 transition-opacity"
              >
                <Send className="w-3 h-3" /> Send Voice
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-end gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) {
                  setSelectedUploadFile(f);
                  setIsUploadModalOpen(true);
                  e.target.value = "";
                }
              }}
              className="hidden"
            />
            <input
              type="file"
              accept="image/*,video/*"
              capture="environment"
              ref={cameraInputRef}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) {
                  setSelectedUploadFile(f);
                  setIsUploadModalOpen(true);
                  e.target.value = "";
                }
              }}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-2.5 rounded-xl hover:bg-accent transition-colors flex-shrink-0 mb-0.5"
              title="Attach gallery file or document"
            >
              <Paperclip className="w-5 h-5 text-muted-foreground" />
            </button>
            <button
              onClick={() => cameraInputRef.current?.click()}
              className="p-2.5 rounded-xl hover:bg-accent transition-colors flex-shrink-0 mb-0.5"
              title="Take photo or video with camera"
            >
              <Camera className="w-5 h-5 text-muted-foreground" />
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

            <div className="relative flex-shrink-0 mb-0.5">
              <button
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="p-2.5 rounded-xl hover:bg-accent transition-colors"
              >
                <Smile className="w-5 h-5 text-muted-foreground" />
              </button>
              <AnimatePresence>
                {showEmojiPicker && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 bottom-12 z-50 bg-popover border border-border rounded-2xl shadow-xl p-3 w-72 grid grid-cols-8 gap-1 max-h-48 overflow-y-auto"
                  >
                    {POPULAR_EMOJIS.map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => {
                          setMessageInput((prev) => prev + emoji);
                          inputRef.current?.focus();
                        }}
                        className="p-1 text-lg hover:bg-accent rounded-lg flex items-center justify-center transition-transform hover:scale-125"
                      >
                        {emoji}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

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
              <button
                onClick={startRecording}
                className="p-2.5 rounded-xl hover:bg-accent transition-colors flex-shrink-0 mb-0.5"
                title="Click to record voice message"
              >
                <Mic className="w-5 h-5 text-muted-foreground" />
              </button>
            )}
          </div>
        )}
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

      <MediaUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        file={selectedUploadFile}
        onSend={handleSendMedia}
      />

      <MediaViewerModal
        isOpen={isViewerOpen}
        onClose={() => setIsViewerOpen(false)}
        mediaList={allMediaItems}
        initialIndex={viewerInitialIndex}
        currentUserId={currentUserId}
      />
    </div>
  );
}
