import { GripVertical, Trash2, Copy } from "lucide-react";
import BlockRenderer from "./BlockRenderer";

export default function BlockItem({ block, sectionId, colIndex, isSelected, onSelect, onDelete, onDuplicate, onDragStartMove, onDropAt }) {
  const style = block.style || {};
  const itemStyle = {
    marginTop: style.margin?.top ? `${style.margin.top}px` : undefined,
    marginRight: style.margin?.right ? `${style.margin.right}px` : undefined,
    marginBottom: style.margin?.bottom !== undefined ? `${style.margin.bottom}px` : "15px",
    marginLeft: style.margin?.left ? `${style.margin.left}px` : undefined,
  };

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.stopPropagation();
        onDragStartMove(e, sectionId, colIndex, block.id);
      }}
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onDrop={(e) => {
        e.stopPropagation();
        const rect = e.currentTarget.getBoundingClientRect();
        const before = e.clientY - rect.top < rect.height / 2;
        onDropAt(e, sectionId, colIndex, before ? block.id : null, before ? null : block.id);
      }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(sectionId, colIndex, block.id);
      }}
      className={`group relative cursor-pointer rounded-lg border-2 p-2 transition-colors ${
        isSelected ? "border-signal bg-signal-soft/30" : "border-transparent hover:border-paper-line"
      }`}
      style={itemStyle}
    >
      <div className="pointer-events-none">
        <BlockRenderer block={block} />
      </div>

      <div className="absolute -top-3 right-1 hidden items-center gap-1 rounded-md border border-paper-line bg-paper-card px-1 py-0.5 shadow-card group-hover:flex">
        <span className="cursor-grab px-1 text-muted active:cursor-grabbing" title="Drag to move">
          <GripVertical size={13} />
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDuplicate(sectionId, colIndex, block.id);
          }}
          className="rounded p-1 text-muted hover:text-signal"
          title="Duplicate"
        >
          <Copy size={12} />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(sectionId, colIndex, block.id);
          }}
          className="rounded p-1 text-muted hover:text-danger"
          title="Delete"
        >
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  );
}
