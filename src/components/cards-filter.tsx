"use client";

import { useDeferredValue, useRef, useState } from "react";
import { ChevronUp, Filter, X } from "lucide-react";
import { useForm } from "react-hook-form";

import { cn } from "@/lib/utils";

import { FilterOption, FilterOptionKey } from "./get-filte-options";
import { Button } from "./ui/button";
import { Form, FormControl, FormField, FormItem } from "./ui/form";
import { Label } from "./ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

type Props = {
  filterOptions: FilterOption[];
  onFilterSelect: (key: string, value: string) => void;
  onFiltersReset: () => void;
};
type Inputs = Record<FilterOptionKey, string>;
export default function CardsFilter({
  filterOptions,
  onFilterSelect,
  onFiltersReset,
}: Props) {
  const [isOptionOpen, setIsOptionOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);
  const isDisabled = useDeferredValue(isOptionOpen);

  const form = useForm<Inputs>({
    defaultValues: {
      authorId: "",
      classId: "",
      rarityId: "",
      universeId: "",
      stats: "",
      droppable: "",
      technique: "",
    },
  });
  const onSubmit = (data: Inputs) => {
    Object.entries(data).forEach(([key, value]) => {
      onFilterSelect(key, value);
    });
  };
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (
      !(isOptionOpen || isDisabled) &&
      drawerRef.current &&
      !drawerRef.current.contains(e.target as Node)
    ) {
      setShowFilters(false);
    }
  };
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="w-full basis-1/6">
        <Button
          onClick={() => setShowFilters(!showFilters)}
          variant="outline"
          aria-label="Show filters"
        >
          <Filter className="mr-2 h-4 w-4" />
          Фильтры
        </Button>

        {/* Filter Drawer */}
        <div
          className={`fixed inset-0 z-30 bg-background/80 backdrop-blur-sm ${
            showFilters
              ? "pointer-events-auto opacity-100"
              : "pointer-events-none opacity-0"
          } transition-opacity duration-300`}
          onClick={handleBackdropClick}
        />
        <div
          ref={drawerRef}
          className={`fixed bottom-0 left-0 right-0 z-40 transform bg-card ${
            showFilters ? "translate-y-0" : "translate-y-full"
          } rounded-t-3xl shadow-lg transition-transform duration-300 ease-in-out`}
        >
          <div className="space-y-6 p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold">Фильтры</h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowFilters(false);
                }}
                aria-label="Close filters"
              >
                <X className="h-6 w-6" />
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {filterOptions.map(({ key, name, items, span }) => (
                <FormField
                  control={form.control}
                  name={key}
                  key={key}
                  render={({ field }) => (
                    <FormItem className={cn(span && `col-span-${span}`)}>
                      <Label>{name}</Label>
                      <Select
                        onOpenChange={setIsOptionOpen}
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Выбрать" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {items.map(({ id, name }) => (
                            <SelectItem value={id.toString()} key={id}>
                              {name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
              ))}
            </div>
            <div className="mt-8 grid grid-cols-2 gap-4">
              <Button
                disabled={isDisabled}
                onClick={() => {
                  form.reset();
                  onFiltersReset();
                }}
              >
                Перезагрузить
              </Button>
              <Button disabled={isDisabled} type="submit">
                Применить
              </Button>
            </div>
          </div>
          <div className="mx-auto mb-4 flex h-6 w-12 items-center justify-center">
            <ChevronUp className="h-6 w-6 text-muted-foreground" />
          </div>
        </div>
      </form>
    </Form>
  );
}
