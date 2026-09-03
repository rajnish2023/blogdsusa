import { useEffect, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, Plus, Settings2, FileText, Download, Trash2, X } from "lucide-react";
import BlogCard from "../components/Blog/BlogCard";
import CategoryManagerModal from "../components/Blog/CategoryManagerModal";
import ConfirmDialog from "../components/Shared/ConfirmDialog";
import Toast from "../components/Shared/Toast";
import { GallerySkeleton, EmptyState } from "../components/Gallery/GalleryStates";
import Pagination from "../components/Shared/Pagination";
import { fetchBlogs, deleteBlog, bulkDeleteBlogs, bulkExportBlogs } from "../api/blogApi";
import { fetchCategories, createCategory, updateCategory, deleteCategory } from "../api/categoryApi";
import { usePermissions } from "../auth/AuthContext";

export default function BlogListPage() {
  const navigate = useNavigate();
  const can = usePermissions();
  const canCreate = can("blog:create");
  const canEdit = can("blog:edit");
  const canDelete = can("blog:delete");

  const [posts, setPosts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [counts, setCounts] = useState({ all: 0, draft: 0, published: 0 });
  const [loading, setLoading] = useState(true);

  // Pagination states
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalPosts, setTotalPosts] = useState(0);
  const LIMIT = 12;

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [category, setCategory] = useState("");

  const [showCategories, setShowCategories] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteCatTarget, setDeleteCatTarget] = useState(null);
  const [toast, setToast] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [pendingBulkDelete, setPendingBulkDelete] = useState(false);

  const showToast = (message, type = "success") => setToast({ message, type });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [blogData, catData] = await Promise.all([
        fetchBlogs({ search, status, category, page, limit: LIMIT }),
        fetchCategories(),
      ]);
      setPosts(blogData.items);
      setCounts(blogData.counts);
      setTotalPages(blogData.pages || 1);
      setTotalPosts(blogData.total || 0);
      setCategories(catData);
    } catch (err) {
      showToast(err?.response?.data?.message || "Failed to load posts", "error");
    } finally {
      setLoading(false);
    }
  }, [search, status, category, page]);

  // Reset page to 1 on filter change
  useEffect(() => {
    setPage(1);
    setSelectedIds(new Set());
  }, [search, status, category]);

  useEffect(() => {
    const t = setTimeout(load, search ? 300 : 0);
    return () => clearTimeout(t);
  }, [load, search]);

  const handleDeletePost = async () => {
    if (!deleteTarget) return;
    try {
      await deleteBlog(deleteTarget._id);
      showToast("Post deleted");
      load();
    } catch (err) {
      showToast(err?.response?.data?.message || "Failed to delete post", "error");
    } finally {
      setDeleteTarget(null);
    }
  };

  const handleDeleteCategory = async () => {
    if (!deleteCatTarget) return;
    try {
      await deleteCategory(deleteCatTarget._id);
      showToast("Category deleted");
      load();
    } catch (err) {
      showToast(err?.response?.data?.message || "Failed to delete category", "error");
    } finally {
      setDeleteCatTarget(null);
    }
  };

  const handleToggleSelect = (post) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(post._id)) next.delete(post._id);
      else next.add(post._id);
      return next;
    });
  };

  const handleBulkExport = async () => {
    try {
      await bulkExportBlogs(Array.from(selectedIds));
      showToast(`${selectedIds.size} blogs exported to JSON`);
      setSelectedIds(new Set());
    } catch (err) {
      showToast("Failed to export blogs", "error");
    }
  };

  const handleConfirmBulkDelete = async () => {
    try {
      await bulkDeleteBlogs(Array.from(selectedIds));
      showToast(`${selectedIds.size} blogs deleted`);
      setSelectedIds(new Set());
      load();
    } catch (err) {
      showToast("Failed to bulk delete blogs", "error");
    } finally {
      setPendingBulkDelete(false);
    }
  };

  return (
    <div className="flex h-screen flex-1 flex-col overflow-hidden">
      <header className="border-b border-paper-line bg-paper-card px-8 py-6">
         
        <h1 className="font-display text-2xl font-semibold text-ink">Blog Management</h1>
        <p className="mt-1 text-sm text-muted">Write, categorize, and optimize posts for search.</p>
      </header>

      <div className="flex flex-col gap-4 border-b border-paper-line bg-paper px-8 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {[
            { key: "", label: "All", count: counts.all },
            { key: "published", label: "Published", count: counts.published },
            { key: "draft", label: "Draft", count: counts.draft },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setStatus(f.key)}
              className={`chip ${status === f.key ? "bg-signal text-white" : "border border-paper-line bg-paper-card text-muted hover:text-ink"}`}
            >
              {f.label}
              <span className={`font-mono text-[10px] ${status === f.key ? "text-white/70" : "text-muted/70"}`}>{f.count}</span>
            </button>
          ))}
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="rounded-full border border-paper-line bg-paper-card px-3 py-1.5 text-sm font-medium text-muted focus:border-signal"
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-1 items-center gap-3 sm:justify-end">
          <div className="relative w-full max-w-xs">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search posts..."
              className="w-full rounded-lg border border-paper-line bg-paper-card py-2 pl-9 pr-3 text-sm text-ink placeholder:text-muted focus:border-signal"
            />
          </div>
          {canEdit && (
            <button onClick={() => setShowCategories(true)} className="btn-secondary whitespace-nowrap">
              <Settings2 size={16} />
              Categories
            </button>
          )}
          {canCreate && (
            <Link to="/blog/new" className="btn-primary whitespace-nowrap">
              <Plus size={16} />
              New post
            </Link>
          )}
        </div>
      </div>

      {/* Select All Row */}
      {posts.length > 0 && (
        <div className="px-8 py-2 border-b border-paper-line bg-paper flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm font-medium text-muted cursor-pointer hover:text-ink">
            <input 
              type="checkbox" 
              className="rounded border-paper-line text-signal focus:ring-signal"
              checked={posts.length > 0 && selectedIds.size === posts.length}
              onChange={(e) => {
                if (e.target.checked) setSelectedIds(new Set(posts.map(p => p._id)));
                else setSelectedIds(new Set());
              }}
            />
            Select all on page
          </label>
        </div>
      )}

      <main className="flex-1 overflow-y-auto px-8 py-6">
        {loading ? (
          <GallerySkeleton count={9} />
        ) : posts.length === 0 ? (
          <EmptyState
            hasFilters={!!search || !!status || !!category}
            onUploadClick={() => navigate("/blog/new")}
            onClearFilters={() => {
              setSearch("");
              setStatus("");
              setCategory("");
            }}
            canUpload={canCreate}
            icon={FileText}
            title="No posts yet"
            description="Write your first post to start building your blog."
            actionLabel="Write your first post"
            filteredTitle="No posts match that search"
            filteredDescription="Try a different keyword, or clear filters to see every post."
          />
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {posts.map((post) => (
              <BlogCard 
                key={post._id} 
                post={post} 
                onDelete={setDeleteTarget} 
                canEdit={canEdit} 
                canDelete={canDelete} 
                isSelected={selectedIds.has(post._id)}
                onToggleSelect={handleToggleSelect}
                selectionMode={selectedIds.size > 0}
              />
            ))}
          </div>
        )}
      </main>

      <Pagination
        page={page}
        pages={totalPages}
        total={totalPosts}
        limit={LIMIT}
        onPageChange={setPage}
      />

      {showCategories && (
        <CategoryManagerModal
          categories={categories}
          onClose={() => setShowCategories(false)}
          onCreate={async (form) => {
            await createCategory(form);
            load();
          }}
          onUpdate={async (id, form) => {
            await updateCategory(id, form);
            load();
          }}
          onDelete={(cat) => setDeleteCatTarget(cat)}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Delete this post?"
          description={`"${deleteTarget.title}" will be permanently deleted.`}
          onConfirm={handleDeletePost}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {deleteCatTarget && (
        <ConfirmDialog
          title="Delete this category?"
          description={`"${deleteCatTarget.name}" will be permanently deleted. Posts using it must be reassigned first.`}
          onConfirm={handleDeleteCategory}
          onCancel={() => setDeleteCatTarget(null)}
        />
      )}

      {pendingBulkDelete && (
        <ConfirmDialog
          title={`Delete ${selectedIds.size} blogs?`}
          description="These blogs will be permanently removed. This cannot be undone."
          onConfirm={handleConfirmBulkDelete}
          onCancel={() => setPendingBulkDelete(false)}
        />
      )}

      {/* Floating Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4 rounded-full bg-ink px-6 py-3 shadow-xl text-white z-50 animate-in slide-in-from-bottom-5">
          <span className="text-sm font-medium whitespace-nowrap"><span className="font-bold text-signal">{selectedIds.size}</span> selected</span>
          <div className="h-4 w-px bg-white/20"></div>
          
          <button onClick={handleBulkExport} className="text-sm font-medium hover:text-signal transition-colors flex items-center gap-1.5 whitespace-nowrap">
            <Download size={14} /> Export JSON
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
