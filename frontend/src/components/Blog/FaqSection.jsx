import { useState } from "react";
import { Plus, Trash2, ArrowUp, ArrowDown, HelpCircle, Eye } from "lucide-react";
import TipTapEditor from "./TipTapEditor";

export default function FaqSection({ faqs = [], onChange }) {
  const [expanded, setExpanded] = useState(faqs.length > 0);
  const [previews, setPreviews] = useState({}); // stores boolean per index for toggling preview mode

  const addFaq = () => {
    onChange([...faqs, { question: "", answer: "" }]);
    setExpanded(true);
  };

  const updateFaq = (index, fields) => {
    onChange(faqs.map((faq, i) => (i === index ? { ...faq, ...fields } : faq)));
  };

  const deleteFaq = (index) => {
    onChange(faqs.filter((_, i) => i !== index));
    // Clean up preview state
    const newPreviews = { ...previews };
    delete newPreviews[index];
    setPreviews(newPreviews);
  };

  const moveFaq = (index, direction) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= faqs.length) return;
    const newFaqs = [...faqs];
    // Swap
    const temp = newFaqs[index];
    newFaqs[index] = newFaqs[nextIndex];
    newFaqs[nextIndex] = temp;
    onChange(newFaqs);
  };

  const togglePreview = (index) => {
    setPreviews((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  return (
    <div className="rounded-2xl border border-paper-line bg-paper-card p-5 shadow-card">
      {/* Header toggle button */}
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="flex w-full items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <HelpCircle size={16} className="text-signal" />
          <h3 className="font-display text-sm font-semibold text-ink">FAQ Section</h3>
        </div>
        <span className="text-xs text-muted">
          {faqs.length ? `${faqs.length} FAQ${faqs.length > 1 ? "s" : ""}` : "None"}
        </span>
      </button>

      {expanded && (
        <div className="mt-4 space-y-4">
          <p className="text-xs text-muted">
            Add Frequently Asked Questions (FAQs) for this post. These will be stored with the post and can also be styled using bolding and interlinking.
          </p>

          {faqs.map((faq, i) => {
            const isPreview = !!previews[i];
            return (
              <div key={i} className="group relative rounded-xl border border-paper-line bg-paper/30 p-4 space-y-3 transition-colors hover:border-paper-line/80">
                {/* FAQ Actions & Header */}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-signal uppercase tracking-wider">FAQ #{i + 1}</span>

                  <div className="ml-auto flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      disabled={i === 0}
                      onClick={() => moveFaq(i, -1)}
                      className="rounded-md p-1 text-muted hover:bg-paper hover:text-ink disabled:opacity-30 disabled:hover:bg-transparent"
                      title="Move Up"
                    >
                      <ArrowUp size={14} />
                    </button>
                    <button
                      type="button"
                      disabled={i === faqs.length - 1}
                      onClick={() => moveFaq(i, 1)}
                      className="rounded-md p-1 text-muted hover:bg-paper hover:text-ink disabled:opacity-30 disabled:hover:bg-transparent"
                      title="Move Down"
                    >
                      <ArrowDown size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => togglePreview(i)}
                      className={`rounded-md p-1 ${isPreview ? "bg-signal/15 text-signal" : "text-muted hover:bg-paper hover:text-ink"}`}
                      title={isPreview ? "Edit Mode" : "Preview Mode"}
                    >
                      <Eye size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteFaq(i)}
                      className="rounded-md p-1 text-muted hover:bg-danger/10 hover:text-danger"
                      title="Delete FAQ"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Question */}
                <div>
                  <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted/80">Question</label>
                  <input
                    type="text"
                    required
                    value={faq.question}
                    onChange={(e) => updateFaq(i, { question: e.target.value })}
                    placeholder="e.g. What is Microsoft Dynamics 365 Business Central?"
                    className="w-full rounded-lg border border-paper-line bg-paper px-3 py-2 text-sm text-ink placeholder:text-muted/50 focus:border-signal"
                  />
                </div>

                {/* Answer */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[10px] font-semibold uppercase tracking-wider text-muted/80">Answer</label>
                  </div>

                  {isPreview ? (
                    /* Preview mode */
                    <div
                      className="min-h-[80px] rounded-lg border border-paper-line bg-paper/60 px-3 py-2.5 text-sm text-ink leading-relaxed prose prose-sm dark:prose-invert"
                      dangerouslySetInnerHTML={{ __html: faq.answer || '<em class="text-muted">No answer provided yet.</em>' }}
                    />
                  ) : (
                    /* Tiptap visual editor */
                    <TipTapEditor
                      value={faq.answer}
                      onChange={(html) => updateFaq(i, { answer: html })}
                      placeholder="Type the answer. Highlight text to format as bold, italic, underline, or insert links."
                      variant="minimal"
                    />
                  )}
                </div>
              </div>
            );
          })}

          {/* Add button */}
          <button
            type="button"
            onClick={addFaq}
            className="btn-secondary w-full justify-center py-2.5 text-xs"
          >
            <Plus size={14} /> Add FAQ Item
          </button>
        </div>
      )}
    </div>
  );
}

