import { useEffect, useState } from "react";
import { useLocation } from "wouter";

const API = import.meta.env.VITE_API_BASE_URL ?? "";

/* ── Types ── */
interface ClassLevel { id: number; name: string; sort_order: number; is_active: boolean }
interface Subject { id: number; name: string; is_active: boolean }
interface Term { id: number; name: string; year: number; term_number: number; start_date: string; end_date: string; is_current: boolean }
interface Stats { students: number; teacher_classes: number; lessons: number; subjects: number; class_levels: number }

/* ── API helpers ── */
async function api(path: string, opts?: RequestInit) {
  return fetch(`${API}/api${path}`, { credentials: "include", ...opts });
}
async function apiJson<T>(path: string, opts?: RequestInit): Promise<T | null> {
  const r = await api(path, opts);
  if (!r.ok) return null;
  return r.json() as Promise<T>;
}
async function post<T>(path: string, body: unknown): Promise<{ ok: boolean; data?: T; message?: string }> {
  const r = await api(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await r.json() as { message?: string } & Record<string, unknown>;
  return { ok: r.ok, data: data as T, message: data.message };
}
async function patch<T>(path: string, body: unknown): Promise<{ ok: boolean; data?: T }> {
  const r = await api(path, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  return { ok: r.ok, data: r.ok ? await r.json() as T : undefined };
}
async function del(path: string) {
  await api(path, { method: "DELETE" });
}

/* ── Design tokens ── */
const ms = {
  bg: "#f3f2f1",
  surface: "#ffffff",
  border: "#edebe9",
  borderMid: "#d2d0ce",
  textPrimary: "#201f1e",
  textSecondary: "#605e5c",
  textDisabled: "#a19f9d",
  blue: "#0078d4",
  blueHover: "#106ebe",
  blueLight: "#deecf9",
  green: "#107c10",
  greenLight: "#dff6dd",
  red: "#a4262c",
  redLight: "#fde7e9",
  amber: "#d83b01",
  amberLight: "#fff4ce",
};

/* ── Reusable small components ── */
function Badge({ active }: { active: boolean }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: "2px 10px", borderRadius: 12, fontSize: 12, fontWeight: 600,
      background: active ? ms.greenLight : ms.bg,
      color: active ? ms.green : ms.textDisabled,
      border: `1px solid ${active ? "#bad7ba" : ms.borderMid}`,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: active ? ms.green : ms.textDisabled, display: "inline-block" }} />
      {active ? "Active" : "Inactive"}
    </span>
  );
}

function StatCard({ label, value, icon, accent }: { label: string; value: number; icon: string; accent: string }) {
  return (
    <div style={{
      background: ms.surface, border: `1px solid ${ms.border}`,
      borderRadius: 4, padding: "20px 20px 18px",
      borderLeft: `3px solid ${accent}`,
      boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
    }}>
      <div style={{ fontSize: 20, marginBottom: 8 }}>{icon}</div>
      <div style={{ fontSize: 26, fontWeight: 700, color: ms.textPrimary, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 12, color: ms.textSecondary, marginTop: 4 }}>{label}</div>
    </div>
  );
}

function SectionHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <h1 style={{ fontSize: 18, fontWeight: 600, color: ms.textPrimary, margin: 0 }}>{title}</h1>
      <p style={{ fontSize: 13, color: ms.textSecondary, margin: "4px 0 0" }}>{subtitle}</p>
    </div>
  );
}

function MsInput({ value, onChange, placeholder, type = "text" }: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        width: "100%", boxSizing: "border-box",
        border: `1px solid ${ms.borderMid}`,
        borderRadius: 2, padding: "7px 12px",
        fontSize: 14, color: ms.textPrimary,
        outline: "none", background: ms.surface,
        fontFamily: "inherit",
      }}
      onFocus={(e) => { e.currentTarget.style.borderColor = ms.blue; e.currentTarget.style.boxShadow = `0 0 0 1px ${ms.blue}`; }}
      onBlur={(e) => { e.currentTarget.style.borderColor = ms.borderMid; e.currentTarget.style.boxShadow = "none"; }}
    />
  );
}

function PrimaryBtn({ children, onClick, disabled, type = "button" }: {
  children: React.ReactNode; onClick?: () => void; disabled?: boolean; type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={{
        background: disabled ? ms.borderMid : ms.blue,
        color: "#fff", border: "none",
        borderRadius: 2, padding: "7px 20px",
        fontSize: 14, fontWeight: 600, cursor: disabled ? "not-allowed" : "pointer",
        fontFamily: "inherit", whiteSpace: "nowrap",
        transition: "background 0.1s",
      }}
      onMouseEnter={(e) => { if (!disabled) e.currentTarget.style.background = ms.blueHover; }}
      onMouseLeave={(e) => { if (!disabled) e.currentTarget.style.background = ms.blue; }}
    >
      {children}
    </button>
  );
}

function GhostBtn({ children, onClick, color = ms.textSecondary }: {
  children: React.ReactNode; onClick?: () => void; color?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        background: "none", border: "none", padding: "3px 8px",
        fontSize: 13, color, cursor: "pointer", fontFamily: "inherit",
        borderRadius: 2, transition: "background 0.1s",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = ms.bg; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = "none"; }}
    >
      {children}
    </button>
  );
}

/* ════════════════════════════════════════════════════════════
   MAIN COMPONENT
════════════════════════════════════════════════════════════ */
export function AdminPage() {
  const [, navigate] = useLocation();
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginErr, setLoginErr] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);
  const [tab, setTab] = useState<"overview" | "classes" | "subjects" | "terms" | "school">("overview");

  /* data */
  const [stats, setStats] = useState<Stats | null>(null);
  const [classLevels, setClassLevels] = useState<ClassLevel[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [terms, setTerms] = useState<Term[]>([]);
  const [schoolName, setSchoolName] = useState("");
  const [schoolLogo, setSchoolLogo] = useState("");
  const [schoolNameInput, setSchoolNameInput] = useState("");
  const [schoolLogoPreview, setSchoolLogoPreview] = useState("");
  const [schoolSaving, setSchoolSaving] = useState(false);
  const [schoolMsg, setSchoolMsg] = useState("");

  /* add-item forms */
  const [newLevel, setNewLevel] = useState("");
  const [newSubject, setNewSubject] = useState("");
  const [newTerm, setNewTerm] = useState({ name: "", year: new Date().getFullYear(), term_number: 1, start_date: "", end_date: "", is_current: false });
  const [addErr, setAddErr] = useState("");
  const [saving, setSaving] = useState(false);

  /* inline edit */
  const [editingLevel, setEditingLevel] = useState<number | null>(null);
  const [editLevelVal, setEditLevelVal] = useState("");

  useEffect(() => {
    apiJson<{ role: string }>("/admin/me").then((d) => setAuthed(!!d));
  }, []);

  useEffect(() => {
    if (!authed) return;
    Promise.all([
      apiJson<{ students: number; teacher_classes: number; lessons: number; subjects: number; class_levels: number }>("/admin/stats"),
      apiJson<{ class_levels: ClassLevel[] }>("/admin/class-levels"),
      apiJson<{ subjects: Subject[] }>("/admin/subjects"),
      apiJson<{ terms: Term[] }>("/admin/terms"),
      apiJson<{ school_name: string; school_logo: string }>("/admin/settings"),
    ]).then(([s, cl, sub, t, sc]) => {
      if (s) setStats(s);
      if (cl) setClassLevels(cl.class_levels);
      if (sub) setSubjects(sub.subjects);
      if (t) setTerms(t.terms);
      if (sc) {
        setSchoolName(sc.school_name);
        setSchoolLogo(sc.school_logo);
        setSchoolNameInput(sc.school_name);
        setSchoolLogoPreview(sc.school_logo);
      }
    });
  }, [authed]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoggingIn(true);
    const r = await api("/admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username, password }) });
    setLoggingIn(false);
    if (!r.ok) { setLoginErr("Invalid username or password."); return; }
    setAuthed(true);
  }

  async function handleLogout() {
    await api("/admin/logout", { method: "POST" });
    setAuthed(false);
  }

  /* School Settings */
  async function saveSchoolSettings(e: React.FormEvent) {
    e.preventDefault();
    setSchoolSaving(true);
    setSchoolMsg("");
    const body: Record<string, string> = { school_name: schoolNameInput };
    if (schoolLogoPreview !== schoolLogo) body["school_logo"] = schoolLogoPreview;
    const r = await api("/admin/settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    setSchoolSaving(false);
    if (r.ok) {
      const d = await r.json() as { school_name: string; school_logo: string };
      setSchoolName(d.school_name);
      setSchoolLogo(d.school_logo);
      setSchoolMsg("Changes saved.");
      setTimeout(() => setSchoolMsg(""), 3000);
    } else {
      setSchoolMsg("Failed to save. Try again.");
    }
  }
  function handleLogoFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 200 * 1024) { setSchoolMsg("Logo must be under 200 KB."); return; }
    const reader = new FileReader();
    reader.onload = () => setSchoolLogoPreview(reader.result as string);
    reader.readAsDataURL(file);
  }

  /* Class Levels */
  async function addLevel(e: React.FormEvent) {
    e.preventDefault();
    if (!newLevel.trim()) return setAddErr("Name is required.");
    setSaving(true);
    const res = await post<{ class_level: ClassLevel }>("/admin/class-levels", { name: newLevel.trim() });
    setSaving(false);
    if (!res.ok) return setAddErr(res.message ?? "Error.");
    setClassLevels((p) => [...p, (res.data as { class_level: ClassLevel }).class_level].sort((a, b) => a.sort_order - b.sort_order));
    setNewLevel(""); setAddErr("");
  }
  async function toggleLevel(id: number, is_active: boolean) {
    const res = await patch<{ class_level: ClassLevel }>(`/admin/class-levels/${id}`, { is_active });
    if (res.ok) setClassLevels((p) => p.map((x) => x.id === id ? { ...x, is_active } : x));
  }
  async function saveEditLevel(id: number) {
    if (!editLevelVal.trim()) return;
    await patch(`/admin/class-levels/${id}`, { name: editLevelVal.trim() });
    setClassLevels((p) => p.map((x) => x.id === id ? { ...x, name: editLevelVal.trim() } : x));
    setEditingLevel(null);
  }
  async function deleteLevel(id: number) {
    if (!confirm("Delete this class level?")) return;
    await del(`/admin/class-levels/${id}`);
    setClassLevels((p) => p.filter((x) => x.id !== id));
  }

  /* Subjects */
  async function addSubject(e: React.FormEvent) {
    e.preventDefault();
    if (!newSubject.trim()) return setAddErr("Name is required.");
    setSaving(true);
    const res = await post<{ subject: Subject }>("/admin/subjects", { name: newSubject.trim() });
    setSaving(false);
    if (!res.ok) return setAddErr(res.message ?? "Error.");
    setSubjects((p) => [...p, (res.data as { subject: Subject }).subject].sort((a, b) => a.name.localeCompare(b.name)));
    setNewSubject(""); setAddErr("");
  }
  async function toggleSubject(id: number, is_active: boolean) {
    const res = await patch<{ subject: Subject }>(`/admin/subjects/${id}`, { is_active });
    if (res.ok) setSubjects((p) => p.map((x) => x.id === id ? { ...x, is_active } : x));
  }
  async function deleteSubject(id: number) {
    if (!confirm("Delete this subject?")) return;
    await del(`/admin/subjects/${id}`);
    setSubjects((p) => p.filter((x) => x.id !== id));
  }

  /* Terms */
  async function addTerm(e: React.FormEvent) {
    e.preventDefault();
    if (!newTerm.name.trim()) return setAddErr("Term name is required.");
    if (!newTerm.start_date || !newTerm.end_date) return setAddErr("Start and end dates are required.");
    setSaving(true);
    const res = await post<{ term: Term }>("/admin/terms", newTerm);
    setSaving(false);
    if (!res.ok) return setAddErr((res.data as { message?: string })?.message ?? "Error.");
    const added = (res.data as { term: Term }).term;
    setTerms((p) => {
      const updated = p.map((t) => newTerm.is_current ? { ...t, is_current: false } : t);
      return [...updated, added].sort((a, b) => a.year - b.year || a.term_number - b.term_number);
    });
    setNewTerm({ name: "", year: new Date().getFullYear(), term_number: 1, start_date: "", end_date: "", is_current: false });
    setAddErr("");
  }
  async function setCurrentTerm(id: number) {
    await patch(`/admin/terms/${id}`, { is_current: true });
    setTerms((p) => p.map((t) => ({ ...t, is_current: t.id === id })));
  }
  async function deleteTerm(id: number) {
    if (!confirm("Delete this term?")) return;
    await del(`/admin/terms/${id}`);
    setTerms((p) => p.filter((x) => x.id !== id));
  }

  /* ── Loading state ── */
  if (authed === null) {
    return (
      <div style={{ display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center", background: ms.bg }}>
        <div style={{ width: 28, height: 28, borderRadius: "50%", border: `3px solid ${ms.border}`, borderTopColor: ms.blue, animation: "spin 0.7s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  /* ── Login screen ── */
  if (!authed) {
    return (
      <div style={{ display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center", background: ms.bg, fontFamily: "'Segoe UI', system-ui, sans-serif", padding: 16 }}>
        <button
          onClick={() => navigate("/")}
          style={{ position: "absolute", top: 16, left: 16, display: "flex", alignItems: "center", gap: 6, background: ms.surface, border: `1px solid ${ms.border}`, borderRadius: 2, padding: "6px 14px", fontSize: 13, color: ms.textSecondary, cursor: "pointer" }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M17 10a.75.75 0 0 1-.75.75H5.612l4.158 3.96a.75.75 0 1 1-1.04 1.08l-5.5-5.25a.75.75 0 0 1 0-1.08l5.5-5.25a.75.75 0 1 1 1.04 1.08L5.612 9.25H16.25A.75.75 0 0 1 17 10Z" clipRule="evenodd" /></svg>
          Back to home
        </button>

        <div style={{ width: "100%", maxWidth: 380, background: ms.surface, border: `1px solid ${ms.border}`, boxShadow: "0 4px 16px rgba(0,0,0,0.1)", padding: "40px 36px" }}>
          {/* Microsoft-style header */}
          <div style={{ marginBottom: 28 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
              <div style={{ width: 28, height: 28, background: ms.blue, borderRadius: 2, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <rect x="1" y="1" width="6" height="6" fill="#fff" />
                  <rect x="9" y="1" width="6" height="6" fill="#fff" opacity=".7" />
                  <rect x="1" y="9" width="6" height="6" fill="#fff" opacity=".7" />
                  <rect x="9" y="9" width="6" height="6" fill="#fff" opacity=".4" />
                </svg>
              </div>
              <span style={{ fontSize: 15, fontWeight: 600, color: ms.textPrimary }}>ElimuPawa</span>
            </div>
            <h1 style={{ fontSize: 24, fontWeight: 600, color: ms.textPrimary, margin: "0 0 6px" }}>Sign in</h1>
            <p style={{ fontSize: 13, color: ms.textSecondary, margin: 0 }}>Administration console</p>
          </div>

          <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: ms.textPrimary, marginBottom: 4 }}>Username</label>
              <MsInput value={username} onChange={(v) => { setUsername(v); setLoginErr(""); }} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: ms.textPrimary, marginBottom: 4 }}>Password</label>
              <MsInput type="password" value={password} onChange={(v) => { setPassword(v); setLoginErr(""); }} />
            </div>
            {loginErr && (
              <div style={{ background: ms.redLight, border: `1px solid #f4b8bb`, borderRadius: 2, padding: "8px 12px", fontSize: 13, color: ms.red }}>
                {loginErr}
              </div>
            )}
            <PrimaryBtn type="submit" disabled={loggingIn}>
              {loggingIn ? "Signing in…" : "Sign in"}
            </PrimaryBtn>
          </form>
        </div>
      </div>
    );
  }

  const TABS = [
    { id: "overview",  label: "Overview",        icon: "⊞" },
    { id: "classes",   label: "Class Levels",     icon: "≡" },
    { id: "subjects",  label: "Subjects",         icon: "⊕" },
    { id: "terms",     label: "Academic Terms",   icon: "▦" },
    { id: "school",    label: "School",           icon: "◈" },
  ] as const;

  const inputStyle = {
    border: `1px solid ${ms.borderMid}`, borderRadius: 2,
    padding: "7px 12px", fontSize: 14, color: ms.textPrimary,
    background: ms.surface, outline: "none", fontFamily: "inherit",
  };

  const selectStyle = {
    ...inputStyle, cursor: "pointer",
  };

  return (
    <div style={{ minHeight: "100vh", background: ms.bg, fontFamily: "'Segoe UI', system-ui, sans-serif", color: ms.textPrimary }}>

      {/* ── Top bar ── */}
      <header style={{ background: ms.surface, borderBottom: `1px solid ${ms.border}`, padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 48, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 24, height: 24, background: ms.blue, borderRadius: 2, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <rect x="1" y="1" width="6" height="6" fill="#fff" />
              <rect x="9" y="1" width="6" height="6" fill="#fff" opacity=".7" />
              <rect x="1" y="9" width="6" height="6" fill="#fff" opacity=".7" />
              <rect x="9" y="9" width="6" height="6" fill="#fff" opacity=".4" />
            </svg>
          </div>
          <span style={{ fontSize: 15, fontWeight: 600, color: ms.textPrimary }}>ElimuPawa</span>
          <span style={{ fontSize: 13, color: ms.textSecondary, borderLeft: `1px solid ${ms.border}`, paddingLeft: 10, marginLeft: 2 }}>Admin Center</span>
        </div>
        <button
          onClick={handleLogout}
          style={{ background: "none", border: `1px solid ${ms.border}`, borderRadius: 2, padding: "5px 14px", fontSize: 13, color: ms.textSecondary, cursor: "pointer" }}
          onMouseEnter={(e) => { e.currentTarget.style.background = ms.bg; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "none"; }}
        >
          Sign out
        </button>
      </header>

      {/* ── Pivot tabs (Office-style underline) ── */}
      <div style={{ background: ms.surface, borderBottom: `1px solid ${ms.border}`, padding: "0 24px", display: "flex", gap: 0 }}>
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => { setTab(t.id); setAddErr(""); }}
            style={{
              background: "none", border: "none", cursor: "pointer",
              padding: "12px 18px", fontSize: 14,
              color: tab === t.id ? ms.blue : ms.textSecondary,
              fontWeight: tab === t.id ? 600 : 400,
              borderBottom: tab === t.id ? `2px solid ${ms.blue}` : "2px solid transparent",
              marginBottom: -1, fontFamily: "inherit",
              transition: "color 0.1s",
            }}
            onMouseEnter={(e) => { if (tab !== t.id) e.currentTarget.style.color = ms.textPrimary; }}
            onMouseLeave={(e) => { if (tab !== t.id) e.currentTarget.style.color = ms.textSecondary; }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Page content ── */}
      <main style={{ maxWidth: 960, margin: "0 auto", padding: "28px 24px" }}>

        {/* ── OVERVIEW ── */}
        {tab === "overview" && (
          <div>
            <SectionHeader title="Overview" subtitle="Live statistics across the platform" />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12, marginBottom: 24 }}>
              <StatCard label="Students"         value={stats?.students ?? 0}        icon="🎒" accent={ms.blue}  />
              <StatCard label="Teacher Classes"  value={stats?.teacher_classes ?? 0} icon="🎓" accent="#5c2d91" />
              <StatCard label="Lessons Scheduled"value={stats?.lessons ?? 0}         icon="📋" accent={ms.green} />
              <StatCard label="Active Subjects"  value={stats?.subjects ?? 0}        icon="📚" accent={ms.amber} />
              <StatCard label="Class Levels"     value={stats?.class_levels ?? 0}    icon="🏫" accent="#008272" />
            </div>

            <div style={{ background: ms.surface, border: `1px solid ${ms.border}`, borderRadius: 4, padding: 20, boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: ms.textSecondary, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 12 }}>Current Academic Term</div>
              {terms.find((t) => t.is_current) ? (() => {
                const t = terms.find((x) => x.is_current)!;
                return (
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: 16, fontWeight: 600, color: ms.textPrimary }}>{t.name}</span>
                      <span style={{ background: ms.greenLight, color: ms.green, border: `1px solid #bad7ba`, borderRadius: 12, padding: "2px 10px", fontSize: 12, fontWeight: 600 }}>Current</span>
                    </div>
                    <p style={{ fontSize: 13, color: ms.textSecondary, margin: "4px 0 0" }}>
                      {new Date(t.start_date).toLocaleDateString("en-KE", { day: "numeric", month: "long", year: "numeric" })}
                      {" — "}
                      {new Date(t.end_date).toLocaleDateString("en-KE", { day: "numeric", month: "long", year: "numeric" })}
                    </p>
                  </div>
                );
              })() : (
                <p style={{ fontSize: 14, color: ms.textSecondary, margin: 0 }}>No current term set. Go to <strong>Academic Terms</strong> to set one.</p>
              )}
            </div>
          </div>
        )}

        {/* ── CLASS LEVELS ── */}
        {tab === "classes" && (
          <div>
            <SectionHeader title="Class Levels" subtitle="These appear in the student sign-up form and teacher class creation." />

            <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
              <form onSubmit={addLevel} style={{ display: "flex", gap: 8, flex: 1 }}>
                <input
                  type="text"
                  value={newLevel}
                  onChange={(e) => { setNewLevel(e.target.value); setAddErr(""); }}
                  placeholder="e.g. Grade 10 or Form 5"
                  style={{ ...inputStyle, flex: 1 }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = ms.blue; e.currentTarget.style.boxShadow = `0 0 0 1px ${ms.blue}`; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = ms.borderMid; e.currentTarget.style.boxShadow = "none"; }}
                />
                <PrimaryBtn type="submit" disabled={saving}>{saving ? "Adding…" : "Add"}</PrimaryBtn>
              </form>
            </div>
            {addErr && <p style={{ fontSize: 13, color: ms.red, margin: "4px 0 8px" }}>{addErr}</p>}

            <div style={{ background: ms.surface, border: `1px solid ${ms.border}`, borderRadius: 4, overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                <thead>
                  <tr style={{ background: "#faf9f8", borderBottom: `1px solid ${ms.border}` }}>
                    {["Order", "Name", "Status", "Actions"].map((h, i) => (
                      <th key={h} style={{ padding: "10px 14px", textAlign: i === 3 ? "right" : "left", fontSize: 12, fontWeight: 600, color: ms.textSecondary, textTransform: "uppercase", letterSpacing: "0.04em" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {classLevels.map((cl, idx) => (
                    <tr key={cl.id} style={{ borderBottom: `1px solid ${ms.border}`, background: idx % 2 === 0 ? ms.surface : "#faf9f8", opacity: cl.is_active ? 1 : 0.55 }}>
                      <td style={{ padding: "10px 14px", color: ms.textDisabled }}>{cl.sort_order}</td>
                      <td style={{ padding: "10px 14px", fontWeight: 500 }}>
                        {editingLevel === cl.id ? (
                          <input
                            autoFocus
                            value={editLevelVal}
                            onChange={(e) => setEditLevelVal(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter") saveEditLevel(cl.id); if (e.key === "Escape") setEditingLevel(null); }}
                            style={{ ...inputStyle, padding: "4px 8px", fontSize: 13 }}
                          />
                        ) : cl.name}
                      </td>
                      <td style={{ padding: "10px 14px" }}><Badge active={cl.is_active} /></td>
                      <td style={{ padding: "10px 14px", textAlign: "right" }}>
                        <div style={{ display: "flex", justifyContent: "flex-end", gap: 4 }}>
                          {editingLevel === cl.id ? (
                            <GhostBtn onClick={() => saveEditLevel(cl.id)} color={ms.blue}>Save</GhostBtn>
                          ) : (
                            <GhostBtn onClick={() => { setEditingLevel(cl.id); setEditLevelVal(cl.name); }}>Edit</GhostBtn>
                          )}
                          <GhostBtn onClick={() => toggleLevel(cl.id, !cl.is_active)} color={cl.is_active ? ms.amber : ms.green}>
                            {cl.is_active ? "Disable" : "Enable"}
                          </GhostBtn>
                          <GhostBtn onClick={() => deleteLevel(cl.id)} color={ms.red}>Delete</GhostBtn>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {classLevels.length === 0 && (
                    <tr><td colSpan={4} style={{ padding: "24px 14px", textAlign: "center", color: ms.textSecondary, fontSize: 14 }}>No class levels yet. Add one above.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── SUBJECTS ── */}
        {tab === "subjects" && (
          <div>
            <SectionHeader title="Subjects" subtitle="Teachers pick from this list when creating a class. Disable to hide without deleting." />

            <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
              <form onSubmit={addSubject} style={{ display: "flex", gap: 8, flex: 1 }}>
                <input
                  type="text"
                  value={newSubject}
                  onChange={(e) => { setNewSubject(e.target.value); setAddErr(""); }}
                  placeholder="e.g. French or Technical Drawing"
                  style={{ ...inputStyle, flex: 1 }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = ms.blue; e.currentTarget.style.boxShadow = `0 0 0 1px ${ms.blue}`; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = ms.borderMid; e.currentTarget.style.boxShadow = "none"; }}
                />
                <PrimaryBtn type="submit" disabled={saving}>{saving ? "Adding…" : "Add"}</PrimaryBtn>
              </form>
            </div>
            {addErr && <p style={{ fontSize: 13, color: ms.red, margin: "4px 0 8px" }}>{addErr}</p>}

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 8 }}>
              {subjects.map((s) => (
                <div
                  key={s.id}
                  style={{
                    background: ms.surface, border: `1px solid ${ms.border}`,
                    borderLeft: `3px solid ${s.is_active ? ms.blue : ms.borderMid}`,
                    borderRadius: 2, padding: "10px 14px",
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    opacity: s.is_active ? 1 : 0.55,
                    boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                  }}
                >
                  <span style={{ fontSize: 14, fontWeight: 500 }}>{s.name}</span>
                  <div style={{ display: "flex", gap: 2 }}>
                    <GhostBtn onClick={() => toggleSubject(s.id, !s.is_active)} color={s.is_active ? ms.amber : ms.green}>
                      {s.is_active ? "Disable" : "Enable"}
                    </GhostBtn>
                    <GhostBtn onClick={() => deleteSubject(s.id)} color={ms.red}>✕</GhostBtn>
                  </div>
                </div>
              ))}
              {subjects.length === 0 && (
                <div style={{ gridColumn: "1/-1", textAlign: "center", color: ms.textSecondary, fontSize: 14, padding: 24 }}>No subjects yet. Add one above.</div>
              )}
            </div>
          </div>
        )}

        {/* ── TERMS ── */}
        {tab === "terms" && (
          <div>
            <SectionHeader title="Academic Terms" subtitle="Set term dates for the school year. Mark one as the current term." />

            <div style={{ background: ms.surface, border: `1px solid ${ms.border}`, borderRadius: 4, padding: 20, marginBottom: 20, boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: ms.textSecondary, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 14 }}>Add New Term</div>
              <form onSubmit={addTerm}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: ms.textSecondary, marginBottom: 4 }}>TERM NAME</label>
                    <input type="text" value={newTerm.name} onChange={(e) => setNewTerm((p) => ({ ...p, name: e.target.value }))} placeholder="e.g. Term 1 2026" style={{ ...inputStyle, width: "100%", boxSizing: "border-box" }} onFocus={(e) => { e.currentTarget.style.borderColor = ms.blue; }} onBlur={(e) => { e.currentTarget.style.borderColor = ms.borderMid; }} />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: ms.textSecondary, marginBottom: 4 }}>YEAR</label>
                    <input type="number" value={newTerm.year} onChange={(e) => setNewTerm((p) => ({ ...p, year: Number(e.target.value) }))} style={{ ...inputStyle, width: "100%", boxSizing: "border-box" }} onFocus={(e) => { e.currentTarget.style.borderColor = ms.blue; }} onBlur={(e) => { e.currentTarget.style.borderColor = ms.borderMid; }} />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: ms.textSecondary, marginBottom: 4 }}>TERM NUMBER</label>
                    <select value={newTerm.term_number} onChange={(e) => setNewTerm((p) => ({ ...p, term_number: Number(e.target.value) }))} style={{ ...selectStyle, width: "100%", boxSizing: "border-box" }}>
                      <option value={1}>1</option>
                      <option value={2}>2</option>
                      <option value={3}>3</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: ms.textSecondary, marginBottom: 4 }}>START DATE</label>
                    <input type="date" value={newTerm.start_date} onChange={(e) => setNewTerm((p) => ({ ...p, start_date: e.target.value }))} style={{ ...inputStyle, width: "100%", boxSizing: "border-box" }} onFocus={(e) => { e.currentTarget.style.borderColor = ms.blue; }} onBlur={(e) => { e.currentTarget.style.borderColor = ms.borderMid; }} />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: ms.textSecondary, marginBottom: 4 }}>END DATE</label>
                    <input type="date" value={newTerm.end_date} onChange={(e) => setNewTerm((p) => ({ ...p, end_date: e.target.value }))} style={{ ...inputStyle, width: "100%", boxSizing: "border-box" }} onFocus={(e) => { e.currentTarget.style.borderColor = ms.blue; }} onBlur={(e) => { e.currentTarget.style.borderColor = ms.borderMid; }} />
                  </div>
                  <div style={{ display: "flex", alignItems: "flex-end" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: ms.textPrimary, cursor: "pointer" }}>
                      <input type="checkbox" checked={newTerm.is_current} onChange={(e) => setNewTerm((p) => ({ ...p, is_current: e.target.checked }))} style={{ width: 16, height: 16, accentColor: ms.blue }} />
                      Set as current term
                    </label>
                  </div>
                </div>
                {addErr && <p style={{ fontSize: 13, color: ms.red, margin: "0 0 10px" }}>{addErr}</p>}
                <PrimaryBtn type="submit" disabled={saving}>{saving ? "Adding…" : "Add Term"}</PrimaryBtn>
              </form>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {terms.map((t) => (
                <div key={t.id} style={{
                  background: ms.surface, border: `1px solid ${ms.border}`,
                  borderLeft: `3px solid ${t.is_current ? ms.green : ms.borderMid}`,
                  borderRadius: 4, padding: "14px 18px",
                  display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
                  boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontWeight: 600, fontSize: 15, color: ms.textPrimary }}>{t.name}</span>
                      {t.is_current && (
                        <span style={{ background: ms.greenLight, color: ms.green, border: "1px solid #bad7ba", borderRadius: 12, padding: "1px 10px", fontSize: 12, fontWeight: 600 }}>Current</span>
                      )}
                    </div>
                    <p style={{ fontSize: 13, color: ms.textSecondary, margin: "3px 0 0" }}>
                      {new Date(t.start_date).toLocaleDateString("en-KE", { day: "numeric", month: "long" })}
                      {" — "}
                      {new Date(t.end_date).toLocaleDateString("en-KE", { day: "numeric", month: "long", year: "numeric" })}
                    </p>
                  </div>
                  <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                    {!t.is_current && (
                      <button onClick={() => setCurrentTerm(t.id)} style={{ border: `1px solid ${ms.borderMid}`, background: ms.surface, borderRadius: 2, padding: "5px 12px", fontSize: 13, color: ms.textSecondary, cursor: "pointer", fontFamily: "inherit" }}
                        onMouseEnter={(e) => { e.currentTarget.style.borderColor = ms.blue; e.currentTarget.style.color = ms.blue; }}
                        onMouseLeave={(e) => { e.currentTarget.style.borderColor = ms.borderMid; e.currentTarget.style.color = ms.textSecondary; }}>
                        Set as current
                      </button>
                    )}
                    <button onClick={() => deleteTerm(t.id)} style={{ border: `1px solid ${ms.borderMid}`, background: ms.surface, borderRadius: 2, padding: "5px 12px", fontSize: 13, color: ms.red, cursor: "pointer", fontFamily: "inherit" }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = ms.redLight; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = ms.surface; }}>
                      Delete
                    </button>
                  </div>
                </div>
              ))}
              {terms.length === 0 && (
                <div style={{ textAlign: "center", color: ms.textSecondary, fontSize: 14, padding: 24 }}>No terms yet. Add one above.</div>
              )}
            </div>
          </div>
        )}

        {/* ── SCHOOL SETTINGS ── */}
        {tab === "school" && (
          <div>
            <SectionHeader title="School Settings" subtitle="Set your school name and logo — they appear on the home page." />

            <form onSubmit={saveSchoolSettings}>
              <div style={{ background: ms.surface, border: `1px solid ${ms.border}`, borderRadius: 4, padding: 24, marginBottom: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>

                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: ms.textSecondary, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 6 }}>School Name</label>
                  <input
                    type="text"
                    value={schoolNameInput}
                    onChange={(e) => setSchoolNameInput(e.target.value)}
                    placeholder="e.g. Nairobi Primary School"
                    style={{ ...inputStyle, width: "100%", maxWidth: 480, boxSizing: "border-box" }}
                    onFocus={(e) => { e.currentTarget.style.borderColor = ms.blue; e.currentTarget.style.boxShadow = `0 0 0 1px ${ms.blue}`; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = ms.borderMid; e.currentTarget.style.boxShadow = "none"; }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: ms.textSecondary, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 6 }}>School Logo</label>
                  <p style={{ fontSize: 12, color: ms.textDisabled, margin: "0 0 12px" }}>PNG, JPG, or SVG · max 200 KB</p>
                  <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
                    <div style={{ width: 72, height: 72, border: `1px solid ${ms.border}`, borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", background: ms.bg, flexShrink: 0 }}>
                      {schoolLogoPreview
                        ? <img src={schoolLogoPreview} alt="Logo preview" style={{ width: 64, height: 64, objectFit: "contain", borderRadius: 4 }} />
                        : <span style={{ fontSize: 28 }}>🏫</span>
                      }
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      <label style={{ display: "inline-flex", alignItems: "center", gap: 8, border: `1px solid ${ms.borderMid}`, background: ms.surface, borderRadius: 2, padding: "6px 14px", fontSize: 13, color: ms.textPrimary, cursor: "pointer" }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = ms.bg; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = ms.surface; }}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                        </svg>
                        Upload logo
                        <input type="file" accept="image/*" onChange={handleLogoFile} style={{ display: "none" }} />
                      </label>
                      {schoolLogoPreview && (
                        <button type="button" onClick={() => setSchoolLogoPreview("")} style={{ border: `1px solid ${ms.border}`, background: "none", borderRadius: 2, padding: "5px 14px", fontSize: 13, color: ms.red, cursor: "pointer", fontFamily: "inherit", textAlign: "left" }}>
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <PrimaryBtn type="submit" disabled={schoolSaving}>{schoolSaving ? "Saving…" : "Save changes"}</PrimaryBtn>
                {schoolMsg && (
                  <span style={{ fontSize: 13, color: schoolMsg.startsWith("Changes") ? ms.green : ms.red }}>{schoolMsg}</span>
                )}
              </div>
            </form>

            {(schoolName || schoolLogo) && (
              <div style={{ marginTop: 24, border: `1px solid ${ms.border}`, borderRadius: 4, padding: 16, background: ms.surface }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: ms.textSecondary, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 10 }}>Preview — Home page banner</div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, background: ms.bg, padding: "10px 16px", borderRadius: 2 }}>
                  {schoolLogo && <img src={schoolLogo} alt="Logo" style={{ width: 36, height: 36, objectFit: "contain", borderRadius: 4 }} />}
                  {schoolName && <span style={{ fontSize: 15, fontWeight: 600, color: ms.textPrimary }}>{schoolName}</span>}
                </div>
              </div>
            )}
          </div>
        )}

      </main>
    </div>
  );
}
