import { NextResponse } from "next/server";

import { updateUserPhotoUrl } from "@/lib/queries";
import { authenticateRequest } from "@/lib/telegram-auth";

export async function POST(request: Request) {
  const auth = authenticateRequest(request);
  if (!auth) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  await updateUserPhotoUrl(auth.id, auth.photoUrl);

  return NextResponse.json({ success: true });
}
