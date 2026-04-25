import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

import { CardStats } from "@/db/schema/card";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function capitalize(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function isKey<T extends object>(x: T, k: PropertyKey): k is keyof T {
  return k in x;
}

export function prettyNumbers(data: number) {
  return Intl.NumberFormat("en").format(data);
}

export const getProxyUrl = (originalUrl: string) => {
  if (!originalUrl) return "";
  return originalUrl.replace(
    "https://storage.googleapis.com/anistars",
    "https://anistars.xyz/assets"
  );
};

export const statMapper: Record<CardStats, string> = {
  full: "Фулл",
  "pre-full": "Пре-Фулл",
  basic: "Базовый",
};

export type CardTypes = "upgrade" | "upgradable" | "limited" | "basic";
export const typeMapper: Record<CardTypes, string> = {
  upgrade: "Улучшение",
  upgradable: "Улучшаемый",
  limited: "Лимитированный",
  basic: "Базовый",
};
