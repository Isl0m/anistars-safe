import { useQuery } from "@tanstack/react-query";
import { isAxiosError } from "axios";

import { api } from "@/lib/api";

import { useTelegram } from "@/components/telegram-provider";

export const isOwnerKey = (userId: string) =>
  ["admin-session", userId] as const;

/** Whether the current Telegram user is the panel owner (server decides). */
export function useIsOwner() {
  const { userId } = useTelegram();
  return useQuery({
    queryKey: isOwnerKey(userId ?? ""),
    enabled: !!userId,
    staleTime: 5 * 60_000,
    retry: false,
    queryFn: async () => {
      try {
        await api.get("/api/admin/session");
        return true;
      } catch (e) {
        if (isAxiosError(e) && e.response?.status === 403) return false;
        throw e;
      }
    },
  });
}
