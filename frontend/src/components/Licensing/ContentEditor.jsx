import { useEffect, useState } from "react";
import { Save, RotateCcw, Undo2 } from "lucide-react";
import { fetchLicensingContent, updateLicensingContent, resetLicensingContent } from "../../api/licensingApi";

const SECTIONS = [
  {
    key: "header",
    title: "Header",
    blurb: "The top of the page, above the capability list.",
    fields: [
      { key: "eyebrow", label: "Eyebrow", hint: "Small monospaced line above the headline" },
      { key: "heading", label: "Headline" },
      { key: "dek", label: "Intro paragraph", long: true },
    ],
  },
  {
    key: "sections",
    title: "Input sections",
    blurb: "Headings for the two blocks below the capabilities.",
    fields: [
      { key: "shapeTitle", label: "“Shape of the business” heading" },
      { key: "entitiesLabel", label: "Legal entities label" },
      { key: "countriesLabel", label: "Countries label" },
      { key: "revenueLabel", label: "Revenue label" },
      { key: "usersTitle", label: "“Who touches the system” heading" },
      { key: "usersSubtitle", label: "Users intro", long: true },
    ],
  },
  {
    key: "steppers",
    title: "User counters",
    blurb: "Each counter has a description and a small licence-type hint.",
    fields: [
      { key: "fullLabel", label: "Full user — description" },
      { key: "fullHint", label: "Full user — hint" },
      { key: "teamLabel", label: "Team Member — description" },
      { key: "teamHint", label: "Team Member — hint" },
      { key: "deviceLabel", label: "Device — description" },
      { key: "deviceHint", label: "Device — hint" },
      { key: "activityLabel", label: "Operations Activity — description" },
      { key: "activityHint", label: "Operations Activity — hint" },
    ],
  },
  {
    key: "statement",
    title: "Statement panel",
    blurb: "The dark panel on the right, once pricing is visible.",
    fields: [
      { key: "kicker", label: "Panel kicker" },
      { key: "emptyText", label: "Empty state" },
      { key: "perMonth", label: "Monthly total label" },
      { key: "perYear", label: "Annual total label" },
      { key: "perThreeYears", label: "Three-year total label" },
      { key: "modulesKicker", label: "Modules list heading" },
      { key: "extensionsKicker", label: "Add-Ons list heading" },
      { key: "extensionsNote", label: "Add-Ons note", long: true, hint: "{tier} is replaced with the licence tier" },
      { key: "coreOnlyPrefix", label: "Footnote prefix when add-ons apply" },
      { key: "footnote", label: "Footnote", long: true },
      { key: "peekLabel", label: "CRM payload toggle" },
    ],
  },
  {
    key: "locked",
    title: "Gated panel",
    blurb: "What visitors see before they hand over their details.",
    fields: [
      { key: "kicker", label: "Kicker" },
      { key: "verdictPrefix", label: "Verdict prefix", hint: "Followed by the product name in bold" },
      { key: "capabilitiesSuffix", label: "Capability count suffix" },
      { key: "modulesSuffix", label: "Module count suffix" },
      { key: "extensionsSuffix", label: "Add-On count suffix" },
      { key: "ctaText", label: "Unlock prompt", long: true },
    ],
  },
  {
    key: "form",
    title: "Capture form",
    blurb: "Two variants: gated (pricing hidden) and open.",
    fields: [
      { key: "lockedHeading", label: "Gated — heading" },
      { key: "lockedBody", label: "Gated — body", long: true },
      { key: "lockedCtaLabel", label: "Gated — button" },
      { key: "heading", label: "Open — heading" },
      { key: "body", label: "Open — body", long: true },
      { key: "ctaLabel", label: "Open — button" },
      { key: "sendingLabel", label: "Button while sending" },
      { key: "namePlaceholder", label: "Name placeholder" },
      { key: "emailPlaceholder", label: "Email placeholder" },
      { key: "companyPlaceholder", label: "Company placeholder" },
      { key: "phonePlaceholder", label: "Phone placeholder" },
      { key: "renewalLabel", label: "Renewal question", long: true },
      { key: "renewalPlaceholder", label: "Renewal placeholder" },
    ],
  },
  {
    key: "success",
    title: "After submitting",
    fields: [
      { key: "unlockedHeading", label: "Pricing revealed — heading" },
      { key: "unlockedBody", label: "Pricing revealed — body", long: true },
      { key: "heading", label: "Fallback heading" },
      { key: "body", label: "Fallback body", long: true },
    ],
  },
  {
    key: "errors",
    title: "Errors",
    fields: [{ key: "submitFailed", label: "Submission failed", long: true }],
  },
];

export default function ContentEditor({ canEdit, onToast, onChanged }) {
  const [saved, setSaved] = useState(null);
  const [defaults, setDefaults] = useState(null);
  const [draft, setDraft] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [openSection, setOpenSection] = useState("header");

  useEffect(() => {
    let alive = true;
    fetchLicensingContent()
      .then((data) => {
        if (!alive) return;
        setSaved(data.content);
        setDefaults(data.defaults);
        setDraft(JSON.parse(JSON.stringify(data.content)));
      })
      .catch((err) => onToast(err?.response?.data?.message || "Failed to load the copy", "error"))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading || !draft) return <div className="px-8 py-10 text-sm text-muted">Loading the copy…</div>;

  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);

  const set = (section, key, value) =>
    setDraft((d) => ({ ...d, [section]: { ...d[section], [key]: value } }));

  const save = async () => {
    setBusy(true);
    try {
      const updated = await updateLicensingContent(draft);
      setSaved(updated);
      setDraft(JSON.parse(JSON.stringify(updated)));
      onToast("Copy saved — the rate card is updated");
      onChanged?.();
    } catch (err) {
      onToast(err?.response?.data?.message || "Failed to save", "error");
    } finally {
      setBusy(false);
    }
  };

  const resetAll = async () => {
    setBusy(true);
    try {
      const updated = await resetLicensingContent();
      setSaved(updated);
      setDraft(JSON.parse(JSON.stringify(updated)));
      onToast("Copy reset to the shipped wording");
      onChanged?.();
    } catch (err) {
      onToast(err?.response?.data?.message || "Failed to reset", "error");
    } finally {
      setBusy(false);
    }
  };

  const changedCount = SECTIONS.reduce(
    (n, s) => n + s.fields.filter((f) => draft[s.key]?.[f.key] !== saved[s.key]?.[f.key]).length,
    0
  );

  return (
    <div className="px-8 py-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-2xl text-sm text-muted">
          Every word the rate card renders. Saving publishes immediately — visitors see the new
          wording on their next page load.
        </p>
        {canEdit && (
          <div className="flex items-center gap-2">
            <button onClick={resetAll} disabled={busy} className="btn-secondary">
              <RotateCcw size={15} /> Reset all
            </button>
            <button onClick={save} disabled={!dirty || busy} className="btn-primary disabled:opacity-40">
              <Save size={15} />
              {busy ? "Saving…" : dirty ? `Save ${changedCount} change${changedCount === 1 ? "" : "s"}` : "Saved"}
            </button>
          </div>
        )}
      </div>

      <div className="space-y-3">
        {SECTIONS.map((section) => {
          const isOpen = openSection === section.key;
          const sectionChanges = section.fields.filter(
            (f) => draft[section.key]?.[f.key] !== saved[section.key]?.[f.key]
          ).length;

          return (
            <section key={section.key} className="overflow-hidden rounded-xl border border-paper-line bg-paper-card">
              <button
                onClick={() => setOpenSection(isOpen ? null : section.key)}
                className="flex w-full items-center justify-between gap-3 px-5 py-3.5 text-left hover:bg-paper"
                aria-expanded={isOpen}
              >
                <span className="min-w-0">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-display text-sm font-semibold text-ink">{section.title}</span>
                    <span className="font-mono text-[10px] text-muted">{section.fields.length}</span>
                    {sectionChanges > 0 && (
                      <span className="rounded-full bg-flare/10 px-2 py-0.5 text-[10px] font-semibold text-flare">
                        {sectionChanges} edited
                      </span>
                    )}
                  </span>
                  {section.blurb && <span className="mt-0.5 block text-xs text-muted">{section.blurb}</span>}
                </span>
                <span className="shrink-0 font-mono text-sm text-muted">{isOpen ? "−" : "+"}</span>
              </button>

              {isOpen && (
                <div className="space-y-4 border-t border-paper-line px-5 py-4">
                  {section.fields.map((f) => {
                    const value = draft[section.key]?.[f.key] ?? "";
                    const original = saved[section.key]?.[f.key] ?? "";
                    const isDefault = value === (defaults?.[section.key]?.[f.key] ?? "");
                    const changed = value !== original;

                    return (
                      <label key={f.key} className="block">
                        <span className="mb-1.5 flex flex-wrap items-baseline gap-2">
                          <span className="text-xs text-ink">{f.label}</span>
                          {f.hint && <span className="text-[11px] text-muted">{f.hint}</span>}
                          {changed && <span className="text-[10px] font-semibold text-flare">edited</span>}
                          {!isDefault && !changed && (
                            <button
                              type="button"
                              onClick={() => set(section.key, f.key, defaults[section.key][f.key])}
                              className="inline-flex items-center gap-1 text-[10px] text-muted hover:text-signal"
                            >
                              <Undo2 size={10} /> restore default
                            </button>
                          )}
                        </span>
                        {f.long ? (
                          <textarea
                            value={value}
                            rows={3}
                            maxLength={2000}
                            disabled={!canEdit}
                            onChange={(e) => set(section.key, f.key, e.target.value)}
                            className={`w-full rounded-lg border bg-paper p-3 text-sm text-ink focus:border-signal disabled:opacity-60 ${
                              changed ? "border-flare" : "border-paper-line"
                            }`}
                          />
                        ) : (
                          <input
                            value={value}
                            maxLength={2000}
                            disabled={!canEdit}
                            onChange={(e) => set(section.key, f.key, e.target.value)}
                            className={`w-full rounded-lg border bg-paper px-3 py-2 text-sm text-ink focus:border-signal disabled:opacity-60 ${
                              changed ? "border-flare" : "border-paper-line"
                            }`}
                          />
                        )}
                      </label>
                    );
                  })}
                </div>
              )}
            </section>
          );
        })}
      </div>

      {!canEdit && <p className="mt-6 text-xs text-muted">You have read-only access to the copy.</p>}
    </div>
  );
}
