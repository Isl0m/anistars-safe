"use client";

import { PropsWithChildren } from "react";
import { WebAppProvider } from "@vkruglikov/react-telegram-web-app";

export function Providers({ children }: PropsWithChildren) {
  return <WebAppProvider>{children}</WebAppProvider>;
}
