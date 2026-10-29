/**
 * The one Telegram account that may open the admin panel. Bot staff roles
 * (`admin`, `support`) keep their chat commands but do not get the panel.
 */
export const OWNER_TG_ID = process.env.OWNER_TG_ID || "378779106";

export function isOwner(userId: string | undefined) {
  return !!userId && userId === OWNER_TG_ID;
}
