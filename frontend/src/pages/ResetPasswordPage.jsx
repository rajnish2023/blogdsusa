import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Loader2, Lock, Eye, EyeOff, CheckCircle2 } from "lucide-react";
import { resetPasswordRequest } from "../api/authApi";
import Logo from "../components/Layout/Logo";

export default function ResetPasswordPage() {
  const { token } = useParams();
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);

    if (password !== confirmPassword) {
      setFormError("Passwords do not match.");
      return;
    }
    if (password.length < 8) {
      setFormError("Password must be at least 8 characters.");
      return;
    }

    setSubmitting(true);
    try {
      await resetPasswordRequest(token, password);
      setSuccess(true);
      // Auto-redirect to login after 2 seconds
      setTimeout(() => navigate("/login", { replace: true }), 2000);
    } catch (err) {
      setFormError(
        err?.response?.data?.message || "Reset failed. The link may have expired."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-ink px-4">
      <div className="w-full max-w-sm animate-slideUp rounded-2xl bg-paper-card p-8 shadow-pop">
        {/* Logo */}
        <div className="mb-6">
          <Logo theme="dark" />
        </div>

        {success ? (
          /* ── Success state ── */
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-signal">
              <CheckCircle2 size={20} />
              <h1 className="font-display text-lg font-semibold">Password updated!</h1>
            </div>
            <p className="text-sm text-muted leading-relaxed">
              Your password has been changed. Redirecting you to sign in…
            </p>
            <Link
              to="/login"
              className="mt-2 inline-block text-xs text-signal hover:underline"
            >
              Go to sign in now
            </Link>
          </div>
        ) : (
          /* ── Form state ── */
          <>
            <h1 className="font-display text-xl font-semibold text-ink">Set new password</h1>
            <p className="mt-1 text-sm text-muted">
              Choose a strong password. It must be at least 8 characters.
            </p>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              {/* New password */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted">New password</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                  <input
                    id="reset-password"
                    type={showPassword ? "text" : "password"}
                    required
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-lg border border-paper-line bg-paper py-2.5 pl-9 pr-9 text-sm text-ink placeholder:text-muted/70 focus:border-signal"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Confirm password */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted">Confirm password</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                  <input
                    id="reset-confirm"
                    type={showConfirm ? "text" : "password"}
                    required
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-lg border border-paper-line bg-paper py-2.5 pl-9 pr-9 text-sm text-ink placeholder:text-muted/70 focus:border-signal"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink"
                    tabIndex={-1}
                  >
                    {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Strength hint */}
              {password && (
                <div className="flex gap-1">
                  {[1, 2, 3, 4].map((n) => (
                    <div
                      key={n}
                      className={`h-1 flex-1 rounded-full transition-colors ${
                        password.length >= n * 3
                          ? password.length >= 12
                            ? "bg-signal"
                            : password.length >= 9
                            ? "bg-flare"
                            : "bg-danger"
                          : "bg-paper-line"
                      }`}
                    />
                  ))}
                  <span className="ml-1 text-xs text-muted">
                    {password.length >= 12 ? "Strong" : password.length >= 9 ? "Good" : password.length >= 8 ? "Weak" : "Too short"}
                  </span>
                </div>
              )}

              {formError && (
                <p className="rounded-lg bg-danger/10 px-3 py-2 text-xs font-medium text-danger">
                  {formError}
                </p>
              )}

              <button
                id="reset-submit"
                type="submit"
                disabled={submitting}
                className="btn-primary w-full justify-center disabled:opacity-60"
              >
                {submitting && <Loader2 size={16} className="animate-spin" />}
                Update password
              </button>
            </form>

            <Link
              to="/login"
              className="mt-4 block text-center text-xs text-muted hover:text-ink transition-colors"
            >
              Back to sign in
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
