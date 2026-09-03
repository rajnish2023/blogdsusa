import { useState } from "react";
import { Plus, X, Trash2, Sliders, Type as TypeIcon } from "lucide-react";
import TipTapEditor from "../Blog/TipTapEditor";
import FeaturedImagePicker from "../Blog/FeaturedImagePicker";
import { widgetDef } from "../../utils/pageBlocks";

const COLORS = ["", "#4f46e5", "#0ea5e9", "#10b981", "#f43f5e", "#eab308", "#1e293b", "#ffffff"];

const AlignRow = ({ value, onChange }) => (
  <div className="flex gap-1.5">
    {["left", "center", "right"].map((a) => (
      <button
        key={a}
        type="button"
        onClick={() => onChange(a)}
        className={`flex-1 rounded-lg border px-2 py-1.5 text-xs font-medium capitalize ${
          value === a ? "border-signal bg-signal-soft text-signal" : "border-paper-line text-muted hover:border-ink/20"
        }`}
      >
        {a}
      </button>
    ))}
  </div>
);

const Field = ({ label, children }) => (
  <div>
    <label className="mb-1.5 block text-xs font-medium text-muted">{label}</label>
    {children}
  </div>
);

const SpacingInput = ({ label, value = {}, onChange }) => {
  const set = (dir, val) => {
    const next = { ...value };
    next[dir] = parseInt(val, 10) || 0;
    onChange(next);
  };
  return (
    <div>
      <label className="mb-1 block text-[11px] font-medium text-muted">{label}</label>
      <div className="grid grid-cols-4 gap-1">
        {["top", "right", "bottom", "left"].map((dir) => (
          <div key={dir}>
            <input
              type="number"
              value={value[dir] ?? 0}
              onChange={(e) => set(dir, e.target.value)}
              className="w-full rounded-md border border-paper-line bg-paper px-1 py-1 text-center font-mono text-[10px] text-ink focus:border-signal"
            />
            <span className="mt-0.5 block text-center text-[9px] uppercase tracking-wide text-muted/60">{dir}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const inputClass = "w-full rounded-lg border border-paper-line bg-paper px-3 py-2 text-sm text-ink focus:border-signal";

export default function BlockSettingsPanel({ block, onChange, onDelete }) {
  const [activeTab, setActiveTab] = useState("content"); // "content" | "style" | "advanced"
  const def = widgetDef(block.type);
  const set = (patch) => onChange({ ...block, props: { ...block.props, ...patch } });
  
  const blockStyle = block.style || { margin: { top: 0, right: 0, bottom: 15, left: 0 }, padding: { top: 0, right: 0, bottom: 0, left: 0 } };
  const setStyle = (patch) => onChange({ ...block, style: { ...blockStyle, ...patch } });

  return (
    <div className="space-y-4">
      {/* Title */}
      <div className="flex items-center justify-between border-b border-paper-line pb-2">
        <div className="flex items-center gap-2">
          {def && <def.icon size={15} className="text-signal" />}
          <h3 className="font-display text-sm font-semibold text-ink">{def?.label || block.type}</h3>
        </div>
        <button onClick={onDelete} className="rounded-md p-1.5 text-muted hover:bg-danger/5 hover:text-danger" title="Delete block">
          <Trash2 size={14} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-paper-line">
        {["content", "style", "advanced"].map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`flex-1 border-b-2 pb-1.5 text-center text-[10px] font-semibold uppercase tracking-wider transition-colors ${
              activeTab === tab ? "border-signal text-signal" : "border-transparent text-muted hover:text-ink"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* ─── TAB 1: CONTENT ─────────────────────────────────────────────────── */}
      {activeTab === "content" && (
        <div className="space-y-4">
          {block.type === "heading" && (
            <>
              <Field label="Text">
                <input value={block.props.text} onChange={(e) => set({ text: e.target.value })} className={inputClass} />
              </Field>
              <Field label="Level">
                <div className="flex gap-1.5">
                  {["h1", "h2", "h3", "h4"].map((l) => (
                    <button
                      key={l}
                      onClick={() => set({ level: l })}
                      className={`flex-1 rounded-lg border py-1.5 text-xs font-semibold uppercase ${
                        block.props.level === l ? "border-signal bg-signal-soft text-signal" : "border-paper-line text-muted hover:border-ink/20"
                      }`}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </Field>
              <Field label="Alignment">
                <AlignRow value={block.props.align} onChange={(align) => set({ align })} />
              </Field>
            </>
          )}

          {block.type === "text" && (
            <Field label="Content">
              <TipTapEditor value={block.props.html} onChange={(html) => set({ html })} placeholder="Write something..." />
            </Field>
          )}

          {block.type === "image" && (
            <>
              <Field label="Image">
                <FeaturedImagePicker image={{ url: block.props.url, alt: block.props.alt }} onChange={(img) => set({ url: img?.url || "", alt: img?.alt || "" })} />
              </Field>
              <Field label="Link (optional)">
                <input value={block.props.link} onChange={(e) => set({ link: e.target.value })} placeholder="https://..." className={inputClass} />
              </Field>
              <Field label="Alignment">
                <AlignRow value={block.props.align} onChange={(align) => set({ align })} />
              </Field>
            </>
          )}

          {block.type === "button" && (
            <>
              <Field label="Button text">
                <input value={block.props.text} onChange={(e) => set({ text: e.target.value })} className={inputClass} />
              </Field>
              <Field label="Link URL">
                <input value={block.props.url} onChange={(e) => set({ url: e.target.value })} placeholder="https://..." className={inputClass} />
              </Field>
              <Field label="Style">
                <div className="flex gap-1.5">
                  {["primary", "secondary"].map((s) => (
                    <button
                      key={s}
                      onClick={() => set({ style: s })}
                      className={`flex-1 rounded-lg border py-1.5 text-xs font-medium capitalize ${
                        block.props.style === s ? "border-signal bg-signal-soft text-signal" : "border-paper-line text-muted hover:border-ink/20"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </Field>
              <Field label="Alignment">
                <AlignRow value={block.props.align} onChange={(align) => set({ align })} />
              </Field>
            </>
          )}

          {block.type === "list" && (
            <>
              <Field label="Items">
                <div className="space-y-2">
                  {block.props.items.map((item, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                      <input
                        value={item}
                        onChange={(e) => {
                          const items = [...block.props.items];
                          items[i] = e.target.value;
                          set({ items });
                        }}
                        className={inputClass}
                      />
                      <button
                        onClick={() => set({ items: block.props.items.filter((_, idx) => idx !== i) })}
                        className="rounded-md p-1.5 text-muted hover:bg-danger/5 hover:text-danger"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => set({ items: [...block.props.items, "New item"] })}
                  className="btn-secondary mt-2 w-full justify-center py-1.5 text-xs"
                >
                  <Plus size={13} /> Add item
                </button>
              </Field>
              <label className="flex items-center gap-2 text-xs font-medium text-ink">
                <input type="checkbox" checked={block.props.ordered} onChange={(e) => set({ ordered: e.target.checked })} />
                Numbered list
              </label>
            </>
          )}

          {block.type === "video" && (
            <>
              <Field label="YouTube or Vimeo URL">
                <input value={block.props.url} onChange={(e) => set({ url: e.target.value })} placeholder="https://youtube.com/watch?v=..." className={inputClass} />
              </Field>
              <Field label="Caption (optional)">
                <input value={block.props.caption} onChange={(e) => set({ caption: e.target.value })} className={inputClass} />
              </Field>
            </>
          )}

          {block.type === "divider" && (
            <Field label="Style">
              <div className="flex gap-1.5">
                {["solid", "dashed"].map((s) => (
                  <button
                    key={s}
                    onClick={() => set({ style: s })}
                    className={`flex-1 rounded-lg border py-1.5 text-xs font-medium capitalize ${
                      block.props.style === s ? "border-signal bg-signal-soft text-signal" : "border-paper-line text-muted hover:border-ink/20"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </Field>
          )}

          {block.type === "spacer" && (
            <Field label="Height">
              <div className="flex gap-1.5">
                {["sm", "md", "lg"].map((s) => (
                  <button
                    key={s}
                    onClick={() => set({ height: s })}
                    className={`flex-1 rounded-lg border py-1.5 text-xs font-semibold uppercase ${
                      block.props.height === s ? "border-signal bg-signal-soft text-signal" : "border-paper-line text-muted hover:border-ink/20"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </Field>
          )}

          {block.type === "html" && (
            <Field label="Custom HTML">
              <textarea
                value={block.props.code}
                onChange={(e) => set({ code: e.target.value })}
                rows={8}
                spellCheck={false}
                className="w-full resize-y rounded-lg border border-paper-line bg-paper px-3 py-2 font-mono text-xs text-ink focus:border-signal"
              />
            </Field>
          )}

          {/* ─── NEW WIDGETS CONTENT EDITORS ───────────────────────────────── */}
          {block.type === "iconbox" && (
            <>
              <Field label="Icon name (Lucide catalog)">
                <select value={block.props.icon} onChange={(e) => set({ icon: e.target.value })} className={inputClass}>
                  {["HelpCircle", "Star", "Heart", "Check", "Play", "Phone", "Mail", "Award", "MapPin", "Shield", "Zap", "Layers", "Smile", "Share2", "Users"].map((ico) => (
                    <option key={ico} value={ico}>{ico}</option>
                  ))}
                </select>
              </Field>
              <Field label="Heading Title">
                <input value={block.props.title} onChange={(e) => set({ title: e.target.value })} className={inputClass} />
              </Field>
              <Field label="Description text">
                <textarea value={block.props.description} onChange={(e) => set({ description: e.target.value })} rows={3} className={inputClass} />
              </Field>
              <Field label="Link URL">
                <input value={block.props.link} onChange={(e) => set({ link: e.target.value })} placeholder="https://..." className={inputClass} />
              </Field>
              <Field label="Alignment">
                <AlignRow value={block.props.align} onChange={(align) => set({ align })} />
              </Field>
            </>
          )}

          {block.type === "testimonial" && (
            <>
              <Field label="Quote Text">
                <textarea value={block.props.quote} onChange={(e) => set({ quote: e.target.value })} rows={4} className={inputClass} />
              </Field>
              <Field label="Author Name">
                <input value={block.props.name} onChange={(e) => set({ name: e.target.value })} className={inputClass} />
              </Field>
              <Field label="Author Designation">
                <input value={block.props.designation} onChange={(e) => set({ designation: e.target.value })} className={inputClass} />
              </Field>
              <Field label="Avatar Image">
                <FeaturedImagePicker image={{ url: block.props.avatar, alt: block.props.name }} onChange={(img) => set({ avatar: img?.url || "" })} />
              </Field>
            </>
          )}

          {block.type === "accordion" && (
            <Field label="Accordion Items">
              <div className="space-y-3">
                {block.props.items.map((item, idx) => (
                  <div key={idx} className="rounded-lg border border-paper-line p-2.5 space-y-2 bg-paper/50">
                    <div className="flex items-center gap-1">
                      <input
                        value={item.title}
                        onChange={(e) => {
                          const items = [...block.props.items];
                          items[idx] = { ...item, title: e.target.value };
                          set({ items });
                        }}
                        placeholder="Accordion Header"
                        className={inputClass}
                      />
                      <button
                        onClick={() => set({ items: block.props.items.filter((_, i) => i !== idx) })}
                        className="rounded p-1.5 text-muted hover:bg-danger/10 hover:text-danger"
                      >
                        <X size={13} />
                      </button>
                    </div>
                    <div>
                      <span className="mb-0.5 block text-[10px] text-muted">Answer Content:</span>
                      <TipTapEditor
                        value={item.content}
                        onChange={(content) => {
                          const items = [...block.props.items];
                          items[idx] = { ...item, content };
                          set({ items });
                        }}
                      />
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => set({ items: [...block.props.items, { title: "FAQ Question?", content: "<p>FAQ Answer content...</p>" }] })}
                  className="btn-secondary w-full justify-center text-xs py-1.5"
                >
                  <Plus size={13} className="mr-1" /> Add Accordion Row
                </button>
              </div>
            </Field>
          )}

          {block.type === "socials" && (
            <>
              <Field label="Social Links">
                <div className="space-y-2">
                  {block.props.items.map((item, idx) => (
                    <div key={idx} className="flex gap-2">
                      <select
                        value={item.platform}
                        onChange={(e) => {
                          const items = [...block.props.items];
                          items[idx] = { ...item, platform: e.target.value };
                          set({ items });
                        }}
                        className="w-24 rounded-lg border border-paper-line bg-paper px-2 py-1.5 text-xs text-ink"
                      >
                        {["facebook", "twitter", "linkedin", "instagram", "youtube", "github", "globe"].map((plat) => (
                          <option key={plat} value={plat}>{plat}</option>
                        ))}
                      </select>
                      <input
                        value={item.url}
                        onChange={(e) => {
                          const items = [...block.props.items];
                          items[idx] = { ...item, url: e.target.value };
                          set({ items });
                        }}
                        placeholder="https://..."
                        className={inputClass}
                      />
                      <button
                        onClick={() => set({ items: block.props.items.filter((_, i) => i !== idx) })}
                        className="rounded p-1.5 text-muted hover:bg-danger/10 hover:text-danger"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => set({ items: [...block.props.items, { platform: "globe", url: "https://" }] })}
                    className="btn-secondary w-full justify-center text-xs py-1.5 mt-1"
                  >
                    <Plus size={13} className="mr-1" /> Add Platform
                  </button>
                </div>
              </Field>
              <Field label="Alignment">
                <AlignRow value={block.props.align} onChange={(align) => set({ align })} />
              </Field>
            </>
          )}

          {/* ── CONTACT FORM ────────────────────────────────────────────── */}
          {block.type === "contactform" && (
            <>
              <Field label="Form Heading">
                <input
                  type="text"
                  value={block.props.heading || ""}
                  onChange={(e) => set({ heading: e.target.value })}
                  className={inputClass}
                  placeholder="Get a Free Consultation"
                />
              </Field>
              <Field label="Subtitle">
                <input
                  type="text"
                  value={block.props.subtitle || ""}
                  onChange={(e) => set({ subtitle: e.target.value })}
                  className={inputClass}
                  placeholder="Short description text"
                />
              </Field>
              <Field label="Button Text">
                <input
                  type="text"
                  value={block.props.buttonText || ""}
                  onChange={(e) => set({ buttonText: e.target.value })}
                  className={inputClass}
                  placeholder="Submit Request"
                />
              </Field>
              <Field label="Button Color">
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={block.props.buttonColor || "#dc2626"}
                    onChange={(e) => set({ buttonColor: e.target.value })}
                    className="h-8 w-8 cursor-pointer rounded border border-paper-line"
                  />
                  <input
                    type="text"
                    value={block.props.buttonColor || "#dc2626"}
                    onChange={(e) => set({ buttonColor: e.target.value })}
                    className="w-24 rounded border border-paper-line bg-paper px-2 py-1 text-xs text-ink"
                  />
                </div>
              </Field>
              <Field label="Visible Fields">
                <div className="space-y-1.5">
                  {["name", "email", "phone", "company", "service", "message"].map((field) => (
                    <label key={field} className="flex items-center gap-2 text-xs text-ink cursor-pointer">
                      <input
                        type="checkbox"
                        checked={(block.props.fields || []).includes(field)}
                        onChange={(e) => {
                          const fields = block.props.fields || [];
                          set({ fields: e.target.checked ? [...fields, field] : fields.filter((f) => f !== field) });
                        }}
                        className="rounded border-paper-line accent-signal"
                      />
                      <span className="capitalize">{field}</span>
                    </label>
                  ))}
                </div>
              </Field>
              <Field label="Service Dropdown Options">
                <div className="space-y-1.5">
                  {(block.props.serviceOptions || []).map((opt, i) => (
                    <div key={i} className="flex items-center gap-1">
                      <input
                        type="text"
                        value={opt}
                        onChange={(e) => {
                          const options = [...(block.props.serviceOptions || [])];
                          options[i] = e.target.value;
                          set({ serviceOptions: options });
                        }}
                        className={inputClass + " flex-1"}
                      />
                      <button
                        type="button"
                        onClick={() => set({ serviceOptions: (block.props.serviceOptions || []).filter((_, j) => j !== i) })}
                        className="p-1 text-muted hover:text-danger"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => set({ serviceOptions: [...(block.props.serviceOptions || []), "New option"] })}
                    className="btn-secondary w-full justify-center text-xs py-1.5 mt-1"
                  >
                    <Plus size={13} className="mr-1" /> Add Option
                  </button>
                </div>
              </Field>
              <Field label="Source / Page Slug">
                <input
                  type="text"
                  value={block.props.source || ""}
                  onChange={(e) => set({ source: e.target.value })}
                  className={inputClass}
                  placeholder="auto-filled from page slug"
                />
              </Field>
              <Field label="Custom API Endpoint URL (Optional)">
                <input
                  type="url"
                  value={block.props.customEndpoint || ""}
                  onChange={(e) => set({ customEndpoint: e.target.value })}
                  className={inputClass}
                  placeholder="https://your-crm-endpoint.com/api/leads"
                />
                <span className="text-[10px] text-muted leading-tight mt-1 block">
                  Leaves empty to use the default backend notification system.
                </span>
              </Field>
            </>
          )}
        </div>
      )}

      {/* ─── TAB 2: STYLE ───────────────────────────────────────────────────── */}
      {activeTab === "style" && (
        <div className="space-y-4">
          {/* Typography options */}
          <Field label="Text Color">
            <div className="flex flex-wrap gap-1.5">
              {COLORS.map((c) => (
                <button
                  key={c || "none"}
                  type="button"
                  onClick={() => setStyle({ color: c })}
                  className={`h-6 w-6 rounded-full border ${blockStyle.color === c ? "border-signal scale-105" : "border-paper-line"}`}
                  style={{ backgroundColor: c || "#eee" }}
                  title={c || "Default"}
                />
              ))}
              <input
                type="text"
                placeholder="#000000"
                value={blockStyle.color || ""}
                onChange={(e) => setStyle({ color: e.target.value })}
                className="w-24 rounded border border-paper-line bg-paper px-2 py-0.5 text-xs text-ink"
              />
            </div>
          </Field>

          <Field label="Background Color">
            <div className="flex flex-wrap gap-1.5">
              {COLORS.map((c) => (
                <button
                  key={c || "none"}
                  type="button"
                  onClick={() => setStyle({ backgroundColor: c })}
                  className={`h-6 w-6 rounded-full border ${blockStyle.backgroundColor === c ? "border-signal scale-105" : "border-paper-line"}`}
                  style={{ backgroundColor: c || "#eee" }}
                  title={c || "Default"}
                />
              ))}
              <input
                type="text"
                placeholder="#ffffff"
                value={blockStyle.backgroundColor || ""}
                onChange={(e) => setStyle({ backgroundColor: e.target.value })}
                className="w-24 rounded border border-paper-line bg-paper px-2 py-0.5 text-xs text-ink"
              />
            </div>
          </Field>

          <Field label="Font Size">
            <div className="flex gap-2 items-center">
              <input
                type="range"
                min="8"
                max="72"
                value={parseInt(blockStyle.fontSize, 10) || 14}
                onChange={(e) => setStyle({ fontSize: `${e.target.value}px` })}
                className="flex-1"
              />
              <span className="font-mono text-xs text-muted w-10 text-right">{blockStyle.fontSize || "Default"}</span>
            </div>
          </Field>

          <Field label="Font Weight">
            <select
              value={blockStyle.fontWeight || ""}
              onChange={(e) => setStyle({ fontWeight: e.target.value })}
              className={inputClass}
            >
              <option value="">Default (Inherited)</option>
              <option value="300">Light (300)</option>
              <option value="400">Regular (400)</option>
              <option value="600">Semi-bold (600)</option>
              <option value="700">Bold (700)</option>
            </select>
          </Field>

          <Field label="Border Radius (px)">
            <input
              type="text"
              placeholder="e.g. 8px"
              value={blockStyle.borderRadius || ""}
              onChange={(e) => setStyle({ borderRadius: e.target.value })}
              className={inputClass}
            />
          </Field>
        </div>
      )}

      {/* ─── TAB 3: ADVANCED ────────────────────────────────────────────────── */}
      {activeTab === "advanced" && (
        <div className="space-y-4">
          <SpacingInput
            label="Outer Margin (px)"
            value={blockStyle.margin || { top: 0, right: 0, bottom: 15, left: 0 }}
            onChange={(margin) => setStyle({ margin })}
          />

          <SpacingInput
            label="Inner Padding (px)"
            value={blockStyle.padding || { top: 0, right: 0, bottom: 0, left: 0 }}
            onChange={(padding) => setStyle({ padding })}
          />
        </div>
      )}
    </div>
  );
}
