"use client";

import { useState } from "react";
import { useForm } from "@tanstack/react-form";
import {
  ChevronDown,
  Filter as FilterIcon,
  RotateCcw,
} from "lucide-react";

import { CardStats } from "@/db/schema/card";

import { ListingFilterOption, ListingFilters } from "./get-filter-options";
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
  filterOptions: ListingFilterOption[];
  setFilters: (filters: ListingFilters) => void;
  buttonText?: string;
};

const chipKeys = new Set(["rarityIds", "classIds", "stats", "type"]);

export default function ListingFilter({
  filterOptions,
  setFilters,
  buttonText,
}: Props) {
  const [open, setOpen] = useState(false);
  const [universeExpanded, setUniverseExpanded] = useState(false);

  const form = useForm({
    defaultValues: {
      classIds: [] as number[],
      rarityIds: [] as number[],
      universeIds: [] as number[],
      stats: [] as CardStats[],
      type: [] as ListingFilters["type"],
    },
    onSubmit: async ({ value }) => {
      setFilters(value);
      setOpen(false);
    },
  });

  const chipOptions = filterOptions.filter((o) => chipKeys.has(o.key));
  const universeOption = filterOptions.find((o) => o.key === "universeIds");

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          aria-label="Show filters"
          className="gap-2"
        >
          <FilterIcon className="h-4 w-4" />
          {buttonText || "Фильтры"}
        </Button>
      </SheetTrigger>
      <SheetContent
        aria-description="cards filter"
        side="right"
        className="mt-auto flex h-screen max-h-[calc(100vh-(var(--safe-area-top)))] w-full flex-col p-0"
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
          <div className="flex-1 overflow-y-auto px-5 py-5">
            <div className="space-y-6">
              {chipOptions.map(({ key, name, items }) => (
                <section key={key}>
                  <div className="mb-3 flex items-center gap-2">
                    <span className="text-[13px] font-semibold text-foreground">
                      {name}
                    </span>
                    <SelectedCount fieldName={key} form={form} />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {items.map(({ id, name }) => (
                      <form.Field
                        key={id}
                        name={key}
                        children={(field) => {
                          const isSelected = Array.isArray(field.state.value)
                            ? // @ts-ignore
                              field.state.value.includes(id)
                            : field.state.value === id;

                          return (
                            <button
                              type="button"
                              onClick={() => {
                                if (!isSelected) {
                                  Array.isArray(field.state.value)
                                    ? field.pushValue(id)
                                    : // @ts-ignore
                                      field.setValue(id);
                                } else if (Array.isArray(field.state.value)) {
                                  const idx = field.state.value.findIndex(
                                    (v) => v === id
                                  );
                                  field.removeValue(idx);
                                }
                              }}
                              className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                                isSelected
                                  ? "border-primary bg-primary/10 text-primary"
                                  : "border-border bg-background text-muted-foreground hover:border-foreground/20 hover:text-foreground active:scale-[0.97]"
                              }`}
                            >
                              {name}
                            </button>
                          );
                        }}
                      />
                    ))}
                  </div>
                </section>
              ))}

              {universeOption && universeOption.items.length > 0 && (
                <section>
                  <button
                    type="button"
                    onClick={() => setUniverseExpanded(!universeExpanded)}
                    className="mb-3 flex w-full items-center gap-2"
                  >
                    <span className="text-[13px] font-semibold text-foreground">
                      {universeOption.name}
                    </span>
                    <SelectedCount fieldName="universeIds" form={form} />
                    <ChevronDown
                      className={`ml-auto h-4 w-4 text-muted-foreground transition-transform duration-200 ${universeExpanded ? "rotate-180" : ""}`}
                    />
                  </button>
                  {universeExpanded && (
                    <div className="space-y-0.5">
                      {universeOption.items.map(({ id, name }) => (
                        <form.Field
                          key={id}
                          name="universeIds"
                          children={(field) => {
                            const isSelected = field.state.value.includes(
                              id as number
                            );
                            return (
                              <Label
                                htmlFor={`listing-uni-${id}`}
                                className={`flex cursor-pointer items-center rounded-lg px-3 py-2.5 transition-colors ${
                                  isSelected
                                    ? "bg-primary/10 text-primary"
                                    : "text-foreground hover:bg-muted"
                                }`}
                              >
                                <Checkbox
                                  id={`listing-uni-${id}`}
                                  checked={isSelected}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      field.pushValue(id as number);
                                    } else {
                                      const idx = field.state.value.findIndex(
                                        (v) => v === id
                                      );
                                      field.removeValue(idx);
                                    }
                                  }}
                                  className="mr-3 h-4 w-4"
                                />
                                <span className="text-sm">{name}</span>
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
