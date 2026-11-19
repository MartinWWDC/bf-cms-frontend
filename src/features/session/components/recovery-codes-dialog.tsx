"use client";

import { type FormEvent, useState } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useErrorMessage } from "@/lib/api/use-error-message";

import { useRegenerateRecoveryCodes } from "../mutations";
import { RecoveryCodes } from "./recovery-codes";

interface RecoveryCodesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Replaces the admin's recovery codes with 8 new ones, after a current two-factor code. */
export function RecoveryCodesDialog({ open, onOpenChange }: RecoveryCodesDialogProps) {
  const t = useTranslations("account.recovery");
  const tCommon = useTranslations("common");
  const errorMessage = useErrorMessage();
  const regenerate = useRegenerateRecoveryCodes();
  const [code, setCode] = useState("");

  const close = (next: boolean) => {
    if (!next) {
      setCode("");
      regenerate.reset();
    }
    onOpenChange(next);
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    regenerate.mutate(code.trim(), { onError: () => setCode("") });
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{regenerate.data ? t("storeHint") : t("description")}</DialogDescription>
        </DialogHeader>
        {regenerate.data ? (
          <>
            <RecoveryCodes codes={regenerate.data} />
            <DialogFooter>
              <Button onClick={() => close(false)}>{tCommon("done")}</Button>
            </DialogFooter>
          </>
        ) : (
          <form onSubmit={submit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="recovery-code">{t("code")}</Label>
              <Input
                id="recovery-code"
                inputMode="numeric"
                autoComplete="one-time-code"
                autoFocus
                value={code}
                onChange={(event) => setCode(event.target.value)}
                aria-invalid={regenerate.isError}
                className="font-mono tracking-widest"
              />
              {regenerate.isError ? (
                <p role="alert" className="text-sm text-destructive">
                  {errorMessage(regenerate.error)}
                </p>
              ) : null}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => close(false)}>
                {tCommon("cancel")}
              </Button>
              <Button type="submit" disabled={regenerate.isPending || code.trim().length < 6}>
                {t("submit")}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
