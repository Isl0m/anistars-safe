"use client";

import { useDeferredValue, useState } from "react";
import { useForm } from "react-hook-form";

import { FilterOption, FilterOptionKey } from "./get-filte-options";
import { Button } from "./ui/button";
import { Form, FormControl, FormField, FormItem } from "./ui/form";
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
  const isDisabled = useDeferredValue(isOptionOpen);
  const form = useForm<Inputs>({
    defaultValues: {
      authorId: "",
      classId: "",
      rarityId: "",
      universeId: "",
      type: "",
      droppable: "",
    },
  });
  const onSubmit = (data: Inputs) => {
    Object.entries(data).forEach(([key, value]) => {
      onFilterSelect(key, value);
    });
  };
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="w-full basis-1/6">
        <h2 className="mb-4 text-2xl font-semibold tracking-tight">Фильтры</h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-1">
          {filterOptions.map(({ key, name, items }) => (
            <FormField
              control={form.control}
              name={key}
              key={key}
              render={({ field }) => (
                <FormItem>
                  <Select
                    onOpenChange={setIsOptionOpen}
                    onValueChange={field.onChange}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={name} />
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
          <Button disabled={isDisabled} type="submit">
            Применить
          </Button>
          <Button
            disabled={isDisabled}
            onClick={() => {
              form.reset();
              onFiltersReset();
            }}
          >
            Перезагрузить
          </Button>
        </div>
      </form>
    </Form>
  );
}
