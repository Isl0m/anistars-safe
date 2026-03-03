"use client";

import { useState } from "react";
import Image from "next/image";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Play } from "lucide-react";

import { cn } from "@/lib/utils";

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
      <Header title={"Фоны"} />

      <section className="flex-1 overflow-y-auto px-2 py-4">
        <div className="grid grid-cols-1 gap-2 md:container md:grid-cols-2 md:gap-4 lg:grid-cols-3">
          {query.isLoading
            ? new Array(6)
                .fill(null)
                .map((_, i) => <Skeleton key={i} className="h-56 rounded-lg" />)
            : query.data?.map((banner) => (
                <div
                  key={banner.id}
                  className={cn(
                    "overflow-hidden rounded-lg border bg-card shadow-md",
                    banner.type === "video" && "cursor-pointer"
                  )}
                  onClick={onBannerClick(banner)}
                >
                  {banner.type === "photo" && (
                    <div className="relative h-40 w-full overflow-hidden">
                      <Image
                        src={banner.file}
                        width={320}
                        height={180}
                        alt={banner.name}
                        loading="lazy"
                        className="h-full w-full object-cover"
                      />
                      {banner.isOwned && (
                        <Badge className="absolute right-3 top-3">
                          Ваш фон
                        </Badge>
                      )}
                    </div>
                  )}
                  {banner.type === "video" && (
                    <div className="relative h-40 w-full overflow-hidden">
                      <video
                        src={banner.file + "#t=0.1"}
                        preload="metadata"
                        width={320}
                        height={180}
                        playsInline
                        className="h-full w-full object-cover"
                      />
                      {banner.isOwned && (
                        <Badge className="absolute right-3 top-3">
                          Ваш фон
                        </Badge>
                      )}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Play className="h-12 w-12 opacity-80" />
                      </div>
                    </div>
                  )}

                  <div className="p-4">
                    <h3 className="font-semibold">{banner.name}</h3>
                  </div>
                </div>
              ))}
        </div>
      </section>
      <Dialog open={selected !== undefined} onOpenChange={closeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selected?.name}</DialogTitle>
          </DialogHeader>
          <video
            src={selected?.file}
            controls
            width={1280}
            height={720}
            className="rounded-md md:rounded-lg"
            playsInline
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
