"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { on, postEvent } from "@telegram-apps/sdk-react";

export function useTelegramBackButton(fallbackUrl?: string) {
  const router = useRouter();

  useEffect(() => {
    postEvent("web_app_setup_back_button", { is_visible: true });

    const off = on("back_button_pressed", () => {
      if (fallbackUrl) {
        router.replace(fallbackUrl);
      } else {
        router.back();
      }
    });

    return () => {
      off();
      postEvent("web_app_setup_back_button", { is_visible: false });
    };
  }, [router, fallbackUrl]);
}
