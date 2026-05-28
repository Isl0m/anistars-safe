"use client";

import { useState } from "react";
import { useForm } from "@tanstack/react-form";
import { Filter as FilterIcon } from "lucide-react";

import { CardStats } from "@/db/schema/card";

import {
  Filter,
  FilterOption,
  FilterOptionItem,
  SortOptions,
} from "./get-filter-options";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "./ui/accordion";
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

  const hasGroups = (items: FilterOptionItem[]) =>
    items.some((item) => item.group);

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

  const renderCheckboxItem = (
    key: string,
    item: FilterOptionItem,
    isCategoryLocked: boolean,
    lockedValues: any
  ) => {
    const isItemLocked =
      isCategoryLocked && (lockedValues as any[]).includes(item.id);
    const isOtherDisabled = isCategoryLocked && !isItemLocked;

    return (
      <form.Field
        key={item.id}
        name={key as any}
        children={(field: any) => (
          <Label
            htmlFor={`${key}-${item.id}`}
            className={`flex cursor-pointer p-2 ${
              isOtherDisabled ? "opacity-50" : ""
            }`}
          >
            <Checkbox
              id={`${key}-${item.id}`}
              disabled={isItemLocked || isOtherDisabled}
              checked={
                Array.isArray(field.state.value)
                  ? field.state.value.includes(item.id)
                  : field.state.value === item.id
              }
              onCheckedChange={(checked) => {
                if (isItemLocked || isOtherDisabled) return;
                const currentId = item.id;
                if (checked) {
                  Array.isArray(field.state.value)
                    ? field.pushValue(currentId)
                    : field.setValue(currentId);
                } else if (Array.isArray(field.state.value)) {
                  const valueIdx = field.state.value.findIndex(
                    (value: any) => value === currentId
                  );
                  field.removeValue(valueIdx);
                }
              }}
              className="mr-2 h-4 w-4"
            />
            {item.name}
            {isItemLocked && " 🔒"}
          </Label>
        )}
      />
    );
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" aria-label="Show filters">
          <FilterIcon className="mr-2 h-4 w-4" />
          {buttonText || "Фильтры"}
        </Button>
      </SheetTrigger>
      <SheetContent
        aria-description="cards filter"
        side="right"
        className="mt-auto h-screen max-h-[calc(100vh-(var(--safe-area-top)))] w-full overflow-y-auto"
      >
        <SheetHeader>
          <SheetTitle className="text-lg">Фильтры</SheetTitle>
        </SheetHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            form.handleSubmit();
          }}
          className="mt-4"
        >
          <div className="space-y-3">
            <Accordion type="multiple">
              {filterOptions.map(({ key, name, items }) => {
                const lockedValues = lockedFilters?.[key as keyof Filter];
                const isCategoryLocked =
                  Array.isArray(lockedValues) && lockedValues.length > 0;

                const grouped = hasGroups(items);

                return (
                  <AccordionItem key={key} value={key}>
                    <AccordionTrigger>
                      <div className="flex items-center gap-2">
                        {name}
                        {isCategoryLocked && (
                          <span className="text-[10px] font-normal text-muted-foreground">
                            (🔒 Фикс.)
                          </span>
                        )}
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      {grouped ? (
                        <div className="space-y-2">
                          <div className="flex gap-1.5 overflow-x-auto pb-1">
                            {getGroupLabels(items).map((label) => (
                              <button
                                key={label}
                                type="button"
                                onClick={() => setActiveGroup(label)}
                                className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                                  activeGroup === label
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-muted text-muted-foreground"
                                }`}
                              >
                                {label}
                              </button>
                            ))}
                          </div>
                          <div>
                            {items
                              .filter((item) => item.group === activeGroup)
                              .map((item) =>
                                renderCheckboxItem(
                                  key,
                                  item,
                                  isCategoryLocked,
                                  lockedValues
                                )
                              )}
                          </div>
                        </div>
                      ) : (
                        <>
                          {items.slice(0, 7).map((item) =>
                            renderCheckboxItem(
                              key,
                              item,
                              isCategoryLocked,
                              lockedValues
                            )
                          )}
                          {items.length > 8 && (
                            <AccordionItem value={key + "more"}>
                              <AccordionTrigger>
                                Показать больше/меньше ({items.length - 7}{" "}
                                скрытых)
                              </AccordionTrigger>
                              <AccordionContent>
                                {items.slice(7).map((item) =>
                                  renderCheckboxItem(
                                    key,
                                    item,
                                    isCategoryLocked,
                                    lockedValues
                                  )
                                )}
                              </AccordionContent>
                            </AccordionItem>
                          )}
                        </>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          </div>
          <div className="grid grid-cols-2 gap-4 py-8">
            <Button
              type="button"
              variant={"secondary"}
              onClick={() => form.reset()}
            >
              Перезагрузить
            </Button>
            <Button type="submit">Применить</Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
