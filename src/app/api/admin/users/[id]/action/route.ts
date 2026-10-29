import { z } from "zod";

import { requireOwner, runAdminJob } from "@/lib/admin/api";
import { OWNER_TG_ID } from "@/lib/admin/owner";
import { errorResponse, parseBody } from "@/lib/api-utils";

const actionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("user-balance"),
    currency: z.enum(["coins", "sparkles", "astrals", "event", "tries"]),
    amount: z
      .number()
      .int()
      .refine((v) => v !== 0 && Math.abs(v) <= 100_000_000),
    notify: z.boolean().default(true),
  }),
  z.object({ type: z.literal("user-premium"), enabled: z.boolean() }),
  z.object({ type: z.literal("user-ban"), banned: z.boolean() }),
  z.object({
    type: z.literal("user-trade-ban"),
    banned: z.boolean(),
    days: z.number().int().positive().max(3650).optional(),
  }),
  z.object({
    type: z.literal("user-role"),
    role: z.enum(["admin", "support", "basic"]),
  }),
  z.object({ type: z.literal("user-clear-battle") }),
  z.object({ type: z.literal("user-clear-stars") }),
  z.object({
    type: z.literal("user-give-card"),
    cardSlug: z.string().trim().min(1).max(128),
  }),
  z.object({
    type: z.literal("user-give-pack"),
    packId: z.number().int().positive(),
  }),
  z.object({
    type: z.literal("user-give-title"),
    titleId: z.number().int().positive(),
  }),
  z.object({
    type: z.literal("user-message"),
    text: z.string().trim().min(1).max(4000),
  }),
]);

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const owner = await requireOwner(request);
  if ("error" in owner) return owner.error;

  const parsed = await parseBody(request, actionSchema);
  if ("error" in parsed) return parsed.error;

  const { id: userId } = await params;
  const action = parsed.data;
  if (
    userId === OWNER_TG_ID &&
    (action.type === "user-ban" || action.type === "user-role")
  ) {
    return errorResponse("Нельзя менять роль или блокировать владельца", 400);
  }

  return runAdminJob(owner.ownerId, { ...action, userId });
}
