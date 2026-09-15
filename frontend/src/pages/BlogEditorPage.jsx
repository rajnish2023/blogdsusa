import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import {
  ArrowLeft, Loader2, Save, Send, Pencil, ChevronRight, ChevronDown,
  PanelRightClose, PanelRightOpen, CheckCircle2, CloudOff, Eye
} from "lucide-react";
import TipTapEditor from "../components/Blog/TipTapEditor";
import SeoPanel from "../components/Blog/SeoPanel";
import SchemaMarkupPanel from "../components/Blog/SchemaMarkupPanel";
import AuthorSelect from "../components/Blog/AuthorSelect";
import TagInput from "../components/Blog/TagInput";
import FeaturedImagePicker from "../components/Blog/FeaturedImagePicker";
import FaqSection from "../components/Blog/FaqSection";
import Toast from "../components/Shared/Toast";
import { fetchBlog, createBlog, updateBlog, setBlogStatus } from "../api/blogApi";
import { fetchCategories } from "../api/categoryApi";
import { fetchAuthors } from "../api/userApi";
import { slugify } from "../utils/slugify";
import { usePermissions, useAuth } from "../auth/AuthContext";

const emptySeo = { metaTitle: "", metaDescription: "", focusKeyword: "" };

const getISTDateTimeLocal = () => {
  const d = new Date();
  // d.getTime() is absolute UTC time. Add 5.5 hours (330 minutes) to shift it to IST.
  const istOffset = 330 * 60000;
  const istDate = new Date(d.getTime() + istOffset);
  return istDate.toISOString().slice(0, 16); // YYYY-MM-DDTHH:mm
};

export default function BlogEditorPage() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const { user } = useAuth();
  const can = usePermissions();
  const canPublish = can("blog:publish");
  const canReassignAuthor = can("blog:edit");

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState([]);
  const [authors, setAuthors] = useState([]);
  const [currentAuthor, setCurrentAuthor] = useState(null);
  const [slugTouched, setSlugTouched] = useState(false);
  const [status, setStatus] = useState("draft");
  const [toast, setToast] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const showToast = (message, type = "success") => setToast({ message, type });

  // Auto-draft save state
  const [autoSaveStatus, setAutoSaveStatus] = useState("idle"); // idle | saving | saved | error
  const autoSaveTimerRef = useRef(null);
  const postIdRef = useRef(id || null);
  const initialLoadDone = useRef(false);
  const formRef = useRef(null);
  const titleRef = useRef(null);
  formRef.current = null; // will be set after form state is declared

  const [form, setForm] = useState({
    title: "",
    slug: "",
    content: "",
    excerpt: "",
    category: "",
    tags: [],
    featuredImage: null,
    author: user?.id || user?._id || "",
    schemaMarkup: [],
    faqs: [],
    seo: emptySeo,
    publishedAt: getISTDateTimeLocal(),
  });

  // Keep formRef in sync
  formRef.current = form;

  // Auto-resize title textarea
  useEffect(() => {
    if (titleRef.current) {
      titleRef.current.style.height = "auto";
      titleRef.current.style.height = titleRef.current.scrollHeight + "px";
    }
  }, [form.title]);

  useEffect(() => {
    fetchCategories().then(setCategories).catch(() => {});
    if (canReassignAuthor) fetchAuthors().then(setAuthors).catch(() => {});
  }, [canReassignAuthor]);

  const loadBlog = useCallback(async () => {
    try {
      const blog = await fetchBlog(id);
      
      // format date for datetime-local input in IST
      let formattedDate = getISTDateTimeLocal();
      if (blog.publishedAt) {
        const d = new Date(blog.publishedAt);
        const istOffset = 330 * 60000;
        const istDate = new Date(d.getTime() + istOffset);
        formattedDate = istDate.toISOString().slice(0, 16);
      }

      setForm({
        title: blog.title || "",
        slug: blog.slug || "",
        content: blog.content || "",
        excerpt: blog.excerpt || "",
        category: blog.category?._id || blog.category?.id || "",
        tags: blog.tags || [],
        featuredImage: blog.featuredImage?.url ? blog.featuredImage : null,
        author: blog.author?._id || blog.author?.id || "",
        schemaMarkup: blog.schemaMarkup || [],
        faqs: blog.faqs || [],
        seo: { metaTitle: blog.seo?.metaTitle || "", metaDescription: blog.seo?.metaDescription || "", focusKeyword: blog.seo?.focusKeyword || "" },
        publishedAt: formattedDate,
      });
      setCurrentAuthor(blog.author);
      setStatus(blog.status);
      // We do NOT set slugTouched=true here anymore.
      // This allows the slug to auto-generate even when editing a post,
      // unless the user specifically manually edits the slug field.
    } catch (err) {
      showToast("Failed to load post", "error");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (!isEdit) return;
    loadBlog();
  }, [isEdit, loadBlog]);

  // ─── Auto-draft save (5s debounce after any change) ───
  useEffect(() => {
    // Skip auto-save during initial load or if there's no title yet
    if (!initialLoadDone.current) {
      // Mark initial load done after first render with form data
      if (!isEdit || !loading) initialLoadDone.current = true;
      return;
    }
    if (!form.title.trim() || saving) return;

    // Don't auto-save if already published (user must explicitly publish)
    // Auto-save only works for draft status
    if (status === "published") {
      setAutoSaveStatus("idle");
      return;
    }

    setAutoSaveStatus("idle");

    // Clear previous timer
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);

    autoSaveTimerRef.current = setTimeout(async () => {
      const currentForm = formRef.current;
      if (!currentForm || !currentForm.title.trim()) return;

      setAutoSaveStatus("saving");
      try {
        const payload = {
          title: currentForm.title,
          slug: currentForm.slug,
          content: currentForm.content,
          excerpt: currentForm.excerpt,
          category: currentForm.category || null,
          tags: currentForm.tags,
          featuredImage: currentForm.featuredImage,
          seo: currentForm.seo,
          schemaMarkup: currentForm.schemaMarkup,
          faqs: currentForm.faqs,
          status: "draft",
        };

        if (postIdRef.current) {
          // Update existing post
          await updateBlog(postIdRef.current, payload);
        } else {
          // Create new post for first time
          const blog = await createBlog(payload);
          postIdRef.current = blog._id;
          // Update the URL without full reload
          navigate(`/blog/${blog._id}/edit`, { replace: true });
        }
        setAutoSaveStatus("saved");
      } catch {
        setAutoSaveStatus("error");
      }
    }, 5000); // 5 second debounce

    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [form.title, form.slug, form.content, form.excerpt, form.category, form.tags, form.featuredImage, form.seo, form.schemaMarkup, form.faqs, saving, status, navigate]);

  const handleTitleChange = (e) => {
    const title = e.target.value;
    setForm((f) => ({ ...f, title, slug: slugTouched ? f.slug : slugify(title) }));
  };

  const handleSlugChange = (e) => {
    setSlugTouched(true);
    let val = e.target.value;
    // Replace spaces with hyphens immediately and remove invalid chars,
    // but don't trim() so the user can type a trailing hyphen.
    val = val.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "").replace(/-+/g, "-");
    setForm((f) => ({ ...f, slug: val }));
  };

  const buildPayload = (targetStatus) => {
    let payloadPublishedAt = form.publishedAt;
    if (form.publishedAt && !form.publishedAt.endsWith("+05:30") && !form.publishedAt.endsWith("Z")) {
      // Input date is YYYY-MM-DDTHH:mm
      // Force it to be evaluated as IST timezone
      payloadPublishedAt = `${form.publishedAt}:00+05:30`;
    }

    return {
      title: form.title,
      slug: form.slug,
      content: form.content,
      ...form,
      status: targetStatus,
      ...(form.publishedAt ? { publishedAt: payloadPublishedAt } : {}),
      ...(canReassignAuthor && form.author ? { author: form.author } : {}),
    };
  };

  const handleSave = async (targetStatus) => {
    if (!form.title.trim()) {
      showToast("Give your post a title first", "error");
      return;
    }
    setSaving(true);
    try {
      if (isEdit) {
        const blog = await updateBlog(id, buildPayload(targetStatus));
        if (targetStatus !== status && canPublish) {
          await setBlogStatus(id, targetStatus);
        }
        setStatus(blog.status);
        setCurrentAuthor(blog.author);
        showToast(targetStatus === "published" ? "Post published" : "Draft saved");
      } else {
        const blog = await createBlog(buildPayload(targetStatus));
        showToast(blog.status === "published" ? "Post published" : "Draft saved");
        navigate(`/blog/${blog._id}/edit`, { replace: true });
      }
    } catch (err) {
      showToast(err?.response?.data?.message || "Failed to save post", "error");
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

  return (
    <div className="flex h-screen flex-1 flex-col overflow-hidden">
      {/* ─── Compact Top Header ─── */}
      <header className="flex items-center justify-between border-b border-paper-line bg-paper-card px-4 py-2.5 lg:px-6">
        <div className="flex items-center gap-2 min-w-0">
          <Link to="/blog" className="flex-shrink-0 rounded-md p-1.5 text-muted hover:bg-paper hover:text-ink transition-colors">
            <ArrowLeft size={18} />
          </Link>
          <div className="flex items-center gap-1.5 text-xs text-muted">
            <span className="hidden sm:inline">Blog</span>
            <ChevronRight size={12} className="hidden sm:inline text-muted/50" />
            <span className="font-semibold text-signal">{isEdit ? "Edit" : "New post"}</span>
          </div>
          <span className={`ml-2 rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${status === "published" ? "bg-success/10 text-success" : "bg-ink/10 text-muted"}`}>
            {status}
          </span>
          {/* Auto-save status indicator */}
          {autoSaveStatus === "saving" && (
            <span className="ml-2 flex items-center gap-1 text-[10px] text-muted animate-pulse">
              <Loader2 size={10} className="animate-spin" /> Saving...
            </span>
          )}
          {autoSaveStatus === "saved" && (
            <span className="ml-2 flex items-center gap-1 text-[10px] text-success">
              <CheckCircle2 size={10} /> Auto-saved
            </span>
          )}
          {autoSaveStatus === "error" && (
            <span className="ml-2 flex items-center gap-1 text-[10px] text-danger">
              <CloudOff size={10} /> Save failed
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="hidden lg:flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-muted hover:bg-paper hover:text-ink transition-colors"
            title={sidebarOpen ? "Hide sidebar" : "Show sidebar"}
          >
            {sidebarOpen ? <PanelRightClose size={16} /> : <PanelRightOpen size={16} />}
          </button>
          
          {/* Preview Button: Only show if it's saved (isEdit) and status is draft */}
          {isEdit && status === "draft" && (
            <a
              href={`${"https://www.dynamicssquare.co.uk"}/blog/preview/${form.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary text-xs flex items-center gap-1"
            >
              <Eye size={14} />
              Preview
            </a>
          )}

          <button onClick={() => handleSave("draft")} disabled={saving} className="btn-secondary text-xs disabled:opacity-60">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Save draft
          </button>
          {canPublish && (
            <button onClick={() => handleSave("published")} disabled={saving} className="btn-primary text-xs disabled:opacity-60">
              <Send size={14} />
              {status === "published" ? "Update" : "Publish"}
            </button>
          )}
        </div>
      </header>

      {/* ─── Main Content Area ─── */}
      <div className="flex flex-1 overflow-hidden">
         
        <div className="flex flex-1 flex-col overflow-y-auto">
          <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-4 py-5 lg:px-8">
            {/* Title + Slug */}
            <div className="mb-4 rounded-2xl border border-paper-line bg-paper-card p-5 shadow-card">
              <div className="group/title relative flex">
                <textarea
                  ref={titleRef}
                  value={form.title}
                  onChange={handleTitleChange}
                  placeholder="Post title"
                  rows={1}
                  className="w-full resize-none overflow-hidden border-none bg-transparent font-display text-2xl font-semibold text-ink placeholder:text-muted/50 focus:outline-none pr-8"
                />
                <Pencil 
                  size={16} 
                  className="absolute right-2 top-2 text-muted opacity-0 transition-opacity group-hover/title:opacity-40 cursor-pointer hover:!opacity-100"
                  onClick={() => titleRef.current?.focus()}
                />
              </div>
              <div className="mt-2 flex items-center text-xs text-muted">
                <span className="font-mono text-muted/50 mr-1">/</span>
                <div className="group relative flex flex-1 items-center">
                  <input
                    value={form.slug}
                    onChange={handleSlugChange}
                    placeholder="post-url-slug"
                    className="w-full rounded border border-transparent bg-transparent px-1.5 py-1 font-mono text-xs text-signal transition-colors focus:border-paper-line focus:bg-paper focus:outline-none"
                  />
                  <Pencil size={12} className="absolute right-2 opacity-0 transition-opacity group-hover:opacity-60 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Excerpt */}
            <details className="mb-4 group bg-paper-card rounded-2xl border border-paper-line shadow-card overflow-hidden">
              <summary className="cursor-pointer px-5 py-4 font-display text-sm font-semibold text-ink outline-none select-none flex items-center justify-between">
                Excerpt
                <ChevronDown size={16} className="text-muted transition-transform group-open:rotate-180" />
              </summary>
              <div className="px-5 pb-5 pt-2">
                <textarea
                  value={form.excerpt}
                  onChange={(e) => setForm((f) => ({ ...f, excerpt: e.target.value }))}
                  rows={3}
                  maxLength={300}
                  placeholder="Short summary shown in post listings — auto-generated from content if left blank"
                  className="w-full resize-none rounded-lg border border-paper-line bg-paper px-3 py-2.5 text-sm text-ink placeholder:text-muted/70 focus:border-signal"
                />
              </div>
            </details>

            {/* Editor (fills remaining height) */}
            <div className="mb-4 flex-1 flex flex-col min-h-[400px]">
              <TipTapEditor
                value={form.content}
                onChange={(html) => setForm((f) => ({ ...f, content: html }))}
                fullHeight
              />
            </div>

            {/* FAQs */}
            <details className="mb-4 group bg-paper-card rounded-2xl border border-paper-line shadow-card overflow-hidden">
              <summary className="cursor-pointer px-5 py-4 font-display text-sm font-semibold text-ink outline-none select-none flex items-center justify-between">
                Frequently Asked Questions
                <ChevronDown size={16} className="text-muted transition-transform group-open:rotate-180" />
              </summary>
              <div className="px-5 pb-5 pt-2 border-t border-paper-line">
                <FaqSection
                  faqs={form.faqs}
                  onChange={(faqs) => setForm((f) => ({ ...f, faqs }))}
                />
              </div>
            </details>

            {/* SEO Panel */}
            <details className="mb-4 group bg-paper-card rounded-2xl border border-paper-line shadow-card overflow-hidden" open>
              <summary className="cursor-pointer px-5 py-4 font-display text-sm font-semibold text-ink outline-none select-none flex items-center justify-between">
                SEO & Keyword Strength
                <ChevronDown size={16} className="text-muted transition-transform group-open:rotate-180" />
              </summary>
              <div className="border-t border-paper-line">
                <SeoPanel
                  title={form.seo.metaTitle || form.title}
                  content={form.content}
                  slug={form.slug}
                  seo={form.seo}
                  onSeoChange={(seo) => setForm((f) => ({ ...f, seo }))}
                />
              </div>
            </details>

            {/* Schema Markup */}
            <details className="mb-8 group bg-paper-card rounded-2xl border border-paper-line shadow-card overflow-hidden">
              <summary className="cursor-pointer px-5 py-4 font-display text-sm font-semibold text-ink outline-none select-none flex items-center justify-between">
                Schema Markup
                <ChevronDown size={16} className="text-muted transition-transform group-open:rotate-180" />
              </summary>
              <div className="border-t border-paper-line">
                <SchemaMarkupPanel entries={form.schemaMarkup} onChange={(schemaMarkup) => setForm((f) => ({ ...f, schemaMarkup }))} />
              </div>
            </details>
          </div>
        </div>

        {/* ─── Right Sidebar (toggleable, independently scrollable) ─── */}
        <aside
          className={`border-l border-paper-line bg-paper transition-all duration-300 overflow-y-auto ${
            sidebarOpen ? "w-[320px] min-w-[320px]" : "w-0 min-w-0 overflow-hidden border-l-0"
          }`}
        >
          <div className="space-y-4 p-4">
            {/* Featured Image */}
            <div className="rounded-2xl border border-paper-line bg-paper-card p-4 shadow-card">
              <label className="mb-1.5 block text-xs font-semibold text-muted uppercase tracking-wider">Featured Image</label>
              <FeaturedImagePicker image={form.featuredImage} onChange={(img) => setForm((f) => ({ ...f, featuredImage: img }))} />
            </div>

            {/* Author Reassignment */}
            {canReassignAuthor && authors.length > 0 && (
              <div className="rounded-2xl border border-paper-line bg-paper-card p-4 shadow-card">
                <label className="mb-1.5 block text-xs font-semibold text-muted uppercase tracking-wider">Author</label>
                <AuthorSelect
                  authors={authors}
                  value={form.author}
                  currentAuthor={currentAuthor}
                  onChange={(author) => setForm((f) => ({ ...f, author }))}
                />
                <p className="mt-2 text-[10px] text-muted">Reassigning takes effect the next time you save.</p>
              </div>
            )}

            {/* Category + Tags */}
            <div className="rounded-2xl border border-paper-line bg-paper-card p-4 shadow-card">
              <label className="mb-1.5 block text-xs font-semibold text-muted uppercase tracking-wider">Category</label>
              <select
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                className="w-full rounded-lg border border-paper-line bg-paper px-3 py-2 text-sm text-ink focus:border-signal"
              >
                <option value="">No category</option>
                {categories.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
              </select>

              <label className="mb-1.5 mt-4 block text-xs font-semibold text-muted uppercase tracking-wider">Publish Date (Optional)</label>
              <input
                type="datetime-local"
                value={form.publishedAt}
                onChange={(e) => setForm((f) => ({ ...f, publishedAt: e.target.value }))}
                className="w-full rounded-lg border border-paper-line bg-paper px-3 py-2 text-sm text-ink focus:border-signal"
              />

              <label className="mb-1.5 mt-4 block text-xs font-semibold text-muted uppercase tracking-wider">Tags</label>
              <TagInput tags={form.tags} onChange={(tags) => setForm((f) => ({ ...f, tags }))} />
            </div>

          </div>
        </aside>
      </div>

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
