/** A document published with the deployed API build (`GET /docs`, only where `CMS_DOCS_ENABLED` is on). */
export interface ApiDocument {
  name: string;
  title: string;
  format: "json" | "markdown";
}
