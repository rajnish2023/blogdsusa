import { useEffect, useState } from "react";
import { X } from "lucide-react";

const TIERS = [
  { value: "essentials", label: "Essentials", hint: "Included in Business Central Essentials" },
  { value: "premium", label: "Premium", hint: "Forces BC Premium for every full user" },
  { value: "addon", label: "Add-On", hint: "Separate subscription, quoted separately" },
  { value: "beyond", label: "Finance & Ops", hint: "Escalates the answer to Finance & Operations" },
];

const APPS = [
  { value: "finance", label: "Dynamics 365 Finance" },
  { value: "scm", label: "Supply Chain Management" },
  { value: "commerce", label: "Dynamics 365 Commerce" },
  { value: "hr", label: "Dynamics 365 Human Resources" },
];

const slugify = (s) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 40);

export default function CapabilityModal({ capability, groups, onClose, onSave }) {
  const isNew = !capability?._id;

  const [form, setForm] = useState(() => ({
    capId: capability?.capId || "",
    label: capability?.label || "",
    note: capability?.note || "",
    group: capability?.group || groups[0]?.name || "",
    tier: capability?.tier || "essentials",
    fo: capability?.fo || "",
    app: capability?.app || "",
    forcesScmAttach: !!capability?.forcesScmAttach,
    isWarehouseExtension: !!capability?.isWarehouseExtension,
    active: capability?.active !== false,
  }));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [idTouched, setIdTouched] = useState(!isNew);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  // Derive the id from the label until the user edits it themselves.
  const onLabelChange = (v) => {
    setForm((f) => ({ ...f, label: v, ...(isNew && !idTouched ? { capId: slugify(v) } : {}) }));
  };

  const isBeyond = form.tier === "beyond";

  const submit = async () => {
    setError("");
    if (!form.label.trim()) return setError("A label is required");
    if (!form.capId.trim()) return setError("An id is required");
    if (!/^[a-z0-9_]+$/.test(form.capId)) return setError("Id may use lowercase letters, numbers and underscores only");
    if (!form.group.trim()) return setError("Pick a group");
    if (isBeyond && !form.app) return setError("A Finance & Ops capability needs an application");

    setSaving(true);
    try {
      await onSave({ ...form, app: form.app || null, fo: isBeyond ? form.fo : "" });
    } catch (err) {
      setError(err?.response?.data?.message || "Could not save the capability");
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/50 p-4 animate-fadeIn" onClick={onClose}>
      <div
        className="flex max-h-[90vh] w-full max-w-lg animate-scaleIn flex-col rounded-2xl bg-paper-card shadow-pop"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-paper-line px-6 py-4">
          <h3 className="font-display text-base font-semibold text-ink">
            {isNew ? "New capability" : "Edit capability"}
          </h3>
          <button onClick={onClose} className="rounded-lg p-1.5 text-muted hover:bg-paper hover:text-ink" aria-label="Close">
            <X size={18} />
          </button>
        </header>

        <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
          <label className="block">
            <span className="mb-1.5 block text-xs text-muted">Label — the line the visitor reads</span>
            <input
              autoFocus
              value={form.label}
              maxLength={160}
              onChange={(e) => onLabelChange(e.target.value)}
              placeholder="Financial management and accounting"
              className="w-full rounded-lg border border-paper-line bg-paper px-3 py-2 text-sm text-ink focus:border-signal"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs text-muted">Note — the grey sub-line</span>
            <input
              value={form.note}
              maxLength={300}
              onChange={(e) => set("note", e.target.value)}
              placeholder="GL, AP, AR, bank reconciliation, VAT/sales tax"
              className="w-full rounded-lg border border-paper-line bg-paper px-3 py-2 text-sm text-ink focus:border-signal"
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-xs text-muted">Group</span>
              <select
                value={form.group}
                onChange={(e) => set("group", e.target.value)}
                className="w-full rounded-lg border border-paper-line bg-paper px-3 py-2 text-sm text-ink focus:border-signal"
              >
                {groups.map((g) => (
                  <option key={g._id} value={g.name}>{g.name}</option>
                ))}
                {!groups.some((g) => g.name === form.group) && form.group && (
                  <option value={form.group}>{form.group}</option>
                )}
              </select>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs text-muted">
                Id {isNew && <span className="text-muted/70">— auto-filled</span>}
              </span>
              <input
                value={form.capId}
                disabled={!isNew}
                maxLength={40}
                onChange={(e) => { setIdTouched(true); set("capId", e.target.value.toLowerCase()); }}
                className="w-full rounded-lg border border-paper-line bg-paper px-3 py-2 font-mono text-sm text-ink focus:border-signal disabled:opacity-60"
              />
            </label>
          </div>
          {!isNew && (
            <p className="-mt-2 text-[11px] text-muted">
              The id is fixed after creation — stored enquiries reference it.
            </p>
          )}

          <div>
            <span className="mb-2 block text-xs text-muted">Tier — what this does to the quote</span>
            <div className="space-y-1.5">
              {TIERS.map((t) => (
                <label
                  key={t.value}
                  className={`flex cursor-pointer items-start gap-2.5 rounded-lg border p-2.5 transition-colors ${
                    form.tier === t.value ? "border-signal bg-signal-soft" : "border-paper-line hover:bg-paper"
                  }`}
                >
                  <input
                    type="radio"
                    name="tier"
                    checked={form.tier === t.value}
                    onChange={() => set("tier", t.value)}
                    className="mt-0.5 text-signal focus:ring-signal"
                  />
                  <span>
                    <span className="block text-sm font-medium text-ink">{t.label}</span>
                    <span className="block text-xs text-muted">{t.hint}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>

          {isBeyond && (
            <div className="grid gap-4 rounded-lg border border-paper-line bg-paper p-4 sm:grid-cols-2">
              <label className="block sm:col-span-2">
                <span className="mb-1.5 block text-xs text-muted">Application it needs</span>
                <select
                  value={form.app}
                  onChange={(e) => set("app", e.target.value)}
                  className="w-full rounded-lg border border-paper-line bg-paper-card px-3 py-2 text-sm text-ink focus:border-signal"
                >
                  <option value="">Choose an application…</option>
                  {APPS.map((a) => (
                    <option key={a.value} value={a.value}>{a.label}</option>
                  ))}
                </select>
              </label>
              <label className="block sm:col-span-2">
                <span className="mb-1.5 block text-xs text-muted">Module it maps to</span>
                <input
                  value={form.fo}
                  maxLength={120}
                  onChange={(e) => set("fo", e.target.value)}
                  placeholder="Warehouse management (WMS)"
                  className="w-full rounded-lg border border-paper-line bg-paper-card px-3 py-2 text-sm text-ink focus:border-signal"
                />
              </label>
            </div>
          )}

          <div className="space-y-2 border-t border-paper-line pt-4">
            <span className="block text-xs text-muted">Engine behaviour</span>
            <label className="flex cursor-pointer items-start gap-2.5">
              <input
                type="checkbox"
                checked={form.forcesScmAttach}
                onChange={(e) => set("forcesScmAttach", e.target.checked)}
                className="mt-0.5 rounded border-paper-line text-signal focus:ring-signal"
              />
              <span>
                <span className="block text-sm text-ink">Forces the Supply Chain attach</span>
                <span className="block text-xs text-muted">
                  On a Finance &amp; Operations quote, adds the attach rate to every full user.
                </span>
              </span>
            </label>
            <label className="flex cursor-pointer items-start gap-2.5">
              <input
                type="checkbox"
                checked={form.isWarehouseExtension}
                onChange={(e) => set("isWarehouseExtension", e.target.checked)}
                className="mt-0.5 rounded border-paper-line text-signal focus:ring-signal"
              />
              <span>
                <span className="block text-sm text-ink">Counts as a warehouse extension</span>
                <span className="block text-xs text-muted">
                  Triggers the “you may not need Finance &amp; Operations” advice alongside advanced warehousing.
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
              <span>
                <span className="block text-sm text-ink">Show on the rate card</span>
                <span className="block text-xs text-muted">Untick to retire it without losing enquiry history.</span>
              </span>
            </label>
          </div>

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
