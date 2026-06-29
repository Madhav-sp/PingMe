"use client";

import { SocketProvider } from "@/providers/SocketProvider";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { CallModal } from "@/components/chat/CallModal";
import { useChatStore } from "@/stores/useChatStore";
import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";

export function MainLayoutClient({ children }: { children: React.ReactNode }) {
  const { isMobileView, setIsMobileView, isSidebarOpen, setIsSidebarOpen } =
    useChatStore();

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobileView(mobile);
      if (!mobile) setIsSidebarOpen(true);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, [setIsMobileView, setIsSidebarOpen]);

  return (
    <SocketProvider>
      <div className="h-full w-full flex overflow-hidden bg-background">
        <CallModal />
        {/* Sidebar */}
        <AnimatePresence mode="wait">
          {(isSidebarOpen || !isMobileView) && (
            <>
              {/* Mobile overlay */}
              {isMobileView && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden"
                  onClick={() => setIsSidebarOpen(false)}
                />
              )}
              <motion.div
                initial={isMobileView ? { x: -320 } : false}
                animate={{ x: 0 }}
                exit={isMobileView ? { x: -320 } : undefined}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className={`${
                  isMobileView
                    ? "fixed left-0 top-0 bottom-0 z-50 w-80"
                    : "relative w-80 flex-shrink-0"
                } h-full`}
              >
                <AppSidebar onClose={() => setIsSidebarOpen(false)} />
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
          {children}
        </div>
      </div>
    </SocketProvider>
  );
}
