import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { SpeedInsights } from "@vercel/speed-insights/next";

import "./globals.css";

import { cn } from "@/lib/utils";

import { TelegramProvider } from "@/components/telegram-provider";

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
      <SpeedInsights />
      <body
        className={cn(
          "min-h-screen bg-background font-sans antialiased",
          fontSans.variable
        )}
      >
        <TelegramProvider>{children}</TelegramProvider>
      </body>
    </html>
  );
}
