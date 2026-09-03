import { X } from "lucide-react";
import BlockRenderer from "./BlockRenderer";

const paddingClass = { compact: "py-4", normal: "py-10", spacious: "py-20", custom: "" };

export default function PagePreviewModal({ sections, title, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-paper animate-fadeIn">
      <div className="flex items-center justify-between border-b border-paper-line bg-paper-card px-6 py-3">
        <p className="text-sm font-medium text-ink">Preview — {title || "Untitled page"}</p>
        <button onClick={onClose} className="rounded-md p-2 text-muted hover:bg-paper hover:text-ink">
          <X size={18} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-5xl py-8">
          {sections.length === 0 && <p className="py-24 text-center text-sm text-muted">This page has no content yet.</p>}
          {sections.map((section) => {
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
              <div key={section.id} className={`px-4 ${paddingClass[section.paddingY]}`} style={customStyle}>
                <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${section.columns}, minmax(0, 1fr))` }}>
                  {section.columnBlocks.map((blocks, i) => {
                    const colStyle = section.columnStyles?.[i] || {};
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
                      <div key={i} className="space-y-2" style={colRenderStyle}>
                        {blocks.map((block) => (
                          <BlockRenderer key={block.id} block={block} />
                        ))}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
