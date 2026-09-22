import { useEffect, useState } from "react";
import { X, Mail, Building2, Phone, CalendarClock, Trash2, Save } from "lucide-react";
import { formatDate } from "../../utils/format";

const CURRENCY_SYMBOL = { USD: "$", GBP: "£", CAD: "CA$" };
const STATUSES = ["new", "contacted", "qualified", "closed"];

const money = (n, currency) =>
  `${CURRENCY_SYMBOL[currency] || ""}${Number(n || 0).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;

export function VerdictBadge({ platform, lean }) {
  const label =
    platform === "fo" ? "Finance & Ops"
    : platform === "bc" ? "Business Central"
    : `Overlap · leans ${lean === "fo" ? "F&O" : "BC"}`;
  const cls =
    platform === "fo" ? "bg-danger/10 text-danger"
    : platform === "bc" ? "bg-signal/10 text-signal"
    : "bg-warning/10 text-warning";
  return <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${cls}`}>{label}</span>;
}

export function LeadScoreBadge({ score, routing }) {
  const cls = score >= 70 ? "bg-success/10 text-success" : score >= 40 ? "bg-warning/10 text-warning" : "bg-paper-line text-muted";
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 font-mono text-[10px] ${cls}`} title={routing || ""}>
      {score}
    </span>
  );
}

function Row({ label, children }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2">
      <span className="shrink-0 text-xs text-muted">{label}</span>
      <span className="text-right text-sm font-medium text-ink">{children}</span>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section className="border-t border-paper-line pt-4">
      <h4 className="mb-2 font-mono text-[11px] uppercase tracking-widest text-muted">{title}</h4>
      {children}
    </section>
  );
}

export default function EnquiryDetailModal({ lead, onClose, onSave, onDelete, canManage, canDelete }) {
  const [status, setStatus] = useState(lead.status);
  const [notes, setNotes] = useState(lead.notes || "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setStatus(lead.status);
    setNotes(lead.notes || "");
  }, [lead]);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const dirty = status !== lead.status || notes !== (lead.notes || "");
  const L = lead.labels || {};

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({ status, notes });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex justify-end bg-ink/50 animate-fadeIn" onClick={onClose}>
      <div
        className="flex h-full w-full max-w-xl animate-slideUp flex-col bg-paper-card shadow-pop"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-start justify-between gap-4 border-b border-paper-line px-6 py-5">
          <div className="min-w-0">
            <h3 className="font-display text-lg font-semibold text-ink">{lead.name}</h3>
            <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
              <span className="inline-flex items-center gap-1"><Mail size={12} /> {lead.email}</span>
              {lead.company && <span className="inline-flex items-center gap-1"><Building2 size={12} /> {lead.company}</span>}
              {lead.phone && <span className="inline-flex items-center gap-1"><Phone size={12} /> {lead.phone}</span>}
            </p>
            <p className="mt-1.5 inline-flex items-center gap-1 text-xs text-muted">
              <CalendarClock size={12} /> {formatDate(lead.createdAt)}
            </p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-muted transition-colors hover:bg-paper hover:text-ink">
            <X size={18} />
          </button>
        </header>

        <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
          <div className="rounded-xl bg-ink px-4 py-4 text-paper">
            <p className="font-mono text-[10px] uppercase tracking-widest text-paper/50">Recommendation</p>
            <p className="mt-1 font-display text-lg font-semibold">{lead.verdict}</p>
            <div className="mt-3 grid grid-cols-3 gap-3 border-t border-white/20 pt-3">
              <div>
                <p className="text-[10px] text-paper/55">Routing score</p>
                <p className="font-mono text-base">{lead.routingScore}</p>
              </div>
              <div>
                <p className="text-[10px] text-paper/55">Complexity</p>
                <p className="font-mono text-base">{lead.complexityScore}/100</p>
              </div>
              <div>
                <p className="text-[10px] text-paper/55">Duration</p>
                <p className="font-mono text-base">{lead.minMonths}–{lead.maxMonths}<span className="ml-1 text-[10px] text-paper/45">mo</span></p>
              </div>
            </div>
          </div>

          <Section title="Currently on">
            <Row label="System">{lead.currentSystemLabel || "—"}</Row>
            <Row label="Version">{lead.version || "—"}</Row>
            <Row label="Time on it">{L.years || lead.yearsOnIt || "—"}</Row>
            <Row label="Lifecycle exposure">{lead.lifecycleExposure ? "Yes — out of or nearing end of support" : "No"}</Row>
          </Section>

          <Section title="Shape of the business">
            <Row label="Users">{L.users || "—"}</Row>
            <Row label="Legal entities">{L.entities || "—"}</Row>
            <Row label="Countries">{L.countries || "—"}</Row>
            <Row label="Revenue">{L.revenue || "—"}</Row>
            <Row label="Transactions a month">{L.volume || "—"}</Row>
          </Section>

          {(lead.requirementDetails || []).length > 0 && (
            <Section title="What the business does">
              <ul className="space-y-1.5">
                {lead.requirementDetails.map((r) => (
                  <li key={r.id} className="flex items-start justify-between gap-3 text-sm">
                    <span className="text-ink">{r.label}</span>
                    {r.decisive && (
                      <span className="shrink-0 rounded-full bg-danger/10 px-2 py-0.5 text-[10px] font-medium text-danger">
                        Decides it
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </Section>
          )}

          <Section title="The move">
            <Row label="Customisations">{L.customisations || "—"}</Row>
            <Row label="Integrations">{lead.integrations}</Row>
            <Row label="History to carry">{L.history || "—"}</Row>
            <Row label="Internal IT">{L.it || "—"}</Row>
            {(lead.complexityDrivers || []).length > 0 && (
              <p className="mt-2 text-xs leading-relaxed text-muted">
                Complexity driven by {lead.complexityDrivers.join(", ")}.
              </p>
            )}
          </Section>

          <Section title="Commercials">
            <Row label="Target go-live">{L.golive || "—"}</Row>
            <Row label="Budget">{L.budget || "—"}</Row>
            <Row label="Timeline conflict">{lead.timelineConflict ? "Yes — wants it sooner than the work allows" : "No"}</Row>
            <Row label="Indicative licences">
              {money(lead.annualTotal, lead.currency)} <span className="text-xs text-muted">a year</span>
            </Row>
            <Row label="Billed full users">
              {lead.billedFullUsers}
              {lead.billedFullUsers > lead.fullUsers && (
                <span className="ml-1 text-xs text-muted">(entered {lead.fullUsers}, F&amp;O minimum)</span>
              )}
            </Row>
            {!lead.pricingTrusted && (
              <p className="mt-1 text-xs text-warning">Priced against placeholder rates for {lead.currency}.</p>
            )}
          </Section>

          <Section title="Lead quality">
            <Row label="Score"><LeadScoreBadge score={lead.leadScore} routing={lead.leadRouting} /></Row>
            <Row label="Routing">{lead.leadRouting || "—"}</Row>
          </Section>

          <Section title="Follow-up">
            <label className="mt-1 block font-mono text-[10px] uppercase tracking-widest text-muted">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              disabled={!canManage}
              className="mt-1.5 w-full rounded-lg border border-paper-line bg-paper px-3 py-2 text-sm capitalize text-ink focus:border-signal disabled:opacity-60"
            >
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>

            <label className="mt-3 block font-mono text-[10px] uppercase tracking-widest text-muted">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={!canManage}
              rows={4}
              placeholder="What was agreed, who owns the follow-up…"
              className="mt-1.5 w-full resize-y rounded-lg border border-paper-line bg-paper px-3 py-2 text-sm text-ink focus:border-signal disabled:opacity-60"
            />
          </Section>
        </div>

        <footer className="flex items-center justify-between gap-3 border-t border-paper-line px-6 py-4">
          {canDelete ? (
            <button onClick={onDelete} className="inline-flex items-center gap-1.5 text-sm text-danger hover:underline">
              <Trash2 size={15} /> Delete
            </button>
          ) : <span />}
          {canManage && (
            <button onClick={handleSave} disabled={!dirty || saving} className="btn-primary inline-flex items-center gap-2 disabled:opacity-50">
              <Save size={15} /> {saving ? "Saving…" : "Save"}
            </button>
          )}
        </footer>
      </div>
    </div>
  );
}
