import { z } from "zod";

const optionalInt = z.number().int().positive().max(100_000_000).nullable();

export const promoInputSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(2)
    .max(64)
    .regex(/^\S+$/, "Промокод без пробелов"),
  reward: z.enum(["coins", "tries", "sparkles", "event", "card", "pack"]),
  amount: optionalInt,
  random: optionalInt,
  cardSlug: z.string().trim().max(128).nullable(),
  packId: z.number().int().positive().nullable(),
  isHidden: z.boolean(),
  text: z
    .string()
    .trim()
    .max(2000)
    .nullable()
    .transform((v) => v || null),
});
