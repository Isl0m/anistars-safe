import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

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
const IMAGE_ASSET_BASE =
  process.env.NEXT_PUBLIC_IMAGE_ASSET_BASE ??
  (process.env.NODE_ENV === "production"
    ? "http://127.0.0.1:8080/assets"
    : GCS_ASSET_BASE);

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
