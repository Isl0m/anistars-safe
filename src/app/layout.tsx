import type { Metadata } from "next";
import { Inter } from "next/font/google";

import "./globals.css";

import { cn } from "@/lib/utils";

import { TelegramProvider } from "@/components/telegram-provider";
import { Toaster } from "@/ui/toaster";

const fontSans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

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
    <html lang="en" className="dark">
      <meta
        name="viewport"
        content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"
      />
      <body
        className={cn(
          "min-h-screen bg-background font-sans text-white antialiased",
          fontSans.variable
        )}
      >
        <TelegramProvider>{children}</TelegramProvider>
        <Toaster />
      </body>
    </html>
  );
}
