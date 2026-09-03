import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { Loader2 } from "lucide-react";

export default function ProtectedRoute({ children, permission }) {
  const { user, initializing, can } = useAuth();
  const location = useLocation();

  if (initializing) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-paper">
        <Loader2 size={22} className="animate-spin text-signal" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (permission && !can(permission)) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center gap-2 bg-paper text-center">
        <p className="font-display text-lg font-semibold text-ink">You don't have access to this page</p>
        <p className="text-sm text-muted">Ask an administrator for the right permissions.</p>
      </div>
    );
  }

  return children;
}
