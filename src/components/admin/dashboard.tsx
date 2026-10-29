"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";

import type { Analytics, DailyPoint, TopUser } from "@/lib/admin/analytics";
import { api } from "@/lib/api";

import { BarList, TimeChart } from "./charts";
import {
  EmptyState,
  fmt,
  fmtCompact,
  fmtPercent,
  Panel,
  Section,
  Segmented,
  Spinner,
  StatTile,
} from "./ui";

const PERIODS = [
  { value: 7, label: "7 дней" },
  { value: 30, label: "30 дней" },
  { value: 90, label: "90 дней" },
];

const CHARTS: {
  key: keyof Omit<DailyPoint, "day">;
  title: string;
  unit?: string;
}[] = [
  { key: "newUsers", title: "Новые игроки" },
  { key: "activeUsers", title: "Активные игроки (тратили ресурсы)" },
  { key: "revenue", title: "Доход", unit: "⭐" },
  { key: "battles", title: "Сыграно боёв" },
  { key: "trades", title: "Трейды" },
  { key: "triesSpent", title: "Потрачено попыток" },
];

export default function AdminDashboard() {
  const [days, setDays] = useState(30);
  const { data, isLoading, isError } = useQuery({
    queryKey: ["admin", "analytics", days],
    queryFn: async () => {
      const { data } = await api.get<{ analytics: Analytics }>(
        `/api/admin/analytics?days=${days}`,
        { timeout: 30_000 }
      );
      return data.analytics;
    },
    staleTime: 60_000,
  });

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Обзор</h2>
          {data && (
            <p className="text-xs text-muted-foreground">
              Обновлено {new Date(data.generatedAt).toLocaleTimeString("ru-RU")}
            </p>
          )}
        </div>
        <Segmented
          value={days}
          options={PERIODS}
          onChange={setDays}
          className="w-full sm:w-72"
        />
      </div>

      {isLoading && <Spinner />}
      {isError && <EmptyState>Не удалось загрузить статистику</EmptyState>}
      {data && <DashboardBody data={data} />}
    </>
  );
}

function DashboardBody({ data }: { data: Analytics }) {
  const { users, revenue, economy } = data;
  const sum = (key: keyof Omit<DailyPoint, "day">) =>
    data.series.reduce((acc, p) => acc + p[key], 0);
  const arppu = revenue.payersPeriod
    ? Math.round(revenue.period / revenue.payersPeriod)
    : 0;

  return (
    <>
      <Section title="Игроки">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <StatTile label="Всего" value={fmt(users.total)} />
          <StatTile
            label="Новые за 24ч"
            value={fmt(users.new1)}
            hint={`7д: ${fmt(users.new7)} · 30д: ${fmt(users.new30)}`}
          />
          <StatTile label="DAU" value={fmt(users.dau)} hint="за 24 часа" />
          <StatTile
            label="WAU / MAU"
            value={`${fmtCompact(users.wau)} / ${fmtCompact(users.mau)}`}
            hint={`Липкость DAU/MAU ${fmtPercent(
              users.mau ? users.dau / users.mau : null
            )}`}
          />
          <StatTile
            label="Удержание D1"
            value={fmtPercent(users.retentionD1)}
            hint="вернулись через день"
          />
          <StatTile
            label="Удержание D7"
            value={fmtPercent(users.retentionD7)}
            hint="вернулись через неделю"
          />
          <StatTile label="Премиум Пасс" value={fmt(users.premium)} />
          <StatTile
            label="Заблокировали бота"
            value={fmt(users.botBlocked)}
            hint={fmtPercent(
              users.total ? users.botBlocked / users.total : null
            )}
          />
          <StatTile label="Забанены" value={fmt(users.banned)} />
          <StatTile label="Админы и саппорт" value={fmt(users.staff)} />
        </div>
      </Section>

      <Section title="Доход в Telegram Stars">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <StatTile label="За период" value={`${fmt(revenue.period)} ⭐`} />
          <StatTile label="Сегодня" value={`${fmt(revenue.today)} ⭐`} />
          <StatTile
            label="Платящих за период"
            value={fmt(revenue.payersPeriod)}
            hint={`ARPPU ${fmt(arppu)} ⭐`}
          />
          <StatTile
            label="Всего"
            value={`${fmtCompact(revenue.total)} ⭐`}
            hint={`${fmt(revenue.payers)} платящих`}
          />
        </div>
      </Section>

      <Section title="Динамика по дням">
        <div className="grid gap-3 md:grid-cols-2">
          {CHARTS.map((chart) => (
            <Panel key={chart.key} className="space-y-2">
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="text-sm font-medium">{chart.title}</h3>
                <span className="text-sm tabular-nums text-muted-foreground">
                  {chart.key === "activeUsers"
                    ? `макс. ${fmt(
                        Math.max(0, ...data.series.map((p) => p.activeUsers))
                      )}`
                    : `всего ${fmt(sum(chart.key))}${chart.unit ? ` ${chart.unit}` : ""}`}
                </span>
              </div>
              <TimeChart
                points={data.series.map((p) => ({
                  day: p.day,
                  value: p[chart.key],
                }))}
                unit={chart.unit}
              />
            </Panel>
          ))}
        </div>
      </Section>

      <Section title="Экономика">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <StatTile
            label="🪙 Монет у игроков"
            value={fmtCompact(economy.coins)}
          />
          <StatTile label="✨ Пыльцы" value={fmtCompact(economy.sparkles)} />
          <StatTile label="🔮 Астралов" value={fmtCompact(economy.astrals)} />
          <StatTile label="Карт в игре" value={fmt(economy.cards)} />
        </div>
        <Panel>
          <h3 className="mb-3 text-sm font-medium">Карты по редкостям</h3>
          <BarList
            items={data.rarities.map((r) => ({
              key: r.name,
              label: r.name,
              value: r.count,
            }))}
          />
        </Panel>
      </Section>

      <div className="grid gap-3 md:grid-cols-3">
        <TopList title="Топ донатеров" users={data.topDonors} unit="⭐" />
        <TopList
          title="Топ рефоводов за период"
          users={data.topReferrers}
          unit="приглаш."
        />
        <TopList title="Самые богатые" users={data.topRich} unit="🪙" />
      </div>
    </>
  );
}

function TopList({
  title,
  users,
  unit,
}: {
  title: string;
  users: TopUser[];
  unit: string;
}) {
  return (
    <Panel className="space-y-2">
      <h3 className="text-sm font-medium">{title}</h3>
      {users.length === 0 ? (
        <p className="text-sm text-muted-foreground">Пока пусто</p>
      ) : (
        <ol className="space-y-1.5">
          {users.map((u, i) => (
            <li key={u.id} className="flex items-center gap-2 text-sm">
              <span className="w-4 text-right text-xs text-muted-foreground">
                {i + 1}
              </span>
              <Link
                href={`/admin/users/${u.id}`}
                className="min-w-0 flex-1 truncate hover:underline"
              >
                {u.name}
              </Link>
              <span className="shrink-0 tabular-nums text-muted-foreground">
                {fmtCompact(u.value)} {unit}
              </span>
            </li>
          ))}
        </ol>
      )}
    </Panel>
  );
}
