"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { UserPlus, Check, X, Loader2, InboxIcon, SendHorizontal, Menu } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useChatStore } from "@/stores/useChatStore";
import { getInitials } from "@/lib/utils";
import type { ChatRequest } from "@/types";

export default function RequestsPage() {
  const [activeTab, setActiveTab] = useState<"received" | "sent">("received");
  const queryClient = useQueryClient();
  const router = useRouter();
  const { isMobileView, setIsSidebarOpen } = useChatStore();

  const { data, isLoading } = useQuery({
    queryKey: ["requests", activeTab, "PENDING"],
    queryFn: async () => {
      const res = await fetch(`/api/requests?type=${activeTab}&status=PENDING`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const requests: ChatRequest[] = data?.requests || [];

  const actionMutation = useMutation({
    mutationFn: async ({ requestId, action }: { requestId: string; action: string }) => {
      const res = await fetch(`/api/requests/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["requests"] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      if (variables.action === "accept") {
        toast.success("Request accepted! You can now chat.");
        if (data.conversationId) {
          router.push(`/chat/${data.conversationId}`);
        }
      } else {
        toast.info("Request declined");
      }
    },
    onError: () => toast.error("Action failed"),
  });

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border bg-card/80 backdrop-blur-xl flex-shrink-0">
        <div className="flex items-center gap-3">
          {isMobileView && (
            <button onClick={() => setIsSidebarOpen(true)} className="p-1.5 rounded-lg hover:bg-accent">
              <Menu className="w-5 h-5" />
            </button>
          )}
          <div>
            <h1 className="text-xl font-bold">Message Requests</h1>
            <p className="text-sm text-muted-foreground">
              Manage your chat requests
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-6 pt-4 flex gap-2">
        <button
          onClick={() => setActiveTab("received")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
            activeTab === "received"
              ? "bg-primary text-primary-foreground"
              : "bg-card border border-border hover:bg-accent"
          }`}
        >
          <InboxIcon className="w-4 h-4" />
          Received
        </button>
        <button
          onClick={() => setActiveTab("sent")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
            activeTab === "sent"
              ? "bg-primary text-primary-foreground"
              : "bg-card border border-border hover:bg-accent"
          }`}
        >
          <SendHorizontal className="w-4 h-4" />
          Sent
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : requests.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-20"
          >
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
              <UserPlus className="w-8 h-8 text-primary/50" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">
              No {activeTab} requests
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {activeTab === "received"
                ? "When someone sends you a request, it will appear here"
                : "Your sent requests will appear here"}
            </p>
          </motion.div>
        ) : (
          <AnimatePresence>
            {requests.map((req, i) => {
              const user = activeTab === "received" ? req.sender : req.receiver;
              return (
                <motion.div
                  key={req.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center gap-4 p-4 rounded-2xl bg-card border border-border hover:border-primary/20 transition-all"
                >
                  <div className="relative">
                    {user.image ? (
                      <img
                        src={user.image}
                        alt={user.displayName}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary">
                        {getInitials(user.displayName)}
                      </div>
                    )}
                    {user.isOnline && (
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-online rounded-full border-2 border-card" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm">{user.displayName}</p>
                    <p className="text-xs text-muted-foreground">
                      @{user.username}
                    </p>
                    {req.message && (
                      <p className="text-xs text-muted-foreground mt-1 truncate italic">
                        &ldquo;{req.message}&rdquo;
                      </p>
                    )}
                  </div>

                  {activeTab === "received" && (
                    <div className="flex items-center gap-2">
                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={() =>
                          actionMutation.mutate({
                            requestId: req.id,
                            action: "accept",
                          })
                        }
                        disabled={actionMutation.isPending}
                        className="p-2.5 rounded-xl bg-primary text-primary-foreground hover:opacity-90 transition-all disabled:opacity-50"
                      >
                        <Check className="w-4 h-4" />
                      </motion.button>
                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={() =>
                          actionMutation.mutate({
                            requestId: req.id,
                            action: "reject",
                          })
                        }
                        disabled={actionMutation.isPending}
                        className="p-2.5 rounded-xl bg-destructive/10 text-destructive hover:bg-destructive/20 transition-all disabled:opacity-50"
                      >
                        <X className="w-4 h-4" />
                      </motion.button>
                    </div>
                  )}

                  {activeTab === "sent" && (
                    <span className="text-xs text-muted-foreground px-3 py-1 rounded-full bg-muted">
                      Pending
                    </span>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
