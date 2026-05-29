"use client";

import { CardTypes, statMapper, typeMapper } from "@/lib/utils";

import { Badge } from "@/components/ui/badge";
import { CardStats } from "@/db/schema/card";

import { FilterOption, ListingFilters } from "./get-filter-options";

interface Props {
  filters: ListingFilters | null;
  filterOptions?: FilterOption[];
  className?: string;
}

export function ListingFilterDisplay({
  filters,
  filterOptions,
  className,
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
    if (!filterOptions) return ids.join(", ");
    const options = filterOptions.find((o) => o.key === key);
    if (!options) return ids.join(", ");
    return ids
      .map((id) => options.items.find((item) => item.id === id)?.name)
      .filter(Boolean)
      .join(", ");
  };

  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      <div className="flex flex-wrap gap-3">
        {filters.rarityIds && filters.rarityIds.length > 0 && (
          <div className="flex flex-col gap-1">
            <div className="flex flex-wrap gap-1">
              {getNames("rarityIds", filters.rarityIds)
                .split(", ")
                .map((name) => (
                  <Badge
                    key={name}
                    variant="outline"
                    className="h-5 border-blue-500/30 bg-blue-500/5 px-1.5 py-0 text-[10px] text-blue-700"
                  >
                    {name}
                  </Badge>
                ))}
            </div>
          </div>
        )}

        {filters.universeIds &&
          filters.universeIds.length > 0 &&
          getNames("universeIds", filters.universeIds)
            .split(", ")
            .map((name) => (
              <Badge
                key={name}
                variant="outline"
                className="h-5 border-purple-500/30 bg-purple-500/5 px-1.5 py-0 text-[10px] text-purple-700"
              >
                {name}
              </Badge>
            ))}

        {filters.classIds &&
          filters.classIds.length > 0 &&
          getNames("classIds", filters.classIds)
            .split(", ")
            .map((name) => (
              <Badge
                key={name}
                variant="outline"
                className="h-5 border-green-500/30 bg-green-500/5 px-1.5 py-0 text-[10px] text-green-700"
              >
                {name}
              </Badge>
            ))}

        {filters.stats &&
          filters.stats.length > 0 &&
          (filters.stats as CardStats[]).map((stat) => (
            <Badge
              key={stat}
              variant="outline"
              className="h-5 border-orange-500/30 bg-orange-500/5 px-1.5 py-0 text-[10px] text-orange-700"
            >
              {statMapper[stat]}
            </Badge>
          ))}

        {filters.type &&
          filters.type.length > 0 &&
          (filters.type as CardTypes[]).map((type) => (
            <Badge
              key={type}
              variant="outline"
              className="h-5 border-gray-500/30 bg-gray-500/5 px-1.5 py-0 text-[10px] text-gray-700"
            >
              {typeMapper[type]}
            </Badge>
          ))}
      </div>
      <div className="flex flex-wrap gap-3">
        {filters.minCardPrice && (
          <Badge
            variant="secondary"
            className="h-5 border-amber-500/20 bg-amber-500/10 py-0 text-[10px] text-amber-700"
          >
            Мин. Цена: {filters.minCardPrice}
          </Badge>
        )}
        {filters.minCardCount && (
          <Badge
            variant="secondary"
            className="h-5 border-indigo-500/20 bg-indigo-500/10 py-0 text-[10px] text-indigo-700"
          >
            Мин. Карт: {filters.minCardCount}
          </Badge>
        )}
        {filters.maxCardCount && (
          <Badge
            variant="secondary"
            className="h-5 border-rose-500/20 bg-rose-500/10 py-0 text-[10px] text-rose-700"
          >
            Макс. Карт: {filters.maxCardCount}
          </Badge>
        )}
      </div>
    </div>
  );
}
