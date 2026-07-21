"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { api } from "@/lib/api";
import { Access, MANAGED_ROUTES, RouteAccessMap } from "@/lib/route-access";
import { cn } from "@/lib/utils";

import { routeAccessKey, useRouteAccessMap } from "@/hook/use-route-access";
import { Button } from "@/ui/button";

import { Header } from "../header";

const OPTIONS: { value: Access; label: string }[] = [
  { value: "admin", label: "Только админы" },
  { value: "all", label: "Все" },
];

export default function AdminPage() {
  const queryClient = useQueryClient();
  const { data: accessMap } = useRouteAccessMap();

  const mutation = useMutation({
    mutationFn: async (vars: { path: string; access: Access }) => {
      const { data } = await api.post<{ access: RouteAccessMap }>(
        `/api/settings/route-access`,
        vars
      );
      return data.access;
    },
    onSuccess: (map) => {
      queryClient.setQueryData(routeAccessKey, map);
      toast.success("Доступ обновлён");
    },
    onError: () => toast.error("Не удалось обновить доступ"),
  });

  return (
    <div className="flex h-full flex-col">
      <Header title="Админ" />
      <div className="mx-auto w-full max-w-lg space-y-4 p-4 md:container">
        <div>
          <h2 className="text-base font-semibold">Доступ к разделам</h2>
          <p className="text-sm text-muted-foreground">
            Кто может открывать раздел. Меняется мгновенно для всех.
          </p>
        </div>

        <div className="space-y-2">
          {MANAGED_ROUTES.map((route) => {
            const current = accessMap[route.path] ?? "all";
            const pending =
              mutation.isPending && mutation.variables?.path === route.path;

            return (
              <div
                key={route.path}
                className="flex items-center justify-between rounded-lg border bg-card px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium">{route.label}</p>
                  <p className="text-xs text-muted-foreground">{route.path}</p>
                </div>

                <div className="flex items-center gap-2">
                  {pending && (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  )}
                  <div className="flex overflow-hidden rounded-md border">
                    {OPTIONS.map((opt) => (
                      <Button
                        key={opt.value}
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={mutation.isPending}
                        onClick={() =>
                          current !== opt.value &&
                          mutation.mutate({
                            path: route.path,
                            access: opt.value,
                          })
                        }
                        className={cn(
                          "rounded-none",
                          current === opt.value &&
                            "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
                        )}
                      >
                        {opt.label}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
