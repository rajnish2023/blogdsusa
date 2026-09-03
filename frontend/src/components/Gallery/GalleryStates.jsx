import { ImagePlus, SearchX } from "lucide-react";

export function GallerySkeleton({ count = 10, layout = "grid" }) {
  if (layout === "list") {
    return (
      <div className="space-y-3">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="flex animate-pulse items-center gap-4 rounded-2xl border border-paper-line bg-paper-card p-4">
            <div className="h-16 w-24 shrink-0 rounded-lg bg-ink/5" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-1/3 rounded bg-ink/10" />
              <div className="h-2.5 w-1/2 rounded bg-ink/10" />
            </div>
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="animate-pulse overflow-hidden rounded-2xl border border-paper-line bg-paper-card">
          <div className="aspect-square bg-ink/5" />
          <div className="space-y-2 px-3.5 py-3">
            <div className="h-3 w-3/4 rounded bg-ink/10" />
            <div className="h-2.5 w-1/2 rounded bg-ink/10" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function EmptyState({
  hasFilters,
  onUploadClick,
  onClearFilters,
  canUpload = true,
  icon: Icon = ImagePlus,
  title = "The gallery is empty",
  description = "Upload images or videos to start building your media library.",
  actionLabel = "Upload your first file",
  filteredTitle = "No files match that search",
  filteredDescription = "Try a different keyword, or clear filters to see everything.",
}) {
  if (hasFilters) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-paper-line py-24 text-center">
        <SearchX size={30} className="text-muted" />
        <p className="font-display text-base font-semibold text-ink">{filteredTitle}</p>
        <p className="max-w-xs text-sm text-muted">{filteredDescription}</p>
        <button onClick={onClearFilters} className="btn-secondary mt-1">
          Clear filters
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-paper-line py-24 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-signal-soft text-signal">
        <Icon size={26} />
      </div>
      <p className="font-display text-base font-semibold text-ink">{title}</p>
      <p className="max-w-xs text-sm text-muted">{description}</p>
      {canUpload && (
        <button onClick={onUploadClick} className="btn-primary mt-1">
          {actionLabel}
        </button>
      )}
    </div>
  );
}

export function ErrorState({ message, onRetry, title = "Couldn't load this" }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-danger/30 bg-danger/5 py-24 text-center">
      <p className="font-display text-base font-semibold text-danger">{title}</p>
      <p className="max-w-xs text-sm text-muted">{message || "Check that the backend server is running and try again."}</p>
      <button onClick={onRetry} className="btn-secondary mt-1">
        Retry
      </button>
    </div>
  );
}
