import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * Reusable, premium Pagination component with smart ellipsis range generation
 */
export default function Pagination({ page = 1, pages = 1, total = 0, limit = 12, onPageChange }) {
  if (pages <= 1) return null;

  const startEntry = (page - 1) * limit + 1;
  const endEntry = Math.min(page * limit, total);

  // Generate page numbers with ellipsis (e.g., [1, 2, '...', 9, 10])
  const getPagesRange = () => {
    const range = [];
    const delta = 2; // number of pages to show around current page
    const left = page - delta;
    const right = page + delta + 1;
    let l;

    for (let i = 1; i <= pages; i++) {
      if (i === 1 || i === pages || (i >= left && i < right)) {
        range.push(i);
      }
    }

    const rangeWithDots = [];
    for (const i of range) {
      if (l) {
        if (i - l === 2) {
          rangeWithDots.push(l + 1);
        } else if (i - l > 2) {
          rangeWithDots.push("...");
        }
      }
      rangeWithDots.push(i);
      l = i;
    }
    return rangeWithDots;
  };

  return (
    <div className="flex flex-col items-center justify-between gap-4 border-t border-paper-line bg-paper-card px-8 py-4 sm:flex-row shrink-0 select-none">
      <p className="text-xs text-muted">
        Showing <span className="font-semibold text-ink">{startEntry}</span> to{" "}
        <span className="font-semibold text-ink">{endEntry}</span> of{" "}
        <span className="font-semibold text-ink">{total}</span> entries
      </p>

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-paper-line bg-paper text-muted hover:bg-paper-line hover:text-ink disabled:opacity-30 disabled:hover:bg-transparent transition-all"
        >
          <ChevronLeft size={16} />
        </button>

        {getPagesRange().map((p, idx) =>
          p === "..." ? (
            <span key={`dots-${idx}`} className="px-2 text-xs text-muted font-medium select-none">
              ...
            </span>
          ) : (
            <button
              key={`page-${p}`}
              type="button"
              onClick={() => onPageChange(p)}
              className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-semibold transition-all ${
                page === p
                  ? "bg-signal text-white shadow-sm shadow-signal/30"
                  : "border border-paper-line bg-paper text-muted hover:bg-paper-line hover:text-ink"
              }`}
            >
              {p}
            </button>
          )
        )}

        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page === pages}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-paper-line bg-paper text-muted hover:bg-paper-line hover:text-ink disabled:opacity-30 disabled:hover:bg-transparent transition-all"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
