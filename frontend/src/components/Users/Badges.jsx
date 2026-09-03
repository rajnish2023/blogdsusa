export function StatusBadge({ status }) {
  const styles = {
    active: "bg-success/10 text-success",
    invited: "bg-flare/10 text-flare",
    suspended: "bg-danger/10 text-danger",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ${styles[status] || "bg-ink/10 text-muted"}`}>
      {status}
    </span>
  );
}

export function RoleBadge({ role }) {
  if (!role) return <span className="text-xs text-muted">—</span>;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
        role.isSuperAdmin ? "bg-signal text-white" : "bg-signal-soft text-signal"
      }`}
    >
      {role.name}
    </span>
  );
}

export function Avatar({ name, color, avatarUrl, size = 36 }) {
  const initials = (name || "?")
    .trim()
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        style={{ width: size, height: size }}
        className="shrink-0 rounded-full object-cover"
      />
    );
  }

  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
      style={{ backgroundColor: color || "#3355FF", width: size, height: size }}
    >
      {initials}
    </div>
  );
}
