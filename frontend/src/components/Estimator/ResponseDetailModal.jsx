import { useEffect, useState } from "react";
import { X, Mail, Phone, Send, Loader2, Calendar } from "lucide-react";
import { fetchEstimatorResponse, resendEstimatorReport } from "../../api/estimatorApi";
import { formatDate } from "../../utils/format";

const money = (symbol, value) => `${symbol || ""} ${value}`.trim();

/* Mirrors the value column of the emailed quote table — same rule, so the
   admin sees exactly what the customer was sent. Driven by the option's
   `type`, which is what was picked in the question's Pricing dropdown. */
const optionValue = (row, symbol) => {
  if (row.type === "percentage") return money(symbol, row.percentage);
  if (row.type === "range") return `${money(symbol, row.min)} – ${money(symbol, row.max)}`;
  return money(symbol, Number(row.cost) < 0 ? 0 : row.cost);
};

export default function ResponseDetailModal({ responseId, onClose, onToast, canResend }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchEstimatorResponse(responseId)
      .then((d) => !cancelled && setData(d))
      .catch((err) => {
        if (cancelled) return;
        onToast?.(err.response?.data?.message || "Could not load this submission", "error");
        onClose();
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [responseId]);

  const resend = async () => {
    setSending(true);
    try {
      await resendEstimatorReport(responseId);
      onToast?.("Report email sent");
    } catch (err) {
      onToast?.(err.response?.data?.message || "Could not send the report", "error");
    } finally {
      setSending(false);
    }
  };

  const symbol = data?.currency || "";
  const total =
    data && data.sumMin === data.sumMax
      ? money(symbol, data.sumMin.toLocaleString())
      : data
      ? `${money(symbol, data.sumMin.toLocaleString())} – ${money(symbol, data.sumMax.toLocaleString())}`
      : "";

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/50 p-4 animate-fadeIn" onClick={onClose}>
      <div
        className="flex max-h-[88vh] w-full max-w-2xl animate-scaleIn flex-col rounded-2xl bg-paper-card shadow-pop"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-paper-line p-5">
          <div className="min-w-0">
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted">
              Submission #{responseId}
            </p>
            <h3 className="mt-0.5 truncate font-display text-lg font-semibold text-ink">
              {loading ? "Loading…" : data?.response?.name || "Unnamed"}
            </h3>
            {data && (
              <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
                <span className="inline-flex items-center gap-1.5">
                  <Mail size={12} /> {data.response.email || "—"}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Phone size={12} /> {data.response.phone || "—"}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Calendar size={12} /> {formatDate(data.response.created_at)}
                </span>
              </div>
            )}
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-muted transition-colors hover:bg-paper hover:text-ink">
            <X size={18} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-muted">
              <Loader2 size={20} className="animate-spin" />
            </div>
          ) : (
            <>
              <table className="w-full text-sm">
                <tbody>
                  <tr className="border-b border-paper-line">
                    <td className="py-2.5 pr-3 font-medium text-ink">Base cost</td>
                    <td className="py-2.5 text-right tabular-nums text-ink">{money(symbol, data.baseCost)}</td>
                  </tr>
                  {data.results.map((row) => (
                    <tr key={row.ques_id} className="border-b border-paper-line">
                      <td className="py-2.5 pr-3">
                        <span className="font-medium text-ink">{row.option}</span>
                        <span className="block text-xs text-muted">{row.ques_name}</span>
                      </td>
                      <td className="py-2.5 text-right tabular-nums text-ink">{optionValue(row, symbol)}</td>
                    </tr>
                  ))}
                  <tr className="bg-paper">
                    <td className="py-3 pr-3 font-semibold text-ink">Total estimate</td>
                    <td className="py-3 text-right font-semibold tabular-nums text-ink">{total}</td>
                  </tr>
                </tbody>
              </table>

              {/* Questions the visitor skipped never reach the priced table, so
                  the raw snapshot is shown too — it is the only record of what
                  they were actually asked. */}
              <details className="mt-5 rounded-xl border border-paper-line bg-paper p-3">
                <summary className="cursor-pointer text-xs font-medium text-muted">
                  Raw answers ({data.response.answers.length} questions)
                </summary>
                <ul className="mt-3 space-y-2">
                  {data.response.answers.map((a) => (
                    <li key={a.ques_id} className="text-xs">
                      <span className="text-muted">{a.ques_name}</span>
                      <span className="mt-0.5 block font-medium text-ink">
                        {a.answer === null || a.answer === undefined
                          ? "— not answered —"
                          : Array.isArray(a.answer)
                          ? a.answer.join(", ")
                          : String(a.answer)}
                      </span>
                    </li>
                  ))}
                </ul>
              </details>
            </>
          )}
        </div>

        {canResend && !loading && (
          <div className="flex justify-end gap-2 border-t border-paper-line p-4">
            <button onClick={resend} disabled={sending} className="btn-secondary inline-flex items-center gap-2 disabled:opacity-50">
              {sending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
              {sending ? "Sending…" : "Re-send report email"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
