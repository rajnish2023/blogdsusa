import { useState } from "react";
import { X, Loader2, Copy, Check } from "lucide-react";

export default function InviteUserModal({ roles, onClose, onSubmit }) {
  const [form, setForm] = useState({ name: "", email: "", role: roles[0]?._id || "" });
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [result, setResult] = useState(null); // { temporaryPassword }
  const [copied, setCopied] = useState(false);

  const handleChange = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    setSubmitting(true);
    try {
      const data = await onSubmit(form);
      if (data?.temporaryPassword) {
        setResult(data);
      } else {
        onClose();
      }
    } catch (err) {
      setErrors(err?.response?.data?.errors || { general: err?.response?.data?.message || "Failed to create user" });
    } finally {
      setSubmitting(false);
    }
  };

  const copyPassword = () => {
    navigator.clipboard.writeText(result.temporaryPassword);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4 animate-fadeIn" onClick={onClose}>
      <div className="w-full max-w-md animate-slideUp rounded-2xl bg-paper-card shadow-pop" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-paper-line px-6 py-4">
          <h2 className="font-display text-lg font-semibold text-ink">
            {result ? "Teammate invited" : "Invite a teammate"}
          </h2>
          <button onClick={onClose} className="rounded-md p-1.5 text-muted hover:bg-paper hover:text-ink">
            <X size={18} />
          </button>
        </div>

        {result ? (
          <div className="p-6">
            <p className="text-sm text-muted">
              Share this temporary password with <strong className="text-ink">{form.name}</strong>. They should change it after their first sign in.
            </p>
            <div className="mt-4 flex items-center justify-between gap-2 rounded-lg border border-paper-line bg-paper px-3 py-2.5">
              <code className="font-mono text-sm text-ink">{result.temporaryPassword}</code>
              <button onClick={copyPassword} className="text-signal hover:text-signal-hover">
                {copied ? <Check size={16} /> : <Copy size={16} />}
              </button>
            </div>
            <button onClick={onClose} className="btn-primary mt-6 w-full justify-center">
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6">
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted">Full name</label>
                <input
                  required
                  value={form.name}
                  onChange={handleChange("name")}
                  className="w-full rounded-lg border border-paper-line bg-paper px-3 py-2.5 text-sm text-ink focus:border-signal"
                  placeholder="Jordan Lee"
                />
                {errors.name && <p className="mt-1 text-xs text-danger">{errors.name}</p>}
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted">Email</label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={handleChange("email")}
                  className="w-full rounded-lg border border-paper-line bg-paper px-3 py-2.5 text-sm text-ink focus:border-signal"
                  placeholder="jordan@dynamicssquare.com"
                />
                {errors.email && <p className="mt-1 text-xs text-danger">{errors.email}</p>}
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted">Role</label>
                <select
                  value={form.role}
                  onChange={handleChange("role")}
                  className="w-full rounded-lg border border-paper-line bg-paper px-3 py-2.5 text-sm text-ink focus:border-signal"
                >
                  {roles.map((r) => (
                    <option key={r._id} value={r._id}>
                      {r.name}
                    </option>
                  ))}
                </select>
                {errors.role && <p className="mt-1 text-xs text-danger">{errors.role}</p>}
              </div>
              {errors.general && <p className="rounded-lg bg-danger/10 px-3 py-2 text-xs font-medium text-danger">{errors.general}</p>}
              <p className="text-xs text-muted">
                A secure temporary password will be generated automatically — you'll see it once, right after this.
              </p>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button type="button" onClick={onClose} className="btn-secondary">
                Cancel
              </button>
              <button type="submit" disabled={submitting} className="btn-primary disabled:opacity-60">
                {submitting && <Loader2 size={16} className="animate-spin" />}
                Send invite
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
