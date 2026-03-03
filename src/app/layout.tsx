import type { Metadata } from "next";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";

import "./globals.css";

import { cn } from "@/lib/utils";

import { QueryProvider } from "@/components/query-client-provider";
import { TelegramProvider } from "@/components/telegram-provider";
import { Toaster } from "@/ui/toaster";

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
        content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"
      />
      <body className={cn("bg-background font-sans text-white antialiased")}>
        <QueryProvider>
          <TelegramProvider>
            <div className="relative h-screen pb-[calc(var(--tg-viewport-safe-area-inset-bottom)+16px)] pt-[calc(var(--tg-viewport-safe-area-inset-top)+40px)]">
              {children}
            </div>
            <Toaster />
          </TelegramProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
