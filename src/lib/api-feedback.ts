import { isAxiosError } from "axios";
import { toast } from "sonner";

/** Shape returned by the market routes that hand a job to the bot worker. */
export type MarketActionResponse = {
  ok?: boolean;
  /** The worker did not finish in time; it will report over Telegram. */
  pending?: boolean;
  message?: string;
};

const TIMEOUT_MESSAGE =
  "Сервер не ответил вовремя. Результат придёт в Telegram.";

/**
 * Reads the server's own `error` field out of a rejected request.
 *
 * `e instanceof Error ? e.message : fallback` applied to an axios rejection
 * yields "Request failed with status code 409", so every message the API takes
 * the trouble to write — "Лот уже недоступен", "Некоторые карты заблокированы"
 * — was being thrown away and replaced with that string.
 */
export function getApiErrorMessage(e: unknown, fallback: string): string {
  if (isAxiosError(e)) {
    if (e.code === "ECONNABORTED" || e.code === "ETIMEDOUT") {
      return TIMEOUT_MESSAGE;
    }
    const data = e.response?.data as
      | { error?: unknown; message?: unknown }
      | undefined;
    if (typeof data?.error === "string" && data.error) return data.error;
    if (typeof data?.message === "string" && data.message) return data.message;
    // Never surface axios' own "Request failed with status code N".
    return fallback;
  }
  if (e instanceof Error && e.message) return e.message;
  return fallback;
}

export function showApiError(e: unknown, fallback: string) {
  toast.error(getApiErrorMessage(e, fallback));
}

/**
 * Reports the outcome of a market action, using the bot worker's own wording
 * when it sent any.
 *
 * Returns whether the action is known to have completed, so callers can skip
 * navigating away from a page whose result is not settled yet.
 */
export function showMarketResult(
  data: MarketActionResponse | undefined,
  fallbackSuccess: string
): boolean {
  if (data?.pending) {
    toast.warning(data.message ?? TIMEOUT_MESSAGE);
    return false;
  }
  toast.success(data?.message ?? fallbackSuccess);
  return true;
}
