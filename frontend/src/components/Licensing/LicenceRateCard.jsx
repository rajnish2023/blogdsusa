import { useState, useEffect, useMemo, useCallback } from "react";
import { fetchLicensingCatalog, submitLicensingLead } from "../../api/licensingApi";
import { calculate, resolveVerdict, fmt } from "../../utils/licensingEngine";

export default function LicenceRateCard({ source = "licence-rate-card" }) {
  const [catalog, setCatalog] = useState(null);
  const [loadError, setLoadError] = useState("");

  // null until the catalog answers — the server picks from the visitor's country
  const [currency, setCurrency] = useState(null);
  const [caps, setCaps] = useState(() => new Set());
  const [open, setOpen] = useState(() => new Set());
  const [entities, setEntities] = useState(1);
  const [countries, setCountries] = useState(1);
  const [revenue, setRevenue] = useState("5_25");
  const [fullUsers, setFullUsers] = useState(1);
  const [teamUsers, setTeamUsers] = useState(0);
  const [deviceUsers, setDeviceUsers] = useState(0);
  const [activityUsers, setActivityUsers] = useState(0);
  const [lead, setLead] = useState({ name: "", email: "", company: "", phone: "", renewal: "" });
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const [sent, setSent] = useState(false);
  const [unlockToken, setUnlockToken] = useState(null);

  useEffect(() => {
    let alive = true;
    fetchLicensingCatalog()
      .then((data) => {
        if (!alive) return;
        setCatalog(data);
        // keep whatever the visitor already chose; otherwise take the geo default
        setCurrency((prev) =>
          prev && data.pricing?.[prev] ? prev : data.defaultCurrency || data.currencies?.[0] || "USD"
        );
      })
      .catch(() => alive && setLoadError("The rate card could not be loaded. Please refresh and try again."));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggle = (id) =>
    setCaps((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const p = currency ? catalog?.pricing?.[currency] : null;

  const locked = !!catalog?.gated;

  const model = useMemo(() => {
    if (!catalog) return null;
    const input = { capabilities: caps, entities, countries, revenue, fullUsers, teamUsers, deviceUsers, activityUsers };
    if (locked || !p?.bc) return resolveVerdict(catalog, input);
    return calculate(catalog, p, input, lead);
  }, [catalog, p, locked, caps, entities, countries, revenue, fullUsers, teamUsers, deviceUsers, activityUsers, lead]);

  const handleSubmit = useCallback(async () => {
    if (!lead.email || sending) return;
    setSending(true);
    setSendError("");
    try {
      const res = await submitLicensingLead({
        ...lead,
        source,
        currency,
        capabilities: [...caps],
        entities,
        countries,
        revenue,
        fullUsers,
        teamUsers,
        deviceUsers,
        activityUsers,
      });
      setSent(true);

      if (res?.unlockToken) {
        setUnlockToken(res.unlockToken);
        try {
          setCatalog(await fetchLicensingCatalog(res.unlockToken));
        } catch {
          // the enquiry is safely recorded; only the live reveal is missed
        }
      }
    } catch (err) {
      setSendError(
        err?.response?.data?.message ||
          catalog?.content?.errors?.submitFailed ||
          "Something went wrong. Please try again."
      );
    } finally {
      setSending(false);
    }
  }, [lead, sending, source, currency, caps, entities, countries, revenue, fullUsers, teamUsers, deviceUsers, activityUsers]);

  if (loadError) {
    return (
      <div className="rc">
        <style>{CSS}</style>
        <div className="rc-load rc-load-error">{loadError}</div>
      </div>
    );
  }

  if (!catalog || !model || !currency) {
    return (
      <div className="rc">
        <style>{CSS}</style>
        <div className="rc-load">Loading the rate card…</div>
      </div>
    );
  }

  const {
    capabilities: CAP_GROUPS,
    sections: SECTIONS,
    tierTag: TIER_TAG,
    appShort: APP_SHORT,
    content: C,
  } = catalog;

  const values = { entities, countries, revenue, fullUsers, teamUsers, deviceUsers, activityUsers };
  const setters = {
    entities: setEntities,
    countries: setCountries,
    revenue: setRevenue,
    fullUsers: setFullUsers,
    teamUsers: setTeamUsers,
    deviceUsers: setDeviceUsers,
    activityUsers: setActivityUsers,
  };
  // `showWhen: "platform:fo"` keeps the Activity stepper out until it applies.
  const visible = (f) => !f.showWhen || f.showWhen !== "platform:fo" || model.platform === "fo";

  const annual = model.annual;

  return (
    <div className="rc">
      <style>{CSS}</style>

      <header className="rc-head">
        <div className="rc-eyebrow">
          <span className="rc-mark" aria-hidden="true" />
          {C.header.eyebrow}
        </div>
        <h1>{C.header.heading}</h1>
        <p className="rc-dek">{C.header.dek}</p>
        <div className="rc-currency" role="group" aria-label="Currency">
          {catalog.currencies.map((c) => (
            <button
              key={c}
              type="button"
              className={"chip" + (currency === c ? " on" : "")}
              onClick={() => setCurrency(c)}
              aria-pressed={currency === c}
            >
              {c}
            </button>
          ))}
        </div>
      </header>

      <div className="rc-grid">
        {/* ------------------------------- INPUTS ------------------------------- */}
        <div className="rc-inputs">
          {CAP_GROUPS.map(({ name: g, id: gid, sub, collapsible, group: inGroup }) => {
            const isOpen = !collapsible || open.has(g);
            const picked = inGroup.filter((c) => caps.has(c.id)).length;
            return (
              <section className="block" key={gid}>
                <h2 className="block-title">{g}</h2>
                {sub && <p className="block-sub">{sub}</p>}
                {collapsible && (
                  <button
                    type="button"
                    className="disclose"
                    aria-expanded={isOpen}
                    onClick={() =>
                      setOpen((prev) => {
                        const n = new Set(prev);
                        if (n.has(g)) n.delete(g);
                        else n.add(g);
                        return n;
                      })
                    }
                  >
                    <span className="disclose-caret" aria-hidden="true">{isOpen ? "−" : "+"}</span>
                    {isOpen ? "Hide" : "Show"} {inGroup.length} capabilities
                    {picked > 0 && <em>{picked} selected</em>}
                  </button>
                )}
                <ul className={"caps" + (isOpen ? "" : " is-closed")}>
                  {inGroup.map((c) => {
                    const on = caps.has(c.id);
                    return (
                      <li key={c.id}>
                        <button
                          type="button"
                          className={"cap" + (on ? " on" : "")}
                          onClick={() => toggle(c.id)}
                          aria-pressed={on}
                        >
                          <span className="cap-box" aria-hidden="true">{on ? "✓" : ""}</span>
                          <span className="cap-text">
                            <span className="cap-label">{c.label}</span>
                            <span className="cap-note">{c.note}</span>
                          </span>
                          <span className={"tag " + TIER_TAG[c.tier].cls}>{TIER_TAG[c.tier].label}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}

          {SECTIONS.map((section) => {
            const numbers = section.fields.filter((f) => f.type === "number" && visible(f));
            const choices = section.fields.filter((f) => f.type === "choice");
            return (
              <section className="block" key={section.id}>
                <h2 className="block-title">{section.name}</h2>
                {section.sub && <p className="block-sub">{section.sub}</p>}

                {numbers.length > 0 && (
                  <div className="steppers">
                    {numbers.map((f) => (
                      <Stepper
                        key={f.key}
                        label={f.label}
                        hint={f.hint}
                        big={f.emphasis}
                        min={f.min}
                        max={f.max}
                        value={values[f.key]}
                        set={setters[f.key]}
                      />
                    ))}
                  </div>
                )}

                {choices.map((f) => (
                  <div className="field" key={f.key}>
                    <span className="field-label">{f.label}</span>
                    <div className="segs">
                      {f.options.map((o) => (
                        <button
                          key={o.id}
                          type="button"
                          className={"seg" + (values[f.key] === o.id ? " on" : "")}
                          onClick={() => setters[f.key](o.id)}
                          aria-pressed={values[f.key] === o.id}
                        >
                          {o.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </section>
            );
          })}

        </div>

        {/* ----------------------------- STATEMENT ----------------------------- */}
        <aside className="rc-statement">
          <div className="stmt">
            <div className="stmt-top">
              <span className="stmt-kicker">{C.statement.kicker}</span>
              <span className={"stmt-platform " + (model.platform === "fo" ? "is-fo" : "")}>
                {model.platformLabel}
              </span>
            </div>

            {locked ? (
              <div className="lockbox">
                <div className="lock-verdict">
                  <span className="lock-kicker">{C.locked.kicker}</span>
                  <p className="lock-answer">
                    {C.locked.verdictPrefix} <b>{model.platformLabel}</b>.
                  </p>
                  <ul className="lock-counts">
                    <li><b>{model.capabilityCount}</b> {C.locked.capabilitiesSuffix}</li>
                    {model.moduleCount > 0 && <li><b>{model.moduleCount}</b> {C.locked.modulesSuffix}</li>}
                    {model.extensionCount > 0 && <li><b>{model.extensionCount}</b> {C.locked.extensionsSuffix}</li>}
                  </ul>
                </div>

                <div className="lock-rows" aria-hidden="true">
                  {[64, 82, 48].map((w, i) => (
                    <div className="lock-row" key={i}>
                      <span className="lock-bar" style={{ width: `${w}%` }} />
                      <span className="lock-chip" />
                    </div>
                  ))}
                </div>

                <p className="lock-cta">
                  <span className="lock-icon" aria-hidden="true">🔒</span>
                  {C.locked.ctaText}
                </p>
              </div>
            ) : (
            <>
            <table className="stmt-table">
              <tbody>
                {model.lines.length === 0 && (
                  <tr><td className="stmt-empty" colSpan={3}>{C.statement.emptyText}</td></tr>
                )}
                {model.lines.map((l) => (
                  <tr key={l.k}>
                    <td className="q">{l.qty}<span>×</span></td>
                    <td className="d">
                      <span className="d-label">{l.label}</span>
                      <span className="d-sub">{l.sub}</span>
                    </td>
                    <td className="v">
                      <span className="v-rate">{model.symbol}{fmt(l.rate)}</span>
                      <span className="v-line">{model.symbol}{fmt(l.total)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {model.foMinimumApplied && (
              <p className="stmt-min">
                Microsoft sells the primary Finance &amp; Operations application with a{" "}
                {model.foMinSeats} full-user minimum, and it cannot be split across core
                applications. The statement is priced at that floor.
              </p>
            )}

            <div className="stmt-totals">
              <div className="tot"><span>{C.statement.perMonth}</span><b>{model.symbol}{fmt(model.monthly)}</b></div>
              <div className="tot lead"><span>{C.statement.perYear}</span><b>{model.symbol}{fmt(annual)}</b></div>
              <div className="tot"><span>{C.statement.perThreeYears}</span><b>{model.symbol}{fmt(model.threeYear)}</b></div>
            </div>

            {model.beyondDrivers.length > 0 && (
              <div className="stmt-ext is-fo-map">
                <span className="ext-kicker fo">{C.statement.modulesKicker}</span>
                <ul className="ext-list">
                  {model.beyondDrivers.map((d) => (
                    <li key={d.id}><span>{d.fo}</span><em>{APP_SHORT[d.app]}</em></li>
                  ))}
                </ul>
              </div>
            )}

            {model.extensions.length > 0 && (
              <div className="stmt-ext">
                <span className="ext-kicker">{C.statement.extensionsKicker}</span>
                <ul className="ext-list">
                  {model.extensions.map((e) => (
                    <li key={e.id}><span>{e.label}</span><em>Quoted</em></li>
                  ))}
                </ul>
                <p className="ext-note">
                  {C.statement.extensionsNote.replace(
                    "{tier}",
                    model.platform === "fo" ? "Finance & Operations" : model.tier === "premium" ? "Premium" : "Essentials"
                  )}
                </p>
              </div>
            )}

            <p className="stmt-foot">
              {model.extensions.length > 0 ? `${C.statement.coreOnlyPrefix} ` : ""}
              {C.statement.footnote}{" "}
              List prices{" "}
              {model.pricingTrusted
                ? `verified ${model.pricingVerified}`
                : "are placeholders pending verification"}
              .
            </p>
            </>
            )}
          </div>

          <div className="capture">
            {!sent ? (
              <>
                <h3>{locked ? C.form.lockedHeading : C.form.heading}</h3>
                <p>{locked ? C.form.lockedBody : C.form.body}</p>
                <input
                  className="inp"
                  placeholder={C.form.namePlaceholder}
                  value={lead.name}
                  onChange={(e) => setLead({ ...lead, name: e.target.value })}
                />
                <input
                  className="inp"
                  type="email"
                  placeholder={C.form.emailPlaceholder}
                  value={lead.email}
                  onChange={(e) => setLead({ ...lead, email: e.target.value })}
                />
                <input
                  className="inp"
                  placeholder={C.form.companyPlaceholder}
                  value={lead.company}
                  onChange={(e) => setLead({ ...lead, company: e.target.value })}
                />
                <input
                  className="inp"
                  type="tel"
                  placeholder={C.form.phonePlaceholder}
                  value={lead.phone}
                  onChange={(e) => setLead({ ...lead, phone: e.target.value })}
                />
                <label className="inp-label" htmlFor="rc-renewal">
                  {C.form.renewalLabel}
                </label>
                <input
                  id="rc-renewal"
                  className="inp"
                  placeholder={C.form.renewalPlaceholder}
                  value={lead.renewal}
                  onChange={(e) => setLead({ ...lead, renewal: e.target.value })}
                />
                {sendError && <p className="err">{sendError}</p>}
                <button
                  type="button"
                  className="cta"
                  onClick={handleSubmit}
                  disabled={!lead.name.trim() || !lead.email.trim() || sending}
                >
                  {sending ? C.form.sendingLabel : locked ? C.form.lockedCtaLabel : C.form.ctaLabel}
                </button>
              </>
            ) : (
              <div className="done">
                <h3>{unlockToken ? C.success.unlockedHeading : C.success.heading}</h3>
                <p>{unlockToken ? C.success.unlockedBody : C.success.body}</p>
              </div>
            )}
          </div>

        </aside>
      </div>
    </div>
  );
}

function Stepper({ label, hint, value, set, min = 0, max = 999, big }) {
  return (
    <div className={"stp" + (big ? " big" : "")}>
      <div className="stp-text">
        <span className="stp-label">{label}</span>
        {hint && <span className="stp-hint">{hint}</span>}
      </div>
      <div className="stp-ctl">
        <button type="button" onClick={() => set(Math.max(min, value - 1))} aria-label={`Decrease ${label}`}>−</button>
        <input
          type="number"
          value={value}
          min={min}
          max={max}
          onChange={(e) => set(Math.min(max, Math.max(min, Number(e.target.value) || 0)))}
          aria-label={label}
        />
        <button type="button" onClick={() => set(Math.min(max, value + 1))} aria-label={`Increase ${label}`}>+</button>
      </div>
    </div>
  );
}

const CSS = `
.rc{--paper:#FBFBF8;--ink:#0F1720;--ink-2:#3D4854;--rule:#DFE1DA;--rule-2:#EDEEE9;
--blue:#0B5FA5;--blue-soft:#E8F0F7;--clay:#A32A1F;--clay-soft:#F8ECEA;--jade:#0E6E4F;--jade-soft:#E9F2EE;
--mono:"IBM Plex Mono","SF Mono",ui-monospace,Menlo,monospace;
--sans:"Inter",ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;
background:var(--paper);color:var(--ink);font-family:var(--sans);
font-size:15px;line-height:1.5;padding:40px 28px 72px;-webkit-font-smoothing:antialiased}
.rc *{box-sizing:border-box}
.rc button{font-family:inherit}
.rc :focus-visible{outline:2px solid var(--blue);outline-offset:2px}

.rc-load{max-width:1180px;margin:0 auto;padding:64px 0;text-align:center;color:var(--ink-2);font-size:14px}
.rc-load-error{color:var(--clay)}

.rc-head{max-width:1180px;margin:0 auto 34px}
.rc-eyebrow{display:flex;align-items:center;gap:9px;font-family:var(--mono);font-size:11px;
letter-spacing:.14em;text-transform:uppercase;color:var(--ink-2)}
.rc-mark{width:9px;height:9px;background:var(--blue);display:inline-block}
.rc-head h1{font-size:clamp(30px,4.4vw,46px);line-height:1.04;letter-spacing:-.024em;
font-weight:640;margin:16px 0 10px;max-width:16ch}
.rc-dek{color:var(--ink-2);max-width:56ch;margin:0}
.rc-currency{display:flex;gap:6px;margin-top:20px}
.rc .chip{font-family:var(--mono);font-size:11.5px;letter-spacing:.06em;padding:6px 12px;
border:1px solid var(--rule);background:transparent;color:var(--ink-2);cursor:pointer;border-radius:2px}
.rc .chip.on{background:var(--ink);color:var(--paper);border-color:var(--ink)}

.rc-grid{max-width:1180px;margin:0 auto;display:grid;grid-template-columns:minmax(0,1fr) 400px;gap:52px;align-items:start}

.rc .block{border-top:1px solid var(--ink);padding-top:14px;margin-bottom:34px}
.block-title{font-family:var(--mono);font-size:11px;letter-spacing:.13em;text-transform:uppercase;
font-weight:500;margin:0 0 4px;color:var(--ink)}
.block-sub{color:var(--ink-2);font-size:13.5px;margin:0 0 14px;max-width:54ch}
.caps{list-style:none;margin:10px 0 0;padding:0}
.caps li+li{border-top:1px solid var(--rule-2)}
.cap{display:flex;align-items:flex-start;gap:14px;width:100%;text-align:left;background:none;
border:0;padding:13px 4px;cursor:pointer}
.cap:hover .cap-label{color:var(--blue)}
.cap-box{flex:none;width:17px;height:17px;border:1px solid var(--ink-2);margin-top:2px;
display:grid;place-items:center;font-size:11px;color:transparent;border-radius:2px;transition:.12s}
.cap.on .cap-box{background:var(--ink);border-color:var(--ink);color:var(--paper)}
.cap-text{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}
.cap-label{font-size:14.5px;font-weight:500;transition:color .12s}
.cap-note{font-size:12.5px;color:var(--ink-2)}
.rc .tag{flex:none;font-family:var(--mono);font-size:10px;letter-spacing:.07em;text-transform:uppercase;
padding:3px 7px;border-radius:2px;margin-top:1px}
.tag-ess{background:var(--rule-2);color:var(--ink-2)}
.tag-prem{background:var(--blue-soft);color:var(--blue)}
.tag-addon{background:var(--jade-soft);color:var(--jade)}
.tag-beyond{background:var(--clay-soft);color:var(--clay)}

.steppers{display:flex;flex-direction:column}
.stp{display:flex;align-items:center;justify-content:space-between;gap:20px;padding:12px 4px}
.stp+.stp{border-top:1px solid var(--rule-2)}
.stp-text{display:flex;flex-direction:column;gap:2px;min-width:0}
.stp-label{font-size:14px}
.stp.big .stp-label{font-weight:500}
.stp-hint{font-family:var(--mono);font-size:10.5px;letter-spacing:.07em;text-transform:uppercase;color:var(--ink-2)}
.stp-ctl{flex:none;display:flex;align-items:center;border:1px solid var(--rule);border-radius:2px;background:#fff}
.stp-ctl button{width:32px;height:32px;border:0;background:none;cursor:pointer;font-size:16px;color:var(--ink-2)}
.stp-ctl button:hover{color:var(--blue)}
.stp-ctl input{width:52px;height:32px;border:0;border-left:1px solid var(--rule);border-right:1px solid var(--rule);
text-align:center;font-family:var(--mono);font-size:14px;background:none;color:var(--ink);
-moz-appearance:textfield}
.stp-ctl input::-webkit-outer-spin-button,.stp-ctl input::-webkit-inner-spin-button{-webkit-appearance:none;margin:0}

.rc .field{margin-top:16px}
.field-label{display:block;font-size:14px;margin-bottom:8px}
.segs{display:flex;flex-wrap:wrap;gap:6px}
.seg{font-size:13px;padding:7px 13px;border:1px solid var(--rule);background:#fff;cursor:pointer;border-radius:2px;color:var(--ink-2)}
.seg.on{background:var(--ink);border-color:var(--ink);color:var(--paper)}

.rc-statement{position:sticky;top:24px}
.stmt{background:var(--ink);color:#F1F3F0;padding:22px 22px 18px;border-radius:3px}
.stmt-top{display:flex;flex-direction:column;gap:6px;padding-bottom:16px;border-bottom:1px solid rgba(255,255,255,.16)}
.stmt-kicker{font-family:var(--mono);font-size:10.5px;letter-spacing:.15em;text-transform:uppercase;color:rgba(255,255,255,.5)}
.stmt-platform{font-size:19px;font-weight:560;letter-spacing:-.01em}
.stmt-platform.is-fo{color:#F2B8AE}
.stmt-table{width:100%;border-collapse:collapse;margin:4px 0 0}
.stmt-table tr{border-bottom:1px solid rgba(255,255,255,.1)}
.stmt-table td{padding:12px 0;vertical-align:top}
.stmt-table .q{font-family:var(--mono);font-size:13px;width:44px;color:#fff;font-variant-numeric:tabular-nums}
.stmt-table .q span{color:rgba(255,255,255,.4);margin-left:2px}
.stmt-table .d{padding-right:10px}
.d-label{display:block;font-size:13.5px;line-height:1.3}
.d-sub{display:block;font-size:11.5px;color:rgba(255,255,255,.5);margin-top:2px}
.stmt-table .v{text-align:right;white-space:nowrap;font-family:var(--mono);font-variant-numeric:tabular-nums}
.v-rate{display:block;font-size:11px;color:rgba(255,255,255,.45)}
.v-line{display:block;font-size:14px;margin-top:2px}
.stmt-empty{font-size:13px;color:rgba(255,255,255,.5);padding:20px 0!important}
.stmt-totals{margin-top:16px;padding-top:14px;border-top:1px solid rgba(255,255,255,.3)}
.tot{display:flex;justify-content:space-between;align-items:baseline;padding:5px 0}
.tot span{font-size:12.5px;color:rgba(255,255,255,.6)}
.tot b{font-family:var(--mono);font-size:15px;font-weight:500;font-variant-numeric:tabular-nums}
.tot.lead b{font-size:25px;letter-spacing:-.02em}
.tot.lead span{color:#fff}
.disclose{display:flex;align-items:center;gap:8px;background:none;border:0;padding:6px 0 2px;
font-family:var(--mono);font-size:11px;letter-spacing:.08em;text-transform:uppercase;
color:var(--ink-2);cursor:pointer}
.disclose:hover{color:var(--blue)}
.disclose-caret{width:15px;height:15px;border:1px solid var(--rule);display:grid;place-items:center;
font-size:12px;line-height:1;border-radius:2px}
.disclose em{font-style:normal;background:var(--clay-soft);color:var(--clay);padding:2px 6px;border-radius:2px;letter-spacing:.05em}
.caps.is-closed{display:none}

.is-fo-map .ext-kicker.fo{color:#F2B8AE}
.is-fo-map{border-top-style:solid;border-top-color:rgba(242,184,174,.32)}
.stmt-ext{margin-top:18px;padding-top:14px;border-top:1px dashed rgba(255,255,255,.28)}
.ext-kicker{display:block;font-family:var(--mono);font-size:10px;letter-spacing:.14em;
text-transform:uppercase;color:#9FD8BE;margin-bottom:9px}
.ext-list{list-style:none;margin:0;padding:0}
.ext-list li{display:flex;justify-content:space-between;align-items:baseline;gap:12px;padding:5px 0;
border-bottom:1px solid rgba(255,255,255,.07)}
.ext-list li span{font-size:12.5px;line-height:1.35}
.ext-list li em{flex:none;font-family:var(--mono);font-style:normal;font-size:10.5px;
letter-spacing:.06em;text-transform:uppercase;color:rgba(255,255,255,.4)}
.ext-note{font-size:11.5px;line-height:1.45;color:rgba(255,255,255,.5);margin:11px 0 0}
.stmt-min{font-size:11.5px;line-height:1.45;color:#F2B8AE;margin:14px 0 0;
padding:10px 12px;background:rgba(242,184,174,.09);border-left:2px solid rgba(242,184,174,.5);border-radius:2px}
.stmt-foot{font-size:11.5px;line-height:1.45;color:rgba(255,255,255,.45);margin:16px 0 0}

/* ---- gated state: the verdict is given away, the money is not ---- */
.lockbox{padding:18px 0 2px}
.lock-kicker{display:block;font-family:var(--mono);font-size:10px;letter-spacing:.14em;
text-transform:uppercase;color:rgba(255,255,255,.45);margin-bottom:8px}
.lock-answer{font-size:16px;line-height:1.35;margin:0 0 12px;color:#F1F3F0;font-weight:400}
.lock-answer b{font-weight:600}
.lock-counts{list-style:none;margin:0;padding:0;display:flex;flex-wrap:wrap;gap:6px}
.lock-counts li{font-size:11.5px;color:rgba(255,255,255,.7);background:rgba(255,255,255,.08);
padding:4px 9px;border-radius:2px}
.lock-counts b{font-family:var(--mono);color:#fff}
.lock-rows{margin:20px 0 16px;display:flex;flex-direction:column;gap:11px}
.lock-row{display:flex;align-items:center;justify-content:space-between;gap:14px}
.lock-bar,.lock-chip{height:9px;border-radius:2px;
background:repeating-linear-gradient(115deg,rgba(255,255,255,.14) 0 7px,rgba(255,255,255,.05) 7px 14px)}
.lock-chip{width:52px;flex:none}
.lock-cta{display:flex;gap:9px;font-size:12.5px;line-height:1.5;color:rgba(255,255,255,.72);
margin:0;padding-top:14px;border-top:1px solid rgba(255,255,255,.16)}
.lock-icon{flex:none;font-size:13px;line-height:1.4}

.capture{margin-top:16px;border:1px solid var(--rule);border-radius:3px;padding:18px 16px;background:#fff}
.capture h3{font-size:16px;margin:0 0 5px;font-weight:560}
.capture p{font-size:12.5px;color:var(--ink-2);margin:0 0 13px;line-height:1.45}
.inp{width:100%;padding:9px 11px;border:1px solid var(--rule);border-radius:2px;font-size:13.5px;
font-family:inherit;margin-bottom:7px;background:var(--paper);color:var(--ink)}
.inp-label{display:block;font-size:12px;color:var(--ink-2);margin:6px 0 5px}
.rc .err{font-size:12px;color:var(--clay);margin:4px 0 0}
.cta{width:100%;margin-top:6px;padding:11px;background:var(--ink);color:var(--paper);border:0;
border-radius:2px;font-size:14px;font-weight:500;cursor:pointer}
.cta:disabled{background:var(--rule);color:var(--ink-2);cursor:not-allowed}
.done h3{color:var(--jade)}

@media (max-width:980px){
  .rc{padding:28px 18px 40px}
  .rc-grid{grid-template-columns:1fr;gap:32px}
  .rc-statement{position:static}
}
@media (prefers-reduced-motion:reduce){.rc *{transition:none!important}}
`;
