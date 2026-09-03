import { useState } from "react";
import { useNavigate, useLocation, Navigate, Link } from "react-router-dom";
import { Loader2, Lock, Mail, Eye, EyeOff } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import Logo from "../components/Layout/Logo";

export default function LoginPage() {
  const { login, user, initializing } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  if (!initializing && user) {
    return <Navigate to={location.state?.from?.pathname || "/gallery"} replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);
    const ok = await login(email, password);
    setSubmitting(false);
    if (ok) navigate(location.state?.from?.pathname || "/gallery", { replace: true });
    else setFormError("Incorrect email or password");
  };

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-ink px-4">
      <div className="w-full max-w-sm animate-slideUp rounded-2xl bg-paper-card p-8 shadow-pop">
        <div className="mb-6">
          <Logo theme="dark" />
        </div>

        <h1 className="font-display text-xl font-semibold text-ink">Sign in</h1>
        <p className="mt-1 text-sm text-muted">Use your workspace credentials to continue.</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted">Email</label>
            <div className="relative">
              <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input
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

          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted">Password</label>
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input
                type={showPassword ? "text" : "password"}
                required
                autoComplete="current-password"
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

          {formError && (
            <p className="rounded-lg bg-danger/10 px-3 py-2 text-xs font-medium text-danger">{formError}</p>
          )}

          <button type="submit" disabled={submitting} className="btn-primary w-full justify-center disabled:opacity-60">
            {submitting && <Loader2 size={16} className="animate-spin" />}
            Sign in
          </button>

          <div className="text-center">
            <Link
              to="/forgot-password"
              className="text-xs text-muted hover:text-ink transition-colors"
            >
              Forgot your password?
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
