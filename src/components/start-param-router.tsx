"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

import { useTelegram } from "./telegram-provider";

const ROUTES: { pattern: RegExp; path: (id: string) => string }[] = [
  { pattern: /^market[_-](\d+)$/, path: (id) => `/market/${id}` },
];

export function resolveStartParam(startParam: string | undefined) {
  if (!startParam) return null;
  for (const route of ROUTES) {
    const match = startParam.match(route.pattern);
    if (match) return route.path(match[1]);
  }
  return null;
}

export function StartParamRouter() {
  const { startParam } = useTelegram();
  const router = useRouter();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    const target = resolveStartParam(startParam);
    if (target && window.location.pathname !== target) {
      router.replace(target);
    }
  }, [startParam, router]);

  return null;
}
