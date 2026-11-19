"use client";

import Link from "next/link";
import { ScanLineIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { usePermissions } from "@/features/session/hooks/use-permissions";
import { routes } from "@/lib/routes";

/**
 * Account menu entry for the scan page. The page is not a navigation node of the API, so
 * it is offered here to admins who may view stock items or warehouse locations.
 */
export function WarehouseMenuItem() {
  const t = useTranslations("userMenu");
  const { can } = usePermissions();

  if (!can("stock_items.view") && !can("warehouse_locations.view")) return null;
  return (
    <DropdownMenuItem render={<Link href={routes.warehouseScan} />}>
      <ScanLineIcon />
      {t("warehouseScan")}
    </DropdownMenuItem>
  );
}
