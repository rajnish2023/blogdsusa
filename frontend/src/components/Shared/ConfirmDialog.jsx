import { AlertTriangle } from "lucide-react";

export default function ConfirmDialog({ title, description, confirmLabel = "Delete", onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/50 p-4 animate-fadeIn" onClick={onCancel}>
      <div
        className="w-full max-w-sm animate-scaleIn rounded-2xl bg-paper-card p-6 shadow-pop"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-danger/10 text-danger">
          <AlertTriangle size={20} />
        </div>
        <h3 className="font-display text-base font-semibold text-ink">{title}</h3>
        <p className="mt-1.5 text-sm text-muted">{description}</p>
        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onCancel} className="btn-secondary">
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="inline-flex items-center gap-2 rounded-lg bg-danger px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-danger/90 active:scale-[0.98]"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
