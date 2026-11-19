"use client";

import { useRouter } from "next/navigation";
import { SparklesIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { usePermissions } from "@/features/session/hooks/use-permissions";

import { assistantHrefFor } from "../lib/page-context";

/**
 * Header button that opens the assistant with the page the admin is on as context.
 * Only shown with `assistant.use`.
 */
export function AssistantButton({ className }: { className?: string }) {
  const t = useTranslations("assistant");
  const router = useRouter();
  const { can } = usePermissions();

  if (!can("assistant.use")) return null;

  return (
    <Button
      variant="ghost"
      size="icon"
      className={className}
      aria-label={t("open")}
      title={t("open")}
      // The address is read at click time, so the header needs no URL subscription.
      onClick={() => router.push(assistantHrefFor(window.location.pathname, window.location.search))}
    >
      <SparklesIcon />
    </Button>
  );
}
