import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/providers/AuthProvider";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { QueryProvider } from "@/providers/QueryProvider";
import { ToastProvider } from "@/providers/ToastProvider";
import { PWAProvider } from "@/components/pwa/PWAProvider";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0f172a" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "PingMe — Modern Chat Application",
  description:
    "A beautiful, real-time chat application with end-to-end encryption, voice & video calls, and modern UI.",
  keywords: ["chat", "messaging", "real-time", "encrypted", "pingme", "pwa"],
  authors: [{ name: "PingMe" }],
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "PingMe",
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    title: "PingMe — Modern Chat Application",
    description: "Chat securely with friends in real-time",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`} suppressHydrationWarning>
        <ThemeProvider>
          <AuthProvider>
            <QueryProvider>
              <PWAProvider>
                {children}
              </PWAProvider>
              <ToastProvider />
            </QueryProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
