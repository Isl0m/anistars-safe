import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api";
import { buildAccessMap, RouteAccessMap } from "@/lib/route-access";

export const routeAccessKey = ["route-access"] as const;

export function useRouteAccessMap() {
  return useQuery({
    queryKey: routeAccessKey,
    staleTime: 15_000,
    initialData: buildAccessMap({}),
    initialDataUpdatedAt: 0,
    queryFn: async () => {
      const { data } = await api.get<{ access: RouteAccessMap }>(
        `/api/settings/route-access`
      );
      console.log(data);
      return data.access;
    },
  });
}
