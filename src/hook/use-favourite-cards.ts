import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { toast } from "sonner";

import { api } from "@/lib/api";
import { MAX_FAVOURITE_CARDS } from "@/lib/constants";

export function useFavouriteCards(userId?: string) {
  const queryClient = useQueryClient();
  const idsKey = ["favourite-card-ids", userId];

  const favouritesQuery = useQuery({
    queryKey: idsKey,
    queryFn: async () => {
      if (!userId) return [];
      const { data } = await api.get<{ cardIds: string[] }>(
        `/api/user/favourites?ids=1`
      );
      return data.cardIds;
    },
    staleTime: 60_000,
  });

  const toggleFavourite = useMutation({
    mutationFn: async ({
      cardId,
      isFav,
    }: {
      cardId: string;
      isFav: boolean;
    }) => {
      if (isFav) {
        await api.delete("/api/user/favourites", { data: { cardId } });
        return;
      }
      await api.post("/api/user/favourites", { cardId });
    },
    onMutate: async ({ cardId, isFav }) => {
      await queryClient.cancelQueries({ queryKey: idsKey });
      const previous = queryClient.getQueryData<string[]>(idsKey) ?? [];
      queryClient.setQueryData<string[]>(
        idsKey,
        isFav ? previous.filter((id) => id !== cardId) : [...previous, cardId]
      );
      return { previous };
    },
    onError: (error: AxiosError, _vars, context) => {
      if (context) queryClient.setQueryData(idsKey, context.previous);
      const response = error.response?.data as { error?: string } | undefined;
      const messages: Record<string, string> = {
        max_reached: `Достигнут лимит избранных карт (${MAX_FAVOURITE_CARDS})`,
        already_exists: "Карта уже в избранном",
        not_owned: "Вы не владеете этой картой",
      };
      const message = response?.error ? messages[response.error] : undefined;
      toast.error(message ?? "Не удалось обновить избранное");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: idsKey });
      queryClient.invalidateQueries({ queryKey: ["favourite-cards", userId] });
    },
  });

  const toggle = (cardId: string) =>
    toggleFavourite.mutate({
      cardId,
      isFav: (favouritesQuery.data ?? []).includes(cardId),
    });

  return { favouritesQuery, toggleFavourite, toggle };
}
