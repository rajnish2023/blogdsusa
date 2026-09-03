import { useState } from "react";
import { X } from "lucide-react";

export default function TagInput({ tags, onChange, max = 15 }) {
  const [draft, setDraft] = useState("");

  const addTag = () => {
    const value = draft.trim();
    if (!value || tags.includes(value) || tags.length >= max) {
      setDraft("");
      return;
    }
    onChange([...tags, value]);
    setDraft("");
  };

  const removeTag = (tag) => onChange(tags.filter((t) => t !== tag));

  const handleKeyDown = (e) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag();
    } else if (e.key === "Backspace" && !draft && tags.length) {
      onChange(tags.slice(0, -1));
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-paper-line bg-paper px-2.5 py-2 focus-within:border-signal">
      {tags.map((tag) => (
        <span key={tag} className="flex items-center gap-1 rounded-full bg-signal-soft px-2.5 py-1 text-xs font-medium text-signal">
          {tag}
          <button type="button" onClick={() => removeTag(tag)} className="hover:text-signal-hover">
            <X size={11} />
          </button>
        </span>
      ))}
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={addTag}
        placeholder={tags.length ? "" : "Add tags — press Enter"}
        className="min-w-[100px] flex-1 bg-transparent py-0.5 text-sm text-ink placeholder:text-muted/70 focus:outline-none"
      />
    </div>
  );
}
