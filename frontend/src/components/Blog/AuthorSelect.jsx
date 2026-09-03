import { Avatar } from "../Users/Badges";
import { ArrowRightLeft } from "lucide-react";

export default function AuthorSelect({ authors, value, onChange, currentAuthor }) {
  const selected = authors.find((a) => a.id === value) || currentAuthor;

  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        {selected && <Avatar name={selected.name} color={selected.avatarColor} avatarUrl={selected.avatarUrl} size={28} />}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-ink">{selected?.name || "Unknown"}</p>
          {selected?.designation && <p className="truncate text-xs text-muted">{selected.designation}</p>}
        </div>
      </div>
      <div className="relative">
        <ArrowRightLeft size={13} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
        <select
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          className="w-full appearance-none rounded-lg border border-paper-line bg-paper py-2 pl-8 pr-3 text-sm text-ink focus:border-signal"
        >
          {authors.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
              {a.designation ? ` — ${a.designation}` : ""}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
