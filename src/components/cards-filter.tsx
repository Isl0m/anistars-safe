"use client";

import { useMemo, useState } from "react";
import { useForm } from "@tanstack/react-form";
import {
  ArrowDownUp,
  ChevronDown,
  Clock,
  Coins,
  Filter as FilterIcon,
  Layers3,
  RotateCcw,
  Swords,
  type LucideIcon,
} from "lucide-react";

import { getRarityChipStyle, stripRarityEmoji } from "@/lib/constants";

import { CardStats } from "@/db/schema/card";

import {
  Filter,
  FilterOption,
  FilterOptionItem,
  SortOptions,
} from "./get-filter-options";
import { Button } from "./ui/button";
import { Checkbox } from "./ui/checkbox";
import { Label } from "./ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "./ui/sheet";

type Props = {
  filterOptions: FilterOption[];
  setFilters: (filters: Filter) => void;
  defaultSort?: SortOptions;
  buttonText?: string;
  initialValues?: Filter;
  lockedFilters?: Partial<Filter>;
};

const chipKeys = new Set([
  "rarityIds",
  "classIds",
  "stats",
  "droppable",
  "techniques",
]);

// Icon per sort dimension + direction, so each option is scannable at a glance.
const sortMeta: Record<string, { Icon: LucideIcon; dir: "asc" | "desc" }> = {
  "power-desc": { Icon: Swords, dir: "desc" },
  "power-asc": { Icon: Swords, dir: "asc" },
  "createdAt-desc": { Icon: Clock, dir: "desc" },
  "createdAt-asc": { Icon: Clock, dir: "asc" },
  "price-asc": { Icon: Coins, dir: "asc" },
  "price-desc": { Icon: Coins, dir: "desc" },
  "quantity-asc": { Icon: Layers3, dir: "asc" },
  "quantity-desc": { Icon: Layers3, dir: "desc" },
};

export default function CardsFilter({
  filterOptions,
  setFilters,
  defaultSort,
  buttonText,
  initialValues,
  lockedFilters,
}: Props) {
  const [open, setOpen] = useState(false);
  const [activeGroup, setActiveGroup] = useState("Базовые");
  const [universeExpanded, setUniverseExpanded] = useState(false);
  const [authorExpanded, setAuthorExpanded] = useState(false);

  const form = useForm({
    defaultValues: {
      authorIds: initialValues?.authorIds ?? ([] as number[]),
      classIds: initialValues?.classIds ?? ([] as number[]),
      rarityIds: initialValues?.rarityIds ?? ([] as number[]),
      universeIds: initialValues?.universeIds ?? ([] as number[]),
      stats: initialValues?.stats ?? ([] as CardStats[]),
      droppable: initialValues?.droppable ?? ([] as string[]),
      techniques: initialValues?.techniques ?? ([] as string[]),
      sort: initialValues?.sort ?? defaultSort ?? ("power-desc" as SortOptions),
      minPrice: initialValues?.minPrice,
    },
    onSubmit: async ({ value }) => {
      setFilters(value as Filter);
      setOpen(false);
    },
  });

  const activeCount = useMemo(() => {
    const v = initialValues;
    if (!v) return 0;
    return [
      v.rarityIds?.length,
      v.classIds?.length,
      v.universeIds?.length,
      v.authorIds?.length,
      v.stats?.length,
      v.droppable?.length,
      v.techniques?.length,
    ].filter((n) => n && n > 0).length;
  }, [initialValues]);

  const sortOption = filterOptions.find((o) => o.key === "sort");
  const chipOptions = filterOptions.filter((o) => chipKeys.has(o.key));
  const universeOption = filterOptions.find((o) => o.key === "universeIds");
  const authorOption = filterOptions.find((o) => o.key === "authorIds");

  const getGroupLabels = (items: FilterOptionItem[]) => {
    const seen = new Set<string>();
    const labels: string[] = [];
    for (const item of items) {
      const g = item.group ?? "";
      if (g && !seen.has(g)) {
        seen.add(g);
        labels.push(g);
      }
    }
    return labels;
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size={"sm"}
          aria-label="Show filters"
          className="relative gap-2"
        >
          <FilterIcon className="h-3 w-3" />
          {buttonText || "Фильтры"}
          {activeCount > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground">
              {activeCount}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent
        aria-description="cards filter"
        side="right"
        className="mt-auto flex h-screen max-h-[calc(100vh-(var(--safe-area-top)))] w-full flex-col p-0 md:max-w-md"
      >
        <SheetHeader className="border-b px-5 py-4">
          <SheetTitle className="text-lg font-semibold tracking-tight">
            Фильтры
          </SheetTitle>
        </SheetHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            form.handleSubmit();
          }}
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="flex-1 overflow-y-auto px-5 pb-5">
            <div className="space-y-6">
              {sortOption && (
                <section>
                  <SectionLabel icon={<ArrowDownUp className="h-3.5 w-3.5" />}>
                    {sortOption.name}
                  </SectionLabel>
                  <div className="flex flex-wrap gap-2">
                    {sortOption.items.map((item) => {
                      const meta = sortMeta[item.id as string];
                      const Icon = meta?.Icon;

                      return (
                        <form.Field
                          key={item.id}
                          name="sort"
                          children={(field) => {
                            const selected = field.state.value === item.id;

                            return (
                              <button
                                type="button"
                                onClick={() =>
                                  field.setValue(item.id as SortOptions)
                                }
                                className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors active:scale-[0.97] ${
                                  selected
                                    ? "border-primary bg-primary text-primary-foreground"
                                    : "border-border bg-background text-muted-foreground hover:border-foreground/20 hover:text-foreground"
                                }`}
                              >
                                {Icon && <Icon className="h-3.5 w-3.5" />}
                                {item.name}
                              </button>
                            );
                          }}
                        />
                      );
                    })}
                  </div>
                </section>
              )}

              {chipOptions.map(({ key, name, items }) => {
                const lockedValues = lockedFilters?.[key as keyof Filter];
                const isCategoryLocked =
                  Array.isArray(lockedValues) && lockedValues.length > 0;
                const isRarity = key === "rarityIds";

                return (
                  <section key={key}>
                    <SectionLabel
                      locked={isCategoryLocked}
                      fieldName={key}
                      form={form}
                    >
                      {name}
                    </SectionLabel>
                    <div className="flex flex-wrap gap-2">
                      {items.map((item) => {
                        const isItemLocked =
                          isCategoryLocked &&
                          (lockedValues as any[]).includes(item.id);
                        const isOtherDisabled =
                          isCategoryLocked && !isItemLocked;
                        const rarityStyle = isRarity
                          ? getRarityChipStyle(item.name)
                          : null;
                        const label = isRarity
                          ? stripRarityEmoji(item.name)
                          : item.name;

                        return (
                          <form.Field
                            key={item.id}
                            name={key as any}
                            children={(field: any) => {
                              const isSelected = Array.isArray(
                                field.state.value
                              )
                                ? field.state.value.includes(item.id)
                                : field.state.value === item.id;

                              return (
                                <button
                                  type="button"
                                  disabled={isItemLocked || isOtherDisabled}
                                  onClick={() => {
                                    if (isItemLocked || isOtherDisabled) return;
                                    if (!isSelected) {
                                      Array.isArray(field.state.value)
                                        ? field.pushValue(item.id)
                                        : field.setValue(item.id);
                                    } else if (
                                      Array.isArray(field.state.value)
                                    ) {
                                      const idx = field.state.value.findIndex(
                                        (v: any) => v === item.id
                                      );
                                      field.removeValue(idx);
                                    }
                                  }}
                                  className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors active:scale-[0.97] ${
                                    isSelected
                                      ? (rarityStyle?.selected ??
                                        "border-primary bg-primary/10 text-primary")
                                      : (rarityStyle?.base ??
                                        "border-border bg-background text-muted-foreground hover:border-foreground/20 hover:text-foreground")
                                  } ${isOtherDisabled ? "pointer-events-none opacity-30" : ""} ${isItemLocked ? "pointer-events-none opacity-50" : ""}`}
                                >
                                  {label}
                                </button>
                              );
                            }}
                          />
                        );
                      })}
                    </div>
                  </section>
                );
              })}

              {universeOption && (
                <section>
                  <button
                    type="button"
                    onClick={() => setUniverseExpanded(!universeExpanded)}
                    className="mb-3 flex w-full items-center gap-2"
                  >
                    <span className="text-[13px] font-semibold text-foreground">
                      {universeOption.name}
                    </span>
                    {Array.isArray(lockedFilters?.universeIds) &&
                      lockedFilters!.universeIds!.length > 0 && (
                        <span className="text-[10px] text-muted-foreground">
                          locked
                        </span>
                      )}
                    <SelectedCount fieldName="universeIds" form={form} />
                    <ChevronDown
                      className={`ml-auto h-4 w-4 text-muted-foreground transition-transform duration-200 ${universeExpanded ? "rotate-180" : ""}`}
                    />
                  </button>
                  {universeExpanded &&
                    (() => {
                      const lockedValues = lockedFilters?.universeIds;
                      const isCategoryLocked =
                        Array.isArray(lockedValues) && lockedValues.length > 0;
                      const groupLabels = getGroupLabels(universeOption.items);

                      return (
                        <div className="space-y-3">
                          {groupLabels.length > 1 && (
                            <div className="flex gap-2 overflow-x-auto pb-0.5">
                              {groupLabels.map((label) => (
                                <button
                                  key={label}
                                  type="button"
                                  onClick={() => setActiveGroup(label)}
                                  className={`shrink-0 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                                    activeGroup === label
                                      ? "border-primary bg-primary text-primary-foreground"
                                      : "border-border bg-background text-muted-foreground hover:border-foreground/20 hover:text-foreground active:scale-[0.97]"
                                  }`}
                                >
                                  {label}
                                </button>
                              ))}
                            </div>
                          )}
                          <div className="space-y-0.5">
                            {universeOption.items
                              .filter(
                                (item) =>
                                  !item.group ||
                                  groupLabels.length <= 1 ||
                                  item.group === activeGroup
                              )
                              .map((item) => {
                                const isItemLocked =
                                  isCategoryLocked &&
                                  (lockedValues as number[]).includes(
                                    item.id as number
                                  );
                                const isOtherDisabled =
                                  isCategoryLocked && !isItemLocked;

                                return (
                                  <form.Field
                                    key={item.id}
                                    name={"universeIds" as any}
                                    children={(field: any) => {
                                      const isSelected =
                                        field.state.value.includes(item.id);
                                      return (
                                        <Label
                                          htmlFor={`uni-${item.id}`}
                                          className={`flex cursor-pointer items-center rounded-lg px-3 py-2.5 transition-colors ${
                                            isSelected
                                              ? "bg-primary/10 text-primary"
                                              : "text-foreground hover:bg-muted"
                                          } ${isOtherDisabled ? "pointer-events-none opacity-30" : ""}`}
                                        >
                                          <Checkbox
                                            id={`uni-${item.id}`}
                                            disabled={
                                              isItemLocked || isOtherDisabled
                                            }
                                            checked={isSelected}
                                            onCheckedChange={(checked) => {
                                              if (
                                                isItemLocked ||
                                                isOtherDisabled
                                              )
                                                return;
                                              if (checked) {
                                                field.pushValue(item.id);
                                              } else {
                                                const idx =
                                                  field.state.value.findIndex(
                                                    (v: any) => v === item.id
                                                  );
                                                field.removeValue(idx);
                                              }
                                            }}
                                            className="mr-3 h-4 w-4"
                                          />
                                          <span className="text-sm">
                                            {item.name}
                                          </span>
                                        </Label>
                                      );
                                    }}
                                  />
                                );
                              })}
                          </div>
                        </div>
                      );
                    })()}
                </section>
              )}

              {authorOption && authorOption.items.length > 0 && (
                <section>
                  <button
                    type="button"
                    onClick={() => setAuthorExpanded(!authorExpanded)}
                    className="mb-3 flex w-full items-center gap-2"
                  >
                    <span className="text-[13px] font-semibold text-foreground">
                      {authorOption.name}
                    </span>
                    <SelectedCount fieldName="authorIds" form={form} />
                    <ChevronDown
                      className={`ml-auto h-4 w-4 text-muted-foreground transition-transform duration-200 ${authorExpanded ? "rotate-180" : ""}`}
                    />
                  </button>
                  {authorExpanded && (
                    <div className="space-y-0.5">
                      {authorOption.items.map((item) => (
                        <form.Field
                          key={item.id}
                          name={"authorIds" as any}
                          children={(field: any) => {
                            const isSelected = field.state.value.includes(
                              item.id
                            );
                            return (
                              <Label
                                htmlFor={`author-${item.id}`}
                                className={`flex cursor-pointer items-center rounded-lg px-3 py-2.5 transition-colors ${
                                  isSelected
                                    ? "bg-primary/10 text-primary"
                                    : "text-foreground hover:bg-muted"
                                }`}
                              >
                                <Checkbox
                                  id={`author-${item.id}`}
                                  checked={isSelected}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      field.pushValue(item.id);
                                    } else {
                                      const idx = field.state.value.findIndex(
                                        (v: any) => v === item.id
                                      );
                                      field.removeValue(idx);
                                    }
                                  }}
                                  className="mr-3 h-4 w-4"
                                />
                                <span className="text-sm">{item.name}</span>
                              </Label>
                            );
                          }}
                        />
                      ))}
                    </div>
                  )}
                </section>
              )}
            </div>
          </div>

          <div className="border-t bg-background px-5 py-4">
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => form.reset()}
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Сбросить
              </Button>
              <Button type="submit" size="sm" className="ml-auto min-w-[120px]">
                Применить
              </Button>
            </div>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}

function SectionLabel({
  children,
  icon,
  locked,
  fieldName,
  form,
}: {
  children: React.ReactNode;
  icon?: React.ReactNode;
  locked?: boolean;
  fieldName?: string;
  form?: any;
}) {
  return (
    <div className="mb-3 flex items-center gap-2">
      {icon && <span className="text-muted-foreground">{icon}</span>}
      <span className="text-[13px] font-semibold text-foreground">
        {children}
      </span>
      {locked && (
        <span className="text-[10px] text-muted-foreground">locked</span>
      )}
      {fieldName && form && <SelectedCount fieldName={fieldName} form={form} />}
    </div>
  );
}

function SelectedCount({ fieldName, form }: { fieldName: string; form: any }) {
  return (
    <form.Field
      name={fieldName}
      children={(field: any) => {
        const count = Array.isArray(field.state.value)
          ? field.state.value.length
          : 0;
        if (count === 0) return null;
        return (
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary/15 px-1.5 text-[11px] font-semibold text-primary">
            {count}
          </span>
        );
      }}
    />
  );
}
