import type { Masked, Money, RecordId } from "@/lib/api/types";

/**
 * The checkout overview, `data` of `GET /resources/checkouts/records/{id}/screen`
 * (`cms/docs/checkout-workflow.md`, built by `CheckoutOverviewScreen` on the backend).
 *
 * A part the admin may not view is left out of `data` and named in `hidden_parts`.
 */

/** A record of a part: its `resource`, its `id` and field values in that resource's record formats. */
export type PartRecord = { resource: string; id?: RecordId } & Record<string, unknown>;

export interface ProgressStep {
  /** `authorized`, `paid`, `shipped`, `delivered`, `payout_approved`, `paid_out`, `canceled`, `refunded`, `failed`. */
  step: string;
  /** In the admin's language. */
  label: string;
  done: boolean;
  at: string | null;
}

/** `open`, `approved`, `processing`, `paid_out`, `failed`, `closed`. */
export type PayoutState = string;

export interface MoneySummary {
  collected: Money;
  price: Money;
  buyer_fee: Money;
  shipping: Money;
  box: Money;
  buyer_protection: Money;
  discount: Money;
  seller_fee: Money;
  refunded: Money;
  refund_pending: Money;
  refundable: Money;
  payout_original: Money;
  payout_planned: Money;
  paid_out: Money;
  payable: Money;
  platform_keeps: Money;
  estimated_costs: Money;
  seller_fee_waived: boolean;
  payout_state: PayoutState;
  transfer_id: string | null;
}

export interface RiskFlag {
  code: string;
  level: "info" | "warning" | "blocking";
  message: string;
}

/** Whether one operation alone is allowed now, and what applies to it. */
export interface MoneyOperationReview {
  allowed: boolean;
  flags: RiskFlag[];
}

export interface MoneyRun {
  id: number | string;
  run_id: string;
  /** `refund`, `payout_amount`, `approve_payout`, `pay_out`. */
  operation: string;
  status: string;
  amount: Money | null;
  reference: string | null;
  result_code: string | null;
  error: string | null;
  reason: string | null;
  admin_id: number | null;
  created_at: string | null;
}

export interface CheckoutMoney {
  summary: MoneySummary;
  /** By operation: `refund`, `approve_payout`, `pay_out`. `null` without the `settle_money` permission. */
  operations: Record<string, MoneyOperationReview> | null;
  /** The last 20 operations run by the flow. `null` without the `settle_money` permission. */
  runs: MoneyRun[] | null;
}

export interface PackagingProofImage {
  id: RecordId;
  name: string;
  mime: string | null;
  size: number;
  url: string;
  created_at: string | null;
}

export interface PayoutBlock {
  id: string;
  reason: string;
  reason_label: string;
  status: string;
  open: boolean;
  created_at: string | null;
  resolved_at: string | null;
  resolved_by: { id: number; name: string } | null;
}

export interface CheckoutPerson {
  /** The user in the users list columns; `null` when the account no longer exists. */
  user: PartRecord | null;
  /** Name, company, email and phone as stored on the checkout (checkout field names). */
  contact: Record<string, string | Masked | null>;
}

export type AddressKey = "shipping" | "billing" | "seller_shipping" | "seller_billing" | "seller_packaging";

export interface CountLink {
  count: number | null;
  /** API path of the feed, e.g. `resources/checkouts/records/{id}/notes`. */
  link: string | null;
}

export interface CheckoutOverview {
  /** Checkout fields in the checkouts field formats. */
  checkout: Record<string, unknown>;
  progress: ProgressStep[];
  /** Checkout money fields (`price`, `provision`, `shipping`, ...). */
  pricing: Record<string, unknown>;
  money: CheckoutMoney;
  packaging_proof: { provided: boolean; images: PackagingProofImage[] };
  payout_blocks: PayoutBlock[];
  buyer?: CheckoutPerson;
  seller?: CheckoutPerson;
  ad?: PartRecord | null;
  offer?: PartRecord | null;
  addresses?: Record<AddressKey, PartRecord | null>;
  shipments?: PartRecord[];
  complaints?: PartRecord[];
  cancellation?: PartRecord | null;
  insurance?: PartRecord | null;
  invoices?: PartRecord[];
  counts: Record<"notes" | "open_tasks" | "events" | "notification_logs", CountLink>;
  hidden_parts: string[];
}

/** Inputs of the `settle_money` action. Money is an integer of minor units. */
export interface SettleMoneyInput {
  refund_amount?: number | null;
  payout_amount?: number | null;
  payout?: "none" | "approve" | "now";
}
