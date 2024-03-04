"use client";

import { capitalize } from "@/lib/utils";

import { FilterOption } from "@/app/page";

import { Button } from "./ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

type Props = {
  filterOptions: FilterOption[];
  onFilterSelect: (key: string, value: string) => void;
  onFiltersReset: () => void;
};

export default function CardsFilter({
  filterOptions,
  onFilterSelect,
  onFiltersReset,
}: Props) {
  return (
    <div>
      <h2 className="mb-4 text-2xl font-semibold tracking-tight">Фильтры</h2>
      <div className="flex flex-col gap-4">
        {filterOptions.map(({ key, name, items }) => (
          <Select
            onValueChange={(value) => onFilterSelect(key, value)}
            key={key}
          >
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue placeholder={name} />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {items.map(({ id, slug, name }) => (
                  <SelectItem value={id.toString()} key={id}>
                    {capitalize(name)}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        ))}
        <Button onClick={onFiltersReset}>Перезагрузить</Button>
      </div>
    </div>
  );
}
