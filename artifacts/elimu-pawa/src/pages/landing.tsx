import { Link } from "wouter";
import { useEffect, useState } from "react";
import {
  ArrowRight, BookOpen,
  BarChart2, MessageSquare, PenTool,
  Smartphone, Users, Video, Zap, Globe, ShieldCheck,
} from "lucide-react";

const API = import.meta.env.VITE_API_BASE_URL ?? "";

async function fetchSchool(): Promise<{ school_name: string; school_logo: string }> {
  try {
    const r = await fetch(`${API}/api/public/school`);
    if (!r.ok) return { school_name: "", school_logo: "" };
    return r.json() as Promise<{ school_name: string; school_logo: string }>;
  } catch {
    return { school_name: "", school_logo: "" };
  }
}

interface PlatformStats { students: number; lessons: number; subjects: number; class_levels: number }
async function fetchStats(): Promise<PlatformStats> {
  try {
    const r = await fetch(`${API}/api/public/stats`);
    if (!r.ok) return { students: 0, lessons: 0, subjects: 0, class_levels: 0 };
    return r.json() as Promise<PlatformStats>;
  } catch {
    return { students: 0, lessons: 0, subjects: 0, class_levels: 0 };
  }
}

const features = [
  { icon: Video,         label: "Live HD Video",      desc: "Crystal-clear streaming for up to 60 students with zero lag.",             color: "#0ea5e9", bg: "rgba(14,165,233,0.12)",  border: "rgba(14,165,233,0.25)" },
  { icon: MessageSquare, label: "Real-time Chat",      desc: "Class-wide and private messages to keep every student engaged.",           color: "#10b981", bg: "rgba(16,185,129,0.12)", border: "rgba(16,185,129,0.25)" },
  { icon: PenTool,       label: "Digital Whiteboard",  desc: "Draw, annotate, and collaborate on a shared canvas in real time.",         color: "#8b5cf6", bg: "rgba(139,92,246,0.12)", border: "rgba(139,92,246,0.25)" },
  { icon: BarChart2,     label: "Polls & Quizzes",     desc: "Run instant polls or graded quizzes and see results live.",                color: "#f59e0b", bg: "rgba(245,158,11,0.12)", border: "rgba(245,158,11,0.25)" },
  { icon: Users,         label: "Breakout Rooms",      desc: "Split students into small groups for focused collaborative work.",          color: "#ec4899", bg: "rgba(236,72,153,0.12)", border: "rgba(236,72,153,0.25)" },
  { icon: BookOpen,      label: "Course Materials",    desc: "Upload notes, PDFs, and assignments in one organised library.",            color: "#f97316", bg: "rgba(249,115,22,0.12)",  border: "rgba(249,115,22,0.25)" },
];


const trustItems = [
  { icon: Smartphone,  label: "Any phone",      color: "#0ea5e9" },
  { icon: Globe,       label: "Built for Africa", color: "#10b981" },
  { icon: ShieldCheck, label: "Secure",           color: "#8b5cf6" },
  { icon: Zap,         label: "No downloads",     color: "#f59e0b" },
];

const glass = {
  card: {
    background: "rgba(255,255,255,0.55)",
    backdropFilter: "blur(24px)",
    WebkitBackdropFilter: "blur(24px)",
    border: "1px solid rgba(255,255,255,0.7)",
    boxShadow: "0 8px 32px rgba(80,60,140,0.08), 0 1.5px 0 rgba(255,255,255,0.9) inset",
  } as React.CSSProperties,
  strong: {
    background: "rgba(255,255,255,0.72)",
    backdropFilter: "blur(32px)",
    WebkitBackdropFilter: "blur(32px)",
    border: "1px solid rgba(255,255,255,0.8)",
    boxShadow: "0 12px 48px rgba(80,60,140,0.1), 0 1.5px 0 rgba(255,255,255,1) inset",
  } as React.CSSProperties,
  subtle: {
    background: "rgba(255,255,255,0.38)",
    backdropFilter: "blur(12px)",
    WebkitBackdropFilter: "blur(12px)",
    border: "1px solid rgba(255,255,255,0.58)",
  } as React.CSSProperties,
};

export function LandingPage() {
  const [schoolName, setSchoolName] = useState("");
  const [schoolLogo, setSchoolLogo] = useState("");
  const [platformStats, setPlatformStats] = useState<PlatformStats | null>(null);

  useEffect(() => {
    fetchSchool().then((d) => { setSchoolName(d.school_name); setSchoolLogo(d.school_logo); });
    fetchStats().then(setPlatformStats);
  }, []);

  return (
    <div
      className="min-h-screen w-full overflow-x-hidden"
      style={{ background: "linear-gradient(160deg, #daf0ff 0%, #e8e0ff 28%, #fce8f5 55%, #d9f5ec 80%, #fdf8e8 100%)" }}
    >
      {/* Blobs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
        <div className="absolute -left-40 -top-20 h-[600px] w-[600px] rounded-full bg-sky-400/20 blur-[120px]" />
        <div className="absolute right-0 top-1/4 h-[500px] w-[500px] rounded-full bg-violet-400/15 blur-[110px]" />
        <div className="absolute bottom-10 left-1/4 h-[400px] w-[400px] rounded-full bg-emerald-400/15 blur-[100px]" />
        <div className="absolute -bottom-10 right-1/3 h-[380px] w-[380px] rounded-full bg-pink-400/15 blur-[110px]" />
      </div>
      {/* Dot grid */}
      <div className="pointer-events-none fixed inset-0 opacity-[0.04]"
        style={{ backgroundImage: "radial-gradient(circle, #6366f1 1px, transparent 1px)", backgroundSize: "36px 36px" }}
        aria-hidden />

      {/* ══════════════════════════════════════════
          SCHOOL HERO BANNER — edge-to-edge on mobile
      ══════════════════════════════════════════ */}
      {(schoolName || schoolLogo) && (
        <div
          className="relative w-full overflow-hidden px-5 py-5 pt-10 sm:mx-auto sm:mt-5 sm:max-w-7xl sm:rounded-2xl sm:px-10 sm:py-7"
          style={{
            background: "linear-gradient(135deg, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0.6) 100%)",
            backdropFilter: "blur(32px)",
            WebkitBackdropFilter: "blur(32px)",
            borderBottom: "1.5px solid rgba(255,255,255,0.85)",
            boxShadow: "0 8px 40px rgba(80,60,180,0.1)",
          }}
        >
          {/* Rainbow shimmer */}
          <div
            className="pointer-events-none absolute inset-0 opacity-40"
            style={{ background: "linear-gradient(135deg, rgba(14,165,233,0.08) 0%, rgba(139,92,246,0.08) 40%, rgba(236,72,153,0.06) 70%, rgba(16,185,129,0.06) 100%)" }}
            aria-hidden
          />

          <div className="relative flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
            {schoolLogo && (
              <div className="relative shrink-0">
                <div className="absolute inset-0 rounded-2xl opacity-50 blur-xl"
                  style={{ background: "linear-gradient(135deg,#0ea5e9,#8b5cf6)" }} aria-hidden />
                <img
                  src={schoolLogo} alt="School logo"
                  className="relative h-20 w-20 rounded-2xl object-contain shadow-xl sm:h-20 sm:w-20"
                  style={{ border: "2.5px solid rgba(255,255,255,0.95)" }}
                />
              </div>
            )}
            <div className="flex-1">
              {schoolName && (
                <h2
                  className="text-[1.6rem] font-black tracking-tight leading-tight sm:text-3xl"
                  style={{ background: "linear-gradient(90deg, #0ea5e9 0%, #6366f1 40%, #8b5cf6 70%, #ec4899 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}
                >
                  {schoolName}
                </h2>
              )}
              <p className="mt-1 text-[13px] font-medium text-slate-500">
                Powered by <span className="font-bold text-violet-600">ElimuPawa</span> · Digital Classroom Platform
              </p>
            </div>
            <div className="flex w-full gap-2 sm:w-auto sm:shrink-0">
              <Link
                href="/student/sign-in"
                className="flex-1 rounded-2xl py-3 text-center text-[14px] font-bold text-white transition active:scale-95 sm:flex-none sm:px-5 sm:py-2"
                style={{ background: "linear-gradient(135deg, #0ea5e9, #6366f1)", boxShadow: "0 4px 16px rgba(99,102,241,0.35)" }}
              >
                Student Login
              </Link>
              <Link
                href="/teacher/sign-in"
                className="flex-1 rounded-2xl py-3 text-center text-[14px] font-bold transition active:scale-95 sm:flex-none sm:px-5 sm:py-2"
                style={{ background: "rgba(255,255,255,0.75)", border: "1px solid rgba(99,102,241,0.25)", color: "#6366f1" }}
              >
                Teacher Login
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════
          STICKY NAVBAR — edge-to-edge on mobile
      ══════════════════════════════════════════ */}
      <nav
        className="sticky top-0 z-50 flex items-center justify-between px-5 py-3.5 sm:mx-auto sm:my-4 sm:max-w-7xl sm:rounded-2xl sm:px-6 sm:py-3"
        style={{
          background: "rgba(255,255,255,0.72)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderBottom: "1px solid rgba(255,255,255,0.8)",
          boxShadow: "0 2px 20px rgba(80,60,140,0.07)",
        }}
      >
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl shadow-md"
            style={{ background: "linear-gradient(135deg, #0ea5e9, #8b5cf6)" }}>
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 text-white" aria-hidden>
              <path d="M12 3L2 8l10 5 10-5-10-5z" fill="currentColor" opacity=".95" />
              <path d="M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
              <path d="M2 16l10 5 10-5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeOpacity=".45" />
            </svg>
          </div>
          <span className="text-[16px] font-bold tracking-tight text-slate-800">
            Elimu<span style={{ background: "linear-gradient(90deg,#0ea5e9,#8b5cf6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Pawa</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/student/sign-in"
            className="hidden rounded-xl px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-white/60 sm:block"
            style={{ border: "1px solid rgba(100,80,200,0.2)" }}
          >
            Sign in
          </Link>
          <Link
            href="/student/sign-up"
            className="rounded-xl px-4 py-2 text-[13px] font-bold text-white transition active:scale-95"
            style={{ background: "linear-gradient(135deg, #0ea5e9, #8b5cf6)", boxShadow: "0 4px 12px rgba(99,102,241,0.3)" }}
          >
            Get started
          </Link>
        </div>
      </nav>

      {/* ══════════════════════════════════════════
          CONTENT — px-5 only on inner sections
      ══════════════════════════════════════════ */}
      <div className="relative mx-auto max-w-7xl">

        {/* HERO */}
        <div className="grid items-center gap-6 px-5 pb-8 pt-6 lg:grid-cols-[1fr_400px] lg:gap-12 lg:px-12 lg:pb-16 lg:pt-10">

          {/* Left — copy */}
          <div className="space-y-5">
            <span className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-violet-700"
              style={glass.subtle}>
              <Zap className="h-3 w-3 text-sky-500" /> Virtual classroom platform
            </span>

            <h1 className="text-[clamp(1.9rem,8vw,4rem)] font-black leading-[1.06] tracking-tight text-slate-900">
              The classroom
              <br />
              <span style={{ background: "linear-gradient(90deg, #0ea5e9 0%, #10b981 35%, #8b5cf6 70%, #ec4899 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                your students deserve.
              </span>
            </h1>

            <p className="text-[15px] leading-relaxed text-slate-600 sm:max-w-[500px]">
              Live video, real-time chat, quizzes, polls, and a collaborative whiteboard — all in one screen built for Kenyan schools.
            </p>

            {/* Trust badges */}
            <div className="flex flex-wrap gap-2">
              {trustItems.map(({ icon: Icon, label, color }) => (
                <span key={label} className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-semibold text-slate-600"
                  style={glass.subtle}>
                  <Icon className="h-3.5 w-3.5" style={{ color }} aria-hidden />
                  {label}
                </span>
              ))}
            </div>

            {/* Stats — 4 across, real live data */}
            <div className="grid grid-cols-4 gap-2 pt-1 sm:gap-3">
              {[
                { value: platformStats?.students   ?? "…", label: "Students",     color: "#0ea5e9" },
                { value: platformStats?.class_levels ?? "…", label: "Class Levels", color: "#8b5cf6" },
                { value: platformStats?.subjects   ?? "…", label: "Subjects",     color: "#10b981" },
                { value: platformStats?.lessons    ?? "…", label: "Lessons",      color: "#f59e0b" },
              ].map(({ value, label, color }) => (
                <div key={label} className="rounded-2xl px-2 py-3 text-center" style={glass.card}>
                  <p className="text-[1.3rem] font-black leading-none sm:text-[1.5rem]" style={{ color }}>{value}</p>
                  <p className="mt-1 text-[10px] font-semibold text-slate-500 sm:text-[11px]">{label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Right — CTA card: full-width on mobile, card on desktop */}
          <div
            className="rounded-3xl px-5 py-6 sm:p-7"
            style={glass.strong}
          >
            <div className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-violet-400/15 blur-[50px]" aria-hidden />
            <div className="pointer-events-none absolute -bottom-6 -left-6 h-32 w-32 rounded-full bg-sky-400/15 blur-[40px]" aria-hidden />
            <div className="relative">
              <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-violet-600"
                style={{ background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.2)" }}>
                <Zap className="h-3 w-3" /> Get started
              </span>
              <h2 className="mt-3 text-[1.2rem] font-black tracking-tight text-slate-900 sm:text-xl">Who are you joining as?</h2>
              <p className="mt-1 text-[13px] text-slate-500">Choose your role to get to the right sign-in page.</p>
            </div>

            <div className="relative mt-5 space-y-3">
              <Link
                href="/student/sign-in"
                className="flex w-full items-center gap-4 rounded-2xl p-4 transition active:scale-[.98]"
                style={{ background: "linear-gradient(135deg, rgba(16,185,129,0.12) 0%, rgba(14,165,233,0.08) 100%)", border: "1px solid rgba(16,185,129,0.25)" }}
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-2xl"
                  style={{ background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.3)" }}>📚</div>
                <div className="flex-1 text-left">
                  <p className="text-[15px] font-bold text-slate-800">I am a Student</p>
                  <p className="mt-0.5 text-[12px] text-slate-500">Sign in with ADM No &amp; password</p>
                </div>
                <ArrowRight className="h-5 w-5 shrink-0 text-emerald-500" />
              </Link>

              <Link
                href="/teacher/sign-in"
                className="flex w-full items-center gap-4 rounded-2xl p-4 transition active:scale-[.98]"
                style={{ background: "linear-gradient(135deg, rgba(139,92,246,0.12) 0%, rgba(236,72,153,0.06) 100%)", border: "1px solid rgba(139,92,246,0.25)" }}
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-2xl"
                  style={{ background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.3)" }}>🎓</div>
                <div className="flex-1 text-left">
                  <p className="text-[15px] font-bold text-slate-800">I am a Teacher</p>
                  <p className="mt-0.5 text-[12px] text-slate-500">Sign in with email or Google</p>
                </div>
                <ArrowRight className="h-5 w-5 shrink-0 text-violet-500" />
              </Link>
            </div>

            <p className="relative mt-5 text-center text-[11px] text-slate-400">
              Used by schools across Kenya · Secure · No credit card needed
            </p>
          </div>
        </div>

        {/* Divider */}
        <div className="mx-5 h-px rounded-full sm:mx-12"
          style={{ background: "linear-gradient(90deg, transparent, rgba(14,165,233,0.4), rgba(139,92,246,0.5), rgba(236,72,153,0.4), transparent)" }} />

        {/* FEATURES */}
        <div className="px-5 py-10 lg:px-12 lg:py-16">
          <div className="mb-8 text-center sm:mb-12">
            <span className="mb-3 inline-block rounded-full px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.22em] text-violet-700"
              style={glass.subtle}>
              Everything in one place
            </span>
            <h2 className="text-[clamp(1.4rem,5vw,2.4rem)] font-black tracking-tight text-slate-900">
              One screen. Every tool your class needs.
            </h2>
            <p className="mx-auto mt-2 max-w-[460px] text-[13px] text-slate-500 sm:text-[14px]">
              No juggling between apps. No complicated setup. Just open ElimuPawa and start learning.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
            {features.map(({ icon: Icon, label, desc, color, bg, border }) => (
              <div
                key={label}
                className="group relative overflow-hidden rounded-2xl p-5 transition-all duration-300 active:scale-[.98]"
                style={{ ...glass.card, border: `1px solid ${border}` }}
              >
                <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full blur-[40px]"
                  style={{ background: bg }} aria-hidden />
                <span className="relative mb-4 flex h-11 w-11 items-center justify-center rounded-xl"
                  style={{ background: bg, border: `1px solid ${border}`, color }}>
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
                <h3 className="relative mb-1.5 text-[14px] font-bold text-slate-800">{label}</h3>
                <p className="relative text-[13px] leading-relaxed text-slate-500">{desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div className="mx-5 h-px rounded-full sm:mx-12"
          style={{ background: "linear-gradient(90deg, transparent, rgba(236,72,153,0.3), rgba(139,92,246,0.4), rgba(14,165,233,0.3), transparent)" }} />

        {/* FOOTER */}
        <div className="px-5 py-8 text-center">
          <p className="text-[12px] text-slate-400">
            © {new Date().getFullYear()} ElimuPawa · Built for learners everywhere
          </p>
        </div>
      </div>
    </div>
  );
}
