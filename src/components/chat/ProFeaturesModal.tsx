"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Sparkles,
  Key,
  BarChart3,
  Command,
  Settings,
  BookOpen,
  Check,
  Zap,
  Download,
  Upload,
  Layers,
} from "lucide-react";
import { toast } from "sonner";

export type ProTab =
  | "pricing"
  | "prompts"
  | "analytics"
  | "shortcuts"
  | "settings"
  | "apiKeys";

interface ProFeaturesModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: ProTab;
}

export function ProFeaturesModal({
  isOpen,
  onClose,
  defaultTab = "pricing",
}: ProFeaturesModalProps) {
  const [activeTab, setActiveTab] = useState<ProTab>(defaultTab);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ type: "spring", duration: 0.35 }}
          className="bg-card border border-border w-full max-w-4xl h-[620px] rounded-2xl shadow-2xl flex overflow-hidden text-foreground"
        >
          {/* Sidebar Navigation */}
          <div className="w-64 bg-sidebar border-r border-border p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2.5 px-3 py-2 mb-4">
                <div className="w-7 h-7 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold text-xs shadow-inner">
                  AI
                </div>
                <div>
                  <h3 className="font-semibold text-sm leading-none">Workspace Pro</h3>
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-mono">Personal AI</span>
                </div>
              </div>

              <div className="space-y-1">
                <button
                  onClick={() => setActiveTab("pricing")}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                    activeTab === "pricing"
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  }`}
                >
                  <Sparkles className="w-4 h-4" /> Upgrade to Pro
                </button>
                <button
                  onClick={() => setActiveTab("prompts")}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                    activeTab === "prompts"
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  }`}
                >
                  <BookOpen className="w-4 h-4" /> Prompt Library
                </button>
                <button
                  onClick={() => setActiveTab("analytics")}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                    activeTab === "analytics"
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  }`}
                >
                  <BarChart3 className="w-4 h-4" /> Usage & Analytics
                </button>
                <button
                  onClick={() => setActiveTab("apiKeys")}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                    activeTab === "apiKeys"
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  }`}
                >
                  <Key className="w-4 h-4" /> API Keys & Apps
                </button>
                <button
                  onClick={() => setActiveTab("shortcuts")}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                    activeTab === "shortcuts"
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  }`}
                >
                  <Command className="w-4 h-4" /> Shortcuts
                </button>
                <button
                  onClick={() => setActiveTab("settings")}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                    activeTab === "settings"
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  }`}
                >
                  <Settings className="w-4 h-4" /> Workspace Settings
                </button>
              </div>
            </div>

            <div className="pt-4 border-t border-border">
              <div className="bg-accent/60 rounded-xl p-3">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-semibold">Free Plan</span>
                  <span className="text-[10px] font-mono text-muted-foreground">84% used</span>
                </div>
                <div className="w-full h-1.5 bg-background rounded-full overflow-hidden mb-2">
                  <div className="w-[84%] h-full bg-primary rounded-full" />
                </div>
                <button
                  onClick={() => setActiveTab("pricing")}
                  className="w-full py-1.5 rounded-lg bg-primary text-primary-foreground text-[11px] font-semibold hover:opacity-90 transition-opacity"
                >
                  Upgrade Tier
                </button>
              </div>
            </div>
          </div>

          {/* Main Modal Content Area */}
          <div className="flex-1 flex flex-col h-full bg-background relative overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <h2 className="text-base font-semibold capitalize">
                {activeTab === "apiKeys" ? "API Keys & Integrations" : activeTab}
              </h2>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto p-6">
              {activeTab === "pricing" && (
                <div className="space-y-6">
                  <div className="text-center max-w-md mx-auto mb-6">
                    <h3 className="text-xl font-bold tracking-tight mb-2">Supercharge Your Intelligence</h3>
                    <p className="text-xs text-muted-foreground">Access state-of-the-art Claude 3.5 Sonnet, GPT-4o, unlimited vector search, and priority compute.</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {/* Plus Tier */}
                    <div className="p-5 rounded-2xl border border-border bg-card flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Pro</span>
                          <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-semibold">Popular</span>
                        </div>
                        <div className="text-2xl font-extrabold mb-4">$20 <span className="text-xs font-normal text-muted-foreground">/ month</span></div>
                        <ul className="space-y-2.5 text-xs text-muted-foreground mb-6">
                          <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-primary" /> Unlimited Claude 3.5 Sonnet & GPT-4o</li>
                          <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-primary" /> 100x Context Window (200k tokens)</li>
                          <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-primary" /> Custom Prompt Library & Workspaces</li>
                          <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-primary" /> Priority Voice Messaging & WebRTC</li>
                        </ul>
                      </div>
                      <button
                        onClick={() => toast.success("Redirecting to Stripe secure checkout...")}
                        className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-xs hover:opacity-90 transition-opacity"
                      >
                        Subscribe to Pro
                      </button>
                    </div>

                    {/* Enterprise Tier */}
                    <div className="p-5 rounded-2xl border border-border bg-card flex flex-col justify-between opacity-80 hover:opacity-100 transition-opacity">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Team / Enterprise</span>
                        </div>
                        <div className="text-2xl font-extrabold mb-4">$49 <span className="text-xs font-normal text-muted-foreground">/ user / mo</span></div>
                        <ul className="space-y-2.5 text-xs text-muted-foreground mb-6">
                          <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-primary" /> Dedicated API Keys & Fine-tuning</li>
                          <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-primary" /> SSO / SAML & SOC2 Compliance</li>
                          <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-primary" /> Shared Prompt Library & Analytics</li>
                        </ul>
                      </div>
                      <button
                        onClick={() => toast.info("Contacting Enterprise sales team...")}
                        className="w-full py-2.5 rounded-xl border border-border bg-background hover:bg-accent font-semibold text-xs transition-colors"
                      >
                        Contact Sales
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "prompts" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold">System Prompt Library</h3>
                    <button
                      onClick={() => toast.success("New custom prompt template created")}
                      className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold"
                    >
                      + Create Prompt
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { title: "Senior Code Reviewer", desc: "Strict TypeScript & architecture analyzer with security audits." },
                      { title: "UX Executive", desc: "Linear & Notion inspired design critic focusing on minimalist hierarchy." },
                      { title: "SaaS Copywriter", desc: "High-converting persuasive sales copy and onboarding flow creator." },
                      { title: "Data Scientist", desc: "Python, SQL, and pandas data modeling assistant with visualization tips." },
                    ].map((p, i) => (
                      <div key={i} className="p-3.5 rounded-xl border border-border bg-card hover:border-primary/50 transition-colors cursor-pointer" onClick={() => toast(`Applied "${p.title}" prompt to active workspace`)}>
                        <div className="font-semibold text-xs mb-1">{p.title}</div>
                        <p className="text-[11px] text-muted-foreground line-clamp-2">{p.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === "analytics" && (
                <div className="space-y-6">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-4 rounded-xl border border-border bg-card">
                      <div className="text-[11px] text-muted-foreground mb-1">Total Tokens Used</div>
                      <div className="text-xl font-bold font-mono">148,290</div>
                      <div className="text-[10px] text-emerald-500 mt-1">↑ 12% this week</div>
                    </div>
                    <div className="p-4 rounded-xl border border-border bg-card">
                      <div className="text-[11px] text-muted-foreground mb-1">Compute Time</div>
                      <div className="text-xl font-bold font-mono">4.2 hrs</div>
                      <div className="text-[10px] text-muted-foreground mt-1">Average 1.2s response</div>
                    </div>
                    <div className="p-4 rounded-xl border border-border bg-card">
                      <div className="text-[11px] text-muted-foreground mb-1">Active Models</div>
                      <div className="text-xl font-bold">Claude 3.5</div>
                      <div className="text-[10px] text-primary mt-1">Primary Engine</div>
                    </div>
                  </div>

                  <div className="p-5 rounded-2xl border border-border bg-card">
                    <h4 className="text-xs font-semibold mb-3">Recent Generation History</h4>
                    <div className="space-y-2 text-xs font-mono text-muted-foreground">
                      <div className="flex justify-between py-1 border-b border-border/40"><span>Architecture Audit (ChatApp)</span><span>14.2k tokens</span></div>
                      <div className="flex justify-between py-1 border-b border-border/40"><span>UI Refactor Prompt</span><span>8.5k tokens</span></div>
                      <div className="flex justify-between py-1"><span>Voice Recording Debug</span><span>3.1k tokens</span></div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "apiKeys" && (
                <div className="space-y-5">
                  <div>
                    <h3 className="text-sm font-semibold mb-1">Developer API Keys</h3>
                    <p className="text-xs text-muted-foreground">Connect external apps and custom CLI agents to your PingMe personal workspace.</p>
                  </div>
                  <div className="p-4 rounded-xl border border-border bg-card flex items-center justify-between">
                    <div>
                      <div className="text-xs font-semibold">Default Workspace Key</div>
                      <div className="text-[11px] font-mono text-muted-foreground mt-0.5">pm_live_9a8s7d6f5g4h3j2k1l...</div>
                    </div>
                    <button onClick={() => toast.success("API Key copied to clipboard!")} className="px-3 py-1.5 rounded-lg bg-secondary hover:bg-secondary/80 text-xs font-medium">Copy Key</button>
                  </div>
                  <div className="pt-2">
                    <h4 className="text-xs font-semibold mb-3">Connected Apps</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 rounded-xl border border-border flex items-center gap-3"><Zap className="w-5 h-5 text-amber-500" /><div className="text-xs"><div className="font-semibold">Raycast Extension</div><div className="text-[10px] text-emerald-500">Connected</div></div></div>
                      <div className="p-3 rounded-xl border border-border flex items-center gap-3"><Layers className="w-5 h-5 text-blue-500" /><div className="text-xs"><div className="font-semibold">Linear Sync</div><div className="text-[10px] text-muted-foreground">Optional</div></div></div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "shortcuts" && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold mb-2">Raycast Inspired Shortcuts</h3>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-3 rounded-xl border border-border flex justify-between items-center"><span>Toggle Workspace Search</span><kbd className="px-2 py-0.5 rounded bg-secondary font-mono text-[10px]">⌘ K</kbd></div>
                    <div className="p-3 rounded-xl border border-border flex justify-between items-center"><span>New Conversation</span><kbd className="px-2 py-0.5 rounded bg-secondary font-mono text-[10px]">⌘ N</kbd></div>
                    <div className="p-3 rounded-xl border border-border flex justify-between items-center"><span>Switch AI Model</span><kbd className="px-2 py-0.5 rounded bg-secondary font-mono text-[10px]">⌘ /</kbd></div>
                    <div className="p-3 rounded-xl border border-border flex justify-between items-center"><span>Toggle Sidebar</span><kbd className="px-2 py-0.5 rounded bg-secondary font-mono text-[10px]">⌘ B</kbd></div>
                    <div className="p-3 rounded-xl border border-border flex justify-between items-center"><span>Record Voice Message</span><kbd className="px-2 py-0.5 rounded bg-secondary font-mono text-[10px]">⌥ V</kbd></div>
                    <div className="p-3 rounded-xl border border-border flex justify-between items-center"><span>Open Pro Settings</span><kbd className="px-2 py-0.5 rounded bg-secondary font-mono text-[10px]">⌘ ,</kbd></div>
                  </div>
                </div>
              )}

              {activeTab === "settings" && (
                <div className="space-y-4 text-xs">
                  <div className="p-4 rounded-xl border border-border bg-card space-y-3">
                    <div className="flex items-center justify-between"><div><div className="font-semibold">Export Workspace Data</div><div className="text-[11px] text-muted-foreground">Download all chats in markdown or JSON format.</div></div><button onClick={() => toast.success("Export started")} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary font-medium"><Download className="w-3.5 h-3.5" /> Export</button></div>
                    <div className="border-t border-border pt-3 flex items-center justify-between"><div><div className="font-semibold">Import ChatGPT / Claude History</div><div className="text-[11px] text-muted-foreground">Migrate conversations from external archives.</div></div><button onClick={() => toast("Select zip archive to import")} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary font-medium"><Upload className="w-3.5 h-3.5" /> Import</button></div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
