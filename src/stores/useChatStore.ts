import { create } from "zustand";
import type { Conversation, User } from "@/types";

interface ChatState {
  selectedConversation: Conversation | null;
  selectedUser: User | null;
  isSidebarOpen: boolean;
  isMobileView: boolean;
  replyingTo: { id: string; content: string; senderName: string } | null;

  setSelectedConversation: (conversation: Conversation | null) => void;
  setSelectedUser: (user: User | null) => void;
  setIsSidebarOpen: (open: boolean) => void;
  setIsMobileView: (isMobile: boolean) => void;
  setReplyingTo: (reply: { id: string; content: string; senderName: string } | null) => void;
  clearChat: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
  selectedConversation: null,
  selectedUser: null,
  isSidebarOpen: true,
  isMobileView: false,
  replyingTo: null,

  setSelectedConversation: (conversation) =>
    set({ selectedConversation: conversation }),
  setSelectedUser: (user) => set({ selectedUser: user }),
  setIsSidebarOpen: (open) => set({ isSidebarOpen: open }),
  setIsMobileView: (isMobile) => set({ isMobileView: isMobile }),
  setReplyingTo: (reply) => set({ replyingTo: reply }),
  clearChat: () =>
    set({
      selectedConversation: null,
      selectedUser: null,
      replyingTo: null,
    }),
}));
