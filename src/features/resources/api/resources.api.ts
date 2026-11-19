import type { AxiosRequestConfig } from "axios";

import { api, type Envelope, getData } from "@/lib/api/client";
import type { QueuedJob, RecordId } from "@/lib/api/types";

import type {
  ActionPreview,
  ActionRequest,
  ActionResult,
  Assignment,
  AssignmentSummary,
  BulkTarget,
  Contract,
  ExportFormat,
  HistoryList,
  ListParams,
  Note,
  NoteInput,
  NoteList,
  RecordDetail,
  RecordInput,
  RecordList,
  RecordScreen,
  RevealedValue,
  SavedView,
  SavedViewInput,
  StaffMember,
  TranslationSuggestion,
  TranslationSuggestionRequest,
} from "../types";

/**
 * The generic resource endpoints of `/cms/v1` (`conventions.md` sections 5 to 9).
 * One set of functions serves every resource; `resource` is the contract key.
 */

const base = (resource: string) => `/resources/${resource}`;
const recordPath = (resource: string, id: RecordId) => `${base(resource)}/records/${encodeURIComponent(String(id))}`;

/** A filter this long goes in the body of `POST .../records/search` instead of the URL. */
const LONG_FILTER = 1500;

/** List parameters in the API's own names. `filter` stays an object. */
export function toListRequest(params: ListParams): Record<string, unknown> {
  const request: Record<string, unknown> = {};
  if (params.view) request.view = params.view;
  if (params.tab) request.tab = params.tab;
  if (params.savedView != null) request.saved_view = params.savedView;
  if (params.q) request.q = params.q;
  if (params.sort) request.sort = params.sort;
  if (params.fields?.length) request.fields = params.fields.join(",");
  if (params.filter && params.filter.conditions.length > 0) request.filter = params.filter;
  if (params.trashed) request.trashed = params.trashed;
  if (params.groupBy) request.group_by = params.groupBy;
  if (params.aggregates?.length) request.aggregates = params.aggregates.join(",");
  if (params.page) request.page = params.page;
  if (params.perPage) request.per_page = params.perPage;
  return request;
}

/** In the query string the filter is the same object as a JSON string. */
function toQuery(request: Record<string, unknown>): Record<string, unknown> {
  return request.filter ? { ...request, filter: JSON.stringify(request.filter) } : request;
}

export function fetchResourceContract(resource: string): Promise<Contract> {
  return getData<Contract>(base(resource));
}

export async function fetchResourceRecords(
  resource: string,
  params: ListParams,
  config?: AxiosRequestConfig,
): Promise<RecordList> {
  const request = toListRequest(params);
  const filterLength = request.filter ? JSON.stringify(request.filter).length : 0;
  const response =
    filterLength > LONG_FILTER
      ? await api.post<RecordList>(`${base(resource)}/records/search`, request, config)
      : await api.get<RecordList>(`${base(resource)}/records`, { ...config, params: toQuery(request) });
  return response.data;
}

export async function fetchResourceRecord(resource: string, id: RecordId): Promise<RecordDetail> {
  const response = await api.get<RecordDetail>(recordPath(resource, id));
  return response.data;
}

/** A related list of one record. Columns and filters are those of the related resource. */
export async function fetchRelatedRecords(
  resource: string,
  id: RecordId,
  relation: string,
  params: ListParams,
): Promise<RecordList> {
  const response = await api.get<RecordList>(`${recordPath(resource, id)}/relations/${relation}`, {
    params: toQuery(toListRequest(params)),
  });
  return response.data;
}

/** The aggregated screen of a record (`detail.custom_endpoint`). */
export async function fetchRecordScreen<TData>(resource: string, id: RecordId): Promise<RecordScreen<TData>> {
  const response = await api.get<RecordScreen<TData>>(`${recordPath(resource, id)}/screen`);
  return response.data;
}

/** The real value of one sensitive field. Logged by the backend; never store the answer. */
export async function revealField(resource: string, id: RecordId, field: string): Promise<RevealedValue> {
  const response = await api.post<Envelope<RevealedValue>>(`${recordPath(resource, id)}/reveal`, { field });
  return response.data.data;
}

/* ---------- Writing ---------- */

export async function createRecord(resource: string, input: RecordInput): Promise<RecordDetail> {
  const response = await api.post<RecordDetail>(`${base(resource)}/records`, input);
  return response.data;
}

/** Sends only the changed fields, with the record version in `If-Match`. */
export async function updateRecord(
  resource: string,
  id: RecordId,
  version: string,
  input: RecordInput,
): Promise<RecordDetail> {
  const response = await api.patch<RecordDetail>(recordPath(resource, id), input, {
    headers: { "If-Match": version },
  });
  return response.data;
}

export async function deleteRecord(resource: string, id: RecordId, version: string, reason?: string): Promise<void> {
  await api.delete(recordPath(resource, id), {
    headers: { "If-Match": version },
    data: reason ? { _reason: reason } : undefined,
  });
}

export async function restoreRecord(resource: string, id: RecordId, reason?: string): Promise<RecordDetail> {
  const response = await api.post<RecordDetail>(
    `${recordPath(resource, id)}/restore`,
    reason ? { _reason: reason } : undefined,
  );
  return response.data;
}

/** Machine translation suggestions. Nothing is saved. `id: null` is the create form. */
export async function suggestTranslations(
  resource: string,
  id: RecordId | null,
  request: TranslationSuggestionRequest,
): Promise<TranslationSuggestion> {
  const path = id === null ? `${base(resource)}/translations/suggest` : `${recordPath(resource, id)}/translations/suggest`;
  const response = await api.post<TranslationSuggestion>(path, request);
  return response.data;
}

/* ---------- Actions ---------- */

function hasFile(input: Record<string, unknown> | undefined) {
  return Object.values(input ?? {}).some((value) => value instanceof File);
}

/**
 * An action with a file input is sent as `multipart/form-data`: `input[name]` for every
 * input, `reason`, `confirm=1` (`conventions.md` section 13).
 */
function toActionBody(request: ActionRequest): ActionRequest | FormData {
  if (!hasFile(request.input)) return request;
  const form = new FormData();
  for (const [name, value] of Object.entries(request.input ?? {})) {
    if (value === null || value === undefined) continue;
    if (value instanceof File) form.append(`input[${name}]`, value);
    else if (typeof value === "object") form.append(`input[${name}]`, JSON.stringify(value));
    else if (typeof value === "boolean") form.append(`input[${name}]`, value ? "1" : "0");
    else form.append(`input[${name}]`, String(value));
  }
  if (request.reason) form.append("reason", request.reason);
  if (request.confirm) form.append("confirm", "1");
  for (const flag of request.acknowledged_flags ?? []) form.append("acknowledged_flags[]", flag);
  return form;
}

/** What an action would do to one record, and its warnings. Nothing changes. */
export async function previewRecordAction(
  resource: string,
  id: RecordId,
  action: string,
  input: Record<string, unknown>,
): Promise<ActionPreview> {
  const response = await api.post<Envelope<ActionPreview>>(`${recordPath(resource, id)}/actions/${action}/preview`, {
    input,
  });
  return response.data.data;
}

export async function runRecordAction(
  resource: string,
  id: RecordId,
  action: string,
  request: ActionRequest,
  idempotencyKey: string,
): Promise<ActionResult> {
  const response = await api.post<Envelope<ActionResult>>(
    `${recordPath(resource, id)}/actions/${action}`,
    toActionBody(request),
    { headers: { "Idempotency-Key": idempotencyKey } },
  );
  return response.data.data;
}

/** An import, export or template download of the resource itself. */
export async function runStandaloneAction(
  resource: string,
  action: string,
  request: ActionRequest,
  idempotencyKey: string,
): Promise<ActionResult> {
  const response = await api.post<Envelope<ActionResult>>(
    `${base(resource)}/standalone-actions/${action}`,
    toActionBody(request),
    { headers: { "Idempotency-Key": idempotencyKey } },
  );
  return response.data.data;
}

function toBulkTarget(target: BulkTarget) {
  return "ids" in target ? { ids: target.ids } : { selection: toListRequest(target.selection) };
}

/** An action on many records is always queued; follow the job. */
export async function runBulkAction(
  resource: string,
  action: string,
  target: BulkTarget,
  request: ActionRequest,
  idempotencyKey: string,
): Promise<QueuedJob> {
  const response = await api.post<Envelope<QueuedJob>>(
    `${base(resource)}/actions/${action}`,
    { ...toBulkTarget(target), ...request },
    { headers: { "Idempotency-Key": idempotencyKey } },
  );
  return response.data.data;
}

/* ---------- Exports ---------- */

/** Queues an export of exactly the list the admin is looking at. Paging and grouping are not part of it. */
export async function exportRecords(resource: string, format: ExportFormat, params: ListParams): Promise<QueuedJob> {
  const list = toListRequest({ ...params, page: undefined, perPage: undefined, groupBy: null, aggregates: undefined });
  const response = await api.post<Envelope<QueuedJob>>(`${base(resource)}/exports`, { format, ...list });
  return response.data.data;
}

/* ---------- Notes ---------- */

export async function fetchNotes(resource: string, id: RecordId, page: number, linked: boolean): Promise<NoteList> {
  const response = await api.get<NoteList>(`${recordPath(resource, id)}/notes`, {
    params: { page, per_page: 50, linked: linked ? 1 : 0 },
  });
  return response.data;
}

export async function createNote(resource: string, id: RecordId, input: NoteInput): Promise<Note> {
  let body: FormData | Omit<NoteInput, "attachments"> = {
    body: input.body,
    format: input.format,
    mentions: input.mentions,
  };
  if (input.attachments?.length) {
    const form = new FormData();
    form.append("body", input.body);
    if (input.format) form.append("format", input.format);
    for (const mention of input.mentions ?? []) form.append("mentions[]", String(mention));
    for (const file of input.attachments) form.append("attachments[]", file);
    body = form;
  }
  const response = await api.post<Envelope<Note>>(`${recordPath(resource, id)}/notes`, body);
  return response.data.data;
}

export async function updateNote(
  resource: string,
  id: RecordId,
  noteId: number,
  input: Omit<NoteInput, "attachments">,
): Promise<Note> {
  const response = await api.patch<Envelope<Note>>(`${recordPath(resource, id)}/notes/${noteId}`, input);
  return response.data.data;
}

export async function deleteNote(resource: string, id: RecordId, noteId: number): Promise<void> {
  await api.delete(`${recordPath(resource, id)}/notes/${noteId}`);
}

export async function pinNote(resource: string, id: RecordId, noteId: number, pinned: boolean): Promise<Note> {
  const response = await api.post<Envelope<Note>>(`${recordPath(resource, id)}/notes/${noteId}/pin`, { pinned });
  return response.data.data;
}

/* ---------- History ---------- */

export async function fetchHistory(
  resource: string,
  id: RecordId,
  page: number,
  types: string[],
): Promise<HistoryList> {
  const response = await api.get<HistoryList>(`${recordPath(resource, id)}/history`, {
    params: { page, per_page: 50, types: types.length ? types.join(",") : undefined },
  });
  return response.data;
}

/* ---------- Assignment ---------- */

export async function assignRecord(
  resource: string,
  id: RecordId,
  adminId: number,
  reason?: string,
): Promise<Assignment | null> {
  const response = await api.put<Envelope<Assignment | null>>(`${recordPath(resource, id)}/assignment`, {
    admin_id: adminId,
    _reason: reason || undefined,
  });
  return response.data.data;
}

export async function unassignRecord(resource: string, id: RecordId): Promise<void> {
  await api.delete(`${recordPath(resource, id)}/assignment`);
}

/** Assigns, reassigns or unassigns (`adminId: null`) many records in a background job. */
export async function assignRecords(resource: string, adminId: number | null, target: BulkTarget): Promise<QueuedJob> {
  const response = await api.post<Envelope<QueuedJob>>(`${base(resource)}/assignments`, {
    admin_id: adminId,
    ...toBulkTarget(target),
  });
  return response.data.data;
}

export async function fetchAssignmentSummary(resource: string): Promise<AssignmentSummary> {
  const response = await api.get<AssignmentSummary>(`${base(resource)}/assignments/summary`);
  return response.data;
}

/** Staff for assignee and mention pickers. Every signed-in admin may use it. */
export function fetchStaff(query: string): Promise<StaffMember[]> {
  return getData<StaffMember[]>("/staff", { params: { q: query || undefined } });
}

/* ---------- Saved views ---------- */

export function fetchSavedViews(resource: string): Promise<SavedView[]> {
  return getData<SavedView[]>(`${base(resource)}/saved-views`);
}

export async function createSavedView(resource: string, input: SavedViewInput): Promise<SavedView> {
  const response = await api.post<Envelope<SavedView>>(`${base(resource)}/saved-views`, input);
  return response.data.data;
}

export async function updateSavedView(resource: string, id: number, input: SavedViewInput): Promise<SavedView> {
  const response = await api.patch<Envelope<SavedView>>(`${base(resource)}/saved-views/${id}`, input);
  return response.data.data;
}

export async function deleteSavedView(resource: string, id: number): Promise<void> {
  await api.delete(`${base(resource)}/saved-views/${id}`);
}

export async function orderSavedViews(resource: string, ids: number[]): Promise<SavedView[]> {
  const response = await api.post<Envelope<SavedView[]>>(`${base(resource)}/saved-views/order`, { ids });
  return response.data.data;
}
