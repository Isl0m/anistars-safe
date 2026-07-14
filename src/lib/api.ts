import axios from "axios";

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_URL,
  timeout: 15_000,
});

export function setAuthToken(token?: string) {
  if (token) {
    api.defaults.headers.common["x-telegram-init-data"] = token;
  } else {
    delete api.defaults.headers.common["x-telegram-init-data"];
  }
}
