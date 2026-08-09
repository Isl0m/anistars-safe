"use client";

import { usePathname, useRouter } from "next/navigation";
import { Loader2, ShieldAlert } from "lucide-react";

import { canAccess, resolveAccess } from "@/lib/route-access";

import { useCurrentUser } from "@/hook/use-current-user";
import { useRouteAccessMap } from "@/hook/use-route-access";
import { Button } from "@/ui/button";

function AccessDenied() {
  const router = useRouter();
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
      <ShieldAlert className="h-10 w-10 text-muted-foreground" />
      <h2 className="text-lg font-semibold">Нет доступа</h2>
      <p className="max-w-xs text-sm text-muted-foreground">
        Этот раздел доступен только администраторам.
      </p>
      <Button className="mt-2" onClick={() => router.replace("/")}>
        На главную
      </Button>
    </div>
  );
}

function GuardLoader() {
  return (
    <div className="flex h-full items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );
}

export function RouteGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: accessMap } = useRouteAccessMap();
  const access = resolveAccess(accessMap, pathname);

  const { data: user, isLoading, isError } = useCurrentUser();

  if (access === "all") return <>{children}</>;
  if (isLoading) return <GuardLoader />;
  if (isError || !canAccess(access, user?.type)) return <AccessDenied />;

  return <>{children}</>;
}
