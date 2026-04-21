"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
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
}

export const TelegramContext = createContext<ITelegramContext>({});

export const TelegramProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [tgUser, setTgUser] = useState<ITelegramContext["tgUser"]>();
  const [isLoading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        init();
        const lp = retrieveLaunchParams();
        const isMobile = ["android", "android_x", "ios"].includes(lp.platform);

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

        if (lp.initData && lp.initData.user) {
          setTgUser(lp.initData.user);
        }
      } catch (e) {
        console.error("Error initializing Telegram SDK:", e);
        setTgUser(undefined);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const value = useMemo(() => ({ tgUser }), [tgUser]);

  return (
    <TelegramContext.Provider value={value}>
      {isLoading ? <LoadingScreen /> : children}
    </TelegramContext.Provider>
  );
};

export const useTelegram = () => useContext(TelegramContext);
