import { useCallback, useEffect, useState } from "react";
import { Search, Calculator, ExternalLink, Inbox, Tags, Layers, Type } from "lucide-react";
import { Link } from "react-router-dom";
import Toast from "../components/Shared/Toast";
import ConfirmDialog from "../components/Shared/ConfirmDialog";
import Pagination from "../components/Shared/Pagination";
import EnquiryDetailModal from "../components/Licensing/EnquiryDetailModal";
import PricingEditor from "../components/Licensing/PricingEditor";
import CatalogueEditor from "../components/Licensing/CatalogueEditor";
import ContentEditor from "../components/Licensing/ContentEditor";
import { LeadStatusBadge, PlatformBadge, LEAD_STATUSES } from "../components/Licensing/Badges";
import {
  fetchLicensingLeads,
  fetchLicensingStats,
  fetchLicensingLead,
  updateLicensingLead,
  deleteLicensingLead,
} from "../api/licensingApi";
import { usePermissions } from "../auth/AuthContext";
import { formatDate } from "../utils/format";

const LIMIT = 20;
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

export default function LicensingPage() {
  const can = usePermissions();
  const canManage = can("licensing:manage");
  const canDelete = can("licensing:delete");
  const canPricing = can("licensing:pricing");
  const canCatalogue = can("licensing:catalogue");

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
        fetchLicensingLeads({ search, status, platform, page, limit: LIMIT }),
        fetchLicensingStats(),
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

  useEffect(() => {
    setPage(1);
  }, [search, status, platform]);

  useEffect(() => {
    if (tab !== "enquiries") return;
    const t = setTimeout(load, search ? 300 : 0);
    return () => clearTimeout(t);
  }, [load, search, tab]);

  const openLead = async (row) => {
    try {
      // the list endpoint omits lines to stay light
      setSelected(await fetchLicensingLead(row._id));
    } catch (err) {
      showToast(err?.response?.data?.message || "Failed to open the enquiry", "error");
    }
  };

  const handleSave = async (payload) => {
    try {
      const updated = await updateLicensingLead(selected._id, payload);
      setSelected(updated);
      setItems((prev) => prev.map((i) => (i._id === updated._id ? { ...i, ...payload } : i)));
      showToast("Enquiry updated");
    } catch (err) {
      showToast(err?.response?.data?.message || "Failed to update", "error");
    }
  };

  const handleDelete = async () => {
    try {
      await deleteLicensingLead(pendingDelete._id);
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
          <h1 className="font-display text-2xl font-semibold text-ink">Licence Calculator</h1>
          <p className="mt-1 text-sm text-muted">
            Enquiries from the Dynamics 365 rate card, and the rates it quotes from.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/tools/licence-calculator" target="_blank" rel="noreferrer" className="btn-secondary">
            <ExternalLink size={15} /> Open live
          </Link>
        </div>
      </header>

      <div className="flex items-center gap-1 border-b border-paper-line bg-paper px-8">
        {[
          { key: "enquiries", label: "Enquiries", icon: Inbox },
          { key: "catalogue", label: "Capabilities", icon: Layers },
          { key: "content", label: "Page copy", icon: Type },
          { key: "pricing", label: "Rate card pricing", icon: Tags },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`-mb-px flex items-center gap-2 border-b-2 px-4 py-3.5 text-sm font-semibold transition-colors ${
              tab === key
                ? "border-signal text-signal"
                : "border-transparent text-muted hover:text-ink"
            }`}
          >
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      {tab === "content" ? (
        <main className="flex-1 overflow-y-auto">
          <ContentEditor
            canEdit={canCatalogue}
            onToast={showToast}
          />
        </main>
      ) : tab === "catalogue" ? (
        <main className="flex-1 overflow-y-auto">
          <CatalogueEditor
            canEdit={canCatalogue}
            onToast={showToast}
          />
        </main>
      ) : tab === "pricing" ? (
        <main className="flex-1 overflow-y-auto">
          <PricingEditor canEdit={canPricing} onToast={showToast} />
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
                sub={`${stats.byPlatform?.bc || 0} Business Central`}
              />
              <StatCard
                label="Annual pipeline"
                value={
                  stats.pipelineByCurrency?.length
                    ? stats.pipelineByCurrency.map((c) => money(c.annualValue, c.currency)).join(" · ")
                    : "—"
                }
                sub="Licence value at list"
              />
            </div>
          )}

          <div className="flex flex-col gap-4 border-b border-paper-line bg-paper px-8 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              {[{ key: "", label: "All" }, ...LEAD_STATUSES.map((s) => ({ key: s, label: s }))].map((f) => (
                <button
                  key={f.key}
                  onClick={() => setStatus(f.key)}
                  className={`chip capitalize ${
                    status === f.key
                      ? "bg-signal text-white"
                      : "border border-paper-line bg-paper-card text-muted hover:text-ink"
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
                <option value="">All platforms</option>
                <option value="bc">Business Central</option>
                <option value="fo">Finance &amp; Operations</option>
              </select>
            </div>

            <div className="relative w-full max-w-xs">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, email, company…"
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
                  <Calculator size={24} />
                </div>
                <h3 className="font-display text-base font-semibold text-ink">
                  {hasFilters ? "No enquiries match those filters" : "No enquiries yet"}
                </h3>
                <p className="mt-1.5 max-w-sm text-sm text-muted">
                  {hasFilters
                    ? "Try widening the search or clearing the status filter."
                    : "Submissions from the licence rate card will land here."}
                </p>
                {hasFilters && (
                  <button
                    onClick={() => { setSearch(""); setStatus(""); setPlatform(""); }}
                    className="btn-secondary mt-5"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            ) : (
              <table className="w-full">
                <thead className="sticky top-0 z-10 bg-paper text-left">
                  <tr className="border-b border-paper-line">
                    {["Contact", "Statement", "Users", "Status", "Received"].map((h) => (
                      <th key={h} className="px-8 py-3 font-mono text-[10px] uppercase tracking-widest text-muted first:px-8">
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
                      <td className="px-8 py-3.5">
                        <span className="block text-sm font-medium text-ink">{l.name}</span>
                        <span className="block text-xs text-muted">{l.company || l.email}</span>
                      </td>
                      <td className="px-8 py-3.5">
                        <span className="block font-mono text-sm tabular-nums text-ink">
                          {money(l.annualTotal, l.currency)}
                          <span className="ml-1 text-[10px] text-muted">/yr</span>
                        </span>
                        <span className="mt-1 block"><PlatformBadge platform={l.platform} tier={l.tier} /></span>
                      </td>
                      <td className="px-8 py-3.5 font-mono text-xs text-muted">
                        {l.fullUsers}F · {l.teamUsers}T
                        {l.deviceUsers > 0 && ` · ${l.deviceUsers}D`}
                      </td>
                      <td className="px-8 py-3.5"><LeadStatusBadge status={l.status} /></td>
                      <td className="px-8 py-3.5 text-xs text-muted">{formatDate(l.createdAt)}</td>
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
          description={`${pendingDelete.name}'s licence enquiry will be permanently removed. This cannot be undone.`}
          onConfirm={handleDelete}
          onCancel={() => setPendingDelete(null)}
        />
      )}

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
