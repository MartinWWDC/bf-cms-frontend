import type { Money } from "@/lib/api/types";

import type { CheckoutOverview } from "../types";

/** Money actions of a checkout besides the combined flow, in the order they are offered. */
export const SINGLE_MONEY_ACTIONS = ["refund", "approve_payout", "pay_out", "edit_payment_amounts"] as const;

export const SETTLE_MONEY = "settle_money";

/** Whether a part came with the answer. A part the admin may not view is left out. */
export function hasPart<K extends keyof CheckoutOverview>(
  data: CheckoutOverview,
  part: K,
): data is CheckoutOverview & Required<Pick<CheckoutOverview, K>> {
  return !data.hidden_parts.includes(part as string) && data[part] !== undefined;
}

export function isZero(money: Money | null | undefined) {
  return !money || money.amount === 0;
}

/**
 * Field names of a part record, without the keys that only identify it. The order is the
 * backend's: the resource's list columns first, then the extras of the overview.
 */
export function partFieldNames(record: Record<string, unknown>): string[] {
  return Object.keys(record).filter((name) => name !== "resource");
}

/** Every part this screen can show, in the order used when the answer names none. */
export const PARTS = [
  "checkout",
  "progress",
  "pricing",
  "money",
  "packaging_proof",
  "payout_blocks",
  "buyer",
  "seller",
  "ad",
  "offer",
  "addresses",
  "shipments",
  "complaints",
  "cancellation",
  "insurance",
  "invoices",
  "counts",
] as const;

/** Parts that share one section when they follow each other in the layout. */
export const PART_GROUP: Partial<Record<string, "people" | "listing">> = {
  buyer: "people",
  seller: "people",
  ad: "listing",
  offer: "listing",
};

/**
 * The parts in the order the screen shows them (`meta.layout`), as blocks: neighbouring
 * parts of one group (buyer and seller, ad and offer) form one block. A known part the
 * layout does not name follows at the end, so nothing the answer brought is lost.
 */
export function layoutBlocks(layout: string[]): string[][] {
  const order = [...new Set([...layout, ...PARTS])];
  const blocks: string[][] = [];
  for (const part of order) {
    const group = PART_GROUP[part];
    const last = blocks[blocks.length - 1];
    if (group && last && PART_GROUP[last[0]] === group) last.push(part);
    else blocks.push([part]);
  }
  return blocks;
}
