"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, Star, X } from "lucide-react";

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
];

export function Header() {
  const [isNavOpen, setIsNavOpen] = useState(false);
  return (
    <header className="sticky top-0 z-20 border-b bg-card p-4">
      <div className="container mx-auto flex items-center justify-between">
        <div className="flex items-center">
          <Star className="mr-2 h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">AniStars</h1>
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={() => setIsNavOpen(!isNavOpen)}
          aria-label="Toggle menu"
        >
          {isNavOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </Button>

        <nav
          className={cn(
            isNavOpen ? "block" : "hidden",
            `absolute left-0 right-0 top-full bg-background shadow-md md:relative md:block md:bg-transparent md:shadow-none`
          )}
        >
          <ul className="flex flex-col space-y-2 p-4 md:flex-row md:space-x-4 md:space-y-0 md:p-0">
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
