import crypto from "crypto";

export type AuthResult = { id: string; photoUrl?: string };

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

  if (
    !crypto.timingSafeEqual(
      Buffer.from(checkHash, "hex"),
      Buffer.from(hash, "hex")
    )
  ) {
    return null;
  }

  const userStr = params.get("user");
  if (!userStr) return null;

  try {
    const user = JSON.parse(userStr);
    return { id: String(user.id), photoUrl: user.photo_url };
  } catch {
    return null;
  }
}

export function authenticateRequest(request: Request): AuthResult | null {
  const initData = request.headers.get("x-telegram-init-data");
  if (!initData) return null;
  return validateTelegramInitData(initData);
}
