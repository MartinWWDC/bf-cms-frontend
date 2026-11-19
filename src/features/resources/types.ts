import type { ComponentType } from "react";

import type { AdminRef, PageMeta, RecordId, Reference, Tone, Translated } from "@/lib/api/types";

/**
 * The resource contract and everything the generic record endpoints return.
 *
 * The CMS is contract-driven: the backend describes each resource (fields, views, tabs,
 * detail layout, actions) and the frontend renders every resource from that description,
 * with no per-resource screen code. The frontend only knows field types.
 *
 * Shapes from `cms/docs/openapi.json` (`Contract`, `Field`, `Action`, `Collaboration`,
 * `ListMeta`, `RecordMeta`, `Note`, `HistoryEntry`, `SavedView`, ...), `field-types.md`
 * and `conventions.md` sections 6 to 8.
 */

/* ---------- Contract ---------- */

/** The complete catalogue of `field-types.md` section 2. Unknown types render as text. */
export type FieldType =
  | "id"
  | "text"
  | "long_text"
  | "rich_text"
  | "slug"
  | "email"
  | "phone"
  | "url"
  | "number"
  | "money"
  | "boolean"
  | "boolean_group"
  | "enum"
  | "date"
  | "datetime"
  | "country"
  | "locale"
  | "code"
  | "json"
  | "key_value"
  | "password"
  | "file"
  | "image"
  | "images"
  | "relation_one"
  | "relation_many"
  | "admin";

export type Operator =
  | "is"
  | "is_not"
  | "in"
  | "not_in"
  | "contains"
  | "not_contains"
  | "starts_with"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "between"
  | "within"
  | "is_empty"
  | "is_not_empty"
  | "has"
  | "has_not";

export type AggregateFunction = "count" | "sum" | "avg" | "min" | "max";

export interface FieldOption {
  value: string;
  label: string;
  tone?: Tone;
}

/** What is specific to a field's type. Always an object; unknown keys are ignored. */
export interface FieldConfig {
  // text, long_text
  max_length?: number;
  copyable?: boolean;
  // rich_text
  toolbar?: string[];
  // slug
  from?: string;
  // url
  external?: boolean;
  // number
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  // money
  currency_field?: string;
  currency?: string;
  // enum, boolean_group
  options?: FieldOption[];
  // datetime
  relative?: boolean;
  // code
  language?: "json" | "html" | "text";
  // key_value
  key_label?: string;
  value_label?: string;
  // password
  min_length?: number;
  // file, image, images
  accept?: string[] | string;
  max_size?: number;
  max_count?: number;
  sortable?: boolean;
  // relation_one, relation_many
  resource?: string;
  relation?: string;
  searchable?: boolean;
  nullable?: boolean;
  count?: boolean;
  // translated: true
  locales?: string[];
  required_locales?: string[];
  placeholders?: boolean;
  suggestions?: boolean;
  /** The field can only be sent on create. */
  create_only?: boolean;
  [key: string]: unknown;
}

export interface Field {
  /** A field of a linked record has a dotted name (`buyer.email`) and `via`. */
  name: string;
  label: string;
  type: FieldType;
  help: string | null;
  in_list: boolean;
  in_detail: boolean;
  editable: boolean;
  required: boolean;
  sortable: boolean;
  searchable: boolean;
  filterable: boolean;
  /** The operators this field accepts in a filter. */
  operators: Operator[];
  groupable: boolean;
  aggregates: AggregateFunction[];
  /** The value always arrives masked; the real one comes from the reveal endpoint. */
  sensitive: boolean;
  /** The value is an object with one entry per language. */
  translated: boolean;
  /** Name of the relation this linked-record field is read through. */
  via?: string | null;
  config: FieldConfig;
}

/** `visible_when` on an action input, in the filter-condition format. */
export interface VisibleWhen {
  field: string;
  operator: Operator;
  value?: unknown;
}

export interface ActionInput {
  name: string;
  label: string;
  type: FieldType;
  help: string | null;
  required: boolean;
  sensitive: boolean;
  config: FieldConfig;
  visible_when?: VisibleWhen | null;
}

export type ActionScope = "one" | "many" | "both" | "standalone";

export interface Action {
  key: string;
  label: string;
  scope: ActionScope;
  /** Needs `confirm: true`. */
  dangerous: boolean;
  requires_reason: boolean;
  /** Offers a preview step with a summary and risk flags. */
  preview: boolean;
  tone: Tone;
  inputs: ActionInput[];
}

export interface Relation {
  name: string;
  label: string;
  resource: string;
  type: "one" | "many";
  count: boolean;
}

export interface ViewTab {
  key: string;
  label: string;
  /** Field names, in column order. */
  columns: string[];
  default_sort: string;
  count: boolean;
  /** Keys of the actions that belong to this tab's work, already limited to what the admin may run. */
  actions: string[];
}

export interface View {
  key: string;
  label: string;
  /** Always at least one. A tab's filter is applied by the backend and never sent. */
  tabs: ViewTab[];
}

export interface DetailSection {
  key: string;
  label: string;
  fields: string[];
}

export interface Collaboration {
  notes: {
    enabled: boolean;
    can_view: boolean;
    can_write: boolean;
    linked: { key: string; label: string; resource: string }[];
  };
  assignment: {
    enabled: boolean;
    field: string | null;
    can_assign_self: boolean;
    can_assign_others: boolean;
  };
  history: { types: string[] };
}

export interface Contract {
  key: string;
  label: string;
  label_singular: string;
  title_field: string;
  /** What the admin may do on the resource in general. Per record: `RecordMeta.abilities`. */
  abilities: { create: boolean; update: boolean; delete: boolean; export: boolean };
  /** Totals are capped and search matches the start of a value. */
  big: boolean;
  soft_deletes: boolean;
  /** Every create, change, delete and restore must carry `_reason`. */
  writes_require_reason: boolean;
  default_sort: string;
  fields: Field[];
  relations: Relation[];
  views: View[];
  actions: Action[];
  detail: {
    sections: DetailSection[];
    /** Names of the `many` relations shown as lists. */
    related: string[];
    /** Shared parts: `notes`, `history`. */
    panels: string[];
    /** Set when the resource has an aggregated screen (`.../records/{id}/screen`). */
    custom_endpoint: string | null;
  };
  collaboration: Collaboration;
}

/* ---------- Filters ---------- */

export interface FilterCondition {
  field: string;
  operator: Operator;
  value?: unknown;
}

export interface FilterGroup {
  op: "and" | "or";
  conditions: FilterNode[];
}

export type FilterNode = FilterCondition | FilterGroup;

/* ---------- Lists ---------- */

export type ResourceRecord = { id: RecordId } & Record<string, unknown>;

export type Trashed = "with" | "only";

/** Everything a list request can carry (`conventions.md` section 6). */
export interface ListParams {
  view?: string;
  tab?: string;
  savedView?: number | null;
  q?: string;
  /** `-created_at,status`, at most 3 fields. */
  sort?: string;
  /** Field names to return. Default: the tab's columns. */
  fields?: string[];
  filter?: FilterGroup | null;
  trashed?: Trashed | null;
  /** A groupable field, `-` for descending groups. */
  groupBy?: string | null;
  /** `count`, `sum:total_amount`, ... */
  aggregates?: string[];
  page?: number;
  perPage?: number;
}

export interface ListGroup {
  value: string | number | boolean | null;
  label: string | null;
  count: number;
}

export interface ListAggregate {
  key: string;
  function: AggregateFunction;
  field: string | null;
  /** A number, `null`, or for money fields one `{ amount, currency }` per currency. */
  value: number | null | { amount: number; currency: string }[];
}

export interface ListMeta {
  page: number;
  per_page: number;
  /** For big resources the count stops at a cap; then `total_capped` is `true`. */
  total: number;
  total_capped: boolean;
  has_more: boolean;
  saved_view?: { id: number; name: string; dropped: string[] } | null;
  groups?: ListGroup[];
  groups_capped?: boolean;
  aggregates?: ListAggregate[];
}

export interface RecordList {
  data: ResourceRecord[];
  meta: ListMeta;
}

/* ---------- Single records ---------- */

export interface RecordMeta {
  /** Opaque. Sent back in `If-Match` on `PATCH` and `DELETE`. */
  version: string;
  title: string | null;
  trashed: boolean;
  abilities: { update: boolean; delete: boolean; restore: boolean; reveal: boolean };
  /** Keys of the actions that apply to this record in its current state. */
  actions: string[];
  related: { relation: string; resource: string; viewable: boolean; count: number | null }[];
  /** Per translated field, the languages without a text. */
  missing_translations: Record<string, string[]>;
  notes_count: number | null;
  assignee: Reference | null;
}

export interface RecordDetail {
  data: ResourceRecord;
  meta: RecordMeta;
}

/** Answer of an aggregated screen. `data` is the screen's own shape. */
export interface RecordScreen<TData = Record<string, unknown>> {
  data: TData;
  meta: { record: RecordDetail };
}

export interface RevealedValue {
  field: string;
  value: unknown;
}

/** Field values for create and update, in the record formats. May carry `_reason`. */
export type RecordInput = Record<string, unknown>;

/* ---------- Actions ---------- */

export interface ActionFlag {
  code: string;
  level: "warning" | "blocking";
  message: string;
}

export interface ActionPreview {
  summary: { label: string; value: unknown }[];
  flags: ActionFlag[];
}

export interface ActionRequest {
  input?: Record<string, unknown>;
  reason?: string | null;
  confirm?: boolean;
  acknowledged_flags?: string[];
}

/** The records an action or assignment runs on: by id, or the whole filtered list. */
export type BulkTarget = { ids: RecordId[] } | { selection: Pick<ListParams, "view" | "tab" | "q" | "filter"> };

export interface ActionResult {
  message: string;
  /** `false`: the action ran but could not do its work. Show `message` as an error. */
  succeeded: boolean;
  download: { url: string; name: string } | null;
  record: RecordDetail | null;
}

/* ---------- Collaboration ---------- */

export interface NoteAttachment {
  id: number;
  name: string;
  mime: string | null;
  size: number;
  /** Signed, works for 30 minutes without a login. */
  url: string;
}

export interface Note {
  id: number;
  resource: string;
  record_id: string;
  body: string;
  format: "plain" | "rich";
  author: AdminRef | null;
  own: boolean;
  mentions: AdminRef[];
  pinned: boolean;
  pinned_at: string | null;
  edited_at: string | null;
  created_at: string | null;
  attachments: NoteAttachment[];
  /** Where a linked record's note comes from; `null` for the record's own notes. */
  origin: { link: string; label: string; resource: string; record_id: string } | null;
}

export interface NoteInput {
  body: string;
  format?: "plain" | "rich";
  mentions?: number[];
  attachments?: File[];
}

export interface NoteList {
  data: Note[];
  meta: PageMeta;
}

export interface HistoryEntry {
  id: string;
  /** `change`, `action`, `reveal`, `assignment`, `note`, `other`, `checkout_event`, ... */
  type: string;
  event: string;
  event_label: string;
  admin: AdminRef | null;
  /** Who did it in words when it was not a staff member: `System`, `Carrier`. */
  actor: string | null;
  resource: string;
  record_id: string;
  text: string | null;
  changes: Record<string, { old: unknown; new: unknown }>;
  meta: Record<string, unknown>;
  reason: string | null;
  link: { resource: string; id: string } | null;
  created_at: string | null;
}

export interface HistoryList {
  data: HistoryEntry[];
  meta: PageMeta;
}

export interface StaffMember {
  id: number;
  name: string | null;
}

export interface Assignment {
  admin: StaffMember;
  assigned_by: StaffMember | null;
  assigned_at: string | null;
}

export interface AssignmentSummary {
  data: { admin: StaffMember; open: number }[];
  meta: { unassigned: number; unassigned_capped: boolean; open_filter: boolean };
}

/* ---------- Saved views ---------- */

export interface SavedView {
  id: number;
  resource: string;
  name: string;
  view: string | null;
  tab: string | null;
  filter: FilterGroup | null;
  sort: string | null;
  columns: string[];
  group_by: string | null;
  position: number;
  is_default: boolean;
  /** Fields the view named that no longer exist in the resource. */
  dropped: string[];
}

export type SavedViewInput = Partial<
  Pick<SavedView, "name" | "view" | "tab" | "filter" | "sort" | "columns" | "group_by" | "is_default">
>;

/* ---------- Translations ---------- */

export interface TranslationSuggestionRequest {
  fields?: string[];
  locales?: string[];
  values?: Record<string, Translated>;
}

export interface TranslationSuggestion {
  data: Record<string, Record<string, string>>;
  meta: { source_locale: string; warnings: Record<string, string> };
}

/* ---------- Exports ---------- */

export type ExportFormat = "csv" | "xlsx";

/* ---------- Custom screens ---------- */

/** What a custom-built screen gets. It loads its own data from the record's `screen` endpoint. */
export interface RecordScreenProps {
  contract: Contract;
  record: RecordDetail;
  onOpenRecord: (resource: string, id: RecordId) => void;
  /** Opens the normal action dialog for one of the record's actions. */
  onRunAction: (actionKey: string, initialInput?: Record<string, unknown>) => void;
  /** Closes the drawer and opens another record of the same resource (moderation "next"). */
  onShowRecord: (id: RecordId) => void;
}

/** Custom screens by resource key, supplied by the page. The generic layout is the fallback. */
export type ScreenRegistry = Record<string, ComponentType<RecordScreenProps>>;
