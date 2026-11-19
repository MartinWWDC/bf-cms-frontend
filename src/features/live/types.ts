/**
 * The live channel (`conventions.md` section 9, `LiveSettings` in the spec): job progress,
 * notifications and task counts are pushed over Pusher channels. When `enabled` is false
 * there is no live channel on the environment and the app keeps polling.
 */
export interface LiveSettings {
  enabled: boolean;
  protocol: "pusher" | null;
  key: string | null;
  cluster: string | null;
  host: string | null;
  port: number | null;
  scheme: string | null;
  /** The admin's private channel, `private-cms.admins.{id}`. */
  channel: string | null;
  events: string[];
}
