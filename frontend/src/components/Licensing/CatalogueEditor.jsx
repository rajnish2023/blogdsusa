import { useCallback, useEffect, useState } from "react";
import { Plus, Pencil, Trash2, ChevronUp, ChevronDown, EyeOff, FolderPlus, Layers } from "lucide-react";
import CapabilityModal from "./CapabilityModal";
import GroupModal from "./GroupModal";
import ConfirmDialog from "../Shared/ConfirmDialog";
import {
  fetchCapabilities,
  createCapability,
  updateCapability,
  deleteCapability,
  reorderCapabilities,
  createLicensingGroup,
  updateLicensingGroup,
  deleteLicensingGroup,
} from "../../api/licensingApi";

const TIER_STYLE = {
  essentials: "bg-ink/10 text-muted",
  premium: "bg-signal-soft text-signal",
  addon: "bg-success/10 text-success",
  beyond: "bg-danger/10 text-danger",
};
const TIER_LABEL = {
  essentials: "Essentials",
  premium: "Premium",
  addon: "Extension",
  beyond: "Finance & Ops",
};

export default function CatalogueEditor({ canEdit, onToast, onChanged }) {
  const [capabilities, setCapabilities] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [editingCap, setEditingCap] = useState(null); // object | {} for new
  const [editingGroup, setEditingGroup] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [pendingGroupDelete, setPendingGroupDelete] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchCapabilities();
      setCapabilities(data.capabilities);
      setGroups(data.groups);
    } catch (err) {
      onToast(err?.response?.data?.message || "Failed to load the catalogue", "error");
    } finally {
      setLoading(false);
    }
  }, [onToast]);

  useEffect(() => {
    load();
  }, [load]);

  const done = (msg) => {
    onToast(msg);
    onChanged?.();
    load();
  };

  const saveCapability = async (form) => {
    if (editingCap?._id) await updateCapability(editingCap._id, form);
    else await createCapability(form);
    setEditingCap(null);
    done(editingCap?._id ? "Capability updated" : "Capability added");
  };

  const saveGroup = async (form) => {
    if (editingGroup?._id) {
      const res = await updateLicensingGroup(editingGroup._id, form);
      setEditingGroup(null);
      done(res.moved ? `Group updated, ${res.moved} capabilities moved` : "Group updated");
    } else {
      await createLicensingGroup(form);
      setEditingGroup(null);
      done("Group added");
    }
  };

  const removeCapability = async () => {
    try {
      const res = await deleteCapability(pendingDelete._id);
      done(res.deactivated ? res.message : "Capability deleted");
    } catch (err) {
      onToast(err?.response?.data?.message || "Failed to delete", "error");
    } finally {
      setPendingDelete(null);
    }
  };

  const removeGroup = async () => {
    try {
      await deleteLicensingGroup(pendingGroupDelete._id);
      done("Group deleted");
    } catch (err) {
      onToast(err?.response?.data?.message || "Failed to delete the group", "error");
    } finally {
      setPendingGroupDelete(null);
    }
  };

  const move = async (groupName, index, direction) => {
    const inGroup = capabilities
      .filter((c) => c.group === groupName)
      .sort((a, b) => a.sortOrder - b.sortOrder);
    const target = index + direction;
    if (target < 0 || target >= inGroup.length) return;

    const reordered = [...inGroup];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];

    // keep the group's existing slots, just reassigned in the new sequence
    const slots = inGroup.map((c) => c.sortOrder);
    const order = reordered.map((c, i) => ({ id: c._id, sortOrder: slots[i] }));

    setCapabilities((prev) =>
      prev.map((c) => {
        const hit = order.find((o) => o.id === c._id);
        return hit ? { ...c, sortOrder: hit.sortOrder } : c;
      })
    );

    setBusy(true);
    try {
      await reorderCapabilities(order);
      onChanged?.();
    } catch (err) {
      onToast(err?.response?.data?.message || "Failed to save the order", "error");
      load();
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <div className="px-8 py-10 text-sm text-muted">Loading the catalogue…</div>;

  const groupNames = [
    ...groups.map((g) => g.name),
    ...[...new Set(capabilities.map((c) => c.group))].filter((n) => !groups.some((g) => g.name === n)),
  ];

  return (
    <div className="px-8 py-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-2xl text-sm text-muted">
          These are the rows visitors tick, and the rules behind them. Changes go live on the rate
          card immediately — nothing is redeployed.
        </p>
        {canEdit && (
          <div className="flex items-center gap-2">
            <button onClick={() => setEditingGroup({})} className="btn-secondary">
              <FolderPlus size={15} /> New group
            </button>
            <button onClick={() => setEditingCap({})} className="btn-primary">
              <Plus size={15} /> New capability
            </button>
          </div>
        )}
      </div>

      {groupNames.length === 0 && (
        <div className="rounded-xl border border-paper-line bg-paper-card px-6 py-12 text-center">
          <Layers size={22} className="mx-auto mb-3 text-muted" />
          <p className="text-sm text-muted">No groups yet. Create one to start adding capabilities.</p>
        </div>
      )}

      <div className="space-y-6">
        {groupNames.map((name) => {
          const group = groups.find((g) => g.name === name);
          const inGroup = capabilities
            .filter((c) => c.group === name)
            .sort((a, b) => a.sortOrder - b.sortOrder);

          return (
            <section key={name} className="overflow-hidden rounded-xl border border-paper-line bg-paper-card">
              <header className="flex flex-wrap items-start justify-between gap-3 border-b border-paper-line bg-paper px-5 py-3.5">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-display text-sm font-semibold text-ink">{name}</h3>
                    <span className="font-mono text-[10px] text-muted">{inGroup.length}</span>
                    {group?.collapsible && (
                      <span className="rounded-full bg-ink/10 px-2 py-0.5 text-[10px] font-semibold text-muted">
                        Collapsed
                      </span>
                    )}
                    {group && group.active === false && (
                      <span className="rounded-full bg-danger/10 px-2 py-0.5 text-[10px] font-semibold text-danger">
                        Hidden
                      </span>
                    )}
                    {!group && (
                      <span className="rounded-full bg-flare/10 px-2 py-0.5 text-[10px] font-semibold text-flare">
                        No group record
                      </span>
                    )}
                  </div>
                  {group?.subtitle && (
                    <p className="mt-1 max-w-2xl text-xs leading-relaxed text-muted">{group.subtitle}</p>
                  )}
                </div>
                {canEdit && group && (
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      onClick={() => setEditingGroup(group)}
                      className="rounded-lg p-1.5 text-muted hover:bg-paper-line hover:text-ink"
                      aria-label={`Edit ${name}`}
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => setPendingGroupDelete(group)}
                      className="rounded-lg p-1.5 text-muted hover:bg-danger/10 hover:text-danger"
                      aria-label={`Delete ${name}`}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </header>

              {inGroup.length === 0 ? (
                <p className="px-5 py-6 text-sm text-muted">No capabilities in this group yet.</p>
              ) : (
                <ul className="divide-y divide-paper-line">
                  {inGroup.map((c, i) => (
                    <li
                      key={c._id}
                      className={`flex items-start gap-3 px-5 py-3 ${c.active === false ? "opacity-50" : ""}`}
                    >
                      {canEdit && (
                        <div className="flex shrink-0 flex-col">
                          <button
                            onClick={() => move(name, i, -1)}
                            disabled={i === 0 || busy}
                            className="rounded p-0.5 text-muted hover:bg-paper-line hover:text-ink disabled:opacity-20"
                            aria-label="Move up"
                          >
                            <ChevronUp size={14} />
                          </button>
                          <button
                            onClick={() => move(name, i, 1)}
                            disabled={i === inGroup.length - 1 || busy}
                            className="rounded p-0.5 text-muted hover:bg-paper-line hover:text-ink disabled:opacity-20"
                            aria-label="Move down"
                          >
                            <ChevronDown size={14} />
                          </button>
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-medium text-ink">{c.label}</span>
                          {c.active === false && <EyeOff size={12} className="text-muted" />}
                        </div>
                        {c.note && <p className="mt-0.5 text-xs text-muted">{c.note}</p>}
                        <div className="mt-1 flex flex-wrap items-center gap-2 font-mono text-[10px] text-muted">
                          <span>{c.capId}</span>
                          {c.fo && <span>· {c.fo}</span>}
                          {c.forcesScmAttach && <span className="text-flare">· SCM attach</span>}
                          {c.isWarehouseExtension && <span className="text-flare">· warehouse ext</span>}
                        </div>
                      </div>

                      <span
                        className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${
                          TIER_STYLE[c.tier] || "bg-ink/10 text-muted"
                        }`}
                      >
                        {TIER_LABEL[c.tier] || c.tier}
                      </span>

                      {canEdit && (
                        <div className="flex shrink-0 items-center gap-1">
                          <button
                            onClick={() => setEditingCap(c)}
                            className="rounded-lg p-1.5 text-muted hover:bg-paper-line hover:text-ink"
                            aria-label={`Edit ${c.label}`}
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => setPendingDelete(c)}
                            className="rounded-lg p-1.5 text-muted hover:bg-danger/10 hover:text-danger"
                            aria-label={`Delete ${c.label}`}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>

      {editingCap && (
        <CapabilityModal
          capability={editingCap._id ? editingCap : null}
          groups={groups}
          onClose={() => setEditingCap(null)}
          onSave={saveCapability}
        />
      )}

      {editingGroup && (
        <GroupModal
          group={editingGroup._id ? editingGroup : null}
          onClose={() => setEditingGroup(null)}
          onSave={saveGroup}
        />
      )}

      {pendingDelete && (
        <ConfirmDialog
          title={`Delete “${pendingDelete.label}”?`}
          description="It disappears from the rate card. If any enquiry already referenced it, it is hidden instead of deleted so the history still reads."
          onConfirm={removeCapability}
          onCancel={() => setPendingDelete(null)}
        />
      )}

      {pendingGroupDelete && (
        <ConfirmDialog
          title={`Delete the “${pendingGroupDelete.name}” group?`}
          description="Groups holding capabilities cannot be deleted — move them to another group first."
          onConfirm={removeGroup}
          onCancel={() => setPendingGroupDelete(null)}
        />
      )}
    </div>
  );
}
