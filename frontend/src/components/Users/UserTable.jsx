import { MoreVertical, Pencil, Ban, CheckCircle, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Avatar, RoleBadge, StatusBadge } from "./Badges";
import PermissionGate from "../../auth/PermissionGate";
import { useAuth } from "../../auth/AuthContext";

function RowMenu({ user, onEdit, onToggleStatus, onDelete }) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const btnRef = useRef(null);
  const menuRef = useRef(null);
  const { user: me } = useAuth();
  const isSelf = me?.id === user.id;

  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target) && !btnRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const toggle = () => {
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setCoords({ top: rect.bottom + 6, left: rect.right - 180 });
    }
    setOpen((o) => !o);
  };

  return (
    <>
      <button ref={btnRef} onClick={toggle} className="rounded-md p-1.5 text-muted hover:bg-paper hover:text-ink">
        <MoreVertical size={16} />
      </button>
      {open &&
        createPortal(
          <div ref={menuRef} style={{ top: coords.top, left: coords.left }} className="fixed z-[100] w-48 animate-scaleIn rounded-xl border border-paper-line bg-paper-card p-1.5 shadow-pop">
            <PermissionGate permission="users:edit">
              <button onClick={() => { onEdit(user); setOpen(false); }} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium text-ink hover:bg-paper">
                <Pencil size={15} /> Edit details
              </button>
            </PermissionGate>
            <PermissionGate permission="users:edit">
              {!isSelf && (
                <button
                  onClick={() => { onToggleStatus(user); setOpen(false); }}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium text-ink hover:bg-paper"
                >
                  {user.status === "suspended" ? <CheckCircle size={15} /> : <Ban size={15} />}
                  {user.status === "suspended" ? "Reactivate" : "Suspend"}
                </button>
              )}
            </PermissionGate>
            <PermissionGate permission="users:delete">
              {!isSelf && (
                <>
                  <div className="my-1 h-px bg-paper-line" />
                  <button onClick={() => { onDelete(user); setOpen(false); }} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium text-danger hover:bg-danger/5">
                    <Trash2 size={15} /> Remove
                  </button>
                </>
              )}
            </PermissionGate>
          </div>,
          document.body
        )}
    </>
  );
}

export default function UserTable({ users, onEdit, onToggleStatus, onDelete }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-paper-line bg-paper-card shadow-card">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-paper-line bg-paper text-xs uppercase tracking-wide text-muted">
            <th className="px-5 py-3 font-medium">Name</th>
            <th className="px-5 py-3 font-medium">Designation</th>
            <th className="px-5 py-3 font-medium">Role</th>
            <th className="px-5 py-3 font-medium">Status</th>
            <th className="px-5 py-3 font-medium">Last login</th>
            <th className="w-12 px-5 py-3" />
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} className="border-b border-paper-line last:border-0 hover:bg-paper/60">
              <td className="px-5 py-3.5">
                <div className="flex items-center gap-3">
                  <Avatar name={u.name} color={u.avatarColor} avatarUrl={u.avatarUrl} />
                  <div>
                    <p className="font-medium text-ink">{u.name}</p>
                    <p className="text-xs text-muted">{u.email}</p>
                  </div>
                </div>
              </td>
              <td className="px-5 py-3.5 text-sm text-muted">{u.designation || "—"}</td>
              <td className="px-5 py-3.5">
                <RoleBadge role={u.role} />
              </td>
              <td className="px-5 py-3.5">
                <StatusBadge status={u.status} />
              </td>
              <td className="px-5 py-3.5 font-mono text-xs text-muted">
                {u.lastLogin ? new Date(u.lastLogin).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" }) : "Never"}
              </td>
              <td className="px-5 py-3.5 text-right">
                <RowMenu user={u} onEdit={onEdit} onToggleStatus={onToggleStatus} onDelete={onDelete} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
