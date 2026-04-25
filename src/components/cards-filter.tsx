"use client";

import { useState } from "react";
import { useForm } from "@tanstack/react-form";
import { Filter as FilterIcon } from "lucide-react";

import { CardStats } from "@/db/schema/card";

import { Filter, FilterOption, SortOptions } from "./get-filte-options";
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

import { Input } from "./ui/input";

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
            <div className="space-y-2 px-1">
              <Label htmlFor="minPrice">Минимальная цена</Label>
              <form.Field
                name="minPrice"
                children={(field) => (
                  <Input
                    id="minPrice"
                    type="number"
                    placeholder="0"
                    value={field.state.value ?? ""}
                    disabled={lockedFilters?.minPrice !== undefined}
                    onChange={(e) => field.setValue(Number(e.target.value))}
                  />
                )}
              />
              {lockedFilters?.minPrice !== undefined && (
                <p className="text-[10px] text-muted-foreground">
                  🔒 Заблокировано продавцом
                </p>
              )}
            </div>

            <Accordion type="multiple">
              {filterOptions.map(({ key, name, items }) => {
                const lockedValues = lockedFilters?.[key as keyof Filter];
                const isCategoryLocked =
                  Array.isArray(lockedValues) && lockedValues.length > 0;

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
                      {items.slice(0, 7).map(({ id, name }) => {
                        const isItemLocked =
                          isCategoryLocked &&
                          (lockedValues as any[]).includes(id);
                        const isOtherDisabled =
                          isCategoryLocked && !isItemLocked;

                        return (
                          <form.Field
                            key={id}
                            name={key}
                            children={(field) => (
                              <Label
                                htmlFor={`${key}-${id}`}
                                className={`flex cursor-pointer p-2 ${
                                  isOtherDisabled ? "opacity-50" : ""
                                }`}
                              >
                                <Checkbox
                                  id={`${key}-${id}`}
                                  disabled={isItemLocked || isOtherDisabled}
                                  checked={
                                    Array.isArray(field.state.value)
                                      ? // @ts-ignore
                                        field.state.value.includes(id)
                                      : field.state.value === id
                                  }
                                  onCheckedChange={(checked) => {
                                    if (isItemLocked || isOtherDisabled) return;
                                    const currentId = id;
                                    if (checked) {
                                      Array.isArray(field.state.value)
                                        ? field.pushValue(currentId)
                                        : // @ts-ignore
                                          field.setValue(currentId);
                                    } else if (
                                      Array.isArray(field.state.value)
                                    ) {
                                      const valueIdx =
                                        field.state.value.findIndex(
                                          (value) => value === currentId
                                        );
                                      field.removeValue(valueIdx);
                                    }
                                  }}
                                  className="mr-2 h-4 w-4"
                                />
                                {name}
                                {isItemLocked && " 🔒"}
                              </Label>
                            )}
                          />
                        );
                      })}
                      {items.length > 8 && (
                        <AccordionItem value={key + "more"}>
                          <AccordionTrigger>
                            Показать больше/меньше ({items.length - 7} скрытых)
                          </AccordionTrigger>
                          <AccordionContent>
                            {items.slice(7).map(({ id, name }) => {
                              const isItemLocked =
                                isCategoryLocked &&
                                (lockedValues as any[]).includes(id);
                              const isOtherDisabled =
                                isCategoryLocked && !isItemLocked;

                              return (
                                <form.Field
                                  key={id}
                                  name={key}
                                  children={(field) => (
                                    <Label
                                      htmlFor={`${key}-${id}`}
                                      className={`flex cursor-pointer p-2 ${
                                        isOtherDisabled ? "opacity-50" : ""
                                      }`}
                                    >
                                      <Checkbox
                                        id={`${key}-${id}`}
                                        disabled={
                                          isItemLocked || isOtherDisabled
                                        }
                                        checked={
                                          Array.isArray(field.state.value)
                                            ? // @ts-ignore
                                              field.state.value.includes(id)
                                            : field.state.value === id
                                        }
                                        onCheckedChange={(checked) => {
                                          if (isItemLocked || isOtherDisabled)
                                            return;
                                          const currentId = id;
                                          if (checked) {
                                            Array.isArray(field.state.value)
                                              ? field.pushValue(currentId)
                                              : // @ts-ignore
                                                field.setValue(currentId);
                                          } else if (
                                            Array.isArray(field.state.value)
                                          ) {
                                            const valueIdx =
                                              field.state.value.findIndex(
                                                (value) => value === currentId
                                              );
                                            field.removeValue(valueIdx);
                                          }
                                        }}
                                        className="mr-2 h-4 w-4"
                                      />
                                      {name}
                                      {isItemLocked && " 🔒"}
                                    </Label>
                                  )}
                                />
                              );
                            })}
                          </AccordionContent>
                        </AccordionItem>
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
