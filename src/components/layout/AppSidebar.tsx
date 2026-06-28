"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageCircle,
  Search,
  UserPlus,
  Settings,
  LogOut,
  Moon,
  Sun,
  Monitor,
  Bell,
  X,
  Loader2,
  Archive,
  Star,
  Plus,
  CheckSquare,
} from "lucide-react";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { useChatStore } from "@/stores/useChatStore";
import { useNotificationStore } from "@/stores/useNotificationStore";
import { useSocket } from "@/providers/SocketProvider";
import type { Conversation, Notification } from "@/types";
import { formatDate, getInitials, truncate } from "@/lib/utils";

interface AppSidebarProps {
  onClose: () => void;
}

export function AppSidebar({ onClose }: AppSidebarProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const { selectedConversation, setSelectedConversation, setSelectedUser, isMobileView, archivedIds, favoriteIds, toggleArchive } = useChatStore();
  const { unreadCount, addNotification } = useNotificationStore();
  const { on, off, isConnected } = useSocket();

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(timer);
  }, []);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Array<{
    id: string;
    username: string;
    displayName: string;
    image: string | null;
    isOnline: boolean;
  }>>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [navTab, setNavTab] = useState<"history" | "favorites" | "archive">("history");
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [selectedBulkIds, setSelectedBulkIds] = useState<string[]>([]);

  const user = session?.user as Record<string, unknown> | undefined;

  // Fetch conversations
  const { data: conversationsData, refetch: refetchConversations } = useQuery({
    queryKey: ["conversations"],
    queryFn: async () => {
      const res = await fetch("/api/conversations");
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    refetchInterval: 3000,
  });

  const rawConversations: (Conversation & { isArchived?: boolean })[] = conversationsData?.conversations || [];
  const conversations = rawConversations.filter((conv) => {
    const isConvArchived = archivedIds.includes(conv.id) || conv.isArchived;
    if (navTab === "archive") return isConvArchived;
    if (navTab === "favorites") return favoriteIds.includes(conv.id) && !isConvArchived;
    return !isConvArchived;
  });

  const handleBulkUnarchive = async () => {
    if (selectedBulkIds.length === 0) return;
    try {
      await fetch(`/api/conversations/bulk/archive`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationIds: selectedBulkIds, isArchived: false }),
      });
      selectedBulkIds.forEach((id) => {
        if (archivedIds.includes(id)) toggleArchive(id);
      });
      toast.success(`Unarchived ${selectedBulkIds.length} chats`);
      setIsBulkMode(false);
      setSelectedBulkIds([]);
      refetchConversations();
    } catch {
      toast.error("Failed to unarchive selected chats");
    }
  };

  // Fetch pending requests count
  const { data: requestsData } = useQuery({
    queryKey: ["requests", "received", "PENDING"],
    queryFn: async () => {
      const res = await fetch("/api/requests?type=received&status=PENDING");
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    refetchInterval: 30000,
  });

  const pendingCount = requestsData?.requests?.length || 0;

  // Socket listeners
  const handleNewMessage = useCallback(() => {
    refetchConversations();
  }, [refetchConversations]);

  const handleNotification = useCallback(
    (notification: unknown) => {
      addNotification(notification as Notification);
    },
    [addNotification]
  );

  useEffect(() => {
    on("newMessage", handleNewMessage);
    on("receiveMessage", handleNewMessage);
    on("notification", handleNotification);
    return () => {
      off("newMessage", handleNewMessage);
      off("receiveMessage", handleNewMessage);
      off("notification", handleNotification);
    };
  }, [on, off, handleNewMessage, handleNotification]);

  // Search
  useEffect(() => {
    if (!searchQuery.trim()) {
      const t = setTimeout(() => setSearchResults([]), 0);
      return () => clearTimeout(t);
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(
          `/api/users/search?q=${encodeURIComponent(searchQuery)}`
        );
        const data = await res.json();
        setSearchResults(data.users || []);
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleConversationClick = (conv: Conversation) => {
    setSelectedConversation(conv);
    setSelectedUser(conv.participant);
    router.push(`/chat/${conv.id}`);
    if (isMobileView) onClose();
  };

  const handleSearchUserClick = (searchUser: typeof searchResults[0]) => {
    router.push(`/profile/${searchUser.username}`);
    setShowSearch(false);
    setSearchQuery("");
    if (isMobileView) onClose();
  };

  const handleLogout = async () => {
    try {
      await signOut({ redirect: false });
      toast.success("Logged out successfully");
      router.push("/login");
    } catch {
      toast.error("Logout failed");
    }
  };

  const themeIcons = { light: Sun, dark: Moon, system: Monitor };
  const nextTheme: Record<string, string> = { light: "dark", dark: "system", system: "light" };

  return (
    <div className="h-full w-full flex flex-col bg-sidebar border-r border-sidebar-border text-sidebar-foreground">
      {/* Header */}
      <div className="p-4 flex items-center justify-between border-b border-sidebar-border">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold text-xs shadow-inner">
            PM
          </div>
          <div>
            <h1 className="text-sm font-bold leading-none tracking-tight">PingMe</h1>
            <p className="text-[10px] text-muted-foreground">Messenger</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {/* Connection indicator */}
          <div
            className={`w-2 h-2 rounded-full mr-1 ${
              isConnected ? "bg-online" : "bg-destructive"
            }`}
            title={isConnected ? "Real-time Connected" : "Disconnected"}
          />
          
          {/* Notifications */}
          <button
            onClick={() => router.push("/requests")}
            className="relative p-1.5 rounded-lg hover:bg-sidebar-accent transition-colors text-muted-foreground hover:text-foreground"
            title="Requests"
          >
            <Bell className="w-4 h-4" />
            {(unreadCount + pendingCount) > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-destructive text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                {unreadCount + pendingCount}
              </span>
            )}
          </button>

          {/* Theme Toggle */}
          <button
            onClick={() => {
              document.documentElement.classList.add("theme-transition");
              setTheme(nextTheme[theme || "dark"]);
              setTimeout(() => document.documentElement.classList.remove("theme-transition"), 300);
            }}
            className="p-1.5 rounded-lg hover:bg-sidebar-accent transition-colors text-muted-foreground hover:text-foreground"
            title="Toggle Theme"
          >
            {mounted ? (
              (() => {
                const Icon = themeIcons[(theme as keyof typeof themeIcons) || "dark"];
                return <Icon className="w-4 h-4" />;
              })()
            ) : (
              <span className="w-4 h-4 inline-block" />
            )}
          </button>

          {/* Mobile close */}
          {isMobileView && (
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-sidebar-accent transition-colors md:hidden text-muted-foreground">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Prominent New Chat Button */}
      <div className="px-3 pt-3">
        <button
          onClick={() => {
            setSelectedConversation(null);
            setSelectedUser(null);
            router.push("/chat");
            if (isMobileView) onClose();
            toast("Search or select a user to start chatting");
          }}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-xs shadow-sm hover:opacity-90 transition-opacity"
        >
          <Plus className="w-4 h-4" /> New Conversation
        </button>
      </div>

      {/* Search */}
      <div className="p-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search conversations & users..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowSearch(true);
            }}
            onFocus={() => setShowSearch(true)}
            className="w-full pl-8 pr-8 py-2 rounded-xl bg-sidebar-accent text-sidebar-foreground placeholder:text-muted-foreground border border-transparent focus:border-primary/30 focus:ring-1 focus:ring-primary/20 outline-none transition-all text-xs"
          />
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery("");
                setShowSearch(false);
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2"
            >
              <X className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          )}
        </div>
      </div>

      {/* Search Results Overlay */}
      <AnimatePresence>
        {showSearch && searchQuery && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="px-3 pb-3"
          >
            <div className="rounded-xl border border-border bg-popover shadow-lg max-h-60 overflow-y-auto">
              {isSearching ? (
                <div className="p-4 flex items-center justify-center">
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                </div>
              ) : searchResults.length > 0 ? (
                searchResults.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => handleSearchUserClick(u)}
                    className="w-full flex items-center gap-3 p-3 hover:bg-accent transition-colors first:rounded-t-xl last:rounded-b-xl"
                  >
                    <div className="relative">
                      {u.image ? (
                        <img
                          src={u.image}
                          alt={u.displayName}
                          className="w-8 h-8 rounded-full object-cover border border-border"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-xs font-semibold text-foreground">
                          {getInitials(u.displayName)}
                        </div>
                      )}
                      {u.isOnline && (
                        <div className="absolute bottom-0 right-0 w-2 h-2 bg-online rounded-full border-2 border-popover" />
                      )}
                    </div>
                    <div className="text-left min-w-0">
                      <p className="text-xs font-semibold truncate">{u.displayName}</p>
                      <p className="text-[10px] text-muted-foreground truncate">@{u.username}</p>
                    </div>
                  </button>
                ))
              ) : (
                <p className="p-4 text-xs text-muted-foreground text-center">
                  No users found
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Category Navigation Drawer */}
      <div className="px-3 flex gap-1 border-b border-sidebar-border pb-2 mb-1">
        <button
          onClick={() => setNavTab("history")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            navTab === "history" && pathname.startsWith("/chat")
              ? "bg-secondary text-foreground font-semibold"
              : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
          }`}
        >
          <MessageCircle className="w-3.5 h-3.5" />
          History
        </button>
        <button
          onClick={() => {
            setNavTab("favorites");
            toast.info("Favorites filter applied");
          }}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            navTab === "favorites"
              ? "bg-secondary text-foreground font-semibold"
              : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
          }`}
        >
          <Star className="w-3.5 h-3.5" />
          Favorites
        </button>
        <button
          onClick={() => {
            setNavTab("archive");
            toast.info("Archive filter applied");
          }}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            navTab === "archive"
              ? "bg-secondary text-foreground font-semibold"
              : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
          }`}
        >
          <Archive className="w-3.5 h-3.5" />
          Archive
        </button>
        <button
          onClick={() => {
            router.push("/requests");
            if (isMobileView) onClose();
          }}
          className={`flex items-center justify-center px-2 py-1.5 rounded-lg text-xs font-medium transition-colors relative ${
            pathname.startsWith("/requests")
              ? "bg-secondary text-foreground font-semibold"
              : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
          }`}
          title="Requests"
        >
          <UserPlus className="w-3.5 h-3.5" />
          {pendingCount > 0 && (
            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-destructive text-white text-[9px] font-bold rounded-full flex items-center justify-center">
              {pendingCount}
            </span>
          )}
        </button>
      </div>

      {/* Conversations List */}
      {navTab === "archive" && conversations.length > 0 && (
        <div className="px-3 py-1.5 bg-muted/40 border-b border-sidebar-border flex items-center justify-between text-xs">
          <button
            onClick={() => {
              setIsBulkMode(!isBulkMode);
              setSelectedBulkIds([]);
            }}
            className="flex items-center gap-1 font-semibold text-primary hover:underline"
          >
            <CheckSquare className="w-3.5 h-3.5" /> {isBulkMode ? "Cancel Bulk" : "Bulk Select"}
          </button>
          {isBulkMode && (
            <button
              onClick={handleBulkUnarchive}
              disabled={selectedBulkIds.length === 0}
              className="px-2.5 py-1 rounded bg-primary text-primary-foreground font-semibold disabled:opacity-50"
            >
              Unarchive ({selectedBulkIds.length})
            </button>
          )}
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
        {!showSearch && conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
              <MessageCircle className="w-8 h-8 text-primary/50" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">No conversations yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Search for users to start chatting
            </p>
          </div>
        ) : (
          !showSearch &&
          conversations.map((conv, i) => (
            <motion.button
              key={conv.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.03 }}
              onClick={() => {
                if (isBulkMode) {
                  setSelectedBulkIds((prev) =>
                    prev.includes(conv.id) ? prev.filter((id) => id !== conv.id) : [...prev, conv.id]
                  );
                } else {
                  handleConversationClick(conv);
                }
              }}
              className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-200 group ${
                selectedConversation?.id === conv.id && !isBulkMode
                  ? "bg-primary/10 border border-primary/20"
                  : selectedBulkIds.includes(conv.id)
                  ? "bg-primary/20 border border-primary/40"
                  : "hover:bg-sidebar-accent"
              }`}
            >
              <div className="relative flex-shrink-0">
                {conv.participant?.image ? (
                  <img
                    src={conv.participant.image}
                    alt={conv.participant.displayName}
                    className="w-11 h-11 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary">
                    {conv.participant ? getInitials(conv.participant.displayName) : "?"}
                  </div>
                )}
                {conv.participant?.isOnline && (
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-online rounded-full border-2 border-sidebar" />
                )}
              </div>

              <div className="flex-1 min-w-0 text-left">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold truncate text-sidebar-foreground">
                    {conv.participant?.displayName || "Unknown"}
                  </p>
                  {conv.lastMessageAt && (
                    <span className="text-[10px] text-muted-foreground flex-shrink-0 ml-2">
                      {formatDate(conv.lastMessageAt)}
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between mt-0.5">
                  <p className="text-xs text-muted-foreground truncate">
                    {conv.lastMessage
                      ? truncate(conv.lastMessage, 35)
                      : "Start a conversation"}
                  </p>
                  {conv.unreadCount > 0 && (
                    <span className="ml-2 min-w-[18px] h-[18px] bg-primary text-primary-foreground text-[10px] font-bold rounded-full flex items-center justify-center flex-shrink-0 px-1">
                      {conv.unreadCount > 99 ? "99+" : conv.unreadCount}
                    </span>
                  )}
                </div>
              </div>
            </motion.button>
          ))
        )}
      </div>

      {/* Bottom User Panel */}
      <div className="p-3 border-t border-sidebar-border">
        <div className="flex items-center justify-between">
          <button
            onClick={() => {
              router.push("/profile");
              if (isMobileView) onClose();
            }}
            className="flex items-center gap-2.5 flex-1 min-w-0 p-1.5 rounded-xl hover:bg-sidebar-accent transition-colors"
          >
            {user?.image ? (
              <img
                src={user.image as string}
                alt="Profile"
                className="w-8 h-8 rounded-full object-cover border border-border"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-xs font-semibold text-foreground">
                {user?.displayName ? getInitials(user.displayName as string) : "?"}
              </div>
            )}
            <div className="flex flex-col min-w-0 text-left">
              <p className="text-xs font-semibold truncate text-sidebar-foreground">
                {(user?.displayName as string) || (user?.name as string) || "User"}
              </p>
              <p className="text-[10px] text-muted-foreground truncate">
                @{(user?.username as string) || "user"}
              </p>
            </div>
          </button>

          <div className="flex items-center gap-0.5">
            <button
              onClick={() => {
                router.push("/settings");
                if (isMobileView) onClose();
              }}
              className="p-1.5 rounded-lg hover:bg-sidebar-accent transition-colors text-muted-foreground hover:text-foreground"
              title="Settings"
            >
              <Settings className="w-4 h-4" />
            </button>
            <button
              onClick={handleLogout}
              className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive"
              title="Log Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
