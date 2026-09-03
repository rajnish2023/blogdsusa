import { Lock, Pencil, Trash2, Users, ShieldPlus } from "lucide-react";
import PermissionGate from "../../auth/PermissionGate";

export default function RolesList({ roles, onEdit, onDelete, onCreate }) {
  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-muted">Roles bundle permissions together so you can assign access in one click.</p>
        <PermissionGate permission="roles:manage">
          <button onClick={onCreate} className="btn-primary">
            <ShieldPlus size={16} />
            New role
          </button>
        </PermissionGate>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {roles.map((role) => (
          <div key={role._id} className="flex flex-col rounded-2xl border border-paper-line bg-paper-card p-5 shadow-card">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-display text-base font-semibold text-ink">{role.name}</h3>
                  {role.isSystem && <Lock size={13} className="text-muted" />}
                </div>
                <p className="mt-1 text-xs text-muted">{role.description || "No description"}</p>
              </div>
            </div>

            <div className="mt-4 flex items-center gap-1.5 text-xs text-muted">
              <Users size={13} />
              {role.userCount} {role.userCount === 1 ? "member" : "members"}
            </div>

            <div className="mt-3 flex flex-wrap gap-1.5">
              {role.isSuperAdmin ? (
                <span className="rounded-full bg-signal-soft px-2 py-1 text-[10px] font-semibold text-signal">All permissions</span>
              ) : (
                <>
                  {role.permissions.slice(0, 4).map((p) => (
                    <span key={p} className="rounded-full bg-paper px-2 py-1 font-mono text-[10px] text-muted">
                      {p}
                    </span>
                  ))}
                  {role.permissions.length > 4 && (
                    <span className="rounded-full bg-paper px-2 py-1 text-[10px] text-muted">+{role.permissions.length - 4} more</span>
                  )}
                  {role.permissions.length === 0 && <span className="text-[10px] text-muted">No permissions assigned</span>}
                </>
              )}
            </div>

            <div className="mt-5 flex gap-2 border-t border-paper-line pt-4">
              <PermissionGate permission="roles:manage">
                <button
                  onClick={() => onEdit(role)}
                  disabled={role.isSuperAdmin}
                  className="btn-secondary flex-1 justify-center py-2 text-xs disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Pencil size={13} />
                  {role.isSuperAdmin ? "Locked" : "Edit"}
                </button>
                {!role.isSystem && (
                  <button
                    onClick={() => onDelete(role)}
                    className="flex items-center justify-center rounded-lg border border-paper-line px-3 text-danger hover:bg-danger/5"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </PermissionGate>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
