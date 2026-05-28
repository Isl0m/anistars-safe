"use client";

import { useState } from "react";
import Image from "next/image";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Check, ImageIcon, Play } from "lucide-react";

import { cn, getImageProxyUrl } from "@/lib/utils";

import { Banner } from "@/db/schema/banner";
import { Badge } from "@/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/ui/dialog";
import { Skeleton } from "@/ui/skeleton";

import { Header } from "../header";
import { useTelegram } from "../telegram-provider";

type BannersWithOwners = Banner & { isOwned: boolean };

export function BannersPage() {
  const { tgUser } = useTelegram();
  const query = useQuery({
    queryKey: ["banners", tgUser],
    queryFn: async () => {
      const response = await fetch(
        tgUser
          ? `${process.env.NEXT_PUBLIC_URL}/api/user/banners?userId=${tgUser.id}`
          : `${process.env.NEXT_PUBLIC_URL}/api/user/banners`
      );
      return (await response.json()).banners as Promise<BannersWithOwners[]>;
    },
    placeholderData: keepPreviousData,
  });
  const [selected, setSelected] = useState<BannersWithOwners>();
  const closeDialog = (open: boolean) => !open && setSelected(undefined);
  const onBannerClick = (banner: BannersWithOwners) => () =>
    banner.type === "video" && setSelected(banner);

  return (
    <div className="flex h-full flex-col">
      <Header title="Фоны" />

      <section className="flex-1 overflow-y-auto px-3 py-4">
        <div className="grid grid-cols-2 gap-3 md:container md:grid-cols-3 lg:grid-cols-4">
          {query.isLoading
            ? [1, 2, 3, 4, 5, 6].map((i) => (
                <Skeleton key={i} className="aspect-[16/10] rounded-xl" />
              ))
            : query.data?.map((banner) => (
                <div
                  key={banner.id}
                  className={cn(
                    "group overflow-hidden rounded-xl border bg-card shadow-sm transition-colors",
                    banner.type === "video" &&
                      "cursor-pointer hover:border-primary/30",
                    banner.isOwned && "border-green-500/30"
                  )}
                  onClick={onBannerClick(banner)}
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
                      <>
                        <video
                          src={banner.file + "#t=0.1"}
                          preload="metadata"
                          width={320}
                          height={200}
                          playsInline
                          className="h-full w-full object-cover"
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/20 transition-colors group-hover:bg-black/30">
                          <div className="rounded-full bg-black/50 p-2">
                            <Play className="h-5 w-5 text-white" />
                          </div>
                        </div>
                      </>
                    )}
                    {banner.isOwned && (
                      <div className="absolute right-1.5 top-1.5 rounded-full bg-green-500 p-1">
                        <Check className="h-2.5 w-2.5 text-white" />
                      </div>
                    )}
                  </div>
                  <div className="px-2.5 py-2">
                    <span className="text-xs font-medium">{banner.name}</span>
                  </div>
                </div>
              ))}
        </div>

        {!query.isLoading && query.data?.length === 0 && (
          <div className="flex flex-col items-center gap-4 py-16">
            <div className="rounded-full bg-muted p-4">
              <ImageIcon className="h-10 w-10 text-muted-foreground/50" />
            </div>
            <p className="text-sm text-muted-foreground">Нет доступных фонов</p>
          </div>
        )}
      </section>

      <Dialog open={selected !== undefined} onOpenChange={closeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selected?.name}</DialogTitle>
          </DialogHeader>
          <video
            src={selected?.file!}
            controls
            width={1280}
            height={720}
            className="rounded-lg"
            playsInline
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
