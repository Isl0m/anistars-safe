import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

import { Technique } from "@/db/schema/card";
import { Filter } from "@/components/get-filter-options";

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

const GCS_ASSET_BASE = "https://storage.googleapis.com/anistars";
// const IMAGE_ASSET_BASE =
//   process.env.NEXT_PUBLIC_IMAGE_ASSET_BASE ??
//   (process.env.NODE_ENV === "production"
//     ? "http://127.0.0.1:8080/assets"
//     : GCS_ASSET_BASE);
const IMAGE_ASSET_BASE = GCS_ASSET_BASE;

function replaceAssetBase(originalUrl: string, assetBase: string) {
  if (!originalUrl) return "";
  if (!originalUrl.startsWith(GCS_ASSET_BASE)) return originalUrl;

  return `${assetBase}${originalUrl.slice(GCS_ASSET_BASE.length)}`;
}

export const getImageProxyUrl = (originalUrl: string) =>
  replaceAssetBase(originalUrl, IMAGE_ASSET_BASE);

export type CardTypes = "upgrade" | "upgradable" | "limited" | "basic";

export const statMapper: Record<string, string> = {
  full: "Фулл",
  "pre-full": "Пре-Фулл",
  basic: "Базовый",
};

export const typeMapper: Record<CardTypes, string> = {
  limited: "Лимитированный",
  basic: "Базовый",
  upgradable: "Улучшаемый",
  upgrade: "Улучшение",
};

export function timeAgo(date: string | Date): string {
  const now = new Date();
  const seconds = Math.floor((now.getTime() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return "только что";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} мин. назад`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ч. назад`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} дн. назад`;
  return new Date(date).toLocaleDateString("ru-RU");
}

export const parseTechnique = (technique: Technique) => {
  const power = technique.power && `⚔️${Math.round(technique.power * 100)}%`;
  const heal = technique.heal && `♥️${Math.round(technique.heal * 100)}%`;
  const dodge = technique.dodge && `💨 Уклон`;
  const reflection = technique.reflection && `🪞 Отражение`;
  const techniqueText =
    power && heal ? `${power} ${heal}` : power || heal || dodge || reflection;
  return `${techniqueText} | ${technique.slug}`;
};

export function parseFilter(searchParams: URLSearchParams): Filter | undefined {
  const raw = searchParams.get("filter");
  if (!raw) return undefined;
  try {
    return JSON.parse(raw) as Filter;
  } catch {
    return undefined;
  }
}
