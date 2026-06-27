import { unstable_cache } from "next/cache";
import { Api } from "grammy";
import type { UserFromGetMe } from "grammy/types";

let _api: Api | undefined;

export function getApi(): Api {
  if (!_api) {
    const token = process.env.TG_BOT_TOKEN;
    if (!token) throw new Error("TG_BOT_TOKEN is not set");
    _api = new Api(token);
  }
  return _api;
}

export const getMe = unstable_cache(
  async (): Promise<UserFromGetMe> => getApi().getMe(),
  ["telegram-get-me"],
  { revalidate: 86400 }
);

export function getProfileLink(
  botUsername: string,
  userId: string,
  name: string
) {
  const profileUrl = `https://t.me/${botUsername}?start=profile-${userId}`;
  return `<a href="${profileUrl}">${name}</a>`;
}
