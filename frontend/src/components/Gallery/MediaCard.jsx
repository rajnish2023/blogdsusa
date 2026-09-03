import { useState } from "react";
import { Play, ImageOff, Check } from "lucide-react";
import DropdownMenu from "./DropdownMenu";
import { formatBytes, truncate } from "../../utils/format";

export default function MediaCard({ item, onPreview, onCopyLink, onDownload, onDelete, isSelected, onToggleSelect, selectionMode }) {
  const [errored, setErrored] = useState(false);

  return (
    <div
      className={`group relative flex flex-col overflow-hidden rounded-2xl border bg-paper-card shadow-card transition-all hover:-translate-y-0.5 hover:shadow-pop ${
        isSelected ? "border-signal ring-1 ring-signal" : "border-paper-line"
      }`}
    >
      <div className="pointer-events-none absolute right-0 top-0 z-10 h-5 w-5 origin-top-right scale-0 bg-signal transition-transform duration-200 group-hover:scale-100" style={{ clipPath: "polygon(100% 0, 0 0, 100% 100%)" }} />

      {/* Selection Checkbox Overlay */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggleSelect(item);
        }}
        className={`absolute left-2.5 top-2.5 z-20 flex h-5 w-5 items-center justify-center rounded shadow transition-all ${
          isSelected || selectionMode ? "opacity-100" : "opacity-0 group-hover:opacity-100"
        } ${isSelected ? "bg-signal text-white ring-2 ring-signal ring-offset-2" : "bg-white border-2 border-paper-line text-transparent hover:border-signal"}`}
      >
        <Check size={14} className={isSelected ? "text-white" : "text-ink/30"} strokeWidth={3} />
      </button>

      <button
        onClick={() => {
          if (selectionMode) {
            onToggleSelect(item);
          } else {
            onPreview(item);
          }
        }}
        className="relative aspect-square w-full overflow-hidden bg-ink/5"
      >
        {errored ? (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-muted">
            <ImageOff size={22} />
            <span className="text-xs">Preview unavailable</span>
          </div>
        ) : item.type === "video" ? (
          <>
            <video
              src={item.url}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
              muted
              preload="metadata"
              onError={() => setErrored(true)}
            />
            <div className="absolute inset-0 flex items-center justify-center bg-ink/20">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/90 text-ink shadow-md transition-transform group-hover:scale-110">
                <Play size={18} fill="currentColor" className="ml-0.5" />
              </div>
            </div>
          </>
        ) : (
          <img
            src={item.url}
            alt={item.alt || item.originalName}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            onError={() => setErrored(true)}
          />
        )}

        {/* Selection Blue Tint */}
        {isSelected && <div className="absolute inset-0 bg-signal/20 pointer-events-none z-10 transition-colors"></div>}

        <span className="absolute left-2.5 bottom-2.5 rounded-md bg-ink/60 px-2 py-1 font-mono text-[10px] font-medium uppercase tracking-wide text-white backdrop-blur-sm z-20">
          {item.type}
        </span>
      </button>

      <div className="absolute right-2.5 top-2.5 opacity-0 transition-opacity group-hover:opacity-100">
        <DropdownMenu
          onCopyLink={() => onCopyLink(item)}
          onDownload={() => onDownload(item)}
          onDelete={onDelete ? () => onDelete(item) : undefined}
        />
      </div>

      <div className="flex flex-1 flex-col gap-1 px-3.5 py-3">
        <p className="truncate text-sm font-medium text-ink" title={item.originalName}>
          {truncate(item.originalName, 30)}
        </p>
        <div className="flex items-center justify-between font-mono text-[11px] text-muted">
          <span>{formatBytes(item.size)}</span>
          <span>{new Date(item.createdAt).toLocaleDateString(undefined, { day: "2-digit", month: "short" })}</span>
        </div>
      </div>
    </div>
  );
}
