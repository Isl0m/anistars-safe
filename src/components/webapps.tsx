"use client";

import {
  useInitData,
  useShowPopup,
  useThemeParams,
} from "@vkruglikov/react-telegram-web-app";

export function WebApps() {
  const [initDataUnsafe, initData] = useInitData();
  const [colorScheme, themeParams] = useThemeParams();
  const showPopup = useShowPopup();

  const color = getComputedStyle(document.documentElement).getPropertyValue(
    "--tg-theme-bg-color"
  );
  if (color) {
    showPopup({ message: color });
  }
  if (themeParams.bg_color) {
    document.documentElement.style.setProperty(
      "--tg-theme-bg-color",
      themeParams.bg_color
    );
  }
  return <h1>{initDataUnsafe?.user?.first_name}</h1>;
}
