import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api";

import { User } from "@/db/schema/user";

import { useTelegram } from "@/components/telegram-provider";

export const currentUserKey = (userId: string) =>
  ["current-user", userId] as const;

export function useCurrentUser() {
  const { userId } = useTelegram();
  return useQuery({
    queryKey: currentUserKey(userId ?? ""),
    enabled: !!userId,
    staleTime: 60_000,
    queryFn: async () => {
      const { data } = await api.get<{ user: User }>(`/api/user`);
      return data.user;
    },
  });
}
