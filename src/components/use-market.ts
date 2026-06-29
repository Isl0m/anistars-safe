import { useQuery } from "@tanstack/react-query";

import { Card } from "@/db/schema/card";

import { ListingFilters } from "./get-filter-options";

const BASE = process.env.NEXT_PUBLIC_URL;

const STALE_TIME = 30 * 1000;

export type MarketUser = {
  id: string;
  name: string;
  photoUrl: string | null;
};

export type MarketCard = Pick<Card, "id" | "name" | "image">;

export type MarketListingSummary = {
  id: number;
  sellerId: string;
  status: string;
  createdAt: string;
  filters: ListingFilters | null;
  seller: MarketUser;
  cards: MarketCard[];
  offerCount: number;
  pendingOfferCount: number;
};

export type MarketListingDetail = {
  id: number;
  sellerId: string;
  status: string;
  createdAt: string;
  filters: ListingFilters | null;
  seller: MarketUser;
  cards: MarketCard[];
};

export type MarketOffer = {
  id: number;
  buyerId: string;
  status: string;
  createdAt: string;
  buyer: MarketUser;
  cards: MarketCard[];
};

export type UserMarketOffer = {
  id: number;
  listingId: number;
  buyerId: string;
  status: string;
  createdAt: string;
  cards: MarketCard[];
  listing: {
    id: number;
    sellerId: string;
    status: string;
    seller: MarketUser;
    cards: MarketCard[];
  } | null;
};

export const marketKeys = {
  listings: ["market", "listings"] as const,
  userListings: (userId: string) =>
    ["market", "user-listings", userId] as const,
  userOffers: (userId: string) => ["market", "user-offers", userId] as const,
  offers: (id: string) => ["market", "offers", id] as const,
};

export function useMarketListings(initialData?: MarketListingSummary[]) {
  return useQuery({
    queryKey: marketKeys.listings,
    queryFn: async () => {
      const res = await fetch(`${BASE}/api/market/listings`);
      const data = (await res.json()) as { listings: MarketListingSummary[] };
      return data.listings;
    },
    staleTime: STALE_TIME,
    initialData,
  });
}

export function useUserMarketListings(
  userId?: string,
  opts?: { status?: "inactive"; enabled?: boolean }
) {
  return useQuery({
    queryKey: [...marketKeys.userListings(userId ?? ""), opts?.status ?? "all"],
    enabled: (opts?.enabled ?? true) && !!userId,
    queryFn: async () => {
      const params = new URLSearchParams({ id: userId! });
      if (opts?.status) params.set("status", opts.status);
      const res = await fetch(`${BASE}/api/market/user-listings?${params}`);
      const data = (await res.json()) as { listings: MarketListingSummary[] };
      return data.listings;
    },
    staleTime: STALE_TIME,
  });
}

export function useUserMarketOffers(userId?: string) {
  return useQuery({
    queryKey: marketKeys.userOffers(userId ?? ""),
    enabled: !!userId,
    queryFn: async () => {
      const res = await fetch(`${BASE}/api/market/user-offers?id=${userId}`);
      const data = (await res.json()) as { offers: UserMarketOffer[] };
      return data.offers;
    },
    staleTime: STALE_TIME,
  });
}

export function useMarketOffers(id: string) {
  return useQuery({
    queryKey: marketKeys.offers(id),
    queryFn: async () => {
      const res = await fetch(`${BASE}/api/market/listings/${id}/offers`);
      const data = (await res.json()) as { offers: MarketOffer[] };
      return data.offers;
    },
    staleTime: STALE_TIME,
  });
}
