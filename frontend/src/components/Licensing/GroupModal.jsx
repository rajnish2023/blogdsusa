import { useEffect, useState } from "react";
import { X } from "lucide-react";

export default function GroupModal({ group, onClose, onSave }) {
  const isNew = !group?._id;

  const [form, setForm] = useState(() => ({
    name: group?.name || "",
    subtitle: group?.subtitle || "",
    collapsible: !!group?.collapsible,
    active: group?.active !== false,
  }));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    setError("");
    if (!form.name.trim()) return setError("A name is required");
    setSaving(true);
    try {
      await onSave(form);
    } catch (err) {
      setError(err?.response?.data?.message || "Could not save the group");
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/50 p-4 animate-fadeIn" onClick={onClose}>
      <div
        className="w-full max-w-lg animate-scaleIn rounded-2xl bg-paper-card shadow-pop"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-paper-line px-6 py-4">
          <h3 className="font-display text-base font-semibold text-ink">{isNew ? "New group" : "Edit group"}</h3>
          <button onClick={onClose} className="rounded-lg p-1.5 text-muted hover:bg-paper hover:text-ink" aria-label="Close">
            <X size={18} />
          </button>
        </header>

        <div className="space-y-4 px-6 py-5">
          <label className="block">
            <span className="mb-1.5 block text-xs text-muted">Heading</span>
            <input
              autoFocus
              value={form.name}
              maxLength={80}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Core finance &amp; operations"
              className="w-full rounded-lg border border-paper-line bg-paper px-3 py-2 text-sm text-ink focus:border-signal"
            />
            {!isNew && (
              <span className="mt-1 block text-[11px] text-muted">
                Renaming moves every capability in this group across automatically.
              </span>
            )}
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs text-muted">Intro copy — shown under the heading</span>
            <textarea
              value={form.subtitle}
              rows={4}
              maxLength={600}
              onChange={(e) => set("subtitle", e.target.value)}
              placeholder="Leave empty for no intro paragraph."
              className="w-full rounded-lg border border-paper-line bg-paper p-3 text-sm text-ink focus:border-signal"
            />
          </label>

          <label className="flex cursor-pointer items-start gap-2.5">
            <input
              type="checkbox"
              checked={form.collapsible}
              onChange={(e) => set("collapsible", e.target.checked)}
              className="mt-0.5 rounded border-paper-line text-signal focus:ring-signal"
            />
            <span>
              <span className="block text-sm text-ink">Render collapsed</span>
              <span className="block text-xs text-muted">
                Long sections that only apply to some visitors stay tucked behind a “show” link,
                without being removed from the page.
              </span>
            </span>
          </label>

          <label className="flex cursor-pointer items-start gap-2.5">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => set("active", e.target.checked)}
              className="mt-0.5 rounded border-paper-line text-signal focus:ring-signal"
            />
            <span className="text-sm text-ink">Show on the rate card</span>
          </label>

          {error && <p className="text-sm text-danger">{error}</p>}
        </div>

        <footer className="flex justify-end gap-2 border-t border-paper-line px-6 py-4">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={submit} disabled={saving} className="btn-primary disabled:opacity-40">
            {saving ? "Saving…" : isNew ? "Create" : "Save changes"}
          </button>
        </footer>
      </div>
    </div>
  );
}
