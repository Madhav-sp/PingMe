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
  const { selectedConversation, setSelectedConversation, setSelectedUser, isMobileView } = useChatStore();
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

  const user = session?.user as Record<string, unknown> | undefined;

  // Fetch conversations
  const { data: conversationsData, refetch: refetchConversations } = useQuery({
    queryKey: ["conversations"],
    queryFn: async () => {
      const res = await fetch("/api/conversations");
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    refetchInterval: 30000,
  });

  const conversations: Conversation[] = conversationsData?.conversations || [];

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
    <div className="h-full w-full flex flex-col bg-sidebar border-r border-sidebar-border">
      {/* Header */}
      <div className="p-4 flex items-center justify-between border-b border-sidebar-border">
        <h1 className="text-xl font-bold text-sidebar-foreground">
          Ping<span className="text-primary">Me</span>
        </h1>
        <div className="flex items-center gap-1">
          {/* Connection indicator */}
          <div
            className={`w-2 h-2 rounded-full mr-1 ${
              isConnected ? "bg-online animate-pulse-soft" : "bg-destructive"
            }`}
            title={isConnected ? "Connected" : "Disconnected"}
          />
          
          {/* Notifications */}
          <button
            onClick={() => router.push("/requests")}
            className="relative p-2 rounded-lg hover:bg-sidebar-accent transition-colors"
          >
            <Bell className="w-4 h-4 text-sidebar-foreground" />
            {(unreadCount + pendingCount) > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-destructive text-white text-[10px] font-bold rounded-full flex items-center justify-center">
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
            className="p-2 rounded-lg hover:bg-sidebar-accent transition-colors"
          >
            {mounted ? (
              (() => {
                const Icon = themeIcons[(theme as keyof typeof themeIcons) || "dark"];
                return <Icon className="w-4 h-4 text-sidebar-foreground" />;
              })()
            ) : (
              <span className="w-4 h-4 inline-block" />
            )}
          </button>

          {/* Mobile close */}
          {isMobileView && (
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-sidebar-accent transition-colors md:hidden">
              <X className="w-4 h-4 text-sidebar-foreground" />
            </button>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="p-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowSearch(true);
            }}
            onFocus={() => setShowSearch(true)}
            className="w-full pl-9 pr-8 py-2.5 rounded-xl bg-sidebar-accent text-sidebar-foreground placeholder:text-muted-foreground border border-transparent focus:border-primary/30 focus:ring-1 focus:ring-primary/20 outline-none transition-all text-sm"
          />
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery("");
                setShowSearch(false);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2"
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
                          className="w-9 h-9 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary">
                          {getInitials(u.displayName)}
                        </div>
                      )}
                      {u.isOnline && (
                        <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-online rounded-full border-2 border-popover" />
                      )}
                    </div>
                    <div className="text-left min-w-0">
                      <p className="text-sm font-medium truncate">{u.displayName}</p>
                      <p className="text-xs text-muted-foreground truncate">@{u.username}</p>
                    </div>
                  </button>
                ))
              ) : (
                <p className="p-4 text-sm text-muted-foreground text-center">
                  No users found
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation */}
      <div className="px-3 flex gap-1">
        <button
          onClick={() => {
            router.push("/chat");
            if (isMobileView) onClose();
          }}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors ${
            pathname.startsWith("/chat")
              ? "bg-primary text-primary-foreground"
              : "text-sidebar-foreground hover:bg-sidebar-accent"
          }`}
        >
          <MessageCircle className="w-4 h-4" />
          Chats
        </button>
        <button
          onClick={() => {
            router.push("/requests");
            if (isMobileView) onClose();
          }}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors relative ${
            pathname.startsWith("/requests")
              ? "bg-primary text-primary-foreground"
              : "text-sidebar-foreground hover:bg-sidebar-accent"
          }`}
        >
          <UserPlus className="w-4 h-4" />
          Requests
          {pendingCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-destructive text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {pendingCount}
            </span>
          )}
        </button>
      </div>

      {/* Conversations List */}
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
              onClick={() => handleConversationClick(conv)}
              className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-200 group ${
                selectedConversation?.id === conv.id
                  ? "bg-primary/10 border border-primary/20"
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
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              router.push("/profile");
              if (isMobileView) onClose();
            }}
            className="flex items-center gap-3 flex-1 min-w-0 p-2 rounded-xl hover:bg-sidebar-accent transition-colors"
          >
            {user?.image ? (
              <img
                src={user.image as string}
                alt="Profile"
                className="w-9 h-9 rounded-full object-cover ring-2 ring-primary/30"
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary ring-2 ring-primary/30">
                {user?.displayName ? getInitials(user.displayName as string) : "?"}
              </div>
            )}
            <div className="flex flex-col min-w-0 text-left">
              <p className="text-sm font-medium truncate text-sidebar-foreground">
                {(user?.displayName as string) || (user?.name as string) || "User"}
              </p>
              <p className="text-[10px] text-muted-foreground truncate">
                @{(user?.username as string) || "user"}
              </p>
            </div>
          </button>

          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                router.push("/settings");
                if (isMobileView) onClose();
              }}
              className="p-2 rounded-lg hover:bg-sidebar-accent transition-colors"
            >
              <Settings className="w-4 h-4 text-muted-foreground" />
            </button>
            <button
              onClick={handleLogout}
              className="p-2 rounded-lg hover:bg-destructive/10 transition-colors"
            >
              <LogOut className="w-4 h-4 text-destructive" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
