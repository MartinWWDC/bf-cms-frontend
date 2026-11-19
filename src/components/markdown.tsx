import type { ReactNode } from "react";
import Link from "next/link";

import { resolveLink } from "@/lib/cms-links";

/**
 * A small markdown renderer for assistant answers and the API documents. It builds React elements only (never
 * raw HTML), so whatever the model writes cannot inject markup. Supported: paragraphs,
 * line breaks, headings, bold, italic, inline code, code blocks, bullet and numbered
 * lists, links and simple tables. Anything else is shown as the text it is.
 */

const linkClass =
  "rounded-sm underline decoration-border underline-offset-4 outline-none hover:decoration-foreground focus-visible:ring-2 focus-visible:ring-ring";

const INLINE = /(`[^`\n]+`)|(\[[^\]\n]+\]\([^)\s]+\))|(\*\*[^*\n]+\*\*)|(__[^_\n]+__)|(\*[^*\n]+\*)|(\b_[^_\n]+_\b)/;

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let rest = text;
  let index = 0;

  while (rest) {
    const match = INLINE.exec(rest);
    if (!match) {
      nodes.push(rest);
      break;
    }
    if (match.index > 0) nodes.push(rest.slice(0, match.index));
    const token = match[0];
    const key = `${keyPrefix}-${index++}`;

    if (match[1]) {
      nodes.push(
        <code key={key} className="rounded-sm bg-muted px-1 font-mono text-[0.8125rem]">
          {token.slice(1, -1)}
        </code>,
      );
    } else if (match[2]) {
      const split = token.lastIndexOf("](");
      const label = renderInline(token.slice(1, split), key);
      const target = resolveLink(token.slice(split + 2, -1));
      if (target.kind === "internal") {
        nodes.push(
          <Link key={key} href={target.href} className={linkClass}>
            {label}
          </Link>,
        );
      } else if (target.kind === "external") {
        nodes.push(
          <a key={key} href={target.href} target="_blank" rel="noopener noreferrer" className={linkClass}>
            {label}
          </a>,
        );
      } else {
        // Nothing to open: keep the words, drop the address.
        nodes.push(<span key={key}>{label}</span>);
      }
    } else if (match[3] || match[4]) {
      nodes.push(<strong key={key}>{renderInline(token.slice(2, -2), key)}</strong>);
    } else {
      nodes.push(<em key={key}>{renderInline(token.slice(1, -1), key)}</em>);
    }
    rest = rest.slice(match.index + token.length);
  }
  return nodes;
}

/** Lines of one paragraph, with a line break between them. */
function renderLines(lines: string[], key: string): ReactNode[] {
  return lines.flatMap((line, index) => [
    ...(index > 0 ? [<br key={`${key}-br-${index}`} />] : []),
    ...renderInline(line, `${key}-${index}`),
  ]);
}

const isTableRow = (line: string) => line.trim().startsWith("|") && line.trim().endsWith("|") && line.trim().length > 1;
const isTableDivider = (line: string) => /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(line);
const tableCells = (line: string) => line.trim().slice(1, -1).split("|").map((cell) => cell.trim());
const BULLET = /^\s*[-*+]\s+(.*)$/;
const NUMBERED = /^\s*\d+[.)]\s+(.*)$/;
const HEADING = /^(#{1,6})\s+(.*)$/;
const FENCE = /^\s*```/;

function isBlockStart(line: string, next: string | undefined) {
  return (
    FENCE.test(line) ||
    HEADING.test(line) ||
    BULLET.test(line) ||
    NUMBERED.test(line) ||
    (isTableRow(line) && next !== undefined && isTableDivider(next))
  );
}

export function renderMarkdown(source: string): ReactNode[] {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const blocks: ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const key = `b${blocks.length}`;

    if (line.trim() === "") {
      i++;
      continue;
    }

    if (FENCE.test(line)) {
      const code: string[] = [];
      i++;
      while (i < lines.length && !FENCE.test(lines[i])) code.push(lines[i++]);
      i++;
      blocks.push(
        <pre key={key} className="scrollbar-slim overflow-x-auto rounded-md bg-muted p-3 font-mono text-[0.8125rem]">
          <code>{code.join("\n")}</code>
        </pre>,
      );
      continue;
    }

    const heading = HEADING.exec(line);
    if (heading) {
      const level = heading[1].length;
      const className = level <= 1 ? "text-base font-semibold" : level === 2 ? "text-[0.9375rem] font-semibold" : "font-semibold";
      blocks.push(
        <p key={key} role="heading" aria-level={Math.min(level + 2, 6)} className={className}>
          {renderInline(heading[2], key)}
        </p>,
      );
      i++;
      continue;
    }

    if (isTableRow(line) && i + 1 < lines.length && isTableDivider(lines[i + 1])) {
      const head = tableCells(line);
      const rows: string[][] = [];
      i += 2;
      while (i < lines.length && isTableRow(lines[i])) rows.push(tableCells(lines[i++]));
      blocks.push(
        <div key={key} className="scrollbar-slim overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr>
                {head.map((cell, column) => (
                  <th key={column} scope="col" className="border bg-muted/60 px-2 py-1 font-medium">
                    {renderInline(cell, `${key}-h${column}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {head.map((_, column) => (
                    <td key={column} className="border px-2 py-1 align-top">
                      {renderInline(row[column] ?? "", `${key}-r${rowIndex}c${column}`)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
      continue;
    }

    if (BULLET.test(line) || NUMBERED.test(line)) {
      const pattern = BULLET.test(line) ? BULLET : NUMBERED;
      const items: string[][] = [];
      while (i < lines.length) {
        const item = pattern.exec(lines[i]);
        if (item) {
          items.push([item[1]]);
          i++;
        } else if (items.length > 0 && /^\s{2,}\S/.test(lines[i]) && !BULLET.test(lines[i]) && !NUMBERED.test(lines[i])) {
          // An indented line continues the item above it.
          items[items.length - 1].push(lines[i].trim());
          i++;
        } else if (items.length > 0 && (BULLET.test(lines[i]) || NUMBERED.test(lines[i]))) {
          // A nested or mixed list is flattened into the same list.
          const nested = (BULLET.exec(lines[i]) ?? NUMBERED.exec(lines[i])) as RegExpExecArray;
          items.push([nested[1]]);
          i++;
        } else {
          break;
        }
      }
      const List = pattern === BULLET ? "ul" : "ol";
      blocks.push(
        <List key={key} className={pattern === BULLET ? "list-disc pl-5" : "list-decimal pl-5"}>
          {items.map((item, itemIndex) => (
            <li key={itemIndex} className="my-0.5">
              {renderLines(item, `${key}-${itemIndex}`)}
            </li>
          ))}
        </List>,
      );
      continue;
    }

    const paragraph: string[] = [];
    while (i < lines.length && lines[i].trim() !== "" && !(paragraph.length > 0 && isBlockStart(lines[i], lines[i + 1]))) {
      paragraph.push(lines[i++]);
    }
    blocks.push(<p key={key}>{renderLines(paragraph, key)}</p>);
  }

  return blocks;
}
