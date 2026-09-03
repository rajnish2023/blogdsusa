import { useRef, useState } from "react";
import { Camera, Loader2, Briefcase, Mail, ShieldCheck } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { Avatar, RoleBadge } from "../components/Users/Badges";
import Toast from "../components/Shared/Toast";
import { updateMyProfile, uploadMyAvatar, changeMyPassword } from "../api/userApi";

export default function ProfilePage() {
  const { user, updateUserLocal } = useAuth();
  const fileRef = useRef(null);

  const [name, setName] = useState(user?.name || "");
  const [about, setAbout] = useState(user?.about || "");
  
  const [socialLinks, setSocialLinks] = useState(user?.socialLinks || { linkedin: "", twitter: "", facebook: "", instagram: "" });
  const initialSchemaJson = (user?.schemaMarkup || []).find(s => s.type === "Person")?.json || "";
  const [schemaJson, setSchemaJson] = useState(initialSchemaJson);

  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const [pwForm, setPwForm] = useState({ currentPassword: "", newPassword: "", confirm: "" });
  const [pwError, setPwError] = useState(null);
  const [changingPw, setChangingPw] = useState(false);

  const [toast, setToast] = useState(null);
  const showToast = (message, type = "success") => setToast({ message, type });

  if (!user) return null;

  const handleAvatarPick = () => fileRef.current?.click();

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    try {
      const updated = await uploadMyAvatar(file);
      updateUserLocal(updated);
      showToast("Profile picture updated");
    } catch (err) {
      showToast(err?.response?.data?.message || "Failed to upload picture", "error");
    } finally {
      setUploadingAvatar(false);
      e.target.value = "";
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const updated = await updateMyProfile({ 
        name, 
        about,
        socialLinks,
        schemaMarkup: schemaJson ? [{ type: "Person", json: schemaJson }] : []
      });
      updateUserLocal(updated);
      showToast("Profile saved");
    } catch (err) {
      showToast(err?.response?.data?.message || "Failed to save profile", "error");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwError(null);
    if (pwForm.newPassword !== pwForm.confirm) {
      setPwError("New passwords don't match");
      return;
    }
    setChangingPw(true);
    try {
      await changeMyPassword(pwForm.currentPassword, pwForm.newPassword);
      showToast("Password changed");
      setPwForm({ currentPassword: "", newPassword: "", confirm: "" });
    } catch (err) {
      setPwError(err?.response?.data?.message || err?.response?.data?.errors?.newPassword || "Failed to change password");
    } finally {
      setChangingPw(false);
    }
  };

  return (
    <div className="flex h-screen flex-1 flex-col overflow-hidden">
      <header className="border-b border-paper-line bg-paper-card px-8 py-6">
        <h1 className="font-display text-2xl font-semibold text-ink">My Profile</h1>
        <p className="mt-1 text-sm text-muted">Manage your photo, bio, and account security.</p>
      </header>

      <main className="flex-1 overflow-y-auto px-8 py-6">
        <div className="mx-auto max-w-2xl space-y-6">
          {/* Identity card */}
          <div className="rounded-2xl border border-paper-line bg-paper-card p-6 shadow-card">
            <div className="flex items-center gap-5">
              <div className="group relative">
                <Avatar name={user.name} color={user.avatarColor} avatarUrl={user.avatarUrl} size={72} />
                <button
                  onClick={handleAvatarPick}
                  disabled={uploadingAvatar}
                  className="absolute inset-0 flex items-center justify-center rounded-full bg-ink/0 text-white opacity-0 transition-opacity group-hover:bg-ink/40 group-hover:opacity-100"
                  aria-label="Change profile picture"
                >
                  {uploadingAvatar ? <Loader2 size={18} className="animate-spin" /> : <Camera size={18} />}
                </button>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-display text-lg font-semibold text-ink">{user.name}</p>
                <div className="mt-1 flex items-center gap-1.5 text-sm text-muted">
                  <Mail size={13} />
                  {user.email}
                </div>
                {user.designation && (
                  <div className="mt-1 flex items-center gap-1.5 text-sm text-muted">
                    <Briefcase size={13} />
                    {user.designation}
                  </div>
                )}
                <div className="mt-2 flex items-center gap-2">
                  <RoleBadge role={user.role} />
                  <span className="inline-flex items-center gap-1 text-xs text-muted">
                    <ShieldCheck size={12} /> Designation is set by your administrator
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Editable profile fields */}
          <form onSubmit={handleSaveProfile} className="rounded-2xl border border-paper-line bg-paper-card p-6 shadow-card">
            <h2 className="font-display text-base font-semibold text-ink">About you</h2>
            <div className="mt-4 space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted">Full name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-lg border border-paper-line bg-paper px-3 py-2.5 text-sm text-ink focus:border-signal"
                />
              </div>
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="text-xs font-medium text-muted">About / bio</label>
                  <span className="text-xs text-muted">{about.length}/500</span>
                </div>
                <textarea
                  value={about}
                  maxLength={500}
                  onChange={(e) => setAbout(e.target.value)}
                  rows={4}
                  placeholder="A short bio your teammates will see..."
                  className="w-full resize-none rounded-lg border border-paper-line bg-paper px-3 py-2.5 text-sm text-ink placeholder:text-muted/70 focus:border-signal"
                />
              </div>
            </div>
            
            <hr className="my-6 border-paper-line" />
            
            <h3 className="font-display text-sm font-semibold text-ink">Social Links</h3>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted">LinkedIn URL</label>
                <input
                  type="url"
                  placeholder="https://linkedin.com/in/..."
                  value={socialLinks.linkedin}
                  onChange={(e) => setSocialLinks(s => ({ ...s, linkedin: e.target.value }))}
                  className="w-full rounded-lg border border-paper-line bg-paper px-3 py-2.5 text-sm text-ink focus:border-signal"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted">Twitter / X URL</label>
                <input
                  type="url"
                  placeholder="https://twitter.com/..."
                  value={socialLinks.twitter}
                  onChange={(e) => setSocialLinks(s => ({ ...s, twitter: e.target.value }))}
                  className="w-full rounded-lg border border-paper-line bg-paper px-3 py-2.5 text-sm text-ink focus:border-signal"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted">Facebook URL</label>
                <input
                  type="url"
                  placeholder="https://facebook.com/..."
                  value={socialLinks.facebook}
                  onChange={(e) => setSocialLinks(s => ({ ...s, facebook: e.target.value }))}
                  className="w-full rounded-lg border border-paper-line bg-paper px-3 py-2.5 text-sm text-ink focus:border-signal"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted">Instagram URL</label>
                <input
                  type="url"
                  placeholder="https://instagram.com/..."
                  value={socialLinks.instagram}
                  onChange={(e) => setSocialLinks(s => ({ ...s, instagram: e.target.value }))}
                  className="w-full rounded-lg border border-paper-line bg-paper px-3 py-2.5 text-sm text-ink focus:border-signal"
                />
              </div>
            </div>

            <hr className="my-6 border-paper-line" />
            
            <h3 className="font-display text-sm font-semibold text-ink">SEO / Schema Markup</h3>
            <div className="mt-4">
              <label className="mb-1.5 block text-xs font-medium text-muted">Person JSON-LD (Optional)</label>
              <textarea
                value={schemaJson}
                onChange={(e) => setSchemaJson(e.target.value)}
                rows={6}
                placeholder={`{\n  "@context": "https://schema.org",\n  "@type": "Person",\n  "name": "Your Name"\n}`}
                className="w-full resize-y rounded-lg border border-paper-line bg-paper px-3 py-2.5 font-mono text-xs text-ink placeholder:text-muted/70 focus:border-signal"
              />
              <p className="mt-1.5 text-xs text-muted">Custom JSON-LD schema injected into your author profile page.</p>
            </div>
            <div className="mt-5 flex justify-end">
              <button type="submit" disabled={savingProfile} className="btn-primary disabled:opacity-60">
                {savingProfile && <Loader2 size={16} className="animate-spin" />}
                Save changes
              </button>
            </div>
          </form>

          {/* Password */}
          <form onSubmit={handleChangePassword} className="rounded-2xl border border-paper-line bg-paper-card p-6 shadow-card">
            <h2 className="font-display text-base font-semibold text-ink">Change password</h2>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <input
                type="password"
                required
                placeholder="Current password"
                value={pwForm.currentPassword}
                onChange={(e) => setPwForm((f) => ({ ...f, currentPassword: e.target.value }))}
                className="rounded-lg border border-paper-line bg-paper px-3 py-2.5 text-sm text-ink focus:border-signal"
              />
              <input
                type="password"
                required
                placeholder="New password"
                value={pwForm.newPassword}
                onChange={(e) => setPwForm((f) => ({ ...f, newPassword: e.target.value }))}
                className="rounded-lg border border-paper-line bg-paper px-3 py-2.5 text-sm text-ink focus:border-signal"
              />
              <input
                type="password"
                required
                placeholder="Confirm new password"
                value={pwForm.confirm}
                onChange={(e) => setPwForm((f) => ({ ...f, confirm: e.target.value }))}
                className="rounded-lg border border-paper-line bg-paper px-3 py-2.5 text-sm text-ink focus:border-signal"
              />
            </div>
            <p className="mt-2 text-xs text-muted">At least 8 characters, with an uppercase letter and a number.</p>
            {pwError && <p className="mt-3 rounded-lg bg-danger/10 px-3 py-2 text-xs font-medium text-danger">{pwError}</p>}
            <div className="mt-5 flex justify-end">
              <button type="submit" disabled={changingPw} className="btn-primary disabled:opacity-60">
                {changingPw && <Loader2 size={16} className="animate-spin" />}
                Update password
              </button>
            </div>
          </form>
        </div>
      </main>

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
