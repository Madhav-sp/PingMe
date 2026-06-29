"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Reply, Copy, Pencil, Forward, Pin, Star, Trash2, Info, X } from "lucide-react";
import { Message } from "@/types";
import { triggerHaptic } from "@/lib/haptics";

interface MessageActionSheetProps {
  isOpen: boolean;
  onClose: () => void;
  message: Message | null;
  currentUserId: string;
  onAction: (action: string, message: Message) => void;
}

export function MessageActionSheet({
  isOpen,
  onClose,
  message,
  currentUserId,
  onAction,
}: MessageActionSheetProps) {
  if (!isOpen || !message) return null;

  const isMe = message.senderId === currentUserId;

  const handleSelect = (action: string) => {
    triggerHaptic("light");
    onAction(action, message);
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0"
        />
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="relative w-full max-w-lg bg-card border-t border-border rounded-t-3xl shadow-2xl p-4 z-10 max-h-[85vh] overflow-y-auto native-scroll"
        >
          {/* Drag Handle */}
          <div className="w-12 h-1.5 bg-muted-foreground/30 rounded-full mx-auto mb-4" />

          {/* Message Preview Snippet */}
          <div className="px-3 py-2.5 mb-4 bg-muted/40 rounded-2xl border border-border/50 max-h-24 overflow-hidden">
            <p className="text-xs font-semibold text-primary mb-0.5">
              {isMe ? "You" : "Contact"}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {message.content || (message.fileName ? `📎 ${message.fileName}` : "Attachment")}
            </p>
          </div>

          {/* Action List */}
          <div className="space-y-1">
            <button
              onClick={() => handleSelect("reply")}
              className="w-full flex items-center justify-between px-4 py-3 rounded-2xl bg-muted/20 hover:bg-accent text-foreground transition-colors font-medium text-sm"
            >
              <span className="flex items-center gap-3">
                <Reply className="w-4 h-4 text-primary" /> Reply
              </span>
            </button>

            <button
              onClick={() => handleSelect("copy")}
              className="w-full flex items-center justify-between px-4 py-3 rounded-2xl bg-muted/20 hover:bg-accent text-foreground transition-colors font-medium text-sm"
            >
              <span className="flex items-center gap-3">
                <Copy className="w-4 h-4 text-primary" /> Copy
              </span>
            </button>

            {isMe && (
              <button
                onClick={() => handleSelect("edit")}
                className="w-full flex items-center justify-between px-4 py-3 rounded-2xl bg-muted/20 hover:bg-accent text-foreground transition-colors font-medium text-sm"
              >
                <span className="flex items-center gap-3">
                  <Pencil className="w-4 h-4 text-primary" /> Edit
                </span>
              </button>
            )}

            <button
              onClick={() => handleSelect("forward")}
              className="w-full flex items-center justify-between px-4 py-3 rounded-2xl bg-muted/20 hover:bg-accent text-foreground transition-colors font-medium text-sm"
            >
              <span className="flex items-center gap-3">
                <Forward className="w-4 h-4 text-primary" /> Forward
              </span>
            </button>

            <button
              onClick={() => handleSelect("star")}
              className="w-full flex items-center justify-between px-4 py-3 rounded-2xl bg-muted/20 hover:bg-accent text-foreground transition-colors font-medium text-sm"
            >
              <span className="flex items-center gap-3">
                <Star className="w-4 h-4 text-amber-500" /> Star
              </span>
            </button>

            <button
              onClick={() => handleSelect("pin")}
              className="w-full flex items-center justify-between px-4 py-3 rounded-2xl bg-muted/20 hover:bg-accent text-foreground transition-colors font-medium text-sm"
            >
              <span className="flex items-center gap-3">
                <Pin className="w-4 h-4 text-primary" /> Pin
              </span>
            </button>

            <button
              onClick={() => handleSelect("info")}
              className="w-full flex items-center justify-between px-4 py-3 rounded-2xl bg-muted/20 hover:bg-accent text-foreground transition-colors font-medium text-sm"
            >
              <span className="flex items-center gap-3">
                <Info className="w-4 h-4 text-muted-foreground" /> Message Info
              </span>
            </button>

            <div className="h-px bg-border my-2" />

            <button
              onClick={() => handleSelect("deleteForMe")}
              className="w-full flex items-center justify-between px-4 py-3 rounded-2xl bg-destructive/10 hover:bg-destructive/20 text-destructive transition-colors font-medium text-sm"
            >
              <span className="flex items-center gap-3">
                <Trash2 className="w-4 h-4" /> Delete for Me
              </span>
            </button>

            {isMe && (
              <button
                onClick={() => handleSelect("deleteForAll")}
                className="w-full flex items-center justify-between px-4 py-3 rounded-2xl bg-destructive/15 hover:bg-destructive/25 text-destructive font-semibold transition-colors text-sm"
              >
                <span className="flex items-center gap-3">
                  <Trash2 className="w-4 h-4" /> Delete for Everyone
                </span>
              </button>
            )}
          </div>

          {/* Cancel Button */}
          <button
            onClick={onClose}
            className="w-full mt-3 py-3.5 rounded-2xl bg-muted hover:bg-accent text-foreground font-semibold text-sm flex items-center justify-center gap-2 transition-colors"
          >
            <X className="w-4 h-4" /> Cancel
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
