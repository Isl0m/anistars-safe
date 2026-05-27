import { NextResponse } from "next/server";

import { getRequiredParam } from "@/lib/api-utils";
import { getUser } from "@/lib/queries";

export async function GET(request: Request) {
  const param = getRequiredParam(request, "id");
  if ("error" in param) return param.error;

  const user = await getUser(param.value);
  if (!user)
    return NextResponse.json({ error: "user not found" }, { status: 404 });
  return NextResponse.json({ user });
}
