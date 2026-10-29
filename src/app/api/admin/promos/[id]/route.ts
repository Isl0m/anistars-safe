import { NextResponse } from "next/server";

import { logAdminAction, requireOwner } from "@/lib/admin/api";
import { promoInputSchema } from "@/lib/admin/promo-schema";
import {
  deletePromo,
  promoColumns,
  promoSlugTaken,
  updatePromo,
} from "@/lib/admin/queries";
import { errorResponse, parseBody } from "@/lib/api-utils";

type Params = { params: Promise<{ id: string }> };

async function promoId(params: Params["params"]) {
  const id = Number((await params).id);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function PATCH(request: Request, { params }: Params) {
  const owner = await requireOwner(request);
  if ("error" in owner) return owner.error;
  const id = await promoId(params);
  if (!id) return errorResponse("Некорректный id", 400);

  const parsed = await parseBody(request, promoInputSchema);
  if ("error" in parsed) return parsed.error;
  const input = parsed.data;

  if (await promoSlugTaken(input.slug, id)) {
    return errorResponse("Такой промокод уже есть", 409);
  }
  const resolved = await promoColumns(input);
  if ("error" in resolved) return errorResponse(resolved.error, 400);

  if (!(await updatePromo(id, input, resolved.columns))) {
    return errorResponse("Промокод не найден", 404);
  }
  await logAdminAction(owner.ownerId, "promo-update", null, { id, ...input });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request, { params }: Params) {
  const owner = await requireOwner(request);
  if ("error" in owner) return owner.error;
  const id = await promoId(params);
  if (!id) return errorResponse("Некорректный id", 400);

  const slug = await deletePromo(id);
  if (!slug) return errorResponse("Промокод не найден", 404);
  await logAdminAction(owner.ownerId, "promo-delete", null, { id, slug });
  return NextResponse.json({ ok: true });
}
