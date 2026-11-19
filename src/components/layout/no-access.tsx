"use client";

import Link from "next/link";
import { LockIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { buttonVariants } from "@/components/ui/button";

/**
 * Shown for a route that is not in the admin's navigation, and for an admin whose
 * navigation is empty. The backend refuses the data of such a page with `403` in any case.
 */
export function NoAccess({ empty = false }: { empty?: boolean }) {
  const t = useTranslations("shell.noAccess");

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
      <span className="flex size-11 items-center justify-center rounded-full border bg-card text-muted-foreground">
        <LockIcon className="size-5" />
      </span>
      <h1 className="font-heading text-2xl font-semibold tracking-tight">{empty ? t("emptyTitle") : t("title")}</h1>
      <p className="max-w-sm text-sm text-muted-foreground">{empty ? t("emptyDescription") : t("description")}</p>
      {empty ? null : (
        <Link href="/" className={buttonVariants({ variant: "outline", className: "mt-2" })}>
          {t("back")}
        </Link>
      )}
    </div>
  );
}
