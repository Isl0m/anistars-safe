"use client";

import { useState } from "react";
import { useForm } from "@tanstack/react-form";
import { Filter as FilterIcon } from "lucide-react";

import { CardStats } from "@/db/schema/card";

import { ListingFilterOption, ListingFilters } from "./get-filte-options";
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
  filterOptions: ListingFilterOption[];
  setFilters: (filters: ListingFilters) => void;
  buttonText?: string;
};

export default function ListingFilter({
  filterOptions,
  setFilters,
  buttonText,
}: Props) {
  const [open, setOpen] = useState(false);
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
              {filterOptions.map(({ key, name, items }) => (
                <AccordionItem key={key} value={key}>
                  <AccordionTrigger>{name}</AccordionTrigger>
                  <AccordionContent>
                    {items.slice(0, 7).map(({ id, name }) => (
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
                              checked={
                                Array.isArray(field.state.value)
                                  ? // @ts-ignore
                                    field.state.value.includes(id)
                                  : field.state.value === id
                              }
                              onCheckedChange={(checked) => {
                                const currentId = id;
                                if (checked) {
                                  Array.isArray(field.state.value)
                                    ? field.pushValue(currentId)
                                    : // @ts-ignore
                                      field.setValue(currentId);
                                } else if (Array.isArray(field.state.value)) {
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
                    {items.length > 8 && (
                      <AccordionItem value={key + "more"}>
                        <AccordionTrigger>
                          Показать больше/меньше ({items.length - 7} скрытых)
                        </AccordionTrigger>
                        <AccordionContent>
                          {items.slice(7).map(({ id, name }) => (
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
                                    checked={
                                      Array.isArray(field.state.value)
                                        ? // @ts-ignore
                                          field.state.value.includes(id)
                                        : field.state.value === id
                                    }
                                    onCheckedChange={(checked) => {
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
                                </Label>
                              )}
                            />
                          ))}
                        </AccordionContent>
                      </AccordionItem>
                    )}
                  </AccordionContent>
                </AccordionItem>
              ))}
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
