import { useEffect, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, Plus, Settings2, LayoutTemplate } from "lucide-react";
import PageCard from "../components/PageBuilder/PageCard";
import CategoryManagerModal from "../components/Blog/CategoryManagerModal";
import ConfirmDialog from "../components/Shared/ConfirmDialog";
import Toast from "../components/Shared/Toast";
import { GallerySkeleton, EmptyState } from "../components/Gallery/GalleryStates";
import { fetchPages, deletePage } from "../api/pageApi";
import { fetchPageCategories, createPageCategory, updatePageCategory, deletePageCategory } from "../api/pageCategoryApi";
import { usePermissions } from "../auth/AuthContext";

export default function PageListPage() {
  const navigate = useNavigate();
  const can = usePermissions();
  const canCreate = can("pages:create");
  const canEdit = can("pages:edit");
  const canDelete = can("pages:delete");

  const [pages, setPages] = useState([]);
  const [categories, setCategories] = useState([]);
  const [counts, setCounts] = useState({ all: 0, draft: 0, published: 0 });
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [category, setCategory] = useState("");

  const [showCategories, setShowCategories] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteCatTarget, setDeleteCatTarget] = useState(null);
  const [toast, setToast] = useState(null);
  const showToast = (message, type = "success") => setToast({ message, type });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [pageData, catData] = await Promise.all([fetchPages({ search, status, category }), fetchPageCategories()]);
      setPages(pageData.items);
      setCounts(pageData.counts);
      setCategories(catData);
    } catch (err) {
      showToast(err?.response?.data?.message || "Failed to load pages", "error");
    } finally {
      setLoading(false);
    }
  }, [search, status, category]);

  useEffect(() => {
    const t = setTimeout(load, search ? 300 : 0);
    return () => clearTimeout(t);
  }, [load, search]);

  const handleDeletePage = async () => {
    if (!deleteTarget) return;
    try {
      await deletePage(deleteTarget._id);
      showToast("Page deleted");
      load();
    } catch (err) {
      showToast(err?.response?.data?.message || "Failed to delete page", "error");
    } finally {
      setDeleteTarget(null);
    }
  };

  const handleDeleteCategory = async () => {
    if (!deleteCatTarget) return;
    try {
      await deletePageCategory(deleteCatTarget._id);
      showToast("Category deleted");
      load();
    } catch (err) {
      showToast(err?.response?.data?.message || "Failed to delete category", "error");
    } finally {
      setDeleteCatTarget(null);
    }
  };

  return (
    <div className="flex h-screen flex-1 flex-col overflow-hidden">
      <header className="border-b border-paper-line bg-paper-card px-8 py-6">
        {/* <p className="font-mono text-xs uppercase tracking-wide text-signal">Module 4</p> */}
        <h1 className="font-display text-2xl font-semibold text-ink">Webpages</h1>
        <p className="mt-1 text-sm text-muted">Build pages visually with sections, columns, and widgets.</p>
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
              placeholder="Search pages..."
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
            <Link to="/pages/new" className="btn-primary whitespace-nowrap">
              <Plus size={16} />
              New page
            </Link>
          )}
        </div>
      </div>

      <main className="flex-1 overflow-y-auto px-8 py-6">
        {loading ? (
          <GallerySkeleton count={9} />
        ) : pages.length === 0 ? (
          <EmptyState
            hasFilters={!!search || !!status || !!category}
            onUploadClick={() => navigate("/pages/new")}
            onClearFilters={() => {
              setSearch("");
              setStatus("");
              setCategory("");
            }}
            canUpload={canCreate}
            icon={LayoutTemplate}
            title="No pages yet"
            description="Build your first webpage with the visual page builder."
            actionLabel="Build your first page"
            filteredTitle="No pages match that search"
            filteredDescription="Try a different keyword, or clear filters to see every page."
          />
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {pages.map((page) => (
              <PageCard key={page._id} page={page} onDelete={setDeleteTarget} canEdit={canEdit} canDelete={canDelete} />
            ))}
          </div>
        )}
      </main>

      {showCategories && (
        <CategoryManagerModal
          categories={categories}
          onClose={() => setShowCategories(false)}
          onCreate={async (form) => {
            await createPageCategory(form);
            load();
          }}
          onUpdate={async (id, form) => {
            await updatePageCategory(id, form);
            load();
          }}
          onDelete={(cat) => setDeleteCatTarget(cat)}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Delete this page?"
          description={`"${deleteTarget.title}" will be permanently deleted.`}
          onConfirm={handleDeletePage}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {deleteCatTarget && (
        <ConfirmDialog
          title="Delete this category?"
          description={`"${deleteCatTarget.name}" will be permanently deleted. Pages using it must be reassigned first.`}
          onConfirm={handleDeleteCategory}
          onCancel={() => setDeleteCatTarget(null)}
        />
      )}

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
