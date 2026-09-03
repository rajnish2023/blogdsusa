import { useCallback, useRef, useState } from "react";
import { X, UploadCloud, FileImage, FileVideo, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { formatBytes } from "../../utils/format";

export default function UploadModal({ onClose, onUpload }) {
  const [queue, setQueue] = useState([]); // {file, id, progress, status}
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef(null);

  const addFiles = (fileList) => {
    const files = Array.from(fileList).map((file) => ({
      file,
      id: `${file.name}-${file.size}-${Math.random()}`,
      status: "pending",
    }));
    setQueue((q) => [...q, ...files]);
  };

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    addFiles(e.dataTransfer.files);
  }, []);

  const removeFile = (id) => setQueue((q) => q.filter((f) => f.id !== id));

  const setAlt = (id, alt) => setQueue((q) => q.map((f) => (f.id === id ? { ...f, alt } : f)));

  const startUpload = async () => {
    if (!queue.length || busy) return;
    setBusy(true);
    setQueue((q) => q.map((f) => ({ ...f, status: "uploading", progress: 0 })));
    try {
      await onUpload(
        queue.map((f) => f.file),
        queue.map((f) => f.alt || ""),
        (progress) => setQueue((q) => q.map((f) => ({ ...f, progress, status: progress === 100 ? "done" : "uploading" })))
      );
      setQueue((q) => q.map((f) => ({ ...f, status: "done", progress: 100 })));
      setTimeout(onClose, 700);
    } catch (err) {
      setQueue((q) => q.map((f) => ({ ...f, status: "error" })));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4 animate-fadeIn" onClick={onClose}>
      <div
        className="w-full max-w-lg animate-slideUp rounded-2xl bg-paper-card shadow-pop"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-paper-line px-6 py-4">
          <h2 className="font-display text-lg font-semibold text-ink">Upload media</h2>
          <button onClick={onClose} className="rounded-md p-1.5 text-muted hover:bg-paper hover:text-ink">
            <X size={18} />
          </button>
        </div>

        <div className="p-6">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => inputRef.current?.click()}
            className={`flex cursor-pointer flex-col items-center justify-center gap-2.5 rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors ${
              dragging ? "border-signal bg-signal-soft" : "border-paper-line hover:border-ink/20"
            }`}
          >
            <UploadCloud size={28} className={dragging ? "text-signal" : "text-muted"} />
            <p className="text-sm font-medium text-ink">
              Drop images or videos here, or <span className="text-signal">browse</span>
            </p>
            <p className="text-xs text-muted">JPG, PNG, GIF, WebP, MP4, WebM — up to 100MB each</p>
            <input
              ref={inputRef}
              type="file"
              multiple
              accept="image/*,video/*"
              className="hidden"
              onChange={(e) => addFiles(e.target.files)}
            />
          </div>

          {queue.length > 0 && (
            <div className="mt-4 max-h-56 space-y-2 overflow-y-auto pr-1">
              {queue.map((f) => (
                <div key={f.id} className="rounded-lg border border-paper-line px-3 py-2.5">
                  <div className="flex items-center gap-3">
                    {f.file.type.startsWith("video") ? (
                      <FileVideo size={18} className="shrink-0 text-muted" />
                    ) : (
                      <FileImage size={18} className="shrink-0 text-muted" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink">{f.file.name}</p>
                      <div className="mt-1 flex items-center gap-2">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-paper">
                          <div
                            className={`h-full rounded-full transition-all ${
                              f.status === "error" ? "bg-danger" : "bg-signal"
                            }`}
                            style={{ width: `${f.progress || (f.status === "pending" ? 0 : 100)}%` }}
                          />
                        </div>
                        <span className="w-14 shrink-0 font-mono text-[10px] text-muted">
                          {formatBytes(f.file.size)}
                        </span>
                      </div>
                    </div>
                    {f.status === "uploading" && <Loader2 size={16} className="animate-spin text-signal" />}
                    {f.status === "done" && <CheckCircle2 size={16} className="text-success" />}
                    {f.status === "error" && <AlertCircle size={16} className="text-danger" />}
                    {f.status === "pending" && (
                      <button onClick={() => removeFile(f.id)} className="text-muted hover:text-danger">
                        <X size={15} />
                      </button>
                    )}
                  </div>

                  {f.status === "pending" && (
                    <input
                      value={f.alt || ""}
                      onChange={(e) => setAlt(f.id, e.target.value)}
                      placeholder="Alt text (optional) — describes this file for accessibility & SEO"
                      maxLength={250}
                      className="mt-2 w-full rounded-md border border-paper-line bg-paper px-2.5 py-1.5 text-xs text-ink placeholder:text-muted/70 focus:border-signal"
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-paper-line px-6 py-4">
          <span className="text-xs text-muted">
            {queue.length ? `${queue.length} file${queue.length > 1 ? "s" : ""} selected` : "No files selected"}
          </span>
          <div className="flex gap-2">
            <button onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button onClick={startUpload} disabled={!queue.length || busy} className="btn-primary disabled:cursor-not-allowed disabled:opacity-50">
              {busy ? <Loader2 size={16} className="animate-spin" /> : <UploadCloud size={16} />}
              Upload {queue.length > 0 ? `(${queue.length})` : ""}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
