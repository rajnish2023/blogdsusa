import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { ArrowLeft, Loader2, Save, Send, Eye, Settings2, Monitor, Tablet, Smartphone, Layers } from "lucide-react";
import WidgetPalette from "../components/PageBuilder/WidgetPalette";
import CanvasArea from "../components/PageBuilder/CanvasArea";
import BlockSettingsPanel from "../components/PageBuilder/BlockSettingsPanel";
import SectionSettingsPanel from "../components/PageBuilder/SectionSettingsPanel";
import ColumnSettingsPanel from "../components/PageBuilder/ColumnSettingsPanel";
import PagePreviewModal from "../components/PageBuilder/PagePreviewModal";
import SeoPanel from "../components/Blog/SeoPanel";
import Toast from "../components/Shared/Toast";
import { fetchPage, createPage, updatePage, setPageStatus } from "../api/pageApi";
import { fetchPageCategories } from "../api/pageCategoryApi";
import {
  createSection, createBlock, resizeSectionColumns, removeBlockById,
  insertBlockAt, extractSectionsText, uid, TEMPLATES,
} from "../utils/pageBlocks";
import { slugify } from "../utils/slugify";
import { usePermissions } from "../auth/AuthContext";

const emptySeo = { metaTitle: "", metaDescription: "", focusKeyword: "" };

export default function PageBuilderPage() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const can = usePermissions();
  const canPublish = can("pages:publish");

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState([]);
  const [slugTouched, setSlugTouched] = useState(false);
  const [status, setStatus] = useState("draft");
  const [showPreview, setShowPreview] = useState(false);
  const [rightTab, setRightTab] = useState("design");
  const [previewMode, setPreviewMode] = useState("desktop"); // "desktop" | "tablet" | "mobile"
  const [toast, setToast] = useState(null);
  const [showWizard, setShowWizard] = useState(!isEdit);
  const showToast = (message, type = "success") => setToast({ message, type });

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [category, setCategory] = useState("");
  const [seo, setSeo] = useState(emptySeo);
  const [sections, setSections] = useState([]);
  const [selection, setSelection] = useState(null);

  useEffect(() => {
    fetchPageCategories().then(setCategories).catch(() => {});
  }, []);

  useEffect(() => {
    if (!isEdit) return;
    (async () => {
      try {
        const page = await fetchPage(id);
        setTitle(page.title);
        setSlug(page.slug);
        setCategory(page.category?._id || "");
        setSeo({ metaTitle: page.seo?.metaTitle || "", metaDescription: page.seo?.metaDescription || "", focusKeyword: page.seo?.focusKeyword || "" });
        setSections(page.content?.sections || []);
        setStatus(page.status);
        setSlugTouched(true);
      } catch {
        showToast("Failed to load page", "error");
      } finally {
        setLoading(false);
      }
    })();
  }, [id, isEdit]);

  const handleTitleChange = (e) => {
    const val = e.target.value;
    setTitle(val);
    if (!slugTouched) setSlug(slugify(val));
  };

  // --- Section operations ---
  const addSection = (columns, afterIndex) => {
    setSections((prev) => {
      const newSection = createSection(columns);
      if (afterIndex !== undefined && afterIndex !== null) {
        return [...prev.slice(0, afterIndex + 1), newSection, ...prev.slice(afterIndex + 1)];
      }
      return [...prev, newSection];
    });
  };

  const insertSectionAt = (afterIndex, sectionData) => {
    setSections((prev) => {
      const processed = {
        ...sectionData,
        id: uid("section"),
        columnBlocks: sectionData.columnBlocks.map((col) => col.map((b) => ({ ...b, id: uid("block"), props: { ...b.props } }))),
      };
      if (afterIndex !== undefined && afterIndex !== null) {
        return [...prev.slice(0, afterIndex + 1), processed, ...prev.slice(afterIndex + 1)];
      }
      return [...prev, processed];
    });
    showToast("Section inserted!");
  };

  const selectSection = (sectionId) => setSelection({ type: "section", sectionId });
  const selectColumn = (sectionId, colIndex) => setSelection({ type: "column", sectionId, colIndex });
  const selectBlock = (sectionId, colIndex, blockId) => setSelection({ type: "block", sectionId, colIndex, blockId });
  const deselect = () => setSelection(null);

  const deleteSection = (sectionId) => {
    setSections((prev) => prev.filter((s) => s.id !== sectionId));
    if (selection?.sectionId === sectionId) setSelection(null);
  };

  const duplicateSection = (sectionId) => {
    setSections((prev) => {
      const idx = prev.findIndex((s) => s.id === sectionId);
      if (idx === -1) return prev;
      const original = prev[idx];
      const clone = {
        ...original,
        id: uid("section"),
        columnBlocks: original.columnBlocks.map((col) => col.map((b) => ({ ...b, id: uid("block"), props: { ...b.props } }))),
      };
      return [...prev.slice(0, idx + 1), clone, ...prev.slice(idx + 1)];
    });
  };

  const moveSectionUp = (sectionId) => {
    setSections((prev) => {
      const idx = prev.findIndex((s) => s.id === sectionId);
      if (idx <= 0) return prev;
      const next = [...prev];
      [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
      return next;
    });
  };

  const moveSectionDown = (sectionId) => {
    setSections((prev) => {
      const idx = prev.findIndex((s) => s.id === sectionId);
      if (idx === -1 || idx >= prev.length - 1) return prev;
      const next = [...prev];
      [next[idx + 1], next[idx]] = [next[idx], next[idx + 1]];
      return next;
    });
  };

  const changeSectionColumns = (sectionId, newColumns) => {
    setSections((prev) => prev.map((s) => (s.id === sectionId ? resizeSectionColumns(s, newColumns) : s)));
  };

  const updateSection = (sectionId, patch) => {
    setSections((prev) => prev.map((s) => (s.id === sectionId ? { ...s, ...patch } : s)));
  };

  const importTemplate = (templateSections, templateId) => {
    const processed = templateSections.map((s) => ({
      ...s,
      id: uid("section"),
      columnBlocks: s.columnBlocks.map((col) => col.map((b) => ({ ...b, id: uid("block"), props: { ...b.props } }))),
    }));
    setSections((prev) => [...prev, ...processed]);

    if (templateId === "microsoft-solutions") {
      setTitle("Microsoft Solutions Landing Page");
      setSlug("microsoft-solutions");
      const solCat = categories.find((c) => c.name.toLowerCase().includes("solution"));
      if (solCat) setCategory(solCat._id);
      setSeo({ metaTitle: "Microsoft Solutions Landing Page", metaDescription: "Scale smarter and grow faster with Microsoft solutions configured for startups.", focusKeyword: "microsoft solutions" });
      showToast("Microsoft Solutions preset imported & Solution category set!");
    } else if (templateId === "industry-page") {
      setTitle("Industry Solutions Overview");
      setSlug("industry-solutions");
      const indCat = categories.find((c) => c.name.toLowerCase().includes("industry"));
      if (indCat) setCategory(indCat._id);
      setSeo({ metaTitle: "Industry Solutions Overview", metaDescription: "Empower logistics, retail, manufacturing, or healthcare operations with Microsoft enterprise cloud platforms.", focusKeyword: "industry solutions" });
      showToast("Industry preset imported & Industry category set!");
    } else if (templateId === "service-page") {
      setTitle("Our Services Framework");
      setSlug("our-services");
      const serCat = categories.find((c) => c.name.toLowerCase().includes("service"));
      if (serCat) setCategory(serCat._id);
      setSeo({ metaTitle: "Our Services Framework", metaDescription: "Explore our software consulting, custom layouts, and cloud backup automation services.", focusKeyword: "services" });
      showToast("Service preset imported & Service category set!");
    } else if (templateId === "landing-page") {
      setTitle("Product Marketing Landing Page");
      setSlug("landing-page");
      setSeo({ metaTitle: "Product Marketing Landing Page", metaDescription: "Learn more details about our digital automation services and features.", focusKeyword: "marketing" });
      showToast("Functional Landing Page template imported!");
    } else {
      showToast("Template sections added!");
    }
  };

  // --- Block operations ---
  const deleteBlock = (sectionId, colIndex, blockId) => {
    setSections((prev) => removeBlockById(prev, blockId).sections);
    if (selection?.blockId === blockId) setSelection(null);
  };

  const duplicateBlock = (sectionId, colIndex, blockId) => {
    setSections((prev) =>
      prev.map((section) => {
        if (section.id !== sectionId) return section;
        const columnBlocks = section.columnBlocks.map((col, idx) => {
          if (idx !== colIndex) return col;
          const pos = col.findIndex((b) => b.id === blockId);
          if (pos === -1) return col;
          const clone = { ...col[pos], id: uid("block"), props: { ...col[pos].props } };
          return [...col.slice(0, pos + 1), clone, ...col.slice(pos + 1)];
        });
        return { ...section, columnBlocks };
      })
    );
  };

  const updateBlockProps = (updatedBlock) => {
    if (!selection || selection.type !== "block") return;
    setSections((prev) =>
      prev.map((section) => {
        if (section.id !== selection.sectionId) return section;
        const columnBlocks = section.columnBlocks.map((col, idx) =>
          idx !== selection.colIndex ? col : col.map((b) => (b.id === updatedBlock.id ? updatedBlock : b))
        );
        return { ...section, columnBlocks };
      })
    );
  };

  const dragStartMove = (e, sectionId, colIndex, blockId) => {
    e.dataTransfer.setData("application/x-move-block", JSON.stringify({ sectionId, colIndex, blockId }));
    e.dataTransfer.effectAllowed = "move";
  };

  const dropAt = (e, targetSectionId, targetColIndex, beforeId, afterId) => {
    e.preventDefault();
    const newType = e.dataTransfer.getData("application/x-new-block");
    const moveRaw = e.dataTransfer.getData("application/x-move-block");

    if (newType) {
      const block = createBlock(newType);
      if (!block) return;
      setSections((prev) => insertBlockAt(prev, targetSectionId, targetColIndex, block, beforeId, afterId));
      setSelection({ type: "block", sectionId: targetSectionId, colIndex: targetColIndex, blockId: block.id });
      return;
    }

    if (moveRaw) {
      const { blockId } = JSON.parse(moveRaw);
      setSections((prev) => {
        const { removed, sections: withoutBlock } = removeBlockById(prev, blockId);
        if (!removed) return prev;
        return insertBlockAt(withoutBlock, targetSectionId, targetColIndex, removed, beforeId, afterId);
      });
      setSelection({ type: "block", sectionId: targetSectionId, colIndex: targetColIndex, blockId });
    }
  };

  // --- Save/publish ---
  const buildPayload = (targetStatus) => ({
    title,
    slug,
    content: { sections },
    category: category || null,
    seo,
    status: targetStatus,
  });

  const handleSave = async (targetStatus) => {
    if (!title.trim()) {
      showToast("Give your page a title first", "error");
      return;
    }
    setSaving(true);
    try {
      if (isEdit) {
        const page = await updatePage(id, buildPayload(targetStatus));
        if (targetStatus !== status && canPublish) await setPageStatus(id, targetStatus);
        setStatus(page.status);
        showToast(targetStatus === "published" ? "Page published" : "Draft saved");
      } else {
        const page = await createPage(buildPayload(targetStatus));
        showToast(page.status === "published" ? "Page published" : "Draft saved");
        navigate(`/pages/${page._id}/edit`, { replace: true });
      }
    } catch (err) {
      showToast(err?.response?.data?.message || "Failed to save page", "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen flex-1 items-center justify-center">
        <Loader2 size={22} className="animate-spin text-signal" />
      </div>
    );
  }

  const selectedSection = selection?.type === "section" ? sections.find((s) => s.id === selection.sectionId) : null;
  const selectedColumnSection = selection?.type === "column" ? sections.find((s) => s.id === selection.sectionId) : null;
  const selectedBlock =
    selection?.type === "block"
      ? sections.find((s) => s.id === selection.sectionId)?.columnBlocks[selection.colIndex]?.find((b) => b.id === selection.blockId)
      : null;

  return (
    <div className="flex h-screen flex-1 flex-col overflow-hidden bg-paper">
      {/* Top Header */}
      <header className="flex items-center justify-between border-b border-paper-line bg-paper-card px-6 py-3 z-10 shadow-sm">
        <div className="flex min-w-0 items-center gap-3">
          <Link to="/pages" className="rounded-md p-2 text-muted hover:bg-paper hover:text-ink">
            <ArrowLeft size={18} />
          </Link>
          <input
            value={title}
            onChange={handleTitleChange}
            placeholder="Untitled page"
            className="w-64 truncate border-none bg-transparent font-display text-base font-semibold text-ink placeholder:text-muted/50 focus:outline-none"
          />
          <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ${status === "published" ? "bg-success/10 text-success" : "bg-ink/10 text-muted"}`}>
            {status}
          </span>
        </div>

        {/* Responsive mode buttons */}
        <div className="flex items-center gap-1 bg-paper border border-paper-line rounded-lg p-1 text-xs">
          {[
            { mode: "desktop", icon: Monitor, label: "Desktop" },
            { mode: "tablet", icon: Tablet, label: "Tablet" },
            { mode: "mobile", icon: Smartphone, label: "Mobile" },
          ].map(({ mode, icon: Icon }) => (
            <button
              key={mode}
              type="button"
              onClick={() => setPreviewMode(mode)}
              className={`p-1.5 rounded-md transition-colors ${previewMode === mode ? "bg-signal text-white" : "text-muted hover:text-ink"}`}
              title={mode}
            >
              <Icon size={14} />
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button onClick={() => setShowPreview(true)} className="btn-secondary">
            <Eye size={16} />
            Preview
          </button>
          <button onClick={() => handleSave("draft")} disabled={saving} className="btn-secondary disabled:opacity-60">
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Save draft
          </button>
          {canPublish && (
            <button onClick={() => handleSave("published")} disabled={saving} className="btn-primary disabled:opacity-60">
              <Send size={16} />
              {status === "published" ? "Update & keep live" : "Publish"}
            </button>
          )}
        </div>
      </header>

      {/* Main split builder view */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left widget palette */}
        <aside className="w-64 shrink-0 border-r border-paper-line bg-paper-card shadow-sm z-10">
          <WidgetPalette onAddSection={addSection} onImportTemplate={importTemplate} />
        </aside>

        {/* Center Builder Canvas Frame */}
        <main className="flex-1 overflow-y-auto bg-paper px-8 py-8 flex flex-col items-center">
          <div
            className={`w-full transition-all duration-300 ${
              previewMode === "mobile"
                ? "max-w-[390px] border-8 border-ink/90 rounded-[32px] p-6 shadow-2xl min-h-[640px] bg-paper-card"
                : previewMode === "tablet"
                ? "max-w-[768px] border-4 border-paper-line rounded-xl shadow-lg min-h-[800px] bg-paper-card"
                : "max-w-4xl"
            }`}
          >
            <CanvasArea
              sections={sections}
              selection={selection}
              selectedColumnIndex={selection?.type === "column" ? selection.colIndex : null}
              onSelectSection={selectSection}
              onSelectColumn={selectColumn}
              onSelectBlock={selectBlock}
              onDeselect={deselect}
              onDeleteSection={deleteSection}
              onDuplicateSection={duplicateSection}
              onMoveSectionUp={moveSectionUp}
              onMoveSectionDown={moveSectionDown}
              onDeleteBlock={deleteBlock}
              onDuplicateBlock={duplicateBlock}
              onDragStartMove={dragStartMove}
              onDropAt={dropAt}
              onAddSection={addSection}
              onInsertSectionAt={insertSectionAt}
            />
          </div>
        </main>

        {/* Right styling settings sidebar */}
        <aside className="w-80 shrink-0 overflow-y-auto border-l border-paper-line bg-paper-card p-5 shadow-sm z-10">
          <div className="mb-4 flex items-center gap-1 rounded-lg border border-paper-line p-1 bg-paper/50">
            <button
              onClick={() => setRightTab("design")}
              className={`flex-1 rounded-md py-1.5 text-xs font-semibold transition-colors ${rightTab === "design" ? "bg-signal text-white shadow-sm" : "text-muted"}`}
            >
              Design
            </button>
            <button
              onClick={() => setRightTab("page")}
              className={`flex flex-1 items-center justify-center gap-1 rounded-md py-1.5 text-xs font-semibold transition-colors ${rightTab === "page" ? "bg-signal text-white shadow-sm" : "text-muted"}`}
            >
              <Settings2 size={12} /> Page
            </button>
          </div>

          {rightTab === "design" && (
            <>
              {selection?.type === "block" && selectedBlock && (
                <BlockSettingsPanel
                  block={selectedBlock}
                  onChange={updateBlockProps}
                  onDelete={() => deleteBlock(selection.sectionId, selection.colIndex, selection.blockId)}
                />
              )}
              
              {selection?.type === "column" && selectedColumnSection && (
                <ColumnSettingsPanel
                  section={selectedColumnSection}
                  colIndex={selection.colIndex}
                  onChange={(patch) => updateSection(selection.sectionId, patch)}
                  onDeselect={deselect}
                />
              )}

              {selection?.type === "section" && selectedSection && (
                <SectionSettingsPanel
                  section={selectedSection}
                  onChangeColumns={(n) => changeSectionColumns(selectedSection.id, n)}
                  onChange={(patch) => updateSection(selectedSection.id, patch)}
                  onDelete={() => deleteSection(selectedSection.id)}
                />
              )}

              {!selection && (
                <p className="py-8 text-center text-xs text-muted">Select a section, column handle, or widget on the canvas to configure it.</p>
              )}
            </>
          )}

          {rightTab === "page" && (
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted">URL slug</label>
                <input
                  value={slug}
                  onChange={(e) => {
                    setSlugTouched(true);
                    setSlug(slugify(e.target.value));
                  }}
                  className="w-full rounded-lg border border-paper-line bg-paper px-3 py-2 text-sm text-ink focus:border-signal"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded-lg border border-paper-line bg-paper px-3 py-2 text-sm text-ink focus:border-signal"
                >
                  <option value="">No category</option>
                  {categories.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <SeoPanel title={seo.metaTitle || title} content={extractSectionsText(sections)} slug={slug} seo={seo} onSeoChange={setSeo} />
            </div>
          )}
        </aside>
      </div>

      {showPreview && <PagePreviewModal sections={sections} title={title} onClose={() => setShowPreview(false)} />}
      {showWizard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/70 backdrop-blur-md px-4 py-6 overflow-y-auto animate-fadeIn">
          <div className="w-full max-w-4xl bg-paper-card border border-paper-line rounded-2xl shadow-2xl p-8 max-h-[90vh] overflow-y-auto">
            <h2 className="font-display text-xl font-bold text-ink mb-2 text-center">Let's build your new page</h2>
            <p className="text-xs text-muted text-center mb-8 max-w-xl mx-auto">
              Select one of our pre-configured layouts to jumpstart your design immediately. All layout sections, category links, title slugs, and SEO settings can be modified anytime.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {/* Card 1: Microsoft Solutions Preset */}
              <button
                type="button"
                onClick={() => {
                  const tpl = TEMPLATES.find((t) => t.id === "microsoft-solutions");
                  if (tpl) importTemplate(tpl.sections, tpl.id);
                  setShowWizard(false);
                }}
                className="flex flex-col text-left rounded-xl border border-paper-line bg-paper-card p-5 hover:border-signal hover:bg-signal-soft/10 transition-all scale-100 hover:scale-102 hover:shadow-md group"
              >
                <div className="h-10 w-10 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center mb-4 group-hover:bg-indigo-500 group-hover:text-white transition-colors">
                  <Monitor size={18} />
                </div>
                <h4 className="font-display text-sm font-bold text-ink mb-1 group-hover:text-signal transition-colors">Solution Page</h4>
                <p className="text-[11px] text-muted leading-relaxed flex-1">
                  Dynamics Square style Microsoft Solutions landing page layout with Hero lead form, statistics grid, Business Central preview, and testimonial cards.
                </p>
                <span className="text-[10px] font-semibold text-signal uppercase mt-4 block">Import & Map Category</span>
              </button>

              {/* Card 2: Industry Marketing Setup */}
              <button
                type="button"
                onClick={() => {
                  const tpl = TEMPLATES.find((t) => t.id === "industry-page");
                  if (tpl) importTemplate(tpl.sections, tpl.id);
                  setShowWizard(false);
                }}
                className="flex flex-col text-left rounded-xl border border-paper-line bg-paper-card p-5 hover:border-signal hover:bg-signal-soft/10 transition-all scale-100 hover:scale-102 hover:shadow-md group"
              >
                <div className="h-10 w-10 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-4 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                  <Settings2 size={18} />
                </div>
                <h4 className="font-display text-sm font-bold text-ink mb-1 group-hover:text-signal transition-colors">Industry Page</h4>
                <p className="text-[11px] text-muted leading-relaxed flex-1">
                  Industry specialized marketing setup mapping sections tailored for logistics, retail, manufacturing, or healthcare.
                </p>
                <span className="text-[10px] font-semibold text-signal uppercase mt-4 block">Import & Map Category</span>
              </button>

              {/* Card 3: Our Service Page */}
              <button
                type="button"
                onClick={() => {
                  const tpl = TEMPLATES.find((t) => t.id === "service-page");
                  if (tpl) importTemplate(tpl.sections, tpl.id);
                  setShowWizard(false);
                }}
                className="flex flex-col text-left rounded-xl border border-paper-line bg-paper-card p-5 hover:border-signal hover:bg-signal-soft/10 transition-all scale-100 hover:scale-102 hover:shadow-md group"
              >
                <div className="h-10 w-10 rounded-lg bg-sky-500/10 text-sky-500 flex items-center justify-center mb-4 group-hover:bg-sky-500 group-hover:text-white transition-colors">
                  <Layers size={18} />
                </div>
                <h4 className="font-display text-sm font-bold text-ink mb-1 group-hover:text-signal transition-colors">Our Service Page</h4>
                <p className="text-[11px] text-muted leading-relaxed flex-1">
                  Focuses on service features description layouts, collapsing FAQ accordions list, and customizable action CTA buttons grids.
                </p>
                <span className="text-[10px] font-semibold text-signal uppercase mt-4 block">Import & Map Category</span>
              </button>

              {/* Card 4: Custom Page */}
              <button
                type="button"
                onClick={() => {
                  setTitle("Custom Webpage");
                  setSlug("custom-webpage");
                  setShowWizard(false);
                }}
                className="flex flex-col text-left rounded-xl border border-paper-line bg-paper-card p-5 hover:border-signal hover:bg-signal-soft/10 transition-all scale-100 hover:scale-102 hover:shadow-md group"
              >
                <div className="h-10 w-10 rounded-lg bg-slate-500/10 text-slate-500 flex items-center justify-center mb-4 group-hover:bg-slate-500 group-hover:text-white transition-colors">
                  <Eye size={18} />
                </div>
                <h4 className="font-display text-sm font-bold text-ink mb-1 group-hover:text-signal transition-colors">Custom Page</h4>
                <p className="text-[11px] text-muted leading-relaxed flex-1">
                  Start with a blank canvas for total visual layout control. Add section column grids and widgets manually.
                </p>
                <span className="text-[10px] font-semibold text-slate-500 uppercase mt-4 block">Start Blank Canvas</span>
              </button>
            </div>

            <div className="flex justify-center border-t border-paper-line pt-6">
              <button
                type="button"
                onClick={() => setShowWizard(false)}
                className="px-6 py-2 rounded-lg border border-paper-line bg-paper text-xs font-semibold text-muted hover:text-ink transition-colors hover:bg-paper-card shadow-sm"
              >
                Skip Wizard & start empty page
              </button>
            </div>
          </div>
        </div>
      )}
      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
