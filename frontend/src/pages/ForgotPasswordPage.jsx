import { useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, Mail, ArrowLeft, CheckCircle2 } from "lucide-react";
import { forgotPasswordRequest } from "../api/authApi";
import Logo from "../components/Layout/Logo";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);
  const [success, setSuccess] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);
    try {
      const res = await forgotPasswordRequest(email);
      setSuccess(res);
    } catch (err) {
      setFormError(
        err?.response?.data?.message || "Something went wrong. Please try again."
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
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-signal">
              <CheckCircle2 size={20} />
              <h1 className="font-display text-lg font-semibold">Link Generated</h1>
            </div>
            <p className="text-sm text-muted leading-relaxed">{success.message}</p>

            {/* Show reset link inline (remove in prod when email is configured) */}
            {success.resetUrl && (
              <div className="rounded-lg bg-paper border border-paper-line p-3 space-y-1">
                <p className="text-xs font-medium text-muted">Reset link (share manually):</p>
                <a
                  href={success.resetUrl}
                  className="break-all text-xs text-signal hover:underline"
                >
                  {success.resetUrl}
                </a>
              </div>
            )}

            <Link
              to="/login"
              className="mt-2 flex items-center gap-1.5 text-xs text-muted hover:text-ink transition-colors"
            >
              <ArrowLeft size={13} />
              Back to sign in
            </Link>
          </div>
        ) : (
          /* ── Form state ── */
          <>
            <h1 className="font-display text-xl font-semibold text-ink">Forgot password?</h1>
            <p className="mt-1 text-sm text-muted">
              Enter your email and we'll generate a reset link for you.
            </p>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted">Email</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                  <input
                    id="forgot-email"
                    type="email"
                    required
                    autoComplete="username"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@dynamicssquare.com"
                    className="w-full rounded-lg border border-paper-line bg-paper py-2.5 pl-9 pr-3 text-sm text-ink placeholder:text-muted/70 focus:border-signal"
                  />
                </div>
              </div>

              {formError && (
                <p className="rounded-lg bg-danger/10 px-3 py-2 text-xs font-medium text-danger">
                  {formError}
                </p>
              )}

              <button
                id="forgot-submit"
                type="submit"
                disabled={submitting}
                className="btn-primary w-full justify-center disabled:opacity-60"
              >
                {submitting && <Loader2 size={16} className="animate-spin" />}
                Generate reset link
              </button>
            </form>

            <Link
              to="/login"
              className="mt-4 flex items-center gap-1.5 text-xs text-muted hover:text-ink transition-colors"
            >
              <ArrowLeft size={13} />
              Back to sign in
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
