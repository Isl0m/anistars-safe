"use client";

import { useState } from "react";
import {
  closestCenter,
  DndContext,
  DragEndEvent,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  rectSortingStrategy,
  SortableContext,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Calendar,
  Check,
  ChevronRight,
  Coins,
  Crown,
  Flame,
  Heart,
  Library,
  Pencil,
  Repeat2,
  Sparkles,
  Star,
  Store,
  Swords,
  Users,
  X,
  Zap,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { FullCard } from "@/db/schema/card";

import { Banner } from "@/db/schema/banner";
import { UserExtended } from "@/db/schema/user";
import { cn, getImageProxyUrl, prettyNumbers } from "@/lib/utils";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { Skeleton } from "@/ui/skeleton";
import { toast } from "@/ui/use-toast";

import { Header } from "../header";
import { useTelegram } from "../telegram-provider";
import { useTelegramBackButton } from "../use-telegram-back-button";
import { UserAvatar } from "../user-avatar";

type ProfileStats = {
  totalCards: number;
  totalValue: number;
  completedTrades: number;
  activeListings: number;
  completedSales: number;
};

type ProfileData = {
  user: UserExtended;
  stats: ProfileStats;
  banner: Banner | null;
};

function ProfileSkeleton() {
  return (
    <main className="flex h-full flex-col">
      <Header title="Профиль" />
      <section className="flex-1 overflow-y-auto px-3 py-4">
        <div className="flex flex-col gap-4 md:container">
          <div className="overflow-hidden rounded-xl border bg-card">
            <Skeleton className="h-28 rounded-none" />
            <div className="-mt-12 flex flex-col items-center gap-3 px-4 pb-4">
              <Skeleton className="h-20 w-20 rounded-full" />
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 rounded-xl" />
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

const resourceItems = [
  { key: "coins", label: "Монеты", Icon: Coins, color: "text-yellow-500" },
  {
    key: "sparkles",
    label: "Искры",
    Icon: Sparkles,
    color: "text-purple-400",
  },
  { key: "tries", label: "Попытки", Icon: Zap, color: "text-blue-400" },
  { key: "astrals", label: "Астралы", Icon: Star, color: "text-cyan-400" },
  { key: "event", label: "Ивент", Icon: Flame, color: "text-orange-400" },
  {
    key: "referrals",
    label: "Рефералы",
    Icon: Users,
    color: "text-emerald-400",
  },
] as const;

const quickLinks = [
  {
    href: "/profile/cards",
    label: "Мои карты",
    Icon: Swords,
    color: "from-indigo-500 to-violet-600",
  },
  {
    href: "/profile/collection",
    label: "Коллекция",
    Icon: Library,
    color: "from-blue-500 to-cyan-400",
  },
  {
    href: "/profile/missing",
    label: "Отсутствующие",
    Icon: Heart,
    color: "from-pink-500 to-rose-500",
  },
  {
    href: "/trade",
    label: "Трейд",
    Icon: Repeat2,
    color: "from-emerald-500 to-teal-600",
  },
  {
    href: "/market",
    label: "Маркетплейс",
    Icon: Store,
    color: "from-purple-600 to-pink-500",
  },
];

function formatDate(date: Date | string | null | undefined) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function BannerCover({ banner }: { banner: Banner | null }) {
  return (
    <div className="relative h-28">
      {banner ? (
        banner.type === "photo" ? (
          <Image
            src={getImageProxyUrl(banner.file)}
            alt={banner.name}
            fill
            className="object-cover"
            unoptimized
          />
        ) : (
          <video
            src={banner.file + "#t=0.1"}
            autoPlay
            loop
            muted
            playsInline
            className="h-full w-full object-cover"
          />
        )
      ) : (
        <div className="h-full bg-gradient-to-br from-primary/20 via-primary/10 to-transparent" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-card via-card/50 to-transparent" />
    </div>
  );
}

function UserHeader({ user }: { user: ProfileData["user"] }) {
  return (
    <>
      <div className="mt-3 flex items-center gap-2">
        <h2 className="text-lg font-bold">{user.name}</h2>
        {user.isPremium && (
          <Badge className="gap-1 bg-amber-500/15 text-amber-500 hover:bg-amber-500/25">
            <Crown className="h-3 w-3" />
            Premium
          </Badge>
        )}
        {user.type !== "basic" && (
          <Badge variant="secondary" className="capitalize">
            {user.type}
          </Badge>
        )}
      </div>
      {user.tgUserName && (
        <p className="mt-0.5 text-sm text-muted-foreground">
          @{user.tgUserName}
        </p>
      )}
      <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
        <Calendar className="h-3 w-3" />
        <span>С {formatDate(user.createdAt)}</span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">ID: {user.id}</p>
    </>
  );
}

export function ProfileInfo() {
  const { tgUser } = useTelegram();

  const query = useQuery({
    queryKey: ["user-profile", tgUser?.id],
    queryFn: async () => {
      if (!tgUser) return null;
      const [userRes, profileRes] = await Promise.all([
        fetch(
          `${process.env.NEXT_PUBLIC_URL}/api/user?id=${tgUser.id}`
        ),
        fetch(
          `${process.env.NEXT_PUBLIC_URL}/api/user/profile?id=${tgUser.id}`
        ),
      ]);
      const { user } = await userRes.json();
      const { stats, banner } = await profileRes.json();
      return { user, stats, banner } as ProfileData;
    },
    enabled: !!tgUser,
  });

  if (query.isLoading || !query.data) {
    return <ProfileSkeleton />;
  }

  const { user, stats, banner } = query.data;

  return (
    <main className="flex h-full flex-col">
      <Header title="Профиль" />
      <section className="flex-1 overflow-y-auto px-3 py-4 pb-[calc(var(--safe-area-bottom)+1rem)]">
        <div className="flex flex-col gap-3 md:container">
          <div className="relative overflow-hidden rounded-xl border bg-card">
            <BannerCover banner={banner} />
            <div className="relative -mt-12 flex flex-col items-center px-4 pb-4">
              <UserAvatar
                name={user.name}
                photoUrl={user.photoUrl}
                size={80}
                className="ring-4 ring-card"
              />
              <UserHeader user={user} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {resourceItems.map(({ key, label, Icon, color }) => (
              <div
                key={key}
                className="flex flex-col items-center gap-1.5 rounded-xl border bg-card p-3"
              >
                <Icon className={cn("h-5 w-5", color)} />
                <span className="text-base font-bold">
                  {prettyNumbers(user[key])}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {label}
                </span>
              </div>
            ))}
          </div>

          <div>
            <h3 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Статистика
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <StatCard
                Icon={Library}
                label="Карты"
                value={prettyNumbers(stats.totalCards)}
                color="text-blue-400"
              />
              <StatCard
                Icon={Coins}
                label="Общая стоимость"
                value={prettyNumbers(stats.totalValue)}
                color="text-yellow-500"
              />
              <StatCard
                Icon={Swords}
                label="Трейды"
                value={prettyNumbers(stats.completedTrades)}
                color="text-emerald-400"
              />
              <StatCard
                Icon={Store}
                label="Продажи"
                value={prettyNumbers(stats.completedSales)}
                color="text-purple-400"
              />
            </div>
          </div>

          <FavouriteCardsSection userId={user.id} editable />

          {user.giftStreak > 1 && (
            <div className="flex items-center gap-3 rounded-xl border bg-card p-3.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-orange-500/10">
                <Flame className="h-4.5 w-4.5 text-orange-500" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold">Серия подарков</p>
                <p className="text-xs text-muted-foreground">
                  {user.giftStreak} дней подряд
                </p>
              </div>
              <span className="text-lg font-bold text-orange-500">
                x{user.giftStreak}
              </span>
            </div>
          )}

          <div>
            <h3 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Быстрый доступ
            </h3>
            <div className="flex flex-col gap-2">
              {quickLinks.map(({ href, label, Icon, color }) => (
                <Link
                  key={href}
                  href={href}
                  className="group flex items-center gap-3 rounded-xl border bg-card p-3.5 transition-colors hover:border-primary/30"
                >
                  <div
                    className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br text-white shadow-sm",
                      color
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <span className="flex-1 text-sm font-semibold">{label}</span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

export function PublicProfileInfo({ userId }: { userId: string }) {
  const { tgUser } = useTelegram();
  useTelegramBackButton();

  const query = useQuery({
    queryKey: ["public-profile", userId],
    queryFn: async () => {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_URL}/api/user/profile?id=${userId}`
      );
      return (await response.json()) as ProfileData;
    },
  });

  if (tgUser && userId === tgUser.id.toString()) {
    return <ProfileInfo />;
  }

  if (query.isLoading || !query.data) {
    return <ProfileSkeleton />;
  }

  const { user, stats, banner } = query.data;

  return (
    <main className="flex h-full flex-col">
      <Header title={user.name} />
      <section className="flex-1 overflow-y-auto px-3 py-4 pb-[calc(var(--safe-area-bottom)+1rem)]">
        <div className="flex flex-col gap-3 md:container">
          <div className="relative overflow-hidden rounded-xl border bg-card">
            <BannerCover banner={banner} />
            <div className="relative -mt-12 flex flex-col items-center px-4 pb-4">
              <UserAvatar
                name={user.name}
                photoUrl={user.photoUrl}
                size={80}
                className="ring-4 ring-card"
              />
              <UserHeader user={user} />
            </div>
          </div>

          {stats && (
            <div>
              <h3 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Статистика
              </h3>
              <div className="grid grid-cols-2 gap-2">
                <StatCard
                  Icon={Library}
                  label="Карты"
                  value={prettyNumbers(stats.totalCards)}
                  color="text-blue-400"
                />
                <StatCard
                  Icon={Swords}
                  label="Трейды"
                  value={prettyNumbers(stats.completedTrades)}
                  color="text-emerald-400"
                />
              </div>
            </div>
          )}

          <FavouriteCardsSection userId={userId} />

          <Link
            href={`/profile/search?userId=${userId}`}
            className="group flex items-center gap-3 rounded-xl border bg-card p-3.5 transition-colors hover:border-primary/30"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-sm">
              <Library className="h-4 w-4" />
            </div>
            <span className="flex-1 text-sm font-semibold">
              Посмотреть карты
            </span>
            <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </section>
    </main>
  );
}

function FavouriteCardsSkeleton() {
  return (
    <div>
      <h3 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Избранные карты
      </h3>
      <div className="grid grid-cols-4 gap-2">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="aspect-[3/4] rounded-lg" />
        ))}
      </div>
    </div>
  );
}

function FavouriteCardsDisplay({ cards }: { cards: FullCard[] }) {
  if (!cards.length) return null;

  return (
    <div>
      <h3 className="mb-2 flex items-center gap-1.5 px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        <Star className="h-3 w-3" />
        Избранные карты
      </h3>
      <div className="grid grid-cols-4 gap-2">
        {cards.map((card) => (
          <div key={card.id} className="relative overflow-hidden rounded-lg">
            <Image
              src={getImageProxyUrl(card.image)}
              width={240}
              height={320}
              alt={card.name}
              className="rounded-lg"
              unoptimized
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function SortableCard({
  card,
  onRemove,
}: {
  card: FullCard;
  onRemove: (id: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: card.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
    touchAction: "none",
    WebkitTouchCallout: "none",
    userSelect: "none",
    WebkitUserSelect: "none",
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "relative overflow-hidden rounded-lg",
        isDragging && "opacity-50"
      )}
      onContextMenu={(e) => e.preventDefault()}
      {...attributes}
      {...listeners}
    >
      <Image
        src={getImageProxyUrl(card.image)}
        width={240}
        height={320}
        alt={card.name}
        className="pointer-events-none rounded-lg select-none"
        draggable={false}
        unoptimized
      />
      <button
        className="absolute right-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={() => onRemove(card.id)}
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}

function FavouriteCardsEditable({ userId }: { userId: string }) {
  const { initDataRaw } = useTelegram();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [editCards, setEditCards] = useState<FullCard[]>([]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 150, tolerance: 5 },
    })
  );

  const { data, isLoading } = useQuery({
    queryKey: ["favourite-cards", userId],
    queryFn: async () => {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_URL}/api/user/favourites?id=${userId}`
      );
      return (await res.json()) as { cards: FullCard[] };
    },
  });

  const reorderMutation = useMutation({
    mutationFn: async (cardIds: string[]) => {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_URL}/api/user/favourites`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            ...(initDataRaw ? { "x-telegram-init-data": initDataRaw } : {}),
          },
          body: JSON.stringify({ cardIds }),
        }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `HTTP ${res.status}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["favourite-cards"] });
      queryClient.invalidateQueries({ queryKey: ["favourite-card-ids"] });
      setIsEditing(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleStartEdit = () => {
    setEditCards(data?.cards ?? []);
    setIsEditing(true);
  };

  const handleSave = () => {
    const originalIds = (data?.cards ?? []).map((c) => c.id);
    const newIds = editCards.map((c) => c.id);
    const hasChanged =
      originalIds.length !== newIds.length ||
      originalIds.some((id, i) => id !== newIds[i]);

    if (!hasChanged) {
      setIsEditing(false);
      return;
    }
    reorderMutation.mutate(newIds);
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  const handleRemove = (cardId: string) => {
    setEditCards((prev) => prev.filter((c) => c.id !== cardId));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setEditCards((prev) => {
      const oldIdx = prev.findIndex((c) => c.id === active.id);
      const newIdx = prev.findIndex((c) => c.id === over.id);
      return arrayMove(prev, oldIdx, newIdx);
    });
  };

  if (isLoading) return <FavouriteCardsSkeleton />;

  const cards = data?.cards ?? [];

  if (!isEditing) {
    return (
      <div>
        <div className="mb-2 flex items-center justify-between px-1">
          <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Star className="h-3 w-3" />
            Избранные карты
          </h3>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1.5 px-2 text-xs text-muted-foreground"
            onClick={handleStartEdit}
          >
            <Pencil className="h-3 w-3" />
            Изменить
          </Button>
        </div>
        {cards.length > 0 ? (
          <div className="grid grid-cols-4 gap-2">
            {cards.map((card) => (
              <div
                key={card.id}
                className="relative overflow-hidden rounded-lg"
              >
                <Image
                  src={getImageProxyUrl(card.image)}
                  width={240}
                  height={320}
                  alt={card.name}
                  className="rounded-lg"
                  unoptimized
                />
              </div>
            ))}
          </div>
        ) : (
          <p className="rounded-xl border border-dashed bg-card/50 py-6 text-center text-xs text-muted-foreground">
            Нажмите «Изменить» чтобы добавить избранные карты
          </p>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between px-1">
        <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <Star className="h-3 w-3" />
          Избранные карты
        </h3>
        <div className="flex gap-1" style={{ touchAction: "manipulation" }}>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1.5 px-2 text-xs text-muted-foreground"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={handleCancel}
          >
            <X className="h-3 w-3" />
            Отмена
          </Button>
          <Button
            size="sm"
            className="h-7 gap-1.5 px-2 text-xs"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={handleSave}
            disabled={reorderMutation.isPending}
          >
            <Check className="h-3 w-3" />
            Готово
          </Button>
        </div>
      </div>
      {editCards.length > 0 ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={editCards.map((c) => c.id)}
            strategy={rectSortingStrategy}
          >
            <div className="grid grid-cols-4 gap-2">
              {editCards.map((card) => (
                <SortableCard
                  key={card.id}
                  card={card}
                  onRemove={handleRemove}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      ) : (
        <p className="rounded-xl border border-dashed bg-card/50 py-6 text-center text-xs text-muted-foreground">
          Добавьте карты в избранное через «Мои карты»
        </p>
      )}
    </div>
  );
}

function FavouriteCardsSection({
  userId,
  editable,
}: {
  userId: string;
  editable?: boolean;
}) {
  const { data, isLoading } = useQuery({
    queryKey: ["favourite-cards", userId],
    queryFn: async () => {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_URL}/api/user/favourites?id=${userId}`
      );
      return (await res.json()) as { cards: FullCard[] };
    },
    enabled: !editable,
  });

  if (editable) {
    return <FavouriteCardsEditable userId={userId} />;
  }

  if (isLoading) return <FavouriteCardsSkeleton />;
  if (!data?.cards?.length) return null;

  return <FavouriteCardsDisplay cards={data.cards} />;
}

function StatCard({
  Icon,
  label,
  value,
  color,
}: {
  Icon: React.ElementType;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border bg-card p-3.5">
      <div
        className={cn(
          "flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-muted"
        )}
      >
        <Icon className={cn("h-4 w-4", color)} />
      </div>
      <div>
        <p className="text-base font-bold">{value}</p>
        <p className="text-[10px] text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}
