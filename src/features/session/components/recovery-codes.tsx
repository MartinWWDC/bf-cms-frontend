"use client";

import { CopyIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

/** The 8 recovery codes. They are shown once; the admin has to store them. */
export function RecoveryCodes({ codes }: { codes: string[] }) {
  const t = useTranslations("account.recovery");

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(codes.join("\n"));
      toast.success(t("copied"));
    } catch {
      toast.error(t("copyFailed"));
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <ul className="grid grid-cols-2 gap-x-4 gap-y-1.5 rounded-lg border bg-muted/50 p-3 font-mono text-sm">
        {codes.map((code) => (
          <li key={code} className="select-all">
            {code}
          </li>
        ))}
      </ul>
      <Button type="button" variant="outline" onClick={copy}>
        <CopyIcon />
        {t("copy")}
      </Button>
    </div>
  );
}
