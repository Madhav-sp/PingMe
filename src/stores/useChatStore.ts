import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Conversation, User } from "@/types";

interface ChatState {
  selectedConversation: Conversation | null;
  selectedUser: User | null;
  isSidebarOpen: boolean;
  isMobileView: boolean;
  replyingTo: { id: string; content: string; senderName: string } | null;

  archivedIds: string[];
  favoriteIds: string[];
  disappearingSettings: Record<string, string>; // convId -> "24h" | "7d" | "off"

  setSelectedConversation: (conversation: Conversation | null) => void;
  setSelectedUser: (user: User | null) => void;
  setIsSidebarOpen: (open: boolean) => void;
  setIsMobileView: (isMobile: boolean) => void;
  setReplyingTo: (reply: { id: string; content: string; senderName: string } | null) => void;
  clearChat: () => void;

  toggleArchive: (id: string) => void;
  toggleFavorite: (id: string) => void;
  setDisappearing: (id: string, timer: string) => void;
}

export const useChatStore = create<ChatState>()(
  persist(
    (set) => ({
      selectedConversation: null,
      selectedUser: null,
      isSidebarOpen: true,
      isMobileView: false,
      replyingTo: null,

      archivedIds: [],
      favoriteIds: [],
      disappearingSettings: {},

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

      toggleArchive: (id) =>
        set((state) => ({
          archivedIds: state.archivedIds.includes(id)
            ? state.archivedIds.filter((item) => item !== id)
            : [...state.archivedIds, id],
        })),
      toggleFavorite: (id) =>
        set((state) => ({
          favoriteIds: state.favoriteIds.includes(id)
            ? state.favoriteIds.filter((item) => item !== id)
            : [...state.favoriteIds, id],
        })),
      setDisappearing: (id, timer) =>
        set((state) => ({
          disappearingSettings: { ...state.disappearingSettings, [id]: timer },
        })),
    }),
    {
      name: "pingme-chat-preferences",
      partialize: (state) => ({
        archivedIds: state.archivedIds,
        favoriteIds: state.favoriteIds,
        disappearingSettings: state.disappearingSettings,
      }),
    }
  )
);
