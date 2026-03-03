import { NextResponse } from "next/server";

import { getUser } from "@/lib/queries";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id)
    return NextResponse.json({ error: "id param required" }, { status: 400 });
  const user = await getUser(id);
  if (!user)
    return NextResponse.json({ error: "user not found" }, { status: 404 });
  return NextResponse.json({
    user,
  });
}
