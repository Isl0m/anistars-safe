import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";

import { toast } from "@/components/ui/use-toast";

export function useFavouriteCards(userId?: number) {
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
      const method = isFav ? "delete" : "post";
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
    onMutate: async (cardId: string) => {
      const previousIds = queryClient.getQueryData<string[]>([
        "favourite-card-ids",
        userId,
      ]);
      const isFav = previousIds?.includes(cardId);
      queryClient.setQueryData<string[]>(
        ["favourite-card-ids", userId],
        (old = []) =>
          isFav ? old.filter((id) => id !== cardId) : [...old, cardId]
      );
      return { previousIds };
    },
    onSuccess: (newIds) => {
      queryClient.setQueryData(["favourite-card-ids", userId], newIds);
      queryClient.invalidateQueries({ queryKey: ["favourite-cards", userId] });
    },
    onError: (error: Error, _cardId, context) => {
      if (context?.previousIds) {
        queryClient.setQueryData(["favourite-card-ids"], context.previousIds);
      }

      const messages: Record<string, string> = {
        max_reached: "Достигнут лимит избранных карт (8)",
        not_owned: "Вы не владеете этой картой",
      };
      toast({
        title: "Ошибка",
        description: messages[error.message] ?? "Не удалось обновить избранное",
        variant: "destructive",
      });
    },
  });

  return { favouritesQuery, toggleFavourite };
}
