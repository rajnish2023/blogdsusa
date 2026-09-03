import { Columns, Columns2, Columns3 } from "lucide-react";
import { WIDGETS, TEMPLATES } from "../../utils/pageBlocks";

export default function WidgetPalette({ onAddSection, onImportTemplate }) {
  return (
    <div className="flex h-full flex-col overflow-y-auto">
      {/* Column grids */}
      <div className="border-b border-paper-line p-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Add section</p>
        <div className="grid grid-cols-3 gap-1.5">
          <button onClick={() => onAddSection(1)} title="1 column" className="flex flex-col items-center gap-1 rounded-lg border border-paper-line py-2.5 text-muted hover:border-signal hover:text-signal">
            <Columns size={16} />
            <span className="text-[10px] font-medium">1 col</span>
          </button>
          <button onClick={() => onAddSection(2)} title="2 columns" className="flex flex-col items-center gap-1 rounded-lg border border-paper-line py-2.5 text-muted hover:border-signal hover:text-signal">
            <Columns2 size={16} />
            <span className="text-[10px] font-medium">2 col</span>
          </button>
          <button onClick={() => onAddSection(3)} title="3 columns" className="flex flex-col items-center gap-1 rounded-lg border border-paper-line py-2.5 text-muted hover:border-signal hover:text-signal">
            <Columns3 size={16} />
            <span className="text-[10px] font-medium">3 col</span>
          </button>
        </div>
      </div>

      {/* Widgets list */}
      <div className="border-b border-paper-line p-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Widgets</p>
        <p className="mb-3 text-[11px] leading-snug text-muted">Drag a widget into any column on the canvas.</p>
        <div className="grid grid-cols-2 gap-2">
          {WIDGETS.map((w) => (
            <div
              key={w.type}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData("application/x-new-block", w.type);
                e.dataTransfer.effectAllowed = "copy";
              }}
              className="flex cursor-grab flex-col items-center gap-1.5 rounded-lg border border-paper-line bg-paper-card py-3 text-muted transition-colors hover:border-signal hover:text-signal active:cursor-grabbing"
            >
              <w.icon size={18} />
              <span className="text-[11px] font-medium">{w.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Page Templates */}
      {onImportTemplate && (
        <div className="p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Page Templates</p>
          <p className="mb-3 text-[11px] leading-snug text-muted">Click to append layout sections instantly.</p>
          <div className="space-y-2">
            {TEMPLATES.map((tpl) => (
              <button
                key={tpl.id}
                type="button"
                onClick={() => onImportTemplate(tpl.sections, tpl.id)}
                className="w-full text-left rounded-lg border border-paper-line bg-paper-card p-3 hover:border-signal hover:bg-signal-soft/10 transition-all group scale-100 active:scale-98 shadow-sm"
              >
                <p className="text-xs font-bold text-ink group-hover:text-signal transition-colors">{tpl.name}</p>
                <p className="text-[10px] text-muted leading-relaxed mt-1">{tpl.description}</p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
