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

export interface ITelegramContext {
  tgUser?: TelegramUser;
}

export const TelegramContext = createContext<ITelegramContext>({});

export const TelegramProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [tgUser, setTgUser] = useState<TelegramUser | undefined>(undefined);

  useEffect(() => {
    const fetchData = async () => {
      try {
        init();
        swipeBehavior.mount();
        swipeBehavior.disableVertical();
        postEvent("web_app_set_header_color", { color: "#020817" });
        // await viewport.requestFullscreen();
        const { initData } = retrieveLaunchParams();
        if (initData && initData.user) {
          setTgUser(initData.user);
        }
      } catch (e) {
        setTgUser(undefined);
      }
    };

    fetchData();
  }, []);

  const value = useMemo(() => {
    return { tgUser };
  }, [tgUser]);

  return (
    <TelegramContext.Provider value={value}>
      {children}
    </TelegramContext.Provider>
  );
};

export const useTelegram = () => useContext(TelegramContext);
