import type { Field, FieldType, FilterCondition, FilterGroup, FilterNode, Operator } from "../types";

/**
 * The filter grammar of `conventions.md` section 6: a group has an operator (`and` / `or`)
 * and conditions; a condition is a field condition or another group.
 */

/** Limits of the API; beyond them it answers `400`. */
export const FILTER_LIMITS = { depth: 3, conditions: 30, values: 200 } as const;

export const EMPTY_FILTER: FilterGroup = { op: "and", conditions: [] };

/** Operators that take no value. */
export const VALUELESS_OPERATORS: ReadonlySet<Operator> = new Set(["is_empty", "is_not_empty", "has", "has_not"]);

/** Operators that take a list of values. */
export const LIST_OPERATORS: ReadonlySet<Operator> = new Set(["in", "not_in"]);

/** Relative ranges `within` accepts as a plain word. */
export const WITHIN_PRESETS = [
  "today",
  "yesterday",
  "tomorrow",
  "this_week",
  "last_week",
  "next_week",
  "this_month",
  "last_month",
  "next_month",
  "this_year",
  "last_year",
] as const;

/** Relative days that `is`, `gt`, `lt`, ... accept in place of a date. */
export const RELATIVE_DAYS = ["today", "yesterday", "tomorrow"] as const;

export const RELATIVE_UNITS = ["day", "week", "month", "year"] as const;
export type RelativeUnit = (typeof RELATIVE_UNITS)[number];

export function isGroup(node: FilterNode): node is FilterGroup {
  return "conditions" in node;
}

export function isDateType(type: FieldType) {
  return type === "date" || type === "datetime";
}

export function countConditions(node: FilterNode | null | undefined): number {
  if (!node) return 0;
  return isGroup(node) ? node.conditions.reduce((total, child) => total + countConditions(child), 0) : 1;
}

/** A condition is complete when its operator has the value it needs. */
export function isComplete(condition: FilterCondition): boolean {
  if (!condition.field) return false;
  if (VALUELESS_OPERATORS.has(condition.operator)) return true;
  const value = condition.value;
  if (value === undefined || value === null || value === "") return false;
  if (LIST_OPERATORS.has(condition.operator)) return Array.isArray(value) && value.length > 0;
  if (condition.operator === "between") {
    return Array.isArray(value) && value.length === 2 && value.every((entry) => entry !== "" && entry != null);
  }
  if (typeof value === "object" && !Array.isArray(value)) {
    const range = value as Record<string, unknown>;
    const count = range.last ?? range.next ?? range.ago ?? range.from_now;
    return typeof count === "number" && count >= 1 && count <= 366;
  }
  return true;
}

/** Drops incomplete conditions and empty groups. `null` when nothing is left. */
export function pruneFilter(group: FilterGroup | null | undefined): FilterGroup | null {
  if (!group) return null;
  const conditions: FilterNode[] = [];
  for (const node of group.conditions) {
    if (isGroup(node)) {
      const child = pruneFilter(node);
      if (child) conditions.push(child);
    } else if (isComplete(node)) {
      conditions.push(
        VALUELESS_OPERATORS.has(node.operator) ? { field: node.field, operator: node.operator } : node,
      );
    }
  }
  return conditions.length > 0 ? { op: group.op, conditions } : null;
}

/** Both filters must match. Used to add the admin's filter to a saved view's or a metric link's. */
export function combineFilters(...filters: (FilterNode | null | undefined)[]): FilterGroup | null {
  const groups = filters
    .filter((filter): filter is FilterNode => filter != null)
    .map((filter) => (isGroup(filter) ? filter : { op: "and" as const, conditions: [filter] }))
    .filter((group) => group.conditions.length > 0);
  if (groups.length === 0) return null;
  if (groups.length === 1) return groups[0];
  return { op: "and", conditions: groups.flatMap((group) => (group.op === "and" ? group.conditions : [group])) };
}

/** A filter from a URL, a saved view or a link. Anything that is not a filter becomes `null`. */
export function parseFilter(raw: unknown): FilterGroup | null {
  let value = raw;
  if (typeof value === "string") {
    try {
      value = JSON.parse(value);
    } catch {
      return null;
    }
  }
  if (typeof value !== "object" || value === null) return null;
  const node = value as Partial<FilterGroup & FilterCondition>;
  if (Array.isArray(node.conditions)) {
    return { op: node.op === "or" ? "or" : "and", conditions: node.conditions as FilterNode[] };
  }
  // A single condition (as metric links send it) is wrapped in a group.
  if (typeof node.field === "string" && typeof node.operator === "string") {
    return { op: "and", conditions: [node as FilterCondition] };
  }
  return null;
}

/** The value a fresh condition starts with, for a field and operator. */
export function defaultValue(field: Field, operator: Operator): unknown {
  if (VALUELESS_OPERATORS.has(operator)) return undefined;
  if (LIST_OPERATORS.has(operator)) return [];
  if (operator === "between") return ["", ""];
  if (operator === "within") return "today";
  if (field.type === "boolean") return true;
  return "";
}

export function newCondition(field: Field): FilterCondition {
  const operator = field.operators[0] ?? "is";
  return { field: field.name, operator, value: defaultValue(field, operator) };
}

/** The quick filters every resource with assignment gets (`conventions.md`, "The assignee in lists"). */
export function mineFilter(assigneeField: string): FilterCondition {
  return { field: assigneeField, operator: "is", value: "me" };
}

export function unassignedFilter(assigneeField: string): FilterCondition {
  return { field: assigneeField, operator: "is_empty" };
}

export function sameCondition(a: FilterNode, b: FilterCondition): boolean {
  return !isGroup(a) && a.field === b.field && a.operator === b.operator && JSON.stringify(a.value) === JSON.stringify(b.value);
}

/** Adds or removes a top-level condition of an `and` filter. */
export function toggleCondition(filter: FilterGroup | null, condition: FilterCondition): FilterGroup | null {
  const group = filter ?? EMPTY_FILTER;
  if (group.conditions.some((node) => sameCondition(node, condition))) {
    return pruneFilter({ ...group, conditions: group.conditions.filter((node) => !sameCondition(node, condition)) });
  }
  // A new condition must narrow the list, so an `or` filter is wrapped first.
  return group.op === "and"
    ? { op: "and", conditions: [...group.conditions, condition] }
    : { op: "and", conditions: [group, condition] };
}

export function hasCondition(filter: FilterGroup | null, condition: FilterCondition): boolean {
  return filter?.conditions.some((node) => sameCondition(node, condition)) ?? false;
}
