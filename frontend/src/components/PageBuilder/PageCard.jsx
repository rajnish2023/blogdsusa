import { Link } from "react-router-dom";
import { Pencil, Trash2, LayoutTemplate } from "lucide-react";

function ScoreBadge({ score }) {
  const color = score >= 90 ? "bg-success/10 text-success" : score >= 70 ? "bg-signal-soft text-signal" : score >= 50 ? "bg-flare/10 text-flare" : "bg-danger/10 text-danger";
  return <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${color}`}>SEO {score}</span>;
}

export default function PageCard({ page, onDelete, canEdit, canDelete }) {
  return (
    <div className="group flex flex-col overflow-hidden rounded-2xl border border-paper-line bg-paper-card shadow-card transition-all hover:-translate-y-0.5 hover:shadow-pop">
      <Link to={`/pages/${page._id}/edit`} className="relative flex aspect-[16/9] items-center justify-center bg-ink/5 text-muted">
        <LayoutTemplate size={28} />
        <span className={`absolute left-2.5 top-2.5 rounded-full px-2.5 py-1 text-[10px] font-semibold capitalize ${page.status === "published" ? "bg-success text-white" : "bg-ink/70 text-white"}`}>
          {page.status}
        </span>
      </Link>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-center gap-2">
          {page.category && (
            <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ backgroundColor: `${page.category.color}20`, color: page.category.color }}>
              {page.category.name}
            </span>
          )}
          <ScoreBadge score={page.seoScore} />
        </div>

        <Link to={`/pages/${page._id}/edit`}>
          <h3 className="font-display text-sm font-semibold leading-snug text-ink line-clamp-2 hover:text-signal">{page.title}</h3>
        </Link>
        <p className="font-mono text-xs text-muted">/{page.slug}</p>

        <div className="mt-auto flex items-center justify-between pt-2">
          <span className="text-xs text-muted">{page.author?.name}</span>
          <span className="font-mono text-[10px] text-muted">
            Updated {new Date(page.updatedAt).toLocaleDateString(undefined, { day: "2-digit", month: "short" })}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 border-t border-paper-line px-4 py-2.5">
        {canEdit && (
          <Link to={`/pages/${page._id}/edit`} className="flex items-center gap-1.5 text-xs font-medium text-muted hover:text-ink">
            <Pencil size={13} /> Edit
          </Link>
        )}
        {canDelete && (
          <button onClick={() => onDelete(page)} className="ml-auto flex items-center gap-1.5 text-xs font-medium text-muted hover:text-danger">
            <Trash2 size={13} /> Delete
          </button>
        )}
      </div>
    </div>
  );
}
