import { useEffect, useState } from "react";
import { X, Loader2, Plus, Trash2 } from "lucide-react";
import { fetchEstimatorCurrencies } from "../../api/estimatorApi";

/* Create / rename an estimator. Laravel split this across a create screen and
   an "add service" screen; both fit in one dialog here. */

export default function EstimatorModal({ estimator, onSave, onClose, onToast }) {
  const isEdit = Boolean(estimator);

  const [name, setName] = useState(estimator?.estimator_name || "");
  const [currency, setCurrency] = useState(estimator?.currency_id ?? "");
  const [baseCost, setBaseCost] = useState(estimator?.base_cost ?? "0");
  const [status, setStatus] = useState(estimator?.status ?? "1");
  const [services, setServices] = useState(isEdit ? [] : [""]);
  const [currencies, setCurrencies] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchEstimatorCurrencies()
      .then((list) => {
        setCurrencies(list);
        // Default to the first active currency so the form is valid on open.
        if (!isEdit && list.length && currency === "") setCurrency(list[0].id);
      })
      .catch(() => onToast?.("Could not load currencies", "error"));
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return onToast?.("Give the estimator a name", "error");
    if (currency === "") return onToast?.("Pick a currency", "error");

    setSaving(true);
    try {
      await onSave({
        estimator_name: name.trim(),
        currency: Number(currency),
        base_cost: String(baseCost ?? "0"),
        status,
        ...(isEdit ? {} : { service_names: services.map((s) => s.trim()).filter(Boolean) }),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/50 p-4 animate-fadeIn" onClick={onClose}>
      <form
        onSubmit={submit}
        className="w-full max-w-md animate-scaleIn rounded-2xl bg-paper-card p-6 shadow-pop"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-start justify-between">
          <h3 className="font-display text-base font-semibold text-ink">
            {isEdit ? "Edit estimator" : "New estimator"}
          </h3>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-muted transition-colors hover:bg-paper hover:text-ink">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="font-mono text-[10px] uppercase tracking-widest text-muted">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              placeholder="Business Central Pricing Estimator"
              className="mt-1.5 w-full rounded-lg border border-paper-line bg-paper px-3 py-2 text-sm text-ink outline-none focus:border-ink"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-mono text-[10px] uppercase tracking-widest text-muted">Currency</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-paper-line bg-paper px-3 py-2 text-sm text-ink outline-none focus:border-ink"
              >
                {currencies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.symbol})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="font-mono text-[10px] uppercase tracking-widest text-muted">Base cost</label>
              <input
                value={baseCost}
                onChange={(e) => setBaseCost(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-paper-line bg-paper px-3 py-2 text-sm text-ink outline-none focus:border-ink"
              />
            </div>
          </div>

          <div>
            <label className="font-mono text-[10px] uppercase tracking-widest text-muted">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-paper-line bg-paper px-3 py-2 text-sm text-ink outline-none focus:border-ink"
            >
              <option value="1">Active — served by the public API</option>
              <option value="0">Draft — hidden from the public API</option>
            </select>
          </div>

          {!isEdit && (
            <div>
              <label className="font-mono text-[10px] uppercase tracking-widest text-muted">Services</label>
              <div className="mt-1.5 space-y-2">
                {services.map((s, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <input
                      value={s}
                      onChange={(e) => setServices(services.map((v, j) => (j === i ? e.target.value : v)))}
                      placeholder="Dynamics 365 Business Central"
                      className="w-full rounded-lg border border-paper-line bg-paper px-3 py-2 text-sm text-ink outline-none focus:border-ink"
                    />
                    <button
                      type="button"
                      onClick={() => setServices(services.filter((_, j) => j !== i))}
                      disabled={services.length === 1}
                      className="rounded-lg p-2 text-muted transition-colors hover:bg-danger/10 hover:text-danger disabled:opacity-30"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setServices([...services, ""])}
                className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-muted transition-colors hover:text-ink"
              >
                <Plus size={13} /> Add service
              </button>
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button type="submit" disabled={saving} className="btn-primary inline-flex items-center gap-2 disabled:opacity-50">
            {saving && <Loader2 size={15} className="animate-spin" />}
            {isEdit ? "Save changes" : "Create estimator"}
          </button>
        </div>
      </form>
    </div>
  );
}
