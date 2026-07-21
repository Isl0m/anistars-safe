import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { toast } from "sonner";

import { api } from "@/lib/api";

export function useFavouriteCards(userId?: string) {
  const queryClient = useQueryClient();
  const favouritesQuery = useQuery({
    queryKey: ["favourite-card-ids", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data } = await api.get<{ cardIds: string[] }>(
        `/api/user/favourites?ids=1`
      );
      return data.cardIds;
    },
  });

  const toggleFavourite = useMutation({
    mutationFn: async (cardId: string) => {
      const isFav = favouritesQuery.data?.includes(cardId);
      if (isFav) {
        const { data } = await api.delete<{ favouriteCardIds: string[] }>(
          "/api/user/favourites",
          {
            data: { cardId },
          }
        );
        return data.favouriteCardIds;
      }
      const { data } = await api.post<{ favouriteCardIds: string[] }>(
        "/api/user/favourites",
        {
          cardId,
        }
      );
      return data.favouriteCardIds;
    },
    onSuccess: (newIds) => {
      queryClient.setQueryData(["favourite-card-ids", userId], newIds);
      queryClient.invalidateQueries({ queryKey: ["favourite-cards", userId] });
    },
    onError: (error: AxiosError) => {
      const response = error.response?.data as { error: string };
      const messages: Record<string, string> = {
        max_reached: "Достигнут лимит избранных карт (8)",
        not_owned: "Вы не владеете этой картой",
      };
      toast.error(messages[response.error] ?? "Не удалось обновить избранное");
    },
  });

  return { favouritesQuery, toggleFavourite };
}
