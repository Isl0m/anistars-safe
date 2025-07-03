"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  init,
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
  const [safeAreaInsets, setSafeAreaInsets] = useState<{
    top: number;
    bottom: number;
    left: number;
    right: number;
  }>({ top: 0, bottom: 0, left: 0, right: 0 });
  const [isLoading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        init();
        await viewport.mount();
        if (
          (navigator as any).userAgentData?.mobile &&
          !viewport.isFullscreen()
        ) {
          await viewport.requestFullscreen();
        }
        viewport.bindCssVars();
        console.log(viewport.safeAreaInsetTop());
        console.log(viewport.safeAreaInsets());
        setSafeAreaInsets(viewport.safeAreaInsets());
        swipeBehavior.mount();
        swipeBehavior.disableVertical();
        postEvent("web_app_set_header_color", { color: "#020817" });

        const { initData } = retrieveLaunchParams();
        if (initData && initData.user) {
          setTgUser(initData.user);
        }
      } catch (e) {
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
      {safeAreaInsets && (
        <div className="absolute bottom-0 left-4">
          {JSON.stringify(safeAreaInsets)}
        </div>
      )}
    </TelegramContext.Provider>
  );
};

export const useTelegram = () => useContext(TelegramContext);
