"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";

import { api } from "@/lib/api";
import { showApiError } from "@/lib/api-feedback";
import { MarketPromoSettings } from "@/lib/market-schemas";
import { Access, MANAGED_ROUTES, RouteAccessMap } from "@/lib/route-access";
import { cn } from "@/lib/utils";

import { routeAccessKey, useRouteAccessMap } from "@/hook/use-route-access";
import { Button } from "@/ui/button";
import { Input } from "@/ui/input";

import { Segmented } from "../admin/ui";
import { useAdminAction } from "../admin/use-admin-action";

const OPTIONS: { value: Access; label: string }[] = [
  { value: "admin", label: "Только админы" },
  { value: "all", label: "Все" },
];

const marketPromoKey = ["market-promo-settings"] as const;

export default function AdminSettings() {
  return (
    <>
      <FeatureSection />
      <RouteAccessSection />
      <MarketPromoSection />
    </>
  );
}

const FEATURES: {
  key: "battle" | "clans" | "testMode";
  label: string;
  description: string;
}[] = [
  {
    key: "battle",
    label: "Битвы (PvP)",
    description: "Поиск соперника и бои. Как /onBattle и /offBattle.",
  },
  {
    key: "clans",
    label: "Кланы",
    description:
      "Войны, дуэли и приключение. При открытии сроки сдвигаются на время паузы.",
  },
  {
    key: "testMode",
    label: "Тестовый режим",
    description: "Как /onTestMode и /offTestMode.",
  },
];

const featuresKey = ["admin", "features"] as const;

function FeatureSection() {
  const { data: flags } = useQuery({
    queryKey: featuresKey,
    queryFn: async () => {
      const { data } = await api.get<{
        features: Record<(typeof FEATURES)[number]["key"], boolean>;
      }>("/api/admin/features");
      return data.features;
    },
  });
  const toggle = useAdminAction<{ feature: string; enabled: boolean }>(
    "/api/admin/features",
    { invalidate: [featuresKey] }
  );

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-base font-semibold">Функции бота</h2>
        <p className="text-sm text-muted-foreground">
          Включаются и выключаются сразу для всех игроков.
        </p>
      </div>
      <div className="space-y-2">
        {FEATURES.map((f) => {
          const enabled = flags?.[f.key];
          const pending =
            toggle.isPending && toggle.variables?.feature === f.key;
          return (
            <div
              key={f.key}
              className="flex items-center justify-between gap-3 rounded-lg border bg-card px-4 py-3"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium">{f.label}</p>
                <p className="text-xs text-muted-foreground">{f.description}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {pending && (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                )}
                {enabled === undefined ? (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                ) : (
                  <Segmented
                    value={enabled}
                    disabled={toggle.isPending}
                    options={[
                      { value: true, label: "Вкл" },
                      { value: false, label: "Выкл" },
                    ]}
                    onChange={(v) =>
                      toggle.mutate({ feature: f.key, enabled: v })
                    }
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function RouteAccessSection() {
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
    <section className="space-y-4">
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
    </section>
  );
}

function MarketPromoSection() {
  const { data: saved } = useQuery({
    queryKey: marketPromoKey,
    queryFn: async () => {
      const { data } = await api.get<{ settings: MarketPromoSettings }>(
        "/api/settings/market-promo"
      );
      return data.settings;
    },
  });

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-base font-semibold">Публикация лотов маркета</h2>
        <p className="text-sm text-muted-foreground">
          Новые лоты автоматически публикуются в выбранный чат или канал. Бот
          должен быть добавлен туда с правом отправки сообщений.
        </p>
      </div>
      {saved ? (
        <MarketPromoForm
          key={`${saved.enabled}-${saved.chatId}-${saved.threadId}-${saved.appName}`}
          initial={saved}
        />
      ) : (
        <div className="flex justify-center rounded-lg border bg-card p-6">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      )}
    </section>
  );
}

function MarketPromoForm({ initial }: { initial: MarketPromoSettings }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<MarketPromoSettings>(initial);

  const save = useMutation({
    mutationFn: async (settings: MarketPromoSettings) => {
      const { data } = await api.post<{
        settings: MarketPromoSettings;
        warning?: string;
      }>("/api/settings/market-promo", settings);
      return data;
    },
    onSuccess: ({ settings, warning }) => {
      queryClient.setQueryData(marketPromoKey, settings);
      setForm(settings);
      if (warning) toast.warning(warning);
      else toast.success("Настройки публикаций сохранены");
    },
    onError: (e) => showApiError(e, "Не удалось сохранить настройки"),
  });

  const test = useMutation({
    mutationFn: async (settings: MarketPromoSettings) => {
      const { data } = await api.post<{ chatId: string }>(
        "/api/settings/market-promo/test",
        settings
      );
      return data.chatId;
    },
    onSuccess: (chatId) => {
      setForm((f) => (f.chatId === chatId ? f : { ...f, chatId }));
      toast.success(
        chatId === form.chatId
          ? "Тестовое сообщение отправлено"
          : `Сообщение дошло по ID ${chatId} — нажмите «Сохранить»`
      );
    },
    onError: (e) => showApiError(e, "Не удалось отправить сообщение"),
  });

  const threadValue = form.threadId === null ? "" : String(form.threadId);

  return (
    <div className="space-y-4 rounded-lg border bg-card p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">Публиковать новые лоты</p>
          <p className="text-xs text-muted-foreground">
            {form.enabled ? "Включено" : "Выключено"}
          </p>
        </div>
        <div className="flex overflow-hidden rounded-md border">
          {[
            { value: true, label: "Вкл" },
            { value: false, label: "Выкл" },
          ].map((opt) => (
            <Button
              key={String(opt.value)}
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setForm((f) => ({ ...f, enabled: opt.value }))}
              className={cn(
                "rounded-none",
                form.enabled === opt.value &&
                  "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
              )}
            >
              {opt.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium" htmlFor="promo-chat">
          Чат или канал
        </label>
        <Input
          id="promo-chat"
          value={form.chatId}
          placeholder="-1001234567890 или @channel"
          onChange={(e) =>
            setForm((f) => ({ ...f, chatId: e.target.value.trim() }))
          }
        />
        <p className="text-xs text-muted-foreground">
          ID канала или супергруппы начинается с -100. Можно вставить ссылку
          вида t.me/channel или t.me/c/1234567890/1 — она развернётся сама.
          Проверьте кнопкой «Тест» перед сохранением.
        </p>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium" htmlFor="promo-app">
          Мини-приложение
        </label>
        <Input
          id="promo-app"
          value={form.appName}
          placeholder="allcards"
          onChange={(e) =>
            setForm((f) => ({ ...f, appName: e.target.value.trim() }))
          }
        />
        <p className="text-xs text-muted-foreground">
          Короткое имя из BotFather — часть после имени бота в ссылке t.me/bot/
          <b>имя</b>. Кнопка «Открыть лот» ведёт туда. Оставьте пустым, только
          если у бота настроено главное мини-приложение.
        </p>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium" htmlFor="promo-thread">
          Тема в чате (необязательно)
        </label>
        <Input
          id="promo-thread"
          inputMode="numeric"
          value={threadValue}
          placeholder="ID темы форума"
          onChange={(e) => {
            const raw = e.target.value.trim();
            const parsed = Number(raw);
            setForm((f) => ({
              ...f,
              threadId:
                raw && Number.isInteger(parsed) && parsed > 0 ? parsed : null,
            }));
          }}
        />
      </div>

      <div className="flex gap-2">
        <Button
          type="button"
          className="flex-1"
          disabled={save.isPending}
          onClick={() => save.mutate(form)}
        >
          {save.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Сохранить
        </Button>
        <Button
          type="button"
          variant="outline"
          className="flex-1"
          disabled={!form.chatId || test.isPending}
          onClick={() => test.mutate(form)}
        >
          {test.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Send className="mr-2 h-4 w-4" />
          )}
          Тест
        </Button>
      </div>
    </div>
  );
}
