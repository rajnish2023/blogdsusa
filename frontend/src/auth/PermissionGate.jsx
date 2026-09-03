import { useAuth } from "./AuthContext";
 
export default function PermissionGate({ permission, children, fallback = null }) {
  const { can } = useAuth();
  if (!permission) return children;
  const perms = Array.isArray(permission) ? permission : [permission];
  return can(...perms) ? children : fallback;
}
