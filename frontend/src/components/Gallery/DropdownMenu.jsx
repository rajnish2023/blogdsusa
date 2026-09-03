import { useEffect, useRef, useState } from "react";
import { MoreVertical, Link2, Download, Trash2, Check } from "lucide-react";
import { createPortal } from "react-dom";

export default function DropdownMenu({ onCopyLink, onDownload, onDelete }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const btnRef = useRef(null);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClick = (e) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target) &&
        !btnRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const toggleOpen = () => {
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setCoords({ top: rect.bottom + 6, left: rect.right - 176 });
    }
    setOpen((o) => !o);
  };

  const handleCopy = (e) => {
    e.stopPropagation();
    onCopyLink();
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
    setTimeout(() => setOpen(false), 600);
  };

  return (
    <>
      <button
        ref={btnRef}
        onClick={(e) => {
          e.stopPropagation();
          toggleOpen();
        }}
        className="flex h-8 w-8 items-center justify-center rounded-md bg-ink/60 text-white backdrop-blur-sm transition-colors hover:bg-ink/80"
        aria-label="More options"
      >
        <MoreVertical size={16} />
      </button>

      {open &&
        createPortal(
          <div
            ref={menuRef}
            style={{ top: coords.top, left: coords.left }}
            className="fixed z-[100] w-44 animate-scaleIn origin-top-right rounded-xl border border-paper-line bg-paper-card p-1.5 shadow-pop"
          >
            <button
              onClick={handleCopy}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium text-ink hover:bg-paper"
            >
              {copied ? <Check size={15} className="text-success" /> : <Link2 size={15} />}
              {copied ? "Link copied" : "Copy link"}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDownload();
                setOpen(false);
              }}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium text-ink hover:bg-paper"
            >
              <Download size={15} />
              Download
            </button>
            {onDelete && (
              <>
                <div className="my-1 h-px bg-paper-line" />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                    setOpen(false);
                  }}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium text-danger hover:bg-danger/5"
                >
                  <Trash2 size={15} />
                  Delete
                </button>
              </>
            )}
          </div>,
          document.body
        )}
    </>
  );
}
