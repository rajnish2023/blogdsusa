import { Search, UploadCloud, ArrowDownWideNarrow } from "lucide-react";

const filters = [
  { key: "all", label: "All" },
  { key: "image", label: "Images" },
  { key: "video", label: "Videos" },
];

export default function GalleryToolbar({ type, setType, search, setSearch, sort, setSort, counts, onUploadClick, canUpload = true }) {
  return (
    <div className="flex flex-col gap-4 border-b border-paper-line bg-paper px-8 py-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-2">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setType(f.key)}
            className={`chip ${
              type === f.key ? "bg-signal text-white" : "bg-paper-card text-muted hover:text-ink border border-paper-line"
            }`}
          >
            {f.label}
            <span className={`font-mono text-[10px] ${type === f.key ? "text-white/70" : "text-muted/70"}`}>
              {counts?.[f.key] ?? 0}
            </span>
          </button>
        ))}
      </div>

      <div className="flex flex-1 items-center gap-3 sm:justify-end">
        <div className="relative w-full max-w-xs">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search files..."
            className="w-full rounded-lg border border-paper-line bg-paper-card py-2 pl-9 pr-3 text-sm text-ink placeholder:text-muted focus:border-signal"
          />
        </div>

        <div className="relative">
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="appearance-none rounded-lg border border-paper-line bg-paper-card py-2 pl-9 pr-8 text-sm font-medium text-ink focus:border-signal"
          >
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="name">Name (A–Z)</option>
          </select>
          <ArrowDownWideNarrow size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
        </div>

        {canUpload && (
          <button onClick={onUploadClick} className="btn-primary whitespace-nowrap">
            <UploadCloud size={16} />
            Upload
          </button>
        )}
      </div>
    </div>
  );
}
