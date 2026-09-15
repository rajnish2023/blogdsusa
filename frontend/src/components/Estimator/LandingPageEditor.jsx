import { useRef, useState } from "react";
import { Save, Loader2, Plus, Trash2, ChevronRight, Globe, Search, ImagePlus, X } from "lucide-react";
import TipTapEditor from "../Blog/TipTapEditor";
import { uploadMedia } from "../../api/galleryApi";

const SECTIONS = [
  { label: "Hero",           fields: ["heading", "paragraph", "paragraph_2"], listing: true,  listingAfter: "paragraph_2" },
  { label: "Benefits",       fields: ["heading"],                             listing: true,  listingAfter: "heading" },
  { label: "Key components", fields: ["heading", "paragraph", "paragraph_1"], listing: true,  listingAfter: "paragraph" },
  { label: "How it works",   fields: ["heading", "paragraph"],                listing: false },
  { label: "Planning",       fields: ["heading", "paragraph"],                listing: true,  listingAfter: "paragraph" },
  { label: "Get started",    fields: ["heading", "paragraph"],                listing: false },
  { label: "FAQs",           fields: ["heading", "paragraph"],                listing: true,  listingAfter: "paragraph" },
];

const FIELD_LABELS = {
  heading: "Heading",
  paragraph: "Paragraph",
  paragraph_2: "Second paragraph",
  paragraph_1: "Closing paragraph",
};

const FIELD_HINTS = {
  paragraph_1: "Rendered after the list.",
};

const RICH_FIELDS = new Set(["paragraph", "paragraph_1", "paragraph_2"]);

const blankRow = () => ({ text: "", textarea: "" });

/** page_view (or null) -> exactly seven sections for the form. */
const toSections = (pageView) => {
  const raw = Array.isArray(pageView) ? pageView : pageView?.page;
  const list = Array.isArray(raw) ? raw : [];

  return SECTIONS.map((spec, i) => {
    const section = list[i] && typeof list[i] === "object" ? list[i] : {};
    const out = {};
    for (const f of spec.fields) out[f] = section[f] ?? "";

    if (spec.listing) {
      const l = section.listing;
      const rows = Array.isArray(l)
        ? l
        : l && typeof l === "object"
        ? Object.keys(l)
            .sort((a, b) => Number(a) - Number(b))
            .map((k) => l[k])
        : [];
      out.listing = rows
        .filter((r) => r && typeof r === "object")
        .map((r) => ({ text: r.text ?? "", textarea: r.textarea ?? "" }));
    }
    return out;
  });
};

const toPageView = (sections) => ({ page: sections });

function TextField({ label, hint, value, onChange, disabled, rows }) {
  return (
    <div>
      <label className="font-mono text-[10px] uppercase tracking-widest text-muted">{label}</label>
      {rows ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          rows={rows}
          className="mt-1.5 w-full resize-y rounded-lg border border-paper-line bg-paper px-3 py-2 text-sm leading-relaxed text-ink outline-none focus:border-ink disabled:opacity-60"
        />
      ) : (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className="mt-1.5 w-full rounded-lg border border-paper-line bg-paper px-3 py-2 text-sm text-ink outline-none focus:border-ink disabled:opacity-60"
        />
      )}
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}

function RichField({ label, hint, value, onChange, disabled }) {
  return (
    <div>
      <label className="font-mono text-[10px] uppercase tracking-widest text-muted">{label}</label>
      <div className="mt-1.5">
        {disabled ? (
          <div
            className="prose prose-sm max-w-none rounded-lg border border-paper-line bg-paper px-3 py-2 text-sm text-ink opacity-60"
            dangerouslySetInnerHTML={{ __html: value || "<p></p>" }}
          />
        ) : (
          <TipTapEditor value={value} onChange={onChange} variant="compact" />
        )}
      </div>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}

function MetaImageField({ value, onChange, disabled }) {
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [broken, setBroken] = useState(false);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const data = await uploadMedia([file], [""], () => {});
      const uploaded = data.items?.[0];
      if (uploaded?.url) {
        setBroken(false);
        onChange(uploaded.url);
      }
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          "Upload failed — this uses the Gallery, so you'll need gallery:upload permission"
      );
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  return (
    <div>
      <label className="font-mono text-[10px] uppercase tracking-widest text-muted">
        Meta image
      </label>

      <div className="mt-1.5 flex items-start gap-3">
        {value && !broken ? (
          <div className="relative shrink-0">
            <img
              src={value}
              alt=""
              onError={() => setBroken(true)}
              className="h-24 w-24 rounded-lg border border-paper-line object-cover"
            />
            {!disabled && (
              <button
                type="button"
                onClick={() => onChange("")}
                title="Remove image"
                className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-ink/70 text-white transition-colors hover:bg-ink"
              >
                <X size={12} />
              </button>
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={disabled || uploading}
            className="flex h-24 w-24 shrink-0 flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-paper-line text-muted transition-colors hover:border-ink/20 disabled:opacity-50"
          >
            {uploading ? (
              <Loader2 size={18} className="animate-spin text-signal" />
            ) : (
              <ImagePlus size={18} />
            )}
            <span className="text-[10px] font-medium">{uploading ? "Uploading…" : "Upload"}</span>
          </button>
        )}

        <div className="min-w-0 flex-1">
          <input
            value={value}
            onChange={(e) => {
              setBroken(false);
              onChange(e.target.value);
            }}
            disabled={disabled}
            placeholder="https://…/estimator/cover.png"
            className="w-full rounded-lg border border-paper-line bg-paper px-3 py-2 text-sm text-ink outline-none focus:border-ink disabled:opacity-60"
          />
          <p className="mt-1 text-xs text-muted">
            Shown when the page is shared. Around 200×200 or larger.
          </p>
          {value && broken && (
            <p className="mt-1 text-xs text-danger">
              This URL did not load — the old host may be unreachable. Upload a replacement.
            </p>
          )}
          {error && <p className="mt-1 text-xs text-danger">{error}</p>}
        </div>
      </div>

      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
    </div>
  );
}

function Listing({ rows, onChange, disabled }) {
  const setRow = (i, next) => onChange(rows.map((r, j) => (j === i ? next : r)));

  return (
    <div>
      <p className="mb-1.5 font-mono text-[10px] uppercase tracking-widest text-muted">List items</p>
      {rows.length === 0 ? (
        <p className="text-xs text-muted">No list items in this section.</p>
      ) : (
        <div className="space-y-2">
          {rows.map((row, i) => (
            <div key={i} className="rounded-lg border border-paper-line bg-paper p-2.5">
              <div className="flex items-start gap-2">
                <span className="mt-2 font-mono text-[10px] text-muted">{i + 1}</span>
                <div className="min-w-0 flex-1 space-y-2">
                  <input
                    value={row.text}
                    onChange={(e) => setRow(i, { ...row, text: e.target.value })}
                    disabled={disabled}
                    placeholder="Item title"
                    className="w-full rounded-lg border border-paper-line bg-paper-card px-2.5 py-1.5 text-sm font-medium text-ink outline-none focus:border-ink disabled:opacity-60"
                  />
                  <textarea
                    value={row.textarea}
                    onChange={(e) => setRow(i, { ...row, textarea: e.target.value })}
                    disabled={disabled}
                    rows={3}
                    placeholder="Item body"
                    className="w-full resize-y rounded-lg border border-paper-line bg-paper-card px-2.5 py-1.5 text-sm leading-relaxed text-ink outline-none focus:border-ink disabled:opacity-60"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => onChange(rows.filter((_, j) => j !== i))}
                  disabled={disabled}
                  title="Remove item"
                  className="rounded-lg p-1.5 text-muted transition-colors hover:bg-danger/10 hover:text-danger disabled:opacity-30"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      <button
        type="button"
        onClick={() => onChange([...rows, blankRow()])}
        disabled={disabled}
        className="mt-2 inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium text-muted transition-colors hover:bg-paper hover:text-ink disabled:opacity-40"
      >
        <Plus size={13} /> Add list item
      </button>
    </div>
  );
}

function SectionCard({ spec, index, section, onChange, disabled }) {
  const [open, setOpen] = useState(index === 0);
  const set = (key, value) => onChange({ ...section, [key]: value });

  return (
    <div className="rounded-xl border border-paper-line bg-paper-card">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 p-3 text-left"
      >
        <ChevronRight size={16} className={`shrink-0 text-muted transition-transform ${open ? "rotate-90" : ""}`} />
        <span className="font-mono text-[10px] uppercase tracking-widest text-muted">
          Section {index + 1}
        </span>
        <span className="text-sm font-medium text-ink">{spec.label}</span>
        <span className="ml-auto truncate pl-3 text-xs text-muted">
          {section.heading || "Empty"}
        </span>
      </button>

      {open && (
        <div className="space-y-4 border-t border-paper-line p-3">
          {spec.fields.map((f) => (
            <div key={f}>
              {RICH_FIELDS.has(f) ? (
                <RichField
                  label={FIELD_LABELS[f]}
                  hint={FIELD_HINTS[f]}
                  value={section[f]}
                  onChange={(v) => set(f, v)}
                  disabled={disabled}
                />
              ) : (
                <TextField
                  label={FIELD_LABELS[f]}
                  hint={FIELD_HINTS[f]}
                  value={section[f]}
                  onChange={(v) => set(f, v)}
                  disabled={disabled}
                />
              )}
              {spec.listing && spec.listingAfter === f && (
                <div className="mt-4">
                  <Listing rows={section.listing} onChange={(v) => set("listing", v)} disabled={disabled} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function LandingPageEditor({ page, slug, onSave, saving, canEdit }) {
  const metaOf = (p) => ({
    meta_title: p?.meta_title ?? "",
    meta_keyword: p?.meta_keyword ?? "",
    meta_description: p?.meta_description ?? "",
    meta_tag: p?.meta_tag ?? "",
    meta_image: p?.meta_image ?? "",
    short_description: p?.short_description ?? "",
    additional_script: p?.additional_script ?? "",
    isindex: p?.isindex === 1 ? 1 : 0,
  });

  const [meta, setMeta] = useState(() => metaOf(page));
  const [sections, setSections] = useState(() => toSections(page?.page_view));

  const dirty =
    JSON.stringify({ meta, sections }) !==
    JSON.stringify({ meta: metaOf(page), sections: toSections(page?.page_view) });

  const disabled = !canEdit;
  const setMetaField = (key) => (value) => setMeta((m) => ({ ...m, [key]: value }));

  const save = () => onSave({ ...meta, page_view: toPageView(sections) });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-paper-line bg-paper-card p-4">
        <div className="min-w-0">
          <p className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-muted">
            <Globe size={12} /> Public URL
          </p>
          <p className="mt-1 truncate font-mono text-sm text-ink">/{slug || "—"}</p>
          <p className="mt-1 text-xs text-muted">
            Set the slug and the live toggle under <span className="font-medium">Edit details</span>.
          </p>
        </div>
        {canEdit && (
          <button
            type="button"
            onClick={save}
            disabled={saving || !dirty}
            className="btn-primary inline-flex items-center gap-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
            {saving ? "Saving…" : dirty ? "Save landing page" : "Saved"}
          </button>
        )}
      </div>

      {/* ------------------------------------------------------------ SEO -- */}
      <div className="space-y-4 rounded-xl border border-paper-line bg-paper-card p-4">
        <p className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-muted">
          <Search size={12} /> Search &amp; social
        </p>

        <TextField
          label="Meta title"
          value={meta.meta_title}
          onChange={setMetaField("meta_title")}
          disabled={disabled}
          hint={`${meta.meta_title.length} characters — around 60 shows in full.`}
        />
        <TextField
          label="Meta description"
          value={meta.meta_description}
          onChange={setMetaField("meta_description")}
          disabled={disabled}
          rows={3}
          hint={`${meta.meta_description.length} characters — around 155 shows in full.`}
        />
        <div className="grid gap-4 md:grid-cols-2">
          <TextField
            label="Focus keyword"
            value={meta.meta_keyword}
            onChange={setMetaField("meta_keyword")}
            disabled={disabled}
          />
          <TextField
            label="Meta tags"
            value={meta.meta_tag}
            onChange={setMetaField("meta_tag")}
            disabled={disabled}
            hint="Comma separated."
          />
        </div>
        <MetaImageField
          value={meta.meta_image}
          onChange={setMetaField("meta_image")}
          disabled={disabled}
        />
        <TextField
          label="Short description"
          value={meta.short_description}
          onChange={setMetaField("short_description")}
          disabled={disabled}
          rows={2}
          hint="Used in listings, not in the page head."
        />

        <label className="flex cursor-pointer items-start gap-2.5">
          <button
            type="button"
            onClick={() => !disabled && setMeta((m) => ({ ...m, isindex: m.isindex === 1 ? 0 : 1 }))}
            disabled={disabled}
            aria-pressed={meta.isindex === 1}
            aria-label="Allow search engines to index this page"
            className={`mt-0.5 h-5 w-9 shrink-0 rounded-full transition-colors disabled:opacity-50 ${
              meta.isindex === 1 ? "bg-ink" : "bg-paper-line"
            }`}
          >
            <span
              className={`block h-4 w-4 rounded-full bg-white shadow transition-transform ${
                meta.isindex === 1 ? "translate-x-4" : "translate-x-0.5"
              }`}
            />
          </button>
          <span>
            <span className="text-sm font-medium text-ink">Allow search engines to index this page</span>
            <span className="block text-xs text-muted">
              Off sends <span className="font-mono">noindex, nofollow</span>.
            </span>
          </span>
        </label>

        <TextField
          label="Additional script"
          value={meta.additional_script}
          onChange={setMetaField("additional_script")}
          disabled={disabled}
          rows={4}
          hint="Injected verbatim into the public page. Only paste markup you trust."
        />
      </div>

      {/* ------------------------------------------------------- sections -- */}
      <div>
        <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-muted">
          Page sections
        </p>
        <div className="space-y-2.5">
          {SECTIONS.map((spec, i) => (
            <SectionCard
              key={i}
              spec={spec}
              index={i}
              section={sections[i]}
              disabled={disabled}
              onChange={(next) => setSections(sections.map((s, j) => (j === i ? next : s)))}
            />
          ))}
        </div>
        <p className="mt-2 text-xs text-muted">
          The public page renders these seven sections in this order. Each one shows only the fields
          its position uses, so the layout always matches the live template.
        </p>
      </div>
    </div>
  );
}
