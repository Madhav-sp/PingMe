"use client";

import { Toaster } from "sonner";
import { useTheme } from "next-themes";

export function ToastProvider() {
  const { theme } = useTheme();

  return (
    <Toaster
      theme={theme as "light" | "dark" | "system"}
      position="top-right"
      richColors
      closeButton
      duration={4000}
      toastOptions={{
        style: {
          borderRadius: "12px",
        },
      }}
    />
  );
}
