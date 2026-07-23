import { NextResponse } from "next/server";

import { getRequiredParam, requireUser } from "@/lib/api-utils";

export async function GET(request: Request) {
  const param = getRequiredParam(request, "id");
  if ("error" in param) return param.error;

  const result = await requireUser(param.value);
  if ("error" in result) return result.error;

  const { user } = result;
  return NextResponse.json({
    id: user.id,
    name: user.name,
    photoUrl: user.photoUrl,
    isCanTrade: !(user.isBlocked || user.isTradeBanned),
  });
}
