import { api, getData } from "@/lib/api/client";

import type { ApiDocument } from "../types";

export function fetchDocuments(): Promise<ApiDocument[]> {
  return getData<ApiDocument[]>("/docs");
}

/** One document as markdown text. */
export async function fetchDocument(name: string): Promise<string> {
  const response = await api.get<string>(`/docs/${encodeURIComponent(name)}`, {
    responseType: "text",
    headers: { Accept: "text/markdown, text/plain, */*" },
  });
  return response.data;
}
