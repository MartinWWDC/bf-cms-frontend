"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";

import { ErrorState } from "@/components/error-state";
import { NoAccess } from "@/components/layout/no-access";
import { Skeleton } from "@/components/ui/skeleton";

import { canOpenPage, canOpenResource } from "../lib/navigation-utils";
import { useNavigation } from "../queries";

interface RouteGuardProps {
  /** The screen shows this resource. */
  resource?: string;
  /** The screen is this fixed page (`roles`, `tasks`, `dashboards/operations`). */
  page?: string;
  /** Also accept any page under `page/` (`dashboards` for `dashboards/{key}`). */
  pagePrefix?: boolean;
  children: ReactNode;
}

/**
 * The navigation is the list of pages this admin may open (`field-types.md` section 8).
 * A route that is not in it renders the "no access" page instead of its screen.
 */
export function RouteGuard({ resource, page, pagePrefix = false, children }: RouteGuardProps) {
  const navigation = useNavigation();
  const t = useTranslations("shell");

  if (navigation.isPending) {
    return (
      <div className="flex flex-col gap-3 px-4 pt-7 sm:px-6" aria-busy>
        <Skeleton className="h-9 w-44" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
    );
  }
  if (navigation.isError) {
    return <ErrorState title={t("menuLoadFailed")} error={navigation.error} onRetry={() => navigation.refetch()} />;
  }

  const allowed =
    (resource === undefined || canOpenResource(navigation.data, resource)) &&
    (page === undefined || canOpenPage(navigation.data, page, pagePrefix));

  return allowed ? children : <NoAccess />;
}
