"use client";

import Image from "next/image";
import { ArrowRight, Zap } from "lucide-react";

import { CardUpgrades } from "@/lib/queries";
import { cn, getImageProxyUrl } from "@/lib/utils";

import { Badge } from "@/ui/badge";

import { Header } from "../header";

export function CardUpgradesPage({ upgrades }: { upgrades: CardUpgrades[] }) {
  const singleUpgrades: CardUpgrades[] = [];
  const doubleUpgrades: CardUpgrades[] = [];
  upgrades.forEach((upg) => {
    if (upg.image2) {
      doubleUpgrades.push(upg);
    } else {
      singleUpgrades.push(upg);
    }
  });

  return (
    <main className="flex h-full flex-col">
      <Header title="Улучшения" />
      <section className="flex-1 overflow-y-auto px-3 py-4">
        {upgrades.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-16">
            <div className="rounded-full bg-muted p-4">
              <Zap className="h-10 w-10 text-muted-foreground/50" />
            </div>
            <p className="text-sm text-muted-foreground">
              Нет доступных улучшений
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-6 md:container">
            {doubleUpgrades.length > 0 && (
              <UpgradeSection
                title="Двойные улучшения"
                upgrades={doubleUpgrades}
                variant="double"
              />
            )}
            {singleUpgrades.length > 0 && (
              <UpgradeSection
                title="Одиночные улучшения"
                upgrades={singleUpgrades}
                variant="single"
              />
            )}
          </div>
        )}
      </section>
    </main>
  );
}

function UpgradeSection({
  title,
  upgrades,
  variant,
}: {
  title: string;
  upgrades: CardUpgrades[];
  variant: "single" | "double";
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <h2 className="text-sm font-semibold">{title}</h2>
        <Badge variant="secondary" className="text-[10px]">
          {upgrades.length}
        </Badge>
      </div>
      <div
        className={cn(
          "grid grid-cols-1 gap-3 md:grid-cols-2 lg:gap-4",
          variant === "single" && "lg:grid-cols-3"
        )}
      >
        {upgrades.map((upgrade) => (
          <UpgradeCard key={upgrade.id} upgrade={upgrade} />
        ))}
      </div>
    </div>
  );
}

function UpgradeCard({ upgrade }: { upgrade: CardUpgrades }) {
  const { name, baseImage, image1, image2 } = upgrade;
  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <div className="flex items-center gap-2 border-b px-3.5 py-2.5">
        <Zap className="h-3.5 w-3.5 text-amber-500" />
        <span className="text-sm font-semibold">{name}</span>
      </div>
      <div className="flex items-center justify-center gap-2 p-3.5">
        <UpgradeImage src={baseImage} alt={`${name} base`} />
        <ArrowRight className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
        <UpgradeImage src={image1} alt={`${name} level 1`} highlighted />
        {image2 && (
          <>
            <ArrowRight className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
            <UpgradeImage src={image2} alt={`${name} level 2`} highlighted />
          </>
        )}
      </div>
    </div>
  );
}

function UpgradeImage({
  src,
  alt,
  highlighted,
}: {
  src: string;
  alt: string;
  highlighted?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex-1 overflow-hidden rounded-lg border shadow-sm",
        highlighted && "border-amber-500/30"
      )}
    >
      <Image
        src={getImageProxyUrl(src)}
        width={180}
        height={240}
        alt={alt}
        className="h-full w-full object-cover"
        loading="lazy"
      />
    </div>
  );
}
