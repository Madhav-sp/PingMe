"use client";

import { motion } from "framer-motion";
import { MessageCircle, Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col items-center"
      >
        <motion.div
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4"
        >
          <MessageCircle className="w-8 h-8 text-primary" />
        </motion.div>
        <Loader2 className="w-5 h-5 animate-spin text-primary mb-2" />
        <p className="text-sm text-muted-foreground">Loading PingMe...</p>
      </motion.div>
    </div>
  );
}
