import { useEffect, useRef } from "react";
import { sanitizePastedHtml } from "../../utils/sanitizePaste";
 
export default function SummernoteEditor({ value, onChange, placeholder = "Write your post..." }) {
  const containerRef = useRef(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    const $ = window.jQuery;
    if (!$ || !$.fn.summernote) {
      console.error("Summernote failed to load from CDN — check your internet connection.");
      return;
    }

    const $el = $(containerRef.current);

    $el.summernote({
      placeholder,
      height: 380,
      minHeight: 260,
      toolbar: [
        ["style", ["style"]],
        ["font", ["bold", "italic", "underline", "strikethrough", "clear"]],
        ["para", ["ul", "ol", "paragraph"]],
        ["insert", ["link", "picture", "table", "hr"]],
        ["view", ["fullscreen", "codeview"]],
      ],
      callbacks: {
        onChange: (contents) => onChangeRef.current?.(contents),
       
        onPaste: (e) => {
          e.preventDefault();
          const clipboard = e.originalEvent.clipboardData || window.clipboardData;
          const html = clipboard.getData("text/html");
          const plain = clipboard.getData("text/plain");

          const cleaned = html ? sanitizePastedHtml(html) : plain.replace(/\n/g, "<br>");
          $el.summernote("pasteHTML", cleaned);
        },
      },
    });

    if (value) $el.summernote("code", value);

    return () => {
      try {
        $el.summernote("destroy");
      } catch {
         
      }
    };
    
  }, []);

   
  useEffect(() => {
    const $ = window.jQuery;
    if (!$ || !$.fn.summernote || !containerRef.current) return;
    const $el = $(containerRef.current);
    const current = $el.summernote("code");
    if (value !== undefined && value !== current) {
      $el.summernote("code", value || "");
    }
  }, [value]);

  return (
    <div className="summernote-wrapper rounded-xl border border-paper-line overflow-hidden">
      <div ref={containerRef} />
    </div>
  );
}
