"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Plus, X } from "lucide-react";

import { getProxyUrl } from "@/lib/utils";
import { FullCard } from "@/db/schema/card";
import { User } from "@/db/schema/user";
import { Button, buttonVariants } from "@/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/ui/drawer";
import { Skeleton } from "@/ui/skeleton";

import { Header } from "../header";
import CardsPagination from "../pagination";
import { useTelegram } from "../telegram-provider";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/ui/tabs";

type MarketListing = {
  id: number;
  sellerId: string;
  status: string;
  createdAt: Date;
  seller: User;
  cards: FullCard[];
};

export default function MarketPage() {
  const { tgUser } = useTelegram();
  const [listings, setListings] = useState<MarketListing[]>([]);
  const [userListings, setUserListings] = useState<MarketListing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_URL}/api/market/listings`);
        const data = await res.json();
        setListings(data.listings);
        
        if (tgUser) {
          const userRes = await fetch(`${process.env.NEXT_PUBLIC_URL}/api/market/user-listings?id=${tgUser.id.toString()}`);
          const userData = await userRes.json();
          setUserListings(userData.listings);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [tgUser]);

  const currentListings = activeTab === "all" ? listings : userListings;
  const [page, setPage] = useState(1);
  let cardsPerPage = 10;
  const cardsLeft = currentListings.length - page * cardsPerPage;
  const skip = (page - 1) * cardsPerPage;
  const pageListings = currentListings.slice(skip, skip + cardsPerPage);

  const handleChangePage = (page: number) => {
    setPage(page);
  };

  return (
    <main className="flex min-h-screen flex-col gap-4 md:container pb-20">
      <Header 
        title="Маркетплейс" 
        element={
          <Link
            href="/market/create"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            <Plus className="mr-1 h-4 w-4" /> Выставить
          </Link>
        }
      />
      
      <div className="px-2">
        <Tabs defaultValue="all" onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="all">Все объявления</TabsTrigger>
            <TabsTrigger value="my">Мои объявления</TabsTrigger>
          </TabsList>
          <TabsContent value="all" className="mt-4">
            <ListingsList 
              listings={pageListings} 
              isLoading={isLoading} 
              page={page} 
              cardsLeft={cardsLeft} 
              handleChangePage={handleChangePage} 
            />
          </TabsContent>
          <TabsContent value="my" className="mt-4">
            <ListingsList 
              listings={pageListings} 
              isLoading={isLoading} 
              page={page} 
              cardsLeft={cardsLeft} 
              handleChangePage={handleChangePage} 
            />
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}

function ListingsList({ 
  listings, 
  isLoading, 
  page, 
  cardsLeft, 
  handleChangePage 
}: { 
  listings: MarketListing[], 
  isLoading: boolean,
  page: number,
  cardsLeft: number,
  handleChangePage: (page: number) => void
}) {
  if (isLoading) {
    return (
      <div className="flex flex-col gap-2">
        <Skeleton className="h-24 rounded" />
        <Skeleton className="h-24 rounded" />
        <Skeleton className="h-24 rounded" />
      </div>
    );
  }

  if (listings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-10 text-muted-foreground">
        <p>Нет объявлений</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-2">
        {listings.map((listing) => (
          <div
            key={listing.id}
            className="rounded-lg border border-border bg-card p-3 shadow-sm"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex flex-col">
                <span className="text-sm font-semibold">{listing.seller.name}</span>
                <span className="text-[10px] text-muted-foreground">
                  {new Date(listing.createdAt).toLocaleDateString("ru-RU")}
                </span>
              </div>
              <Link 
                href={`/market/${listing.id}`}
                className={buttonVariants({ size: "sm" })}
              >
                Посмотреть
              </Link>
            </div>

            <div className="flex -space-x-3 overflow-hidden">
              {listing.cards.slice(0, 6).map((card) => (
                <div
                  key={card.id}
                  className="relative h-16 w-12 flex-shrink-0 overflow-hidden rounded-md border-2 border-background shadow-sm"
                >
                  <Image
                    src={getProxyUrl(card.image)}
                    alt={card.name}
                    fill
                    className="object-cover"
                  />
                </div>
              ))}
              {listing.cards.length > 6 && (
                <div className="relative flex h-16 w-12 items-center justify-center rounded-md border-2 border-background bg-muted text-[10px] font-bold shadow-sm">
                  +{listing.cards.length - 6}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4">
        <CardsPagination
          page={page}
          cardsLeft={cardsLeft}
          handleChangePage={handleChangePage}
        />
      </div>
    </>
  );
}
