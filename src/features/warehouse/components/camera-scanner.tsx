"use client";

import { useState } from "react";
import { Scanner } from "@yudiel/react-qr-scanner";
import { useTranslations } from "next-intl";

interface CameraScannerProps {
  /** Called with the text of each code the camera reads. */
  onCode: (code: string) => void;
}

/**
 * Reads item and location labels with the device camera: the Code 128 barcode or the QR
 * code printed on them. For tablets and phones without a hardware scanner. The camera
 * only runs while this component is mounted.
 */
export default function CameraScanner({ onCode }: CameraScannerProps) {
  const t = useTranslations("warehouse.scan");
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <p role="alert" className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
        {t("cameraFailed")}
      </p>
    );
  }

  return (
    <div className="aspect-video w-full max-w-md overflow-hidden rounded-lg border bg-black">
      <Scanner
        formats={["code_128", "qr_code"]}
        constraints={{ facingMode: "environment" }}
        scanDelay={1500}
        sound={false}
        onScan={(codes) => {
          const value = codes[0]?.rawValue?.trim();
          if (value) onCode(value);
        }}
        onError={() => setFailed(true)}
      />
    </div>
  );
}
