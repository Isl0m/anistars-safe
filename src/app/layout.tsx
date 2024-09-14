import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

import "./globals.css";

import { cn } from "@/lib/utils";

import { Header } from "@/components/header";
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
      <Analytics />
      <body
        className={cn(
          "min-h-screen bg-background font-sans text-white antialiased",
          fontSans.variable
        )}
      >
        <Header />
        <TelegramProvider>{children}</TelegramProvider>
      </body>
    </html>
  );
}
