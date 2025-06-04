"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  init,
  postEvent,
  retrieveLaunchParams,
  swipeBehavior,
  User as TelegramUser,
  viewport,
} from "@telegram-apps/sdk-react";

import { toast } from "./ui/use-toast";

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

  const requestAppFullscreen = useCallback(async () => {
    try {
      await viewport.requestFullscreen();
    } catch (e) {
      toast({
        title: "Failed to request fullscreen",
        description: JSON.stringify(e),
        variant: "destructive",
      });
    }
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        toast({
          title: "Loading...",
          description: "Please wait while we load your data.",
        });
        init();
        swipeBehavior.mount();
        swipeBehavior.disableVertical();
        postEvent("web_app_set_header_color", { color: "#020817" });

        await requestAppFullscreen();

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

  const value = useMemo(() => ({ tgUser }), [tgUser]);

  return (
    <TelegramContext.Provider value={value}>
      {children}
    </TelegramContext.Provider>
  );
};

export const useTelegram = () => useContext(TelegramContext);
