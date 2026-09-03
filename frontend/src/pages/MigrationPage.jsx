import { useState, useRef, useCallback } from "react";
import {
  Upload, Database, CheckCircle2, AlertCircle, Loader2,
  FileText, Image, Users, BookOpen, Layout, X, ChevronRight,
  BarChart2, Download, RefreshCw
} from "lucide-react";
import { API_BASE } from "../api/client";
import { getAccessToken } from "../api/tokenStore";
 
const STAGE_META = {
  categories: { icon: BarChart2, label: "Categories", color: "#6366f1" },
  users:      { icon: Users,    label: "Users",       color: "#0ea5e9" },
  media:      { icon: Image,    label: "Media",       color: "#f59e0b" },
  pages:      { icon: Layout,   label: "Pages",       color: "#10b981" },
  blogs:      { icon: BookOpen, label: "Blog Posts",  color: "#f43f5e" },
};

// ─── Progress bar ────────────────────────────────────────────────────────────
function ProgressBar({ done, total, color }) {
  const pct = total ? Math.round((done / total) * 100) : 0;
  return (
    <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-paper-line">
      <div
        className="absolute left-0 top-0 h-full rounded-full transition-all duration-300"
        style={{ width: `${pct}%`, background: color }}
      />
    </div>
  );
}

// ─── Stage card ─────────────────────────────────────────────────────────────
function StageCard({ name, data }) {
  const meta = STAGE_META[name];
  if (!meta || !data) return null;
  const Icon = meta.icon;
  const done = data.done >= data.total && data.total > 0;

  return (
    <div className={`rounded-xl border bg-paper p-4 transition-all duration-300 ${done ? "border-signal/40" : "border-paper-line"}`}>
      <div className="flex items-center gap-2.5 mb-3">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ background: `${meta.color}22` }}>
          <Icon size={14} style={{ color: meta.color }} />
        </div>
        <span className="text-sm font-medium text-ink">{meta.label}</span>
        {done && <CheckCircle2 size={13} className="ml-auto text-signal" />}
        <span className="ml-auto text-xs font-mono text-muted">{data.done}/{data.total}</span>
      </div>
      <ProgressBar done={data.done} total={data.total} color={meta.color} />
      {data.current && (
        <p className="mt-1.5 truncate text-xs text-muted">{data.current}</p>
      )}
    </div>
  );
}

// ─── Log viewer ──────────────────────────────────────────────────────────────
function LogViewer({ logs }) {
  const endRef = useRef(null);
  const prevLen = useRef(0);

  if (logs.length !== prevLen.current) {
    prevLen.current = logs.length;
    setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  }

  return (
    <div className="h-44 overflow-y-auto rounded-xl bg-ink/90 p-3 font-mono text-xs leading-relaxed">
      {logs.map((l, i) => (
        <div
          key={i}
          className={`${
            l.type === "error" ? "text-red-400" :
            l.type === "done"  ? "text-green-400" :
            "text-gray-300"
          }`}
        >
          <span className="text-gray-500 select-none">[{l.time}] </span>
          {l.msg}
        </div>
      ))}
      <div ref={endRef} />
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function MigrationPage() {
  const [activeTab, setActiveTab] = useState("migration"); // "migration" | "backup"

  // ─── Tab 1: SQL Migration States ──────────────────────────────────────────
  const [sqlFile, setSqlFile] = useState(null);
  const [sqlDragging, setSqlDragging] = useState(false);
  const [sqlRunning, setSqlRunning] = useState(false);
  const [sqlStages, setSqlStages] = useState({});
  const [sqlLogs, setSqlLogs] = useState([]);
  const [sqlStatus, setSqlStatus] = useState(null); // null | "running" | "done" | "error"
  const [sqlStats, setSqlStats] = useState(null);
  const sqlFileInputRef = useRef(null);

  // ─── Tab 2: MongoDB Backup/Restore States ──────────────────────────────────
  const [backupFile, setBackupFile] = useState(null);
  const [backupDragging, setBackupDragging] = useState(false);
  const [backupRunning, setBackupRunning] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [backupStatus, setBackupStatus] = useState(null); // null | "running" | "done" | "error"
  const [backupStats, setBackupStats] = useState(null);
  const [backupError, setBackupError] = useState("");
  const backupFileInputRef = useRef(null);

  // ─── SQL Log Logger ───────────────────────────────────────────────────────
  const addSqlLog = useCallback((type, msg) => {
    const time = new Date().toLocaleTimeString("en-IN", { hour12: false });
    setSqlLogs(prev => [...prev, { type, msg, time }]);
  }, []);

  // ─── SQL Drag handlers ─────────────────────────────────────────────────────
  const handleSqlFileDrop = useCallback((e) => {
    e.preventDefault();
    setSqlDragging(false);
    const f = e.dataTransfer?.files?.[0] || e.target?.files?.[0];
    if (f && f.name.endsWith(".sql")) setSqlFile(f);
  }, []);

  const clearSqlFile = () => { setSqlFile(null); sqlFileInputRef.current && (sqlFileInputRef.current.value = ""); };

  const handleSqlMigrate = async () => {
    if (!sqlFile) return;
    setSqlRunning(true);
    setSqlStatus("running");
    setSqlStages({});
    setSqlLogs([]);
    setSqlStats(null);
    addSqlLog("info", `Starting migration: ${sqlFile.name} (${(sqlFile.size / 1024 / 1024).toFixed(2)} MB)`);

    const formData = new FormData();
    formData.append("sqlFile", sqlFile);

    try {
      const token = getAccessToken();
      const response = await fetch(`${API_BASE}/migrate`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
        credentials: "include",
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ message: "Upload failed" }));
        throw new Error(err.message);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split("\n\n");
        buffer = lines.pop();

        for (const line of lines) {
          if (!line.startsWith("data:")) continue;
          const raw = line.replace(/^data:\s*/, "");
          let evt;
          try { evt = JSON.parse(raw); } catch { continue; }

          if (evt.type === "log") {
            addSqlLog("info", evt.msg);
          } else if (evt.type === "stage") {
            setSqlStages(prev => ({
              ...prev,
              [evt.stage]: { total: evt.total, done: evt.done, current: evt.current }
            }));
          } else if (evt.type === "done") {
            addSqlLog("done", evt.msg);
            setSqlStats(evt.stats);
            setSqlStatus("done");
          } else if (evt.type === "error") {
            addSqlLog("error", evt.msg);
            setSqlStatus("error");
          }
        }
      }
    } catch (err) {
      addSqlLog("error", err.message || "Migration failed");
      setSqlStatus("error");
    } finally {
      setSqlRunning(false);
    }
  };

  const resetSql = () => {
    setSqlFile(null);
    setSqlStages({});
    setSqlLogs([]);
    setSqlStatus(null);
    setSqlStats(null);
    if (sqlFileInputRef.current) sqlFileInputRef.current.value = "";
  };

  // ─── MongoDB Backup Export (Download JSON) ─────────────────────────────────
  const handleExportBackup = async () => {
    setExporting(true);
    try {
      const token = getAccessToken();
      const response = await fetch(`${API_BASE}/backup/export`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) throw new Error("Export failed");
      
      const blob = await response.blob();
      const disposition = response.headers.get("content-disposition");
      let filename = `mongodb_backup_${new Date().toISOString().slice(0,10)}.json`;
      if (disposition && disposition.indexOf("attachment") !== -1) {
        const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
        const matches = filenameRegex.exec(disposition);
        if (matches != null && matches[1]) filename = matches[1].replace(/['"]/g, '');
      }
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      alert("Failed to export backup: " + err.message);
    } finally {
      setExporting(false);
    }
  };

  // ─── MongoDB Backup Restore (Import JSON) ──────────────────────────────────
  const handleBackupFileDrop = useCallback((e) => {
    e.preventDefault();
    setBackupDragging(false);
    const f = e.dataTransfer?.files?.[0] || e.target?.files?.[0];
    if (f && f.name.endsWith(".json")) setBackupFile(f);
  }, []);

  const clearBackupFile = () => { setBackupFile(null); backupFileInputRef.current && (backupFileInputRef.current.value = ""); };

  const handleRestoreBackup = async () => {
    if (!backupFile) return;
    setBackupRunning(true);
    setBackupStatus("running");
    setBackupError("");
    setBackupStats(null);

    const formData = new FormData();
    formData.append("backupFile", backupFile);

    try {
      const token = getAccessToken();
      const response = await fetch(`${API_BASE}/backup/import`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
        credentials: "include",
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Restore process failed");

      setBackupStats(data.stats);
      setBackupStatus("done");
    } catch (err) {
      setBackupError(err.message || "Failed to restore backup.");
      setBackupStatus("error");
    } finally {
      setBackupRunning(false);
    }
  };

  const resetBackup = () => {
    setBackupFile(null);
    setBackupStatus(null);
    setBackupStats(null);
    setBackupError("");
    if (backupFileInputRef.current) backupFileInputRef.current.value = "";
  };

  return (
    <div className="flex h-screen flex-1 flex-col overflow-hidden bg-paper">
      {/* Header */}
      <header className="border-b border-paper-line bg-paper-card px-8 pt-5 pb-0">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-signal/10">
            <Database size={18} className="text-signal" />
          </div>
          <div>
            <h1 className="font-display text-xl font-semibold text-ink">Database Administration</h1>
            <p className="text-xs text-muted">Manage system data imports, MongoDB backups, and recoveries</p>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex gap-4 border-b border-paper-line">
          <button
            onClick={() => setActiveTab("migration")}
            className={`border-b-2 px-3 py-2 text-xs font-semibold uppercase tracking-wider transition-colors ${
              activeTab === "migration"
                ? "border-signal text-signal"
                : "border-transparent text-muted hover:text-ink"
            }`}
          >
            Import Laravel SQL
          </button>
          <button
            onClick={() => setActiveTab("backup")}
            className={`border-b-2 px-3 py-2 text-xs font-semibold uppercase tracking-wider transition-colors ${
              activeTab === "backup"
                ? "border-signal text-signal"
                : "border-transparent text-muted hover:text-ink"
            }`}
          >
            MongoDB Backup &amp; Restore
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl space-y-6 px-8 py-8">

          {/* TAB 1: LARAVEL SQL MIGRATION */}
          {activeTab === "migration" && (
            <div className="space-y-6">
              {/* Upload zone */}
              <div
                className={`relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-10 text-center transition-all cursor-pointer
                  ${sqlDragging ? "border-signal bg-signal/5 scale-[1.01]" : "border-paper-line bg-paper-card hover:border-signal/50 hover:bg-signal/5"}
                  ${sqlRunning ? "pointer-events-none opacity-60" : ""}
                `}
                onDragOver={(e) => { e.preventDefault(); setSqlDragging(true); }}
                onDragLeave={() => setSqlDragging(false)}
                onDrop={handleSqlFileDrop}
                onClick={() => !sqlFile && sqlFileInputRef.current?.click()}
              >
                <input
                  ref={sqlFileInputRef}
                  type="file"
                  accept=".sql"
                  className="hidden"
                  onChange={handleSqlFileDrop}
                />

                {sqlFile ? (
                  <div className="flex items-center gap-3 w-full justify-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-signal/10">
                      <FileText size={22} className="text-signal" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium text-ink text-sm">{sqlFile.name}</p>
                      <p className="text-xs text-muted">{(sqlFile.size / 1024 / 1024).toFixed(2)} MB — ready to migrate</p>
                    </div>
                    {!sqlRunning && (
                      <button
                        onClick={(e) => { e.stopPropagation(); clearSqlFile(); }}
                        className="ml-auto flex h-7 w-7 items-center justify-center rounded-full hover:bg-danger/10 text-muted hover:text-danger transition-colors"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-paper-line mb-4">
                      <Upload size={24} className="text-muted" />
                    </div>
                    <p className="text-sm font-medium text-ink">Drop your Laravel <code className="rounded bg-paper-line px-1.5 py-0.5 text-signal">.sql</code> file here</p>
                    <p className="mt-1 text-xs text-muted">or click to browse — max 100 MB</p>
                  </>
                )}
              </div>

              {/* Warning */}
              {sqlFile && !sqlRunning && sqlStatus !== "done" && (
                <div className="flex gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
                  <AlertCircle size={16} className="mt-0.5 shrink-0 text-amber-500" />
                  <div className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
                    <strong>Warning:</strong> This will <strong>clear all existing</strong> blogs, categories, users, media, and pages before importing. Make sure you have a backup.
                  </div>
                </div>
              )}

              {/* Migrate button */}
              {sqlFile && sqlStatus !== "done" && (
                <button
                  onClick={handleSqlMigrate}
                  disabled={sqlRunning || !sqlFile}
                  className="btn-primary w-full justify-center text-sm disabled:opacity-60"
                >
                  {sqlRunning ? (
                    <><Loader2 size={16} className="animate-spin" /> Migrating — please wait…</>
                  ) : (
                    <><Database size={16} /> Start SQL Migration <ChevronRight size={14} /></>
                  )}
                </button>
              )}

              {/* Stage progress cards */}
              {Object.keys(sqlStages).length > 0 && (
                <div>
                  <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted">Progress</h2>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {Object.entries(sqlStages).map(([name, data]) => (
                      <StageCard key={name} name={name} data={data} />
                    ))}
                  </div>
                </div>
              )}

              {/* Log output */}
              {sqlLogs.length > 0 && (
                <div>
                  <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted">Log</h2>
                  <LogViewer logs={sqlLogs} />
                </div>
              )}

              {/* Done summary */}
              {sqlStatus === "done" && sqlStats && (
                <div className="rounded-2xl border border-signal/40 bg-signal/5 p-6 space-y-4">
                  <div className="flex items-center gap-2 text-signal">
                    <CheckCircle2 size={20} />
                    <h2 className="font-display text-lg font-semibold">Migration Successful!</h2>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: "Categories", value: sqlStats.categories, icon: BarChart2, color: "#6366f1" },
                      { label: "Users", value: sqlStats.users, icon: Users, color: "#0ea5e9" },
                      { label: "Media", value: sqlStats.media, icon: Image, color: "#f59e0b" },
                      { label: "Pages", value: sqlStats.pages, icon: Layout, color: "#10b981" },
                      { label: "Blogs Imported", value: sqlStats.blogsImported, icon: BookOpen, color: "#f43f5e" },
                      { label: "Blogs Skipped", value: sqlStats.blogsSkipped, icon: BookOpen, color: "#94a3b8" },
                    ].map(({ label, value, icon: Icon, color }) => (
                      <div key={label} className="rounded-xl bg-paper-card border border-paper-line p-3 text-center">
                        <Icon size={16} className="mx-auto mb-1" style={{ color }} />
                        <p className="text-xl font-bold text-ink">{value}</p>
                        <p className="text-xs text-muted">{label}</p>
                      </div>
                    ))}
                  </div>
                  <button onClick={resetSql} className="btn-secondary w-full justify-center text-sm">
                    Migrate another file
                  </button>
                </div>
              )}

              {/* Error state */}
              {sqlStatus === "error" && (
                <div className="flex items-start gap-3 rounded-xl border border-danger/30 bg-danger/10 p-4">
                  <AlertCircle size={16} className="mt-0.5 shrink-0 text-danger" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-danger">Migration failed</p>
                    <p className="text-xs text-muted mt-0.5">Check the log above for details.</p>
                  </div>
                  <button onClick={resetSql} className="text-xs text-muted underline hover:text-ink">Reset</button>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: MONGODB BACKUP & RESTORE */}
          {activeTab === "backup" && (
            <div className="space-y-6">
              {/* BACKUP EXPORT PANEL */}
              <div className="rounded-2xl border border-paper-line bg-paper-card p-6 space-y-4">
                <div className="flex items-start gap-3.5">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-signal/10 text-signal">
                    <Download size={20} />
                  </div>
                  <div>
                    <h3 className="font-display text-base font-semibold text-ink">Export Database Backup</h3>
                    <p className="text-xs text-muted mt-0.5 leading-relaxed">
                      Download a complete backup of all tables (Roles, Users, Categories, Pages, Blogs, and Media) in a single JSON file. You can restore this file at any time.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={exporting}
                  onClick={handleExportBackup}
                  className="btn-primary w-full justify-center text-xs py-2.5"
                >
                  {exporting ? (
                    <><Loader2 size={14} className="animate-spin" /> Exporting backup JSON…</>
                  ) : (
                    <><Download size={14} /> Download MongoDB Backup JSON</>
                  )}
                </button>
              </div>

              {/* RESTORE IMPORT PANEL */}
              {backupStatus !== "done" ? (
                <div className="rounded-2xl border border-paper-line bg-paper-card p-6 space-y-4">
                  <div className="flex items-start gap-3.5">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-signal/10 text-signal">
                      <RefreshCw size={20} />
                    </div>
                    <div>
                      <h3 className="font-display text-base font-semibold text-ink">Restore Database Backup</h3>
                      <p className="text-xs text-muted mt-0.5 leading-relaxed">
                        Restore your system from a previously exported MongoDB backup JSON file.
                      </p>
                    </div>
                  </div>

                  {/* Drop zone */}
                  <div
                    className={`relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 text-center transition-all cursor-pointer
                      ${backupDragging ? "border-signal bg-signal/5 scale-[1.01]" : "border-paper-line bg-paper hover:border-signal/50 hover:bg-signal/5"}
                      ${backupRunning ? "pointer-events-none opacity-60" : ""}
                    `}
                    onDragOver={(e) => { e.preventDefault(); setBackupDragging(true); }}
                    onDragLeave={() => setBackupDragging(false)}
                    onDrop={handleBackupFileDrop}
                    onClick={() => !backupFile && backupFileInputRef.current?.click()}
                  >
                    <input
                      ref={backupFileInputRef}
                      type="file"
                      accept=".json"
                      className="hidden"
                      onChange={handleBackupFileDrop}
                    />

                    {backupFile ? (
                      <div className="flex items-center gap-3 w-full justify-center">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-signal/10 text-signal">
                          <FileText size={18} />
                        </div>
                        <div className="text-left">
                          <p className="font-medium text-ink text-xs">{backupFile.name}</p>
                          <p className="text-[10px] text-muted">{(backupFile.size / 1024 / 1024).toFixed(2)} MB — ready to restore</p>
                        </div>
                        {!backupRunning && (
                          <button
                            onClick={(e) => { e.stopPropagation(); clearBackupFile(); }}
                            className="ml-auto flex h-6 w-6 items-center justify-center rounded-full hover:bg-danger/10 text-muted hover:text-danger transition-colors"
                          >
                            <X size={12} />
                          </button>
                        )}
                      </div>
                    ) : (
                      <>
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-paper-line mb-3 text-muted">
                          <Upload size={18} />
                        </div>
                        <p className="text-xs font-semibold text-ink">Drop your backup <code className="rounded bg-paper-line px-1 py-0.5 text-signal">.json</code> here</p>
                        <p className="mt-0.5 text-[10px] text-muted">or click to browse — max 50 MB</p>
                      </>
                    )}
                  </div>

                  {/* Warning */}
                  {backupFile && !backupRunning && (
                    <div className="flex gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4">
                      <AlertCircle size={16} className="mt-0.5 shrink-0 text-red-500" />
                      <div className="text-xs text-red-700 dark:text-red-300 leading-relaxed">
                        <strong>Critical Warning:</strong> This will <strong>permanently overwrite</strong> all current database collections. Make sure you are restoring a valid backup file.
                      </div>
                    </div>
                  )}

                  {/* Restore button */}
                  {backupFile && (
                    <button
                      onClick={handleRestoreBackup}
                      disabled={backupRunning || !backupFile}
                      className="btn-danger w-full justify-center text-xs py-2.5 disabled:opacity-60"
                    >
                      {backupRunning ? (
                        <><Loader2 size={14} className="animate-spin" /> Restoring backup — please wait…</>
                      ) : (
                        <><RefreshCw size={14} /> Start Recovery Process</>
                      )}
                    </button>
                  )}

                  {/* Error state */}
                  {backupStatus === "error" && (
                    <div className="flex items-start gap-3 rounded-xl border border-danger/30 bg-danger/10 p-4 text-xs">
                      <AlertCircle size={14} className="mt-0.5 shrink-0 text-danger" />
                      <div className="flex-1">
                        <p className="font-semibold text-danger">Recovery failed</p>
                        <p className="text-muted mt-0.5">{backupError}</p>
                      </div>
                      <button onClick={resetBackup} className="text-muted underline hover:text-ink">Reset</button>
                    </div>
                  )}
                </div>
              ) : (
                /* Restore success stats */
                backupStats && (
                  <div className="rounded-2xl border border-signal/40 bg-signal/5 p-6 space-y-4">
                    <div className="flex items-center gap-2 text-signal">
                      <CheckCircle2 size={20} />
                      <h3 className="font-display text-base font-semibold">Database Restored Successfully!</h3>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { label: "Roles", value: backupStats.roles, icon: BarChart2, color: "#6366f1" },
                        { label: "Users", value: backupStats.users, icon: Users, color: "#0ea5e9" },
                        { label: "Categories", value: backupStats.categories, icon: BarChart2, color: "#6366f1" },
                        { label: "Media", value: backupStats.media, icon: Image, color: "#f59e0b" },
                        { label: "Pages", value: backupStats.pages, icon: Layout, color: "#10b981" },
                        { label: "Blogs", value: backupStats.blogs, icon: BookOpen, color: "#f43f5e" },
                      ].map(({ label, value, icon: Icon, color }) => (
                        <div key={label} className="rounded-xl bg-paper-card border border-paper-line p-3 text-center">
                          <Icon size={14} className="mx-auto mb-1" style={{ color }} />
                          <p className="text-lg font-bold text-ink">{value}</p>
                          <p className="text-[10px] text-muted">{label}</p>
                        </div>
                      ))}
                    </div>
                    <button onClick={resetBackup} className="btn-secondary w-full justify-center text-xs py-2.5">
                      Restore another backup
                    </button>
                  </div>
                )
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
