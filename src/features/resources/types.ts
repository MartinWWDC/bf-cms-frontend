/**
 * Resource contract and record types.
 *
 * The CMS is contract-driven: the backend describes each resource (fields, list columns,
 * detail layout, actions) and the frontend renders every resource from that description,
 * with no per-resource screen code.
 *
 * PROVISIONAL: these shapes are a frontend placeholder so the UI can be built against mock
 * data. The real contract is defined in `cms/docs/field-types.md` and `conventions.md`.
 * When those are available, change the types here and the mapping in `api.ts`; the
 * components read only these types, so nothing else should need to know.
 */

/** The fixed set of field types the frontend knows how to render. */
export type FieldType =
  | "id"
  | "text"
  | "number"
  | "money"
  | "datetime"
  | "status"
  | "person"
  | "country";

export type Tone = "neutral" | "info" | "success" | "warning" | "danger";

export interface FieldOption {
  value: string;
  label: string;
  tone?: Tone;
}

export interface FieldDefinition {
  key: string;
  label: string;
  type: FieldType;
  sortable?: boolean;
  /** Choices for `status` fields. */
  options?: FieldOption[];
  /** The value arrives masked; revealing it needs a permission and is logged. */
  masked?: boolean;
}

export interface ListTab {
  key: string;
  label: string;
}

export interface SortRule {
  field: string;
  direction: "asc" | "desc";
}

export interface DetailSection {
  key: string;
  label: string;
  fields: string[];
}

export interface ActionDefinition {
  key: string;
  label: string;
  /** Key into the action icon registry. */
  icon?: string;
  tone?: "default" | "danger";
  /** Dangerous and money actions need a mandatory reason and a confirmation. */
  requiresReason?: boolean;
}

export interface ResourceContract {
  key: string;
  label: string;
  labelSingular: string;
  description?: string;
  /** Field used as the human-readable title of a record. */
  titleField: string;
  /** Field shown as the record status in headers. */
  statusField?: string;
  fields: FieldDefinition[];
  list: {
    /** Field keys, in column order. */
    columns: string[];
    /** Columns hidden until the admin turns them on. */
    hiddenByDefault?: string[];
    defaultSort: SortRule;
    searchPlaceholder?: string;
    /** Built-in tabs: filtered slices of the resource. */
    tabs?: ListTab[];
  };
  detail: {
    /** Fields shown as headline figures at the top of the detail drawer. */
    highlights?: string[];
    sections: DetailSection[];
  };
  actions: ActionDefinition[];
}

export interface MoneyValue {
  /** Minor units (cents). */
  amount: number;
  currency: string;
}

export interface PersonValue {
  name: string;
  detail?: string;
}

export type ResourceRecord = { id: string } & Record<string, unknown>;

export interface ListParams {
  page: number;
  pageSize: number;
  sort: SortRule;
  search: string;
  tab: string;
}

export interface ListResult {
  rows: ResourceRecord[];
  /** Total matching records. Large tables will later return a capped total. */
  total: number;
  page: number;
  pageSize: number;
}

export interface ActivityEntry {
  id: string;
  at: string;
  actor: string;
  summary: string;
}

/** A single record with what the detail drawer needs beyond the row. */
export interface RecordDetail {
  record: ResourceRecord;
  /** Row version, sent back on save for stale-save protection. */
  version: number;
  activity: ActivityEntry[];
}

export interface RunActionInput {
  recordId: string;
  actionKey: string;
  /** Mandatory for dangerous and money actions. */
  reason?: string;
}

export interface RunActionResult {
  /** Message from the backend, already translated. */
  message: string;
}
