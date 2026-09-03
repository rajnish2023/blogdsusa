import { useState } from "react";
import { X, Loader2, Check } from "lucide-react";

export default function RoleFormModal({ role, allPermissions, onClose, onSubmit }) {
  const isEdit = !!role;
  const [name, setName] = useState(role?.name || "");
  const [description, setDescription] = useState(role?.description || "");
  const [selected, setSelected] = useState(new Set(role?.permissions || []));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const grouped = allPermissions.reduce((acc, p) => {
    acc[p.module] = acc[p.module] || [];
    acc[p.module].push(p);
    return acc;
  }, {});

  const toggle = (key) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const toggleModule = (perms, allOn) => {
    setSelected((prev) => {
      const next = new Set(prev);
      perms.forEach((p) => (allOn ? next.delete(p.key) : next.add(p.key)));
      return next;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await onSubmit({ name, description, permissions: Array.from(selected) });
      onClose();
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to save role");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4 animate-fadeIn" onClick={onClose}>
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col animate-slideUp rounded-2xl bg-paper-card shadow-pop" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-paper-line px-6 py-4">
          <h2 className="font-display text-lg font-semibold text-ink">{isEdit ? "Edit role" : "Create role"}</h2>
          <button onClick={onClose} className="rounded-md p-1.5 text-muted hover:bg-paper hover:text-ink">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6 py-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted">Role name</label>
                <input
                  required
                  disabled={role?.isSystem}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-lg border border-paper-line bg-paper px-3 py-2.5 text-sm text-ink focus:border-signal disabled:opacity-60"
                  placeholder="Content Manager"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted">Description</label>
                <input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-lg border border-paper-line bg-paper px-3 py-2.5 text-sm text-ink focus:border-signal"
                  placeholder="What this role is for"
                />
              </div>
            </div>

            <p className="mb-2 mt-6 text-xs font-medium uppercase tracking-wide text-muted">Permissions</p>
            <div className="space-y-3">
              {Object.entries(grouped).map(([module, perms]) => {
                const allOn = perms.every((p) => selected.has(p.key));
                return (
                  <div key={module} className="rounded-xl border border-paper-line">
                    <button
                      type="button"
                      onClick={() => toggleModule(perms, allOn)}
                      className="flex w-full items-center justify-between rounded-t-xl bg-paper px-4 py-2.5 text-left"
                    >
                      <span className="text-sm font-semibold text-ink">{module}</span>
                      <span className="text-xs font-medium text-signal">{allOn ? "Clear all" : "Select all"}</span>
                    </button>
                    <div className="grid grid-cols-2 gap-1 p-3 sm:grid-cols-3">
                      {perms.map((p) => {
                        const active = selected.has(p.key);
                        return (
                          <button
                            type="button"
                            key={p.key}
                            onClick={() => toggle(p.key)}
                            title={p.description}
                            className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-xs font-medium transition-colors ${
                              active ? "border-signal bg-signal-soft text-signal" : "border-paper-line text-muted hover:border-ink/20"
                            }`}
                          >
                            <span
                              className={`flex h-4 w-4 shrink-0 items-center justify-center rounded ${
                                active ? "bg-signal text-white" : "border border-paper-line"
                              }`}
                            >
                              {active && <Check size={11} />}
                            </span>
                            {p.action}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {error && <p className="mt-4 rounded-lg bg-danger/10 px-3 py-2 text-xs font-medium text-danger">{error}</p>}
          </div>

          <div className="flex justify-end gap-2 border-t border-paper-line px-6 py-4">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="btn-primary disabled:opacity-60">
              {submitting && <Loader2 size={16} className="animate-spin" />}
              {isEdit ? "Save changes" : "Create role"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
