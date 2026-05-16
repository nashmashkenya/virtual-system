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

  const [newLevel, setNewLevel] = useState("");
  const [newSubject, setNewSubject] = useState("");
  const [newTerm, setNewTerm] = useState({ name: "", year: new Date().getFullYear(), term_number: 1, start_date: "", end_date: "", is_current: false });
  const [addErr, setAddErr] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingLevel, setEditingLevel] = useState<number | null>(null);
  const [editLevelVal, setEditLevelVal] = useState("");

  useEffect(() => {
    apiJson<{ role: string }>("/admin/me").then((d) => setAuthed(!!d));
  }, []);

  useEffect(() => {
    if (!authed) return;
    Promise.all([
      apiJson<Stats>("/admin/stats"),
      apiJson<{ class_levels: ClassLevel[] }>("/admin/class-levels"),
      apiJson<{ subjects: Subject[] }>("/admin/subjects"),
      apiJson<{ terms: Term[] }>("/admin/terms"),
      apiJson<{ school_name: string; school_logo: string }>("/admin/settings"),
    ]).then(([s, cl, sub, t, sc]) => {
      if (s) setStats(s);
      if (cl) setClassLevels(cl.class_levels);
      if (sub) setSubjects(sub.subjects);
      if (t) setTerms(t.terms);
      if (sc) { setSchoolName(sc.school_name); setSchoolLogo(sc.school_logo); setSchoolNameInput(sc.school_name); setSchoolLogoPreview(sc.school_logo); }
    });
  }, [authed]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoggingIn(true);
    const r = await api("/admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username, password }) });
    setLoggingIn(false);
    if (!r.ok) { setLoginErr("Incorrect username or password."); return; }
    setAuthed(true);
  }
  async function handleLogout() {
    await api("/admin/logout", { method: "POST" });
    setAuthed(false);
  }

  async function saveSchoolSettings(e: React.FormEvent) {
    e.preventDefault(); setSchoolSaving(true); setSchoolMsg("");
    const body: Record<string, string> = { school_name: schoolNameInput };
    if (schoolLogoPreview !== schoolLogo) body["school_logo"] = schoolLogoPreview;
    const r = await api("/admin/settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    setSchoolSaving(false);
    if (r.ok) {
      const d = await r.json() as { school_name: string; school_logo: string };
      setSchoolName(d.school_name); setSchoolLogo(d.school_logo);
      setSchoolMsg("Saved!"); setTimeout(() => setSchoolMsg(""), 3000);
    } else { setSchoolMsg("Save failed."); }
  }
  function handleLogoFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    if (file.size > 200 * 1024) { setSchoolMsg("Logo must be under 200 KB."); return; }
    const reader = new FileReader();
    reader.onload = () => setSchoolLogoPreview(reader.result as string);
    reader.readAsDataURL(file);
  }

  async function addLevel(e: React.FormEvent) {
    e.preventDefault(); if (!newLevel.trim()) return setAddErr("Name is required.");
    setSaving(true);
    const res = await post<{ class_level: ClassLevel }>("/admin/class-levels", { name: newLevel.trim() });
    setSaving(false); if (!res.ok) return setAddErr(res.message ?? "Error.");
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
    await del(`/admin/class-levels/${id}`); setClassLevels((p) => p.filter((x) => x.id !== id));
  }

  async function addSubject(e: React.FormEvent) {
    e.preventDefault(); if (!newSubject.trim()) return setAddErr("Name is required.");
    setSaving(true);
    const res = await post<{ subject: Subject }>("/admin/subjects", { name: newSubject.trim() });
    setSaving(false); if (!res.ok) return setAddErr(res.message ?? "Error.");
    setSubjects((p) => [...p, (res.data as { subject: Subject }).subject].sort((a, b) => a.name.localeCompare(b.name)));
    setNewSubject(""); setAddErr("");
  }
  async function toggleSubject(id: number, is_active: boolean) {
    const res = await patch<{ subject: Subject }>(`/admin/subjects/${id}`, { is_active });
    if (res.ok) setSubjects((p) => p.map((x) => x.id === id ? { ...x, is_active } : x));
  }
  async function deleteSubject(id: number) {
    if (!confirm("Delete this subject?")) return;
    await del(`/admin/subjects/${id}`); setSubjects((p) => p.filter((x) => x.id !== id));
  }

  async function addTerm(e: React.FormEvent) {
    e.preventDefault();
    if (!newTerm.name.trim()) return setAddErr("Term name is required.");
    if (!newTerm.start_date || !newTerm.end_date) return setAddErr("Start and end dates are required.");
    setSaving(true);
    const res = await post<{ term: Term }>("/admin/terms", newTerm);
    setSaving(false); if (!res.ok) return setAddErr((res.data as { message?: string })?.message ?? "Error.");
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
    await del(`/admin/terms/${id}`); setTerms((p) => p.filter((x) => x.id !== id));
  }

  /* ── Loading ── */
  if (authed === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-gray-200 border-t-emerald-500" />
      </div>
    );
  }

  /* ════════════════════════════════════════════════════════════
     LOGIN — split layout
  ════════════════════════════════════════════════════════════ */
  if (!authed) {
    return (
      <div className="flex min-h-screen">
        {/* Left decorative panel */}
        <div className="hidden lg:flex lg:w-[45%] flex-col justify-between p-12 relative overflow-hidden"
          style={{ background: "linear-gradient(145deg, #064e3b 0%, #065f46 40%, #047857 100%)" }}>
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-emerald-400/10 blur-3xl" />
            <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-teal-300/10 blur-3xl" />
          </div>
          <div className="relative flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15">
              <img src="/logo.svg" alt="" className="h-5 w-5" />
            </div>
            <span className="text-lg font-bold text-white">ElimuPawa</span>
          </div>
          <div className="relative space-y-6">
            <div className="space-y-3">
              {[
                { n: stats?.students ?? "—", label: "Registered students" },
                { n: stats?.teacher_classes ?? "—", label: "Teacher classes" },
                { n: stats?.lessons ?? "—", label: "Lessons scheduled" },
              ].map((s) => (
                <div key={s.label} className="flex items-center gap-4">
                  <div className="text-3xl font-black text-white">{s.n}</div>
                  <div className="text-sm text-emerald-200">{s.label}</div>
                </div>
              ))}
            </div>
            <p className="text-sm leading-relaxed text-emerald-100/70">
              Manage your school's class levels, subjects, academic terms, and branding from one place.
            </p>
          </div>
          <p className="relative text-xs text-emerald-200/50">ElimuPawa Admin Console</p>
        </div>

        {/* Right — form */}
        <div className="flex flex-1 flex-col items-center justify-center bg-white px-6 py-12">
          <button onClick={() => navigate("/")} className="absolute left-5 top-5 flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-gray-500 transition hover:bg-gray-100 hover:text-gray-700">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M17 10a.75.75 0 0 1-.75.75H5.612l4.158 3.96a.75.75 0 1 1-1.04 1.08l-5.5-5.25a.75.75 0 0 1 0-1.08l5.5-5.25a.75.75 0 1 1 1.04 1.08L5.612 9.25H16.25A.75.75 0 0 1 17 10Z" clipRule="evenodd" /></svg>
            Home
          </button>
          <div className="w-full max-w-[380px]">
            <div className="mb-8">
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-gray-900">Welcome back</h1>
              <p className="mt-1 text-sm text-gray-500">Sign in to the administration console</p>
            </div>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Username</label>
                <input
                  type="text" value={username}
                  onChange={(e) => { setUsername(e.target.value); setLoginErr(""); }}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 shadow-sm outline-none transition placeholder:text-gray-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Password</label>
                <input
                  type="password" value={password}
                  onChange={(e) => { setPassword(e.target.value); setLoginErr(""); }}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 shadow-sm outline-none transition placeholder:text-gray-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
              {loginErr && (
                <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3.5 py-2.5 text-sm text-red-600">
                  <svg className="h-4 w-4 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" /></svg>
                  {loginErr}
                </div>
              )}
              <button type="submit" disabled={loggingIn}
                className="w-full rounded-lg bg-emerald-600 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 active:scale-[.99] disabled:opacity-60">
                {loggingIn ? "Signing in…" : "Sign in"}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  /* ════════════════════════════════════════════════════════════
     MAIN DASHBOARD — sidebar layout
  ════════════════════════════════════════════════════════════ */
  const NAV = [
    { id: "overview",  label: "Overview",       icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg>
    )},
    { id: "classes",   label: "Class Levels",   icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 5.25h16.5m-16.5 4.5h16.5m-16.5 4.5h16.5m-16.5 4.5h16.5" /></svg>
    )},
    { id: "subjects",  label: "Subjects",       icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" /></svg>
    )},
    { id: "terms",     label: "Academic Terms", icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 9v7.5" /></svg>
    )},
    { id: "school",    label: "School",         icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75z" /></svg>
    )},
  ] as const;

  const inputCls = "w-full rounded-lg border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-800 shadow-sm outline-none transition placeholder:text-gray-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20";
  const selectCls = inputCls + " cursor-pointer";

  const currentTerm = terms.find((t) => t.is_current);

  return (
    <div className="flex min-h-screen bg-gray-50">

      {/* ── Sidebar ── */}
      <aside className="flex w-60 shrink-0 flex-col border-r border-gray-200 bg-white">
        {/* Brand */}
        <div className="flex h-16 items-center gap-3 border-b border-gray-100 px-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600">
            <img src="/logo.svg" alt="" className="h-4 w-4 brightness-0 invert" />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900">ElimuPawa</p>
            <p className="text-[11px] text-gray-400">Admin Console</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-0.5 px-3 py-4">
          {NAV.map((n) => (
            <button
              key={n.id}
              onClick={() => { setTab(n.id); setAddErr(""); }}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition
                ${tab === n.id
                  ? "bg-emerald-50 text-emerald-700"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }`}
            >
              <span className={tab === n.id ? "text-emerald-600" : "text-gray-400"}>{n.icon}</span>
              {n.label}
            </button>
          ))}
        </nav>

        {/* Sign out */}
        <div className="border-t border-gray-100 p-3">
          <button onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-500 transition hover:bg-red-50 hover:text-red-600">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" /></svg>
            Sign out
          </button>
        </div>
      </aside>

      {/* ── Main content ── */}
      <div className="flex flex-1 flex-col overflow-hidden">

        {/* Top bar */}
        <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-8">
          <div>
            <h1 className="text-base font-semibold text-gray-900">
              {NAV.find((n) => n.id === tab)?.label}
            </h1>
          </div>
          {currentTerm && (
            <div className="flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              {currentTerm.name}
            </div>
          )}
        </header>

        <main className="flex-1 overflow-y-auto p-8">

          {/* ── OVERVIEW ── */}
          {tab === "overview" && (
            <div className="space-y-6">

              {/* 4 core stat cards */}
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                {[
                  { label: "Registered Students", value: stats?.students ?? 0,        sub: "signed up so far",             light: "bg-blue-50",    text: "text-blue-600",    border: "border-blue-100",    icon: "🎒", action: null },
                  { label: "Lessons Scheduled",   value: stats?.lessons ?? 0,         sub: "across all teacher classes",   light: "bg-emerald-50", text: "text-emerald-600", border: "border-emerald-100", icon: "📋", action: null },
                  { label: "Active Subjects",      value: stats?.subjects ?? 0,        sub: "available for teachers",       light: "bg-amber-50",   text: "text-amber-600",   border: "border-amber-100",   icon: "📚", action: () => setTab("subjects") },
                  { label: "Active Class Levels",  value: stats?.class_levels ?? 0,    sub: "shown on student sign-up",     light: "bg-violet-50",  text: "text-violet-600",  border: "border-violet-100",  icon: "🏫", action: () => setTab("classes") },
                ].map((s) => (
                  <div
                    key={s.label}
                    onClick={s.action ?? undefined}
                    className={`rounded-xl border bg-white p-5 shadow-sm transition ${s.border} ${s.action ? "cursor-pointer hover:shadow-md" : ""}`}
                  >
                    <div className={`mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg text-lg ${s.light}`}>{s.icon}</div>
                    <p className={`text-3xl font-black ${s.text}`}>{s.value}</p>
                    <p className="mt-1 text-sm font-semibold text-gray-700">{s.label}</p>
                    <p className="mt-0.5 text-xs text-gray-400">{s.sub}</p>
                  </div>
                ))}
              </div>

              {/* Current term + setup status row */}
              <div className="grid gap-4 lg:grid-cols-2">

                {/* Current Term */}
                <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-gray-700">Current Academic Term</h2>
                    <button onClick={() => setTab("terms")} className="text-xs font-medium text-emerald-600 hover:text-emerald-700">Manage →</button>
                  </div>
                  {currentTerm ? (
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-xl">📅</div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-gray-900">{currentTerm.name}</p>
                        <p className="text-sm text-gray-500">
                          {new Date(currentTerm.start_date).toLocaleDateString("en-KE", { day: "numeric", month: "long", year: "numeric" })}
                          {" — "}
                          {new Date(currentTerm.end_date).toLocaleDateString("en-KE", { day: "numeric", month: "long", year: "numeric" })}
                        </p>
                      </div>
                      <span className="shrink-0 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">Active</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 rounded-lg bg-amber-50 px-4 py-3">
                      <span className="text-lg">⚠️</span>
                      <p className="text-sm text-amber-700">
                        No active term set.{" "}
                        <button onClick={() => setTab("terms")} className="font-semibold underline-offset-2 hover:underline">Set one now</button>.
                      </p>
                    </div>
                  )}
                  {terms.length > 0 && (
                    <div className="mt-4 space-y-1.5 border-t border-gray-100 pt-4">
                      {terms.map((t) => (
                        <div key={t.id} className="flex items-center justify-between text-xs text-gray-500">
                          <span className={t.is_current ? "font-semibold text-emerald-700" : ""}>{t.name}</span>
                          <span>{t.year}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* School setup status */}
                <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-gray-700">School Setup Status</h2>
                    <button onClick={() => setTab("school")} className="text-xs font-medium text-emerald-600 hover:text-emerald-700">Edit school →</button>
                  </div>
                  <div className="space-y-3">
                    {[
                      { label: "School name",     done: !!schoolName,                    action: () => setTab("school"),    hint: "Add your school name" },
                      { label: "School logo",     done: !!schoolLogo,                    action: () => setTab("school"),    hint: "Upload a logo" },
                      { label: "Academic term",   done: !!currentTerm,                   action: () => setTab("terms"),     hint: "Set a current term" },
                      { label: "Class levels",    done: (stats?.class_levels ?? 0) > 0,  action: () => setTab("classes"),   hint: "Add class levels" },
                      { label: "Subjects",        done: (stats?.subjects ?? 0) > 0,      action: () => setTab("subjects"),  hint: "Add subjects" },
                    ].map(({ label, done, action, hint }) => (
                      <div key={label} className="flex items-center gap-3">
                        <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${done ? "bg-emerald-100 text-emerald-600" : "bg-gray-100 text-gray-400"}`}>
                          {done ? "✓" : "!"}
                        </span>
                        <span className={`flex-1 text-sm ${done ? "text-gray-700" : "text-gray-400"}`}>{label}</span>
                        {!done && (
                          <button onClick={action} className="text-xs font-medium text-emerald-600 hover:text-emerald-700">{hint} →</button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Subjects quick view */}
              {subjects.length > 0 && (
                <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-gray-700">
                      Subjects <span className="ml-1.5 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-500">{subjects.filter(s => s.is_active).length} active</span>
                    </h2>
                    <button onClick={() => setTab("subjects")} className="text-xs font-medium text-emerald-600 hover:text-emerald-700">Manage →</button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {subjects.filter(s => s.is_active).slice(0, 20).map((s) => (
                      <span key={s.id} className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">{s.name}</span>
                    ))}
                    {subjects.filter(s => s.is_active).length > 20 && (
                      <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-400">+{subjects.filter(s => s.is_active).length - 20} more</span>
                    )}
                  </div>
                </div>
              )}

            </div>
          )}

          {/* ── CLASS LEVELS ── */}
          {tab === "classes" && (
            <div className="space-y-5">
              <p className="text-sm text-gray-500">These appear in the student sign-up form and teacher class creation.</p>
              <form onSubmit={addLevel} className="flex gap-3">
                <input type="text" value={newLevel} onChange={(e) => { setNewLevel(e.target.value); setAddErr(""); }}
                  placeholder="e.g. Grade 10 or Form 5" className={inputCls} />
                <button type="submit" disabled={saving}
                  className="shrink-0 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60">
                  {saving ? "Adding…" : "Add Level"}
                </button>
              </form>
              {addErr && <p className="text-sm text-red-500">{addErr}</p>}

              <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr className="border-b border-gray-200">
                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Order</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Name</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Status</th>
                      <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {classLevels.map((cl) => (
                      <tr key={cl.id} className="transition hover:bg-gray-50/60" style={{ opacity: cl.is_active ? 1 : 0.5 }}>
                        <td className="px-5 py-3.5 text-gray-400">{cl.sort_order}</td>
                        <td className="px-5 py-3.5 font-medium text-gray-800">
                          {editingLevel === cl.id ? (
                            <input autoFocus value={editLevelVal} onChange={(e) => setEditLevelVal(e.target.value)}
                              onKeyDown={(e) => { if (e.key === "Enter") saveEditLevel(cl.id); if (e.key === "Escape") setEditingLevel(null); }}
                              className="rounded-md border border-emerald-400 bg-white px-2 py-1 text-sm outline-none ring-1 ring-emerald-400/40" />
                          ) : cl.name}
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${cl.is_active ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${cl.is_active ? "bg-emerald-500" : "bg-gray-400"}`} />
                            {cl.is_active ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center justify-end gap-3">
                            {editingLevel === cl.id ? (
                              <button onClick={() => saveEditLevel(cl.id)} className="text-xs font-medium text-emerald-600 hover:text-emerald-700">Save</button>
                            ) : (
                              <button onClick={() => { setEditingLevel(cl.id); setEditLevelVal(cl.name); }} className="text-xs font-medium text-gray-500 hover:text-gray-700">Edit</button>
                            )}
                            <button onClick={() => toggleLevel(cl.id, !cl.is_active)} className={`text-xs font-medium ${cl.is_active ? "text-amber-500 hover:text-amber-600" : "text-emerald-600 hover:text-emerald-700"}`}>
                              {cl.is_active ? "Disable" : "Enable"}
                            </button>
                            <button onClick={() => deleteLevel(cl.id)} className="text-xs font-medium text-red-400 hover:text-red-500">Delete</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {classLevels.length === 0 && (
                      <tr><td colSpan={4} className="px-5 py-10 text-center text-sm text-gray-400">No class levels yet. Add one above.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── SUBJECTS ── */}
          {tab === "subjects" && (
            <div className="space-y-5">
              <p className="text-sm text-gray-500">Teachers pick from this list when creating a class. Disable to hide without deleting.</p>
              <form onSubmit={addSubject} className="flex gap-3">
                <input type="text" value={newSubject} onChange={(e) => { setNewSubject(e.target.value); setAddErr(""); }}
                  placeholder="e.g. French or Technical Drawing" className={inputCls} />
                <button type="submit" disabled={saving}
                  className="shrink-0 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60">
                  {saving ? "Adding…" : "Add Subject"}
                </button>
              </form>
              {addErr && <p className="text-sm text-red-500">{addErr}</p>}

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {subjects.map((s) => (
                  <div key={s.id} className={`group flex items-center justify-between rounded-xl border bg-white px-4 py-3 shadow-sm transition hover:shadow-md ${s.is_active ? "border-gray-200" : "border-gray-100 opacity-50"}`}>
                    <span className="text-sm font-medium text-gray-700">{s.name}</span>
                    <div className="flex gap-1.5 opacity-0 transition group-hover:opacity-100">
                      <button onClick={() => toggleSubject(s.id, !s.is_active)}
                        className={`rounded-md p-1 text-xs transition ${s.is_active ? "text-amber-500 hover:bg-amber-50" : "text-emerald-600 hover:bg-emerald-50"}`}
                        title={s.is_active ? "Disable" : "Enable"}>
                        {s.is_active ? "○" : "●"}
                      </button>
                      <button onClick={() => deleteSubject(s.id)} className="rounded-md p-1 text-xs text-red-400 transition hover:bg-red-50" title="Delete">✕</button>
                    </div>
                  </div>
                ))}
                {subjects.length === 0 && (
                  <div className="col-span-full py-10 text-center text-sm text-gray-400">No subjects yet. Add one above.</div>
                )}
              </div>
            </div>
          )}

          {/* ── TERMS ── */}
          {tab === "terms" && (
            <div className="space-y-5">
              <p className="text-sm text-gray-500">Set term dates for the school year. Mark one as current so it shows on the Overview.</p>

              <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="mb-4 text-sm font-semibold text-gray-700">Add New Term</h2>
                <form onSubmit={addTerm} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-gray-600">Term Name</label>
                      <input type="text" value={newTerm.name} onChange={(e) => setNewTerm((p) => ({ ...p, name: e.target.value }))} placeholder="e.g. Term 1 2026" className={inputCls} />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-gray-600">Year</label>
                      <input type="number" value={newTerm.year} onChange={(e) => setNewTerm((p) => ({ ...p, year: Number(e.target.value) }))} className={inputCls} />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-gray-600">Term Number</label>
                      <select value={newTerm.term_number} onChange={(e) => setNewTerm((p) => ({ ...p, term_number: Number(e.target.value) }))} className={selectCls}>
                        <option value={1}>1</option><option value={2}>2</option><option value={3}>3</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-gray-600">Start Date</label>
                      <input type="date" value={newTerm.start_date} onChange={(e) => setNewTerm((p) => ({ ...p, start_date: e.target.value }))} className={inputCls} />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-gray-600">End Date</label>
                      <input type="date" value={newTerm.end_date} onChange={(e) => setNewTerm((p) => ({ ...p, end_date: e.target.value }))} className={inputCls} />
                    </div>
                    <div className="flex items-end">
                      <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
                        <input type="checkbox" checked={newTerm.is_current} onChange={(e) => setNewTerm((p) => ({ ...p, is_current: e.target.checked }))}
                          className="h-4 w-4 rounded border-gray-300 accent-emerald-600" />
                        Mark as current
                      </label>
                    </div>
                  </div>
                  {addErr && <p className="text-sm text-red-500">{addErr}</p>}
                  <button type="submit" disabled={saving}
                    className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60">
                    {saving ? "Adding…" : "Add Term"}
                  </button>
                </form>
              </div>

              <div className="space-y-3">
                {terms.map((t) => (
                  <div key={t.id}
                    className={`flex items-center justify-between rounded-xl border bg-white p-5 shadow-sm transition hover:shadow-md ${t.is_current ? "border-emerald-200 ring-1 ring-emerald-200" : "border-gray-200"}`}>
                    <div className="flex items-center gap-4">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-xl text-lg ${t.is_current ? "bg-emerald-50" : "bg-gray-50"}`}>📅</div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-900">{t.name}</span>
                          {t.is_current && <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">Current</span>}
                        </div>
                        <p className="text-sm text-gray-500">
                          {new Date(t.start_date).toLocaleDateString("en-KE", { day: "numeric", month: "long" })}
                          {" — "}
                          {new Date(t.end_date).toLocaleDateString("en-KE", { day: "numeric", month: "long", year: "numeric" })}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {!t.is_current && (
                        <button onClick={() => setCurrentTerm(t.id)}
                          className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 transition hover:border-emerald-300 hover:text-emerald-700">
                          Set as current
                        </button>
                      )}
                      <button onClick={() => deleteTerm(t.id)}
                        className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-red-400 transition hover:border-red-200 hover:bg-red-50 hover:text-red-500">
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
                {terms.length === 0 && (
                  <div className="py-10 text-center text-sm text-gray-400">No terms yet. Add one above.</div>
                )}
              </div>
            </div>
          )}

          {/* ── SCHOOL SETTINGS ── */}
          {tab === "school" && (
            <div className="space-y-5">
              <p className="text-sm text-gray-500">Your school name and logo appear as a banner at the top of the home page.</p>

              <form onSubmit={saveSchoolSettings} className="space-y-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">School Name</label>
                  <input type="text" value={schoolNameInput} onChange={(e) => setSchoolNameInput(e.target.value)}
                    placeholder="e.g. Nairobi Primary School"
                    className={inputCls + " max-w-md"} />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">School Logo</label>
                  <p className="mb-3 text-xs text-gray-400">PNG, JPG, or SVG · max 200 KB</p>
                  <div className="flex items-start gap-5">
                    <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-gray-50">
                      {schoolLogoPreview
                        ? <img src={schoolLogoPreview} alt="Preview" className="h-16 w-16 rounded-lg object-contain" />
                        : <span className="text-2xl">🏫</span>
                      }
                    </div>
                    <div className="space-y-2">
                      <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                        </svg>
                        Upload logo
                        <input type="file" accept="image/*" onChange={handleLogoFile} className="hidden" />
                      </label>
                      {schoolLogoPreview && (
                        <button type="button" onClick={() => setSchoolLogoPreview("")}
                          className="block text-xs text-red-400 transition hover:text-red-500">
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 border-t border-gray-100 pt-5">
                  <button type="submit" disabled={schoolSaving}
                    className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60">
                    {schoolSaving ? "Saving…" : "Save changes"}
                  </button>
                  {schoolMsg && (
                    <span className={`text-sm font-medium ${schoolMsg === "Saved!" ? "text-emerald-600" : "text-red-500"}`}>
                      {schoolMsg === "Saved!" ? "✓ " : ""}{schoolMsg}
                    </span>
                  )}
                </div>
              </form>

              {(schoolName || schoolLogo) && (
                <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">Home page preview</p>
                  <div className="flex items-center gap-3 rounded-lg bg-gray-50 px-4 py-3">
                    {schoolLogo && <img src={schoolLogo} alt="" className="h-8 w-8 rounded-lg object-contain" />}
                    {schoolName && <span className="text-sm font-bold text-gray-800">{schoolName}</span>}
                  </div>
                </div>
              )}
            </div>
          )}

        </main>
      </div>
    </div>
  );
}
