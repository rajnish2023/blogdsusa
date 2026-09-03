import { Layout, AlignVerticalSpaceAround } from "lucide-react";

const COLORS = ["", "#F6F5F2", "#EAEDFF", "#FFE9DF", "#14161F"];

const PaddingInput = ({ label, value = {}, onChange }) => {
  const set = (dir, val) => {
    const next = { ...value };
    next[dir] = Math.max(0, parseInt(val, 10) || 0);
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
              className="w-full rounded-md border border-paper-line bg-paper px-1.5 py-1 text-center font-mono text-[10px] text-ink focus:border-signal"
            />
            <span className="mt-0.5 block text-center text-[9px] uppercase tracking-wide text-muted/60">{dir}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default function ColumnSettingsPanel({ section, colIndex, onChange, onDeselect }) {
  const colStyle = section.columnStyles?.[colIndex] || { padding: { top: 15, right: 15, bottom: 15, left: 15 }, backgroundColor: "" };

  const setStyle = (patch) => {
    const styles = [...(section.columnStyles || [])];
    styles[colIndex] = { ...colStyle, ...patch };
    onChange({ columnStyles: styles });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-paper-line pb-3">
        <div className="flex items-center gap-2">
          <Layout size={15} className="text-signal" />
          <h3 className="font-display text-sm font-semibold text-ink">Column #{colIndex + 1} Settings</h3>
        </div>
        {onDeselect && (
          <button onClick={onDeselect} className="text-xs text-muted hover:text-ink">
            Done
          </button>
        )}
      </div>

      {/* Background Color */}
      <div>
        <label className="mb-1.5 block text-xs font-medium text-muted">Column Background</label>
        <div className="flex items-center gap-2">
          {COLORS.map((c) => (
            <button
              key={c || "none"}
              type="button"
              onClick={() => setStyle({ backgroundColor: c })}
              title={c || "None"}
              className={`h-7 w-7 rounded-full border-2 ${colStyle.backgroundColor === c ? "border-signal" : "border-paper-line"}`}
              style={{
                backgroundColor: c || "#fff",
                backgroundImage: c ? "none" : "linear-gradient(45deg, #eee 25%, transparent 25%), linear-gradient(-45deg, #eee 25%, transparent 25%)",
                backgroundSize: "8px 8px"
              }}
            />
          ))}
        </div>
      </div>

      {/* Vertical Alignment */}
      <div>
        <label className="mb-1.5 block text-xs font-medium text-muted">Vertical Align</label>
        <div className="flex gap-1.5">
          {["top", "middle", "bottom"].map((align) => (
            <button
              key={align}
              type="button"
              onClick={() => setStyle({ textAlign: align })} // abusing textAlign slot for verticalAlign in schema mapping
              className={`flex-1 rounded-lg border py-1.5 text-xs font-medium capitalize ${
                colStyle.textAlign === align ? "border-signal bg-signal-soft text-signal" : "border-paper-line text-muted hover:border-ink/20"
              }`}
            >
              {align}
            </button>
          ))}
        </div>
      </div>

      {/* Padding */}
      <PaddingInput
        label="Inner Padding (px)"
        value={colStyle.padding || { top: 15, right: 15, bottom: 15, left: 15 }}
        onChange={(padding) => setStyle({ padding })}
      />
    </div>
  );
}
