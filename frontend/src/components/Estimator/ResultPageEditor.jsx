import { useState } from "react";
import { Save, Loader2 } from "lucide-react";
import TipTapEditor from "../Blog/TipTapEditor";

/* The copy shown to a visitor once they finish the estimator — the port of
   Laravel's result_page screen. One record per estimator. */

export default function ResultPageEditor({ result, onSave, saving, canEdit }) {
  const [heading, setHeading] = useState(result?.intro_heading || "");
  const [text, setText] = useState(result?.intro_text || "");
  const [explanation, setExplanation] = useState(result?.pricing_explanation || "");

  const dirty =
    heading !== (result?.intro_heading || "") ||
    text !== (result?.intro_text || "") ||
    explanation !== (result?.pricing_explanation || "");

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-paper-line bg-paper-card p-4">
        <label className="font-mono text-[10px] uppercase tracking-widest text-muted">Intro heading</label>
        <input
          value={heading}
          onChange={(e) => setHeading(e.target.value)}
          disabled={!canEdit}
          placeholder="Thanks For Completing Our Pricing Estimator!"
          className="mt-1.5 w-full rounded-lg border border-paper-line bg-paper px-3 py-2 text-sm text-ink outline-none focus:border-ink disabled:opacity-60"
        />
      </div>

      <div className="rounded-xl border border-paper-line bg-paper-card p-4">
        <label className="font-mono text-[10px] uppercase tracking-widest text-muted">Intro text</label>
        {/* Plain textarea, not the rich editor: the legacy column holds
            newline-separated prose and the marketing site renders it as text. */}
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={!canEdit}
          rows={5}
          placeholder="You're on the brink of gaining clarity on the Dynamics 365 consultation tailored just for you…"
          className="mt-1.5 w-full resize-y rounded-lg border border-paper-line bg-paper px-3 py-2 text-sm leading-relaxed text-ink outline-none focus:border-ink disabled:opacity-60"
        />
      </div>

      <div className="rounded-xl border border-paper-line bg-paper-card p-4">
        <label className="font-mono text-[10px] uppercase tracking-widest text-muted">Pricing explanation</label>
        <div className="mt-1.5">
          <TipTapEditor
            value={explanation}
            onChange={setExplanation}
            placeholder="What's included, how the estimate is calculated…"
            variant="compact"
          />
        </div>
      </div>

      {canEdit && (
        <button
          type="button"
          onClick={() => onSave({ intro_heading: heading, intro_text: text, pricing_explanation: explanation })}
          disabled={saving || !dirty}
          className="btn-primary inline-flex items-center gap-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
          {saving ? "Saving…" : dirty ? "Save result page" : "Saved"}
        </button>
      )}
    </div>
  );
}
