import { NextResponse } from "next/server";

import { requireOwner } from "@/lib/admin/api";
import { getAdminUser } from "@/lib/admin/queries";
import { errorResponse } from "@/lib/api-utils";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const owner = await requireOwner(request);
  if ("error" in owner) return owner.error;

  const { id } = await params;
  const data = await getAdminUser(id);
  if (!data) return errorResponse("Пользователь не найден", 404);
  return NextResponse.json(data);
}
