"use client";

import type { ReactNode } from "react";

import { NoAccess } from "@/components/layout/no-access";
import { Skeleton } from "@/components/ui/skeleton";
import { usePermissions } from "@/features/session/hooks/use-permissions";

/** The warehouse pages are for admins who may view stock items or warehouse locations. */
export function WarehouseGate({ children }: { children: ReactNode }) {
  const { can, me } = usePermissions();

  if (!me) {
    return (
      <div className="flex flex-col gap-3 px-4 pt-7 sm:px-6" aria-busy>
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-14 w-full max-w-xl" />
      </div>
    );
  }
  return can("stock_items.view") || can("warehouse_locations.view") ? children : <NoAccess />;
}
