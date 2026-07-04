"use client";

import { CardTypes, cn, statMapper, typeMapper } from "@/lib/utils";

import { Badge } from "@/components/ui/badge";
import { CardStats } from "@/db/schema/card";

import { FilterOption, ListingFilters } from "./get-filter-options";

interface Props {
  filters: ListingFilters | null;
  filterOptions?: FilterOption[];
  className?: string;
  inline?: boolean;
}

const chipBase = "h-5 shrink-0 whitespace-nowrap px-1.5 py-0 text-[10px]";

export function ListingFilterDisplay({
  filters,
  filterOptions,
  className,
  inline,
}: Props) {
  if (!filters) {
    return (
      <div className={className}>
        <span className="text-xs italic text-muted-foreground">
          Любые карты
        </span>
      </div>
    );
  }

  const getNames = (key: string, ids: (number | string)[]) => {
    if (!filterOptions) return "";
    const options = filterOptions.find((o) => o.key === key);
    if (!options) return "";
    return ids
      .map((id) => options.items.find((item) => item.id === id)?.name)
      .filter(Boolean)
      .join(", ");
  };

  const namedChips = (key: string, ids: (number | string)[], color: string) =>
    getNames(key, ids)
      .split(", ")
      .filter(Boolean)
      .map((name) => (
        <Badge
          key={`${key}-${name}`}
          variant="outline"
          className={cn(chipBase, color)}
        >
          {name}
        </Badge>
      ));

  const attributeChips = [
    ...(filters.rarityIds?.length
      ? namedChips(
          "rarityIds",
          filters.rarityIds,
          "border-blue-500/30 bg-blue-500/5 text-blue-700"
        )
      : []),
    ...(filters.universeIds?.length
      ? namedChips(
          "universeIds",
          filters.universeIds,
          "border-purple-500/30 bg-purple-500/5 text-purple-700"
        )
      : []),
    ...(filters.classIds?.length
      ? namedChips(
          "classIds",
          filters.classIds,
          "border-green-500/30 bg-green-500/5 text-green-700"
        )
      : []),
    ...((filters.stats as CardStats[] | undefined)?.map((stat) => (
      <Badge
        key={`stat-${stat}`}
        variant="outline"
        className={cn(
          chipBase,
          "border-orange-500/30 bg-orange-500/5 text-orange-700"
        )}
      >
        {statMapper[stat]}
      </Badge>
    )) ?? []),
    ...((filters.type as CardTypes[] | undefined)?.map((type) => (
      <Badge
        key={`type-${type}`}
        variant="outline"
        className={cn(
          chipBase,
          "border-gray-500/30 bg-gray-500/5 text-gray-700"
        )}
      >
        {typeMapper[type]}
      </Badge>
    )) ?? []),
  ];

  const constraintChips = [
    filters.minCardPrice ? (
      <Badge
        key="minPrice"
        variant="secondary"
        className={cn(
          chipBase,
          "border-amber-500/20 bg-amber-500/10 text-amber-700"
        )}
      >
        Мин. Цена: {filters.minCardPrice}
      </Badge>
    ) : null,
    filters.minCardCount ? (
      <Badge
        key="minCount"
        variant="secondary"
        className={cn(
          chipBase,
          "border-indigo-500/20 bg-indigo-500/10 text-indigo-700"
        )}
      >
        Мин. Карт: {filters.minCardCount}
      </Badge>
    ) : null,
    filters.maxCardCount ? (
      <Badge
        key="maxCount"
        variant="secondary"
        className={cn(
          chipBase,
          "border-rose-500/20 bg-rose-500/10 text-rose-700"
        )}
      >
        Макс. Карт: {filters.maxCardCount}
      </Badge>
    ) : null,
  ].filter(Boolean);

  if (inline) {
    const allChips = [...attributeChips, ...constraintChips];
    if (allChips.length === 0) {
      return (
        <div className={className}>
          <span className="text-xs italic text-muted-foreground">
            Любые карты
          </span>
        </div>
      );
    }
    return (
      <div
        className={cn(
          "no-scrollbar flex gap-1.5 overflow-x-auto pb-0.5",
          className
        )}
      >
        {allChips}
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex flex-wrap gap-2">{attributeChips}</div>
      <div className="flex flex-wrap gap-2">{constraintChips}</div>
    </div>
  );
}
