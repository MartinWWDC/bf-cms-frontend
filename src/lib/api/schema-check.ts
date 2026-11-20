/**
 * Compile-time check that the hand-written API types still fit the backend's spec.
 *
 * `schema.d.ts` is generated from `cms/docs/openapi.json` (`npm run api:types`). Each line
 * below fails the type check when what the API sends (the generated schema) no longer fits
 * the shape a feature expects, so a contract change shows up as a build error instead of a
 * runtime surprise. Add a line when a feature starts reading a new schema.
 */
import type { Me, Session } from "@/features/session/types";
import type { NavNode } from "@/features/navigation/types";
import type {
  ActionFlag,
  Collaboration,
  Contract,
  Field,
  HistoryEntry,
  InlineField,
  ListMeta,
  Note,
  RecordMeta,
  SavedView,
  StaffMember,
} from "@/features/resources/types";
import type { Job } from "@/features/jobs/types";
import type { Notification } from "@/features/notifications/types";
import type { LiveSettings } from "@/features/live/types";

import type { components } from "./schema";

type Schemas = components["schemas"];

/** `Sent` (generated from the spec) must be usable wherever `Expected` (hand-written) is read. */
type Fits<Sent extends Expected, Expected> = Sent extends Expected ? true : never;

export type SchemaChecks = [
  Fits<Schemas["Me"], Me>,
  Fits<Schemas["Session"], Session>,
  Fits<Schemas["NavigationNode"], Pick<NavNode, "key" | "label" | "keywords">>,
  Fits<Schemas["Contract"], Omit<Contract, "fields" | "actions" | "relations" | "collaboration">>,
  Fits<Schemas["Field"], Omit<Field, "config">>,
  Fits<Schemas["InlineField"], InlineField>,
  Fits<Schemas["Collaboration"], Collaboration>,
  Fits<Schemas["ListMeta"], ListMeta>,
  Fits<Schemas["RecordMeta"], RecordMeta>,
  Fits<Schemas["ActionFlag"], ActionFlag>,
  Fits<Schemas["SavedView"], Omit<SavedView, "filter">>,
  Fits<Schemas["StaffMember"], StaffMember>,
  Fits<Schemas["Note"], Omit<Note, "author" | "mentions">>,
  Fits<Schemas["HistoryEntry"], Omit<HistoryEntry, "admin" | "changes">>,
  Fits<Schemas["Job"], Omit<Job, "result">>,
  Fits<Schemas["Notification"], Notification>,
  Fits<Schemas["LiveSettings"], LiveSettings>,
];
