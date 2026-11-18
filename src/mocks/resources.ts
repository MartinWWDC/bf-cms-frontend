import type {
  ListParams,
  ListResult,
  RecordDetail,
  ResourceContract,
  ResourceRecord,
  RunActionInput,
  RunActionResult,
} from "@/features/resources/types";

import { buildOrderActivity, mockOrders, ordersContract, ordersTabStatuses } from "./orders";

/**
 * In-memory stand-in for the generic CMS endpoints. It does what the backend will do:
 * filter, search, sort and page on the "server" side, so the UI code is already written
 * for server-side processing.
 */

interface MockResource {
  contract: ResourceContract;
  records: ResourceRecord[];
  tabStatuses: Record<string, string[]>;
  buildActivity: (record: ResourceRecord) => RecordDetail["activity"];
}

const RESOURCES: Record<string, MockResource> = {
  orders: {
    contract: ordersContract,
    records: mockOrders,
    tabStatuses: ordersTabStatuses,
    buildActivity: buildOrderActivity,
  },
};

function getResource(resource: string): MockResource {
  const entry = RESOURCES[resource];
  if (!entry) throw new Error(`Unknown resource "${resource}"`);
  return entry;
}

/** A comparable primitive for any field value (money -> amount, person -> name). */
function sortValue(value: unknown): string | number {
  if (value == null) return "";
  if (typeof value === "number") return value;
  if (typeof value === "object") {
    const object = value as { amount?: number; name?: string };
    return object.amount ?? object.name?.toLowerCase() ?? "";
  }
  return String(value).toLowerCase();
}

function searchText(record: ResourceRecord): string {
  return Object.values(record)
    .map((value) => (value && typeof value === "object" ? (value as { name?: string }).name ?? "" : String(value ?? "")))
    .join(" ")
    .toLowerCase();
}

export function mockGetContract(resource: string): ResourceContract {
  return getResource(resource).contract;
}

export function mockListRecords(resource: string, params: ListParams): ListResult {
  const { contract, records, tabStatuses } = getResource(resource);
  const statusField = contract.statusField;
  const statuses = tabStatuses[params.tab];
  const query = params.search.trim().toLowerCase();

  let rows = records;
  if (statuses && statusField) {
    rows = rows.filter((record) => statuses.includes(String(record[statusField])));
  }
  if (query) {
    rows = rows.filter((record) => searchText(record).includes(query));
  }

  const direction = params.sort.direction === "asc" ? 1 : -1;
  rows = [...rows].sort((a, b) => {
    const left = sortValue(a[params.sort.field]);
    const right = sortValue(b[params.sort.field]);
    if (left < right) return -direction;
    if (left > right) return direction;
    return 0;
  });

  const start = (params.page - 1) * params.pageSize;
  return {
    rows: rows.slice(start, start + params.pageSize),
    total: rows.length,
    page: params.page,
    pageSize: params.pageSize,
  };
}

export function mockGetRecord(resource: string, id: string): RecordDetail {
  const { records, buildActivity } = getResource(resource);
  const record = records.find((entry) => entry.id === id);
  if (!record) throw new Error(`Record "${id}" not found`);
  return { record, version: 1, activity: buildActivity(record) };
}

/** Pretends to run an action. It validates the input like the backend would, but changes nothing. */
export function mockRunAction(resource: string, input: RunActionInput): RunActionResult {
  const { contract, records } = getResource(resource);
  const action = contract.actions.find((entry) => entry.key === input.actionKey);
  if (!action) throw new Error(`Unknown action "${input.actionKey}"`);
  if (!records.some((entry) => entry.id === input.recordId)) {
    throw new Error(`Record "${input.recordId}" not found`);
  }
  return { message: `"${action.label}" ran against mock data. Nothing was changed.` };
}
