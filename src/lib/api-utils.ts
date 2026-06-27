import { NextResponse } from "next/server";

import { updateUserPhotoUrl } from "@/lib/queries";
import { authenticateRequest, AuthResult } from "@/lib/telegram-auth";

export function errorResponse(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}

export function getRequiredParam(request: Request, param: string) {
  const { searchParams } = new URL(request.url);
  const value = searchParams.get(param);
  if (!value) {
    return { error: errorResponse(`${param} param required`, 400) };
  }
  return { value };
}

// Authenticates the caller via Telegram init data and refreshes their cached
// photo, then returns the auth result — or an `error` response the route can
// return directly. Centralizes the auth boilerplate every mutation route needs.
export async function requireAuth(
  request: Request
): Promise<{ auth: AuthResult } | { error: NextResponse }> {
  const auth = authenticateRequest(request);
  if (!auth) {
    return { error: errorResponse("Unauthorized", 401) };
  }
  await updateUserPhotoUrl(auth.id, auth.photoUrl);
  return { auth };
}
