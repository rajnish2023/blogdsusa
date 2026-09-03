import { useEffect, useState } from "react";
import { X, Mail, Building2, CalendarClock, Trash2, Save, Phone } from "lucide-react";
import { LeadStatusBadge, PlatformBadge, LEAD_STATUSES } from "./Badges";
import { formatDate } from "../../utils/format";

const money = (n, symbol = "") =>
  `${symbol}${Number(n || 0).toLocaleString("en-US", { maximumFractionDigits: 2 })}`;

const CURRENCY_SYMBOL = { USD: "$", GBP: "£", CAD: "CA$" };

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
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setStatus(lead.status);
  }, [lead]);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const symbol = CURRENCY_SYMBOL[lead.currency] || "";
  const dirty = status !== lead.status;

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({ status });
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
            <h3 className="truncate font-display text-lg font-semibold text-ink">{lead.name}</h3>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
              <a href={`mailto:${lead.email}`} className="inline-flex items-center gap-1.5 hover:text-signal">
                <Mail size={12} /> {lead.email}
              </a>
              {lead.phone && (
                <a href={`tel:${lead.phone.replace(/\s+/g, "")}`} className="inline-flex items-center gap-1.5 hover:text-signal">
                  <Phone size={12} /> {lead.phone}
                </a>
              )}
              {lead.company && (
                <span className="inline-flex items-center gap-1.5">
                  <Building2 size={12} /> {lead.company}
                </span>
              )}
            </div>
            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              <PlatformBadge platform={lead.platform} tier={lead.tier} />
              <LeadStatusBadge status={lead.status} />
            </div>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 rounded-lg p-1.5 text-muted hover:bg-paper hover:text-ink"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </header>

        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
          <div className="rounded-xl bg-ink p-5 text-white">
            <p className="font-mono text-[10px] uppercase tracking-widest text-white/50">Licence statement</p>
            <p className="mt-1 text-sm text-white/70">{lead.platform === "fo" ? "Finance & Operations" : `Business Central ${lead.tier === "premium" ? "Premium" : "Essentials"}`}</p>
            <table className="mt-4 w-full text-sm">
              <tbody>
                {lead.lines?.length ? (
                  lead.lines.map((l, i) => (
                    <tr key={`${l.k}-${i}`} className="border-b border-white/10">
                      <td className="py-2 font-mono text-xs text-white/60">{l.qty}×</td>
                      <td className="py-2 pr-2">
                        <span className="block text-[13px] leading-tight">{l.label}</span>
                        <span className="block text-[11px] text-white/40">{l.sub}</span>
                      </td>
                      <td className="py-2 text-right font-mono text-[13px] tabular-nums">{money(l.total, symbol)}</td>
                    </tr>
                  ))
                ) : (
                  <tr><td className="py-2 text-white/50">No user lines</td></tr>
                )}
              </tbody>
            </table>
            <div className="mt-4 flex items-baseline justify-between border-t border-white/30 pt-3">
              <span className="text-xs text-white/60">Per year</span>
              <b className="font-mono text-2xl tabular-nums">{money(lead.annualTotal, symbol)}</b>
            </div>
            <div className="flex items-baseline justify-between pt-1">
              <span className="text-xs text-white/60">Over three years</span>
              <span className="font-mono text-sm tabular-nums text-white/80">{money(lead.threeYearTotal, symbol)}</span>
            </div>
            {!lead.pricingTrusted && (
              <p className="mt-3 text-[11px] leading-snug text-flare">
                Priced on placeholder rates ({lead.currency}). Re-quote before sending anything to the customer.
              </p>
            )}
          </div>

          <Section title="Enquiry">
            <Row label="Submitted">{formatDate(lead.createdAt)}</Row>
            <Row label="Currency">{lead.currency}</Row>
            <Row label="Source">{lead.source || "—"}</Row>
            <Row label="Phone">{lead.phone || "—"}</Row>
            {lead.renewal && (
              <Row label="Renewal">
                <span className="inline-flex items-center gap-1.5 text-flare">
                  <CalendarClock size={13} /> {lead.renewal}
                </span>
              </Row>
            )}
          </Section>

          <Section title={`What they ticked (${lead.capabilityDetails?.length || lead.capabilities?.length || 0})`}>
            {lead.capabilityDetails?.length ? (
              Object.entries(
                lead.capabilityDetails.reduce((acc, c) => {
                  (acc[c.group] ||= []).push(c);
                  return acc;
                }, {})
              ).map(([group, items]) => (
                <div key={group} className="mb-3 last:mb-0">
                  <p className="mb-1 font-mono text-[10px] uppercase tracking-wider text-muted">{group}</p>
                  <ul className="space-y-1">
                    {items.map((c) => (
                      <li key={c.id} className="flex items-start justify-between gap-3">
                        <span className="text-sm text-ink">
                          {c.label}
                          {c.note && <span className="block text-xs text-muted">{c.note}</span>}
                        </span>
                        <span
                          className={`mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                            c.tier === "premium"
                              ? "bg-signal-soft text-signal"
                              : c.tier === "addon"
                              ? "bg-success/10 text-success"
                              : c.tier === "beyond"
                              ? "bg-danger/10 text-danger"
                              : c.missing
                              ? "bg-flare/10 text-flare"
                              : "bg-ink/10 text-muted"
                          }`}
                        >
                          {c.missing ? "removed" : c.tier}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))
            ) : lead.capabilities?.length ? (
              <p className="text-sm text-muted">{lead.capabilities.join(", ")}</p>
            ) : (
              <p className="text-sm text-muted">Nothing selected.</p>
            )}
          </Section>

          <Section title="Shape of the business">
            <Row label="Full users">{lead.fullUsers}</Row>
            <Row label="Team Members">{lead.teamUsers}</Row>
            <Row label="Device">{lead.deviceUsers}</Row>
            {lead.activityUsers > 0 && <Row label="Operations Activity">{lead.activityUsers}</Row>}
            <Row label="Legal entities">{lead.entities}</Row>
            <Row label="Countries">{lead.countries}</Row>
            <Row label="Revenue band">{lead.revenueBand}</Row>
          </Section>

          {lead.premiumDrivers?.length > 0 && (
            <Section title="Premium drivers">
              <ul className="space-y-1 text-sm text-ink">
                {lead.premiumDrivers.map((d) => <li key={d}>· {d}</li>)}
              </ul>
            </Section>
          )}

          {lead.escalationDrivers?.length > 0 && (
            <Section title="Escalation drivers">
              <ul className="space-y-1 text-sm text-ink">
                {lead.escalationDrivers.map((d) => <li key={d}>· {d}</li>)}
              </ul>
            </Section>
          )}

          {lead.applicationsRequired?.length > 0 && (
            <Section title="Applications required">
              <ul className="space-y-1 text-sm text-ink">
                {lead.applicationsRequired.map((d) => <li key={d}>· {d}</li>)}
              </ul>
            </Section>
          )}

          {lead.extensionsRequired?.length > 0 && (
            <Section title="Quoted separately">
              <ul className="space-y-1 text-sm text-ink">
                {lead.extensionsRequired.map((d) => <li key={d}>· {d}</li>)}
              </ul>
            </Section>
          )}

          {canManage && (
            <Section title="Status">
              <div className="flex flex-wrap gap-2">
                {LEAD_STATUSES.map((s) => (
                  <button
                    key={s}
                    onClick={() => setStatus(s)}
                    className={`chip capitalize ${
                      status === s
                        ? "bg-signal text-white"
                        : "border border-paper-line bg-paper-card text-muted hover:text-ink"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </Section>
          )}
        </div>

        <footer className="flex items-center justify-between gap-3 border-t border-paper-line px-6 py-4">
          {canDelete ? (
            <button
              onClick={onDelete}
              className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-danger hover:bg-danger/10"
            >
              <Trash2 size={15} /> Delete
            </button>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="btn-secondary">Close</button>
            {canManage && (
              <button onClick={handleSave} disabled={!dirty || saving} className="btn-primary disabled:opacity-40">
                <Save size={15} />
                {saving ? "Saving…" : "Save"}
              </button>
            )}
          </div>
        </footer>
      </div>
    </div>
  );
}
