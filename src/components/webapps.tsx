"use client";

import { useInitData } from "@vkruglikov/react-telegram-web-app";

export function WebApps() {
  const [initDataUnsafe, initData] = useInitData();

  return <h1>{initDataUnsafe?.user?.first_name}</h1>;
}
