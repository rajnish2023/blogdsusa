import { useState } from "react";
import { X, Loader2 } from "lucide-react";

export default function EditUserModal({ user, roles, onClose, onSubmit }) {
  const [form, setForm] = useState({ name: user.name, email: user.email, role: user.role?.id || "", designation: user.designation || "" });
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  const handleChange = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    setSubmitting(true);
    try {
      await onSubmit(form);
      onClose();
    } catch (err) {
      setErrors(err?.response?.data?.errors || { general: err?.response?.data?.message || "Failed to update user" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4 animate-fadeIn" onClick={onClose}>
      <div className="w-full max-w-md animate-slideUp rounded-2xl bg-paper-card shadow-pop" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-paper-line px-6 py-4">
          <h2 className="font-display text-lg font-semibold text-ink">Edit teammate</h2>
          <button onClick={onClose} className="rounded-md p-1.5 text-muted hover:bg-paper hover:text-ink">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted">Full name</label>
              <input
                required
                value={form.name}
                onChange={handleChange("name")}
                className="w-full rounded-lg border border-paper-line bg-paper px-3 py-2.5 text-sm text-ink focus:border-signal"
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
              />
              {errors.email && <p className="mt-1 text-xs text-danger">{errors.email}</p>}
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted">Designation</label>
              <input
                value={form.designation}
                onChange={handleChange("designation")}
                placeholder="e.g. Marketing Lead"
                className="w-full rounded-lg border border-paper-line bg-paper px-3 py-2.5 text-sm text-ink focus:border-signal"
              />
              {errors.designation && <p className="mt-1 text-xs text-danger">{errors.designation}</p>}
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
          </div>

          <div className="mt-6 flex justify-end gap-2">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="btn-primary disabled:opacity-60">
              {submitting && <Loader2 size={16} className="animate-spin" />}
              Save changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
