import { useCallback, useEffect, useState } from "react";
import {
  Calculator, Plus, Search, Inbox, ListChecks, FileText, Eye, Trash2,
  ArrowLeft, Loader2, ExternalLink, Pencil,
} from "lucide-react";
import Toast from "../components/Shared/Toast";
import ConfirmDialog from "../components/Shared/ConfirmDialog";
import Pagination from "../components/Shared/Pagination";
import QuestionBuilder from "../components/Estimator/QuestionBuilder";
import ResultPageEditor from "../components/Estimator/ResultPageEditor";
import ResponseDetailModal from "../components/Estimator/ResponseDetailModal";
import EstimatorModal from "../components/Estimator/EstimatorModal";
import {
  fetchEstimators,
  fetchEstimator,
  createEstimator,
  updateEstimator,
  deleteEstimator,
  saveEstimatorQuestions,
  saveEstimatorResult,
  fetchEstimatorResponses,
  deleteEstimatorResponse,
} from "../api/estimatorApi";
import { usePermissions } from "../auth/AuthContext";
import { formatDate } from "../utils/format";

const LIMIT = 20;

function StatusPill({ status }) {
  const active = status === "1";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${
        active ? "bg-success/10 text-success" : "bg-paper-line text-muted"
      }`}
    >
      {active ? "Active" : "Draft"}
    </span>
  );
}

/* ------------------------------------------------------------ submissions -- */

function ResponsesTab({ estimatorId, canDelete, canView, showToast }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [openId, setOpenId] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchEstimatorResponses(estimatorId, { page, limit: LIMIT, search });
      setRows(data.responses);
      setPages(data.pages);
      setTotal(data.total);
    } catch (err) {
      showToast(err.response?.data?.message || "Could not load submissions", "error");
    } finally {
      setLoading(false);
    }
  }, [estimatorId, page, search]);

  // Debounced so typing in the search box does not fire a request per keystroke.
  useEffect(() => {
    const t = setTimeout(load, search ? 300 : 0);
    return () => clearTimeout(t);
  }, [load]);

  const confirmDelete = async () => {
    try {
      await deleteEstimatorResponse(pendingDelete.id);
      showToast("Submission deleted");
      load();
    } catch (err) {
      showToast(err.response?.data?.message || "Could not delete", "error");
    } finally {
      setPendingDelete(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
        <input
          value={search}
          onChange={(e) => {
            setPage(1);
            setSearch(e.target.value);
          }}
          placeholder="Search name, email or phone"
          className="w-full rounded-lg border border-paper-line bg-paper-card py-2 pl-9 pr-3 text-sm text-ink outline-none focus:border-ink"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted">
          <Loader2 size={20} className="animate-spin" />
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-paper-line py-16 text-center">
          <Inbox size={22} className="mx-auto text-muted" />
          <p className="mt-2 text-sm text-muted">
            {search ? "No submissions match that search." : "No submissions yet."}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-paper-line bg-paper-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-paper-line text-left">
                <th className="px-4 py-2.5 text-[10px] font-medium uppercase tracking-wider text-muted">Name</th>
                <th className="px-4 py-2.5 text-[10px] font-medium uppercase tracking-wider text-muted">Contact</th>
                <th className="px-4 py-2.5 text-[10px] font-medium uppercase tracking-wider text-muted">Answered</th>
                <th className="px-4 py-2.5 text-[10px] font-medium uppercase tracking-wider text-muted">Received</th>
                <th className="w-24" />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-paper-line last:border-0 hover:bg-paper">
                  <td className="px-4 py-3 font-medium text-ink">{r.name || "—"}</td>
                  <td className="px-4 py-3">
                    <span className="block text-ink">{r.email || "—"}</span>
                    <span className="block text-xs text-muted">{r.phone || "—"}</span>
                  </td>
                  <td className="px-4 py-3 tabular-nums text-muted">{r.answered}</td>
                  <td className="px-4 py-3 text-muted">{formatDate(r.created_at)}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      {canView && (
                        <button
                          onClick={() => setOpenId(r.id)}
                          title="View breakdown"
                          className="rounded-lg p-1.5 text-muted transition-colors hover:bg-paper-line hover:text-ink"
                        >
                          <Eye size={15} />
                        </button>
                      )}
                      {canDelete && (
                        <button
                          onClick={() => setPendingDelete(r)}
                          title="Delete"
                          className="rounded-lg p-1.5 text-muted transition-colors hover:bg-danger/10 hover:text-danger"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pagination page={page} pages={pages} total={total} limit={LIMIT} onPageChange={setPage} />

      {openId && (
        <ResponseDetailModal
          responseId={openId}
          onClose={() => setOpenId(null)}
          onToast={showToast}
          canResend={canView}
        />
      )}
      {pendingDelete && (
        <ConfirmDialog
          title="Delete this submission?"
          description={`${pendingDelete.name || "This submission"} will be removed from the list. Nothing is sent to the visitor.`}
          onConfirm={confirmDelete}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- detail -- */

function EstimatorDetail({ id, onBack, showToast, can }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("questions");
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);

  const canEdit = can("estimator:edit");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await fetchEstimator(id));
    } catch (err) {
      showToast(err.response?.data?.message || "Could not load the estimator", "error");
      onBack();
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const saveQuestions = async (payload) => {
    setSaving(true);
    try {
      await saveEstimatorQuestions(id, payload);
      showToast("Questions saved");
      await load();
    } catch (err) {
      showToast(err.response?.data?.message || "Could not save the questions", "error");
    } finally {
      setSaving(false);
    }
  };

  const saveResult = async (payload) => {
    setSaving(true);
    try {
      await saveEstimatorResult(id, payload);
      showToast("Result page saved");
      await load();
    } catch (err) {
      showToast(err.response?.data?.message || "Could not save the result page", "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center py-24 text-muted">
        <Loader2 size={22} className="animate-spin" />
      </div>
    );
  }

  const { estimator } = data;
  const symbol = estimator.currency?.symbol || "";

  const TABS = [
    { key: "questions", label: "Questions", icon: ListChecks },
    { key: "result", label: "Result page", icon: FileText },
    { key: "responses", label: "Submissions", icon: Inbox },
  ];

  return (
    <div className="space-y-5">
      <div>
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted transition-colors hover:text-ink"
        >
          <ArrowLeft size={14} /> All estimators
        </button>

        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="font-display text-xl font-semibold text-ink">{estimator.estimator_name}</h1>
              <StatusPill status={estimator.status} />
            </div>
            <p className="mt-1 font-mono text-[11px] text-muted">
              id {estimator.id} · {estimator.currency?.name} ({symbol}) · base {symbol} {estimator.base_cost}
            </p>
            {/* The public endpoint is keyed on this id — surfaced so anyone
                wiring up a frontend can copy it without digging. */}
            <p className="mt-1.5 inline-flex items-center gap-1.5 rounded-lg bg-paper px-2 py-1 font-mono text-[11px] text-muted">
              <ExternalLink size={11} />
              GET /api/get-all-questions/{estimator.id}
            </p>
          </div>
          {canEdit && (
            <button onClick={() => setEditing(true)} className="btn-secondary inline-flex items-center gap-2">
              <Pencil size={14} /> Edit details
            </button>
          )}
        </div>
      </div>

      <div className="flex gap-1 border-b border-paper-line">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`inline-flex items-center gap-2 border-b-2 px-3.5 py-2.5 text-sm font-medium transition-colors ${
              tab === t.key
                ? "border-ink text-ink"
                : "border-transparent text-muted hover:text-ink"
            }`}
          >
            <t.icon size={15} /> {t.label}
          </button>
        ))}
      </div>

      {tab === "questions" && (
        <QuestionBuilder
          key={`q-${estimator.id}-${data.questions.length}`}
          questions={data.questions}
          baseCost={estimator.base_cost}
          currencySymbol={symbol}
          onSave={saveQuestions}
          saving={saving}
          canEdit={canEdit}
        />
      )}
      {tab === "result" && (
        <ResultPageEditor
          key={`r-${estimator.id}`}
          result={data.result}
          onSave={saveResult}
          saving={saving}
          canEdit={canEdit}
        />
      )}
      {tab === "responses" && (
        <ResponsesTab
          estimatorId={estimator.id}
          canView={can("estimator:responses")}
          canDelete={can("estimator:delete")}
          showToast={showToast}
        />
      )}

      {editing && (
        <EstimatorModal
          estimator={estimator}
          onToast={showToast}
          onClose={() => setEditing(false)}
          onSave={async (payload) => {
            try {
              await updateEstimator(id, payload);
              showToast("Estimator updated");
              setEditing(false);
              await load();
            } catch (err) {
              showToast(err.response?.data?.message || "Could not update", "error");
            }
          }}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ page -- */

export default function EstimatorPage() {
  const can = usePermissions();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState(null);
  const [creating, setCreating] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = "success") => setToast({ message, type });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await fetchEstimators());
    } catch (err) {
      showToast(err.response?.data?.message || "Could not load estimators", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!openId) load();
  }, [openId, load]);

  const confirmDelete = async () => {
    try {
      await deleteEstimator(pendingDelete.id);
      showToast("Estimator deleted");
      load();
    } catch (err) {
      showToast(err.response?.data?.message || "Could not delete", "error");
    } finally {
      setPendingDelete(null);
    }
  };

  return (
    <main className="flex-1 overflow-y-auto">
      <div className="mx-auto max-w-5xl px-6 py-8">
        {openId ? (
          <EstimatorDetail id={openId} onBack={() => setOpenId(null)} showToast={showToast} can={can} />
        ) : (
          <>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h1 className="font-display text-xl font-semibold text-ink">Price Estimator</h1>
                <p className="mt-1 text-sm text-muted">
                  The ERP implementation cost calculator behind the public pricing tool.
                </p>
              </div>
              {can("estimator:create") && (
                <button onClick={() => setCreating(true)} className="btn-primary inline-flex items-center gap-2">
                  <Plus size={15} /> New estimator
                </button>
              )}
            </div>

            <div className="mt-6">
              {loading ? (
                <div className="flex items-center justify-center py-24 text-muted">
                  <Loader2 size={22} className="animate-spin" />
                </div>
              ) : rows.length === 0 ? (
                <div className="rounded-xl border border-dashed border-paper-line py-20 text-center">
                  <Calculator size={24} className="mx-auto text-muted" />
                  <p className="mt-2 text-sm text-muted">No estimators yet.</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {rows.map((e) => (
                    <div
                      key={e.id}
                      className="flex items-center gap-4 rounded-xl border border-paper-line bg-paper-card p-4 transition-colors hover:border-ink/20"
                    >
                      <button onClick={() => setOpenId(e.id)} className="min-w-0 flex-1 text-left">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-display text-sm font-semibold text-ink">{e.estimator_name}</span>
                          <StatusPill status={e.status} />
                        </div>
                        <p className="mt-1 font-mono text-[11px] text-muted">
                          id {e.id} · {e.questionCount} question{e.questionCount === 1 ? "" : "s"} ·{" "}
                          {e.currency?.symbol}
                          {e.base_cost} base · {e.responseCount} submission
                          {e.responseCount === 1 ? "" : "s"}
                        </p>
                      </button>
                      <button
                        onClick={() => setOpenId(e.id)}
                        className="btn-secondary shrink-0 text-xs"
                      >
                        Open
                      </button>
                      {can("estimator:delete") && (
                        <button
                          onClick={() => setPendingDelete(e)}
                          title="Delete estimator"
                          className="shrink-0 rounded-lg p-1.5 text-muted transition-colors hover:bg-danger/10 hover:text-danger"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {creating && (
        <EstimatorModal
          onToast={showToast}
          onClose={() => setCreating(false)}
          onSave={async (payload) => {
            try {
              const { id } = await createEstimator(payload);
              showToast("Estimator created");
              setCreating(false);
              setOpenId(id);
            } catch (err) {
              showToast(err.response?.data?.message || "Could not create", "error");
            }
          }}
        />
      )}

      {pendingDelete && (
        <ConfirmDialog
          title={`Delete "${pendingDelete.estimator_name}"?`}
          description="Its questions and submissions are hidden too. The public API will stop serving it immediately — check nothing is calling it first."
          onConfirm={confirmDelete}
          onCancel={() => setPendingDelete(null)}
        />
      )}

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </main>
  );
}
