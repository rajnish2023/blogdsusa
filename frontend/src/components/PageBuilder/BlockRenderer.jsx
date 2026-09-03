import { useState } from "react";
import * as LucideIcons from "lucide-react";
import { submitContactForm } from "../../api/contactApi";

const alignClass = { left: "text-left", center: "text-center", right: "text-right" };
const headingSize = { h1: "text-3xl", h2: "text-2xl", h3: "text-xl", h4: "text-lg" };
const spacerHeight = { sm: "h-4", md: "h-10", lg: "h-20" };

function getYouTubeEmbed(url) {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/);
  if (match) return `https://www.youtube.com/embed/${match[1]}`;
  if (url.includes("vimeo.com")) {
    const id = url.split("/").pop();
    return `https://player.vimeo.com/video/${id}`;
  }
  return url;
}

function DynamicIcon({ name, ...props }) {
  const IconComponent = LucideIcons[name] || LucideIcons.HelpCircle;
  return <IconComponent {...props} />;
}

export default function BlockRenderer({ block }) {
  const { type, props, style = {} } = block;
  const [activeAccordionIdx, setActiveAccordionIdx] = useState(null);

  // Compile inline styles
  const blockStyle = {
    color: style.color || undefined,
    backgroundColor: style.backgroundColor || undefined,
    fontSize: style.fontSize || undefined,
    fontWeight: style.fontWeight || undefined,
    borderRadius: style.borderRadius || undefined,
    marginTop: style.margin?.top ? `${style.margin.top}px` : undefined,
    marginRight: style.margin?.right ? `${style.margin.right}px` : undefined,
    marginBottom: style.margin?.bottom ? `${style.margin.bottom}px` : undefined,
    marginLeft: style.margin?.left ? `${style.margin.left}px` : undefined,
    paddingTop: style.padding?.top ? `${style.padding.top}px` : undefined,
    paddingRight: style.padding?.right ? `${style.padding.right}px` : undefined,
    paddingBottom: style.padding?.bottom ? `${style.padding.bottom}px` : undefined,
    paddingLeft: style.padding?.left ? `${style.padding.left}px` : undefined,
  };

  switch (type) {
    case "heading": {
      const Tag = props.level;
      return (
        <Tag
          style={blockStyle}
          className={`font-display font-semibold text-ink ${headingSize[props.level]} ${alignClass[props.align]}`}
        >
          {props.text}
        </Tag>
      );
    }
    case "text":
      return (
        <div
          style={blockStyle}
          className="tiptap-content"
          dangerouslySetInnerHTML={{ __html: props.html }}
        />
      );
    case "image":
      if (!props.url) {
        return <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-paper-line text-xs text-muted">No image set</div>;
      }
      return (
        <div className={alignClass[props.align]} style={blockStyle}>
          {props.link ? (
            <a href={props.link} target="_blank" rel="noopener noreferrer" className="inline-block">
              <img src={props.url} alt={props.alt} className="inline-block max-w-full rounded-lg" />
            </a>
          ) : (
            <img src={props.url} alt={props.alt} className="inline-block max-w-full rounded-lg" />
          )}
        </div>
      );
    case "button":
      return (
        <div className={alignClass[props.align]} style={blockStyle}>
          {props.url ? (
            <a
              href={props.url}
              className={`inline-flex items-center rounded-lg px-4 py-2.5 text-sm font-semibold transition-transform active:scale-95 ${
                props.style === "primary" ? "bg-signal text-white" : "border border-paper-line bg-paper-card text-ink"
              }`}
            >
              {props.text}
            </a>
          ) : (
            <span
              className={`inline-flex items-center rounded-lg px-4 py-2.5 text-sm font-semibold ${
                props.style === "primary" ? "bg-signal text-white" : "border border-paper-line bg-paper-card text-ink"
              }`}
            >
              {props.text}
            </span>
          )}
        </div>
      );
    case "list": {
      const Tag = props.ordered ? "ol" : "ul";
      return (
        <Tag
          style={blockStyle}
          className={`ml-5 space-y-1 text-sm text-ink ${props.ordered ? "list-decimal" : "list-disc"}`}
        >
          {props.items.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </Tag>
      );
    }
    case "video":
      if (!props.url) {
        return <div className="flex h-40 items-center justify-center rounded-lg border border-dashed border-paper-line text-xs text-muted">No video URL set</div>;
      }
      return (
        <div style={blockStyle}>
          <div className="aspect-video overflow-hidden rounded-lg bg-ink">
            <iframe src={getYouTubeEmbed(props.url)} title={props.caption || "video"} className="h-full w-full" allowFullScreen />
          </div>
          {props.caption && <p className="mt-1.5 text-center text-xs text-muted">{props.caption}</p>}
        </div>
      );
    case "divider":
      return <hr style={blockStyle} className={`border-paper-line ${props.style === "dashed" ? "border-dashed" : "border-solid"}`} />;
    case "spacer":
      return <div style={blockStyle} className={spacerHeight[props.height]} />;
    case "html":
      return <div style={blockStyle} dangerouslySetInnerHTML={{ __html: props.code }} />;
    
    // ─── ELEMENTOR NEW WIDGETS ──────────────────────────────────────────────
    case "iconbox":
      return (
        <div style={blockStyle} className={`p-4 rounded-xl border border-paper-line/50 bg-paper-card/40 ${alignClass[props.align]}`}>
          <div className={`inline-flex h-12 w-12 items-center justify-center rounded-full bg-signal/10 text-signal mb-3`}>
            <DynamicIcon name={props.icon} size={22} />
          </div>
          <h4 className="font-display text-sm font-bold text-ink mb-1.5">{props.title}</h4>
          <p className="text-xs text-muted leading-relaxed mb-1">{props.description}</p>
          {props.link && (
            <a href={props.link} className="inline-flex items-center text-xs font-semibold text-signal hover:underline mt-2">
              Learn more <LucideIcons.ChevronRight size={12} className="ml-0.5" />
            </a>
          )}
        </div>
      );
    
    case "testimonial":
      return (
        <div style={blockStyle} className="rounded-xl border border-paper-line bg-paper-card p-5 shadow-sm">
          <LucideIcons.Quote size={20} className="text-signal/20 mb-3" />
          <p className="text-xs italic text-muted leading-relaxed mb-4">"{props.quote}"</p>
          <div className="flex items-center">
            {props.avatar ? (
              <img src={props.avatar} alt={props.name} className="h-8 w-8 rounded-full object-cover bg-paper-line mr-2.5" />
            ) : (
              <div className="h-8 w-8 rounded-full bg-signal/10 text-signal flex items-center justify-center text-xs font-bold mr-2.5">
                {props.name.charAt(0)}
              </div>
            )}
            <div>
              <span className="block text-xs font-semibold text-ink leading-tight">{props.name}</span>
              <span className="block text-[10px] text-muted">{props.designation}</span>
            </div>
          </div>
        </div>
      );
    
    case "accordion":
      return (
        <div style={blockStyle} className="space-y-1.5">
          {(props.items || []).map((item, idx) => {
            const isOpen = activeAccordionIdx === idx;
            return (
              <div key={idx} className="overflow-hidden rounded-lg border border-paper-line bg-paper">
                <button
                  type="button"
                  onClick={() => setActiveAccordionIdx(isOpen ? null : idx)}
                  className="flex w-full items-center justify-between px-4 py-2.5 text-left text-xs font-bold text-ink hover:bg-paper-card transition-colors"
                >
                  <span>{item.title}</span>
                  {isOpen ? <LucideIcons.Minus size={13} /> : <LucideIcons.Plus size={13} />}
                </button>
                {isOpen && (
                  <div
                    className="border-t border-paper-line bg-paper-card/30 px-4 py-2.5 text-xs text-muted leading-relaxed tiptap-content"
                    dangerouslySetInnerHTML={{ __html: item.content }}
                  />
                )}
              </div>
            );
          })}
        </div>
      );
    
    case "socials":
      return (
        <div style={blockStyle} className={`flex items-center gap-2 justify-${props.align === "left" ? "start" : props.align === "right" ? "end" : "center"}`}>
          {(props.items || []).map((item, idx) => {
            let Icon = LucideIcons.Globe;
            const platform = (item.platform || "").toLowerCase();
            if (platform === "facebook") Icon = LucideIcons.Facebook;
            else if (platform === "twitter") Icon = LucideIcons.Twitter;
            else if (platform === "linkedin") Icon = LucideIcons.Linkedin;
            else if (platform === "instagram") Icon = LucideIcons.Instagram;
            else if (platform === "youtube") Icon = LucideIcons.Youtube;
            else if (platform === "github") Icon = LucideIcons.Github;
            
            return (
              <a
                key={idx}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-paper-line bg-paper-card text-muted hover:border-signal hover:bg-signal hover:text-white transition-all scale-100 hover:scale-105 active:scale-95"
                title={item.platform}
              >
                <Icon size={14} />
              </a>
            );
          })}
        </div>
      );
    
    case "contactform": {
      const [formData, setFormData] = useState({ name: "", email: "", phone: "", company: "", service: "", message: "" });
      const [formStatus, setFormStatus] = useState("idle"); // idle | submitting | success | error
      const [formError, setFormError] = useState("");

      const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.name.trim() || !formData.email.trim()) {
          setFormError("Name and email are required.");
          setFormStatus("error");
          return;
        }
        setFormStatus("submitting");
        setFormError("");
        try {
          const payload = { ...formData, source: props.source || window.location.pathname };
          if (props.customEndpoint && props.customEndpoint.trim().startsWith("http")) {
            // Post directly to the user-defined custom endpoint URL
            const axios = (await import("axios")).default;
            await axios.post(props.customEndpoint.trim(), payload);
          } else {
            // Fall back to local default backend endpoint
            await submitContactForm(payload);
          }
          setFormStatus("success");
          setFormData({ name: "", email: "", phone: "", company: "", service: "", message: "" });
        } catch (err) {
          setFormError(err.response?.data?.message || err.message || "Something went wrong. Please try again.");
          setFormStatus("error");
        }
      };

      const inputStyle = "w-full rounded-lg border border-paper-line bg-paper px-3 py-2.5 text-xs text-ink placeholder-muted/60 outline-none focus:border-signal focus:ring-1 focus:ring-signal/30 transition-colors";
      const labelStyle = "block text-[10px] font-bold uppercase tracking-wide text-muted mb-1";

      if (formStatus === "success") {
        return (
          <div style={blockStyle} className="rounded-2xl border border-paper-line bg-paper-card p-8 text-center shadow-card">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-500/10 text-green-600">
              <LucideIcons.CheckCircle size={28} />
            </div>
            <h4 className="font-display text-base font-bold text-ink mb-2">Thank You!</h4>
            <p className="text-xs text-muted mb-4">We've received your inquiry. Our team will get back to you within 24 hours.</p>
            <button
              type="button"
              onClick={() => setFormStatus("idle")}
              className="text-xs font-semibold text-signal hover:underline"
            >
              Submit another inquiry
            </button>
          </div>
        );
      }

      return (
        <div style={blockStyle} className="rounded-2xl border border-paper-line bg-paper-card p-6 shadow-card">
          {props.heading && (
            <h4 className="font-display text-base font-bold text-ink mb-1 text-center">{props.heading}</h4>
          )}
          {props.subtitle && (
            <p className="text-[11px] text-muted text-center mb-5">{props.subtitle}</p>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            {(props.fields || []).includes("name") && (
              <div>
                <label className={labelStyle}>Full Name *</label>
                <input
                  type="text"
                  placeholder="e.g. John Doe"
                  value={formData.name}
                  onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                  className={inputStyle}
                  required
                />
              </div>
            )}
            {(props.fields || []).includes("email") && (
              <div>
                <label className={labelStyle}>Work Email *</label>
                <input
                  type="email"
                  placeholder="e.g. john@company.com"
                  value={formData.email}
                  onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))}
                  className={inputStyle}
                  required
                />
              </div>
            )}
            {(props.fields || []).includes("phone") && (
              <div>
                <label className={labelStyle}>Phone Number</label>
                <input
                  type="tel"
                  placeholder="e.g. +1 (555) 123-4567"
                  value={formData.phone}
                  onChange={(e) => setFormData((p) => ({ ...p, phone: e.target.value }))}
                  className={inputStyle}
                />
              </div>
            )}
            {(props.fields || []).includes("company") && (
              <div>
                <label className={labelStyle}>Company Name</label>
                <input
                  type="text"
                  placeholder="Your company"
                  value={formData.company}
                  onChange={(e) => setFormData((p) => ({ ...p, company: e.target.value }))}
                  className={inputStyle}
                />
              </div>
            )}
            {(props.fields || []).includes("service") && (props.serviceOptions || []).length > 0 && (
              <div>
                <label className={labelStyle}>Solution Interested In</label>
                <select
                  value={formData.service}
                  onChange={(e) => setFormData((p) => ({ ...p, service: e.target.value }))}
                  className={inputStyle}
                >
                  <option value="">Select a solution...</option>
                  {(props.serviceOptions || []).map((opt, i) => (
                    <option key={i} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
            )}
            {(props.fields || []).includes("message") && (
              <div>
                <label className={labelStyle}>Message</label>
                <textarea
                  placeholder="Tell us about your project..."
                  rows={3}
                  value={formData.message}
                  onChange={(e) => setFormData((p) => ({ ...p, message: e.target.value }))}
                  className={inputStyle + " resize-vertical"}
                />
              </div>
            )}

            {formStatus === "error" && formError && (
              <p className="text-[11px] text-red-500 font-medium">{formError}</p>
            )}

            <button
              type="submit"
              disabled={formStatus === "submitting"}
              style={{ backgroundColor: props.buttonColor || "#dc2626" }}
              className="w-full rounded-lg py-3 text-xs font-extrabold uppercase tracking-wider text-white shadow-md transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-wait"
            >
              {formStatus === "submitting" ? (
                <span className="flex items-center justify-center gap-2">
                  <LucideIcons.Loader2 size={14} className="animate-spin" /> Sending...
                </span>
              ) : (
                props.buttonText || "Submit Request"
              )}
            </button>
          </form>
        </div>
      );
    }
    
    default:
      return null;
  }
}
