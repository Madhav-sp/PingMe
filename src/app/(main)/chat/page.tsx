"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { MessageCircle, Search, Menu } from "lucide-react";
import { useChatStore } from "@/stores/useChatStore";
import { useSessionRestore } from "@/hooks/useSessionRestore";

export default function ChatPage() {
  const { isMobileView, setIsSidebarOpen } = useChatStore();
  const { restoreLastSession } = useSessionRestore();

  useEffect(() => {
    restoreLastSession();
  }, [restoreLastSession]);

  return (
    <div className="flex-1 flex items-center justify-center bg-background">
      {isMobileView && (
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="absolute top-4 left-4 p-2 rounded-lg bg-card hover:bg-accent transition-colors z-10"
        >
          <Menu className="w-5 h-5" />
        </button>
      )}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="text-center px-8"
      >
        <motion.div
          className="inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-primary/10 mb-6"
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        >
          <MessageCircle className="w-12 h-12 text-primary/50" />
        </motion.div>

        <h2 className="text-2xl font-bold mb-2">
          Welcome to{" "}
          <span className="bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">
            PingMe
          </span>
        </h2>
        <p className="text-muted-foreground max-w-sm mx-auto mb-6">
          Select a conversation from the sidebar or search for users to start
          chatting.
        </p>

        <div className="flex items-center justify-center gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-card border border-border">
            <Search className="w-3 h-3" />
            Search users by username
          </div>
        </div>
      </motion.div>
    </div>
  );
}
