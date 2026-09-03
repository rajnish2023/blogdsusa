import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Table from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableHeader from "@tiptap/extension-table-header";
import TableCell from "@tiptap/extension-table-cell";
import Placeholder from "@tiptap/extension-placeholder";
import { useEffect, useRef, useState, useCallback } from "react";
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  Heading1, Heading2, Heading3, Heading4, Heading5, Heading6,
  List, ListOrdered, Quote, Pilcrow,
  Link as LinkIcon, Undo, Redo, Eraser, Code, ImagePlus, Upload,
  Table as TableIcon, Rows3, Columns3, Trash2, FileCode2, Loader2,
  Maximize, Minimize,
} from "lucide-react";
import { uploadMedia } from "../../api/galleryApi";

/* ── Paste sanitizer: strips all inline styles, classes, and Word junk ── */
function sanitizePastedHTML(html) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  // Remove Word-specific XML tags like <o:p>, <w:Sdt>, <v:shape> etc.
  doc.querySelectorAll("o\\:p, w\\:Sdt, v\\:shape, v\\:shapetype, v\\:fill, v\\:stroke, v\\:path, v\\:textbox, xml").forEach((el) => el.remove());

  // Remove <style> and <meta> tags that Word injects
  doc.querySelectorAll("style, meta, link, script, title").forEach((el) => el.remove());

  // Remove all comments
  const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_COMMENT);
  const comments = [];
  while (walker.nextNode()) comments.push(walker.currentNode);
  comments.forEach((c) => c.remove());

  // Walk every element and strip style, class, and Word-specific attributes
  doc.body.querySelectorAll("*").forEach((el) => {
    el.removeAttribute("style");
    el.removeAttribute("class");
    el.removeAttribute("lang");
    el.removeAttribute("dir");
    // Remove any attribute starting with "mso-" or "data-"
    [...el.attributes].forEach((attr) => {
      if (/^(mso|data-|v:|o:|w:)/.test(attr.name)) {
        el.removeAttribute(attr.name);
      }
    });

    // Replace <span> wrappers that have no attributes left (Word loves these)
    if (el.tagName === "SPAN" && el.attributes.length === 0) {
      el.replaceWith(...el.childNodes);
    }
  });

  // Remove empty paragraphs that Word likes to insert (but keep <br>)
  doc.body.querySelectorAll("p").forEach((p) => {
    if (!p.textContent.trim() && !p.querySelector("img, br, table")) {
      p.remove();
    }
  });

  return doc.body.innerHTML;
}

function ToolbarButton({ onClick, active, disabled, title, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`flex h-7 w-7 items-center justify-center rounded-md transition-colors text-[13px] disabled:cursor-not-allowed disabled:opacity-30 ${
        active ? "bg-signal text-white" : "text-muted hover:bg-paper hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}

function ToolbarDivider() {
  return <div className="mx-0.5 h-5 w-px bg-paper-line" />;
}

/* ── Heading dropdown instead of 6 separate buttons ── */
function HeadingDropdown({ editor, disabled }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const levels = [
    { level: null, label: "Paragraph", icon: <Pilcrow size={14} /> },
    { level: 1, label: "Heading 1", icon: <Heading1 size={14} /> },
    { level: 2, label: "Heading 2", icon: <Heading2 size={14} /> },
    { level: 3, label: "Heading 3", icon: <Heading3 size={14} /> },
    { level: 4, label: "Heading 4", icon: <Heading4 size={14} /> },
    { level: 5, label: "Heading 5", icon: <Heading5 size={14} /> },
    { level: 6, label: "Heading 6", icon: <Heading6 size={14} /> },
  ];

  const activeLevel = [1, 2, 3, 4, 5, 6].find((l) => editor.isActive("heading", { level: l }));
  const activeIcon = activeLevel
    ? levels.find((l) => l.level === activeLevel)?.icon
    : <Pilcrow size={14} />;
  const activeLabel = activeLevel ? `H${activeLevel}` : "P";

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(!open)}
        className={`flex h-7 items-center gap-1 rounded-md px-1.5 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-30 ${
          activeLevel ? "bg-signal/10 text-signal" : "text-muted hover:bg-paper hover:text-ink"
        }`}
        title="Text style"
      >
        {activeIcon}
        <span className="hidden sm:inline">{activeLabel}</span>
        <svg className="h-3 w-3 opacity-50" viewBox="0 0 12 12" fill="none"><path d="M3 5l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </button>
      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 min-w-[160px] rounded-lg border border-paper-line bg-paper-card py-1 shadow-pop">
          {levels.map((item) => {
            const isActive = item.level === null
              ? !activeLevel
              : editor.isActive("heading", { level: item.level });
            return (
              <button
                key={item.level ?? "p"}
                type="button"
                onClick={() => {
                  if (item.level === null) {
                    editor.chain().focus().setParagraph().run();
                  } else {
                    editor.chain().focus().toggleHeading({ level: item.level }).run();
                  }
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-2 px-3 py-1.5 text-xs transition-colors ${
                  isActive ? "bg-signal/10 text-signal font-semibold" : "text-ink hover:bg-paper"
                }`}
              >
                {item.icon}
                {item.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function TipTapEditor({ value, onChange, placeholder = "Write your post...", variant = "default", fullHeight = false }) {
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [codeView, setCodeView] = useState(false);
  const [codeDraft, setCodeDraft] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);

  const isMinimal = variant === "minimal";

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: isMinimal ? false : { levels: [1, 2, 3, 4, 5, 6] },
        blockquote: isMinimal ? false : {},
        bulletList: isMinimal ? false : {},
        orderedList: isMinimal ? false : {},
        codeBlock: isMinimal ? false : {},
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        autolink: true,
        protocols: ["http", "https", "mailto"],
        validate: (href) => /^https?:\/\//.test(href) || /^mailto:/.test(href),
      }),
      ...(isMinimal
        ? []
        : [
            Image.configure({ inline: false, allowBase64: false }),
            Table.configure({ resizable: false }),
            TableRow,
            TableHeader,
            TableCell,
          ]),
      Placeholder.configure({ placeholder }),
    ],
    content: value || "",
    onUpdate: ({ editor: ed }) => onChange?.(ed.getHTML()),
    editorProps: {
      attributes: {
        class: `tiptap-content px-4 py-3 focus:outline-none ${isMinimal ? "min-h-[80px]" : fullHeight || isFullscreen ? "min-h-[400px]" : "min-h-[260px]"}`,
      },
      // Strip all inline CSS / Word junk when pasting
      transformPastedHTML(html) {
        return sanitizePastedHTML(html);
      },
    },
  });

  useEffect(() => {
    if (!editor || codeView) return;
    const current = editor.getHTML();
    if (value !== undefined && value !== current) {
      editor.commands.setContent(value || "", false);
    }
  }, [value, editor, codeView]);

  // Escape key exits fullscreen
  useEffect(() => {
    if (!isFullscreen) return;
    const onKey = (e) => { if (e.key === "Escape") setIsFullscreen(false); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isFullscreen]);

  if (!editor) return null;

  const setLink = () => {
    const previous = editor.getAttributes("link").href;
    const url = window.prompt("Link URL", previous || "https://");
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };

  const insertImageByUrl = () => {
    const url = window.prompt("Image URL", "https://");
    if (!url) return;
    const alt = window.prompt("Alt text (optional, recommended for SEO)", "") || "";
    editor.chain().focus().setImage({ src: url, alt }).run();
  };

  const triggerUpload = () => fileInputRef.current?.click();

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const data = await uploadMedia([file], [""], () => {});
      const uploaded = data.items[0];
      editor.chain().focus().setImage({ src: uploaded.url, alt: uploaded.alt || file.name }).run();
    } catch (err) {
      window.alert(err?.response?.data?.message || "Upload failed — this needs gallery:upload permission");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const insertTable = () => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  const inTable = editor.isActive("table");

  // Pretty-print HTML:
  // - h1-h6 and p stay as ONE complete line  e.g.  <h2>Title</h2>
  // - container tags (ul, ol, li, table, etc.) each get their own line
  // - no double blank lines between blocks
  const formatHTML = (html) => {
    if (!html) return "";

    // Step 1: normalise — collapse all existing whitespace/newlines to single spaces
    let out = html.replace(/\s*\n\s*/g, " ").replace(/\s{2,}/g, " ").trim();

    // Step 2: single-line tags — h1-h6, p  → newline BEFORE opening, nothing extra inside
    const singleLine = "p|h[1-6]|blockquote|pre|hr";
    const slRx = new RegExp(`(<(?:${singleLine})[^>]*>[\\s\\S]*?</(?:${singleLine})>)`, "gi");
    out = out.replace(slRx, "\n$1");

    // Step 3: container tags — ul, ol, li, table rows/cells get their own lines
    const container = "ul|ol|li|div|figure|table|thead|tbody|tr|td|th|figcaption";
    const openRx  = new RegExp(`(<(?:${container})[^>]*>)`, "gi");
    const closeRx = new RegExp(`(<\/(?:${container})>)`, "gi");
    out = out
      .replace(openRx,  "\n$1")
      .replace(closeRx, "$1\n");

    // Step 4: tidy — collapse 2+ blank lines into one, trim edges
    return out
      .replace(/\n{2,}/g, "\n")
      .replace(/^\n+/, "")
      .trim();
  };

  const toggleCodeView = () => {
    if (!codeView) {
      setCodeDraft(formatHTML(editor.getHTML()));
      setCodeView(true);
    } else {
      editor.commands.setContent(codeDraft || "", true);
      onChange?.(editor.getHTML());
      setCodeView(false);
    }
  };

  const editorBody = (
    <div className={`overflow-hidden rounded-xl border border-paper-line bg-paper-card shadow-card ${fullHeight || isFullscreen ? "flex flex-col h-full" : ""}`}>
      {/* ─── Toolbar ─── */}
      <div className="flex flex-wrap items-center gap-0.5 border-b border-paper-line bg-paper px-2 py-1 sticky top-0 z-10">
        {/* Heading / Paragraph dropdown */}
        {!isMinimal && (
          <>
            <HeadingDropdown editor={editor} disabled={codeView} />
            <ToolbarDivider />
          </>
        )}

        {/* Inline formatting */}
        <ToolbarButton title="Bold (Ctrl+B)" active={editor.isActive("bold")} disabled={codeView} onClick={() => editor.chain().focus().toggleBold().run()}>
          <Bold size={15} />
        </ToolbarButton>
        <ToolbarButton title="Italic (Ctrl+I)" active={editor.isActive("italic")} disabled={codeView} onClick={() => editor.chain().focus().toggleItalic().run()}>
          <Italic size={15} />
        </ToolbarButton>
        <ToolbarButton title="Underline (Ctrl+U)" active={editor.isActive("underline")} disabled={codeView} onClick={() => editor.chain().focus().toggleUnderline().run()}>
          <UnderlineIcon size={15} />
        </ToolbarButton>
        <ToolbarButton title="Strikethrough" active={editor.isActive("strike")} disabled={codeView} onClick={() => editor.chain().focus().toggleStrike().run()}>
          <Strikethrough size={15} />
        </ToolbarButton>
        {!isMinimal && (
          <ToolbarButton title="Inline code" active={editor.isActive("code")} disabled={codeView} onClick={() => editor.chain().focus().toggleCode().run()}>
            <Code size={15} />
          </ToolbarButton>
        )}

        <ToolbarDivider />

        {/* Lists, quote */}
        {!isMinimal && (
          <>
            <ToolbarButton title="Bullet list" active={editor.isActive("bulletList")} disabled={codeView} onClick={() => editor.chain().focus().toggleBulletList().run()}>
              <List size={15} />
            </ToolbarButton>
            <ToolbarButton title="Numbered list" active={editor.isActive("orderedList")} disabled={codeView} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
              <ListOrdered size={15} />
            </ToolbarButton>
            <ToolbarButton title="Quote" active={editor.isActive("blockquote")} disabled={codeView} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
              <Quote size={15} />
            </ToolbarButton>
          </>
        )}
        <ToolbarButton title="Link" active={editor.isActive("link")} disabled={codeView} onClick={setLink}>
          <LinkIcon size={15} />
        </ToolbarButton>

        {/* Media & table */}
        {!isMinimal && (
          <>
            <ToolbarDivider />
            <ToolbarButton title="Insert image by URL" disabled={codeView} onClick={insertImageByUrl}>
              <ImagePlus size={15} />
            </ToolbarButton>
            <ToolbarButton title="Upload image" disabled={codeView || uploading} onClick={triggerUpload}>
              {uploading ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
            </ToolbarButton>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />

            <ToolbarButton title="Insert table" active={inTable} disabled={codeView} onClick={insertTable}>
              <TableIcon size={15} />
            </ToolbarButton>
            {inTable && !codeView && (
              <>
                <ToolbarButton title="Add row below" onClick={() => editor.chain().focus().addRowAfter().run()}>
                  <Rows3 size={15} />
                </ToolbarButton>
                <ToolbarButton title="Add column right" onClick={() => editor.chain().focus().addColumnAfter().run()}>
                  <Columns3 size={15} />
                </ToolbarButton>
                <ToolbarButton title="Delete table" onClick={() => editor.chain().focus().deleteTable().run()}>
                  <Trash2 size={15} />
                </ToolbarButton>
              </>
            )}
          </>
        )}

        <ToolbarDivider />

        {/* Utilities */}
        <ToolbarButton title="Clear formatting" disabled={codeView} onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()}>
          <Eraser size={15} />
        </ToolbarButton>
        <ToolbarButton title="Undo (Ctrl+Z)" disabled={codeView || !editor.can().undo()} onClick={() => editor.chain().focus().undo().run()}>
          <Undo size={15} />
        </ToolbarButton>
        <ToolbarButton title="Redo (Ctrl+Shift+Z)" disabled={codeView || !editor.can().redo()} onClick={() => editor.chain().focus().redo().run()}>
          <Redo size={15} />
        </ToolbarButton>

        {!isMinimal && (
          <>
            <ToolbarDivider />
            <ToolbarButton title={codeView ? "Back to visual editor" : "View/edit HTML source"} active={codeView} onClick={toggleCodeView}>
              <FileCode2 size={15} />
            </ToolbarButton>
            <ToolbarButton title={isFullscreen ? "Exit fullscreen (Esc)" : "Fullscreen editor"} active={isFullscreen} onClick={() => setIsFullscreen(!isFullscreen)}>
              {isFullscreen ? <Minimize size={15} /> : <Maximize size={15} />}
            </ToolbarButton>
          </>
        )}
      </div>

      {/* ─── Editor body ─── */}
      {codeView ? (
        <textarea
          value={codeDraft}
          onChange={(e) => setCodeDraft(e.target.value)}
          spellCheck={false}
          rows={16}
          placeholder="<p>Post HTML...</p>"
          className={`w-full resize-y bg-ink px-5 py-4 font-mono text-sm leading-relaxed text-white placeholder:text-white/30 focus:outline-none ${isFullscreen ? "flex-1" : ""}`}
        />
      ) : (
        <div className={`flex flex-col ${fullHeight || isFullscreen ? "flex-1 overflow-hidden" : ""}`}>
          <div className={fullHeight || isFullscreen ? "flex-1 overflow-y-auto" : ""}>
            <EditorContent editor={editor} />
          </div>
          <div className="flex items-center justify-between border-t border-paper-line bg-paper px-3 py-1.5 text-[10px] uppercase tracking-wider text-muted font-semibold">
            <span>{editor ? editor.getText().trim().split(/\s+/).filter(Boolean).length : 0} words</span>
            {isFullscreen && <span>Press ESC to exit</span>}
          </div>
        </div>
      )}
    </div>
  );

  // Fullscreen overlay
  if (isFullscreen) {
    return (
      <div className="fixed inset-0 z-[9999] flex flex-col bg-paper">
        {editorBody}
      </div>
    );
  }

  return editorBody;
}
