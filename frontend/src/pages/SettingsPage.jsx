import { useState, useRef } from "react";
import { useAuth } from "../auth/AuthContext";
import { updateSettingValue, uploadCustomLogo } from "../api/settingApi";
import Toast from "../components/Shared/Toast";
import { Upload, Loader2, Save } from "lucide-react";

export default function SettingsPage() {
  const { settings, reloadSettings } = useAuth();
  const fileRef = useRef(null);

  const [companyName, setCompanyName] = useState(settings?.companyName || "Dynamics Square");
  const [savingSettings, setSavingSettings] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = "success") => setToast({ message, type });

  const handleLogoPick = () => fileRef.current?.click();

  const handleLogoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    try {
      await uploadCustomLogo(file);
      await reloadSettings();
      showToast("Custom logo updated successfully!");
    } catch (err) {
      showToast(err?.response?.data?.message || "Failed to upload logo", "error");
    } finally {
      setUploadingLogo(false);
      e.target.value = "";
    }
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      await updateSettingValue("companyName", companyName);
      await reloadSettings();
      showToast("Company settings saved!");
    } catch (err) {
      showToast(err?.response?.data?.message || "Failed to save settings", "error");
    } finally {
      setSavingSettings(false);
    }
  };

  const apiBase = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
  const serverBase = apiBase.endsWith("/api") ? apiBase.slice(0, -4) : apiBase;
  const currentLogoUrl = settings?.customLogo
    ? settings.customLogo.startsWith("http")
      ? settings.customLogo
      : `${serverBase}${settings.customLogo}`
    : null;

  return (
    <div className="flex h-screen flex-1 flex-col overflow-hidden">
      <header className="border-b border-paper-line bg-paper-card px-8 py-6">
        <h1 className="font-display text-2xl font-semibold text-ink">System Settings</h1>
        <p className="mt-1 text-sm text-muted">Customize website branding, logo images, and global CMS metadata configuration.</p>
      </header>

      <main className="flex-1 overflow-y-auto px-8 py-8">
        <div className="max-w-2xl space-y-6">
          {/* Logo Card */}
          <div className="rounded-2xl border border-paper-line bg-paper-card p-6 shadow-sm">
            <h2 className="font-display text-base font-bold text-ink mb-2">Custom Brand Logo</h2>
            <p className="text-xs text-muted mb-4">Upload your brand logo. This will replace the default grid-box icon across all login, reset pages, and dashboard sidebars.</p>

            <div className="flex items-center gap-6">
              {/* Preview Box */}
              <div className="flex h-20 w-48 items-center justify-center rounded-xl border border-dashed border-paper-line bg-paper p-3">
                {currentLogoUrl ? (
                  <img src={currentLogoUrl} alt="Branding Logo" className="max-h-full max-w-full object-contain" />
                ) : (
                  <div className="text-center text-[10px] text-muted">No custom logo uploaded</div>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <input
                  type="file"
                  ref={fileRef}
                  onChange={handleLogoChange}
                  accept="image/png, image/jpeg, image/webp, image/svg+xml"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={handleLogoPick}
                  disabled={uploadingLogo}
                  className="btn-primary"
                >
                  {uploadingLogo ? (
                    <>
                      <Loader2 size={14} className="animate-spin mr-1.5" /> Uploading...
                    </>
                  ) : (
                    <>
                      <Upload size={14} className="mr-1.5" /> Upload Custom Logo
                    </>
                  )}
                </button>
                <p className="text-[10px] text-muted">Supports PNG, JPG, WebP, or SVG. Maximum size 5MB.</p>
              </div>
            </div>
          </div>

          {/* Settings Form */}
          <form onSubmit={handleSaveSettings} className="rounded-2xl border border-paper-line bg-paper-card p-6 shadow-sm space-y-4">
            <h2 className="font-display text-base font-bold text-ink">General Branding Settings</h2>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-muted">Company / Brand Name</label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full rounded-lg border border-paper-line bg-paper px-3 py-2 text-sm text-ink placeholder-muted focus:border-signal"
                placeholder="e.g. Dynamics Square"
                required
              />
            </div>

            <div className="flex justify-end border-t border-paper-line pt-4">
              <button
                type="submit"
                disabled={savingSettings}
                className="btn-primary"
              >
                {savingSettings ? (
                  <>
                    <Loader2 size={14} className="animate-spin mr-1.5" /> Saving...
                  </>
                ) : (
                  <>
                    <Save size={14} className="mr-1.5" /> Save Changes
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </main>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
