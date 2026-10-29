"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Copy, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import type { PromoInput, PromoRow } from "@/lib/admin/queries";
import { api } from "@/lib/api";

import { Button } from "@/ui/button";
import { Checkbox } from "@/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/ui/dialog";
import { Input } from "@/ui/input";

import {
  ConfirmButton,
  EmptyState,
  Field,
  fmt,
  Panel,
  Section,
  selectClass,
  Spinner,
  Tag,
  textareaClass,
} from "./ui";
import { useAdminAction } from "./use-admin-action";

const promosKey = ["admin", "promos"] as const;

const REWARDS: { value: PromoInput["reward"]; label: string }[] = [
  { value: "coins", label: "🪙 Монеты" },
  { value: "tries", label: "📮 Попытки" },
  { value: "sparkles", label: "✨ Пыльца" },
  { value: "event", label: "Ивент-валюта" },
  { value: "card", label: "🃏 Карта" },
  { value: "pack", label: "📦 Пак" },
];

function rewardLabel(p: PromoRow) {
  const parts: string[] = [];
  const bonus = p.random ? ` (+0…${fmt(p.random)})` : "";
  if (p.coins) parts.push(`${fmt(p.coins)}${bonus} 🪙`);
  if (p.tries) parts.push(`${fmt(p.tries)}${bonus} 📮`);
  if (p.sparkles) parts.push(`${fmt(p.sparkles)}${bonus} ✨`);
  if (p.event) parts.push(`${fmt(p.event)}${bonus} ивент`);
  if (p.cardId) parts.push(`карта ${p.cardName ?? p.cardId}`);
  if (p.cardIds?.length) parts.push(`случайная из ${p.cardIds.length} карт`);
  if (p.packId) parts.push(`пак ${p.packName ?? p.packId}`);
  return parts.join(" + ") || "только текст";
}

function toInput(p: PromoRow): PromoInput {
  const reward: PromoInput["reward"] = p.coins
    ? "coins"
    : p.tries
      ? "tries"
      : p.sparkles
        ? "sparkles"
        : p.event
          ? "event"
          : p.packId
            ? "pack"
            : "card";
  return {
    slug: p.slug,
    reward,
    amount: p.coins ?? p.tries ?? p.sparkles ?? p.event ?? null,
    random: p.random,
    cardSlug: p.cardSlug,
    packId: p.packId,
    isHidden: !!p.isHidden,
    text: p.text,
  };
}

const EMPTY: PromoInput = {
  slug: "",
  reward: "coins",
  amount: null,
  random: null,
  cardSlug: null,
  packId: null,
  isHidden: false,
  text: null,
};

export default function AdminPromos() {
  const [editing, setEditing] = useState<PromoRow | "new" | null>(null);
  const { data, isLoading, isError } = useQuery({
    queryKey: promosKey,
    queryFn: async () =>
      (await api.get<{ promos: PromoRow[] }>("/api/admin/promos")).data.promos,
  });
  const remove = useAdminAction<{ id: number }>(
    ({ id }) => `/api/admin/promos/${id}`,
    { method: "delete", invalidate: [promosKey] }
  );

  return (
    <Section
      title="Промокоды"
      description="Игроки вводят /promocode КОД. Каждый игрок может активировать код один раз."
      action={
        <Button size="sm" onClick={() => setEditing("new")}>
          <Plus className="mr-1.5 h-4 w-4" />
          Создать
        </Button>
      }
    >
      {isLoading && <Spinner />}
      {isError && <EmptyState>Не удалось загрузить промокоды</EmptyState>}
      {data && data.length === 0 && <EmptyState>Промокодов нет</EmptyState>}

      <div className="space-y-2">
        {data?.map((p) => (
          <Panel key={p.id} className="space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    className="flex items-center gap-1 font-mono text-sm font-semibold hover:underline"
                    onClick={() => {
                      navigator.clipboard?.writeText(`/promocode ${p.slug}`);
                      toast.success("Команда скопирована");
                    }}
                  >
                    {p.slug}
                    <Copy className="h-3 w-3 text-muted-foreground" />
                  </button>
                  {p.isHidden && <Tag tone="warn">скрытый</Tag>}
                </div>
                <p className="text-sm">{rewardLabel(p)}</p>
                {p.text && (
                  <p className="line-clamp-2 text-xs text-muted-foreground">
                    {p.text}
                  </p>
                )}
              </div>
              <div className="shrink-0 text-right">
                <p className="text-lg font-semibold tabular-nums">
                  {fmt(p.uses)}
                </p>
                <p className="text-xs text-muted-foreground">активаций</p>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              {!p.cardIds?.length && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setEditing(p)}
                >
                  <Pencil className="mr-1.5 h-3.5 w-3.5" />
                  Изменить
                </Button>
              )}
              <ConfirmButton
                size="sm"
                variant="destructive"
                title={`Удалить ${p.slug}?`}
                description="История активаций тоже удалится, и код можно будет ввести снова, если создать его заново."
                confirmLabel="Удалить"
                pending={remove.isPending && remove.variables?.id === p.id}
                onConfirm={() => remove.mutate({ id: p.id })}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </ConfirmButton>
            </div>
          </Panel>
        ))}
      </div>

      <Dialog
        open={editing !== null}
        onOpenChange={(o) => !o && setEditing(null)}
      >
        <DialogContent className="max-h-[90vh] max-w-md overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editing === "new" ? "Новый промокод" : "Изменить промокод"}
            </DialogTitle>
          </DialogHeader>
          {editing !== null && (
            <PromoForm
              key={editing === "new" ? "new" : editing.id}
              promo={editing === "new" ? null : editing}
              onDone={() => setEditing(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </Section>
  );
}

function PromoForm({
  promo,
  onDone,
}: {
  promo: PromoRow | null;
  onDone: () => void;
}) {
  const [form, setForm] = useState<PromoInput>(promo ? toInput(promo) : EMPTY);
  const { data: catalog } = useQuery({
    queryKey: ["admin", "catalog"],
    staleTime: 5 * 60_000,
    queryFn: async () =>
      (
        await api.get<{ packs: { id: number; name: string }[] }>(
          "/api/admin/catalog"
        )
      ).data,
  });
  const save = useAdminAction<PromoInput>(
    promo ? `/api/admin/promos/${promo.id}` : "/api/admin/promos",
    {
      method: promo ? "patch" : "post",
      invalidate: [promosKey],
      onDone,
    }
  );

  const set = <K extends keyof PromoInput>(k: K, v: PromoInput[K]) =>
    setForm((f) => ({ ...f, [k]: v }));
  const num = (v: string) => {
    const n = Math.floor(Number(v));
    return v.trim() && n > 0 ? n : null;
  };
  const isCurrency = !["card", "pack"].includes(form.reward);

  return (
    <div className="space-y-4">
      <Field label="Код">
        <Input
          value={form.slug}
          placeholder="HALLOWEEN"
          onChange={(e) => set("slug", e.target.value.trim())}
        />
      </Field>
      <Field label="Награда">
        <select
          className={selectClass}
          value={form.reward}
          onChange={(e) =>
            set("reward", e.target.value as PromoInput["reward"])
          }
        >
          {REWARDS.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
      </Field>
      {isCurrency && (
        <div className="grid grid-cols-2 gap-2">
          <Field label="Количество">
            <Input
              inputMode="numeric"
              value={form.amount ?? ""}
              onChange={(e) => set("amount", num(e.target.value))}
            />
          </Field>
          <Field label="Случайный бонус" hint="+0…N к количеству">
            <Input
              inputMode="numeric"
              value={form.random ?? ""}
              onChange={(e) => set("random", num(e.target.value))}
            />
          </Field>
        </div>
      )}
      {form.reward === "card" && (
        <Field label="Slug карты">
          <Input
            value={form.cardSlug ?? ""}
            onChange={(e) => set("cardSlug", e.target.value.trim() || null)}
          />
        </Field>
      )}
      {form.reward === "pack" && (
        <Field label="Пак">
          <select
            className={selectClass}
            value={form.packId ?? ""}
            onChange={(e) => set("packId", num(e.target.value))}
          >
            <option value="">Выберите пак</option>
            {catalog?.packs.map((p) => (
              <option key={p.id} value={p.id}>
                {p.id}. {p.name}
              </option>
            ))}
          </select>
        </Field>
      )}
      <Field label="Текст при активации (необязательно)">
        <textarea
          className={textareaClass}
          value={form.text ?? ""}
          maxLength={2000}
          onChange={(e) => set("text", e.target.value || null)}
        />
      </Field>
      <label className="flex items-center gap-2 text-sm">
        <Checkbox
          checked={form.isHidden}
          onCheckedChange={(v) => set("isHidden", v === true)}
        />
        Скрытый промокод (игрок увидит, что нашёл секрет)
      </label>
      <Button
        className="w-full"
        disabled={!form.slug || save.isPending}
        onClick={() => save.mutate(form)}
      >
        {promo ? "Сохранить" : "Создать"}
      </Button>
    </div>
  );
}
