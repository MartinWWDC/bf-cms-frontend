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
