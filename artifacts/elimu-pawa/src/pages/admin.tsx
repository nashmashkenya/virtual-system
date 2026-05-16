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

/* ── Reusable small components ── */
function Badge({ label, active }: { label: string; active: boolean }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${active ? "bg-emerald-600/15 text-emerald-400" : "bg-slate-700/50 text-slate-500"}`}>
      {active ? "Active" : "Inactive"}
    </span>
  );
}

function StatCard({ label, value, icon }: { label: string; value: number; icon: string }) {
  return (
    <div className="rounded-2xl border border-slate-700/50 bg-slate-900 p-5">
      <div className="mb-2 text-2xl">{icon}</div>
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="mt-0.5 text-sm text-slate-400">{label}</p>
    </div>
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
      setSchoolMsg("Saved successfully!");
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
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  /* ── Login screen ── */
  if (!authed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
        <button onClick={() => navigate("/")} className="absolute left-5 top-5 flex items-center gap-2 rounded-xl border border-slate-700/50 bg-slate-800/60 px-3 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-700/60 hover:text-white">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4"><path fillRule="evenodd" d="M17 10a.75.75 0 0 1-.75.75H5.612l4.158 3.96a.75.75 0 1 1-1.04 1.08l-5.5-5.25a.75.75 0 0 1 0-1.08l5.5-5.25a.75.75 0 1 1 1.04 1.08L5.612 9.25H16.25A.75.75 0 0 1 17 10Z" clipRule="evenodd" /></svg>
          Home
        </button>
        <div className="w-full max-w-[400px] rounded-2xl border border-slate-700/50 bg-slate-900 p-8 shadow-2xl">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600/20 text-2xl">🔐</div>
            <h1 className="text-xl font-bold text-white">Admin Login</h1>
            <p className="mt-1 text-sm text-slate-400">ElimuPawa administration panel</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-300">Username</label>
              <input type="text" value={username} onChange={(e) => { setUsername(e.target.value); setLoginErr(""); }}
                className="w-full rounded-xl border border-slate-600 bg-slate-800 px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/40" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-300">Password</label>
              <input type="password" value={password} onChange={(e) => { setPassword(e.target.value); setLoginErr(""); }}
                className="w-full rounded-xl border border-slate-600 bg-slate-800 px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/40" />
            </div>
            {loginErr && <p className="text-sm text-red-400">{loginErr}</p>}
            <button type="submit" disabled={loggingIn} className="w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:opacity-60">
              {loggingIn ? "Signing in…" : "Sign In"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  const TABS = [
    { id: "overview", label: "Overview", icon: "📊" },
    { id: "classes", label: "Class Levels", icon: "🎒" },
    { id: "subjects", label: "Subjects", icon: "📚" },
    { id: "terms", label: "Academic Terms", icon: "📅" },
    { id: "school", label: "School", icon: "🏫" },
  ] as const;

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Navbar */}
      <header className="border-b border-slate-800 bg-slate-900/80 px-6 py-4 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.svg" alt="ElimuPawa" className="h-8 w-8" />
            <div>
              <span className="font-bold text-white">ElimuPawa</span>
              <span className="ml-2 rounded-lg bg-blue-600/20 px-2 py-0.5 text-xs font-medium text-blue-400">Admin</span>
            </div>
          </div>
          <button onClick={handleLogout} className="rounded-xl border border-slate-700 px-3 py-1.5 text-sm text-slate-300 transition hover:bg-slate-800 hover:text-white">
            Sign out
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-6 py-8">
        {/* Tab bar */}
        <div className="mb-8 flex gap-1 rounded-2xl border border-slate-800 bg-slate-900 p-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => { setTab(t.id); setAddErr(""); }}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition ${tab === t.id ? "bg-slate-700 text-white shadow-sm" : "text-slate-400 hover:text-slate-300"}`}
            >
              <span>{t.icon}</span>
              <span className="hidden sm:block">{t.label}</span>
            </button>
          ))}
        </div>

        {/* ── OVERVIEW ── */}
        {tab === "overview" && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-white">School Overview</h1>
              <p className="mt-1 text-sm text-slate-400">Live statistics across the platform</p>
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
              <StatCard label="Students" value={stats?.students ?? 0} icon="🎒" />
              <StatCard label="Teacher Classes" value={stats?.teacher_classes ?? 0} icon="🎓" />
              <StatCard label="Lessons Scheduled" value={stats?.lessons ?? 0} icon="📋" />
              <StatCard label="Active Subjects" value={stats?.subjects ?? 0} icon="📚" />
              <StatCard label="Class Levels" value={stats?.class_levels ?? 0} icon="🏫" />
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
              <h2 className="mb-4 font-semibold text-white">Current Academic Term</h2>
              {terms.find((t) => t.is_current) ? (() => {
                const t = terms.find((x) => x.is_current)!;
                return (
                  <div className="flex flex-col gap-1">
                    <p className="text-lg font-bold text-emerald-400">{t.name}</p>
                    <p className="text-sm text-slate-400">
                      {new Date(t.start_date).toLocaleDateString("en-KE", { day: "numeric", month: "long", year: "numeric" })}
                      {" — "}
                      {new Date(t.end_date).toLocaleDateString("en-KE", { day: "numeric", month: "long", year: "numeric" })}
                    </p>
                  </div>
                );
              })() : <p className="text-slate-400">No current term set. Go to Academic Terms to set one.</p>}
            </div>
          </div>
        )}

        {/* ── CLASS LEVELS ── */}
        {tab === "classes" && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-white">Class Levels</h1>
              <p className="mt-1 text-sm text-slate-400">These appear in the student sign-up form and teacher class creation. Order matters — drag to reorder or edit the sort position.</p>
            </div>

            {/* Add form */}
            <form onSubmit={addLevel} className="flex gap-3">
              <input
                type="text"
                value={newLevel}
                onChange={(e) => { setNewLevel(e.target.value); setAddErr(""); }}
                placeholder="e.g. Grade 10 or Form 5"
                className="flex-1 rounded-xl border border-slate-600 bg-slate-800 px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none focus:border-blue-500"
              />
              <button type="submit" disabled={saving} className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-60">
                {saving ? "Adding…" : "Add"}
              </button>
            </form>
            {addErr && <p className="text-sm text-red-400">{addErr}</p>}

            <div className="overflow-hidden rounded-2xl border border-slate-800">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900/60">
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">Order</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">Status</th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase text-slate-500">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 bg-slate-900">
                  {classLevels.map((cl) => (
                    <tr key={cl.id} className={cl.is_active ? "" : "opacity-50"}>
                      <td className="px-4 py-3 text-slate-500">{cl.sort_order}</td>
                      <td className="px-4 py-3 font-medium text-white">
                        {editingLevel === cl.id ? (
                          <input
                            autoFocus
                            value={editLevelVal}
                            onChange={(e) => setEditLevelVal(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter") saveEditLevel(cl.id); if (e.key === "Escape") setEditingLevel(null); }}
                            className="rounded-lg border border-blue-500 bg-slate-800 px-2 py-1 text-sm text-white outline-none"
                          />
                        ) : cl.name}
                      </td>
                      <td className="px-4 py-3"><Badge label="" active={cl.is_active} /></td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          {editingLevel === cl.id ? (
                            <button onClick={() => saveEditLevel(cl.id)} className="text-xs text-blue-400 hover:text-blue-300">Save</button>
                          ) : (
                            <button onClick={() => { setEditingLevel(cl.id); setEditLevelVal(cl.name); }} className="text-xs text-slate-400 hover:text-white">Edit</button>
                          )}
                          <button onClick={() => toggleLevel(cl.id, !cl.is_active)} className={`text-xs ${cl.is_active ? "text-amber-400 hover:text-amber-300" : "text-emerald-400 hover:text-emerald-300"}`}>
                            {cl.is_active ? "Disable" : "Enable"}
                          </button>
                          <button onClick={() => deleteLevel(cl.id)} className="text-xs text-red-400 hover:text-red-300">Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── SUBJECTS ── */}
        {tab === "subjects" && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-white">Subjects</h1>
              <p className="mt-1 text-sm text-slate-400">Teachers pick from this list when creating a class. Disable a subject to hide it without deleting.</p>
            </div>

            <form onSubmit={addSubject} className="flex gap-3">
              <input
                type="text"
                value={newSubject}
                onChange={(e) => { setNewSubject(e.target.value); setAddErr(""); }}
                placeholder="e.g. French or Technical Drawing"
                className="flex-1 rounded-xl border border-slate-600 bg-slate-800 px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none focus:border-blue-500"
              />
              <button type="submit" disabled={saving} className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-60">
                {saving ? "Adding…" : "Add"}
              </button>
            </form>
            {addErr && <p className="text-sm text-red-400">{addErr}</p>}

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {subjects.map((s) => (
                <div key={s.id} className={`group flex items-center justify-between rounded-xl border px-4 py-3 ${s.is_active ? "border-slate-700/50 bg-slate-900" : "border-slate-800 bg-slate-900/40 opacity-50"}`}>
                  <span className="font-medium text-white">{s.name}</span>
                  <div className="flex gap-2 opacity-0 transition group-hover:opacity-100">
                    <button onClick={() => toggleSubject(s.id, !s.is_active)} className={`text-xs ${s.is_active ? "text-amber-400" : "text-emerald-400"}`} title={s.is_active ? "Disable" : "Enable"}>
                      {s.is_active ? "○" : "●"}
                    </button>
                    <button onClick={() => deleteSubject(s.id)} className="text-xs text-red-400" title="Delete">✕</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── TERMS ── */}
        {tab === "terms" && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-white">Academic Terms</h1>
              <p className="mt-1 text-sm text-slate-400">Set term dates for the school year. Mark one as the current term so it shows on the overview.</p>
            </div>

            {/* Add term form */}
            <div className="rounded-2xl border border-blue-500/20 bg-blue-900/5 p-5">
              <h3 className="mb-4 font-medium text-white">Add Academic Term</h3>
              <form onSubmit={addTerm} className="space-y-3">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="col-span-2">
                    <label className="mb-1 block text-xs font-medium text-slate-400">Term Name</label>
                    <input
                      type="text"
                      value={newTerm.name}
                      onChange={(e) => setNewTerm((t) => ({ ...t, name: e.target.value }))}
                      placeholder="e.g. Term 1 2027"
                      className="w-full rounded-xl border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-400">Year</label>
                    <input
                      type="number"
                      value={newTerm.year}
                      onChange={(e) => setNewTerm((t) => ({ ...t, year: Number(e.target.value) }))}
                      className="w-full rounded-xl border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-400">Term No.</label>
                    <select
                      value={newTerm.term_number}
                      onChange={(e) => setNewTerm((t) => ({ ...t, term_number: Number(e.target.value) }))}
                      className="w-full rounded-xl border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
                    >
                      <option value={1}>Term 1</option>
                      <option value={2}>Term 2</option>
                      <option value={3}>Term 3</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-400">Start Date</label>
                    <input
                      type="date"
                      value={newTerm.start_date}
                      onChange={(e) => setNewTerm((t) => ({ ...t, start_date: e.target.value }))}
                      className="w-full rounded-xl border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white outline-none focus:border-blue-500 [color-scheme:dark]"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-400">End Date</label>
                    <input
                      type="date"
                      value={newTerm.end_date}
                      onChange={(e) => setNewTerm((t) => ({ ...t, end_date: e.target.value }))}
                      className="w-full rounded-xl border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white outline-none focus:border-blue-500 [color-scheme:dark]"
                    />
                  </div>
                  <div className="col-span-2 flex items-end">
                    <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-300">
                      <input
                        type="checkbox"
                        checked={newTerm.is_current}
                        onChange={(e) => setNewTerm((t) => ({ ...t, is_current: e.target.checked }))}
                        className="h-4 w-4 rounded accent-blue-500"
                      />
                      Set as current term
                    </label>
                  </div>
                </div>
                {addErr && <p className="text-sm text-red-400">{addErr}</p>}
                <button type="submit" disabled={saving} className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-60">
                  {saving ? "Adding…" : "Add Term"}
                </button>
              </form>
            </div>

            <div className="space-y-3">
              {terms.map((t) => (
                <div key={t.id} className={`flex flex-col gap-3 rounded-2xl border p-5 sm:flex-row sm:items-center sm:justify-between ${t.is_current ? "border-emerald-500/30 bg-emerald-900/10" : "border-slate-700/50 bg-slate-900"}`}>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-white">{t.name}</p>
                      {t.is_current && <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-xs font-medium text-white">Current</span>}
                    </div>
                    <p className="mt-0.5 text-sm text-slate-400">
                      {new Date(t.start_date).toLocaleDateString("en-KE", { day: "numeric", month: "long" })}
                      {" — "}
                      {new Date(t.end_date).toLocaleDateString("en-KE", { day: "numeric", month: "long", year: "numeric" })}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {!t.is_current && (
                      <button onClick={() => setCurrentTerm(t.id)} className="rounded-xl border border-emerald-600/30 px-3 py-1.5 text-xs font-medium text-emerald-400 transition hover:bg-emerald-900/20">
                        Set as current
                      </button>
                    )}
                    <button onClick={() => deleteTerm(t.id)} className="rounded-xl border border-red-600/20 px-3 py-1.5 text-xs font-medium text-red-400 transition hover:bg-red-900/10">
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {/* ── SCHOOL SETTINGS ── */}
        {tab === "school" && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-white">School Settings</h1>
              <p className="mt-1 text-sm text-slate-400">Set your school name and logo — they will appear on the home page</p>
            </div>

            <form onSubmit={saveSchoolSettings} className="space-y-6 rounded-2xl border border-slate-700/50 bg-slate-900 p-6">
              {/* School name */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-300">School Name</label>
                <input
                  type="text"
                  value={schoolNameInput}
                  onChange={(e) => setSchoolNameInput(e.target.value)}
                  placeholder="e.g. Nairobi Primary School"
                  className="w-full rounded-xl border border-slate-600 bg-slate-800 px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/40"
                />
              </div>

              {/* Logo upload */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-300">School Logo</label>
                <p className="mb-3 text-xs text-slate-500">PNG, JPG, or SVG · max 200 KB</p>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                  {/* Preview */}
                  <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl border border-slate-700 bg-slate-800">
                    {schoolLogoPreview ? (
                      <img src={schoolLogoPreview} alt="Logo preview" className="h-20 w-20 rounded-xl object-contain" />
                    ) : (
                      <span className="text-3xl">🏫</span>
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-600 bg-slate-800 px-4 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-slate-700 hover:text-white">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                      Upload Logo
                      <input type="file" accept="image/*" onChange={handleLogoFile} className="hidden" />
                    </label>
                    {schoolLogoPreview && (
                      <button
                        type="button"
                        onClick={() => setSchoolLogoPreview("")}
                        className="rounded-xl border border-red-600/20 px-4 py-2 text-xs font-medium text-red-400 transition hover:bg-red-900/10"
                      >
                        Remove logo
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-4 border-t border-slate-800 pt-5">
                <button
                  type="submit"
                  disabled={schoolSaving}
                  className="rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:opacity-60"
                >
                  {schoolSaving ? "Saving…" : "Save Settings"}
                </button>
                {schoolMsg && (
                  <span className={`text-sm font-medium ${schoolMsg.startsWith("Saved") ? "text-emerald-400" : "text-red-400"}`}>
                    {schoolMsg}
                  </span>
                )}
              </div>
            </form>

            {/* Live preview */}
            {(schoolName || schoolLogo) && (
              <div>
                <p className="mb-3 text-sm font-medium text-slate-400">Preview — how it appears on the home page</p>
                <div className="flex items-center gap-3 rounded-2xl border border-slate-700/50 bg-slate-900 px-5 py-4">
                  {schoolLogo ? (
                    <img src={schoolLogo} alt="School logo" className="h-10 w-10 rounded-xl object-contain" />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-600/20 text-xl">🏫</div>
                  )}
                  {schoolName && <span className="text-lg font-bold text-white">{schoolName}</span>}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
