import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import {
  AtSign, ArrowRight, BookOpen, CheckCircle2, Eye, EyeOff,
  GraduationCap, KeyRound, MessageSquare, PenTool, BarChart2,
  Presentation, Shield, Smartphone, Users, Video, Zap, Globe, ShieldCheck,
} from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { getDemoUsers, loginDemoUser } from "@/lib/api";
import { demoUsersFallback } from "@/lib/mock-data";
import type { DemoUser } from "@/lib/types";

const features = [
  {
    icon: Video, label: "Live HD Video",
    desc: "Crystal-clear streaming for up to 60 students with zero lag.",
    color: "#06b6d4", glow: "rgba(6,182,212,0.12)", border: "rgba(6,182,212,0.22)",
    cardBorder: "rgba(6,182,212,0.15)", cardBg: "rgba(6,182,212,0.04)",
  },
  {
    icon: MessageSquare, label: "Real-time Chat",
    desc: "Class-wide and private messages to keep every student engaged.",
    color: "#10b981", glow: "rgba(16,185,129,0.12)", border: "rgba(16,185,129,0.22)",
    cardBorder: "rgba(16,185,129,0.15)", cardBg: "rgba(16,185,129,0.04)",
  },
  {
    icon: PenTool, label: "Digital Whiteboard",
    desc: "Draw, annotate, and collaborate on a shared canvas in real time.",
    color: "#8b5cf6", glow: "rgba(139,92,246,0.12)", border: "rgba(139,92,246,0.22)",
    cardBorder: "rgba(139,92,246,0.15)", cardBg: "rgba(139,92,246,0.04)",
  },
  {
    icon: BarChart2, label: "Polls & Quizzes",
    desc: "Run instant polls or graded quizzes and see results live.",
    color: "#f59e0b", glow: "rgba(245,158,11,0.12)", border: "rgba(245,158,11,0.22)",
    cardBorder: "rgba(245,158,11,0.15)", cardBg: "rgba(245,158,11,0.04)",
  },
  {
    icon: Users, label: "Breakout Rooms",
    desc: "Split students into small groups for focused collaborative work.",
    color: "#ec4899", glow: "rgba(236,72,153,0.12)", border: "rgba(236,72,153,0.22)",
    cardBorder: "rgba(236,72,153,0.15)", cardBg: "rgba(236,72,153,0.04)",
  },
  {
    icon: BookOpen, label: "Course Materials",
    desc: "Upload notes, PDFs, and assignments in one organised library.",
    color: "#f97316", glow: "rgba(249,115,22,0.12)", border: "rgba(249,115,22,0.22)",
    cardBorder: "rgba(249,115,22,0.15)", cardBg: "rgba(249,115,22,0.04)",
  },
];

const stats = [
  { value: "500+",   label: "Active students",   gradient: "from-cyan-400 to-cyan-600",   shadow: "rgba(6,182,212,0.3)"   },
  { value: "50+",    label: "Verified teachers",  gradient: "from-emerald-400 to-teal-600", shadow: "rgba(16,185,129,0.3)"  },
  { value: "2,000+", label: "Classes delivered",  gradient: "from-violet-400 to-purple-600",shadow: "rgba(139,92,246,0.3)"  },
  { value: "100%",   label: "Mobile-friendly",    gradient: "from-amber-400 to-orange-500", shadow: "rgba(245,158,11,0.3)"  },
];

const trustItems = [
  { icon: Smartphone,  label: "Any phone or laptop", color: "text-cyan-400"    },
  { icon: Globe,       label: "Built for Africa",    color: "text-emerald-400" },
  { icon: ShieldCheck, label: "Secure sessions",     color: "text-violet-400"  },
  { icon: Zap,         label: "No downloads",        color: "text-amber-400"   },
];

function roleIcon(role: DemoUser["role"]) {
  if (role === "teacher") return Presentation;
  if (role === "student") return GraduationCap;
  return Shield;
}

function SignInCard({ users }: { users: DemoUser[] }) {
  const [, navigate] = useLocation();
  const [activeUser, setActiveUser] = useState(users[0]?.username ?? "");
  const [username, setUsername]     = useState(users[0]?.username ?? "");
  const [password, setPassword]     = useState("password123");
  const [showPw, setShowPw]         = useState(false);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState("");

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
    "w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm font-medium text-white placeholder:text-slate-500 outline-none transition focus:border-violet-400/60 focus:bg-white/8";

  return (
    /* Gradient border wrapper */
    <div className="relative rounded-3xl p-[1.5px]" style={{ background: "linear-gradient(135deg, rgba(6,182,212,0.6), rgba(139,92,246,0.5), rgba(236,72,153,0.4))" }}>
      <div
        className="relative overflow-hidden rounded-[22px] p-6 sm:p-8"
        style={{
          background: "linear-gradient(145deg, rgba(10,15,40,0.97) 0%, rgba(14,20,50,0.97) 100%)",
          backdropFilter: "blur(24px)",
        }}
      >
        {/* Inner colour glows */}
        <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-violet-500/20 blur-[40px]" aria-hidden />
        <div className="pointer-events-none absolute -bottom-8 -left-8 h-28 w-28 rounded-full bg-cyan-500/15 blur-[35px]" aria-hidden />

        {/* Header */}
        <div className="relative mb-6">
          <p className="mb-1 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-violet-300"
            style={{ background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.3)" }}>
            <Zap className="h-3 w-3" /> Sign in
          </p>
          <h2 className="mt-3 text-xl font-black tracking-tight text-white">Your class is one step away</h2>
          <p className="mt-1 text-[13px] text-slate-400">Tap a demo account or enter your credentials.</p>
        </div>

        {/* Demo users */}
        <div className="relative mb-5 space-y-2">
          {users.map((user, i) => {
            const selected = activeUser === user.username;
            const Icon = roleIcon(user.role);
            const avatarGrad = [
              "from-cyan-500 to-blue-600",
              "from-emerald-500 to-teal-600",
              "from-violet-500 to-purple-600",
            ][i % 3];
            return (
              <button
                key={user.username}
                type="button"
                onClick={() => { setActiveUser(user.username); setUsername(user.username); setPassword("password123"); }}
                className={`flex w-full items-center gap-3 rounded-2xl border px-3.5 py-2.5 text-left transition duration-200 ${
                  selected
                    ? "border-violet-500/40 bg-violet-500/10 shadow-[0_0_0_1px_rgba(139,92,246,0.2)]"
                    : "border-white/8 bg-white/3 hover:border-white/15 hover:bg-white/6"
                }`}
              >
                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white ${selected ? avatarGrad : "from-slate-700 to-slate-600"}`}>
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-semibold text-white">{user.full_name}</span>
                  <span className="block truncate text-[11px] text-slate-500">{user.email}</span>
                </span>
                {selected && <CheckCircle2 className="h-4 w-4 shrink-0 text-violet-400" />}
              </button>
            );
          })}
        </div>

        {/* Credentials */}
        <div className="relative mb-4 grid gap-3 sm:grid-cols-2">
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
              <button type="button" onClick={() => setShowPw((c) => !c)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 hover:text-violet-300">
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
          className="relative inline-flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl px-5 py-3 text-sm font-bold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
          style={{ background: "linear-gradient(135deg, #06b6d4 0%, #8b5cf6 55%, #ec4899 100%)", boxShadow: "0 8px 32px rgba(139,92,246,0.35)" }}
        >
          {loading ? "Signing in…" : (active?.username === username && active?.role === "teacher") ? "Open teacher room" : "Sign in"}
          <ArrowRight className="h-3.5 w-3.5" />
        </button>

        {/* Footer links */}
        <div className="mt-4 flex items-center justify-center gap-6 border-t border-white/8 pt-4 text-xs font-medium">
          <Link href="/register" className="text-cyan-400 transition hover:text-cyan-300">Create account</Link>
          <span className="text-slate-700">·</span>
          <Link href="/forgot-password" className="text-slate-500 transition hover:text-slate-300">Forgot password?</Link>
        </div>
      </div>
    </div>
  );
}

export function LandingPage() {
  const [users, setUsers] = useState<DemoUser[]>(demoUsersFallback);
  useEffect(() => { getDemoUsers().then(setUsers).catch(() => {}); }, []);

  return (
    <div className="min-h-screen w-full overflow-x-hidden" style={{ background: "linear-gradient(160deg, #060b18 0%, #09142a 45%, #0b1630 100%)" }}>

      {/* ── Rich multi-colour background glows ── */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
        <div className="absolute -left-48 -top-24 h-[700px] w-[700px] rounded-full bg-cyan-500/10 blur-[140px]" />
        <div className="absolute right-0 top-1/4 h-[500px] w-[500px] rounded-full bg-violet-600/10 blur-[120px]" />
        <div className="absolute bottom-0 left-1/3 h-[400px] w-[400px] rounded-full bg-emerald-500/8 blur-[110px]" />
        <div className="absolute -bottom-20 right-1/4 h-[450px] w-[450px] rounded-full bg-pink-600/8 blur-[130px]" />
        <div className="absolute left-1/2 top-2/3 h-64 w-64 -translate-x-1/2 rounded-full bg-amber-500/6 blur-[90px]" />
      </div>

      {/* Grid overlay */}
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.035]"
        style={{
          backgroundImage: "linear-gradient(rgba(139,92,246,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(139,92,246,0.8) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
        }}
        aria-hidden
      />

      <div className="relative mx-auto max-w-7xl px-5 sm:px-8 lg:px-12">

        {/* ── Navbar ── */}
        <nav className="flex items-center justify-between py-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl shadow-lg" style={{ background: "linear-gradient(135deg, #06b6d4, #8b5cf6)" }}>
              <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 text-white" aria-hidden>
                <path d="M12 3L2 8l10 5 10-5-10-5z" fill="currentColor" opacity=".95" />
                <path d="M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
                <path d="M2 16l10 5 10-5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeOpacity=".45" />
              </svg>
            </div>
            <span className="text-[18px] font-bold tracking-tight text-white">
              Elimu<span className="bg-gradient-to-r from-cyan-400 to-violet-400 bg-clip-text text-transparent">Pawa</span>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/register"
              className="hidden rounded-xl px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110 sm:block"
              style={{ background: "linear-gradient(135deg, rgba(6,182,212,0.2), rgba(139,92,246,0.2))", border: "1px solid rgba(139,92,246,0.3)" }}
            >
              Create account
            </Link>
            <ThemeToggle />
          </div>
        </nav>

        {/* ── Hero ── */}
        <div className="grid items-center gap-6 pb-10 pt-6 lg:grid-cols-[1fr_430px] lg:gap-14 lg:pb-16 lg:pt-10">

          {/* Left — copy */}
          <div className="space-y-7">
            <span
              className="inline-flex w-fit items-center gap-2 rounded-full px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.2em]"
              style={{ background: "linear-gradient(135deg, rgba(6,182,212,0.15), rgba(139,92,246,0.15))", border: "1px solid rgba(139,92,246,0.3)", color: "#c4b5fd" }}
            >
              <Zap className="h-3 w-3 text-cyan-400" /> Virtual classroom platform
            </span>

            <h1 className="text-[clamp(1.85rem,7vw,4rem)] font-black leading-[1.08] tracking-tight text-white">
              The classroom
              <br />
              <span style={{ background: "linear-gradient(90deg, #06b6d4 0%, #10b981 35%, #8b5cf6 70%, #ec4899 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                your students deserve.
              </span>
            </h1>

            <p className="max-w-[500px] text-[14px] leading-relaxed text-slate-400 sm:text-[16px]">
              Everything teachers and students need — live video, real-time chat, quizzes,
              polls, and a collaborative whiteboard — all in one focused screen built for Kenyan schools.
            </p>

            {/* Trust badges — each a different colour */}
            <div className="flex flex-wrap gap-2.5">
              {trustItems.map(({ icon: Icon, label, color }) => (
                <span
                  key={label}
                  className="flex items-center gap-2 rounded-full border border-white/8 bg-white/5 px-3.5 py-1.5 text-[12px] font-medium text-slate-300"
                >
                  <Icon className={`h-3.5 w-3.5 ${color}`} aria-hidden />
                  {label}
                </span>
              ))}
            </div>

            {/* Stats — each with its own gradient colour */}
            <div className="grid grid-cols-2 gap-3 pt-1 sm:grid-cols-4">
              {stats.map(({ value, label, gradient, shadow }) => (
                <div
                  key={label}
                  className="rounded-2xl p-[1px]"
                  style={{ background: `linear-gradient(135deg, ${shadow.replace("0.3", "0.5")}, transparent)` }}
                >
                  <div className="rounded-[14px] px-4 py-3.5" style={{ background: "rgba(10,15,35,0.9)" }}>
                    <p className={`bg-gradient-to-r ${gradient} bg-clip-text text-[1.35rem] font-black leading-none text-transparent sm:text-[1.6rem]`}>
                      {value}
                    </p>
                    <p className="mt-1 text-[11px] font-medium text-slate-500">{label}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right — sign-in card */}
          <SignInCard users={users} />
        </div>

        {/* ── Coloured gradient divider ── */}
        <div className="h-px w-full" style={{ background: "linear-gradient(90deg, transparent, rgba(6,182,212,0.4), rgba(139,92,246,0.5), rgba(236,72,153,0.4), transparent)" }} />

        {/* ── Features ── */}
        <div className="py-14 lg:py-20">
          <div className="mb-12 text-center">
            <p
              className="mb-3 inline-block text-[11px] font-bold uppercase tracking-[0.22em]"
              style={{ background: "linear-gradient(90deg, #06b6d4, #8b5cf6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}
            >
              Everything in one place
            </p>
            <h2 className="text-[clamp(1.4rem,4vw,2.4rem)] font-black tracking-tight text-white">
              One screen. Every tool your class needs.
            </h2>
            <p className="mx-auto mt-3 max-w-[460px] text-[13px] text-slate-400 sm:text-[15px]">
              No juggling between apps. No complicated setup. Just open ElimuPawa and start learning.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map(({ icon: Icon, label, desc, color, glow, border, cardBorder, cardBg }) => (
              <div
                key={label}
                className="group relative overflow-hidden rounded-2xl p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
                style={{ background: cardBg, border: `1px solid ${cardBorder}` }}
              >
                {/* Per-card corner glow */}
                <div className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full blur-[30px]" style={{ background: glow }} aria-hidden />
                <span
                  className="relative mb-4 flex h-10 w-10 items-center justify-center rounded-xl"
                  style={{ background: glow, border: `1px solid ${border}`, color }}
                >
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
                <h3 className="relative mb-1.5 text-[13px] font-bold text-white sm:text-[15px]">{label}</h3>
                <p className="relative text-[12px] leading-relaxed text-slate-500 sm:text-[13px]">{desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Coloured footer divider ── */}
        <div className="h-px w-full" style={{ background: "linear-gradient(90deg, transparent, rgba(236,72,153,0.3), rgba(139,92,246,0.4), rgba(6,182,212,0.3), transparent)" }} />

        {/* ── Footer ── */}
        <div className="py-8 text-center">
          <p className="text-[12px] text-slate-700">
            © {new Date().getFullYear()} ElimuPawa · Built for learners everywhere
          </p>
        </div>
      </div>
    </div>
  );
}
