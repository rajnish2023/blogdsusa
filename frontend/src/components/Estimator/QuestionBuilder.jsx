import { useState } from "react";
import {
  Plus, Trash2, ChevronUp, ChevronDown, ChevronRight, GripVertical, Save, Loader2, AlertCircle,
} from "lucide-react";
import TipTapEditor from "../Blog/TipTapEditor";

const ANSWER_TYPES = [
  { value: "cost", label: "Fixed cost" },
  { value: "range", label: "Range (min–max)" },
  { value: "percentage", label: "Percentage" },
];

const blankAnswer = () => ({ option: "", type: "cost", min: "0", max: "0", cost: "0", percentage: "0" });

const blankQuestion = () => ({
  ques_id: null,
  ques_name: "",
  ques_details: "",
  answers: [blankAnswer(), blankAnswer()],
  multi_select: "0",
  require_single_select: "1",
});

function Toggle({ checked, onChange, label, hint }) {
  return (
    <label className="flex cursor-pointer items-start gap-2.5">
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`mt-0.5 h-5 w-9 shrink-0 rounded-full transition-colors ${checked ? "bg-ink" : "bg-paper-line"}`}
        aria-pressed={checked}
        aria-label={label}
      >
        <span
          className={`block h-4 w-4 rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-4" : "translate-x-0.5"
          }`}
        />
      </button>
      <span>
        <span className="text-sm font-medium text-ink">{label}</span>
        {hint && <span className="block text-xs text-muted">{hint}</span>}
      </span>
    </label>
  );
}

function AnswerRow({ answer, onChange, onRemove, canRemove }) {
  const set = (key, value) => onChange({ ...answer, [key]: value });

  const type = answer.type || "cost";

  return (
    <tr className="border-t border-paper-line">
      <td className="p-1.5">
        <input
          value={answer.option || ""}
          onChange={(e) => set("option", e.target.value)}
          placeholder="Answer label"
          className="w-full rounded-lg border border-paper-line bg-paper px-2.5 py-1.5 text-sm text-ink outline-none focus:border-ink"
        />
      </td>
      <td className="p-1.5">
        <select
          value={type}
          onChange={(e) => set("type", e.target.value)}
          className="w-full rounded-lg border border-paper-line bg-paper px-2 py-1.5 text-sm text-ink outline-none focus:border-ink"
        >
          {ANSWER_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
      </td>
      <td className="p-1.5">
        {type === "range" ? (
          <div className="flex items-center gap-1">
            <input
              value={answer.min ?? ""}
              onChange={(e) => set("min", e.target.value)}
              placeholder="min"
              className="w-full rounded-lg border border-paper-line bg-paper px-2 py-1.5 text-sm text-ink outline-none focus:border-ink"
            />
            <span className="text-xs text-muted">–</span>
            <input
              value={answer.max ?? ""}
              onChange={(e) => set("max", e.target.value)}
              placeholder="max"
              className="w-full rounded-lg border border-paper-line bg-paper px-2 py-1.5 text-sm text-ink outline-none focus:border-ink"
            />
          </div>
        ) : type === "percentage" ? (
          <input
            value={answer.percentage ?? ""}
            onChange={(e) => set("percentage", e.target.value)}
            placeholder="amount"
            className="w-full rounded-lg border border-paper-line bg-paper px-2 py-1.5 text-sm text-ink outline-none focus:border-ink"
          />
        ) : (
          <input
            value={answer.cost ?? ""}
            onChange={(e) => set("cost", e.target.value)}
            placeholder="amount"
            className="w-full rounded-lg border border-paper-line bg-paper px-2 py-1.5 text-sm text-ink outline-none focus:border-ink"
          />
        )}
      </td>
      <td className="w-10 p-1.5 text-right">
        <button
          type="button"
          onClick={onRemove}
          disabled={!canRemove}
          title={canRemove ? "Remove answer" : "A question needs at least one answer"}
          className="rounded-lg p-1.5 text-muted transition-colors hover:bg-danger/10 hover:text-danger disabled:cursor-not-allowed disabled:opacity-30"
        >
          <Trash2 size={14} />
        </button>
      </td>
    </tr>
  );
}

function QuestionCard({ question, index, total, onChange, onRemove, onMove, currencySymbol }) {
  const [open, setOpen] = useState(!question.ques_id); // new questions start expanded
  const set = (key, value) => onChange({ ...question, [key]: value });

  const setAnswer = (i, next) => {
    const answers = [...question.answers];
    answers[i] = next;
    set("answers", answers);
  };

  return (
    <div className="rounded-xl border border-paper-line bg-paper-card">
      <div className="flex items-start gap-2 p-3">
        <div className="flex flex-col items-center gap-0.5 pt-1">
          <button
            type="button"
            onClick={() => onMove(index, index - 1)}
            disabled={index === 0}
            title="Move up"
            className="rounded p-0.5 text-muted transition-colors hover:bg-paper hover:text-ink disabled:opacity-25"
          >
            <ChevronUp size={14} />
          </button>
          <GripVertical size={13} className="text-paper-line" />
          <button
            type="button"
            onClick={() => onMove(index, index + 1)}
            disabled={index === total - 1}
            title="Move down"
            className="rounded p-0.5 text-muted transition-colors hover:bg-paper hover:text-ink disabled:opacity-25"
          >
            <ChevronDown size={14} />
          </button>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted">
              Q{index + 1}
              {question.ques_id ? ` · id ${question.ques_id}` : " · new"}
            </span>
          </div>
          <input
            value={question.ques_name || ""}
            onChange={(e) => set("ques_name", e.target.value)}
            placeholder="Question text shown to the visitor"
            className="mt-1 w-full rounded-lg border border-paper-line bg-paper px-3 py-2 text-sm font-medium text-ink outline-none focus:border-ink"
          />
        </div>

        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="rounded-lg p-1.5 text-muted transition-colors hover:bg-paper hover:text-ink"
          title={open ? "Collapse" : "Expand"}
        >
          <ChevronRight size={16} className={`transition-transform ${open ? "rotate-90" : ""}`} />
        </button>
        <button
          type="button"
          onClick={onRemove}
          className="rounded-lg p-1.5 text-muted transition-colors hover:bg-danger/10 hover:text-danger"
          title="Remove question"
        >
          <Trash2 size={16} />
        </button>
      </div>

      {open && (
        <div className="space-y-4 border-t border-paper-line p-3">
          <div className="flex flex-wrap gap-6">
            <Toggle
              checked={question.multi_select === "1"}
              onChange={(v) => set("multi_select", v ? "1" : "0")}
              label="Allow multiple answers"
              hint="Sends type: multi_select to the calculator"
            />
            <Toggle
              checked={question.require_single_select === "1"}
              onChange={(v) => set("require_single_select", v ? "1" : "0")}
              label="Required"
              hint="Visitor must answer before continuing"
            />
          </div>

          <div>
            <p className="mb-1.5 font-mono text-[10px] uppercase tracking-widest text-muted">
              Details (shown under the question)
            </p>
            <TipTapEditor
              value={question.ques_details || ""}
              onChange={(html) => set("ques_details", html)}
              placeholder="What this option includes…"
              variant="compact"
            />
          </div>

          <div>
            <p className="mb-1.5 font-mono text-[10px] uppercase tracking-widest text-muted">
              Answers &amp; pricing {currencySymbol ? `(${currencySymbol})` : ""}
            </p>
            <table className="w-full table-fixed">
              <thead>
                <tr className="text-left">
                  <th className="w-[40%] px-1.5 pb-1 text-[10px] font-medium uppercase tracking-wider text-muted">Answer</th>
                  <th className="w-[22%] px-1.5 pb-1 text-[10px] font-medium uppercase tracking-wider text-muted">Pricing</th>
                  <th className="px-1.5 pb-1 text-[10px] font-medium uppercase tracking-wider text-muted">Value</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody>
                {question.answers.map((a, i) => (
                  <AnswerRow
                    key={i}
                    answer={a}
                    onChange={(next) => setAnswer(i, next)}
                    onRemove={() => set("answers", question.answers.filter((_, j) => j !== i))}
                    canRemove={question.answers.length > 1}
                  />
                ))}
              </tbody>
            </table>
            <button
              type="button"
              onClick={() => set("answers", [...question.answers, blankAnswer()])}
              className="mt-2 inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium text-muted transition-colors hover:bg-paper hover:text-ink"
            >
              <Plus size={13} /> Add answer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function QuestionBuilder({ questions, baseCost, currencySymbol, onSave, saving, canEdit }) {
  const [items, setItems] = useState(questions);
  const [cost, setCost] = useState(baseCost ?? "0");

  const dirty =
    JSON.stringify(items) !== JSON.stringify(questions) || String(cost) !== String(baseCost ?? "0");

  const move = (from, to) => {
    if (to < 0 || to >= items.length) return;
    const next = [...items];
    const [row] = next.splice(from, 1);
    next.splice(to, 0, row);
    setItems(next);
  };

  const update = (i, next) => setItems(items.map((q, j) => (j === i ? next : q)));

  const unnamed = items.filter((q) => !String(q.ques_name || "").trim()).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3 rounded-xl border border-paper-line bg-paper-card p-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted">Base cost</p>
          <div className="mt-1 flex items-center gap-2">
            {currencySymbol && <span className="text-lg font-semibold text-muted">{currencySymbol}</span>}
            <input
              value={cost}
              onChange={(e) => setCost(e.target.value)}
              disabled={!canEdit}
              className="w-40 rounded-lg border border-paper-line bg-paper px-3 py-2 text-sm font-semibold text-ink outline-none focus:border-ink disabled:opacity-60"
            />
          </div>
          <p className="mt-1 text-xs text-muted">Added to both ends of every quote.</p>
        </div>

        {canEdit && (
          <button
            type="button"
            onClick={() => onSave({ questions: items, base_cost: cost })}
            disabled={saving || !dirty || unnamed > 0}
            className="btn-primary inline-flex items-center gap-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
            {saving ? "Saving…" : dirty ? "Save questions" : "Saved"}
          </button>
        )}
      </div>

      {unnamed > 0 && (
        <div className="flex items-center gap-2 rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
          <AlertCircle size={15} />
          {unnamed} question{unnamed > 1 ? "s need" : " needs"} text before this can be saved.
        </div>
      )}

      <div className="space-y-3">
        {items.map((q, i) => (
          <QuestionCard
            key={q.ques_id ?? `new-${i}`}
            question={q}
            index={i}
            total={items.length}
            currencySymbol={currencySymbol}
            onChange={(next) => update(i, next)}
            onRemove={() => setItems(items.filter((_, j) => j !== i))}
            onMove={move}
          />
        ))}
      </div>

      {canEdit && (
        <button
          type="button"
          onClick={() => setItems([...items, blankQuestion()])}
          className="btn-secondary inline-flex items-center gap-2"
        >
          <Plus size={15} /> Add question
        </button>
      )}

      {items.length >= 10 && (
        <div className="flex items-start gap-2 rounded-xl border border-paper-line bg-paper px-4 py-3 text-xs text-muted">
          <AlertCircle size={14} className="mt-0.5 shrink-0" />
          <span>
            Heads up: the public API sorts questions the way the old MySQL column did — as text, not
            numbers — so with 10 or more questions the calculator will show Q10 straight after Q1.
            This matches the Laravel behaviour exactly; ask a developer before changing it, as it
            affects the live marketing page.
          </span>
        </div>
      )}
    </div>
  );
}
