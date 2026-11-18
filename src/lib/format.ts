/** Locale-independent text helpers. Locale-aware formatting lives in `@/i18n/use-format`. */

export function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}
