import { useEffect, useState, useCallback } from "react";
import { Search, UserPlus } from "lucide-react";
import UserTable from "../components/Users/UserTable";
import RolesList from "../components/Users/RolesList";
import InviteUserModal from "../components/Users/InviteUserModal";
import EditUserModal from "../components/Users/EditUserModal";
import RoleFormModal from "../components/Users/RoleFormModal";
import ConfirmDialog from "../components/Shared/ConfirmDialog";
import Toast from "../components/Shared/Toast";
import Pagination from "../components/Shared/Pagination";
import { GallerySkeleton } from "../components/Gallery/GalleryStates";
import { fetchUsers, createUser, updateUser, setUserStatus, deleteUser } from "../api/userApi";
import { fetchRoles, fetchPermissions, createRole, updateRole, deleteRole } from "../api/roleApi";
import PermissionGate from "../auth/PermissionGate";
import { usePermissions } from "../auth/AuthContext";

export default function UsersPage() {
  const can = usePermissions();
  const [tab, setTab] = useState("team");

  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);

  const [showInvite, setShowInvite] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [statusTarget, setStatusTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const [roleModal, setRoleModal] = useState(null); // { role: null | roleObj }
  const [deleteRoleTarget, setDeleteRoleTarget] = useState(null);

  const [toast, setToast] = useState(null);
  const showToast = (message, type = "success") => setToast({ message, type });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [userData, roleData, permData] = await Promise.all([
        fetchUsers({ search, page, limit: 10 }),
        fetchRoles(),
        can("roles:view") ? fetchPermissions() : Promise.resolve([]),
      ]);
      setUsers(userData.items);
      setTotalPages(userData.pages || 1);
      setTotalUsers(userData.total || 0);
      setRoles(roleData);
      setPermissions(permData);
    } catch (err) {
      showToast(err?.response?.data?.message || "Failed to load data", "error");
    } finally {
      setLoading(false);
    }
  }, [search, page, can]);

  useEffect(() => {
    setPage(1);
  }, [search]);

  useEffect(() => {
    const t = setTimeout(load, search ? 300 : 0);
    return () => clearTimeout(t);
  }, [load, search, page]);

  // --- Users ---
  const handleInvite = async (form) => {
    const data = await createUser(form);
    showToast(`${form.name} was invited`);
    load();
    return data;
  };

  const handleEditUser = async (form) => {
    await updateUser(editingUser.id, form);
    showToast("Teammate updated");
    load();
  };

  const handleToggleStatus = async () => {
    if (!statusTarget) return;
    const next = statusTarget.status === "suspended" ? "active" : "suspended";
    try {
      await setUserStatus(statusTarget.id, next);
      showToast(next === "suspended" ? "User suspended" : "User reactivated");
      load();
    } catch (err) {
      showToast(err?.response?.data?.message || "Failed to update status", "error");
    } finally {
      setStatusTarget(null);
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteTarget) return;
    try {
      await deleteUser(deleteTarget.id);
      showToast("Teammate removed");
      load();
    } catch (err) {
      showToast(err?.response?.data?.message || "Failed to remove user", "error");
    } finally {
      setDeleteTarget(null);
    }
  };

  // --- Roles ---
  const handleSaveRole = async (form) => {
    if (roleModal.role) {
      await updateRole(roleModal.role._id, form);
      showToast("Role updated");
    } else {
      await createRole(form);
      showToast("Role created");
    }
    load();
  };

  const handleDeleteRole = async () => {
    if (!deleteRoleTarget) return;
    try {
      await deleteRole(deleteRoleTarget._id);
      showToast("Role deleted");
      load();
    } catch (err) {
      showToast(err?.response?.data?.message || "Failed to delete role", "error");
    } finally {
      setDeleteRoleTarget(null);
    }
  };

  return (
    <div className="flex h-screen flex-1 flex-col overflow-hidden">
      <header className="border-b border-paper-line bg-paper-card px-8 py-6">
        <h1 className="font-display text-2xl font-semibold text-ink">Users &amp; Roles</h1>
        <p className="mt-1 text-sm text-muted">Manage your team and control what each role can access.</p>
      </header>

      <div className="flex items-center gap-1 border-b border-paper-line bg-paper px-8 pt-4">
        {[
          { key: "team", label: "Team" },
          ...(can("roles:view") ? [{ key: "roles", label: "Roles & Permissions" }] : []),
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`rounded-t-lg border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
              tab === t.key ? "border-signal text-signal" : "border-transparent text-muted hover:text-ink"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <main className="flex-1 overflow-y-auto px-8 py-6">
        {tab === "team" ? (
          <>
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="relative w-full max-w-xs">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search team members..."
                  className="w-full rounded-lg border border-paper-line bg-paper-card py-2 pl-9 pr-3 text-sm text-ink placeholder:text-muted focus:border-signal"
                />
              </div>
              <PermissionGate permission="users:create">
                <button onClick={() => setShowInvite(true)} className="btn-primary whitespace-nowrap">
                  <UserPlus size={16} />
                  Invite teammate
                </button>
              </PermissionGate>
            </div>

            {loading ? (
              <GallerySkeleton count={6} />
            ) : (
              <UserTable
                users={users}
                onEdit={setEditingUser}
                onToggleStatus={setStatusTarget}
                onDelete={setDeleteTarget}
              />
            )}
          </>
        ) : (
          <RolesList
            roles={roles}
            onEdit={(role) => setRoleModal({ role })}
            onDelete={setDeleteRoleTarget}
            onCreate={() => setRoleModal({ role: null })}
          />
        )}
      </main>

      {tab === "team" && (
        <Pagination
          page={page}
          pages={totalPages}
          total={totalUsers}
          limit={10}
          onPageChange={setPage}
        />
      )}

      {showInvite && (
        <InviteUserModal roles={roles} onClose={() => setShowInvite(false)} onSubmit={handleInvite} />
      )}

      {editingUser && (
        <EditUserModal user={editingUser} roles={roles} onClose={() => setEditingUser(null)} onSubmit={handleEditUser} />
      )}

      {statusTarget && (
        <ConfirmDialog
          title={statusTarget.status === "suspended" ? "Reactivate this user?" : "Suspend this user?"}
          description={
            statusTarget.status === "suspended"
              ? `${statusTarget.name} will regain access immediately.`
              : `${statusTarget.name} will be signed out and unable to log in until reactivated.`
          }
          confirmLabel={statusTarget.status === "suspended" ? "Reactivate" : "Suspend"}
          onConfirm={handleToggleStatus}
          onCancel={() => setStatusTarget(null)}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Remove this teammate?"
          description={`${deleteTarget.name} will lose access immediately. This can't be undone.`}
          onConfirm={handleDeleteUser}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {roleModal && (
        <RoleFormModal
          role={roleModal.role}
          allPermissions={permissions}
          onClose={() => setRoleModal(null)}
          onSubmit={handleSaveRole}
        />
      )}

      {deleteRoleTarget && (
        <ConfirmDialog
          title="Delete this role?"
          description={`"${deleteRoleTarget.name}" will be permanently deleted. Users must be reassigned first if any still hold it.`}
          onConfirm={handleDeleteRole}
          onCancel={() => setDeleteRoleTarget(null)}
        />
      )}

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
