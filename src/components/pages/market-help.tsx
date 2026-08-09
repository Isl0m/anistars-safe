"use client";

import {
  AlertTriangle,
  ArrowRightLeft,
  Copy,
  HelpCircle,
  Send,
  Store,
  Tag,
} from "lucide-react";

import {
  MAX_ACTIVE_LISTINGS,
  MAX_ACTIVE_OFFERS,
  MAX_LISTING_CARDS,
} from "@/lib/constants";

import { Button } from "@/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/ui/drawer";

const SECTIONS = [
  {
    Icon: Store,
    color: "text-blue-500 bg-blue-500/10",
    title: "Как работает маркет",
    text: "Вы выставляете набор своих карт — это лот. Другие игроки предлагают свои карты взамен, а вы выбираете лучшее предложение.",
  },
  {
    Icon: Tag,
    color: "text-amber-500 bg-amber-500/10",
    title: "Лоты",
    text: `В лоте до ${MAX_LISTING_CARDS} карт. Можно указать требования к обмену: редкость, вселенную, класс, минимальную цену и количество карт. Активных лотов: ${MAX_ACTIVE_LISTINGS.basic} (с премиум — ${MAX_ACTIVE_LISTINGS.premium}). Свой лот можно снять в любой момент.`,
  },
  {
    Icon: Send,
    color: "text-violet-500 bg-violet-500/10",
    title: "Офферы",
    text: `Откройте лот и предложите свои карты по его условиям. На один лот — один оффер. Активных офферов: ${MAX_ACTIVE_OFFERS.basic} (с премиум — ${MAX_ACTIVE_OFFERS.premium}). Свои офферы и их отмена — во вкладке «Офферы».`,
  },
  {
    Icon: ArrowRightLeft,
    color: "text-green-600 bg-green-500/10",
    title: "Принятие обмена",
    text: "Продавец видит все предложения и принимает одно. Обмен необратим — карты переносятся сразу, остальные офферы лота отменяются автоматически.",
  },
  {
    Icon: Copy,
    color: "text-amber-600 bg-amber-500/10",
    title: "Дубликаты",
    text: "Если полученная карта уже есть в вашей коллекции, вместо неё вы получите 🧩 шард (для улучшаемых карт). Такие карты помечены в предложении.",
  },
  {
    Icon: AlertTriangle,
    color: "text-red-500 bg-red-500/10",
    title: "Занятые карты",
    text: "Карта в активном лоте или оффере считается занятой. Если обменять её в трейде, связанный лот или оффер будет отменён.",
  },
];

export function MarketHelp() {
  return (
    <Drawer>
      <DrawerTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9"
          aria-label="Как работает маркет"
        >
          <HelpCircle className="h-5 w-5" />
        </Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Как работает маркет</DrawerTitle>
          <DrawerDescription>
            Обменивайте наборы карт с другими игроками
          </DrawerDescription>
        </DrawerHeader>
        <div className="space-y-2 overflow-y-auto px-4 pb-8">
          {SECTIONS.map(({ Icon, color, title, text }) => (
            <div
              key={title}
              className="flex items-start gap-3 rounded-xl border p-3"
            >
              <span className={`rounded-md p-1.5 ${color}`}>
                <Icon className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm font-medium">{title}</p>
                <p className="text-xs text-muted-foreground">{text}</p>
              </div>
            </div>
          ))}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
