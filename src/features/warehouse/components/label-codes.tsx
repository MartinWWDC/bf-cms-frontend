"use client";

import { useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";
import { QRCodeSVG } from "qrcode.react";

interface LabelCodesProps {
  /** Value of the Code 128 barcode. */
  barcode: string;
  /** Value of the QR code. */
  qr: string;
}

/** The barcode and the QR code of a label, drawn as SVG so they print sharp at any size. */
export function LabelCodes({ barcode, qr }: LabelCodesProps) {
  const svg = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svg.current) return;
    try {
      JsBarcode(svg.current, barcode, {
        format: "CODE128",
        displayValue: false,
        margin: 0,
        height: 56,
        width: 2,
        background: "#ffffff",
        lineColor: "#000000",
      });
    } catch {
      // A value Code 128 cannot encode: the label still carries the code as text and as QR.
      svg.current.replaceChildren();
    }
  }, [barcode]);

  return (
    <div className="flex items-center gap-4">
      {/* Labels are always black on white, in both themes and in print. */}
      <svg ref={svg} role="img" aria-label={barcode} className="h-14 max-w-full min-w-0 flex-1" preserveAspectRatio="none" />
      <QRCodeSVG value={qr} size={72} level="M" bgColor="#ffffff" fgColor="#000000" title={qr} className="shrink-0" />
    </div>
  );
}
