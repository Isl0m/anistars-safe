import { useCallback } from "react";

import { useTelegram } from "./telegram-provider";

const BASE = process.env.NEXT_PUBLIC_URL;

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

type ApiOptions = {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
};

// Single place that builds an authenticated request to our API: prefixes the
// base URL, attaches the Telegram init data + JSON headers, and surfaces the
// server's `{ error }` message as a thrown ApiError on a non-2xx response.
export function useApi() {
  const { initDataRaw } = useTelegram();

  return useCallback(
    async <T = unknown>(path: string, options: ApiOptions = {}): Promise<T> => {
      const { method = "GET", body } = options;

      const headers: Record<string, string> = {};
      if (body !== undefined) headers["Content-Type"] = "application/json";
      if (initDataRaw) headers["x-telegram-init-data"] = initDataRaw;

      const res = await fetch(`${BASE}${path}`, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });

      if (!res.ok) {
        let message = "Request failed";
        try {
          const data = await res.json();
          if (data?.error) message = data.error;
        } catch {
          // non-JSON error body — keep the generic message
        }
        throw new ApiError(message, res.status);
      }

      return res.json() as Promise<T>;
    },
    [initDataRaw]
  );
}
