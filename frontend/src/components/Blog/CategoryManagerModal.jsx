import { useState } from "react";
import { X, Plus, Pencil, Trash2, Loader2, Check } from "lucide-react";

const COLORS = ["#3355FF", "#FF6A3D", "#16A34A", "#DC2626", "#8B5CF6", "#0EA5E9"];

export default function CategoryManagerModal({ categories, onClose, onCreate, onUpdate, onDelete }) {
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ name: "", description: "", color: COLORS[0] });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const startCreate = () => {
    setEditingId(null);
    setForm({ name: "", description: "", color: COLORS[0] });
    setCreating(true);
  };

  const startEdit = (cat) => {
    setCreating(false);
    setEditingId(cat._id);
    setForm({ name: cat.name, description: cat.description || "", color: cat.color });
  };

  const cancelForm = () => {
    setCreating(false);
    setEditingId(null);
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (editingId) await onUpdate(editingId, form);
      else await onCreate(form);
      cancelForm();
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to save category");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4 animate-fadeIn" onClick={onClose}>
      <div className="flex max-h-[85vh] w-full max-w-lg flex-col animate-slideUp rounded-2xl bg-paper-card shadow-pop" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-paper-line px-6 py-4">
          <h2 className="font-display text-lg font-semibold text-ink">Manage categories</h2>
          <button onClick={onClose} className="rounded-md p-1.5 text-muted hover:bg-paper hover:text-ink">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="space-y-2">
            {categories.map((cat) => (
              <div key={cat._id} className="flex items-center gap-3 rounded-lg border border-paper-line px-3 py-2.5">
                <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: cat.color }} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">{cat.name}</p>
                  <p className="text-xs text-muted">{cat.postCount} post{cat.postCount === 1 ? "" : "s"}</p>
                </div>
                <button onClick={() => startEdit(cat)} className="rounded-md p-1.5 text-muted hover:bg-paper hover:text-ink">
                  <Pencil size={14} />
                </button>
                <button onClick={() => onDelete(cat)} className="rounded-md p-1.5 text-muted hover:bg-danger/5 hover:text-danger">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            {categories.length === 0 && <p className="py-6 text-center text-sm text-muted">No categories yet.</p>}
          </div>

          {creating || editingId ? (
            <form onSubmit={handleSubmit} className="mt-4 space-y-3 rounded-xl border border-paper-line p-4">
              <input
                required
                autoFocus
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Category name"
                className="w-full rounded-lg border border-paper-line bg-paper px-3 py-2 text-sm text-ink focus:border-signal"
              />
              <input
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Description (optional)"
                className="w-full rounded-lg border border-paper-line bg-paper px-3 py-2 text-sm text-ink focus:border-signal"
              />
              <div className="flex items-center gap-2">
                {COLORS.map((c) => (
                  <button
                    type="button"
                    key={c}
                    onClick={() => setForm((f) => ({ ...f, color: c }))}
                    className="flex h-6 w-6 items-center justify-center rounded-full"
                    style={{ backgroundColor: c }}
                  >
                    {form.color === c && <Check size={13} className="text-white" />}
                  </button>
                ))}
              </div>
              {error && <p className="text-xs text-danger">{error}</p>}
              <div className="flex justify-end gap-2">
                <button type="button" onClick={cancelForm} className="btn-secondary py-2 text-xs">
                  Cancel
                </button>
                <button type="submit" disabled={busy} className="btn-primary py-2 text-xs disabled:opacity-60">
                  {busy && <Loader2 size={14} className="animate-spin" />}
                  {editingId ? "Save" : "Create"}
                </button>
              </div>
            </form>
          ) : (
            <button onClick={startCreate} className="btn-secondary mt-4 w-full justify-center">
              <Plus size={15} />
              New category
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
