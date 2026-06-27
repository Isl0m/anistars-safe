"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Grid3X3,
  Heart,
  ImageIcon,
  Library,
  Menu,
  Repeat2,
  Store,
  User,
  Users,
  Zap,
} from "lucide-react";

import { cn } from "@/lib/utils";

import { Button } from "./ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "./ui/sheet";

const navGroups = [
  {
    label: "Карты",
    items: [
      { name: "Все карты", href: "/", Icon: Grid3X3 },
      { name: "Коллекция", href: "/profile/collection", Icon: Library },
      { name: "Отсутствующие", href: "/profile/missing", Icon: Heart },
    ],
  },
  {
    label: "Обмен",
    items: [
      { name: "Трейд", href: "/trade", Icon: Repeat2 },
      { name: "Маркетплейс", href: "/market", Icon: Store },
    ],
  },
  {
    label: "Профиль",
    items: [
      { name: "Мой профиль", href: "/profile", Icon: User },
      { name: "Мои карты", href: "/profile/cards", Icon: Grid3X3 },
      { name: "Поиск игроков", href: "/profile/search", Icon: Users },
    ],
  },
  {
    label: "Другое",
    items: [
      { name: "Улучшения", href: "/upgrades", Icon: Zap },
      { name: "Фоны", href: "/banners", Icon: ImageIcon },
    ],
  },
];

type Props = {
  title?: string;
  element?: JSX.Element;
};

const allHrefs = navGroups.flatMap((g) => g.items.map((i) => i.href));

function isNavActive(pathname: string, href: string) {
  if (pathname === href) return true;
  if (href === "/") return false;
  if (!pathname.startsWith(href)) return false;
  const hasMoreSpecific = allHrefs.some(
    (h) => h !== href && h.startsWith(href) && pathname.startsWith(h)
  );
  return !hasMoreSpecific;
}

export function Header({ title = "AniStars", element }: Props) {
  const pathname = usePathname();
  const router = useRouter();

  const handleOpenChange = (open: boolean) => {
    if (!open) return;
    allHrefs.forEach((href) => router.prefetch(href));
  };

  return (
    <header className="sticky top-0 z-20 border-b bg-card px-3 py-2.5">
      <div className="mx-auto flex items-center justify-between md:container">
        <h1 className="text-lg font-bold">{title}</h1>
        <div className="flex items-center gap-2">
          {element}
          <Sheet onOpenChange={handleOpenChange}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 md:hidden"
                aria-label="Меню"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent
              side="left"
              className="mt-auto max-h-[calc(100vh-(var(--safe-area-top)))] w-[280px] p-0"
            >
              <SheetHeader className="border-b px-4 py-4">
                <SheetTitle className="text-left text-lg">AniStars</SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col gap-1 overflow-y-auto px-2 py-3">
                {navGroups.map((group) => (
                  <div key={group.label} className="mb-1">
                    <span className="mb-1 block px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {group.label}
                    </span>
                    {group.items.map(({ name, href, Icon }) => {
                      const isActive = isNavActive(pathname, href);
                      return (
                        <Link
                          key={name}
                          href={href}
                          className={cn(
                            "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                            isActive
                              ? "bg-primary/10 font-medium text-primary"
                              : "text-muted-foreground hover:bg-muted hover:text-foreground"
                          )}
                        >
                          <Icon
                            className={cn(
                              "h-4 w-4",
                              isActive
                                ? "text-primary"
                                : "text-muted-foreground"
                            )}
                          />
                          {name}
                        </Link>
                      );
                    })}
                  </div>
                ))}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
