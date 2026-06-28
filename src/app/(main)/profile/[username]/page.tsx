"use client";

import { use } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { MessageSquarePlus, ArrowLeft, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { getInitials } from "@/lib/utils";
import { format } from "date-fns";

export default function UserProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = use(params);
  const router = useRouter();

  const { data, isLoading } = useQuery({
    queryKey: ["user", username],
    queryFn: async () => {
      const res = await fetch(`/api/users/search?q=${username}`);
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      return data.users?.find(
        (u: { username: string }) => u.username === username
      );
    },
  });

  const sendRequestMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ receiverId: data.id }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }
      return res.json();
    },
    onSuccess: (result) => {
      if (result.autoAccepted) {
        toast.success("Already had a pending request — auto-accepted!");
        router.push(`/chat/${result.conversationId}`);
      } else {
        toast.success("Message request sent!");
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to send request");
    },
  });

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center">
        <p className="text-lg font-medium">User not found</p>
        <button
          onClick={() => router.back()}
          className="mt-4 text-sm text-primary hover:underline"
        >
          Go back
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="px-6 py-4 border-b border-border bg-card/80 backdrop-blur-xl sticky top-0 z-10">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
      </div>

      <div className="max-w-lg mx-auto px-6 py-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center text-center"
        >
          {data.image ? (
            <img
              src={data.image}
              alt={data.displayName}
              className="w-28 h-28 rounded-full object-cover ring-4 ring-primary/20"
            />
          ) : (
            <div className="w-28 h-28 rounded-full bg-primary/10 flex items-center justify-center text-3xl font-bold text-primary ring-4 ring-primary/20">
              {getInitials(data.displayName)}
            </div>
          )}

          <h2 className="text-2xl font-bold mt-4">{data.displayName}</h2>
          <p className="text-sm text-muted-foreground">@{data.username}</p>

          {data.bio && (
            <p className="text-sm text-muted-foreground mt-3 max-w-xs">
              {data.bio}
            </p>
          )}

          <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
            <span
              className={`w-2 h-2 rounded-full ${
                data.isOnline ? "bg-online" : "bg-muted-foreground"
              }`}
            />
            {data.isOnline ? "Online" : "Offline"}
            <span className="mx-1">•</span>
            Joined {format(new Date(data.createdAt), "MMM yyyy")}
          </div>

          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => sendRequestMutation.mutate()}
            disabled={sendRequestMutation.isPending}
            className="mt-6 flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-medium hover:opacity-90 transition-all disabled:opacity-50"
          >
            {sendRequestMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <MessageSquarePlus className="w-4 h-4" />
            )}
            Send Message Request
          </motion.button>
        </motion.div>
      </div>
    </div>
  );
}
