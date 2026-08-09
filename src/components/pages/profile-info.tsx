"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
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
  ImageIcon,
  Library,
  Pencil,
  Star,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { api } from "@/lib/api";
import { cn, getImageProxyUrl, prettyNumbers } from "@/lib/utils";

import { Banner } from "@/db/schema/banner";
import { FullCard } from "@/db/schema/card";
import { UserExtended } from "@/db/schema/user";
import { useTelegramBackButton } from "@/hook/use-telegram-back-button";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { Skeleton } from "@/ui/skeleton";

import { Header } from "../header";
import { useTelegram } from "../telegram-provider";
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
        <div className="flex flex-col gap-3 md:container">
          <div className="overflow-hidden rounded-xl border bg-card">
            <Skeleton className="h-28" />
            <div className="-mt-12 flex flex-col items-center gap-3 px-4 pb-4">
              <Skeleton className="h-20 w-20 rounded-full" />
              <Skeleton className="h-[28px] w-32" />
              <Skeleton className="h-4 w-52" />
            </div>
          </div>
          <div>
            <Skeleton className="mb-2 h-4 w-20 px-1" />
            <div className="grid grid-cols-2 gap-2">
              <Skeleton className="h-[68px] rounded-xl" />
              <Skeleton className="h-[68px] rounded-xl" />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

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
    <div className="relative h-28 overflow-hidden rounded-t-xl">
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
      <div className="absolute -inset-px bg-gradient-to-t from-card via-card/50 to-transparent" />
    </div>
  );
}

type OwnedBanner = {
  bannerId: number;
  name: string;
  file: string;
  type: "photo" | "video";
};

function ChangeBannerSection({
  profileKey,
  currentBannerId,
  banners,
  isLoading,
  onClose,
}: {
  profileKey: (string | number | undefined)[];
  currentBannerId: number;
  banners: OwnedBanner[];
  isLoading: boolean;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [isSaving, setIsSaving] = useState(false);
  const snapshotRef = useRef<ProfileData | undefined>(
    queryClient.getQueryData<ProfileData>(profileKey)
  );

  const revert = () => {
    if (snapshotRef.current) {
      queryClient.setQueryData(profileKey, snapshotRef.current);
    }
  };

  const cancelEdit = () => {
    revert();
    onClose();
  };

  const previewBanner = (banner: OwnedBanner) => {
    queryClient.setQueryData<ProfileData>(profileKey, (old) =>
      old
        ? {
            ...old,
            user: { ...old.user, bannerId: banner.bannerId },
            banner: {
              id: banner.bannerId,
              name: banner.name,
              file: banner.file,
              type: banner.type,
              isPrivate: false,
            },
          }
        : old
    );
  };

  const confirm = async () => {
    const originalBannerId = snapshotRef.current?.user.bannerId;
    if (currentBannerId === originalBannerId) {
      onClose();
      return;
    }

    setIsSaving(true);
    try {
      await api.patch("/api/user/banners", {
        bannerId: currentBannerId,
      });
      onClose();
    } catch {
      revert();
      toast.error("Не удалось изменить фон");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div>
      <div className="mb-2 flex items-center justify-between px-1">
        <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <ImageIcon className="h-3 w-3" />
          Фон профиля
        </h3>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1.5 px-2 text-xs text-muted-foreground"
            onClick={cancelEdit}
            disabled={isSaving}
          >
            <X className="h-3 w-3" />
            Отмена
          </Button>
          <Button
            size="sm"
            className="h-7 gap-1.5 px-2 text-xs"
            onClick={confirm}
            disabled={isSaving}
          >
            <Check className="h-3 w-3" />
            Готово
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-3 gap-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="aspect-[16/10] rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {banners.map((banner) => (
            <button
              key={banner.bannerId}
              onClick={() => previewBanner(banner)}
              disabled={isSaving}
              className={cn(
                "relative overflow-hidden rounded-xl border bg-card transition-colors",
                banner.bannerId === currentBannerId
                  ? "border-primary ring-2 ring-primary/40"
                  : "hover:border-primary/30"
              )}
            >
              <div className="relative aspect-[16/10] w-full overflow-hidden">
                {banner.type === "photo" ? (
                  <Image
                    src={getImageProxyUrl(banner.file)}
                    width={320}
                    height={200}
                    alt={banner.name}
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <video
                    src={banner.file + "#t=0.1"}
                    preload="metadata"
                    playsInline
                    muted
                    className="h-full w-full object-cover"
                  />
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function UserHeader({ user }: { user: ProfileData["user"] }) {
  return (
    <>
      <div className="flex items-center gap-2">
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
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <Calendar className="h-3 w-3" />С {formatDate(user.createdAt)}
        </span>
        <span>ID: {user.id}</span>
      </div>
    </>
  );
}

export function ProfileInfo() {
  const { userId } = useTelegram();
  const [isEditingBanner, setIsEditingBanner] = useState(false);

  const query = useQuery({
    queryKey: ["user-profile", userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data } = await api.get<ProfileData>(`/api/user/profile`);
      return data;
    },
    enabled: !!userId,
  });

  const bannersQuery = useQuery({
    queryKey: ["owned-banners", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data } = await api.get<{ banners: OwnedBanner[] }>(
        `/api/user/banners`
      );
      return data.banners;
    },
    enabled: !!userId,
  });

  if (query.isLoading || !query.data) {
    return <ProfileSkeleton />;
  }

  const { user, stats, banner } = query.data;
  const ownedBanners = bannersQuery.data ?? [];
  const canEditBanner = ownedBanners.length > 0;

  return (
    <main className="flex h-full flex-col">
      <Header title="Профиль" />
      <section className="flex-1 overflow-y-auto px-3 py-4">
        <div className="flex flex-col gap-3 md:container">
          <div className="relative overflow-hidden rounded-xl border bg-card">
            <BannerCover banner={banner} />
            {canEditBanner && !isEditingBanner && (
              <button
                aria-label="Изменить фон"
                onClick={() => setIsEditingBanner(true)}
                className="absolute right-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition-colors hover:bg-black/60"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
            )}
            <div className="relative -mt-12 flex flex-col items-center gap-3 px-4 pb-4">
              <UserAvatar
                name={user.name}
                photoUrl={user.photoUrl}
                size={80}
                className="ring-4 ring-card"
              />
              <UserHeader user={user} />
            </div>
          </div>

          {isEditingBanner && (
            <ChangeBannerSection
              profileKey={["user-profile", userId]}
              currentBannerId={user.bannerId}
              banners={ownedBanners}
              isLoading={bannersQuery.isLoading}
              onClose={() => setIsEditingBanner(false)}
            />
          )}

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
            </div>
          </div>

          <FavouriteCardsSection userId={user.id} editable />
        </div>
      </section>
    </main>
  );
}

export function PublicProfileInfo({ userId }: { userId: string }) {
  const { userId: searcherId } = useTelegram();
  useTelegramBackButton();

  const query = useQuery({
    queryKey: ["public-profile", userId],
    queryFn: async () => {
      const { data } = await api.get<ProfileData>(`/api/user/profile`, {
        params: {
          id: userId,
        },
      });
      return data;
    },
  });

  if (userId === searcherId) {
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
                  Icon={Coins}
                  label="Общая стоимость"
                  value={prettyNumbers(stats.totalValue)}
                  color="text-yellow-500"
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
        className="pointer-events-none select-none rounded-lg"
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
      const { data } = await api.get<{ cards: FullCard[] }>(
        `/api/user/favourites`,
        {
          params: {
            id: userId,
          },
        }
      );
      return data;
    },
  });

  const reorderMutation = useMutation({
    mutationFn: async (cardIds: string[]) => {
      await api.put("/api/user/favourites", cardIds);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["favourite-cards"] });
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: ["favourite-card-ids"] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
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
      const { data } = await api.get<{ cards: FullCard[] }>(
        `/api/user/favourites`,
        {
          params: { id: userId },
        }
      );
      return data;
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
