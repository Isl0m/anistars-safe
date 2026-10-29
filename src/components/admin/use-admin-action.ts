import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { api } from "@/lib/api";
import { showApiError } from "@/lib/api-feedback";

type ActionResponse = { ok?: boolean; pending?: boolean; message?: string };

/**
 * POSTs an admin action and reports the bot's own wording. A 202 means the
 * bot is still on it, which is a warning rather than a success.
 */
export function useAdminAction<V>(
  url: string | ((vars: V) => string),
  {
    invalidate = [],
    onDone,
    method = "post",
  }: {
    invalidate?: readonly (readonly unknown[])[];
    onDone?: (data: ActionResponse, vars: V) => void;
    method?: "post" | "patch" | "delete";
  } = {}
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (vars: V) => {
      const target = typeof url === "function" ? url(vars) : url;
      const { data } =
        method === "delete"
          ? await api.delete<ActionResponse>(target)
          : await api[method]<ActionResponse>(target, vars);
      return data;
    },
    onSuccess: (data, vars) => {
      if (data?.pending) toast.warning(data.message ?? "Выполняется…");
      else toast.success(data?.message ?? "Готово");
      invalidate.forEach((queryKey) =>
        queryClient.invalidateQueries({ queryKey })
      );
      onDone?.(data, vars);
    },
    onError: (e) => showApiError(e, "Не удалось выполнить действие"),
  });
}
