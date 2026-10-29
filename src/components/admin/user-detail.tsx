"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Copy, ExternalLink, Minus, Plus, Send } from "lucide-react";
import { toast } from "sonner";

import type { Currency, UserRole } from "@/lib/admin/queue";
import { api } from "@/lib/api";

import { useTelegramBackButton } from "@/hook/use-telegram-back-button";
import { Button } from "@/ui/button";
import { Checkbox } from "@/ui/checkbox";
import { Input } from "@/ui/input";

import { UserAvatar } from "../user-avatar";
import { ACTION_LABELS, CURRENCIES, ROLE_LABELS } from "./labels";
import {
  ConfirmButton,
  EmptyState,
  Field,
  fmt,
  fmtDate,
  Panel,
  Section,
  Segmented,
  selectClass,
  Spinner,
  StatTile,
  Tag,
  textareaClass,
} from "./ui";
import { useAdminAction } from "./use-admin-action";

type AdminUser = {
  id: string;
  name: string;
  tgName: string | null;
  tgUserName: string | null;
  photoUrl: string | null;
  type: UserRole;
  coins: number;
  sparkles: number;
  astrals: number;
  event: number;
  tries: number;
  isBlocked: boolean;
  isBotBlocked: boolean;
  isPremium: boolean;
  isTradeBanned: boolean;
  tradeBanExpiresAt: string | null;
  passPoints: number | null;
  passStep: number | null;
  battleStars: number | null;
  battleStarsAllTime: number | null;
  battleWins: number | null;
  battleLoses: number | null;
  battleDraws: number | null;
  battleStatus: string | null;
  clanId: number | null;
  clanName: string | null;
  clanRole: string | null;
  invitedById: string | null;
  invitedByName: string | null;
  titleName: string | null;
  createdAt: string | null;
  lastActivityAt: string | null;
};

type UserDetail = {
  user: AdminUser;
  counts: { cards: number; referrals: number; donated: number; trades: number };
  payments: {
    id: string;
    title: string;
    price: number;
    isPaid: boolean;
    createdAt: string;
    payerId: string | null;
  }[];
  daily: {
    day: string;
    triesSpent: number;
    coinsSpent: number;
    sparklesSpent: number;
    battlesPlayed: number;
  }[];
  logs: {
    id: number;
    action: string;
    details: Record<string, unknown> | null;
    createdAt: string;
  }[];
};

type Catalog = {
  packs: { id: number; name: string }[];
  titles: { id: number; name: string }[];
};

export default function AdminUserDetail({ userId }: { userId: string }) {
  useTelegramBackButton("/admin/users");
  const key = ["admin", "user", userId] as const;
  const { data, isLoading, isError } = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data } = await api.get<UserDetail>(`/api/admin/users/${userId}`);
      return data;
    },
  });

  if (isLoading) return <Spinner />;
  if (isError || !data) return <EmptyState>Игрок не найден</EmptyState>;

  return <UserView data={data} queryKey={key} />;
}

function UserView({
  data,
  queryKey,
}: {
  data: UserDetail;
  queryKey: readonly unknown[];
}) {
  const { user, counts } = data;
  const action = useAdminAction<Record<string, unknown>>(
    `/api/admin/users/${user.id}/action`,
    { invalidate: [queryKey, ["admin", "users"]] }
  );
  const run = (body: Record<string, unknown>, onSuccess?: () => void) =>
    action.mutate(body, { onSuccess });
  const pendingType =
    action.isPending && (action.variables?.type as string | undefined);

  return (
    <>
      <Panel className="space-y-3">
        <div className="flex items-start gap-3">
          <UserAvatar name={user.name} photoUrl={user.photoUrl} size={56} />
          <div className="min-w-0 flex-1 space-y-1">
            <h2 className="truncate text-lg font-semibold">{user.name}</h2>
            <p className="truncate text-sm text-muted-foreground">
              {user.tgName}
              {user.tgUserName ? ` · @${user.tgUserName}` : ""}
            </p>
            <div className="flex flex-wrap gap-1">
              <Tag tone={user.type === "basic" ? "muted" : "info"}>
                {ROLE_LABELS[user.type] ?? user.type}
              </Tag>
              {user.isPremium && <Tag tone="good">Премиум</Tag>}
              {user.isBlocked && <Tag tone="bad">Забанен</Tag>}
              {user.isTradeBanned && (
                <Tag tone="bad">
                  Бан трейдов
                  {user.tradeBanExpiresAt
                    ? ` до ${fmtDate(user.tradeBanExpiresAt, false)}`
                    : ""}
                </Tag>
              )}
              {user.isBotBlocked && <Tag tone="warn">Заблокировал бота</Tag>}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              navigator.clipboard?.writeText(user.id);
              toast.success("ID скопирован");
            }}
          >
            <Copy className="mr-1.5 h-3.5 w-3.5" />
            {user.id}
          </Button>
          {user.tgUserName && (
            <Button variant="outline" size="sm" asChild>
              <a
                href={`https://t.me/${user.tgUserName}`}
                target="_blank"
                rel="noreferrer"
              >
                <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                Открыть в Telegram
              </a>
            </Button>
          )}
        </div>
      </Panel>

      <Section title="Профиль">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <StatTile label="🪙 Монеты" value={fmt(user.coins)} />
          <StatTile label="✨ Пыльца" value={fmt(user.sparkles)} />
          <StatTile label="🔮 Астралы" value={fmt(user.astrals)} />
          <StatTile label="Ивент" value={fmt(user.event)} />
          <StatTile label="📮 Попытки" value={fmt(user.tries)} />
          <StatTile label="Карты" value={fmt(counts.cards)} />
          <StatTile label="Задонатил" value={`${fmt(counts.donated)} ⭐`} />
          <StatTile label="Рефералы" value={fmt(counts.referrals)} />
          <StatTile label="Трейды" value={fmt(counts.trades)} />
          <StatTile
            label="Битвы"
            value={`${fmt(user.battleStars)} ⭐`}
            hint={`${fmt(user.battleWins)}W / ${fmt(user.battleLoses)}L / ${fmt(
              user.battleDraws
            )}D`}
          />
          <StatTile
            label="Пасс"
            value={`шаг ${fmt(user.passStep)}`}
            hint={`${fmt(user.passPoints)} очков`}
          />
          <StatTile
            label="Клан"
            value={user.clanName ?? "—"}
            hint={user.clanRole ?? undefined}
          />
        </div>
        <Panel className="grid gap-1 text-sm sm:grid-cols-2">
          <Row label="Регистрация" value={fmtDate(user.createdAt)} />
          <Row
            label="Последняя активность"
            value={fmtDate(user.lastActivityAt)}
          />
          <Row label="Титул" value={user.titleName ?? "—"} />
          <Row
            label="Пригласил"
            value={
              user.invitedById ? (
                <Link
                  href={`/admin/users/${user.invitedById}`}
                  className="hover:underline"
                >
                  {user.invitedByName ?? user.invitedById}
                </Link>
              ) : (
                "—"
              )
            }
          />
        </Panel>
      </Section>

      <BalanceForm
        pending={pendingType === "user-balance"}
        onSubmit={(currency, amount, notify) =>
          run({ type: "user-balance", currency, amount, notify })
        }
      />

      <GiveForm run={run} pendingType={pendingType || null} />

      <Section title="Модерация">
        <Panel className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <ConfirmButton
              variant={user.isPremium ? "outline" : "default"}
              size="sm"
              title={
                user.isPremium ? "Снять Премиум Пасс?" : "Выдать Премиум Пасс?"
              }
              pending={pendingType === "user-premium"}
              onConfirm={() =>
                run({ type: "user-premium", enabled: !user.isPremium })
              }
            >
              {user.isPremium ? "Снять премиум" : "Выдать премиум"}
            </ConfirmButton>
            <ConfirmButton
              variant={user.isBlocked ? "outline" : "destructive"}
              size="sm"
              title={user.isBlocked ? "Разбанить игрока?" : "Забанить игрока?"}
              description={
                user.isBlocked
                  ? undefined
                  : "Бот перестанет отвечать этому игроку."
              }
              pending={pendingType === "user-ban"}
              onConfirm={() =>
                run({ type: "user-ban", banned: !user.isBlocked })
              }
            >
              {user.isBlocked ? "Разбанить" : "Забанить"}
            </ConfirmButton>
            <ConfirmButton
              variant="outline"
              size="sm"
              title="Очистить битву?"
              description="Удалит текущий PvP-бой и остановит поиск соперника."
              pending={pendingType === "user-clear-battle"}
              onConfirm={() => run({ type: "user-clear-battle" })}
            >
              Очистить битву
            </ConfirmButton>
            <ConfirmButton
              variant="outline"
              size="sm"
              title="Обнулить звёзды битв?"
              description="Игрок получит сообщение о нарушении правил."
              pending={pendingType === "user-clear-stars"}
              onConfirm={() => run({ type: "user-clear-stars" })}
            >
              Обнулить звёзды
            </ConfirmButton>
          </div>

          <TradeBanForm
            banned={user.isTradeBanned}
            pending={pendingType === "user-trade-ban"}
            onSubmit={(banned, days) =>
              run({ type: "user-trade-ban", banned, days })
            }
          />

          <Field label="Роль в боте">
            <Segmented<UserRole>
              value={user.type}
              disabled={pendingType === "user-role"}
              options={[
                { value: "basic", label: "Игрок" },
                { value: "support", label: "Саппорт" },
                { value: "admin", label: "Админ" },
              ]}
              onChange={(role) => run({ type: "user-role", role })}
            />
          </Field>
        </Panel>
      </Section>

      <MessageForm
        pending={pendingType === "user-message"}
        onSubmit={(text, clear) => run({ type: "user-message", text }, clear)}
      />

      <Section title="Платежи">
        {data.payments.length === 0 ? (
          <EmptyState>Платежей нет</EmptyState>
        ) : (
          <Panel className="divide-y p-0">
            {data.payments.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between gap-2 px-4 py-2 text-sm"
              >
                <div className="min-w-0">
                  <p className="truncate">{p.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {fmtDate(p.createdAt)}
                    {p.payerId && p.payerId !== data.user.id
                      ? ` · оплатил ${p.payerId}`
                      : ""}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="tabular-nums">{fmt(p.price)} ⭐</p>
                  <Tag tone={p.isPaid ? "good" : "muted"}>
                    {p.isPaid ? "оплачен" : "не оплачен"}
                  </Tag>
                </div>
              </div>
            ))}
          </Panel>
        )}
      </Section>

      <Section title="Активность за 14 дней">
        {data.daily.length === 0 ? (
          <EmptyState>Нет данных</EmptyState>
        ) : (
          <Panel className="overflow-x-auto p-0">
            <table className="w-full text-sm tabular-nums">
              <thead className="text-xs text-muted-foreground">
                <tr className="border-b">
                  <th className="px-3 py-2 text-left font-normal">День</th>
                  <th className="px-3 py-2 text-right font-normal">📮</th>
                  <th className="px-3 py-2 text-right font-normal">🪙</th>
                  <th className="px-3 py-2 text-right font-normal">✨</th>
                  <th className="px-3 py-2 text-right font-normal">Бои</th>
                </tr>
              </thead>
              <tbody>
                {data.daily.map((d) => (
                  <tr key={d.day} className="border-b last:border-0">
                    <td className="px-3 py-1.5">{fmtDate(d.day, false)}</td>
                    <td className="px-3 py-1.5 text-right">
                      {fmt(d.triesSpent)}
                    </td>
                    <td className="px-3 py-1.5 text-right">
                      {fmt(d.coinsSpent)}
                    </td>
                    <td className="px-3 py-1.5 text-right">
                      {fmt(d.sparklesSpent)}
                    </td>
                    <td className="px-3 py-1.5 text-right">
                      {fmt(d.battlesPlayed)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Panel>
        )}
      </Section>

      <Section title="Действия админа с игроком">
        {data.logs.length === 0 ? (
          <EmptyState>Ничего не меняли</EmptyState>
        ) : (
          <Panel className="divide-y p-0">
            {data.logs.map((log) => (
              <div key={log.id} className="px-4 py-2 text-sm">
                <div className="flex justify-between gap-2">
                  <span>{ACTION_LABELS[log.action] ?? log.action}</span>
                  <span className="text-xs text-muted-foreground">
                    {fmtDate(log.createdAt)}
                  </span>
                </div>
                <p className="truncate text-xs text-muted-foreground">
                  {describeDetails(log.details)}
                </p>
              </div>
            ))}
          </Panel>
        )}
      </Section>
    </>
  );
}

export function describeDetails(details: Record<string, unknown> | null) {
  if (!details) return "";
  return Object.entries(details)
    .filter(([k, v]) => k !== "userId" && v !== undefined && v !== null)
    .map(([k, v]) => `${k}: ${typeof v === "object" ? JSON.stringify(v) : v}`)
    .join(" · ");
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="truncate text-right">{value}</span>
    </div>
  );
}

function BalanceForm({
  pending,
  onSubmit,
}: {
  pending: boolean;
  onSubmit: (currency: Currency, amount: number, notify: boolean) => void;
}) {
  const [currency, setCurrency] = useState<Currency>("coins");
  const [amount, setAmount] = useState("");
  const [notify, setNotify] = useState(true);
  const value = Math.floor(Number(amount.replace(/[\s,]/g, "")));
  const valid = Number.isFinite(value) && value > 0;

  return (
    <Section
      title="Баланс"
      description="Списание не уводит баланс ниже нуля и не считается тратой в статистике."
    >
      <Panel className="space-y-3">
        <select
          className={selectClass}
          value={currency}
          onChange={(e) => setCurrency(e.target.value as Currency)}
          aria-label="Валюта"
        >
          {CURRENCIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
        <Input
          inputMode="numeric"
          placeholder="Количество"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={notify}
            onCheckedChange={(v) => setNotify(v === true)}
          />
          Уведомить игрока
        </label>
        <div className="flex gap-2">
          <Button
            className="flex-1"
            disabled={!valid || pending}
            onClick={() => onSubmit(currency, value, notify)}
          >
            <Plus className="mr-1.5 h-4 w-4" />
            Начислить
          </Button>
          <ConfirmButton
            className="flex-1"
            variant="outline"
            disabled={!valid}
            pending={pending}
            title="Списать?"
            description={`Будет списано ${fmt(value)} — ${
              CURRENCIES.find((c) => c.value === currency)?.label
            }`}
            onConfirm={() => onSubmit(currency, -value, notify)}
          >
            <Minus className="mr-1.5 h-4 w-4" />
            Списать
          </ConfirmButton>
        </div>
      </Panel>
    </Section>
  );
}

function GiveForm({
  run,
  pendingType,
}: {
  run: (body: Record<string, unknown>) => void;
  pendingType: string | null;
}) {
  const [cardQuery, setCardQuery] = useState("");
  const [cardSlug, setCardSlug] = useState("");
  const [packId, setPackId] = useState("");
  const [titleId, setTitleId] = useState("");

  const { data: catalog } = useQuery({
    queryKey: ["admin", "catalog"],
    staleTime: 5 * 60_000,
    queryFn: async () => (await api.get<Catalog>("/api/admin/catalog")).data,
  });
  const { data: cards } = useQuery({
    queryKey: ["admin", "cards", cardQuery],
    enabled: cardQuery.trim().length >= 2 && cardQuery !== cardSlug,
    queryFn: async () =>
      (
        await api.get<{
          cards: { slug: string; name: string; rarity: string }[];
        }>("/api/admin/cards", { params: { q: cardQuery } })
      ).data.cards,
  });

  return (
    <Section title="Выдать">
      <Panel className="space-y-4">
        <Field label="Карта" hint="Найдите по имени или slug, затем выберите">
          <div className="flex gap-2">
            <Input
              value={cardQuery}
              placeholder="Имя или slug карты"
              onChange={(e) => {
                setCardQuery(e.target.value);
                setCardSlug("");
              }}
            />
            <ConfirmButton
              disabled={!cardSlug}
              pending={pendingType === "user-give-card"}
              title="Выдать карту?"
              description={cardSlug}
              onConfirm={() => run({ type: "user-give-card", cardSlug })}
            >
              Выдать
            </ConfirmButton>
          </div>
          {cards && cards.length > 0 && !cardSlug && (
            <ul className="max-h-48 divide-y overflow-y-auto rounded-md border">
              {cards.map((c) => (
                <li key={c.slug}>
                  <button
                    type="button"
                    className="flex w-full justify-between gap-2 px-3 py-1.5 text-left text-sm hover:bg-muted"
                    onClick={() => {
                      setCardSlug(c.slug);
                      setCardQuery(c.slug);
                    }}
                  >
                    <span className="truncate">{c.name}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {c.rarity}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Field>

        <Field label="Пак" hint="Игрок получит сообщение с кнопкой открыть пак">
          <div className="flex gap-2">
            <select
              className={selectClass}
              value={packId}
              onChange={(e) => setPackId(e.target.value)}
            >
              <option value="">Выберите пак</option>
              {catalog?.packs.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.id}. {p.name}
                </option>
              ))}
            </select>
            <Button
              disabled={!packId || pendingType === "user-give-pack"}
              onClick={() =>
                run({ type: "user-give-pack", packId: Number(packId) })
              }
            >
              Выдать
            </Button>
          </div>
        </Field>

        <Field label="Титул">
          <div className="flex gap-2">
            <select
              className={selectClass}
              value={titleId}
              onChange={(e) => setTitleId(e.target.value)}
            >
              <option value="">Выберите титул</option>
              {catalog?.titles.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.id}. {t.name}
                </option>
              ))}
            </select>
            <Button
              disabled={!titleId || pendingType === "user-give-title"}
              onClick={() =>
                run({ type: "user-give-title", titleId: Number(titleId) })
              }
            >
              Выдать
            </Button>
          </div>
        </Field>
      </Panel>
    </Section>
  );
}

function TradeBanForm({
  banned,
  pending,
  onSubmit,
}: {
  banned: boolean;
  pending: boolean;
  onSubmit: (banned: boolean, days?: number) => void;
}) {
  const [days, setDays] = useState("");
  const parsed = Math.floor(Number(days));
  const validDays = days.trim() === "" || (parsed > 0 && parsed <= 3650);

  if (banned) {
    return (
      <Button
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={() => onSubmit(false)}
      >
        Разрешить трейды
      </Button>
    );
  }
  return (
    <Field label="Запрет трейдов" hint="Пусто — навсегда">
      <div className="flex gap-2">
        <Input
          inputMode="numeric"
          placeholder="Дней"
          value={days}
          onChange={(e) => setDays(e.target.value)}
          className="w-28"
        />
        <ConfirmButton
          variant="destructive"
          disabled={!validDays}
          pending={pending}
          title="Запретить трейды?"
          description={days ? `На ${parsed} дн.` : "Навсегда"}
          onConfirm={() => onSubmit(true, days ? parsed : undefined)}
        >
          Запретить
        </ConfirmButton>
      </div>
    </Field>
  );
}

function MessageForm({
  pending,
  onSubmit,
}: {
  pending: boolean;
  onSubmit: (text: string, clear: () => void) => void;
}) {
  const [text, setText] = useState("");
  return (
    <Section
      title="Написать игроку"
      description="Сообщение придёт от бота. Поддерживается HTML: <b>, <i>, <a href>."
    >
      <Panel className="space-y-3">
        <textarea
          className={textareaClass}
          value={text}
          maxLength={4000}
          onChange={(e) => setText(e.target.value)}
          placeholder="Текст сообщения"
        />
        <Button
          disabled={!text.trim() || pending}
          onClick={() => onSubmit(text, () => setText(""))}
        >
          <Send className="mr-1.5 h-4 w-4" />
          Отправить
        </Button>
      </Panel>
    </Section>
  );
}
