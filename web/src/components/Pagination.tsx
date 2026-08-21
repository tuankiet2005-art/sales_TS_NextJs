import { ChevronLeft, ChevronRight } from "lucide-react";

import { useI18n } from "../i18n/LanguageContext";
import { motionInteractive } from "../lib/motion";

const CATALOG_PAGE_SIZE = 12;

export function catalogPageSize(): number {
  return CATALOG_PAGE_SIZE;
}

export function Pagination({
  page,
  total,
  pageSize = CATALOG_PAGE_SIZE,
  onPageChange,
}: {
  page: number;
  total: number;
  pageSize?: number;
  onPageChange: (page: number) => void;
}) {
  const { t } = useI18n();
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  if (totalPages <= 1) {
    return null;
  }

  const safePage = Math.min(Math.max(page, 1), totalPages);

  return (
    <nav
      className="mt-8 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-ink/8 bg-white px-4 py-3 shadow-card"
      aria-label={t("paginationLabel")}
    >
      <p className="text-sm text-ink/55">{t("paginationStatus", { page: safePage, totalPages })}</p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={safePage <= 1}
          onClick={() => onPageChange(safePage - 1)}
          className={`inline-flex min-h-10 items-center gap-1 rounded-xl px-3 text-sm font-medium text-ink disabled:opacity-40 ${motionInteractive}`}
        >
          <ChevronLeft className="h-4 w-4" />
          {t("paginationPrev")}
        </button>
        <button
          type="button"
          disabled={safePage >= totalPages}
          onClick={() => onPageChange(safePage + 1)}
          className={`inline-flex min-h-10 items-center gap-1 rounded-xl px-3 text-sm font-medium text-ink disabled:opacity-40 ${motionInteractive}`}
        >
          {t("paginationNext")}
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </nav>
  );
}
