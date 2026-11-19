"use client";

import Link from "next/link";
import { BookOpenTextIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { routes } from "@/lib/routes";

import { useDocuments } from "../queries";

/** Account menu entry for the API documents. Only shown where the API publishes them. */
export function DocsMenuItem() {
  const t = useTranslations("docs");
  const documents = useDocuments();
  if (!documents.isSuccess) return null;

  return (
    <DropdownMenuItem render={<Link href={routes.docs} />}>
      <BookOpenTextIcon />
      {t("menu")}
    </DropdownMenuItem>
  );
}
