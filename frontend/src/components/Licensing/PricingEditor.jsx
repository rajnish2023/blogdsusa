import { useEffect, useState } from "react";
import { RotateCcw, Save, AlertTriangle } from "lucide-react";
import { TrustBadge } from "./Badges";
import { fetchLicensingPricing, updateLicensingPricing, resetLicensingPricing } from "../../api/licensingApi";

const BC_FIELDS = [
  { key: "essentials", label: "Essentials", hint: "Full user" },
  { key: "premium", label: "Premium", hint: "Full user" },
  { key: "team", label: "Team Members", hint: "Light user" },
  { key: "device", label: "Device", hint: "Shared terminal" },
];

const FO_FIELDS = [
  { key: "base", label: "Finance base", hint: "Full user" },
  { key: "premiumBase", label: "Premium base", hint: "Full user" },
  { key: "attach", label: "Attach", hint: "Supply Chain uplift" },
  { key: "activity", label: "Operations Activity", hint: "Single function" },
  { key: "team", label: "Team Members", hint: "Light user" },
  { key: "device", label: "Operations Device", hint: "Shared terminal" },
];

function RateInput({ symbol, value, onChange, label, hint }) {
  return (
    <label className="flex items-center justify-between gap-3 py-2.5">
      <span className="min-w-0">
        <span className="block text-sm text-ink">{label}</span>
        <span className="block font-mono text-[10px] uppercase tracking-wider text-muted">{hint}</span>
      </span>
      <span className="relative shrink-0">
        <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 font-mono text-xs text-muted">
          {symbol}
        </span>
        <input
          type="number"
          min="0"
          step="0.01"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-32 rounded-lg border border-paper-line bg-paper py-2 pl-8 pr-2.5 text-right font-mono text-sm tabular-nums text-ink focus:border-signal"
        />
      </span>
    </label>
  );
}

export default function PricingEditor({ canEdit, onToast }) {
  const [pricing, setPricing] = useState(null);
  const [currencies, setCurrencies] = useState([]);
  const [active, setActive] = useState("USD");
  const [draft, setDraft] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchLicensingPricing();
      setPricing(data.pricing);
      setCurrencies(data.currencies || []);
      setActive((prev) => (data.pricing[prev] ? prev : data.currencies[0]));
    } catch (err) {
      onToast(err?.response?.data?.message || "Failed to load pricing", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reset the working copy whenever the selected currency (or saved data) changes.
  useEffect(() => {
    if (pricing?.[active]) setDraft(JSON.parse(JSON.stringify(pricing[active])));
  }, [pricing, active]);

  if (loading || !draft) {
    return <div className="px-8 py-10 text-sm text-muted">Loading pricing…</div>;
  }

  const saved = pricing[active];
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);

  const setRate = (group, key, raw) =>
    setDraft((d) => ({ ...d, [group]: { ...d[group], [key]: raw === "" ? "" : Number(raw) } }));

  const invalid = [...BC_FIELDS.map((f) => draft.bc[f.key]), ...FO_FIELDS.map((f) => draft.fo[f.key])].some(
    (v) => v === "" || !Number.isFinite(Number(v)) || Number(v) < 0
  );

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await updateLicensingPricing(active, {
        bc: draft.bc,
        fo: draft.fo,
        symbol: draft.symbol,
        verified: draft.verified,
        trusted: draft.trusted,
        countries: draft.countries,
        isDefault: draft.isDefault,
      });
      setPricing((prev) => ({ ...prev, [active]: { ...prev[active], ...updated } }));
      onToast(`${active} rates saved`);
      // the fallback flag is exclusive, so reload every currency to reflect it
      if (draft.isDefault) await load();
    } catch (err) {
      onToast(err?.response?.data?.message || "Failed to save pricing", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    setSaving(true);
    try {
      const updated = await resetLicensingPricing(active);
      setPricing((prev) => ({ ...prev, [active]: { ...prev[active], ...updated } }));
      onToast(`${active} reset to the catalogue defaults`);
    } catch (err) {
      onToast(err?.response?.data?.message || "Failed to reset pricing", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="px-8 py-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {(currencies.length ? currencies : Object.keys(pricing)).map((c) => (
            <button
              key={c}
              onClick={() => setActive(c)}
              className={`chip font-mono ${
                active === c ? "bg-signal text-white" : "border border-paper-line bg-paper-card text-muted hover:text-ink"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
        <TrustBadge trusted={saved.trusted} verified={saved.verified} />
      </div>

      {!saved.trusted && (
        <div className="mb-5 flex gap-3 rounded-xl border-l-2 border-danger bg-danger/5 p-4">
          <AlertTriangle size={18} className="mt-0.5 shrink-0 text-danger" />
          <p className="text-[13px] leading-relaxed text-ink">
            These {active} rates are placeholders. Replace them from the Microsoft {active === "GBP" ? "UK" : active === "CAD" ? "Canada" : ""} price
            list and tick <em className="not-italic font-semibold">verified</em> below. Do not convert the USD figures — Microsoft
            publishes regional list prices that do not track exchange rates.
          </p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-paper-line bg-paper-card p-5">
          <h3 className="mb-1 font-display text-sm font-semibold text-ink">Business Central</h3>
          <p className="mb-3 text-xs text-muted">Per user, per month.</p>
          <div className="divide-y divide-paper-line">
            {BC_FIELDS.map((f) => (
              <RateInput
                key={f.key}
                symbol={draft.symbol}
                label={f.label}
                hint={f.hint}
                value={draft.bc[f.key]}
                onChange={(v) => setRate("bc", f.key, v)}
              />
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-paper-line bg-paper-card p-5">
          <h3 className="mb-1 font-display text-sm font-semibold text-ink">Finance &amp; Operations</h3>
          <p className="mb-3 text-xs text-muted">Per user, per month.</p>
          <div className="divide-y divide-paper-line">
            {FO_FIELDS.map((f) => (
              <RateInput
                key={f.key}
                symbol={draft.symbol}
                label={f.label}
                hint={f.hint}
                value={draft.fo[f.key]}
                onChange={(v) => setRate("fo", f.key, v)}
              />
            ))}
          </div>
        </section>
      </div>

      <section className="mt-6 rounded-xl border border-paper-line bg-paper-card p-5">
        <h3 className="mb-1 font-display text-sm font-semibold text-ink">Who sees {active}</h3>
        <p className="mb-3 text-xs text-muted">
          Visitors are matched on the country your host reports, falling back to their browser
          language. Whichever currency is marked the fallback catches everyone else.
        </p>
        <label className="block">
          <span className="mb-1.5 block text-xs text-muted">Countries — two-letter codes, comma separated</span>
          <input
            value={(draft.countries || []).join(", ")}
            onChange={(e) =>
              setDraft((d) => ({ ...d, countries: e.target.value.split(/[,\s]+/).filter(Boolean) }))
            }
            placeholder="GB, IE"
            className="w-full rounded-lg border border-paper-line bg-paper px-3 py-2 font-mono text-sm uppercase text-ink focus:border-signal"
          />
        </label>
        <label className="mt-4 flex cursor-pointer items-start gap-2.5">
          <input
            type="checkbox"
            checked={!!draft.isDefault}
            onChange={(e) => setDraft((d) => ({ ...d, isDefault: e.target.checked }))}
            className="mt-0.5 rounded border-paper-line text-signal focus:ring-signal"
          />
          <span>
            <span className="block text-sm font-medium text-ink">Use as the fallback currency</span>
            <span className="block text-xs text-muted">
              Shown to anyone whose country matches no list above. Only one currency can hold this,
              so ticking it here clears it elsewhere.
            </span>
          </span>
        </label>
      </section>

      <section className="mt-6 rounded-xl border border-paper-line bg-paper-card p-5">
        <h3 className="mb-3 font-display text-sm font-semibold text-ink">Governance</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-xs text-muted">Symbol</span>
            <input
              value={draft.symbol}
              maxLength={5}
              onChange={(e) => setDraft((d) => ({ ...d, symbol: e.target.value }))}
              className="w-full rounded-lg border border-paper-line bg-paper px-3 py-2 text-sm text-ink focus:border-signal"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs text-muted">Verified (e.g. “August 2026”)</span>
            <input
              value={draft.verified}
              maxLength={60}
              onChange={(e) => setDraft((d) => ({ ...d, verified: e.target.value }))}
              className="w-full rounded-lg border border-paper-line bg-paper px-3 py-2 text-sm text-ink focus:border-signal"
            />
          </label>
        </div>
        <label className="mt-4 flex cursor-pointer items-start gap-2.5">
          <input
            type="checkbox"
            checked={!!draft.trusted}
            onChange={(e) => setDraft((d) => ({ ...d, trusted: e.target.checked }))}
            className="mt-0.5 rounded border-paper-line text-signal focus:ring-signal"
          />
          <span>
            <span className="block text-sm font-medium text-ink">Checked against the Microsoft price list</span>
            <span className="block text-xs text-muted">
              Until this is ticked the rate card tells visitors the prices are placeholders pending verification.
            </span>
          </span>
        </label>
      </section>

      {canEdit ? (
        <div className="mt-6 flex items-center justify-between gap-3">
          <button onClick={handleReset} disabled={saving} className="btn-secondary">
            <RotateCcw size={15} /> Reset to defaults
          </button>
          <div className="flex items-center gap-3">
            {invalid && <span className="text-xs text-danger">Every rate must be a positive number.</span>}
            <button onClick={handleSave} disabled={!dirty || invalid || saving} className="btn-primary disabled:opacity-40">
              <Save size={15} />
              {saving ? "Saving…" : `Save ${active}`}
            </button>
          </div>
        </div>
      ) : (
        <p className="mt-6 text-xs text-muted">You have read-only access to pricing.</p>
      )}
    </div>
  );
}
