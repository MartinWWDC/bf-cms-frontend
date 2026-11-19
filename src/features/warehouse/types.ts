/**
 * Warehouse scanning (`conventions.md` section 18, `cms/docs/warehouse-workflow.md`,
 * `WarehouseScan` and `WarehouseLabel` in the spec). Writes are ordinary record actions
 * on `stock_items`.
 */

export interface ScannedItem {
  id: number;
  code: string;
  name: string;
  /** `bike_box`, `packaging`, `part`, `bike`, `tool`, `other`. */
  kind: string;
  unit: string;
  is_active: boolean;
  quantity_on_hand: number;
  min_quantity: number | null;
  low_stock: boolean;
  /** Locations holding the item, at most 50. */
  levels: { location_id: number; location_code: string; location_name: string; quantity: number }[];
  /** Keys of the movement actions this admin may run: `receive`, `store`, `move`, `pick`, ... */
  actions: string[];
}

export interface ScannedLocation {
  id: number;
  code: string;
  name: string;
  /** `receiving`, `storage`, `packing`, `dispatch`, `quarantine`. */
  kind: string;
  is_active: boolean;
  warehouse: { id: number; code: string; name: string };
  /** Items stored there, at most 50. */
  contents: { item_id: number; item_code: string; item_name: string; quantity: number }[];
}

/** An item and a location can share a code; then both are filled. Each is `null` without its view permission. */
export interface WarehouseScan {
  item: ScannedItem | null;
  location: ScannedLocation | null;
}

export interface WarehouseLabel {
  type: "item" | "location";
  code: string;
  title: string;
  subtitle: string;
  barcode: { format: "code128"; value: string };
  /** The code itself, to encode as a QR code. */
  qr: string;
}

/** Letters, digits, `.`, `_` and `-`, at most 64. */
export const CODE_PATTERN = /^[A-Za-z0-9._-]{1,64}$/;

export const MAX_LABELS = 100;

/** Codes typed or pasted: separated by commas, spaces or new lines; duplicates and bad codes dropped. */
export function parseCodes(raw: string): string[] {
  return [...new Set(raw.split(/[\s,;]+/).filter((code) => CODE_PATTERN.test(code)))].slice(0, MAX_LABELS);
}
