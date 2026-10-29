"use client";

import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Eye,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Send,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";

import type { BroadcastButton } from "@/lib/admin/broadcast";
import type { BroadcastSummary } from "@/lib/admin/queries";
import type { BroadcastAudience } from "@/lib/admin/queue";
import { api } from "@/lib/api";
import { showApiError } from "@/lib/api-feedback";
import { cn } from "@/lib/utils";

import { Button } from "@/ui/button";
import { Input } from "@/ui/input";

import { AUDIENCES } from "./labels";
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
  Tag,
  textareaClass,
} from "./ui";
import { useAdminAction } from "./use-admin-action";

type QueueState = {
  counts: Record<string, number> | null;
  paused: boolean | null;
};

const listKey = ["admin", "broadcasts"] as const;

export default function AdminBroadcast() {
  return (
    <>
      <Composer />
      <QueuePanel />
    </>
  );
}

function useAudienceCounts() {
  return useQuery({
    queryKey: ["admin", "audience"],
    staleTime: 60_000,
    queryFn: async () =>
      (
        await api.get<{ counts: Record<BroadcastAudience, number> }>(
          "/api/admin/broadcasts/audience",
          { timeout: 30_000 }
        )
      ).data.counts,
  });
}

function AudiencePicker({
  value,
  onChange,
}: {
  value: BroadcastAudience;
  onChange: (v: BroadcastAudience) => void;
}) {
  const { data: counts } = useAudienceCounts();
  return (
    <Field label="Кому" hint="Без забаненных и тех, кто заблокировал бота">
      <select
        className={selectClass}
        value={value}
        onChange={(e) => onChange(e.target.value as BroadcastAudience)}
      >
        {AUDIENCES.map((a) => (
          <option key={a.value} value={a.value}>
            {a.label}
            {counts ? ` — ${fmt(counts[a.value])}` : ""}
          </option>
        ))}
      </select>
    </Field>
  );
}

function Composer() {
  const [mode, setMode] = useState<"copy" | "forward">("copy");
  return (
    <Section
      title="Новая рассылка"
      description="Сначала отправьте себе предпросмотр — именно это сообщение получат игроки."
    >
      <Panel className="space-y-4">
        <Segmented
          value={mode}
          onChange={setMode}
          options={[
            { value: "copy", label: "Написать" },
            { value: "forward", label: "Переслать пост" },
          ]}
        />
        {mode === "copy" ? <ComposeForm /> : <ForwardForm />}
      </Panel>
    </Section>
  );
}

function useStartBroadcast(onStarted: () => void) {
  return useAdminAction<Record<string, unknown>>("/api/admin/broadcasts", {
    invalidate: [listKey],
    onDone: onStarted,
  });
}

function ComposeForm() {
  const [text, setText] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [buttons, setButtons] = useState<BroadcastButton[]>([]);
  const [preview, setPreview] = useState<{ messageId: number } | null>(null);
  const [audience, setAudience] = useState<BroadcastAudience>("all");
  const [batchTag, setBatchTag] = useState("");
  const { data: counts } = useAudienceCounts();

  // Anything edited after the preview makes it stale.
  const edit =
    <T,>(set: (v: T) => void) =>
    (v: T) => {
      set(v);
      setPreview(null);
    };

  const sendPreview = useMutation({
    mutationFn: async () => {
      const form = new FormData();
      form.set("text", text);
      form.set("photoUrl", photo ? "" : photoUrl);
      form.set("buttons", JSON.stringify(buttons));
      if (photo) form.set("photo", photo);
      const { data } = await api.post<{ messageId: number }>(
        "/api/admin/broadcasts/preview",
        form,
        { timeout: 30_000 }
      );
      return data;
    },
    onSuccess: (data) => {
      setPreview({ messageId: data.messageId });
      toast.success("Предпросмотр отправлен вам в чат с ботом");
    },
    onError: (e) => showApiError(e, "Не удалось отправить предпросмотр"),
  });

  const start = useStartBroadcast(() => {
    setPreview(null);
    setBatchTag("");
  });

  const filledButtons = buttons.every((b) => b.text.trim() && b.url.trim());
  const canPreview = (text.trim() || photo || photoUrl.trim()) && filledButtons;
  const recipients = counts?.[audience];

  return (
    <div className="space-y-4">
      <Field
        label="Текст"
        hint="HTML: <b>жирный</b>, <i>курсив</i>, <a href='…'>ссылка</a>, <tg-spoiler>. С фото — до 1024 символов."
      >
        <textarea
          className={cn(textareaClass, "min-h-[140px]")}
          value={text}
          maxLength={4096}
          onChange={(e) => edit(setText)(e.target.value)}
          placeholder="Текст рассылки"
        />
      </Field>

      <Field
        label="Фото (необязательно)"
        hint="Файл до 10 МБ или ссылка на картинку"
      >
        <div className="space-y-2">
          <Input
            type="file"
            accept="image/*"
            className="file:text-foreground"
            onChange={(e) => edit(setPhoto)(e.target.files?.[0] ?? null)}
          />
          {!photo && (
            <Input
              value={photoUrl}
              placeholder="https://…/image.jpg"
              onChange={(e) => edit(setPhotoUrl)(e.target.value.trim())}
            />
          )}
        </div>
      </Field>

      <Field label="Кнопки-ссылки">
        <div className="space-y-2">
          {buttons.map((b, i) => (
            <div key={i} className="flex gap-2">
              <Input
                value={b.text}
                placeholder="Текст"
                className="w-2/5"
                onChange={(e) =>
                  edit(setButtons)(
                    buttons.map((x, j) =>
                      j === i ? { ...x, text: e.target.value } : x
                    )
                  )
                }
              />
              <Input
                value={b.url}
                placeholder="https://t.me/…"
                onChange={(e) =>
                  edit(setButtons)(
                    buttons.map((x, j) =>
                      j === i ? { ...x, url: e.target.value.trim() } : x
                    )
                  )
                }
              />
              <Button
                variant="ghost"
                size="icon"
                aria-label="Убрать кнопку"
                onClick={() =>
                  edit(setButtons)(buttons.filter((_, j) => j !== i))
                }
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
          {buttons.length < 8 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                edit(setButtons)([...buttons, { text: "", url: "" }])
              }
            >
              <Plus className="mr-1.5 h-4 w-4" />
              Добавить кнопку
            </Button>
          )}
        </div>
      </Field>

      <Button
        variant={preview ? "outline" : "default"}
        className="w-full"
        disabled={!canPreview || sendPreview.isPending}
        onClick={() => sendPreview.mutate()}
      >
        <Eye className="mr-2 h-4 w-4" />
        {preview ? "Отправить предпросмотр ещё раз" : "Предпросмотр себе"}
      </Button>

      <div
        className={cn(
          "space-y-4 rounded-md border border-dashed p-3",
          !preview && "opacity-50"
        )}
      >
        <AudiencePicker value={audience} onChange={setAudience} />
        <Field
          label="Тег (необязательно)"
          hint="Для статистики, по умолчанию panel-дата"
        >
          <Input
            value={batchTag}
            placeholder="halloween-2026"
            onChange={(e) => setBatchTag(e.target.value.trim())}
          />
        </Field>
        <ConfirmButton
          className="w-full"
          disabled={!preview}
          pending={start.isPending}
          title="Запустить рассылку?"
          description={`Сообщение из предпросмотра получат ${
            recipients !== undefined ? fmt(recipients) : "все выбранные"
          } игроков. Остановить можно паузой очереди.`}
          confirmLabel="Разослать"
          onConfirm={() =>
            preview &&
            start.mutate({
              mode: "copy",
              messageId: preview.messageId,
              buttons,
              audience,
              batchTag: batchTag || undefined,
            })
          }
        >
          <Send className="mr-2 h-4 w-4" />
          Разослать
          {recipients !== undefined ? ` (${fmt(recipients)})` : ""}
        </ConfirmButton>
        {!preview && (
          <p className="text-center text-xs text-muted-foreground">
            Доступно после предпросмотра
          </p>
        )}
      </div>
    </div>
  );
}

/** t.me/channel/123 or t.me/c/1234567890/123 → chat id and message id. */
function parsePostLink(link: string) {
  const priv = link.match(/t\.me\/c\/(\d+)\/(?:\d+\/)?(\d+)/);
  if (priv) return { chatId: `-100${priv[1]}`, messageId: priv[2] };
  const pub = link.match(/t\.me\/([A-Za-z]\w{3,})\/(\d+)/);
  if (pub) return { chatId: `@${pub[1]}`, messageId: pub[2] };
  return null;
}

function ForwardForm() {
  const [chatId, setChatId] = useState("");
  const [messageId, setMessageId] = useState("");
  const [audience, setAudience] = useState<BroadcastAudience>("all");
  const [batchTag, setBatchTag] = useState("");
  const { data: counts } = useAudienceCounts();
  const start = useStartBroadcast(() => setBatchTag(""));

  const valid = /^(-?\d+|@\w{4,})$/.test(chatId) && Number(messageId) > 0;

  return (
    <div className="space-y-4">
      <Field
        label="Ссылка на пост"
        hint="Бот должен быть в канале. Игроки увидят «Переслано из …», как в /broadcastMsg."
      >
        <Input
          placeholder="https://t.me/channel/123"
          onChange={(e) => {
            const parsed = parsePostLink(e.target.value);
            if (parsed) {
              setChatId(parsed.chatId);
              setMessageId(parsed.messageId);
            }
          }}
        />
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Чат">
          <Input
            value={chatId}
            placeholder="-100… или @channel"
            onChange={(e) => setChatId(e.target.value.trim())}
          />
        </Field>
        <Field label="ID сообщения">
          <Input
            value={messageId}
            inputMode="numeric"
            onChange={(e) => setMessageId(e.target.value.trim())}
          />
        </Field>
      </div>
      <AudiencePicker value={audience} onChange={setAudience} />
      <Field label="Тег (необязательно)">
        <Input
          value={batchTag}
          placeholder="news-2026-10"
          onChange={(e) => setBatchTag(e.target.value.trim())}
        />
      </Field>
      <ConfirmButton
        className="w-full"
        disabled={!valid}
        pending={start.isPending}
        title="Переслать пост?"
        description={`Получат ${
          counts ? fmt(counts[audience]) : "все выбранные"
        } игроков.`}
        confirmLabel="Разослать"
        onConfirm={() =>
          start.mutate({
            mode: "forward",
            fromChatId: chatId,
            messageId: Number(messageId),
            audience,
            batchTag: batchTag || undefined,
          })
        }
      >
        <Send className="mr-2 h-4 w-4" />
        Разослать
      </ConfirmButton>
    </div>
  );
}

function QueuePanel() {
  const { data, isLoading, isError } = useQuery({
    queryKey: listKey,
    queryFn: async () =>
      (
        await api.get<{ broadcasts: BroadcastSummary[]; queue: QueueState }>(
          "/api/admin/broadcasts",
          { timeout: 30_000 }
        )
      ).data,
    refetchInterval: (query) =>
      query.state.data?.broadcasts.some((b) => b.pending > 0) ? 5_000 : false,
  });

  const queueAction = useAdminAction<{ action: "pause" | "resume" | "clear" }>(
    "/api/admin/broadcasts/queue",
    { invalidate: [listKey] }
  );
  const retry = useAdminAction<{ batchTag: string }>(
    "/api/admin/broadcasts/retry",
    { invalidate: [listKey] }
  );

  const counts = data?.queue.counts;
  const waiting = counts
    ? (counts.waiting ?? 0) +
      (counts.prioritized ?? 0) +
      (counts.delayed ?? 0) +
      (counts.paused ?? 0)
    : null;

  return (
    <Section title="Очередь и история">
      <Panel className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-sm">
            <span className="text-muted-foreground">В очереди: </span>
            <span className="font-semibold tabular-nums">
              {waiting === null ? "—" : fmt(waiting)}
            </span>
            <span className="text-muted-foreground"> · отправляется: </span>
            <span className="font-semibold tabular-nums">
              {counts ? fmt(counts.active ?? 0) : "—"}
            </span>
          </div>
          {data?.queue.paused && <Tag tone="warn">На паузе</Tag>}
        </div>
        <div className="flex flex-wrap gap-2">
          {data?.queue.paused ? (
            <Button
              size="sm"
              disabled={queueAction.isPending}
              onClick={() => queueAction.mutate({ action: "resume" })}
            >
              <Play className="mr-1.5 h-4 w-4" />
              Продолжить
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              disabled={queueAction.isPending}
              onClick={() => queueAction.mutate({ action: "pause" })}
            >
              <Pause className="mr-1.5 h-4 w-4" />
              Пауза
            </Button>
          )}
          <ConfirmButton
            size="sm"
            variant="destructive"
            pending={
              queueAction.isPending && queueAction.variables?.action === "clear"
            }
            title="Очистить очередь?"
            description="Все неотправленные сообщения всех рассылок будут удалены из очереди. Это нельзя отменить."
            confirmLabel="Очистить"
            onConfirm={() => queueAction.mutate({ action: "clear" })}
          >
            <Trash2 className="mr-1.5 h-4 w-4" />
            Очистить
          </ConfirmButton>
        </div>
      </Panel>

      {isLoading && <Spinner />}
      {isError && <EmptyState>Не удалось загрузить рассылки</EmptyState>}
      {data && data.broadcasts.length === 0 && (
        <EmptyState>Рассылок ещё не было</EmptyState>
      )}
      <div className="space-y-2">
        {data?.broadcasts.map((b) => (
          <BroadcastRow
            key={b.batchTag}
            b={b}
            retrying={
              retry.isPending && retry.variables?.batchTag === b.batchTag
            }
            onRetry={() => retry.mutate({ batchTag: b.batchTag })}
          />
        ))}
      </div>
    </Section>
  );
}

function BroadcastRow({
  b,
  retrying,
  onRetry,
}: {
  b: BroadcastSummary;
  retrying: boolean;
  onRetry: () => void;
}) {
  const pct = (v: number) => `${b.total ? (v / b.total) * 100 : 0}%`;
  const done = b.completed + b.failed + b.blocked;
  return (
    <Panel className="space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-mono text-sm">{b.batchTag}</p>
          <p className="text-xs text-muted-foreground">
            {fmtDate(b.startedAt)} · {fmt(done)} из {fmt(b.total)}
          </p>
        </div>
        {b.pending > 0 ? (
          <Tag tone="info">Идёт</Tag>
        ) : (
          <Tag tone="good">Готово</Tag>
        )}
      </div>
      <div
        className="flex h-2 gap-[2px] overflow-hidden rounded-full bg-muted"
        role="img"
        aria-label={`Доставлено ${b.completed}, заблокировали ${b.blocked}, ошибки ${b.failed}, ожидают ${b.pending}`}
      >
        <div className="bg-green-500" style={{ width: pct(b.completed) }} />
        <div className="bg-amber-500" style={{ width: pct(b.blocked) }} />
        <div className="bg-red-500" style={{ width: pct(b.failed) }} />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-muted-foreground">
          <span>✅ {fmt(b.completed)}</span>
          <span>🚫 {fmt(b.blocked)}</span>
          <span>❌ {fmt(b.failed)}</span>
          <span>⌛️ {fmt(b.pending)}</span>
        </div>
        {b.failed > 0 && (
          <Button
            size="sm"
            variant="outline"
            disabled={retrying}
            onClick={onRetry}
          >
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
            Повторить ошибки
          </Button>
        )}
      </div>
    </Panel>
  );
}
