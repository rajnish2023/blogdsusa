import { NavLink } from "react-router-dom";
import { LayoutDashboard, Images, Users, Newspaper, LayoutTemplate, LogOut, Database, Settings, Calculator, Coins } from "lucide-react";
import { useAuth } from "../../auth/AuthContext";
import { Avatar } from "../Users/Badges";
import Logo from "./Logo";

const navItems = [
  { to: "/dashboard", label: "Dashboard",   icon: LayoutDashboard, live: true },
  { to: "/gallery", label: "Gallery",     icon: Images,        live: true, permission: "gallery:view" },
  { to: "/users",   label: "Users & Roles", icon: Users,        live: true, permission: "users:view" },
  { to: "/blog",    label: "Blog",         icon: Newspaper,    live: true, permission: "blog:view" },
  { to: "/pages",   label: "Webpages",     icon: LayoutTemplate, live: true, permission: "pages:view" },
  { to: "/licensing", label: "Licence Calculator", icon: Calculator, live: true, permission: "licensing:view" },
  { to: "/estimator", label: "Price Estimator", icon: Coins, live: true, permission: "estimator:view" },
  { to: "/settings", label: "Settings",    icon: Settings,      live: true, superAdminOnly: true },
  { to: "/migrate", label: "Database Admin", icon: Database,     live: true, superAdminOnly: true },
];

export default function Sidebar() {
  const { user, can, logout } = useAuth();
  const isSuperAdmin = user?.role?.isSuperAdmin;

  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col bg-ink text-white/80">
      <div className="px-6 py-6">
        <Logo />
      </div>

      <nav className="mt-2 flex-1 space-y-1 px-3">
        {navItems.map(({ to, label, icon: Icon, live, permission, superAdminOnly }) => {
          if (superAdminOnly && !isSuperAdmin) return null;
          
          const hasPerm = !permission || can(permission);
          if (!hasPerm) return null;  

          const enabled = live && hasPerm;
          return (
            <NavLink
              key={to}
              to={enabled ? to : "#"}
              onClick={(e) => !enabled && e.preventDefault()}
              className={({ isActive }) =>
                `group flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-white/10 text-white"
                    : enabled
                    ? "text-white/70 hover:bg-white/5 hover:text-white"
                    : "cursor-not-allowed text-white/30"
                }`
              }
            >
              <span className="flex items-center gap-3">
                <Icon size={18} strokeWidth={2} />
                {label}
              </span>
              {!live && (
                <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/40">
                  Soon
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {user && (
        <div className="mx-3 mb-3 flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-3">
          <NavLink to="/profile" className="flex min-w-0 flex-1 items-center gap-3">
            <Avatar name={user.name} color={user.avatarColor} avatarUrl={user.avatarUrl} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-white">{user.name}</p>
              <p className="truncate text-xs text-white/40">{user.designation || user.role?.name}</p>
            </div>
          </NavLink>
          <button onClick={logout} className="rounded-md p-1.5 text-white/50 hover:bg-white/10 hover:text-white" aria-label="Sign out">
            <LogOut size={16} />
          </button>
        </div>
      )}
    </aside>
  );
}
