"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { ErrorState } from "@/components/error-state";
import { NoAccess } from "@/components/layout/no-access";

import { firstLeafHref } from "../lib/navigation-utils";
import { useNavigation } from "../queries";

interface HomeRedirectProps {
  /** Where to go instead of the first menu entry, once known. `null` means "none". */
  preferred?: string | null;
  /** Still working out `preferred`. */
  waiting?: boolean;
}

/** The start page: sends the admin to their home screen, or to the first entry of their menu. */
export function HomeRedirect({ preferred = null, waiting = false }: HomeRedirectProps) {
  const router = useRouter();
  const navigation = useNavigation();
  const t = useTranslations("shell");
  const target = waiting || !navigation.data ? undefined : (preferred ?? firstLeafHref(navigation.data));

  useEffect(() => {
    if (target) router.replace(target);
  }, [target, router]);

  if (navigation.isError) {
    return <ErrorState title={t("menuLoadFailed")} error={navigation.error} onRetry={() => navigation.refetch()} />;
  }
  if (navigation.data && !waiting && !target) return <NoAccess empty />;
  return null;
}
