import crypto from "crypto";

export type AuthResult = { id: string; photoUrl?: string };

export const INIT_DATA_MAX_AGE_SECONDS = 24 * 60 * 60;

function safeEqualHex(expectedHex: string, actualHex: string): boolean {
  const expected = Buffer.from(expectedHex, "hex");
  const actual = Buffer.from(actualHex, "hex");
  if (expected.length !== actual.length || expected.length === 0) return false;
  return crypto.timingSafeEqual(expected, actual);
}

function validateTelegramInitData(initDataRaw: string): AuthResult | null {
  const botToken = process.env.TG_BOT_TOKEN;
  if (!botToken) return null;

  const params = new URLSearchParams(initDataRaw);
  const hash = params.get("hash");
  if (!hash) return null;

  params.delete("hash");
  const entries = Array.from(params.entries());
  entries.sort(([a], [b]) => a.localeCompare(b));
  const dataCheckString = entries.map(([k, v]) => `${k}=${v}`).join("\n");

  const secretKey = crypto
    .createHmac("sha256", "WebAppData")
    .update(botToken)
    .digest();
  const checkHash = crypto
    .createHmac("sha256", secretKey)
    .update(dataCheckString)
    .digest("hex");

  if (!safeEqualHex(checkHash, hash)) return null;

  const authDate = Number(params.get("auth_date"));
  if (!Number.isFinite(authDate) || authDate <= 0) return null;
  const ageSeconds = Math.floor(Date.now() / 1000) - authDate;
  if (ageSeconds > INIT_DATA_MAX_AGE_SECONDS) return null;

  const userStr = params.get("user");
  if (!userStr) return null;

  const user = JSON.parse(userStr);
  if (!user?.id) return null;
  return { id: String(user.id), photoUrl: user.photo_url };
}

export function authenticateRequest(request: Request): AuthResult | null {
  const initData = request.headers.get("x-telegram-init-data");
  if (!initData) return null;
  try {
    return validateTelegramInitData(initData);
  } catch {
    return null;
  }
}
