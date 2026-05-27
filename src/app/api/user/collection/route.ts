import { NextResponse } from "next/server";

import { getRequiredParam } from "@/lib/api-utils";
import { getUserCollection } from "@/lib/queries";

export async function GET(request: Request) {
  const param = getRequiredParam(request, "id");
  if ("error" in param) return param.error;

  const collection = await getUserCollection(param.value);
  return NextResponse.json({ collection });
}
