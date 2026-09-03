import { useEffect } from "react";
import { CheckCircle2, XCircle } from "lucide-react";

export default function Toast({ toast, onDismiss }) {
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(onDismiss, 2500);
    return () => clearTimeout(t);
  }, [toast, onDismiss]);

  if (!toast) return null;

  return (
    <div className="fixed bottom-6 left-1/2 z-[70] -translate-x-1/2 animate-slideUp">
      <div
        className={`flex items-center gap-2.5 rounded-xl px-4 py-3 text-sm font-medium text-white shadow-pop ${
          toast.type === "error" ? "bg-danger" : "bg-ink"
        }`}
      >
        {toast.type === "error" ? <XCircle size={16} /> : <CheckCircle2 size={16} className="text-success" />}
        {toast.message}
      </div>
    </div>
  );
}
