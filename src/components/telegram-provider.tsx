"use client";

import { createContext, useContext, useEffect, useState } from "react";
import {
  init,
  on,
  postEvent,
  retrieveLaunchParams,
  retrieveRawInitData,
  swipeBehavior,
  User as TelegramUser,
  viewport,
} from "@telegram-apps/sdk-react";

import { setAuthToken } from "@/lib/api";

export interface ITelegramContext {
  isTelegram: boolean;
  tgUser?: TelegramUser;
  initDataRaw?: string;
  userId?: string;
}

export const TelegramContext = createContext<ITelegramContext>({
  isTelegram: false,
});

function initTelegram(): ITelegramContext {
  if (typeof window === "undefined") return { isTelegram: false };

  try {
    init();
    const lp = retrieveLaunchParams();
    const rawInitData = retrieveRawInitData();

    setAuthToken(rawInitData);

    return {
      tgUser: lp.tgWebAppData?.user,
      userId: lp.tgWebAppData?.user
        ? String(lp.tgWebAppData?.user.id)
        : undefined,
      initDataRaw: rawInitData,
      isTelegram: true,
    };
  } catch (e) {
    console.warn("Not running inside Telegram:", e);
    setAuthToken();
    return { isTelegram: false };
  }
}

export const TelegramProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [ctx] = useState<ITelegramContext>(initTelegram);

  useEffect(() => {
    if (!ctx.isTelegram) return;

    void (async () => {
      try {
        const lp = retrieveLaunchParams();
        const isMobile = ["android", "android_x", "ios"].includes(
          lp.tgWebAppPlatform
        );
        await viewport.mount();
        if (isMobile && !viewport.isFullscreen()) {
          await viewport.requestFullscreen();
        }
        viewport.bindCssVars();
        const syncSafeAreas = () => {
          const top = viewport.safeAreaInsetTop() ?? 0;
          const bottom = viewport.safeAreaInsetBottom() ?? 0;
          document.documentElement.style.setProperty(
            "--safe-area-top",
            `${top + (isMobile ? 40 : 0)}px`
          );
          document.documentElement.style.setProperty(
            "--safe-area-bottom",
            `${bottom + (isMobile ? 16 : 0)}px`
          );
        };
        syncSafeAreas();
        on("safe_area_changed", syncSafeAreas);
        swipeBehavior.mount();
        swipeBehavior.disableVertical();
        postEvent("web_app_set_header_color", { color: "#020817" });
      } catch (e) {
        console.error("Telegram chrome setup failed:", e);
      }
    })();
  }, [ctx.isTelegram]);

  return (
    <TelegramContext.Provider value={ctx}>{children}</TelegramContext.Provider>
  );
};

export const useTelegram = () => useContext(TelegramContext);
