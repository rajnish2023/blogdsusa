import { useState } from "react";
import { Plus, Trash2, Braces, AlertCircle } from "lucide-react";

const SCHEMA_TYPES = ["Article", "BlogPosting", "FAQPage", "HowTo", "Product", "Review", "Custom"];

const isValidJson = (str) => {
  if (!str.trim()) return true; 
  try {
    JSON.parse(str);
    return true;
  } catch {
    return false;
  }
};

export default function SchemaMarkupPanel({ entries, onChange }) {
  const [expanded, setExpanded] = useState(entries.length > 0);

  const addEntry = () => {
    onChange([...entries, { type: "Article", json: "" }]);
    setExpanded(true);
  };

  const updateEntry = (index, patch) => {
    onChange(entries.map((e, i) => (i === index ? { ...e, ...patch } : e)));
  };

  const removeEntry = (index) => onChange(entries.filter((_, i) => i !== index));

  return (
    <div className="rounded-2xl border border-paper-line bg-paper-card p-5 shadow-card">
      <button type="button" onClick={() => setExpanded((e) => !e)} className="flex w-full items-center justify-between">
        <div className="flex items-center gap-2">
          <Braces size={16} className="text-signal" />
          <h3 className="font-display text-sm font-semibold text-ink">Schema markup (JSON-LD)</h3>
        </div>
        <span className="text-xs text-muted">{entries.length ? `${entries.length} block${entries.length > 1 ? "s" : ""}` : "None"}</span>
      </button>

      {expanded && (
        <div className="mt-4 space-y-3">
          <p className="text-xs text-muted">
            Add one or more structured-data blocks (Article, FAQPage, HowTo...) to help search engines understand this post. Each block is validated as JSON before saving.
          </p>

          {entries.map((entry, i) => {
            const valid = isValidJson(entry.json);
            return (
              <div key={i} className="rounded-xl border border-paper-line p-3">
                <div className="flex items-center gap-2">
                  <select
                    value={entry.type}
                    onChange={(e) => updateEntry(i, { type: e.target.value })}
                    className="rounded-lg border border-paper-line bg-paper px-2.5 py-1.5 text-xs font-medium text-ink focus:border-signal"
                  >
                    {SCHEMA_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                  <button type="button" onClick={() => removeEntry(i)} className="ml-auto rounded-md p-1.5 text-muted hover:bg-danger/5 hover:text-danger">
                    <Trash2 size={14} />
                  </button>
                </div>
                <textarea
                  value={entry.json}
                  onChange={(e) => updateEntry(i, { json: e.target.value })}
                  rows={5}
                  placeholder={`{\n  "@context": "https://schema.org",\n  "@type": "${entry.type}"\n}`}
                  spellCheck={false}
                  className={`mt-2 w-full resize-y rounded-lg border bg-paper px-3 py-2 font-mono text-xs text-ink placeholder:text-muted/50 focus:outline-none ${
                    valid ? "border-paper-line focus:border-signal" : "border-danger"
                  }`}
                />
                {!valid && (
                  <p className="mt-1.5 flex items-center gap-1.5 text-xs text-danger">
                    <AlertCircle size={12} /> This isn't valid JSON — it won't be saved until fixed
                  </p>
                )}
              </div>
            );
          })}

          <button type="button" onClick={addEntry} className="btn-secondary w-full justify-center py-2 text-xs">
            <Plus size={14} />
            Add schema block
          </button>
        </div>
      )}
    </div>
  );
}
