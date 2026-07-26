import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api";

import { ListingFilters } from "@/components/get-filter-options";
import { Card } from "@/db/schema/card";

const STALE_TIME = 10 * 1000;

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

export type OfferedCard = MarketCard & { owned?: boolean };

export type MarketOffer = {
  id: number;
  buyerId: string;
  status: string;
  createdAt: string;
  buyer: MarketUser;
  cards: OfferedCard[];
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
  listing: (id: string) => ["market", "listing", id] as const,
  userListings: (userId: string) =>
    ["market", "user-listings", userId] as const,
  userOffers: (userId: string) => ["market", "user-offers", userId] as const,
  offers: (id: string) => ["market", "offers", id] as const,
  limits: ["market", "limits"] as const,
};

type MarketLimit = { active: number; limit: number; canCreate: boolean };

export type MarketLimits = {
  isPremium: boolean;
  listings: MarketLimit;
  offers: MarketLimit;
};

export function useMarketLimits(enabled = true) {
  return useQuery({
    queryKey: marketKeys.limits,
    enabled,
    queryFn: async () => {
      const { data } = await api.get<MarketLimits>(`/api/market/limits`);
      return data;
    },
    staleTime: STALE_TIME,
  });
}

export function useMarketListings(initialData?: MarketListingSummary[]) {
  return useQuery({
    queryKey: marketKeys.listings,
    queryFn: async () => {
      const { data } = await api.get<{ listings: MarketListingSummary[] }>(
        `/api/market/listings`
      );
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
      const { data } = await api.get<{ listings: MarketListingSummary[] }>(
        `/api/market/user-listings`,
        {
          params: { status: opts?.status },
        }
      );
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
      const { data } = await api.get<{ offers: UserMarketOffer[] }>(
        `/api/market/user-offers`
      );
      return data.offers;
    },
    staleTime: STALE_TIME,
  });
}

export function useMarketListing(
  id: string,
  initialData?: MarketListingDetail
) {
  return useQuery({
    queryKey: marketKeys.listing(id),
    queryFn: async () => {
      const { data } = await api.get<{ listing: MarketListingDetail }>(
        `/api/market/listings/${id}`
      );
      return data.listing;
    },
    staleTime: STALE_TIME,
    initialData,
  });
}

export function useMarketOffers(id: string) {
  return useQuery({
    queryKey: marketKeys.offers(id),
    queryFn: async () => {
      const { data } = await api.get<{ offers: MarketOffer[] }>(
        `/api/market/listings/${id}/offers`
      );
      return data.offers;
    },
    staleTime: STALE_TIME,
  });
}
