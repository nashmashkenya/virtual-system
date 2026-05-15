import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import {
  AtSign,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Eye,
  EyeOff,
  GraduationCap,
  KeyRound,
  MessageSquare,
  PenTool,
  BarChart2,
  Presentation,
  Shield,
  Smartphone,
  Users,
  Video,
  Zap,
  Globe,
  ShieldCheck,
} from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { getDemoUsers, loginDemoUser } from "@/lib/api";
import { demoUsersFallback } from "@/lib/mock-data";
import type { DemoUser } from "@/lib/types";

const features = [
  { icon: Video,         label: "Live HD Video",       desc: "Crystal-clear streaming for up to 60 students with zero lag." },
  { icon: MessageSquare, label: "Real-time Chat",      desc: "Class-wide and private messages to keep every student engaged." },
  { icon: PenTool,       label: "Digital Whiteboard",  desc: "Draw, annotate, and collaborate on a shared canvas in real time." },
  { icon: BarChart2,     label: "Polls & Quizzes",     desc: "Run instant polls or graded quizzes and see results live." },
  { icon: Users,         label: "Breakout Rooms",      desc: "Split students into small groups for focused collaborative work." },
  { icon: BookOpen,      label: "Course Materials",    desc: "Upload notes, PDFs, and assignments in one organised library." },
];

const stats = [
  { value: "500+",   label: "Active students"    },
  { value: "50+",    label: "Verified teachers"  },
  { value: "2,000+", label: "Classes delivered"  },
  { value: "100%",   label: "Mobile-friendly"    },
];

const trustItems = [
  { icon: Smartphone,  label: "Any phone or laptop" },
  { icon: Globe,       label: "Built for Africa"    },
  { icon: ShieldCheck, label: "Secure sessions"     },
  { icon: Zap,         label: "No downloads"        },
];

function roleIcon(role: DemoUser["role"]) {
  if (role === "teacher") return Presentation;
  if (role === "student") return GraduationCap;
  return Shield;
}

function SignInCard({ users }: { users: DemoUser[] }) {
  const [, navigate] = useLocation();
  const [activeUser, setActiveUser] = useState(users[0]?.username ?? "");
  const [username, setUsername] = useState(users[0]?.username ?? "");
  const [password, setPassword] = useState("password123");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const active = useMemo(() => users.find((u) => u.username === activeUser), [users, activeUser]);

  useEffect(() => {
    if (users.length && !activeUser) {
      setActiveUser(users[0].username);
      setUsername(users[0].username);
    }
  }, [users]);

  const handleSignIn = async () => {
    if (!username.trim() || !password.trim()) { setError("Enter your username and password."); return; }
    setLoading(true); setError("");
    try {
      const result = await loginDemoUser({ username: username.trim(), password });
      navigate(result.user.role === "teacher" ? "/teacher" : "/student");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to sign in right now.");
    } finally { setLoading(false); }
  };

  const inputCls =
    "w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm font-medium text-white placeholder:text-slate-500 outline-none transition focus:border-cyan-500/60 focus:bg-white/8";

  return (
    <div
      className="w-full rounded-3xl p-6 sm:p-8"
      style={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.10)",
        backdropFilter: "blur(20px)",
        boxShadow: "0 32px 80px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.06)",
      }}
    >
      {/* Header */}
      <div className="mb-6">
        <p className="mb-1 inline-flex items-center gap-1.5 rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-300">
          <Zap className="h-3 w-3" aria-hidden /> Sign in
        </p>
        <h2 className="mt-3 text-xl font-black tracking-tight text-white">Your class is one step away</h2>
        <p className="mt-1 text-[13px] text-slate-400">Tap a demo account or enter your credentials.</p>
      </div>

      {/* Demo users */}
      <div className="mb-5 space-y-2">
        {users.map((user) => {
          const selected = activeUser === user.username;
          const Icon = roleIcon(user.role);
          return (
            <button
              key={user.username}
              type="button"
              onClick={() => { setActiveUser(user.username); setUsername(user.username); setPassword("password123"); }}
              className={`flex w-full items-center gap-3 rounded-2xl border px-3.5 py-2.5 text-left transition duration-200 ${
                selected
                  ? "border-cyan-500/40 bg-cyan-500/12 shadow-[0_0_0_1px_rgba(6,182,212,0.25)]"
                  : "border-white/8 bg-white/3 hover:border-white/15 hover:bg-white/6"
              }`}
            >
              <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition ${selected ? "bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow" : "bg-white/10 text-slate-400"}`}>
                <Icon className="h-3.5 w-3.5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-semibold text-white">{user.full_name}</span>
                <span className="block truncate text-[11px] text-slate-500">{user.email}</span>
              </span>
              {selected && <CheckCircle2 className="h-4 w-4 shrink-0 text-cyan-400" />}
            </button>
          );
        })}
      </div>

      {/* Credentials */}
      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Username</label>
          <div className="relative">
            <AtSign className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" placeholder="grace.teacher" className={`${inputCls} pl-9`} />
          </div>
        </div>
        <div>
          <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Password</label>
          <div className="relative">
            <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input type={showPw ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" placeholder="••••••" className={`${inputCls} pl-9 pr-10`} />
            <button type="button" onClick={() => setShowPw((c) => !c)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 hover:text-cyan-300">
              {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <p className="mb-3 rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-center text-xs font-medium text-rose-300">{error}</p>
      )}

      {/* CTA */}
      <button
        type="button"
        onClick={handleSignIn}
        disabled={loading || users.length === 0}
        className="inline-flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-bold text-white shadow-lg transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
        style={{ background: "linear-gradient(135deg, #06b6d4 0%, #3b82f6 60%, #6366f1 100%)", boxShadow: "0 8px 32px rgba(6,182,212,0.25)" }}
      >
        {loading ? "Signing in…" :
          (active?.username === username && active?.role === "teacher") ? "Open teacher room" : "Sign in"}
        <ArrowRight className="h-3.5 w-3.5" />
      </button>

      {/* Footer links */}
      <div className="mt-4 flex items-center justify-center gap-6 border-t border-white/8 pt-4 text-xs font-medium">
        <Link href="/register" className="text-cyan-400 transition hover:text-cyan-300">Create account</Link>
        <span className="text-slate-700">·</span>
        <Link href="/forgot-password" className="text-slate-500 transition hover:text-slate-300">Forgot password?</Link>
      </div>
    </div>
  );
}

export function LandingPage() {
  const [users, setUsers] = useState<DemoUser[]>(demoUsersFallback);

  useEffect(() => {
    getDemoUsers().then(setUsers).catch(() => {});
  }, []);

  return (
    <div
      className="min-h-screen w-full overflow-x-hidden"
      style={{ background: "linear-gradient(160deg, #060d1f 0%, #0b1a35 50%, #0d1e3a 100%)" }}
    >
      {/* Decorative glows */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
        <div className="absolute -left-40 -top-20 h-[600px] w-[600px] rounded-full bg-cyan-500/8 blur-[130px]" />
        <div className="absolute -bottom-40 right-0 h-[500px] w-[500px] rounded-full bg-indigo-500/8 blur-[120px]" />
        <div className="absolute left-1/2 top-1/3 h-96 w-96 -translate-x-1/2 rounded-full bg-emerald-500/5 blur-[100px]" />
      </div>

      {/* Grid overlay */}
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.04]"
        style={{
          backgroundImage: "linear-gradient(rgba(6,182,212,1) 1px, transparent 1px), linear-gradient(90deg, rgba(6,182,212,1) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
        }}
        aria-hidden
      />

      <div className="relative mx-auto max-w-7xl px-5 sm:px-8 lg:px-12">

        {/* ── Navbar ── */}
        <nav className="flex items-center justify-between py-6">
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-2xl shadow-lg"
              style={{ background: "linear-gradient(135deg, #06b6d4, #3b82f6)" }}
            >
              <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 text-white" aria-hidden>
                <path d="M12 3L2 8l10 5 10-5-10-5z" fill="currentColor" opacity=".95" />
                <path d="M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
                <path d="M2 16l10 5 10-5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeOpacity=".45" />
              </svg>
            </div>
            <span className="text-[18px] font-bold tracking-tight text-white">
              Elimu<span className="text-cyan-400">Pawa</span>
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/register" className="hidden rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-300 transition hover:bg-white/10 sm:block">
              Create account
            </Link>
            <ThemeToggle />
          </div>
        </nav>

        {/* ── Hero ── */}
        <div className="grid items-center gap-10 pb-10 pt-8 lg:grid-cols-[1fr_420px] lg:gap-16 lg:pb-16 lg:pt-12">

          {/* Left — copy */}
          <div className="space-y-7">
            <span
              className="inline-flex w-fit items-center gap-2 rounded-full px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-cyan-300"
              style={{ background: "rgba(6,182,212,0.12)", border: "1px solid rgba(6,182,212,0.25)" }}
            >
              <Zap className="h-3 w-3" aria-hidden /> Virtual classroom platform
            </span>

            <h1 className="text-[clamp(2.6rem,5.5vw,4rem)] font-black leading-[1.03] tracking-tight text-white">
              The classroom
              <br />
              <span style={{ background: "linear-gradient(90deg, #06b6d4 0%, #34d399 55%, #a78bfa 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                your students deserve.
              </span>
            </h1>

            <p className="max-w-[500px] text-[16px] leading-relaxed text-slate-400">
              Everything teachers and students need — live video, real-time chat, quizzes,
              polls, and a collaborative whiteboard — all in one focused screen built for Africa.
            </p>

            <div className="flex flex-wrap gap-2.5">
              {trustItems.map(({ icon: Icon, label }) => (
                <span key={label} className="flex items-center gap-2 rounded-full border border-white/8 bg-white/5 px-3.5 py-1.5 text-[12px] font-medium text-slate-400">
                  <Icon className="h-3.5 w-3.5 text-emerald-400" aria-hidden />
                  {label}
                </span>
              ))}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3 pt-1 sm:grid-cols-4">
              {stats.map(({ value, label }) => (
                <div
                  key={label}
                  className="rounded-2xl px-4 py-3.5"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
                >
                  <p className="text-[1.6rem] font-black leading-none text-white">{value}</p>
                  <p className="mt-1 text-[11px] font-medium text-slate-500">{label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Right — sign-in card */}
          <SignInCard users={users} />
        </div>

        {/* ── Divider ── */}
        <div className="border-t border-white/6" />

        {/* ── Features ── */}
        <div className="py-14 lg:py-20">
          <div className="mb-10 text-center">
            <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.22em] text-cyan-500">Everything in one place</p>
            <h2 className="text-[clamp(1.6rem,3vw,2.4rem)] font-black tracking-tight text-white">
              One screen. Every tool your class needs.
            </h2>
            <p className="mx-auto mt-3 max-w-[480px] text-[15px] text-slate-400">
              No juggling between apps. No complicated setup. Just open ElimuPawa and start learning.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map(({ icon: Icon, label, desc }) => (
              <div
                key={label}
                className="group rounded-2xl p-5 transition-all hover:scale-[1.02]"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
              >
                <span
                  className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl text-cyan-400"
                  style={{ background: "rgba(6,182,212,0.1)", border: "1px solid rgba(6,182,212,0.2)" }}
                >
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
                <h3 className="mb-1.5 text-[15px] font-bold text-white">{label}</h3>
                <p className="text-[13px] leading-relaxed text-slate-500">{desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="border-t border-white/6 py-8 text-center">
          <p className="text-[12px] text-slate-700">
            © {new Date().getFullYear()} ElimuPawa · Built for learners everywhere
          </p>
        </div>

      </div>
    </div>
  );
}
