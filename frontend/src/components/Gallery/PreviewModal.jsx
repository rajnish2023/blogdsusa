import { useEffect, useCallback } from "react";
import { X, ChevronLeft, ChevronRight, Link2, Download, Trash2 } from "lucide-react";
import { formatBytes, formatDate } from "../../utils/format";

export default function PreviewModal({ items, index, onClose, onNavigate, onCopyLink, onDownload, onDelete }) {
  const item = items[index];

  const handleKey = useCallback(
    (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight" && index < items.length - 1) onNavigate(index + 1);
      if (e.key === "ArrowLeft" && index > 0) onNavigate(index - 1);
    },
    [index, items.length, onClose, onNavigate]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [handleKey]);

  if (!item) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-ink/95 animate-fadeIn backdrop-blur-sm">
      <div className="flex items-center justify-between px-6 py-4 text-white">
        <div>
          <p className="text-sm font-medium">{item.originalName}</p>
          <p className="font-mono text-xs text-white/50">
            {formatBytes(item.size)} · {formatDate(item.createdAt)}
          </p>
          {item.alt && <p className="mt-1 max-w-md text-xs text-white/60">Alt: {item.alt}</p>}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => onCopyLink(item)} className="rounded-md p-2 hover:bg-white/10" aria-label="Copy link">
            <Link2 size={18} />
          </button>
          <button onClick={() => onDownload(item)} className="rounded-md p-2 hover:bg-white/10" aria-label="Download">
            <Download size={18} />
          </button>
          {onDelete && (
            <button onClick={() => onDelete(item)} className="rounded-md p-2 hover:bg-danger/20 hover:text-danger" aria-label="Delete">
              <Trash2 size={18} />
            </button>
          )}
          <div className="mx-1 h-5 w-px bg-white/20" />
          <button onClick={onClose} className="rounded-md p-2 hover:bg-white/10" aria-label="Close">
            <X size={20} />
          </button>
        </div>
      </div>

      <div className="relative flex flex-1 items-center justify-center overflow-hidden px-4 pb-6">
        {index > 0 && (
          <button
            onClick={() => onNavigate(index - 1)}
            className="absolute left-4 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
          >
            <ChevronLeft size={22} />
          </button>
        )}

        <div className="flex max-h-full max-w-5xl items-center justify-center">
          {item.type === "video" ? (
            <video src={item.url} controls autoPlay className="max-h-[75vh] max-w-full rounded-lg shadow-pop" />
          ) : (
            <img src={item.url} alt={item.alt || item.originalName} className="max-h-[75vh] max-w-full rounded-lg object-contain shadow-pop" />
          )}
        </div>

        {index < items.length - 1 && (
          <button
            onClick={() => onNavigate(index + 1)}
            className="absolute right-4 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
          >
            <ChevronRight size={22} />
          </button>
        )}
      </div>

      <div className="pb-4 text-center font-mono text-xs text-white/40">
        {index + 1} / {items.length}
      </div>
    </div>
  );
}
