"use client";

import { useState } from "react";
import { useForm } from "@tanstack/react-form";
import { ChevronDown, Filter as FilterIcon } from "lucide-react";

import { CardStats } from "@/db/schema/card";

import { Filter, FilterOption } from "./get-filte-options";
import { Button } from "./ui/button";
import { Checkbox } from "./ui/checkbox";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "./ui/collapsible";
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
};
export default function CardsFilter({ filterOptions, setFilters }: Props) {
  const form = useForm({
    defaultValues: {
      authorIds: [] as number[],
      classIds: [] as number[],
      rarityIds: [] as number[],
      universeIds: [] as number[],
      stats: [] as CardStats[],
      droppable: [] as string[],
      techniques: [] as string[],
    },
    onSubmit: async ({ value }) => {
      setFilters(value);
    },
  });

  const renderFilterOptions = (
    { items, key }: Pick<FilterOption, "items" | "key">,
    maxItems = 10
  ) => {
    const [isExpanded, setIsExpanded] = useState(false);
    console.log("isExpanded", key, isExpanded);
    const displayItems =
      isExpanded || items.length <= maxItems ? items : items.slice(0, maxItems);

    const hasMoreItems = items.length > maxItems;

    return (
      <CollapsibleContent className="max-h-80 space-y-2 overflow-y-auto pt-2">
        {displayItems.map(({ id, name }) => (
          <form.Field
            key={id}
            name={key}
            children={(field) => (
              <Label
                htmlFor={`${key}-${id}`}
                className="flex cursor-pointer p-2"
              >
                <Checkbox
                  id={`${key}-${id}`}
                  // @ts-ignore
                  checked={field.state.value.includes(id)}
                  onCheckedChange={(checked) => {
                    const currentId = id;
                    if (checked) {
                      field.pushValue(currentId);
                    } else {
                      const valueIdx = field.state.value.findIndex(
                        (value) => value === currentId
                      );
                      field.removeValue(valueIdx);
                    }
                  }}
                  className="mr-2 h-4 w-4"
                />
                {name}
              </Label>
            )}
          />
        ))}
        {hasMoreItems && (
          <div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsExpanded((prev) => !prev)}
              className="mt-2 w-full text-xs"
            >
              {isExpanded ? (
                <>Показать меньше ({items.length - maxItems} скрытых)</>
              ) : (
                <>Показать больше ({items.length - maxItems} больше)</>
              )}
            </Button>
          </div>
        )}
      </CollapsibleContent>
    );
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" aria-label="Show filters">
          <FilterIcon className="mr-2 h-4 w-4" />
          Фильтры
        </Button>
      </SheetTrigger>
      <SheetContent
        side="right"
        className="h-screen max-h-[calc(100vh-(var(--tg-viewport-safe-area-inset-top)+40px))] overflow-y-auto"
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
          className="mt-4 "
        >
          <div className="space-y-3">
            {filterOptions.map(({ key, name, items }) => (
              <Collapsible key={key}>
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    className="h-auto w-full justify-between rounded-lg border bg-muted/30 p-3"
                  >
                    <span className="text-base font-medium">{name}</span>
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </CollapsibleTrigger>
                {renderFilterOptions({ items, key })}
              </Collapsible>
            ))}
          </div>
          <div className="mt-8 grid grid-cols-2 gap-4">
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
