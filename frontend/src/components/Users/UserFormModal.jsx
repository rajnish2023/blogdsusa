import { useState, useRef } from "react";
import { X, Loader2, Copy, Check, ImagePlus } from "lucide-react";
import SchemaMarkupPanel from "../Blog/SchemaMarkupPanel";
import { uploadMedia } from "../../api/galleryApi";

export default function UserFormModal({ user, roles, mode = "edit", onClose, onSubmit }) {
  const isCreate = mode === "create";

  const [form, setForm] = useState({
    name: user?.name || "",
    email: user?.email || "",
    role: user?.role?.id || user?.role || (roles[0] && roles[0]._id) || "",
    designation: user?.designation || "",
    password: "", // For creation or regeneration
    avatarUrl: user?.avatarUrl || "",
    avatarColor: user?.avatarColor || "#3355FF",
    about: user?.about || "",
    socialLinks: {
      linkedin: user?.socialLinks?.linkedin || "",
      twitter: user?.socialLinks?.twitter || "",
      facebook: user?.socialLinks?.facebook || "",
      instagram: user?.socialLinks?.instagram || "",
    },
    schemaMarkup: user?.schemaMarkup || [],
  });

  const [tab, setTab] = useState("general"); // general, profile, social, schema
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState({});
  const [result, setResult] = useState(null); // { temporaryPassword }
  const [copied, setCopied] = useState(false);
  
  const fileRef = useRef(null);

  const handleChange = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  const handleNestedChange = (parent, field) => (e) => setForm((f) => ({ ...f, [parent]: { ...f[parent], [field]: e.target.value } }));

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const data = await uploadMedia([file], [""], () => {});
      const uploaded = data.items[0];
      setForm(f => ({ ...f, avatarUrl: uploaded.url }));
    } catch (err) {
      alert("Failed to upload image. Ensure you have gallery:upload permission.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    setSubmitting(true);
    try {
      const data = await onSubmit(form);
      if (isCreate && data?.temporaryPassword) {
        setResult(data);
      } else {
        onClose();
      }
    } catch (err) {
      setErrors(err?.response?.data?.errors || { general: err?.response?.data?.message || `Failed to ${isCreate ? "create" : "update"} user` });
    } finally {
      setSubmitting(false);
    }
  };

  const copyPassword = () => {
    navigator.clipboard.writeText(result.temporaryPassword);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  if (result) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4 animate-fadeIn" onClick={onClose}>
        <div className="w-full max-w-md animate-slideUp rounded-2xl bg-paper-card shadow-pop" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between border-b border-paper-line px-6 py-4">
            <h2 className="font-display text-lg font-semibold text-ink">Teammate invited</h2>
            <button onClick={onClose} className="rounded-md p-1.5 text-muted hover:bg-paper hover:text-ink">
              <X size={18} />
            </button>
          </div>
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
        </div>
      </div>
    );
  }

  const tabs = [
    { key: "general", label: "General" },
    { key: "profile", label: "Profile" },
    { key: "social", label: "Social" },
    { key: "schema", label: "Schema" }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4 animate-fadeIn" onClick={onClose}>
      <div className="flex w-full max-w-2xl flex-col max-h-[90vh] animate-slideUp rounded-2xl bg-paper-card shadow-pop" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-paper-line px-6 py-4 shrink-0">
          <h2 className="font-display text-lg font-semibold text-ink">
            {isCreate ? "Invite a teammate" : "Edit teammate"}
          </h2>
          <button onClick={onClose} className="rounded-md p-1.5 text-muted hover:bg-paper hover:text-ink">
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 border-b border-paper-line px-6 shrink-0 bg-paper/50">
          {tabs.map(t => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`border-b-2 py-3 text-sm font-medium transition-colors ${
                tab === t.key ? "border-signal text-signal" : "border-transparent text-muted hover:text-ink"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <form id="user-form" onSubmit={handleSubmit}>
            {tab === "general" && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-muted">Full name *</label>
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
                    <label className="mb-1.5 block text-xs font-medium text-muted">Email *</label>
                    <input
                      type="email"
                      required
                      value={form.email}
                      onChange={handleChange("email")}
                      className="w-full rounded-lg border border-paper-line bg-paper px-3 py-2.5 text-sm text-ink focus:border-signal"
                      placeholder="jordan@domain.com"
                    />
                    {errors.email && <p className="mt-1 text-xs text-danger">{errors.email}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-muted">Role *</label>
                    <select
                      required
                      value={form.role}
                      onChange={handleChange("role")}
                      className="w-full rounded-lg border border-paper-line bg-paper px-3 py-2.5 text-sm text-ink focus:border-signal"
                    >
                      <option value="">Select a role</option>
                      {roles.map((r) => (
                        <option key={r._id} value={r._id}>
                          {r.name}
                        </option>
                      ))}
                    </select>
                    {errors.role && <p className="mt-1 text-xs text-danger">{errors.role}</p>}
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-muted">Designation</label>
                    <input
                      value={form.designation}
                      onChange={handleChange("designation")}
                      className="w-full rounded-lg border border-paper-line bg-paper px-3 py-2.5 text-sm text-ink focus:border-signal"
                      placeholder="e.g. Marketing Lead"
                    />
                  </div>
                </div>

                <div className="pt-4 mt-4 border-t border-paper-line">
                  <label className="mb-1.5 block text-xs font-medium text-muted">
                    {isCreate ? "Temporary Password (Optional)" : "Set New Password (Optional)"}
                  </label>
                  <input
                    type="text"
                    value={form.password}
                    onChange={handleChange("password")}
                    className="w-full rounded-lg border border-paper-line bg-paper px-3 py-2.5 text-sm text-ink focus:border-signal"
                    placeholder={isCreate ? "Leave blank to auto-generate" : "Type to change their password"}
                  />
                  {isCreate && <p className="mt-1.5 text-xs text-muted">If left blank, a secure temporary password will be generated automatically.</p>}
                  {!isCreate && <p className="mt-1.5 text-xs text-muted">Leave blank if you don't want to change the user's current password.</p>}
                </div>
              </div>
            )}

            {tab === "profile" && (
              <div className="space-y-5">
                <div>
                  <label className="mb-2 block text-xs font-medium text-muted">Profile Image (Avatar)</label>
                  <div className="flex items-center gap-4">
                    {form.avatarUrl ? (
                      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full border border-paper-line bg-paper">
                        <img src={form.avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setForm((f) => ({ ...f, avatarUrl: "" }))}
                          className="absolute inset-0 flex items-center justify-center bg-ink/60 text-white opacity-0 transition-opacity hover:opacity-100"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => fileRef.current?.click()}
                        disabled={uploading}
                        className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-paper-line bg-paper text-muted transition-colors hover:border-ink/20"
                      >
                        {uploading ? <Loader2 size={20} className="animate-spin" /> : <ImagePlus size={20} />}
                      </button>
                    )}
                    
                    <div className="flex-1">
                      <div className="text-xs text-muted mb-2">Or pick a fallback color:</div>
                      <div className="flex flex-wrap gap-2">
                        {["#3355FF", "#FF3355", "#33FF55", "#FF9933", "#9933FF", "#33CCFF", "#222222"].map(color => (
                          <button
                            key={color}
                            type="button"
                            onClick={() => setForm(f => ({ ...f, avatarColor: color }))}
                            className={`h-6 w-6 rounded-full transition-transform ${form.avatarColor === color ? "scale-125 ring-2 ring-signal ring-offset-2" : ""}`}
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted">About / Bio</label>
                  <textarea
                    value={form.about}
                    onChange={handleChange("about")}
                    rows={4}
                    className="w-full resize-none rounded-lg border border-paper-line bg-paper px-3 py-2.5 text-sm text-ink focus:border-signal"
                    placeholder="Short description about this team member..."
                  />
                </div>
              </div>
            )}

            {tab === "social" && (
              <div className="space-y-4">
                {["linkedin", "twitter", "facebook", "instagram"].map((network) => (
                  <div key={network}>
                    <label className="mb-1.5 block text-xs font-medium text-muted capitalize">{network}</label>
                    <input
                      type="url"
                      value={form.socialLinks[network]}
                      onChange={handleNestedChange("socialLinks", network)}
                      className="w-full rounded-lg border border-paper-line bg-paper px-3 py-2.5 text-sm text-ink focus:border-signal"
                      placeholder={`https://${network}.com/username`}
                    />
                  </div>
                ))}
              </div>
            )}

            {tab === "schema" && (
              <div className="-mx-2">
                <SchemaMarkupPanel
                  entries={form.schemaMarkup || []}
                  allowedTypes={["Person", "Custom"]}
                  onChange={(val) => setForm(f => ({ ...f, schemaMarkup: val }))}
                />
              </div>
            )}

            {errors.general && <p className="mt-4 rounded-lg bg-danger/10 px-3 py-2 text-xs font-medium text-danger">{errors.general}</p>}
          </form>
        </div>

        <div className="flex justify-end gap-2 border-t border-paper-line px-6 py-4 shrink-0 bg-paper/50 rounded-b-2xl">
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button type="submit" form="user-form" disabled={submitting} className="btn-primary disabled:opacity-60">
            {submitting && <Loader2 size={16} className="animate-spin" />}
            {isCreate ? "Send invite" : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
