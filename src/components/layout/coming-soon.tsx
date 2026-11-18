"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ConstructionIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { buttonVariants } from "@/components/ui/button";
import { findNavLabel } from "@/features/navigation/lib/navigation-utils";
import { useNavigation } from "@/features/navigation/queries";

/** Placeholder for menu entries whose screen is not built yet. */
export function ComingSoon() {
  const pathname = usePathname();
  const t = useTranslations("shell.comingSoon");
  const { data: navigation } = useNavigation();
  const label = navigation ? findNavLabel(navigation, pathname) : undefined;

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
      <span className="flex size-11 items-center justify-center rounded-full border bg-card text-muted-foreground">
        <ConstructionIcon className="size-5" />
      </span>
      <h1 className="font-heading text-2xl font-semibold tracking-tight">{label ?? t("title")}</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        {t("description")}
      </p>
      <p className="font-mono text-xs text-muted-foreground">{pathname}</p>
      <Link href="/" className={buttonVariants({ variant: "outline", className: "mt-2" })}>
        {t("back")}
      </Link>
    </div>
  );
}
