import { useMemo } from "react";
import { CheckCircle2, Circle, Search } from "lucide-react";
import { calculateSeoScore } from "../../utils/seoScore";

const gradeColor = (grade) => {
  if (grade === "Excellent") return "text-success";
  if (grade === "Good") return "text-signal";
  if (grade === "Fair") return "text-flare";
  return "text-danger";
};

export default function SeoPanel({ title, content, slug, seo, onSeoChange }) {
  const result = useMemo(
    () =>
      calculateSeoScore({
        title,
        content,
        slug,
        metaDescription: seo.metaDescription || "",
        focusKeyword: seo.focusKeyword || "",
      }),
    [title, content, slug, seo.metaDescription, seo.focusKeyword]
  );

  const set = (field) => (e) => onSeoChange({ ...seo, [field]: e.target.value });

  return (
    <div className="rounded-2xl border border-paper-line bg-paper-card p-5 shadow-card">
      <div className="mb-4 flex items-center gap-2">
        <Search size={16} className="text-signal" />
        <h3 className="font-display text-sm font-semibold text-ink">SEO &amp; keyword strength</h3>
      </div>

      <div className="space-y-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-muted">Focus keyword</label>
          <textarea
            value={seo.focusKeyword || ""}
            onChange={set("focusKeyword")}
            rows={2}
            placeholder="e.g. coffee brewing"
            className="w-full resize-none rounded-lg border border-paper-line bg-paper px-3 py-2 text-sm text-ink focus:border-signal"
          />
        </div>
        <div>
          <div className="mb-1 flex items-center justify-between">
            <label className="text-xs font-medium text-muted">Meta title</label>
            <span className="text-[10px] text-muted">{(seo.metaTitle || "").length}/70</span>
          </div>
          <textarea
            value={seo.metaTitle || ""}
            onChange={set("metaTitle")}
            maxLength={70}
            rows={2}
            placeholder="Defaults to the post title"
            className="w-full resize-none rounded-lg border border-paper-line bg-paper px-3 py-2 text-sm text-ink focus:border-signal"
          />
        </div>
        <div>
          <div className="mb-1 flex items-center justify-between">
            <label className="text-xs font-medium text-muted">Meta description</label>
            <span className="text-[10px] text-muted">{(seo.metaDescription || "").length}/200</span>
          </div>
          <textarea
            value={seo.metaDescription || ""}
            onChange={set("metaDescription")}
            maxLength={200}
            rows={3}
            placeholder="Shown in search results — aim for 120–160 characters"
            className="w-full resize-none rounded-lg border border-paper-line bg-paper px-3 py-2 text-sm text-ink focus:border-signal"
          />
        </div>

        {/* noIndex Switch Toggle */}
        <div className="flex items-center justify-between border-t border-paper-line/50 pt-3">
          <div className="flex flex-col gap-0.5">
            <span className="text-xs font-semibold text-ink">Hide from search engines</span>
            <span className="text-[10px] text-muted">Instruct search engines not to index this post (noindex)</span>
          </div>
          <label className="relative inline-flex cursor-pointer items-center select-none">
            <input
              type="checkbox"
              checked={!!seo.noIndex}
              onChange={(e) => onSeoChange({ ...seo, noIndex: e.target.checked })}
              className="peer sr-only"
            />
            <div className="peer h-5 w-9 rounded-full bg-paper border border-paper-line after:absolute after:left-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:bg-muted after:transition-all after:content-[''] peer-checked:bg-signal peer-checked:after:translate-x-full peer-checked:after:bg-white peer-focus:outline-none" />
          </label>
        </div>
      </div>

      <div className="mt-5 border-t border-paper-line pt-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-wide text-muted">Keyword strength</span>
          <span className={`font-display text-sm font-semibold ${gradeColor(result.grade)}`}>
            {result.grade === "No focus keyword" ? result.grade : `${result.score}/100 · ${result.grade}`}
          </span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-paper">
          <div
            className={`h-full rounded-full transition-all ${
              result.score >= 90 ? "bg-success" : result.score >= 70 ? "bg-signal" : result.score >= 50 ? "bg-flare" : "bg-danger"
            }`}
            style={{ width: `${result.score}%` }}
          />
        </div>

        <ul className="mt-3 space-y-1.5">
          {result.checks.map((c) => (
            <li key={c.label} className="flex items-start gap-2 text-xs">
              {c.passed ? (
                <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-success" />
              ) : (
                <Circle size={14} className="mt-0.5 shrink-0 text-muted" />
              )}
              <span className={c.passed ? "text-ink" : "text-muted"}>{c.message}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
