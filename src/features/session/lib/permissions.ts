/**
 * Whether a list of granted keys covers a permission (`conventions.md` section 10).
 * `*` covers everything; `resource.*` covers every permission of that resource.
 */
export function hasPermission(granted: readonly string[], permission: string): boolean {
  if (granted.includes("*") || granted.includes(permission)) return true;
  const resource = permission.split(".")[0];
  return granted.includes(`${resource}.*`);
}

/** Only same-origin paths are accepted as the page to return to after login. */
export function safeNextPath(value: string | null | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/login")) return "/";
  return value;
}
