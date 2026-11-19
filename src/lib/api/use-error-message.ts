"use client";

import { useCallback } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { isApiError } from "./client";

/**
 * Text for any failed request. The backend's own message is used when there is one (it is
 * already in the admin's language); the fixed texts cover what never reached the API.
 */
export function useErrorMessage() {
  const t = useTranslations("errors");

  return useCallback(
    (error: unknown): string => {
      if (isApiError(error)) {
        if (error.status === 429 && error.retryAfter) {
          return t("rateLimitedWait", { seconds: Math.ceil(error.retryAfter) });
        }
        if (error.message) return error.message;
        if (error.code === "network_error") return t("network");
        if (error.code === "timeout") return t("timeout");
        if (error.status === 429) return t("rateLimited");
        if (error.status === 403) return t("forbidden");
        if (error.status === 404) return t("notFound");
      }
      return t("unexpected");
    },
    [t],
  );
}

/** Shows a failed request as a toast, with the request id so it can be traced. */
export function useErrorToast() {
  const t = useTranslations("errors");
  const errorMessage = useErrorMessage();

  return useCallback(
    (error: unknown) => {
      const requestId = isApiError(error) ? error.requestId : undefined;
      toast.error(errorMessage(error), {
        description: requestId ? t("requestId", { id: requestId }) : undefined,
      });
    },
    [errorMessage, t],
  );
}
