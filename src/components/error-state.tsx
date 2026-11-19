"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { cn } from "cn";

import { Button } from "@/components/ui/button";
import { isApiError } from "@/lib/api/client";
import { useErrorMessage } from "@/lib/api/use-error-message";

interface ErrorStateProps {
  title: string;
  /** The failed request. Its message and request id are shown under the title. */
  error?: unknown;
  /** Used instead of the error's message. */
  message?: string;
  onRetry?: () => void;
  children?: ReactNode;
  className?: string;
}

/** Centered error block for a screen or a panel that could not load. */
export function ErrorState({ title, error, message, onRetry, children, className }: ErrorStateProps) {
  const t = useTranslations("errors");
  const tCommon = useTranslations("common");
  const errorMessage = useErrorMessage();
  const requestId = isApiError(error) ? error.requestId : undefined;
  const text = message ?? (error !== undefined ? errorMessage(error) : undefined);

  return (
    <div
      role="alert"
      className={cn("flex min-h-56 flex-1 flex-col items-center justify-center gap-2 p-8 text-center", className)}
    >
      <p className="font-medium">{title}</p>
      {text ? <p className="max-w-md text-sm text-muted-foreground">{text}</p> : null}
      {requestId ? (
        <p className="font-mono text-xs text-muted-foreground select-all">{t("requestId", { id: requestId })}</p>
      ) : null}
      {children}
      {onRetry ? (
        <Button variant="outline" className="mt-2" onClick={onRetry}>
          {tCommon("tryAgain")}
        </Button>
      ) : null}
    </div>
  );
}
