import { useCallback, useEffect, useState } from "react";
import { Search, Route as RouteIcon, ExternalLink, Inbox, SlidersHorizontal } from "lucide-react";
import { Link } from "react-router-dom";
import Toast from "../components/Shared/Toast";
import ConfirmDialog from "../components/Shared/ConfirmDialog";
import Pagination from "../components/Shared/Pagination";
import EnquiryDetailModal, { VerdictBadge, LeadScoreBadge } from "../components/MigrationTool/EnquiryDetailModal";
import {
  fetchMigrationLeads,
  fetchMigrationStats,
  fetchMigrationLead,
  updateMigrationLead,
  deleteMigrationLead,
  fetchMigrationModel,
} from "../api/migrationToolApi";
import { usePermissions } from "../auth/AuthContext";
import { formatDate } from "../utils/format";

const LIMIT = 20;
const STATUSES = ["new", "contacted", "qualified", "closed"];
const CURRENCY_SYMBOL = { USD: "$", GBP: "£", CAD: "CA$" };

const money = (n, currency) =>
  `${CURRENCY_SYMBOL[currency] || ""}${Number(n || 0).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;

function StatCard({ label, value, sub }) {
  return (
    <div className="rounded-xl border border-paper-line bg-paper-card px-4 py-3.5">
      <p className="font-mono text-[10px] uppercase tracking-widest text-muted">{label}</p>
      <p className="mt-1 font-display text-xl font-semibold text-ink">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-muted">{sub}</p>}
    </div>
  );
}

function StatusBadge({ status }) {
  const cls = {
    new: "bg-signal/10 text-signal",
    contacted: "bg-warning/10 text-warning",
    qualified: "bg-success/10 text-success",
    closed: "bg-paper-line text-muted",
  }[status] || "bg-paper-line text-muted";
  return <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ${cls}`}>{status}</span>;
}

/* The scoring model, read-only. The tool routes on these numbers, so they are
   worth being able to read without opening the source. */
function ScoringModel({ onToast }) {
  const [model, setModel] = useState(null);

  useEffect(() => {
    fetchMigrationModel()
      .then(setModel)
      .catch((err) => onToast(err?.response?.data?.message || "Failed to load the scoring model", "error"));
  }, []);

  if (!model) return <div className="px-8 py-6 text-sm text-muted">Loading…</div>;

  const Table = ({ title, rows, note }) => (
    <section className="mb-8">
      <h3 className="font-display text-sm font-semibold text-ink">{title}</h3>
      {note && <p className="mt-0.5 text-xs text-muted">{note}</p>}
      <div className="mt-2 overflow-hidden rounded-xl border border-paper-line">
        <table className="w-full text-sm">
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-b border-paper-line last:border-0 bg-paper-card">
                <td className="px-4 py-2 text-ink">{r.label}</td>
                <td className="px-4 py-2 text-right font-mono text-xs tabular-nums">
                  <span className={r.w > 0 ? "text-danger" : r.w < 0 ? "text-signal" : "text-muted"}>
                    {r.w > 0 ? `+${r.w}` : r.w}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );

  return (
    <div className="mx-auto max-w-3xl px-8 py-6">
      <div className="mb-6 rounded-xl border border-paper-line bg-paper-card p-4">
        <p className="text-sm text-ink">
          One signed score. Negative points to <strong>Business Central</strong>, positive to{" "}
          <strong>Finance &amp; Operations</strong>. At or below{" "}
          <span className="font-mono">{model.routing.bcAt}</span> the answer is Business Central; at or above{" "}
          <span className="font-mono">{model.routing.foAt}</span> it is Finance &amp; Operations. Between them the
          tool says the answer is genuinely an overlap rather than pretending otherwise.
        </p>
        <p className="mt-2 text-xs text-muted">
          Rates come from the licence tool's rate card, so both tools always quote the same seat price.
        </p>
      </div>

      <Table
        title="Source system"
        note="Which way the current system points, and how hard. Zero means it says nothing on its own."
        rows={model.sources.map((s) => ({
          label: `${s.label}${s.hasLifecycle ? " · has support dates" : ""}`,
          w: s.target === "fo" ? s.weight : -s.weight,
        }))}
      />
      <Table
        title="What the business does"
        note="Requirements only Finance & Operations answers. Premium rows force BC Premium instead."
        rows={model.complexity.map((c) => ({ label: c.label, w: c.w }))}
      />
      {Object.entries(model.bands).map(([key, rows]) => (
        <Table key={key} title={`Band: ${key}`} rows={rows.map((b) => ({ label: b.label, w: b.w }))} />
      ))}
      <Table title="Customisations (migration effort)" rows={model.customisations.map((c) => ({ label: c.label, w: c.w }))} />
      <Table title="History to carry (migration effort)" rows={model.history.map((h) => ({ label: h.label, w: h.w }))} />
      <Table title="Internal IT (migration effort)" rows={model.it.map((i) => ({ label: i.label, w: i.w }))} />
    </div>
  );
}

export default function MigrationToolPage() {
  const can = usePermissions();
  const canManage = can("migration:manage");
  const canDelete = can("migration:delete");

  const [tab, setTab] = useState("enquiries");
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [platform, setPlatform] = useState("");

  const [selected, setSelected] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = "success") => setToast({ message, type });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [leadData, statData] = await Promise.all([
        fetchMigrationLeads({ search, status, platform, page, limit: LIMIT }),
        fetchMigrationStats(),
      ]);
      setItems(leadData.items);
      setPages(leadData.pages || 1);
      setTotal(leadData.total || 0);
      setStats(statData);
    } catch (err) {
      showToast(err?.response?.data?.message || "Failed to load enquiries", "error");
    } finally {
      setLoading(false);
    }
  }, [search, status, platform, page]);

  useEffect(() => { setPage(1); }, [search, status, platform]);

  useEffect(() => {
    if (tab !== "enquiries") return;
    const t = setTimeout(load, search ? 300 : 0);
    return () => clearTimeout(t);
  }, [load, search, tab]);

  const openLead = async (row) => {
    try {
      // the list endpoint has no resolved labels; the detail endpoint does
      setSelected(await fetchMigrationLead(row._id));
    } catch (err) {
      showToast(err?.response?.data?.message || "Failed to open the enquiry", "error");
    }
  };

  const handleSave = async (payload) => {
    try {
      const updated = await updateMigrationLead(selected._id, payload);
      setSelected({ ...selected, ...updated });
      setItems((prev) => prev.map((i) => (i._id === updated._id ? { ...i, ...payload } : i)));
      showToast("Enquiry updated");
    } catch (err) {
      showToast(err?.response?.data?.message || "Failed to update", "error");
    }
  };

  const handleDelete = async () => {
    try {
      await deleteMigrationLead(pendingDelete._id);
      showToast("Enquiry deleted");
      setSelected(null);
      load();
    } catch (err) {
      showToast(err?.response?.data?.message || "Failed to delete", "error");
    } finally {
      setPendingDelete(null);
    }
  };

  const hasFilters = !!search || !!status || !!platform;

  return (
    <div className="flex h-screen flex-1 flex-col overflow-hidden">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-paper-line bg-paper-card px-8 py-6">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">Migration Assessment</h1>
          <p className="mt-1 text-sm text-muted">
            Which Dynamics 365 platform a visitor is moving to, what the move involves, and who to call first.
          </p>
        </div>
        <Link to="/tools/migration-assessment" target="_blank" rel="noreferrer" className="btn-secondary">
          <ExternalLink size={15} /> Open live
        </Link>
      </header>

      <div className="flex items-center gap-1 border-b border-paper-line bg-paper px-8">
        {[
          { key: "enquiries", label: "Enquiries", icon: Inbox },
          { key: "model", label: "Scoring model", icon: SlidersHorizontal },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`-mb-px flex items-center gap-2 border-b-2 px-4 py-3.5 text-sm font-semibold transition-colors ${
              tab === key ? "border-signal text-signal" : "border-transparent text-muted hover:text-ink"
            }`}
          >
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      {tab === "model" ? (
        <main className="flex-1 overflow-y-auto">
          <ScoringModel onToast={showToast} />
        </main>
      ) : (
        <>
          {stats && (
            <div className="grid grid-cols-2 gap-3 border-b border-paper-line bg-paper px-8 py-5 lg:grid-cols-4">
              <StatCard label="Enquiries" value={stats.total} />
              <StatCard label="New" value={stats.byStatus?.new || 0} sub="Not yet contacted" />
              <StatCard
                label="Finance & Ops"
                value={stats.byPlatform?.fo || 0}
                sub={`${stats.byPlatform?.bc || 0} Business Central · ${stats.byPlatform?.overlap || 0} overlap`}
              />
              <StatCard
                label="Most common source"
                value={stats.topSources?.[0]?.label || "—"}
                sub={stats.topSources?.[0] ? `${stats.topSources[0].count} enquiries` : "No submissions yet"}
              />
            </div>
          )}

          <div className="flex flex-col gap-4 border-b border-paper-line bg-paper px-8 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              {[{ key: "", label: "All" }, ...STATUSES.map((s) => ({ key: s, label: s }))].map((f) => (
                <button
                  key={f.key}
                  onClick={() => setStatus(f.key)}
                  className={`chip capitalize ${
                    status === f.key ? "bg-signal text-white" : "border border-paper-line bg-paper-card text-muted hover:text-ink"
                  }`}
                >
                  {f.label}
                </button>
              ))}
              <select
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                className="rounded-full border border-paper-line bg-paper-card px-3 py-1.5 text-sm font-medium text-muted focus:border-signal"
              >
                <option value="">All verdicts</option>
                <option value="bc">Business Central</option>
                <option value="fo">Finance &amp; Operations</option>
                <option value="overlap">Overlap zone</option>
              </select>
            </div>

            <div className="relative w-full max-w-xs">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, email, company, system…"
                className="w-full rounded-lg border border-paper-line bg-paper-card py-2 pl-9 pr-3 text-sm text-ink placeholder:text-muted focus:border-signal"
              />
            </div>
          </div>

          <main className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="space-y-2 px-8 py-6">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-16 animate-pulse rounded-xl bg-paper-line/50" />
                ))}
              </div>
            ) : items.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-8 py-20 text-center">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-signal-soft text-signal">
                  <RouteIcon size={24} />
                </div>
                <h3 className="font-display text-base font-semibold text-ink">
                  {hasFilters ? "No enquiries match those filters" : "No enquiries yet"}
                </h3>
                <p className="mt-1.5 max-w-sm text-sm text-muted">
                  {hasFilters
                    ? "Try widening the search or clearing the status filter."
                    : "Submissions from the migration assessment will land here."}
                </p>
                {hasFilters && (
                  <button onClick={() => { setSearch(""); setStatus(""); setPlatform(""); }} className="btn-secondary mt-5">
                    Clear filters
                  </button>
                )}
              </div>
            ) : (
              <table className="w-full">
                <thead className="sticky top-0 z-10 bg-paper text-left">
                  <tr className="border-b border-paper-line">
                    {["Contact", "Moving from", "Verdict", "Move", "Score", "Status", "Received"].map((h) => (
                      <th key={h} className="px-6 py-3 font-mono text-[10px] uppercase tracking-widest text-muted first:pl-8">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {items.map((l) => (
                    <tr
                      key={l._id}
                      onClick={() => openLead(l)}
                      className="cursor-pointer border-b border-paper-line bg-paper-card transition-colors hover:bg-paper"
                    >
                      <td className="px-6 py-3.5 pl-8">
                        <span className="block text-sm font-medium text-ink">{l.name}</span>
                        <span className="block text-xs text-muted">{l.company || l.email}</span>
                      </td>
                      <td className="px-6 py-3.5">
                        <span className="block text-sm text-ink">{l.currentSystemLabel || "—"}</span>
                        {l.lifecycleExposure && (
                          <span className="block text-[11px] text-warning">Support dates apply</span>
                        )}
                      </td>
                      <td className="px-6 py-3.5"><VerdictBadge platform={l.platform} lean={l.lean} /></td>
                      <td className="px-6 py-3.5 font-mono text-xs text-muted">
                        {l.minMonths}–{l.maxMonths}mo · {l.complexityScore}/100
                        <span className="block text-[11px]">{money(l.annualTotal, l.currency)}/yr</span>
                      </td>
                      <td className="px-6 py-3.5"><LeadScoreBadge score={l.leadScore} routing={l.leadRouting} /></td>
                      <td className="px-6 py-3.5"><StatusBadge status={l.status} /></td>
                      <td className="px-6 py-3.5 text-xs text-muted">{formatDate(l.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </main>

          <Pagination page={page} pages={pages} total={total} limit={LIMIT} onPageChange={setPage} />
        </>
      )}

      {selected && (
        <EnquiryDetailModal
          lead={selected}
          canManage={canManage}
          canDelete={canDelete}
          onClose={() => setSelected(null)}
          onSave={handleSave}
          onDelete={() => setPendingDelete(selected)}
        />
      )}

      {pendingDelete && (
        <ConfirmDialog
          title="Delete this enquiry?"
          description={`${pendingDelete.name}'s migration assessment will be permanently removed. This cannot be undone.`}
          onConfirm={handleDelete}
          onCancel={() => setPendingDelete(null)}
        />
      )}

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
