/**
 * Allow-list sanitiser for HTML written by staff or users (rich-text fields, rich notes).
 *
 * The backend already sanitises rich text on save; this is the second line of defence the
 * docs ask for ("render it with the same care as any user HTML"). Everything that is not a
 * known formatting tag is unwrapped, every attribute except safe links and images is
 * dropped. Browser only: it returns an empty string on the server.
 */

const ALLOWED_TAGS = new Set([
  "p", "br", "hr", "h1", "h2", "h3", "h4", "h5", "h6", "strong", "b", "em", "i", "u", "s", "code", "pre",
  "blockquote", "sup", "sub", "ul", "ol", "li", "a", "img", "table", "thead", "tbody", "tr", "th", "td", "span", "div",
]);

/** Removed together with their content. */
const DROPPED_TAGS = new Set(["script", "style", "iframe", "object", "embed", "form", "template", "noscript", "svg", "math"]);

function isSafeUrl(value: string, allowMail: boolean) {
  const url = value.trim().toLowerCase();
  return (
    url.startsWith("https://") ||
    url.startsWith("http://") ||
    url.startsWith("/") ||
    url.startsWith("#") ||
    (allowMail && (url.startsWith("mailto:") || url.startsWith("tel:")))
  );
}

function clean(node: Node, document: Document) {
  for (const child of [...node.childNodes]) {
    if (child.nodeType === Node.TEXT_NODE) continue;
    if (child.nodeType !== Node.ELEMENT_NODE) {
      child.remove();
      continue;
    }
    const element = child as Element;
    const tag = element.tagName.toLowerCase();
    if (DROPPED_TAGS.has(tag)) {
      element.remove();
      continue;
    }
    clean(element, document);
    if (!ALLOWED_TAGS.has(tag)) {
      element.replaceWith(...element.childNodes);
      continue;
    }
    for (const attribute of [...element.attributes]) {
      const name = attribute.name.toLowerCase();
      const keep =
        (tag === "a" && name === "href" && isSafeUrl(attribute.value, true)) ||
        (tag === "img" && name === "src" && isSafeUrl(attribute.value, false)) ||
        (tag === "img" && (name === "alt" || name === "title")) ||
        ((tag === "td" || tag === "th") && (name === "colspan" || name === "rowspan"));
      if (!keep) element.removeAttribute(attribute.name);
    }
    if (tag === "a") {
      element.setAttribute("target", "_blank");
      element.setAttribute("rel", "noopener noreferrer nofollow");
    }
    if (tag === "img") {
      element.setAttribute("loading", "lazy");
      element.setAttribute("referrerpolicy", "no-referrer");
    }
  }
}

export function sanitizeHtml(html: string): string {
  if (typeof window === "undefined" || !html) return "";
  const document = new DOMParser().parseFromString(`<body>${html}</body>`, "text/html");
  clean(document.body, document);
  return document.body.innerHTML;
}

/** The text of an HTML fragment, for previews in table cells. */
export function htmlToText(html: string): string {
  if (typeof window === "undefined" || !html) return "";
  const document = new DOMParser().parseFromString(`<body>${html}</body>`, "text/html");
  for (const element of document.body.querySelectorAll([...DROPPED_TAGS].join(","))) element.remove();
  return (document.body.textContent ?? "").replace(/\s+/g, " ").trim();
}
