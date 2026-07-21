import type { Metadata } from "next";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";

import "./globals.css";

import Script from "next/script";

import { cn } from "@/lib/utils";

import { QueryProvider } from "@/components/query-client-provider";
import { TelegramProvider } from "@/components/telegram-provider";
import { Toaster } from "@/ui/sonner";

export const metadata: Metadata = {
  title: "⭐️AniStars | Cards List",
  description: "AniStars is bot for collecting anime cards",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={cn("dark", GeistSans.variable, GeistMono.variable)}
    >
      <meta
        name="viewport"
        content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover"
      />
      <body className={cn("bg-background font-sans text-white antialiased")}>
        <QueryProvider>
          <TelegramProvider>
            <div className="relative h-screen pb-[var(--safe-area-bottom)] pt-[var(--safe-area-top)]">
              {children}
            </div>
            <Toaster position="top-center" richColors />
          </TelegramProvider>
        </QueryProvider>
        {process.env.NODE_ENV === "development" && (
          <>
            <Script
              src="https://cdn.jsdelivr.net/npm/eruda"
              strategy="beforeInteractive"
            />
            <Script id="eruda-init" strategy="afterInteractive">
              {`eruda.init();`}
            </Script>
          </>
        )}
      </body>
    </html>
  );
}
