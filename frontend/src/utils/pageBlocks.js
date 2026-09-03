import {
  Heading, Type, Image as ImageIcon, MousePointerClick, Minus,
  MoveVertical, List, Youtube, Code2, HelpCircle, MessageSquareCode,
  Layers, Share2, Mail
} from "lucide-react";

export const uid = (prefix) => `${prefix}_${Math.random().toString(36).slice(2, 10)}`;

// The single source of truth for what widgets exist, their palette
// presentation, and their default props when dropped onto the canvas.
export const WIDGETS = [
  { type: "heading", label: "Heading", icon: Heading, defaultProps: { text: "Your heading here", level: "h2", align: "left" } },
  { type: "text", label: "Text", icon: Type, defaultProps: { html: "<p>Write something...</p>" } },
  { type: "image", label: "Image", icon: ImageIcon, defaultProps: { url: "", alt: "", link: "", align: "center" } },
  { type: "button", label: "Button", icon: MousePointerClick, defaultProps: { text: "Click here", url: "#", style: "primary", align: "left" } },
  { type: "list", label: "List", icon: List, defaultProps: { items: ["First item", "Second item"], ordered: false } },
  { type: "video", label: "Video", icon: Youtube, defaultProps: { url: "", caption: "" } },
  { type: "divider", label: "Divider", icon: Minus, defaultProps: { style: "solid" } },
  { type: "spacer", label: "Spacer", icon: MoveVertical, defaultProps: { height: "md" } },
  { type: "html", label: "Custom HTML", icon: Code2, defaultProps: { code: "<p>Custom markup...</p>" } },
  { type: "iconbox", label: "Icon Box", icon: HelpCircle, defaultProps: { icon: "HelpCircle", title: "Feature Title", description: "Describe your feature or service here.", link: "", align: "center" } },
  { type: "testimonial", label: "Testimonial", icon: MessageSquareCode, defaultProps: { quote: "This is a wonderful service!", name: "John Doe", designation: "CEO, Acme Corp", avatar: "" } },
  { type: "accordion", label: "Accordion (FAQ)", icon: Layers, defaultProps: { items: [{ title: "What is your return policy?", content: "<p>We offer a 30-day money-back guarantee.</p>" }] } },
  { type: "socials", label: "Social Links", icon: Share2, defaultProps: { align: "center", items: [{ platform: "facebook", url: "https://facebook.com" }, { platform: "twitter", url: "https://twitter.com" }, { platform: "linkedin", url: "https://linkedin.com" }] } },
  { type: "contactform", label: "Contact Form", icon: Mail, defaultProps: { heading: "Get a Free Consultation", subtitle: "Fill out the form and our team will get back to you within 24 hours.", buttonText: "Submit Request", buttonColor: "#dc2626", fields: ["name", "email", "phone", "service", "message"], serviceOptions: ["Dynamics 365 Business Central", "Dynamics 365 Finance & Operations", "Power BI & Analytics", "Azure Cloud Infrastructure"], source: "", customEndpoint: "" } },
];

export const widgetDef = (type) => WIDGETS.find((w) => w.type === type);

export const createBlock = (type) => {
  const def = widgetDef(type);
  if (!def) return null;
  return {
    id: uid("block"),
    type,
    props: { ...def.defaultProps },
    style: {
      margin: { top: 0, right: 0, bottom: 15, left: 0 },
      padding: { top: 0, right: 0, bottom: 0, left: 0 },
      color: "",
      backgroundColor: "",
      fontSize: "",
      fontWeight: "",
      borderRadius: "",
    }
  };
};

export const createSection = (columns = 1) => ({
  id: uid("section"),
  columns,
  background: "",
  paddingY: "normal",
  style: {
    margin: { top: 0, right: 0, bottom: 0, left: 0 },
    padding: { top: 0, right: 0, bottom: 0, left: 0 }
  },
  columnStyles: Array.from({ length: columns }, () => ({
    padding: { top: 15, right: 15, bottom: 15, left: 15 },
    backgroundColor: ""
  })),
  columnBlocks: Array.from({ length: columns }, () => []),
});

// Changing a section's column count: preserves existing blocks by merging
// any columns that get removed into the last remaining column, rather than
// silently discarding content.
export const resizeSectionColumns = (section, newColumns) => {
  const current = section.columnBlocks;
  const currentStyles = section.columnStyles || [];

  let nextStyles;
  if (newColumns >= currentStyles.length) {
    nextStyles = [
      ...currentStyles,
      ...Array.from({ length: newColumns - currentStyles.length }, () => ({
        padding: { top: 15, right: 15, bottom: 15, left: 15 },
        backgroundColor: ""
      }))
    ];
  } else {
    nextStyles = currentStyles.slice(0, newColumns);
  }

  if (newColumns >= current.length) {
    const grown = [...current, ...Array.from({ length: newColumns - current.length }, () => [])];
    return { ...section, columns: newColumns, columnStyles: nextStyles, columnBlocks: grown };
  }

  // Shrinking: keep the first (newColumns - 1) columns untouched, and merge
  // the target column plus everything beyond it into the final column.
  const targetIndex = newColumns - 1;
  const kept = current.slice(0, targetIndex);
  const lastColumn = [...(current[targetIndex] || []), ...current.slice(targetIndex + 1).flat()];
  return { ...section, columns: newColumns, columnStyles: nextStyles, columnBlocks: [...kept, lastColumn] };
};

// Removes a block by id from wherever it lives across all sections/columns.
// Returns the removed block plus the resulting sections array.
export const removeBlockById = (sections, blockId) => {
  let removed = null;
  const next = sections.map((section) => {
    const columnBlocks = section.columnBlocks.map((col) => {
      const idx = col.findIndex((b) => b.id === blockId);
      if (idx === -1) return col;
      removed = col[idx];
      return [...col.slice(0, idx), ...col.slice(idx + 1)];
    });
    return { ...section, columnBlocks };
  });
  return { removed, sections: next };
};

// Inserts a block into a specific section/column, either before/after a
// given sibling block id, or appended to the end if neither is given.
export const insertBlockAt = (sections, sectionId, colIndex, block, beforeId, afterId) =>
  sections.map((section) => {
    if (section.id !== sectionId) return section;
    const columnBlocks = section.columnBlocks.map((col, idx) => {
      if (idx !== colIndex) return col;
      if (!beforeId && !afterId) return [...col, block];
      if (beforeId) {
        const pos = col.findIndex((b) => b.id === beforeId);
        return pos === -1 ? [...col, block] : [...col.slice(0, pos), block, ...col.slice(pos)];
      }
      const pos = col.findIndex((b) => b.id === afterId);
      return pos === -1 ? [...col, block] : [...col.slice(0, pos + 1), block, ...col.slice(pos + 1)];
    });
    return { ...section, columnBlocks };
  });

// Flattens all readable text out of the sections, fed into the SEO scorer
// the same way blog content is (mirrors backend/utils/sanitizePageContent.js).
export const extractSectionsText = (sections) => {
  const parts = [];
  for (const section of sections) {
    for (const col of section.columnBlocks) {
      for (const block of col) {
        if (block.type === "heading") parts.push(block.props.text);
        else if (block.type === "text") parts.push(block.props.html.replace(/<[^>]*>/g, " "));
        else if (block.type === "button") parts.push(block.props.text);
        else if (block.type === "list") parts.push(block.props.items.join(" "));
        else if (block.type === "image") parts.push(block.props.alt);
        else if (block.type === "iconbox") parts.push(block.props.title, block.props.description);
        else if (block.type === "testimonial") parts.push(block.props.quote, block.props.name, block.props.designation);
        else if (block.type === "accordion") {
          for (const item of block.props.items || []) {
            parts.push(item.title, (item.content || "").replace(/<[^>]*>/g, " "));
          }
        }
      }
    }
  }
  return parts.join(" ").replace(/\s+/g, " ").trim();
};

// Pre-built individual section snippets users can insert anywhere between sections.
export const SECTION_SNIPPETS = [
  {
    id: "snippet-hero-cta",
    name: "Hero CTA Banner",
    description: "Dark gradient banner with title, subtitle, and call-to-action button.",
    section: {
      columns: 1,
      background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
      paddingY: "spacious",
      style: { margin: { top: 0, right: 0, bottom: 0, left: 0 }, padding: { top: 40, right: 20, bottom: 40, left: 20 } },
      columnStyles: [{ padding: { top: 10, right: 10, bottom: 10, left: 10 }, backgroundColor: "" }],
      columnBlocks: [
        [
          { id: "sh_h", type: "heading", props: { text: "Your Headline Goes Here", level: "h1", align: "center" }, style: { color: "#ffffff", marginBottom: 15 } },
          { id: "sh_p", type: "text", props: { html: "<p style='text-align: center; color: #94a3b8; font-size: 15px;'>Write a compelling subtitle that describes your value proposition to visitors.</p>" }, style: { marginBottom: 20 } },
          { id: "sh_btn", type: "button", props: { text: "Get Started Today", url: "#contact", style: "primary", align: "center" }, style: {} }
        ]
      ]
    }
  },
  {
    id: "snippet-features-3col",
    name: "3-Column Features Grid",
    description: "Three icon boxes showcasing key features or services.",
    section: {
      columns: 3,
      background: "#ffffff",
      paddingY: "normal",
      style: { margin: { top: 0, right: 0, bottom: 0, left: 0 }, padding: { top: 30, right: 0, bottom: 30, left: 0 } },
      columnStyles: [
        { padding: { top: 15, right: 15, bottom: 15, left: 15 }, backgroundColor: "" },
        { padding: { top: 15, right: 15, bottom: 15, left: 15 }, backgroundColor: "" },
        { padding: { top: 15, right: 15, bottom: 15, left: 15 }, backgroundColor: "" }
      ],
      columnBlocks: [
        [
          { id: "sf1", type: "iconbox", props: { icon: "Zap", title: "Fast Performance", description: "Lightning-fast load times and optimized operations for maximum throughput.", link: "", align: "center" }, style: {} }
        ],
        [
          { id: "sf2", type: "iconbox", props: { icon: "Shield", title: "Enterprise Security", description: "Bank-grade encryption with automated compliance monitoring and threat alerts.", link: "", align: "center" }, style: {} }
        ],
        [
          { id: "sf3", type: "iconbox", props: { icon: "Layers", title: "Scalable Architecture", description: "Cloud-native infrastructure that grows with your business demands seamlessly.", link: "", align: "center" }, style: {} }
        ]
      ]
    }
  },
  {
    id: "snippet-testimonial-row",
    name: "Testimonial Row",
    description: "Two-column testimonial cards with client quotes.",
    section: {
      columns: 2,
      background: "#F6F5F2",
      paddingY: "normal",
      style: { margin: { top: 0, right: 0, bottom: 0, left: 0 }, padding: { top: 30, right: 0, bottom: 30, left: 0 } },
      columnStyles: [
        { padding: { top: 15, right: 15, bottom: 15, left: 15 }, backgroundColor: "" },
        { padding: { top: 15, right: 15, bottom: 15, left: 15 }, backgroundColor: "" }
      ],
      columnBlocks: [
        [
          { id: "st1", type: "testimonial", props: { quote: "This solution transformed our operations completely. We saw results within the first month.", name: "Sarah Johnson", designation: "CTO, TechStart Inc", avatar: "" }, style: {} }
        ],
        [
          { id: "st2", type: "testimonial", props: { quote: "The team's expertise and support made our digital transformation incredibly smooth.", name: "Michael Chen", designation: "Director of IT, GlobalRetail", avatar: "" }, style: {} }
        ]
      ]
    }
  },
  {
    id: "snippet-faq-section",
    name: "FAQ Accordion Section",
    description: "Single-column FAQ with collapsible accordion items.",
    section: {
      columns: 1,
      background: "#ffffff",
      paddingY: "normal",
      style: { margin: { top: 0, right: 0, bottom: 0, left: 0 }, padding: { top: 30, right: 0, bottom: 30, left: 0 } },
      columnStyles: [{ padding: { top: 15, right: 15, bottom: 15, left: 15 }, backgroundColor: "" }],
      columnBlocks: [
        [
          { id: "sfaq_h", type: "heading", props: { text: "Frequently Asked Questions", level: "h2", align: "center" }, style: { marginBottom: 20 } },
          { id: "sfaq", type: "accordion", props: { items: [
            { title: "What services do you offer?", content: "<p>We provide end-to-end Microsoft Dynamics 365 implementation, support, and consulting services.</p>" },
            { title: "How long does implementation take?", content: "<p>Typical implementations range from 4-12 weeks depending on complexity and customization requirements.</p>" },
            { title: "Do you offer ongoing support?", content: "<p>Yes, we provide 24/7 support plans with dedicated account managers for all our enterprise clients.</p>" }
          ] }, style: {} }
        ]
      ]
    }
  },
  {
    id: "snippet-cta-strip",
    name: "CTA Strip Banner",
    description: "Compact gradient banner with bold heading and action button.",
    section: {
      columns: 1,
      background: "linear-gradient(135deg, #1e1b4b 0%, #311042 100%)",
      paddingY: "normal",
      style: { margin: { top: 0, right: 0, bottom: 0, left: 0 }, padding: { top: 30, right: 20, bottom: 30, left: 20 } },
      columnStyles: [{ padding: { top: 10, right: 10, bottom: 10, left: 10 }, backgroundColor: "" }],
      columnBlocks: [
        [
          { id: "scta_h", type: "heading", props: { text: "Ready to transform your business?", level: "h2", align: "center" }, style: { color: "#ffffff", marginBottom: 15 } },
          { id: "scta_btn", type: "button", props: { text: "Schedule a Free Consultation", url: "#contact", style: "primary", align: "center" }, style: {} }
        ]
      ]
    }
  },
  {
    id: "snippet-image-text",
    name: "Image + Text Split",
    description: "Two-column layout with image on left and descriptive text on right.",
    section: {
      columns: 2,
      background: "#ffffff",
      paddingY: "normal",
      style: { margin: { top: 0, right: 0, bottom: 0, left: 0 }, padding: { top: 30, right: 0, bottom: 30, left: 0 } },
      columnStyles: [
        { padding: { top: 15, right: 15, bottom: 15, left: 15 }, backgroundColor: "" },
        { padding: { top: 15, right: 15, bottom: 15, left: 15 }, backgroundColor: "" }
      ],
      columnBlocks: [
        [
          { id: "sit_img", type: "image", props: { url: "https://images.unsplash.com/photo-1551434678-e076c223a692?w=800", alt: "Feature showcase", link: "", align: "center" }, style: {} }
        ],
        [
          { id: "sit_h", type: "heading", props: { text: "Why Choose Our Solutions?", level: "h2", align: "left" }, style: { marginBottom: 15 } },
          { id: "sit_p", type: "text", props: { html: "<p style='font-size: 14px; color: #4b5563; line-height: 1.7;'>Our certified consultants bring years of expertise in Microsoft cloud technologies. We deliver tailored implementations that align with your business goals, ensuring maximum ROI and minimal disruption to your operations.</p>" }, style: { marginBottom: 20 } },
          { id: "sit_btn", type: "button", props: { text: "Learn More", url: "#", style: "primary", align: "left" }, style: {} }
        ]
      ]
    }
  },
  {
    id: "snippet-contact-form",
    name: "Contact / Lead Form",
    description: "Working lead capture form — submits to your email via API.",
    section: {
      columns: 2,
      background: "#F6F5F2",
      paddingY: "normal",
      style: { margin: { top: 0, right: 0, bottom: 0, left: 0 }, padding: { top: 30, right: 0, bottom: 30, left: 0 } },
      columnStyles: [
        { padding: { top: 15, right: 15, bottom: 15, left: 15 }, backgroundColor: "" },
        { padding: { top: 15, right: 15, bottom: 15, left: 15 }, backgroundColor: "" }
      ],
      columnBlocks: [
        [
          { id: "scf_h", type: "heading", props: { text: "Get In Touch", level: "h2", align: "left" }, style: { marginBottom: 12 } },
          { id: "scf_p", type: "text", props: { html: "<p style='font-size: 14px; color: #4b5563; line-height: 1.6;'>Have questions about Microsoft Dynamics 365 or our consulting services? Fill out the form and our team will get back to you within 24 hours.</p>" }, style: { marginBottom: 15 } },
          { id: "scf_social", type: "socials", props: { align: "left", items: [{ platform: "linkedin", url: "https://linkedin.com" }, { platform: "twitter", url: "https://twitter.com" }, { platform: "facebook", url: "https://facebook.com" }] }, style: {} }
        ],
        [
          {
            id: "scf_form",
            type: "contactform",
            props: {
              heading: "Request a Free Consultation",
              subtitle: "Fill out the form and our team will get back to you within 24 hours.",
              buttonText: "Send Message",
              buttonColor: "#dc2626",
              fields: ["name", "email", "phone", "service", "message"],
              serviceOptions: ["Dynamics 365 Business Central", "Dynamics 365 Finance & Operations", "Power BI & Analytics", "Azure Cloud Infrastructure"],
              source: ""
            },
            style: {}
          }
        ]
      ]
    }
  }
];

export const TEMPLATES = [
  {
    id: "service-page",
    name: "Service Layout Template",
    description: "A complete services layout with hero banner, 3-column features, and FAQ accordions.",
    sections: [
      {
        id: "sec_hero",
        columns: 1,
        background: "#14161F",
        paddingY: "spacious",
        style: { margin: { top: 0, right: 0, bottom: 0, left: 0 }, padding: { top: 0, right: 0, bottom: 0, left: 0 } },
        columnStyles: [{ padding: { top: 20, right: 20, bottom: 20, left: 20 }, backgroundColor: "" }],
        columnBlocks: [
          [
            { id: "blk_hero_h1", type: "heading", props: { text: "We Deliver Premium Digital Solutions", level: "h1", align: "center" }, style: { color: "#ffffff", marginBottom: 15 } },
            { id: "blk_hero_text", type: "text", props: { html: "<p style='text-align: center; color: #a1a1aa;'>Transform your enterprise with modern visual page builder engines, SEO scoring modules, and cloud migration frameworks built from the ground up.</p>" }, style: {} },
            { id: "blk_hero_btn", type: "button", props: { text: "Get Started Now", url: "#contact", style: "primary", align: "center" }, style: { marginTop: 20 } }
          ]
        ]
      },
      {
        id: "sec_services",
        columns: 3,
        background: "#F6F5F2",
        paddingY: "normal",
        style: { margin: { top: 0, right: 0, bottom: 0, left: 0 }, padding: { top: 0, right: 0, bottom: 0, left: 0 } },
        columnStyles: [
          { padding: { top: 15, right: 15, bottom: 15, left: 15 }, backgroundColor: "" },
          { padding: { top: 15, right: 15, bottom: 15, left: 15 }, backgroundColor: "" },
          { padding: { top: 15, right: 15, bottom: 15, left: 15 }, backgroundColor: "" }
        ],
        columnBlocks: [
          [
            { id: "blk_s1", type: "iconbox", props: { icon: "Zap", title: "Lightning Fast Speed", description: "Engineered for rapid performance, sub-second load times, and high GTmetrix efficiency scoring.", link: "", align: "center" }, style: {} }
          ],
          [
            { id: "blk_s2", type: "iconbox", props: { icon: "Shield", title: "Ironclad Security", description: "Strict JWT authentication, rate limiting guards, and NoSQL injection sanitizer shields.", link: "", align: "center" }, style: {} }
          ],
          [
            { id: "blk_s3", type: "iconbox", props: { icon: "Layers", title: "Modular Architecture", description: "Easily drag and drop blocks, customize column padding, and export full JSON backups.", link: "", align: "center" }, style: {} }
          ]
        ]
      },
      {
        id: "sec_faq",
        columns: 1,
        background: "",
        paddingY: "normal",
        style: { margin: { top: 0, right: 0, bottom: 0, left: 0 }, padding: { top: 0, right: 0, bottom: 0, left: 0 } },
        columnStyles: [{ padding: { top: 15, right: 15, bottom: 15, left: 15 }, backgroundColor: "" }],
        columnBlocks: [
          [
            { id: "blk_faq_title", type: "heading", props: { text: "Frequently Asked Questions", level: "h2", align: "center" }, style: { marginBottom: 30 } },
            {
              id: "blk_faq_acc",
              type: "accordion",
              props: {
                items: [
                  { title: "How does the drag-and-drop page builder function?", content: "<p>You can drag any block item from the left palette (such as custom heading titles, accordions, and testimonial cards) and drop it directly onto the columns of a section.</p>" },
                  { title: "Can I configure advanced margins and padding values?", content: "<p>Absolutely! Simply click on any block or section, navigate to the 'Advanced' tab, and adjust pixel margin and padding sliders instantly.</p>" }
                ]
              },
              style: {}
            }
          ]
        ]
      }
    ]
  },
  {
    id: "landing-page",
    name: "Functional Landing Page",
    description: "Ideal for about details or product marketing with testimonial feedback blocks.",
    sections: [
      {
        id: "sec_split",
        columns: 2,
        background: "",
        paddingY: "normal",
        style: { margin: { top: 0, right: 0, bottom: 0, left: 0 }, padding: { top: 0, right: 0, bottom: 0, left: 0 } },
        columnStyles: [
          { padding: { top: 15, right: 15, bottom: 15, left: 15 }, backgroundColor: "" },
          { padding: { top: 15, right: 15, bottom: 15, left: 15 }, backgroundColor: "" }
        ],
        columnBlocks: [
          [
            { id: "blk_split_img", type: "image", props: { url: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800", alt: "Business Analysis", link: "", align: "center" }, style: {} }
          ],
          [
            { id: "blk_split_h", type: "heading", props: { text: "Design Smarter. Build Faster.", level: "h2", align: "left" }, style: { marginBottom: 15 } },
            { id: "blk_split_p", type: "text", props: { html: "<p>Create beautiful marketing grids, corporate landing sections, and blog hubs without writing code. Control colors, border roundings, and font weights live from the sidebar settings panels.</p>" }, style: { marginBottom: 20 } },
            { id: "blk_split_btn", type: "button", props: { text: "Learn More Details", url: "#features", style: "secondary", align: "left" }, style: {} }
          ]
        ]
      },
      {
        id: "sec_testimonials",
        columns: 2,
        background: "#EAEDFF",
        paddingY: "normal",
        style: { margin: { top: 0, right: 0, bottom: 0, left: 0 }, padding: { top: 0, right: 0, bottom: 0, left: 0 } },
        columnStyles: [
          { padding: { top: 15, right: 15, bottom: 15, left: 15 }, backgroundColor: "" },
          { padding: { top: 15, right: 15, bottom: 15, left: 15 }, backgroundColor: "" }
        ],
        columnBlocks: [
          [
            { id: "blk_t1", type: "testimonial", props: { quote: "This page builder transformed how we spin up promo pages. Highly recommended!", name: "Sarah Jenkins", designation: "VP of Product, TechCorp", avatar: "" }, style: {} }
          ],
          [
            { id: "blk_t2", type: "testimonial", props: { quote: "We went from designs to live campaigns in less than a day. Super easy to customize layout widths and fonts.", name: "David Chen", designation: "Marketing Lead, InnovateInc", avatar: "" }, style: {} }
          ]
        ]
      }
    ]
  },
  {
    id: "microsoft-solutions",
    name: "Microsoft Solutions Preset",
    description: "High-fidelity Microsoft Solutions Partner landing page featuring hero forms, statistics grids, Business Central layouts, CTA strips, and Case Study cards.",
    sections: [
      // 1. Hero Block (2 Columns: Title/benefits on Left, Capture Form on Right)
      {
        id: "sec_ms_hero",
        columns: 2,
        background: "linear-gradient(135deg, #101424 0%, #1c233a 100%)",
        paddingY: "spacious",
        style: { margin: { top: 0, right: 0, bottom: 0, left: 0 }, padding: { top: 0, right: 0, bottom: 0, left: 0 } },
        columnStyles: [
          { padding: { top: 20, right: 20, bottom: 20, left: 20 }, backgroundColor: "" },
          { padding: { top: 20, right: 20, bottom: 20, left: 20 }, backgroundColor: "" }
        ],
        columnBlocks: [
          [
            { id: "ms_hero_sub", type: "heading", props: { text: "GOLD MICROSOFT SOLUTIONS PARTNER", level: "h4", align: "left" }, style: { color: "#38bdf8", fontSize: "12px", fontWeight: "700" } },
            { id: "ms_hero_h", type: "heading", props: { text: "Scale Smarter, Grow Faster with Microsoft Solutions", level: "h1", align: "left" }, style: { color: "#ffffff", marginTop: 10, marginBottom: 15 } },
            { id: "ms_hero_p", type: "text", props: { html: "<p style='font-size: 15px; color: #cbd5e1; line-height: 1.6; margin-bottom: 20px;'>Supercharge financials, automate workflows, and connect commerce with Dynamics 365. Leverage built-in AI copilots to forecast demands, run safe automated cloud migrations, and manage warehouses in real-time.</p>" }, style: {} },
            {
              id: "ms_hero_list",
              type: "html",
              props: {
                code: `<div style="display: flex; flex-direction: column; gap: 10px; font-family: sans-serif; font-size: 13px; color: #e2e8f0;">
                  <div style="display: flex; items-center; gap: 8px;">
                    <span style="color: #38bdf8; font-weight: bold;">✔</span>
                    <span>Sub-second financial ledgers calculation velocity</span>
                  </div>
                  <div style="display: flex; items-center; gap: 8px;">
                    <span style="color: #38bdf8; font-weight: bold;">✔</span>
                    <span>Omnichannel POS storefront inventory auto-sync</span>
                  </div>
                  <div style="display: flex; items-center; gap: 8px;">
                    <span style="color: #38bdf8; font-weight: bold;">✔</span>
                    <span>NoSQL sanitizer protection loops on data inputs</span>
                  </div>
                </div>`
              },
              style: {}
            }
          ],
          [
            {
              id: "ms_hero_form",
              type: "contactform",
              props: {
                heading: "Get a Free Consultation",
                subtitle: "Partner with certified Microsoft Copilot ERP architects.",
                buttonText: "Get A Free Demo",
                buttonColor: "#dc2626",
                fields: ["name", "email", "phone", "service"],
                serviceOptions: ["Dynamics 365 Business Central", "Dynamics 365 Finance & Operations", "Power BI & Analytics Dashboards", "Azure Cloud Infrastructure"],
                source: ""
              },
              style: {}
            }
          ]
        ]
      },
      // 2. Statistics Grid Section (Header Block + 3 Column grid)
      {
        id: "sec_ms_stats_h",
        columns: 1,
        background: "#ffffff",
        paddingY: "normal",
        style: { margin: { top: 0, right: 0, bottom: 0, left: 0 }, padding: { top: 40, right: 0, bottom: 10, left: 0 } },
        columnStyles: [{ padding: { top: 10, right: 10, bottom: 10, left: 10 }, backgroundColor: "" }],
        columnBlocks: [
          [
            { id: "ms_stats_title", type: "heading", props: { text: "Tackling Startup Hurdles With Microsoft ERP Solutions", level: "h2", align: "center" }, style: { marginBottom: 12 } },
            { id: "ms_stats_sub", type: "text", props: { html: "<p style='text-align: center; color: #64748b; font-size: 14px; max-w-2xl; margin: 0 auto; line-height: 1.5;'>Startups face scaling bottlenecks, disconnected financial software, and inventory blind spots. Microsoft Dynamics 365 resolves these barriers instantly.</p>" }, style: {} }
          ]
        ]
      },
      {
        id: "sec_ms_stats_grid",
        columns: 3,
        background: "#ffffff",
        paddingY: "normal",
        style: { margin: { top: 0, right: 0, bottom: 0, left: 0 }, padding: { top: 0, right: 0, bottom: 40, left: 0 } },
        columnStyles: [
          { padding: { top: 15, right: 15, bottom: 15, left: 15 }, backgroundColor: "" },
          { padding: { top: 15, right: 15, bottom: 15, left: 15 }, backgroundColor: "" },
          { padding: { top: 15, right: 15, bottom: 15, left: 15 }, backgroundColor: "" }
        ],
        columnBlocks: [
          [
            { id: "ms_stat_1", type: "iconbox", props: { icon: "Zap", title: "38% Operational Efficiency", description: "Seamlessly connect procurement, logistics, and sales modules. Optimize cash flows and avoid stock bottleneck alerts automatically.", link: "", align: "center" }, style: {} }
          ],
          [
            { id: "ms_stat_2", type: "iconbox", props: { icon: "Shield", title: "82% Security Compliance", description: "Host your operations safely on Azure. Automated backups and NoSQL sanitization ensure compliance with ISO and HIPAA standard procedures.", link: "", align: "center" }, style: {} }
          ],
          [
            { id: "ms_stat_3", type: "iconbox", props: { icon: "Layers", title: "40% Fast Ledger Closures", description: "Unify banking logs, calculate multi-currency tax balances, and close ledgers in hours rather than weeks using automated routines.", link: "", align: "center" }, style: {} }
          ]
        ]
      },
      // 3. Business Central Showcase Section (3 Columns: Features on left, laptop preview in center, details on right)
      {
        id: "sec_ms_bc",
        columns: 3,
        background: "#F6F5F2",
        paddingY: "spacious",
        style: { margin: { top: 0, right: 0, bottom: 0, left: 0 }, padding: { top: 0, right: 0, bottom: 0, left: 0 } },
        columnStyles: [
          { padding: { top: 15, right: 15, bottom: 15, left: 15 }, backgroundColor: "" },
          { padding: { top: 15, right: 15, bottom: 15, left: 15 }, backgroundColor: "" },
          { padding: { top: 15, right: 15, bottom: 15, left: 15 }, backgroundColor: "" }
        ],
        columnBlocks: [
          [
            { id: "ms_bc_feat_h1", type: "heading", props: { text: "Core Features", level: "h3", align: "left" }, style: { marginBottom: 15 } },
            { id: "ms_bc_f1", type: "iconbox", props: { icon: "Check", title: "Real-time insights", description: "Access live telemetry data on revenue metrics, profit channels, and product line costs.", link: "", align: "left" }, style: { marginBottom: 15 } },
            { id: "ms_bc_f2", type: "iconbox", props: { icon: "Check", title: "Financial control", description: "Establish checks and budget alerts to keep startup departments aligned.", link: "", align: "left" }, style: {} }
          ],
          [
            { id: "ms_bc_img", type: "image", props: { url: "https://images.unsplash.com/photo-1496181130204-755241544e3f?w=800", alt: "Business Central Showcase Display", link: "", align: "center" }, style: {} }
          ],
          [
            { id: "ms_bc_feat_h2", type: "heading", props: { text: "Modern Add-ons", level: "h3", align: "left" }, style: { marginBottom: 15 } },
            { id: "ms_bc_f3", type: "iconbox", props: { icon: "Zap", title: "AI Copilot Integration", description: "Use conversational prompts to draft emails, compile inventory forecasts, and reconcile ledgers.", link: "", align: "left" }, style: { marginBottom: 15 } },
            { id: "ms_bc_f4", type: "iconbox", props: { icon: "Layers", title: "Automated Workflows", description: "Trigger actions based on operations: auto-create invoices when inventory leaves.", link: "", align: "left" }, style: {} }
          ]
        ]
      },
      // 4. CTA Strip Banner
      {
        id: "sec_ms_cta",
        columns: 1,
        background: "linear-gradient(135deg, #1e1b4b 0%, #311042 100%)",
        paddingY: "normal",
        style: { margin: { top: 0, right: 0, bottom: 0, left: 0 }, padding: { top: 40, right: 20, bottom: 40, left: 20 } },
        columnStyles: [{ padding: { top: 10, right: 10, bottom: 10, left: 10 }, backgroundColor: "" }],
        columnBlocks: [
          [
            { id: "ms_cta_h", type: "heading", props: { text: "Save up to 40% on deployment and upgrade costs!", level: "h2", align: "center" }, style: { color: "#ffffff", marginBottom: 20 } },
            { id: "ms_cta_btn", type: "button", props: { text: "Request Pricing Estimate", url: "#contact", style: "primary", align: "center" }, style: {} }
          ]
        ]
      },
      // 5. Testimonial & Showcase Grid (2 Columns)
      {
        id: "sec_ms_testi",
        columns: 2,
        background: "#ffffff",
        paddingY: "normal",
        style: { margin: { top: 0, right: 0, bottom: 0, left: 0 }, padding: { top: 40, right: 0, bottom: 40, left: 0 } },
        columnStyles: [
          { padding: { top: 15, right: 15, bottom: 15, left: 15 }, backgroundColor: "" },
          { padding: { top: 15, right: 15, bottom: 15, left: 15 }, backgroundColor: "" }
        ],
        columnBlocks: [
          [
            { id: "ms_t_item", type: "testimonial", props: { quote: "Dynamics Square helped us migrate our legacy records to Business Central seamlessly. The reporting efficiency has doubled our workflow velocity.", name: "Sarah Jenkins", designation: "VP of Product, TechCorp", avatar: "" }, style: {} }
          ],
          [
            { id: "ms_stats_txt_h", type: "heading", props: { text: "Proven Enterprise Scaling Metrics", level: "h3", align: "left" }, style: { marginBottom: 20 } },
            {
              id: "ms_stats_txt",
              type: "html",
              props: {
                code: `<div style="display: flex; flex-direction: column; gap: 16px; font-family: sans-serif;">
                  <div style="display: flex; align-items: center; gap: 16px;">
                    <span style="font-size: 32px; font-weight: 800; color: #dc2626; display: inline-block; width: 70px;">2X</span>
                    <div>
                      <h5 style="margin: 0; font-size: 14px; font-weight: bold; color: #0f172a;">Faster bookkeeping & closure cycles</h5>
                      <p style="margin: 2px 0 0 0; font-size: 12px; color: #64748b;">Unify multi-entity financial ledgers in real-time.</p>
                    </div>
                  </div>
                  <div style="display: flex; align-items: center; gap: 16px; border-t: 1px solid #f1f5f9; pt: 12px;">
                    <span style="font-size: 32px; font-weight: 800; color: #dc2626; display: inline-block; width: 70px;">80%</span>
                    <div>
                      <h5 style="margin: 0; font-size: 14px; font-weight: bold; color: #0f172a;">Reduction in manual data entry</h5>
                      <p style="margin: 2px 0 0 0; font-size: 12px; color: #64748b;">Automate banking feeds and invoice matching calculations.</p>
                    </div>
                  </div>
                </div>`
              },
              style: {}
            }
          ]
        ]
      },
      // 6. Case Studies (3-Column layout)
      {
        id: "sec_ms_cs_h",
        columns: 1,
        background: "#F6F5F2",
        paddingY: "compact",
        style: { margin: { top: 0, right: 0, bottom: 0, left: 0 }, padding: { top: 30, right: 0, bottom: 10, left: 0 } },
        columnStyles: [{ padding: { top: 10, right: 10, bottom: 10, left: 10 }, backgroundColor: "" }],
        columnBlocks: [
          [
            { id: "ms_cs_title", type: "heading", props: { text: "Check Out Some of Our Case Studies", level: "h2", align: "center" }, style: { marginBottom: 10 } }
          ]
        ]
      },
      {
        id: "sec_ms_cs_grid",
        columns: 3,
        background: "#F6F5F2",
        paddingY: "normal",
        style: { margin: { top: 0, right: 0, bottom: 0, left: 0 }, padding: { top: 0, right: 0, bottom: 30, left: 0 } },
        columnStyles: [
          { padding: { top: 15, right: 15, bottom: 15, left: 15 }, backgroundColor: "" },
          { padding: { top: 15, right: 15, bottom: 15, left: 15 }, backgroundColor: "" },
          { padding: { top: 15, right: 15, bottom: 15, left: 15 }, backgroundColor: "" }
        ],
        columnBlocks: [
          [
            { id: "ms_cs1_img", type: "image", props: { url: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=600", alt: "Healthcare Solutions Setup", link: "", align: "center" }, style: {} },
            { id: "ms_cs1_h", type: "heading", props: { text: "Healthcare Solutions Setup", level: "h4", align: "center" }, style: { marginTop: 15, marginBottom: 8 } },
            { id: "ms_cs1_p", type: "text", props: { html: "<p style='text-align: center; font-size: 12px; color: #64748b; line-height: 1.5;'>Optimized clinical logistics and inventory levels under strict HIPAA regulations.</p>" }, style: {} },
            { id: "ms_cs1_btn", type: "button", props: { text: "Read Case Study", url: "#", style: "secondary", align: "center" }, style: { marginTop: 15 } }
          ],
          [
            { id: "ms_cs2_img", type: "image", props: { url: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=600", alt: "E-Commerce Integrations", link: "", align: "center" }, style: {} },
            { id: "ms_cs2_h", type: "heading", props: { text: "E-Commerce Integrations", level: "h4", align: "center" }, style: { marginTop: 15, marginBottom: 8 } },
            { id: "ms_cs2_p", type: "text", props: { html: "<p style='text-align: center; font-size: 12px; color: #64748b; line-height: 1.5;'>Unified real-time storefront checkout pipelines with backend warehouse inventories.</p>" }, style: {} },
            { id: "ms_cs2_btn", type: "button", props: { text: "Read Case Study", url: "#", style: "secondary", align: "center" }, style: { marginTop: 15 } }
          ],
          [
            { id: "ms_cs3_img", type: "image", props: { url: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=600", alt: "SaaS Billing Operations", link: "", align: "center" }, style: {} },
            { id: "ms_cs3_h", type: "heading", props: { text: "SaaS Billing Operations", level: "h4", align: "center" }, style: { marginTop: 15, marginBottom: 8 } },
            { id: "ms_cs3_p", type: "text", props: { html: "<p style='text-align: center; font-size: 12px; color: #64748b; line-height: 1.5;'>Automated recurring subscription revenue recognition across global currencies.</p>" }, style: {} },
            { id: "ms_cs3_btn", type: "button", props: { text: "Read Case Study", url: "#", style: "secondary", align: "center" }, style: { marginTop: 15 } }
          ]
        ]
      }
    ]
  },
  {
    id: "industry-page",
    name: "Industry Preset Template",
    description: "Industry specialized marketing setup mapping sections tailored for logistics, retail, manufacturing, or healthcare.",
    sections: [
      {
        id: "sec_ind_hero",
        columns: 1,
        background: "#0f172a",
        paddingY: "spacious",
        style: { margin: { top: 0, right: 0, bottom: 0, left: 0 }, padding: { top: 0, right: 0, bottom: 0, left: 0 } },
        columnStyles: [{ padding: { top: 20, right: 20, bottom: 20, left: 20 }, backgroundColor: "" }],
        columnBlocks: [
          [
            { id: "blk_ind_h1", type: "heading", props: { text: "Accelerating Industrial Modernization", level: "h1", align: "center" }, style: { color: "#ffffff", marginBottom: 15 } },
            { id: "blk_ind_text", type: "text", props: { html: "<p style='text-align: center; color: #94a3b8;'>Empower logistics, commerce, and manufacturing operations with next-generation cloud architectures and analytics.</p>" }, style: {} },
            { id: "blk_ind_btn", type: "button", props: { text: "Explore Sectors", url: "#sectors", style: "primary", align: "center" }, style: { marginTop: 20 } }
          ]
        ]
      },
      {
        id: "sec_ind_sectors",
        columns: 3,
        background: "#ffffff",
        paddingY: "normal",
        style: { margin: { top: 0, right: 0, bottom: 0, left: 0 }, padding: { top: 0, right: 0, bottom: 0, left: 0 } },
        columnStyles: [
          { padding: { top: 15, right: 15, bottom: 15, left: 15 }, backgroundColor: "" },
          { padding: { top: 15, right: 15, bottom: 15, left: 15 }, backgroundColor: "" },
          { padding: { top: 15, right: 15, bottom: 15, left: 15 }, backgroundColor: "" }
        ],
        columnBlocks: [
          [
            { id: "blk_ind_s1", type: "iconbox", props: { icon: "Zap", title: "Smart Logistics", description: "Route optimization, live fleet metrics tracking, and automated inventory sync.", link: "", align: "center" }, style: {} }
          ],
          [
            { id: "blk_ind_s2", type: "iconbox", props: { icon: "Shield", title: "Secure Retail ERP", description: "Unified omnichannel POS checkouts with complete NoSQL security sanitizer loops.", link: "", align: "center" }, style: {} }
          ],
          [
            { id: "blk_ind_s3", type: "iconbox", props: { icon: "Layers", title: "Automated Production", description: "Configure machine scheduling cycles and lower production bottleneck flags.", link: "", align: "center" }, style: {} }
          ]
        ]
      }
    ]
  },
  {
    id: "dynamics-implementation",
    name: "Dynamics 365 Implementation (Premium)",
    description: "A gorgeous, high-fidelity landing page for Microsoft Solution Partners featuring custom services grids, client trust strips, active lead generation, and interactive FAQs.",
    sections: [
      // 1. Premium Hero Section
      {
        id: "d365_impl_hero",
        columns: 2,
        background: "linear-gradient(135deg, #090d16 0%, #111827 100%)",
        paddingY: "spacious",
        style: { margin: { top: 0, right: 0, bottom: 0, left: 0 }, padding: { top: 20, right: 0, bottom: 20, left: 0 } },
        columnStyles: [
          { padding: { top: 20, right: 20, bottom: 20, left: 20 }, backgroundColor: "" },
          { padding: { top: 20, right: 20, bottom: 20, left: 20 }, backgroundColor: "" }
        ],
        columnBlocks: [
          [
            { id: "d365_hero_badge", type: "heading", props: { text: "⚡ CERTIFIED IMPLEMENTATION SERVICES", level: "h4", align: "left" }, style: { color: "#38bdf8", fontSize: "11px", fontWeight: "800" } },
            { id: "d365_hero_h1", type: "heading", props: { text: "Unify Finance & Operations With Business Central", level: "h1", align: "left" }, style: { color: "#ffffff", marginTop: 8, marginBottom: 15 } },
            { id: "d365_hero_p", type: "text", props: { html: "<p style='font-size: 15px; color: #94a3b8; line-height: 1.6;'>Accelerate growth with a unified, cloud-based ERP solution. Connect financials, sales, service, and operations to streamline business processes, improve customer relations, and make better decisions.</p>" }, style: { marginBottom: 20 } },
            {
              id: "d365_hero_bullets",
              type: "html",
              props: {
                code: `<div style="display: flex; flex-direction: column; gap: 12px; font-family: sans-serif; font-size: 13px; color: #cbd5e1;">
                  <div style="display: flex; align-items: center; gap: 10px;">
                    <span style="display: flex; height: 18px; width: 18px; align-items: center; justify-content: center; rounded-radius: 50%; background: rgba(56,189,248,0.1); color: #38bdf8; font-weight: bold; font-size: 10px;">✓</span>
                    <span>100% Secure cloud deployment with automated backups</span>
                  </div>
                  <div style="display: flex; align-items: center; gap: 10px;">
                    <span style="display: flex; height: 18px; width: 18px; align-items: center; justify-content: center; rounded-radius: 50%; background: rgba(56,189,248,0.1); color: #38bdf8; font-weight: bold; font-size: 10px;">✓</span>
                    <span>Configured by certified Microsoft Copilot Architects</span>
                  </div>
                </div>`
              },
              style: {}
            }
          ],
          [
            {
              id: "d365_hero_form",
              type: "contactform",
              props: {
                heading: "Schedule a Discovery Call",
                subtitle: "Speak directly with a Dynamics 365 implementation architect.",
                buttonText: "Schedule Now",
                buttonColor: "#0284c7",
                fields: ["name", "email", "phone", "service"],
                serviceOptions: ["Business Central Sandbox Setup", "Full ERP Cloud Migration", "Custom API Integrations", "Power Platform PowerApps Dev"],
                source: ""
              },
              style: {}
            }
          ]
        ]
      },
      // 2. Client Trust Logo Strip
      {
        id: "d365_impl_trust",
        columns: 1,
        background: "#f8fafc",
        paddingY: "compact",
        style: { margin: { top: 0, right: 0, bottom: 0, left: 0 }, padding: { top: 15, right: 0, bottom: 15, left: 0 } },
        columnStyles: [{ padding: { top: 5, right: 15, bottom: 5, left: 15 }, backgroundColor: "" }],
        columnBlocks: [
          [
            {
              id: "d365_trust_logos",
              type: "html",
              props: {
                code: `<div style="display: flex; flex-wrap: wrap; justify-content: center; align-items: center; gap: 40px; opacity: 0.6; filter: grayscale(100%);">
                  <span style="font-family: sans-serif; font-size: 16px; font-weight: 800; color: #475569;">MICROSOFT</span>
                  <span style="font-family: sans-serif; font-size: 16px; font-weight: 800; color: #475569;">DYNAMICS 365</span>
                  <span style="font-family: sans-serif; font-size: 16px; font-weight: 800; color: #475569;">AZURE CLOUD</span>
                  <span style="font-family: sans-serif; font-size: 16px; font-weight: 800; color: #475569;">POWER PLATFORM</span>
                </div>`
              },
              style: {}
            }
          ]
        ]
      },
      // 3. Premium Services Grid
      {
        id: "d365_impl_services_h",
        columns: 1,
        background: "#ffffff",
        paddingY: "normal",
        style: { margin: { top: 0, right: 0, bottom: 0, left: 0 }, padding: { top: 30, right: 0, bottom: 10, left: 0 } },
        columnStyles: [{ padding: { top: 10, right: 10, bottom: 10, left: 10 }, backgroundColor: "" }],
        columnBlocks: [
          [
            { id: "d365_srv_title", type: "heading", props: { text: "Tailored Implementation Services", level: "h2", align: "center" }, style: { marginBottom: 12 } },
            { id: "d365_srv_sub", type: "text", props: { html: "<p style='text-align: center; color: #64748b; font-size: 14px; max-width: 600px; margin: 0 auto;'>We don't believe in one-size-fits-all ERP solutions. Our certified team maps workflows directly to your industrial bottlenecks.</p>" }, style: {} }
          ]
        ]
      },
      {
        id: "d365_impl_services_grid",
        columns: 3,
        background: "#ffffff",
        paddingY: "normal",
        style: { margin: { top: 0, right: 0, bottom: 0, left: 0 }, padding: { top: 0, right: 0, bottom: 30, left: 0 } },
        columnStyles: [
          { padding: { top: 15, right: 15, bottom: 15, left: 15 }, backgroundColor: "" },
          { padding: { top: 15, right: 15, bottom: 15, left: 15 }, backgroundColor: "" },
          { padding: { top: 15, right: 15, bottom: 15, left: 15 }, backgroundColor: "" }
        ],
        columnBlocks: [
          [
            { id: "d365_srv1", type: "iconbox", props: { icon: "Zap", title: "Rapid Deployments", description: "Standardized templates to get Business Central live and ready for testing in under 6 weeks.", link: "", align: "center" }, style: {} }
          ],
          [
            { id: "d365_srv2", type: "iconbox", props: { icon: "Layers", title: "Custom Enhancements", description: "Custom extensions (AL Language) and Power Automate workflows configured securely.", link: "", align: "center" }, style: {} }
          ],
          [
            { id: "d365_srv3", type: "iconbox", props: { icon: "HelpCircle", title: "24/7 Premium Support", description: "Post-implementation SLA coverage, monthly updates, and system upgrades handled safely.", link: "", align: "center" }, style: {} }
          ]
        ]
      },
      // 4. Testimonial Banner (1 Column Spacious)
      {
        id: "d365_impl_quote",
        columns: 1,
        background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
        paddingY: "spacious",
        style: { margin: { top: 0, right: 0, bottom: 0, left: 0 }, padding: { top: 40, right: 40, bottom: 40, left: 40 } },
        columnStyles: [{ padding: { top: 20, right: 20, bottom: 20, left: 20 }, backgroundColor: "" }],
        columnBlocks: [
          [
            { id: "d365_quote_txt", type: "testimonial", props: { quote: "Transitioning to Microsoft Cloud with Dynamics Square was the best operational decision we've made. We consolidated four siloed business systems into a single dashboard.", name: "David Chen", designation: "COO, Nexus Manufacturing", avatar: "" }, style: {} }
          ]
        ]
      },
      // 5. FAQ Accordion Section
      {
        id: "d365_impl_faq",
        columns: 1,
        background: "#ffffff",
        paddingY: "normal",
        style: { margin: { top: 0, right: 0, bottom: 0, left: 0 }, padding: { top: 30, right: 0, bottom: 30, left: 0 } },
        columnStyles: [{ padding: { top: 15, right: 15, bottom: 15, left: 15 }, backgroundColor: "" }],
        columnBlocks: [
          [
            { id: "d365_faq_title", type: "heading", props: { text: "Frequently Asked Questions", level: "h2", align: "center" }, style: { marginBottom: 20 } },
            { id: "d365_faq_acc", type: "accordion", props: { items: [
              { title: "What is the typical implementation timeline?", content: "<p>Most standard implementations take 6 to 12 weeks, depending on the complexity of your legacy data and integrations.</p>" },
              { title: "How are licensing costs calculated?", content: "<p>Microsoft Dynamics 365 is licensed per-user, per-month. We will recommend the exact combination of Essentials, Premium, or Team Member licenses for your team.</p>" },
              { title: "Can Dynamics 365 integrate with our custom CRM?", content: "<p>Yes! We specialize in custom API integrations using Azure Logic Apps and Power Automate webhooks.</p>" }
            ] }, style: {} }
          ]
        ]
      }
    ]
  }
];
