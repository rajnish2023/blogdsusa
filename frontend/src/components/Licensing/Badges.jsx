export const LEAD_STATUSES = ["new", "contacted", "qualified", "closed"];

export function LeadStatusBadge({ status }) {
  const styles = {
    new: "bg-signal/10 text-signal",
    contacted: "bg-flare/10 text-flare",
    qualified: "bg-success/10 text-success",
    closed: "bg-ink/10 text-muted",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ${
        styles[status] || "bg-ink/10 text-muted"
      }`}
    >
      {status}
    </span>
  );
}

export function PlatformBadge({ platform, tier }) {
  const isFo = platform === "fo";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${
        isFo ? "bg-flare/10 text-flare" : "bg-signal-soft text-signal"
      }`}
    >
      {isFo ? "Finance & Ops" : `BC ${tier === "premium" ? "Premium" : "Essentials"}`}
    </span>
  );
}

export function TrustBadge({ trusted, verified }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
        trusted ? "bg-success/10 text-success" : "bg-danger/10 text-danger"
      }`}
      title={verified || (trusted ? "Verified" : "Not verified")}
    >
      {trusted ? "Verified" : "Unverified"}
      {verified && <span className="font-mono text-[10px] opacity-70">{verified}</span>}
    </span>
  );
}
