const PORTAL_URL = (process.env.MAIL_PORTAL_URL || "https://mailserviceportal.onrender.com/api/form").replace(/\/$/, "");
const TIMEOUT_MS = Number(process.env.MAIL_PORTAL_TIMEOUT_MS || 15000);

const TEMPLATES = {
  licensingInternal: process.env.MAIL_TPL_LICENSING_INTERNAL,
  licensingCustomer: process.env.MAIL_TPL_LICENSING_CUSTOMER,
  estimatorInternal: process.env.MAIL_TPL_ESTIMATOR_INTERNAL,
  estimatorCustomer: process.env.MAIL_TPL_ESTIMATOR_CUSTOMER,
};

const sendViaPortal = async (templateId, payload) => {
  if (!templateId) {
    console.warn("[mailPortal] no template id configured — skipping send");
    return { ok: false, skipped: true, error: "No template id configured" };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(`${PORTAL_URL}/${templateId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    const body = await res.text().catch(() => "");
    if (!res.ok) {
      console.error(`[mailPortal] ${templateId} responded ${res.status}: ${body.slice(0, 300)}`);
      return { ok: false, status: res.status, body };
    }
    return { ok: true, status: res.status, body };
  } catch (err) {
    const reason = err.name === "AbortError" ? `timed out after ${TIMEOUT_MS}ms` : err.message;
    console.error(`[mailPortal] ${templateId} failed: ${reason}`);
    return { ok: false, error: reason };
  } finally {
    clearTimeout(timer);
  }
};

/** Send by role name rather than raw id, so callers never hold template ids. */
const sendTemplate = (role, payload) => sendViaPortal(TEMPLATES[role], payload);

/* ---- helpers for building the readable block templates render ---- */

/* People type their names in lower case. Capitalise each part for display,
   including after an apostrophe or hyphen, so "o'brien-smith" reads correctly.
   Left alone if they already used capitals themselves. */
const titleCase = (s) =>
  String(s ?? "")
    .trim()
    .replace(/[A-Za-zÀ-ɏ]+/g, (w) =>
      /[A-Z]/.test(w) ? w : w.charAt(0).toUpperCase() + w.slice(1)
    );

const esc = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

/** A two-column table of label/value rows, skipping empties. */
const htmlRows = (rows) =>
  `<table style="width:100%;border-collapse:collapse;font-family:'Segoe UI',sans-serif;font-size:13px;">${rows
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(
      ([k, v]) =>
        `<tr><td style="padding:6px 12px 6px 0;color:#64748b;vertical-align:top;white-space:nowrap;">${esc(
          k
        )}</td><td style="padding:6px 0;color:#0f172a;">${v}</td></tr>`
    )
    .join("")}</table>`;

/** A bulleted list, or an em dash when there is nothing to show. */
const htmlList = (items) =>
  items && items.length
    ? `<ul style="margin:0;padding-left:18px;font-family:'Segoe UI',sans-serif;font-size:13px;color:#0f172a;">${items
        .map((i) => `<li style="margin-bottom:3px;">${esc(i)}</li>`)
        .join("")}</ul>`
    : "&mdash;";

module.exports = { sendViaPortal, sendTemplate, TEMPLATES, PORTAL_URL, htmlRows, htmlList, esc, titleCase };
