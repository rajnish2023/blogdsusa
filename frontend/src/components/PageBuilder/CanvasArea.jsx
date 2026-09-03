import { useState } from "react";
import { LayoutTemplate, Plus, X } from "lucide-react";
import SectionBlock from "./SectionBlock";
import { SECTION_SNIPPETS } from "../../utils/pageBlocks";

export default function CanvasArea({
  sections,
  selection,
  selectedColumnIndex,
  onSelectSection,
  onSelectColumn,
  onSelectBlock,
  onDeselect,
  onDeleteSection,
  onDuplicateSection,
  onMoveSectionUp,
  onMoveSectionDown,
  onDeleteBlock,
  onDuplicateBlock,
  onDragStartMove,
  onDropAt,
  onAddSection,
  onInsertSectionAt,
}) {
  const [openInsertIndex, setOpenInsertIndex] = useState(null);

  const InsertDivider = ({ afterIndex }) => (
    <div className="relative flex items-center justify-center py-1.5 group/insert">
      {/* Dashed line */}
      <div className="absolute inset-x-8 h-px border-t border-dashed border-paper-line group-hover/insert:border-signal/40 transition-colors" />
      {/* Plus button */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpenInsertIndex(openInsertIndex === afterIndex ? null : afterIndex);
        }}
        className="relative z-10 flex h-6 w-6 items-center justify-center rounded-full border-2 border-paper-line bg-paper-card text-muted hover:border-signal hover:text-signal hover:bg-signal-soft hover:scale-110 transition-all shadow-sm"
        title="Insert section here"
      >
        {openInsertIndex === afterIndex ? <X size={11} /> : <Plus size={11} />}
      </button>

      {/* Dropdown popover */}
      {openInsertIndex === afterIndex && (
        <div
          className="absolute top-full left-1/2 -translate-x-1/2 mt-2 z-30 w-72 rounded-xl border border-paper-line bg-paper-card shadow-xl p-3"
          onClick={(e) => e.stopPropagation()}
        >
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted mb-2">Blank Section</p>
          <div className="grid grid-cols-3 gap-1.5 mb-3">
            {[1, 2, 3].map((cols) => (
              <button
                key={cols}
                onClick={() => {
                  onAddSection(cols, afterIndex);
                  setOpenInsertIndex(null);
                }}
                className="rounded-lg border border-paper-line py-2 text-[10px] font-medium text-muted hover:border-signal hover:text-signal hover:bg-signal-soft/10 transition-colors"
              >
                {cols} col
              </button>
            ))}
          </div>

          {SECTION_SNIPPETS.length > 0 && (
            <>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted mb-2 border-t border-paper-line pt-2">Pre-built Sections</p>
              <div className="space-y-1.5 max-h-52 overflow-y-auto">
                {SECTION_SNIPPETS.map((snippet) => (
                  <button
                    key={snippet.id}
                    onClick={() => {
                      onInsertSectionAt(afterIndex, snippet.section);
                      setOpenInsertIndex(null);
                    }}
                    className="w-full text-left rounded-lg border border-paper-line p-2.5 hover:border-signal hover:bg-signal-soft/10 transition-all group"
                  >
                    <p className="text-[11px] font-bold text-ink group-hover:text-signal transition-colors">{snippet.name}</p>
                    <p className="text-[9px] text-muted leading-snug mt-0.5">{snippet.description}</p>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );

  if (sections.length === 0) {
    return (
      <div className="flex h-full min-h-[400px] flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-paper-line text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-signal-soft text-signal">
          <LayoutTemplate size={26} />
        </div>
        <p className="font-display text-base font-semibold text-ink">Start building your page</p>
        <p className="max-w-xs text-sm text-muted">Add a section from the left panel, then drag widgets into its columns.</p>
      </div>
    );
  }

  return (
    <div
      onClick={(e) => {
        onDeselect();
        setOpenInsertIndex(null);
      }}
      className="space-y-0 pb-10"
    >
      {sections.map((section, i) => (
        <div key={section.id}>
          {/* Insert divider BEFORE each section */}
          <InsertDivider afterIndex={i - 1} />
          <SectionBlock
            section={section}
            isSelected={selection?.sectionId === section.id}
            selectedBlockId={selection?.type === "block" ? selection.blockId : null}
            selectedColumnIndex={selection?.sectionId === section.id ? selectedColumnIndex : null}
            onSelectSection={onSelectSection}
            onSelectColumn={onSelectColumn}
            onSelectBlock={onSelectBlock}
            onDeleteSection={onDeleteSection}
            onDuplicateSection={onDuplicateSection}
            onMoveSectionUp={onMoveSectionUp}
            onMoveSectionDown={onMoveSectionDown}
            canMoveUp={i > 0}
            canMoveDown={i < sections.length - 1}
            onDeleteBlock={onDeleteBlock}
            onDuplicateBlock={onDuplicateBlock}
            onDragStartMove={onDragStartMove}
            onDropAt={onDropAt}
          />
        </div>
      ))}
      {/* Insert divider AFTER the last section */}
      <InsertDivider afterIndex={sections.length - 1} />
    </div>
  );
}
