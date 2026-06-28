"use client";

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Camera, Calendar, AtSign, Mail, Edit2, Menu, Loader2 } from "lucide-react";
import { useChatStore } from "@/stores/useChatStore";
import { getInitials } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { format } from "date-fns";

export default function ProfilePage() {
  const { isMobileView, setIsSidebarOpen } = useChatStore();
  const router = useRouter();

  const { data, isLoading } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const res = await fetch("/api/users/me");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const user = data?.user;

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border bg-card/80 backdrop-blur-xl flex items-center gap-3 sticky top-0 z-10">
        {isMobileView && (
          <button onClick={() => setIsSidebarOpen(true)} className="p-1.5 rounded-lg hover:bg-accent">
            <Menu className="w-5 h-5" />
          </button>
        )}
        <h1 className="text-xl font-bold">Profile</h1>
        <button
          onClick={() => router.push("/settings")}
          className="ml-auto p-2 rounded-lg hover:bg-accent transition-colors"
        >
          <Edit2 className="w-4 h-4" />
        </button>
      </div>

      <div className="max-w-lg mx-auto px-6 py-8">
        {/* Avatar */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center mb-8"
        >
          <div className="relative group">
            {user?.image ? (
              <img
                src={user.image}
                alt={user.displayName}
                className="w-28 h-28 rounded-full object-cover ring-4 ring-primary/20"
              />
            ) : (
              <div className="w-28 h-28 rounded-full bg-primary/10 flex items-center justify-center text-3xl font-bold text-primary ring-4 ring-primary/20">
                {user ? getInitials(user.displayName) : "?"}
              </div>
            )}
            <button className="absolute bottom-1 right-1 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-opacity">
              <Camera className="w-4 h-4" />
            </button>
          </div>

          <h2 className="text-2xl font-bold mt-4">{user?.displayName}</h2>
          <p className="text-sm text-muted-foreground">@{user?.username}</p>
        </motion.div>

        {/* Info Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-3"
        >
          {user?.bio && (
            <div className="p-4 rounded-2xl bg-card border border-border">
              <p className="text-xs text-muted-foreground mb-1">Bio</p>
              <p className="text-sm">{user.bio}</p>
            </div>
          )}

          <div className="p-4 rounded-2xl bg-card border border-border space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <AtSign className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Username</p>
                <p className="text-sm font-medium">@{user?.username}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Mail className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Email</p>
                <p className="text-sm font-medium">{user?.email}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Calendar className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Joined</p>
                <p className="text-sm font-medium">
                  {user?.createdAt
                    ? format(new Date(user.createdAt), "MMMM d, yyyy")
                    : "Unknown"}
                </p>
              </div>
            </div>
          </div>

          {/* Connected accounts */}
          {user?.accounts && user.accounts.length > 0 && (
            <div className="p-4 rounded-2xl bg-card border border-border">
              <p className="text-xs text-muted-foreground mb-3">
                Connected Accounts
              </p>
              {user.accounts.map(
                (acc: { provider: string }, i: number) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded bg-muted flex items-center justify-center">
                      {acc.provider === "google" ? (
                        <svg className="w-4 h-4" viewBox="0 0 24 24">
                          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                        </svg>
                      ) : (
                        <span className="text-xs">{acc.provider[0].toUpperCase()}</span>
                      )}
                    </div>
                    <span className="text-sm capitalize">{acc.provider}</span>
                    <span className="text-xs text-muted-foreground ml-auto">
                      Connected
                    </span>
                  </div>
                )
              )}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
