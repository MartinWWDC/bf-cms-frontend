import type { Masked, Money, RecordId } from "@/lib/api/types";

/**
 * The moderation review screen, `data` of
 * `GET /resources/{moderation queue}/records/{case id}/screen`
 * (`cms/docs/moderation-workflow.md` section 4, built by `ReviewScreen` and the
 * `*Subjects` classes on the backend).
 */

export type RiskLevel = "none" | "warning" | "high";

export interface ModerationCase {
  id: RecordId;
  /** The queue's resource key: `moderation_ads`, `moderation_users`, ... */
  resource: string;
  queue: string;
  /** `open` or `decided`. */
  status: string;
  trigger: string;
  trigger_label: string;
  risk: RiskLevel;
  opened_at: string | null;
  /** Whole hours the case has been waiting; `null` once decided. */
  waiting_hours: number | null;
  decision: string | null;
  decision_label: string | null;
  reason_code: string | null;
  reason_label: string | null;
  decided_at: string | null;
}

export interface ModerationFlag {
  code: string;
  level: "warning" | "high";
  /** In the admin's language. */
  message: string;
}

/** A value of the subject or the user: plain, masked, money, or a small object (address, location). */
export type FactValue = string | number | boolean | null | Masked | Money | Record<string, unknown> | unknown[];

/** What waits for a decision: the ad, the user, the business account, the report or the conversation. */
export type ModerationSubject = {
  type: string;
  id: RecordId;
  /** The subject's own resource, to open it and reveal masked values there. */
  resource: string | null;
  title: string | null;
  /** Ads: gallery URLs. Business accounts: one object of URLs per image. */
  images?: (string | Record<string, string>)[];
} & Record<string, FactValue | undefined>;

export type ModerationUser = { id: RecordId; resource: string; name: string | null } & Record<string, FactValue | undefined>;

export interface PreviousCase {
  id: RecordId;
  resource: string;
  queue: string;
  trigger: string;
  title: string | null;
  status: string;
  decision: string | null;
  decision_label: string | null;
  reason_code: string | null;
  opened_at: string | null;
  decided_at: string | null;
}

export interface UserHistory {
  ads: { total: number; active: number; sold: number; deleted: number };
  checkouts_bought: number;
  reports_received: number;
  negative_decisions: number;
  previous_cases: PreviousCase[];
}

export interface AdReport {
  id: RecordId;
  email: string | Masked | null;
  text: string | null;
  created_at: string | null;
}

export interface ModerationMessage {
  id: RecordId;
  resource: string;
  user_id?: RecordId | null;
  thread_id?: RecordId | null;
  text: string | null;
  is_hidden: boolean;
  has_suspicious_content?: boolean;
  created_at: string | null;
}

export interface SecurityEventEntry {
  id: string;
  resource: string;
  event: string;
  country_code: string | null;
  ip: string | Masked | null;
  created_at: string | null;
}

export interface Reporter {
  /** `person` (an ad report) or `system` (a conversation the message checks flagged). */
  type: "person" | "system";
  email: string | Masked | null;
  user: { id: RecordId; resource: string; title: string | null } | null;
}

export interface NextCase {
  id: RecordId;
  resource: string;
  title: string | null;
  risk: RiskLevel;
  opened_at: string | null;
}

export interface ModerationReview {
  case: ModerationCase;
  flags: ModerationFlag[];
  subject: ModerationSubject | null;
  user?: ModerationUser | null;
  history?: UserHistory | null;
  /** The oldest open case of the queue that is the admin's or unassigned; `null` when the queue is done. */
  next: NextCase | null;
  queue: { open: number; mine: number; unassigned: number };
  // Ads, and `other_reports` on ad reports
  reports?: AdReport[];
  other_reports?: AdReport[];
  // Users
  security_events?: SecurityEventEntry[];
  suspicious_messages?: ModerationMessage[];
  // Reports
  reporter?: Reporter;
  reported_ad?: ModerationSubject | null;
  messages?: ModerationMessage[];
}
