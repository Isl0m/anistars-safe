"use client";

import { createContext, useContext, useEffect, useState } from "react";
import {
  init,
  on,
  postEvent,
  retrieveLaunchParams,
  swipeBehavior,
  User as TelegramUser,
  viewport,
} from "@telegram-apps/sdk-react";

import LoadingScreen from "./loading-screen";

export interface ITelegramContext {
  tgUser?: TelegramUser;
  initDataRaw?: string;
}

export const TelegramContext = createContext<ITelegramContext>({});

export const TelegramProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [ctx, setCtx] = useState<ITelegramContext>({});
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      init();
      const lp = retrieveLaunchParams();
      setCtx({ tgUser: lp.initData?.user, initDataRaw: lp.initDataRaw });

      if (lp.initDataRaw) {
        fetch(`${process.env.NEXT_PUBLIC_URL}/api/user/sync`, {
          method: "POST",
          headers: { "x-telegram-init-data": lp.initDataRaw },
        }).catch(() => {});
      }

      void (async () => {
        try {
          const isMobile = ["android", "android_x", "ios"].includes(
            lp.platform
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
    } catch (e) {
      console.error("Error initializing Telegram SDK:", e);
    } finally {
      setReady(true);
    }
  }, []);

  return (
    <TelegramContext.Provider value={ctx}>
      {ready ? children : <LoadingScreen />}
    </TelegramContext.Provider>
  );
};

export const useTelegram = () => useContext(TelegramContext);
