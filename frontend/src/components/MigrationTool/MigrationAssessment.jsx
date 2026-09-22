import { useEffect, useMemo, useState } from "react";
import { fetchMigrationCatalog, submitMigrationLead } from "../../api/migrationToolApi";
import { assess, fmt } from "../../utils/migrationEngine";

const list = (a) => (a.length === 1 ? a[0] : `${a.slice(0, -1).join(", ")} and ${a[a.length - 1]}`);

export default function MigrationAssessment() {
  const [catalog, setCatalog] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [currency, setCurrency] = useState(null);

  const [source, setSource] = useState("");
  const [version, setVersion] = useState("");
  const [years, setYears] = useState("y5");
  const [users, setUsers] = useState("u75");
  const [full, setFull] = useState(1);
  const [light, setLight] = useState(0);
  const [entities, setEntities] = useState("e1");
  const [countries, setCountries] = useState("c1");
  const [revenue, setRevenue] = useState("r50");
  const [volume, setVolume] = useState("v10");
  const [cx, setCx] = useState(() => new Set());
  const [custom, setCustom] = useState("none");
  const [integrations, setIntegrations] = useState(2);
  const [history, setHistory] = useState("h5");
  const [it, setIt] = useState("small");
  const [golive, setGolive] = useState("g12");
  const [budget, setBudget] = useState("exploring");

  const [lead, setLead] = useState({ name: "", email: "", company: "", phone: "" });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [sendError, setSendError] = useState(null);

  useEffect(() => {
    let alive = true;
    fetchMigrationCatalog()
      .then((data) => {
        if (!alive) return;
        setCatalog(data);
        setCurrency(data.defaultCurrency);
      })
      .catch(() => alive && setLoadError("The assessment could not be loaded. Please refresh and try again."));
    return () => { alive = false; };
  }, []);

  const toggleCx = (id) =>
    setCx((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });

  const input = useMemo(
    () => ({
      source, version, years, users, entities, countries, revenue, volume,
      complexity: [...cx], customisations: custom, integrations, history, it,
      golive, budget, fullUsers: full, lightUsers: light,
    }),
    [source, version, years, users, entities, countries, revenue, volume, cx, custom, integrations, history, it, golive, budget, full, light]
  );

  const p = currency ? catalog?.pricing?.[currency] : null;
  const m = useMemo(() => (catalog ? assess(catalog, p, input) : null), [catalog, p, input]);

  const send = async () => {
    setSending(true);
    setSendError(null);
    try {
      // `source` inside input is the system being left; `channel` tags the lead.
      await submitMigrationLead({ ...input, ...lead, currency, channel: "migration-assessment" });
      setSent(true);
    } catch (err) {
      setSendError(err?.response?.data?.message || catalog?.content?.errors?.submitFailed || "That did not send. Please try again.");
    } finally {
      setSending(false);
    }
  };

  if (loadError) {
    return (
      <div className="mg">
        <style>{CSS}</style>
        <p className="mg-load mg-load-err">{loadError}</p>
      </div>
    );
  }
  if (!catalog || !m) {
    return (
      <div className="mg">
        <style>{CSS}</style>
        <p className="mg-load">Loading the assessment…</p>
      </div>
    );
  }

  const C = catalog.content || {};
  const marker = Math.max(2, Math.min(98, 50 + m.score * 0.55));

  return (
    <div className="mg">
      <style>{CSS}</style>

      <header className="mg-head">
        <div className="mg-eyebrow"><span className="mg-mark" aria-hidden="true" />{C.header?.eyebrow}</div>
        <h1>{C.header?.heading}</h1>
        <p className="mg-dek">{C.header?.dek}</p>
        <div className="mg-currency" role="group" aria-label="Currency">
          {(catalog.currencies || []).map((c) => (
            <button key={c} className={"chip" + (currency === c ? " on" : "")}
              onClick={() => setCurrency(c)} aria-pressed={currency === c}>{c}</button>
          ))}
        </div>
      </header>

      <div className="mg-grid">
        <div className="mg-inputs">
          <section className="block">
            <h2 className="block-title">What you are running today</h2>
            <p className="block-sub">Pick the system your finance team posts to. If you run more than one, pick the one that owns the ledger.</p>
            {(catalog.sources || []).map((g) => (
              <div className="srcgrp" key={g.group}>
                <span className="srcgrp-label">{g.group}</span>
                <div className="srcs">
                  {g.items.map((s) => (
                    <button key={s.id} className={"src" + (source === s.id ? " on" : "")}
                      onClick={() => setSource(s.id)} aria-pressed={source === s.id}>{s.label}</button>
                  ))}
                </div>
              </div>
            ))}
            {source && (
              <div className="field">
                <label className="field-label" htmlFor="ver">Which version or edition?</label>
                <input id="ver" className="inp wide" placeholder="e.g. NAV 2016, GP 2018 R2, ECC 6 EHP7"
                  value={version} onChange={(e) => setVersion(e.target.value)} />
                <span className="field-hint">This decides your lifecycle position, which is often not what people expect.</span>
              </div>
            )}
            <Segs label="How long have you been on it?" value={years} set={setYears} options={catalog.years} />
          </section>

          <section className="block">
            <h2 className="block-title">The shape of the business</h2>
            <Segs label="People who create and post transactions" value={users} set={setUsers} options={catalog.bands.users} />
            <div className="steppers">
              <Stepper label="Full users, exact number" hint="For the licence estimate" value={full} set={setFull} min={1} max={2000} />
              <Stepper label="People who only approve or view" hint="Team Member licences" value={light} set={setLight} min={0} max={2000} />
            </div>
            <Segs label="Legal entities" value={entities} set={setEntities} options={catalog.bands.entities} />
            <Segs label="Countries you operate in" value={countries} set={setCountries} options={catalog.bands.countries} />
            <Segs label="Annual revenue" value={revenue} set={setRevenue} options={catalog.bands.revenue} />
            <Segs label="Transactions a month" value={volume} set={setVolume} options={catalog.bands.volume} />
          </section>

          <section className="block">
            <h2 className="block-title">What the business actually does</h2>
            <p className="block-sub">Tick anything that genuinely applies. Several of these decide the platform on their own.</p>
            <ul className="caps">
              {(catalog.complexity || []).map((c) => {
                const on = cx.has(c.id);
                return (
                  <li key={c.id}>
                    <button className={"cap" + (on ? " on" : "")} onClick={() => toggleCx(c.id)} aria-pressed={on}>
                      <span className="cap-box" aria-hidden="true">{on ? "✓" : ""}</span>
                      <span className="cap-text">
                        <span className="cap-label">{c.label}</span>
                        <span className="cap-note">{c.note}</span>
                      </span>
                      <span className={"tag " + (c.w >= 15 ? "tag-fo" : c.w > 0 ? "tag-mid" : "tag-prem")}>
                        {c.w >= 15 ? "Decides it" : c.w > 0 ? "Weighs in" : "Premium"}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="block">
            <h2 className="block-title">What the move involves</h2>
            <Segs label="Customisations in the current system" value={custom} set={setCustom} options={catalog.customisations} />
            <div className="steppers">
              <Stepper label="Systems that connect to it" hint="Banking, EDI, web store, CRM, payroll, BI"
                value={integrations} set={setIntegrations} min={0} max={30} />
            </div>
            <Segs label="History you need to bring across" value={history} set={setHistory} options={catalog.history} />
            <Segs label="Internal IT capability" value={it} set={setIt} options={catalog.it} />
          </section>

          <section className="block">
            <h2 className="block-title">Timing</h2>
            <Segs label="When do you need to be live?" value={golive} set={setGolive} options={catalog.golive} />
            <Segs label="Is there a budget?" value={budget} set={setBudget} options={catalog.budget} />
          </section>
        </div>

        {/* ------------------------------ VERDICT ------------------------------ */}
        <aside className="mg-verdict">
          <div className="vd">
            <span className="vd-kicker">Where you land</span>
            <h2 className={"vd-name " + (m.platform === "fo" ? "is-fo" : m.platform === "overlap" ? "is-mid" : "is-bc")}>
              {m.verdict}
            </h2>

            <div className="bar" role="img" aria-label={`Routing: ${m.verdict}`}>
              <div className="bar-track">
                <span className="bar-zone" />
                <span className="bar-pin" style={{ left: `${marker}%` }} />
              </div>
              <div className="bar-ends"><span>Business Central</span><span>Finance &amp; Ops</span></div>
            </div>

            {m.sourcePath && <p className="vd-path">{m.sourcePath}</p>}

            <div className="ev">
              <div className="ev-col">
                <span className="ev-head bc">Points to Business Central</span>
                {m.forBC.length === 0 && <span className="ev-none">Nothing yet</span>}
                {m.forBC.map((e, i) => (
                  <span className="ev-row" key={i}>{e.label}{!e.neutral && <em>{e.w}</em>}</span>
                ))}
              </div>
              <div className="ev-col">
                <span className="ev-head fo">Points to Finance &amp; Ops</span>
                {m.forFO.length === 0 && <span className="ev-none">Nothing yet</span>}
                {m.forFO.map((e, i) => (
                  <span className="ev-row" key={i}>{e.label}<em>{e.w}</em></span>
                ))}
              </div>
            </div>

            <div className="vd-metrics">
              <div className="met">
                <span>Migration complexity</span>
                <b>{m.complexity}<i>/100</i></b>
              </div>
              <div className="met">
                <span>Realistic duration</span>
                <b>{m.minMonths}–{m.maxMonths}<i>months</i></b>
              </div>
              <div className="met">
                <span>Indicative licences</span>
                <b>{m.licence ? `${m.licence.symbol}${fmt(m.licence.annual)}` : "—"}<i>a year</i></b>
              </div>
            </div>

            {m.complexityDrivers.length > 0 && (
              <p className="vd-note">Complexity is driven by {list(m.complexityDrivers)}.</p>
            )}
            {m.licence && (
              <p className="vd-foot">
                Licence subscription only, at {m.licence.billedFull} full users on {m.licence.symbol}
                {fmt(m.licence.seat)} a month. Implementation, data migration and support are separate.
                {m.licence.trusted
                  ? ` List prices verified ${m.licence.verified}.`
                  : " Prices in this currency are placeholders pending verification."}
              </p>
            )}
          </div>

          {m.risks.length > 0 && (
            <div className="flags">
              {m.risks.map((f, i) => (
                <div className={"flag f-" + f.kind} key={i}>
                  <span className="flag-title">{f.title}</span>
                  <span className="flag-body">{f.body}</span>
                </div>
              ))}
            </div>
          )}

          <div className="capture">
            {!sent ? (
              <>
                <h3>{C.form?.heading}</h3>
                <p>{C.form?.body}</p>
                <input className="inp" placeholder={C.form?.namePlaceholder || "Full name"}
                  value={lead.name} onChange={(e) => setLead({ ...lead, name: e.target.value })} />
                <input className="inp" placeholder={C.form?.emailPlaceholder || "Work email"}
                  value={lead.email} onChange={(e) => setLead({ ...lead, email: e.target.value })} />
                <input className="inp" placeholder={C.form?.companyPlaceholder || "Company"}
                  value={lead.company} onChange={(e) => setLead({ ...lead, company: e.target.value })} />
                <input className="inp" placeholder={C.form?.phonePlaceholder || "Phone (optional)"}
                  value={lead.phone} onChange={(e) => setLead({ ...lead, phone: e.target.value })} />
                <button className="cta" onClick={send} disabled={sending || !lead.name || !lead.email || !source}>
                  {sending ? C.form?.sendingLabel || "Sending…" : C.form?.ctaLabel || "Send me the report"}
                </button>
                {!source && <span className="field-hint">{C.form?.sourceHint}</span>}
                {sendError && <span className="field-err">{sendError}</span>}
              </>
            ) : (
              <div className="done">
                <h3>{C.success?.heading}</h3>
                <p>{C.success?.body}</p>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

function Segs({ label, value, set, options }) {
  return (
    <div className="field">
      <span className="field-label">{label}</span>
      <div className="segs">
        {(options || []).map((o) => (
          <button key={o.id} className={"seg" + (value === o.id ? " on" : "")}
          id={o.id}
            onClick={() => set(o.id)} aria-pressed={value === o.id}>{o.label}</button>
        ))}
      </div>
    </div>
  );
}

function Stepper({ label, hint, value, set, min = 0, max = 999 }) {
  return (
    <div className="stp">
      <div className="stp-text">
        <span className="stp-label">{label}</span>
        {hint && <span className="stp-hint">{hint}</span>}
      </div>
      <div className="stp-ctl">
        <button onClick={() => set(Math.max(min, value - 1))} aria-label={`Decrease ${label}`}>−</button>
        <input type="number" value={value} min={min} max={max} aria-label={label}
          onChange={(e) => set(Math.min(max, Math.max(min, Number(e.target.value) || 0)))} />
        <button onClick={() => set(Math.min(max, value + 1))} aria-label={`Increase ${label}`}>+</button>
      </div>
    </div>
  );
}

const CSS = `
.mg{--paper:#FBFBF8;--ink:#0F1720;--ink-2:#3D4854;--rule:#DFE1DA;--rule-2:#EDEEE9;
--blue:#0B5FA5;--blue-soft:#E8F0F7;--clay:#A32A1F;--clay-soft:#F8ECEA;--jade:#0E6E4F;--jade-soft:#E9F2EE;
--amber:#8A5A0B;--amber-soft:#FAF1E1;
--mono:"IBM Plex Mono","SF Mono",ui-monospace,Menlo,monospace;
--sans:"Inter",ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;
background:var(--paper);color:var(--ink);font-family:var(--sans);font-size:15px;line-height:1.5;
min-height:100vh;padding:40px 28px 72px;-webkit-font-smoothing:antialiased}
.mg *{box-sizing:border-box}
.mg button{font-family:inherit}
.mg :focus-visible{outline:2px solid var(--blue);outline-offset:2px}
.mg-load{max-width:1220px;margin:60px auto;color:var(--ink-2);text-align:center}
.mg-load-err{color:var(--clay)}

.mg-head{max-width:1220px;margin:0 auto 34px}
.mg-eyebrow{display:flex;align-items:center;gap:9px;font-family:var(--mono);font-size:11px;
letter-spacing:.14em;text-transform:uppercase;color:var(--ink-2)}
.mg-mark{width:9px;height:9px;background:var(--blue)}
.mg-head h1{font-size:clamp(28px,4vw,44px);line-height:1.05;letter-spacing:-.024em;font-weight:640;
margin:16px 0 10px;max-width:19ch}
.mg-dek{color:var(--ink-2);max-width:60ch;margin:0}
.mg-currency{display:flex;gap:6px;margin-top:20px}
.chip{font-family:var(--mono);font-size:11.5px;letter-spacing:.06em;padding:6px 12px;border:1px solid var(--rule);
background:transparent;color:var(--ink-2);cursor:pointer;border-radius:2px}
.chip.on{background:var(--ink);color:var(--paper);border-color:var(--ink)}

.mg-grid{max-width:1220px;margin:0 auto;display:grid;grid-template-columns:minmax(0,1fr) 420px;gap:52px;align-items:start}
.block{border-top:1px solid var(--ink);padding-top:14px;margin-bottom:34px}
.block-title{font-family:var(--mono);font-size:11px;letter-spacing:.13em;text-transform:uppercase;font-weight:500;margin:0 0 4px}
.block-sub{color:var(--ink-2);font-size:13.5px;margin:0 0 14px;max-width:56ch}

.srcgrp{margin-bottom:14px}
.srcgrp-label{display:block;font-family:var(--mono);font-size:10px;letter-spacing:.11em;
text-transform:uppercase;color:var(--ink-2);margin-bottom:7px}
.srcs{display:flex;flex-wrap:wrap;gap:6px}
.src{font-size:13px;padding:8px 13px;border:1px solid var(--rule);background:#fff;cursor:pointer;
border-radius:2px;color:var(--ink);text-align:left}
.src:hover{border-color:var(--blue);color:var(--blue)}
.src.on{background:var(--ink);border-color:var(--ink);color:var(--paper)}

.field{margin-top:18px}
.field-label{display:block;font-size:14px;margin-bottom:8px}
.field-hint{display:block;font-size:12px;color:var(--ink-2);margin-top:6px}
.field-err{display:block;font-size:12px;color:var(--clay);margin-top:6px}
.segs{display:flex;flex-wrap:wrap;gap:6px}
.seg{font-size:13px;padding:7px 13px;border:1px solid var(--rule);background:#fff;cursor:pointer;
border-radius:2px;color:var(--ink-2)}
.seg.on{background:var(--ink);border-color:var(--ink);color:var(--paper)}

.caps{list-style:none;margin:10px 0 0;padding:0}
.caps li+li{border-top:1px solid var(--rule-2)}
.cap{display:flex;align-items:flex-start;gap:14px;width:100%;text-align:left;background:none;border:0;padding:13px 4px;cursor:pointer}
.cap:hover .cap-label{color:var(--blue)}
.cap-box{flex:none;width:17px;height:17px;border:1px solid var(--ink-2);margin-top:2px;display:grid;
place-items:center;font-size:11px;color:transparent;border-radius:2px}
.cap.on .cap-box{background:var(--ink);border-color:var(--ink);color:var(--paper)}
.cap-text{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}
.cap-label{font-size:14.5px;font-weight:500}
.cap-note{font-size:12.5px;color:var(--ink-2)}
.tag{flex:none;font-family:var(--mono);font-size:10px;letter-spacing:.07em;text-transform:uppercase;
padding:3px 7px;border-radius:2px;margin-top:1px}
.tag-fo{background:var(--clay-soft);color:var(--clay)}
.tag-mid{background:var(--amber-soft);color:var(--amber)}
.tag-prem{background:var(--blue-soft);color:var(--blue)}

.steppers{margin-top:14px}
.stp{display:flex;align-items:center;justify-content:space-between;gap:20px;padding:12px 4px}
.stp+.stp{border-top:1px solid var(--rule-2)}
.stp-text{display:flex;flex-direction:column;gap:2px;min-width:0}
.stp-label{font-size:14px}
.stp-hint{font-family:var(--mono);font-size:10.5px;letter-spacing:.07em;text-transform:uppercase;color:var(--ink-2)}
.stp-ctl{flex:none;display:flex;align-items:center;border:1px solid var(--rule);border-radius:2px;background:#fff}
.stp-ctl button{width:32px;height:32px;border:0;background:none;cursor:pointer;font-size:16px;color:var(--ink-2)}
.stp-ctl button:hover{color:var(--blue)}
.stp-ctl input{width:56px;height:32px;border:0;border-left:1px solid var(--rule);border-right:1px solid var(--rule);
text-align:center;font-family:var(--mono);font-size:14px;background:none;color:var(--ink);-moz-appearance:textfield}
.stp-ctl input::-webkit-outer-spin-button,.stp-ctl input::-webkit-inner-spin-button{-webkit-appearance:none;margin:0}

.mg-verdict{position:sticky;top:24px}
.vd{background:var(--ink);color:#F1F3F0;padding:22px 22px 18px;border-radius:3px}
.vd-kicker{display:block;font-family:var(--mono);font-size:10.5px;letter-spacing:.15em;
text-transform:uppercase;color:rgba(255,255,255,.5)}
.vd-name{font-size:21px;line-height:1.15;font-weight:580;letter-spacing:-.015em;margin:7px 0 0}
.vd-name.is-fo{color:#F2B8AE}
.vd-name.is-mid{color:#F0CE93}
.vd-name.is-bc{color:#A8D8F0}

.bar{margin:18px 0 4px}
.bar-track{position:relative;height:4px;background:rgba(255,255,255,.16);border-radius:2px}
.bar-zone{position:absolute;left:41%;width:18%;top:-3px;bottom:-3px;background:rgba(240,206,147,.28);border-radius:2px}
.bar-pin{position:absolute;top:-6px;width:3px;height:16px;background:#fff;transform:translateX(-50%);
transition:left .28s cubic-bezier(.4,0,.2,1)}
.bar-ends{display:flex;justify-content:space-between;margin-top:9px;font-family:var(--mono);
font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:rgba(255,255,255,.45)}

.vd-path{font-size:12.5px;line-height:1.5;color:rgba(255,255,255,.72);margin:14px 0 0;
padding-top:14px;border-top:1px solid rgba(255,255,255,.14)}

.ev{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:16px;padding-top:14px;
border-top:1px solid rgba(255,255,255,.14)}
.ev-col{display:flex;flex-direction:column;gap:5px;min-width:0}
.ev-head{font-family:var(--mono);font-size:9.5px;letter-spacing:.1em;text-transform:uppercase;margin-bottom:2px}
.ev-head.bc{color:#A8D8F0}
.ev-head.fo{color:#F2B8AE}
.ev-row{display:flex;justify-content:space-between;gap:8px;align-items:baseline;font-size:11.5px;
line-height:1.35;color:rgba(255,255,255,.8)}
.ev-row em{flex:none;font-style:normal;font-family:var(--mono);font-size:10px;color:rgba(255,255,255,.4)}
.ev-none{font-size:11.5px;color:rgba(255,255,255,.35)}

.vd-metrics{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:18px;padding-top:14px;
border-top:1px solid rgba(255,255,255,.3)}
.met{display:flex;flex-direction:column;gap:3px;min-width:0}
.met span{font-size:10.5px;color:rgba(255,255,255,.55);line-height:1.25}
.met b{font-family:var(--mono);font-size:19px;font-weight:500;letter-spacing:-.02em;font-variant-numeric:tabular-nums;
display:flex;align-items:baseline;gap:3px;flex-wrap:wrap}
.met b i{font-style:normal;font-size:9.5px;color:rgba(255,255,255,.45);letter-spacing:.04em}
.vd-note{font-size:12px;line-height:1.5;color:rgba(255,255,255,.62);margin:14px 0 0}
.vd-foot{font-size:11px;line-height:1.45;color:rgba(255,255,255,.42);margin:10px 0 0}

.flags{margin-top:14px;display:flex;flex-direction:column;gap:8px}
.flag{padding:13px 14px;border-radius:3px;border-left:2px solid}
.flag-title{display:block;font-size:13px;font-weight:560;margin-bottom:4px}
.flag-body{display:block;font-size:12.5px;line-height:1.5;color:var(--ink-2)}
.f-cost{background:var(--clay-soft);border-color:var(--clay)}
.f-cost .flag-title{color:var(--clay)}
.f-eol{background:var(--amber-soft);border-color:var(--amber)}
.f-eol .flag-title{color:var(--amber)}
.f-prompt{background:var(--blue-soft);border-color:var(--blue)}
.f-prompt .flag-title{color:var(--blue)}

.capture{margin-top:16px;border:1px solid var(--rule);border-radius:3px;padding:18px 16px;background:#fff}
.capture h3{font-size:16px;margin:0 0 5px;font-weight:560}
.capture p{font-size:12.5px;color:var(--ink-2);margin:0 0 13px;line-height:1.45}
.inp{width:100%;padding:9px 11px;border:1px solid var(--rule);border-radius:2px;font-size:13.5px;
font-family:inherit;margin-bottom:7px;background:var(--paper);color:var(--ink)}
.inp.wide{background:#fff}
.cta{width:100%;margin-top:6px;padding:11px;background:var(--ink);color:var(--paper);border:0;
border-radius:2px;font-size:14px;font-weight:500;cursor:pointer}
.cta:disabled{background:var(--rule);color:var(--ink-2);cursor:not-allowed}
.done h3{color:var(--jade)}

@media (max-width:1040px){
  .mg{padding:28px 18px 40px}
  .mg-grid{grid-template-columns:1fr;gap:32px}
  .mg-verdict{position:static}
}
@media (prefers-reduced-motion:reduce){.mg *{transition:none!important}}
`;
