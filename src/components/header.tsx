"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";

import { cn } from "@/lib/utils";

import { Button, buttonVariants } from "./ui/button";

const pages = [
  {
    name: "Все карты",
    href: "/",
  },
  {
    name: "Профиль",
    href: "/profile",
  },
  {
    name: "Профиль других",
    href: "/profile/search",
  },
  {
    name: "Отсуствующие карты",
    href: "/profile/missing",
  },
  {
    name: "Трейд",
    href: "/trade",
  },
];

type Props = {
  title?: string;
  element?: JSX.Element;
};

export function Header({ title = "AniStars", element }: Props) {
  const [isNavOpen, setIsNavOpen] = useState(false);
  return (
    <header className="sticky top-0 z-20 border-b bg-card p-2">
      <div className="mx-auto flex items-center justify-between md:container">
        <h1 className="text-2xl font-bold">{title}</h1>
        <div className="flex items-center gap-4">
          {element}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setIsNavOpen(!isNavOpen)}
            aria-label="Toggle menu"
          >
            {isNavOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </Button>
        </div>
        <nav
          className={cn(
            isNavOpen ? "block" : "hidden",
            `absolute left-0 right-0 top-full bg-background shadow-md`
          )}
        >
          <ul className="flex flex-col space-y-2 p-4 ">
            {pages.map(({ name, href }) => (
              <li key={name}>
                <Link
                  href={href}
                  className={buttonVariants({
                    variant: "ghost",
                    className: "w-full !justify-start",
                  })}
                  onClick={() => setIsNavOpen(false)}
                >
                  {name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  );
}
