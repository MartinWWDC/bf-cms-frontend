import { mockDelay } from "@/mocks/delay";
import { mockGetContract, mockGetRecord, mockListRecords, mockRunAction } from "@/mocks/resources";

import type {
  ListParams,
  ListResult,
  RecordDetail,
  ResourceContract,
  RunActionInput,
  RunActionResult,
} from "../types";

/**
 * The generic resource endpoints. Every function here is a MOCK: swap each body for the
 * real call on the `api` client (and map the response to the types in `types.ts`) once
 * the CMS API is reachable. Nothing outside this file knows the data is mocked.
 *
 *   fetchResourceContract -> GET  /resources/{resource}
 *   fetchResourceRecords  -> GET  /resources/{resource}/records
 *   fetchResourceRecord   -> GET  /resources/{resource}/records/{id}
 *   runResourceAction     -> POST one endpoint per action (with an idempotency key)
 */

export function fetchResourceContract(resource: string): Promise<ResourceContract> {
  return mockDelay(mockGetContract(resource), 200);
}

export function fetchResourceRecords(resource: string, params: ListParams): Promise<ListResult> {
  return mockDelay(mockListRecords(resource, params), 400);
}

export function fetchResourceRecord(resource: string, id: string): Promise<RecordDetail> {
  return mockDelay(null, 300).then(() => mockGetRecord(resource, id));
}

export function runResourceAction(resource: string, input: RunActionInput): Promise<RunActionResult> {
  return mockDelay(null, 600).then(() => mockRunAction(resource, input));
}
