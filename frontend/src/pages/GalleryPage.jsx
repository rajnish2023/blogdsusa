import { useEffect, useMemo, useState, useCallback } from "react";
import { Download, Trash2, X } from "lucide-react";
import GalleryToolbar from "../components/Gallery/GalleryToolbar";
import GalleryGrid from "../components/Gallery/GalleryGrid";
import { GallerySkeleton, EmptyState, ErrorState } from "../components/Gallery/GalleryStates";
import UploadModal from "../components/Gallery/UploadModal";
import PreviewModal from "../components/Gallery/PreviewModal";
import ConfirmDialog from "../components/Shared/ConfirmDialog";
import Toast from "../components/Shared/Toast";
import Pagination from "../components/Shared/Pagination";
import { fetchMedia, uploadMedia, deleteMedia, downloadMedia, bulkDeleteMedia } from "../api/galleryApi";
import { usePermissions } from "../auth/AuthContext";

export default function GalleryPage() {
  const can = usePermissions();
  const canUpload = can("gallery:upload");
  const canDelete = can("gallery:delete");

  const [items, setItems] = useState([]);
  const [counts, setCounts] = useState({ all: 0, image: 0, video: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Pagination states
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const LIMIT = 25;

  const [type, setType] = useState("all");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("newest");

  const [showUpload, setShowUpload] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [toast, setToast] = useState(null);

  // Bulk Selection State
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [pendingBulkDelete, setPendingBulkDelete] = useState(false);

  const showToast = (message, type2 = "success") => setToast({ message, type: type2 });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchMedia({ type, search, sort, page, limit: LIMIT });
      setItems(data.items);
      setCounts(data.counts);
      setTotalPages(data.pages || 1);
      setTotalItems(data.total || 0);
    } catch (err) {
      setError(err?.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  }, [type, search, sort, page]);

  // Reset page and selection on filter change
  useEffect(() => {
    setPage(1);
    setSelectedIds(new Set());
  }, [type, search, sort]);

  useEffect(() => {
    const t = setTimeout(load, search ? 300 : 0);
    return () => clearTimeout(t);
  }, [load, search]);

  const handleUpload = async (files, alts, onProgress) => {
    try {
      await uploadMedia(files, alts, onProgress);
      showToast(`${files.length} file${files.length > 1 ? "s" : ""} uploaded`);
      load();
    } catch (err) {
      showToast(err?.response?.data?.message || "Upload failed", "error");
      throw err;
    }
  };

  const handleCopyLink = (item) => {
    navigator.clipboard.writeText(item.url);
    showToast("Link copied to clipboard");
  };

  const handleDownload = async (item) => {
    try {
      await downloadMedia(item._id, item.originalName);
    } catch (err) {
      showToast("Download failed", "error");
    }
  };

  const handleConfirmDelete = async () => {
    if (!pendingDelete) return;
    try {
      await deleteMedia(pendingDelete._id);
      setItems((prev) => prev.filter((i) => i._id !== pendingDelete._id));
      showToast("File deleted");
      if (previewIndex !== null) setPreviewIndex(null);
    } catch (err) {
      showToast(err?.response?.data?.message || "Delete failed", "error");
    } finally {
      setPendingDelete(null);
    }
  };

  const handleToggleSelect = (item) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(item._id)) next.delete(item._id);
      else next.add(item._id);
      return next;
    });
  };

  const handleBulkDownload = async () => {
    const selectedItems = items.filter(i => selectedIds.has(i._id));
    for (const item of selectedItems) {
      handleDownload(item); // triggers native download sequentially
      // Slight delay to prevent browser from blocking too many simultaneous popups
      await new Promise(res => setTimeout(res, 300)); 
    }
    showToast(`${selectedItems.length} files downloading`);
    setSelectedIds(new Set());
  };

  const handleConfirmBulkDelete = async () => {
    try {
      await bulkDeleteMedia(Array.from(selectedIds));
      showToast(`${selectedIds.size} files deleted`);
      setSelectedIds(new Set());
      load();
    } catch (err) {
      showToast(err?.response?.data?.message || "Bulk delete failed", "error");
    } finally {
      setPendingBulkDelete(false);
    }
  };

  const hasFilters = search.trim().length > 0 || type !== "all";

  return (
    <div className="flex h-screen flex-1 flex-col overflow-hidden">
      <header className="border-b border-paper-line bg-paper-card px-8 py-6">
        <h1 className="font-display text-2xl font-semibold text-ink">Gallery Management</h1>
        <p className="mt-1 text-sm text-muted">Upload, organize, and share images and videos.</p>
      </header>

      <GalleryToolbar
        type={type}
        setType={setType}
        search={search}
        setSearch={setSearch}
        sort={sort}
        setSort={setSort}
        counts={counts}
        onUploadClick={() => setShowUpload(true)}
        canUpload={canUpload}
      />
      
      {/* Select All Row */}
      {items.length > 0 && (
        <div className="px-8 py-2 border-b border-paper-line bg-paper flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm font-medium text-muted cursor-pointer hover:text-ink">
            <input 
              type="checkbox" 
              className="rounded border-paper-line text-signal focus:ring-signal"
              checked={items.length > 0 && selectedIds.size === items.length}
              onChange={(e) => {
                if (e.target.checked) setSelectedIds(new Set(items.map(i => i._id)));
                else setSelectedIds(new Set());
              }}
            />
            Select all on page
          </label>
        </div>
      )}

      <main className="flex-1 overflow-y-auto px-8 py-6">
        {loading ? (
          <GallerySkeleton />
        ) : error ? (
          <ErrorState message={error} onRetry={load} />
        ) : items.length === 0 ? (
          <EmptyState
            hasFilters={hasFilters}
            onUploadClick={() => setShowUpload(true)}
            onClearFilters={() => {
              setSearch("");
              setType("all");
            }}
            canUpload={canUpload}
          />
        ) : (
          <GalleryGrid
            items={items}
            onPreview={(item) => setPreviewIndex(items.findIndex((i) => i._id === item._id))}
            onCopyLink={handleCopyLink}
            onDownload={handleDownload}
            onDelete={canDelete ? (item) => setPendingDelete(item) : undefined}
            selectedIds={selectedIds}
            onToggleSelect={handleToggleSelect}
            selectionMode={selectedIds.size > 0}
          />
        )}
      </main>

      <Pagination
        page={page}
        pages={totalPages}
        total={totalItems}
        limit={LIMIT}
        onPageChange={setPage}
      />

      {showUpload && canUpload && <UploadModal onClose={() => setShowUpload(false)} onUpload={handleUpload} />}

      {previewIndex !== null && (
        <PreviewModal
          items={items}
          index={previewIndex}
          onClose={() => setPreviewIndex(null)}
          onNavigate={setPreviewIndex}
          onCopyLink={handleCopyLink}
          onDownload={handleDownload}
          onDelete={canDelete ? (item) => setPendingDelete(item) : undefined}
        />
      )}

      {pendingDelete && (
        <ConfirmDialog
          title="Delete this file?"
          description={`"${pendingDelete.originalName}" will be permanently removed. This can't be undone.`}
          onConfirm={handleConfirmDelete}
          onCancel={() => setPendingDelete(null)}
        />
      )}

      {pendingBulkDelete && (
        <ConfirmDialog
          title={`Delete ${selectedIds.size} files?`}
          description="These files will be permanently removed. This cannot be undone."
          onConfirm={handleConfirmBulkDelete}
          onCancel={() => setPendingBulkDelete(false)}
        />
      )}

      {/* Floating Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4 rounded-full bg-ink px-6 py-3 shadow-xl text-white z-50 animate-in slide-in-from-bottom-5">
          <span className="text-sm font-medium whitespace-nowrap"><span className="font-bold text-signal">{selectedIds.size}</span> selected</span>
          <div className="h-4 w-px bg-white/20"></div>
          
          <button onClick={handleBulkDownload} className="text-sm font-medium hover:text-signal transition-colors flex items-center gap-1.5 whitespace-nowrap">
            <Download size={14} /> Download
          </button>
          
          {canDelete && (
            <button onClick={() => setPendingBulkDelete(true)} className="text-sm font-medium hover:text-danger transition-colors flex items-center gap-1.5 whitespace-nowrap">
              <Trash2 size={14} /> Delete
            </button>
          )}
          
          <div className="h-4 w-px bg-white/20 ml-2"></div>
          <button onClick={() => setSelectedIds(new Set())} className="ml-1 p-1 hover:bg-white/10 rounded-full transition-colors">
            <X size={16} />
          </button>
        </div>
      )}

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
