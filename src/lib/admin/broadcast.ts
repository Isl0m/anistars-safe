import type { InlineKeyboardMarkup } from "grammy/types";
import { z } from "zod";

export const buttonSchema = z.object({
  text: z.string().trim().min(1).max(64),
  url: z
    .string()
    .trim()
    .url()
    .refine((u) => /^(https?|tg):\/\//.test(u), "Только http(s) или tg ссылки"),
});
export type BroadcastButton = z.infer<typeof buttonSchema>;

/** One button per row, the way the bot lays out its own link buttons. */
export function buttonsMarkup(
  buttons: BroadcastButton[]
): InlineKeyboardMarkup | undefined {
  if (!buttons.length) return undefined;
  return {
    inline_keyboard: buttons.map((b) => [{ text: b.text, url: b.url }]),
  };
}

// The chat commands split callback data on commas, so tags stay plain.
export const batchTagSchema = z
  .string()
  .trim()
  .regex(/^[\w-]{3,40}$/, "Тег: 3–40 символов, латиница, цифры, - и _");

export function defaultBatchTag() {
  const d = new Date();
  const pad = (v: number) => String(v).padStart(2, "0");
  return `panel-${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(
    d.getUTCDate()
  )}-${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}`;
}
