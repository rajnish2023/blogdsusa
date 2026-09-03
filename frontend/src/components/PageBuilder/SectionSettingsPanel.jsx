import { Trash2 } from "lucide-react";
import FeaturedImagePicker from "../Blog/FeaturedImagePicker";

const COLORS = ["", "#F6F5F2", "#EAEDFF", "#FFE9DF", "#14161F"];

const SpacingInput = ({ label, value = {}, onChange }) => {
  const set = (dir, val) => {
    const next = { ...value };
    next[dir] = parseInt(val, 10) || 0;
    onChange(next);
  };
  return (
    <div>
      <label className="mb-1 block text-[11px] font-medium text-muted">{label}</label>
      <div className="grid grid-cols-4 gap-1">
        {["top", "right", "bottom", "left"].map((dir) => (
          <div key={dir}>
            <input
              type="number"
              value={value[dir] ?? 0}
              onChange={(e) => set(dir, e.target.value)}
              className="w-full rounded-md border border-paper-line bg-paper px-1 py-1 text-center font-mono text-[10px] text-ink focus:border-signal"
            />
            <span className="mt-0.5 block text-center text-[9px] uppercase tracking-wide text-muted/60">{dir}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default function SectionSettingsPanel({ section, onChangeColumns, onChange, onDelete }) {
  const style = section.style || { margin: { top: 0, right: 0, bottom: 0, left: 0 }, padding: { top: 0, right: 0, bottom: 0, left: 0 } };
  const setStyle = (patch) => onChange({ style: { ...style, ...patch } });

  const handleBgImageChange = (img) => {
    if (img?.url) {
      onChange({ background: `url(${img.url})` });
    } else {
      onChange({ background: "" });
    }
  };

  const isBgImage = (section.background || "").startsWith("url(");
  const bgImageUrl = isBgImage ? section.background.slice(4, -1) : "";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-paper-line pb-3">
        <h3 className="font-display text-sm font-semibold text-ink">Section Settings</h3>
        <button onClick={onDelete} className="rounded-md p-1.5 text-muted hover:bg-danger/5 hover:text-danger" title="Delete section">
          <Trash2 size={14} />
        </button>
      </div>

      {/* Column Count */}
      <div>
        <label className="mb-1.5 block text-xs font-medium text-muted">Columns</label>
        <div className="flex gap-1.5">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => onChangeColumns(n)}
              className={`flex-1 rounded-lg border py-1.5 text-xs font-semibold ${
                section.columns === n ? "border-signal bg-signal-soft text-signal" : "border-paper-line text-muted hover:border-ink/20"
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      {/* Background Options */}
      <div className="space-y-3 pt-2 border-t border-paper-line/50">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-muted">Background Presets</label>
          <div className="flex items-center gap-2">
            {COLORS.map((c) => (
              <button
                key={c || "none"}
                type="button"
                onClick={() => onChange({ background: c })}
                title={c || "None"}
                className={`h-7 w-7 rounded-full border-2 ${section.background === c ? "border-signal" : "border-paper-line"}`}
                style={{
                  backgroundColor: c || "#fff",
                  backgroundImage: c ? "none" : "linear-gradient(45deg, #eee 25%, transparent 25%), linear-gradient(-45deg, #eee 25%, transparent 25%)",
                  backgroundSize: "8px 8px"
                }}
              />
            ))}
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-muted">Custom Background CSS (Color/Gradient)</label>
          <input
            type="text"
            placeholder="e.g. #efefef or linear-gradient(...)"
            value={!isBgImage ? section.background || "" : ""}
            onChange={(e) => onChange({ background: e.target.value })}
            className="w-full rounded-lg border border-paper-line bg-paper px-3 py-2 text-sm text-ink focus:border-signal"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-muted">Background Image</label>
          <FeaturedImagePicker
            image={isBgImage ? { url: bgImageUrl, alt: "Background" } : null}
            onChange={handleBgImageChange}
          />
        </div>
      </div>

      {/* Padding Style */}
      <div className="space-y-3 pt-2 border-t border-paper-line/50">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-muted">Vertical spacing preset</label>
          <div className="flex gap-1.5">
            {["compact", "normal", "spacious", "custom"].map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => onChange({ paddingY: p })}
                className={`flex-1 rounded-lg border py-1.5 text-xs font-medium capitalize ${
                  section.paddingY === p ? "border-signal bg-signal-soft text-signal" : "border-paper-line text-muted hover:border-ink/20"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {section.paddingY === "custom" && (
          <div className="space-y-3">
            <SpacingInput
              label="Section Margin (px)"
              value={style.margin || { top: 0, right: 0, bottom: 0, left: 0 }}
              onChange={(margin) => setStyle({ margin })}
            />
            <SpacingInput
              label="Section Padding (px)"
              value={style.padding || { top: 0, right: 0, bottom: 0, left: 0 }}
              onChange={(padding) => setStyle({ padding })}
            />
          </div>
        )}
      </div>
    </div>
  );
}
