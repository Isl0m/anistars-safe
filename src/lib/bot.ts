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

let _mePromise: Promise<UserFromGetMe> | undefined;

export function getMe(): Promise<UserFromGetMe> {
  return (_mePromise ??= getApi()
    .getMe()
    .catch((err) => {
      _mePromise = undefined; // drop failures so the next call retries
      throw err;
    }));
}

export function getProfileLink(
  botUsername: string,
  userId: string,
  name: string
) {
  const profileUrl = `https://t.me/${botUsername}?start=profile-${userId}`;
  return `<a href="${profileUrl}">${name}</a>`;
}
