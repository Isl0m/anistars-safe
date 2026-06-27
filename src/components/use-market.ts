import { useQuery } from "@tanstack/react-query";

import { Card } from "@/db/schema/card";

import { ListingFilters } from "./get-filter-options";

const BASE = process.env.NEXT_PUBLIC_URL;

// Market reads change more slowly than the user navigates between the feed and
// a listing, so we keep them fresh for the same window the server caches them.
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
  listing: (id: string) => ["market", "listing", id] as const,
  offers: (id: string) => ["market", "offers", id] as const,
};

export function useMarketListings() {
  return useQuery({
    queryKey: marketKeys.listings,
    queryFn: async () => {
      const res = await fetch(`${BASE}/api/market/listings`);
      const data = (await res.json()) as { listings: MarketListingSummary[] };
      return data.listings;
    },
    staleTime: STALE_TIME,
  });
}

export function useUserMarketListings(userId?: string) {
  return useQuery({
    queryKey: marketKeys.userListings(userId ?? ""),
    enabled: !!userId,
    queryFn: async () => {
      const res = await fetch(
        `${BASE}/api/market/user-listings?id=${userId}`
      );
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

export function useMarketListing(id: string) {
  return useQuery({
    queryKey: marketKeys.listing(id),
    queryFn: async () => {
      const res = await fetch(`${BASE}/api/market/listings/${id}`);
      const data = (await res.json()) as {
        listing: MarketListingDetail | null;
      };
      return data.listing;
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
