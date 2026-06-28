"use client";

import { useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useTheme } from "next-themes";
import {
  ArrowLeft,
  Palette,
  Bell,
  Shield,
  Trash2,
  LogOut,
  Save,
  Loader2,
  Sun,
  Moon,
  Monitor,
  Menu,
} from "lucide-react";
import { toast } from "sonner";
import { useChatStore } from "@/stores/useChatStore";

export default function SettingsPage() {
  const { update } = useSession();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { theme, setTheme } = useTheme();
  const { isMobileView, setIsSidebarOpen } = useChatStore();
  const [activeSection, setActiveSection] = useState("profile");

  const { data: profileData } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const res = await fetch("/api/users/me");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const user = profileData?.user;

  const { register, handleSubmit, formState: { isDirty } } = useForm({
    values: {
      displayName: user?.displayName || "",
      username: user?.username || "",
      bio: user?.bio || "",
    },
  });

  const updateProfile = useMutation({
    mutationFn: async (data: Record<string, string>) => {
      const res = await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }
      return res.json();
    },
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      await update({
        username: data.user.username,
        displayName: data.user.displayName,
      });
      toast.success("Profile updated");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Update failed");
    },
  });

  const handleLogout = async () => {
    await signOut({ redirect: false });
    toast.success("Logged out");
    router.push("/login");
  };

  const handleDeleteAccount = async () => {
    if (!confirm("Are you sure you want to delete your account? This action is irreversible.")) return;
    try {
      const res = await fetch("/api/users/me", { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      await signOut({ redirect: false });
      toast.success("Account deleted");
      router.push("/login");
    } catch {
      toast.error("Failed to delete account");
    }
  };

  const sections = [
    { id: "profile", label: "Profile", icon: "👤" },
    { id: "theme", label: "Appearance", icon: "🎨" },
    { id: "notifications", label: "Notifications", icon: "🔔" },
    { id: "privacy", label: "Privacy", icon: "🛡️" },
    { id: "danger", label: "Danger Zone", icon: "⚠️" },
  ];

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="px-6 py-4 border-b border-border bg-card/80 backdrop-blur-xl sticky top-0 z-10 flex items-center gap-3">
        {isMobileView && (
          <button onClick={() => setIsSidebarOpen(true)} className="p-1.5 rounded-lg hover:bg-accent">
            <Menu className="w-5 h-5" />
          </button>
        )}
        <button onClick={() => router.back()} className="p-1.5 rounded-lg hover:bg-accent">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold">Settings</h1>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-6 space-y-6">
        {/* Section Nav */}
        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
          {sections.map((s) => (
            <button
              key={s.id}
              onClick={() => setActiveSection(s.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                activeSection === s.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-card border border-border hover:bg-accent"
              }`}
            >
              <span>{s.icon}</span>
              {s.label}
            </button>
          ))}
        </div>

        {/* Profile Section */}
        {activeSection === "profile" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <form onSubmit={handleSubmit((data) => updateProfile.mutate(data))} className="space-y-4">
              <div className="p-5 rounded-2xl bg-card border border-border space-y-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">Display Name</label>
                  <input {...register("displayName")} className="w-full px-4 py-2.5 rounded-xl bg-background border border-input focus:border-primary outline-none text-sm" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Username</label>
                  <input {...register("username")} className="w-full px-4 py-2.5 rounded-xl bg-background border border-input focus:border-primary outline-none text-sm" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Bio</label>
                  <textarea {...register("bio")} rows={3} maxLength={200} className="w-full px-4 py-2.5 rounded-xl bg-background border border-input focus:border-primary outline-none text-sm resize-none" placeholder="Tell us about yourself..." />
                </div>
              </div>

              {isDirty && (
                <motion.button
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  type="submit"
                  disabled={updateProfile.isPending}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium hover:opacity-90 disabled:opacity-50"
                >
                  {updateProfile.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save Changes
                </motion.button>
              )}
            </form>
          </motion.div>
        )}

        {/* Theme Section */}
        {activeSection === "theme" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="p-5 rounded-2xl bg-card border border-border">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Palette className="w-4 h-4" /> Theme
              </h3>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: "light", label: "Light", Icon: Sun },
                  { id: "dark", label: "Dark", Icon: Moon },
                  { id: "system", label: "System", Icon: Monitor },
                ].map(({ id, label, Icon }) => (
                  <button
                    key={id}
                    onClick={() => {
                      document.documentElement.classList.add("theme-transition");
                      setTheme(id);
                      setTimeout(() => document.documentElement.classList.remove("theme-transition"), 300);
                    }}
                    className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all ${
                      theme === id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:bg-accent"
                    }`}
                  >
                    <Icon className={`w-5 h-5 ${theme === id ? "text-primary" : "text-muted-foreground"}`} />
                    <span className="text-xs font-medium">{label}</span>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* Notifications Section */}
        {activeSection === "notifications" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="p-5 rounded-2xl bg-card border border-border">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Bell className="w-4 h-4" /> Notifications
              </h3>
              <p className="text-sm text-muted-foreground">
                Browser notifications are managed through your browser settings.
              </p>
            </div>
          </motion.div>
        )}

        {/* Privacy Section */}
        {activeSection === "privacy" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="p-5 rounded-2xl bg-card border border-border">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Shield className="w-4 h-4" /> Privacy
              </h3>
              <p className="text-sm text-muted-foreground">
                Your messages are encrypted before being stored. Only you and
                the recipient can read them.
              </p>
            </div>
          </motion.div>
        )}

        {/* Danger Zone */}
        {activeSection === "danger" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
            <div className="p-5 rounded-2xl bg-card border border-destructive/30">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold flex items-center gap-2">
                    <LogOut className="w-4 h-4" /> Logout
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Sign out of your account
                  </p>
                </div>
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 rounded-xl bg-destructive text-destructive-foreground text-sm font-medium hover:opacity-90"
                >
                  Logout
                </button>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-card border border-destructive/30">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold flex items-center gap-2 text-destructive">
                    <Trash2 className="w-4 h-4" /> Delete Account
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Permanently delete your account and all data
                  </p>
                </div>
                <button
                  onClick={handleDeleteAccount}
                  className="px-4 py-2 rounded-xl border border-destructive text-destructive text-sm font-medium hover:bg-destructive/10"
                >
                  Delete
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
