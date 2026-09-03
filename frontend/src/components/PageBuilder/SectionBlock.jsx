import { ChevronUp, ChevronDown, Trash2, Columns as ColumnsIcon, Copy, Layout as LayoutIcon } from "lucide-react";
import BlockItem from "./BlockItem";

const paddingClass = { compact: "py-4", normal: "py-10", spacious: "py-20", custom: "" };

export default function SectionBlock({
  section,
  isSelected,
  selectedBlockId,
  selectedColumnIndex,
  onSelectSection,
  onSelectColumn,
  onSelectBlock,
  onDeleteSection,
  onDuplicateSection,
  onMoveSectionUp,
  onMoveSectionDown,
  canMoveUp,
  canMoveDown,
  onDeleteBlock,
  onDuplicateBlock,
  onDragStartMove,
  onDropAt,
}) {
  // Compile background style
  let bgStyle = {};
  if (section.background) {
    if (section.background.startsWith("linear-gradient") || section.background.startsWith("url")) {
      bgStyle.backgroundImage = section.background;
      bgStyle.backgroundSize = "cover";
      bgStyle.backgroundPosition = "center";
    } else {
      bgStyle.backgroundColor = section.background;
    }
  }

  // Compile margin/padding styles
  const customStyle = {
    ...bgStyle,
    marginTop: section.style?.margin?.top ? `${section.style.margin.top}px` : undefined,
    marginRight: section.style?.margin?.right ? `${section.style.margin.right}px` : undefined,
    marginBottom: section.style?.margin?.bottom ? `${section.style.margin.bottom}px` : undefined,
    marginLeft: section.style?.margin?.left ? `${section.style.margin.left}px` : undefined,
    paddingTop: section.style?.padding?.top ? `${section.style.padding.top}px` : undefined,
    paddingRight: section.style?.padding?.right ? `${section.style.padding.right}px` : undefined,
    paddingBottom: section.style?.padding?.bottom ? `${section.style.padding.bottom}px` : undefined,
    paddingLeft: section.style?.padding?.left ? `${section.style.padding.left}px` : undefined,
  };

  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        onSelectSection(section.id);
      }}
      className={`group/section relative rounded-xl border-2 transition-colors ${
        isSelected && selectedColumnIndex === null ? "border-signal bg-signal-soft/5" : "border-transparent hover:border-paper-line"
      }`}
      style={customStyle}
    >
      <div className={`px-4 ${paddingClass[section.paddingY]}`}>
        <div
          className="grid gap-4"
          style={{ gridTemplateColumns: `repeat(${section.columns}, minmax(0, 1fr))` }}
        >
          {section.columnBlocks.map((blocks, colIndex) => {
            const colStyle = section.columnStyles?.[colIndex] || {};
            const isColSelected = isSelected && selectedColumnIndex === colIndex;

            const colRenderStyle = {
              backgroundColor: colStyle.backgroundColor || undefined,
              paddingTop: colStyle.padding?.top !== undefined ? `${colStyle.padding.top}px` : "15px",
              paddingRight: colStyle.padding?.right !== undefined ? `${colStyle.padding.right}px` : "15px",
              paddingBottom: colStyle.padding?.bottom !== undefined ? `${colStyle.padding.bottom}px` : "15px",
              paddingLeft: colStyle.padding?.left !== undefined ? `${colStyle.padding.left}px` : "15px",
              display: "flex",
              flexDirection: "column",
              justifyContent: colStyle.textAlign === "middle" ? "center" : colStyle.textAlign === "bottom" ? "flex-end" : "flex-start",
            };

            return (
              <div
                key={colIndex}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  onDropAt(e, section.id, colIndex, null, null);
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectColumn(section.id, colIndex);
                }}
                className={`group/col relative min-h-[72px] rounded-lg border-2 transition-all ${
                  isColSelected ? "border-signal bg-signal-soft/10" : "border-dashed border-paper-line/30 hover:border-paper-line"
                }`}
                style={colRenderStyle}
              >
                {/* Elementor column edit handle */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectColumn(section.id, colIndex);
                  }}
                  className="absolute -top-2.5 -left-2.5 z-10 hidden h-5 w-5 items-center justify-center rounded bg-signal text-white shadow hover:bg-signal/90 group-hover/col:flex transition-transform active:scale-90"
                  title="Edit column"
                >
                  <LayoutIcon size={10} />
                </button>

                {blocks.length === 0 && (
                  <div className="flex h-16 items-center justify-center rounded-lg border border-dashed border-paper-line/50 text-[10px] text-muted">
                    Drop widget here
                  </div>
                )}
                {blocks.map((block) => (
                  <BlockItem
                    key={block.id}
                    block={block}
                    sectionId={section.id}
                    colIndex={colIndex}
                    isSelected={selectedBlockId === block.id}
                    onSelect={onSelectBlock}
                    onDelete={onDeleteBlock}
                    onDuplicate={onDuplicateBlock}
                    onDragStartMove={onDragStartMove}
                    onDropAt={onDropAt}
                  />
                ))}
              </div>
            );
          })}
        </div>
      </div>

      {/* Section Controls Overlay */}
      <div className="absolute -top-4 left-1/2 hidden -translate-x-1/2 items-center gap-1 rounded-md border border-paper-line bg-paper-card px-1.5 py-1 shadow-card group-hover/section:flex z-20">
        <ColumnsIcon size={12} className="text-muted" />
        <span className="mr-1 text-[10px] font-medium text-muted">{section.columns} col</span>
        <button disabled={!canMoveUp} onClick={(e) => { e.stopPropagation(); onMoveSectionUp(section.id); }} className="rounded p-1 text-muted hover:text-signal disabled:opacity-30" title="Move up">
          <ChevronUp size={13} />
        </button>
        <button disabled={!canMoveDown} onClick={(e) => { e.stopPropagation(); onMoveSectionDown(section.id); }} className="rounded p-1 text-muted hover:text-signal disabled:opacity-30" title="Move down">
          <ChevronDown size={13} />
        </button>
        <button onClick={(e) => { e.stopPropagation(); onDuplicateSection(section.id); }} className="rounded p-1 text-muted hover:text-signal" title="Duplicate section">
          <Copy size={13} />
        </button>
        <button onClick={(e) => { e.stopPropagation(); onDeleteSection(section.id); }} className="rounded p-1 text-muted hover:text-danger" title="Delete section">
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}
