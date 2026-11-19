"use client";

import { ChevronLeftIcon, ChevronRightIcon, ChevronsLeftIcon, ChevronsRightIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { useFormat } from "@/i18n/use-format";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface DataTablePaginationProps {
  /** 1-based page number. */
  page: number;
  pageSize: number;
  total: number;
  /** The count stopped at a cap (big resources): shown as "10,000+". */
  totalCapped?: boolean;
  /** Whether a next page exists. Always reliable, also when the total is capped. */
  hasMore?: boolean;
  pageSizes: readonly number[];
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  disabled?: boolean;
}

/** Page-number paging footer. Stateless: the parent owns page and page size. */
export function DataTablePagination({
  page,
  pageSize,
  total,
  totalCapped = false,
  hasMore,
  pageSizes,
  onPageChange,
  onPageSizeChange,
  disabled = false,
}: DataTablePaginationProps) {
  const t = useTranslations("table");
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = totalCapped ? page * pageSize : Math.min(total, page * pageSize);
  const isFirst = page <= 1;
  const isLast = hasMore === undefined ? page >= pageCount : !hasMore;
  const format = useFormat();

  return (
    <div className="flex shrink-0 flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t bg-card px-4 py-2">
      <p className="font-mono text-xs text-muted-foreground tabular-nums">
        {t.rich(totalCapped ? "rangeCapped" : "range", {
          from: format.number(from),
          to: format.number(Math.max(to, from)),
          total: format.number(total),
          range: (chunks) => <span className="text-foreground">{chunks}</span>,
        })}
      </p>

      <div className="flex items-center gap-3">
        <div className="hidden items-center gap-2 sm:flex">
          <span className="text-xs text-muted-foreground">{t("rows")}</span>
          <Select
            value={String(pageSize)}
            onValueChange={(value) => onPageSizeChange(Number(value))}
            disabled={disabled}
          >
            <SelectTrigger size="sm" className="w-18 font-mono text-xs tabular-nums" aria-label={t("rowsPerPage")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {pageSizes.map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon-sm"
            className="hidden sm:inline-flex"
            aria-label={t("firstPage")}
            disabled={disabled || isFirst}
            onClick={() => onPageChange(1)}
          >
            <ChevronsLeftIcon />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            aria-label={t("previousPage")}
            disabled={disabled || isFirst}
            onClick={() => onPageChange(page - 1)}
          >
            <ChevronLeftIcon />
          </Button>
          <span className="min-w-20 text-center font-mono text-xs text-muted-foreground tabular-nums">
            <span className="text-foreground">{page}</span>
            {totalCapped ? null : <> / {pageCount}</>}
          </span>
          <Button
            variant="outline"
            size="icon-sm"
            aria-label={t("nextPage")}
            disabled={disabled || isLast}
            onClick={() => onPageChange(page + 1)}
          >
            <ChevronRightIcon />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            className="hidden sm:inline-flex"
            aria-label={t("lastPage")}
            disabled={disabled || isLast || totalCapped}
            onClick={() => onPageChange(pageCount)}
          >
            <ChevronsRightIcon />
          </Button>
        </div>
      </div>
    </div>
  );
}
