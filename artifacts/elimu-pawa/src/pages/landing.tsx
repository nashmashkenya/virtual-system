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

const features = [
  { icon: Video,        label: "Live HD Video",       desc: "Crystal-clear streaming for up to 60 students with zero lag.",              color: "#0ea5e9", bg: "rgba(14,165,233,0.12)",  border: "rgba(14,165,233,0.25)" },
  { icon: MessageSquare,label: "Real-time Chat",       desc: "Class-wide and private messages to keep every student engaged.",            color: "#10b981", bg: "rgba(16,185,129,0.12)", border: "rgba(16,185,129,0.25)" },
  { icon: PenTool,      label: "Digital Whiteboard",   desc: "Draw, annotate, and collaborate on a shared canvas in real time.",          color: "#8b5cf6", bg: "rgba(139,92,246,0.12)", border: "rgba(139,92,246,0.25)" },
  { icon: BarChart2,    label: "Polls & Quizzes",      desc: "Run instant polls or graded quizzes and see results live.",                 color: "#f59e0b", bg: "rgba(245,158,11,0.12)", border: "rgba(245,158,11,0.25)" },
  { icon: Users,        label: "Breakout Rooms",       desc: "Split students into small groups for focused collaborative work.",           color: "#ec4899", bg: "rgba(236,72,153,0.12)", border: "rgba(236,72,153,0.25)" },
  { icon: BookOpen,     label: "Course Materials",     desc: "Upload notes, PDFs, and assignments in one organised library.",             color: "#f97316", bg: "rgba(249,115,22,0.12)",  border: "rgba(249,115,22,0.25)" },
];

const stats = [
  { value: "500+",   label: "Active students",  color: "#0ea5e9" },
  { value: "50+",    label: "Verified teachers", color: "#10b981" },
  { value: "2,000+", label: "Classes delivered", color: "#8b5cf6" },
  { value: "100%",   label: "Mobile-friendly",   color: "#f59e0b" },
];

const trustItems = [
  { icon: Smartphone,  label: "Any phone or laptop", color: "#0ea5e9" },
  { icon: Globe,       label: "Built for Africa",    color: "#10b981" },
  { icon: ShieldCheck, label: "Secure sessions",     color: "#8b5cf6" },
  { icon: Zap,         label: "No downloads",        color: "#f59e0b" },
];

/* ── Glassmorphism helpers ── */
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
  nav: {
    background: "rgba(255,255,255,0.65)",
    backdropFilter: "blur(20px)",
    WebkitBackdropFilter: "blur(20px)",
    border: "1px solid rgba(255,255,255,0.75)",
    boxShadow: "0 2px 24px rgba(80,60,140,0.07)",
  } as React.CSSProperties,
  subtle: {
    background: "rgba(255,255,255,0.35)",
    backdropFilter: "blur(12px)",
    WebkitBackdropFilter: "blur(12px)",
    border: "1px solid rgba(255,255,255,0.55)",
  } as React.CSSProperties,
};

export function LandingPage() {
  const [schoolName, setSchoolName] = useState("");
  const [schoolLogo, setSchoolLogo] = useState("");

  useEffect(() => {
    fetchSchool().then((d) => {
      setSchoolName(d.school_name);
      setSchoolLogo(d.school_logo);
    });
  }, []);

  return (
    <div className="min-h-screen w-full overflow-x-hidden" style={{ background: "linear-gradient(145deg, #e8f4fd 0%, #ede8ff 28%, #fce8f5 55%, #e4f8f0 80%, #fdf8e8 100%)" }}>

      {/* ── Ambient blobs ── */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
        <div className="absolute -left-40 -top-20 h-[600px] w-[600px] rounded-full bg-sky-400/20 blur-[120px]" />
        <div className="absolute right-0 top-1/4 h-[500px] w-[500px] rounded-full bg-violet-400/15 blur-[110px]" />
        <div className="absolute bottom-10 left-1/4 h-[400px] w-[400px] rounded-full bg-emerald-400/15 blur-[100px]" />
        <div className="absolute -bottom-10 right-1/3 h-[380px] w-[380px] rounded-full bg-pink-400/15 blur-[110px]" />
        <div className="absolute left-2/3 top-1/2 h-56 w-56 rounded-full bg-amber-300/15 blur-[80px]" />
      </div>

      {/* ── Dot grid ── */}
      <div className="pointer-events-none fixed inset-0 opacity-[0.045]"
        style={{ backgroundImage: "radial-gradient(circle, #6366f1 1px, transparent 1px)", backgroundSize: "36px 36px" }}
        aria-hidden />

      <div className="relative mx-auto max-w-7xl px-5 sm:px-8 lg:px-12">

        {/* ══════════════════════════════════════════
            SCHOOL HERO BANNER
        ══════════════════════════════════════════ */}
        {(schoolName || schoolLogo) && (
          <div className="pt-6">
            <div className="relative overflow-hidden rounded-2xl px-6 py-5 sm:px-10 sm:py-7" style={{
              background: "linear-gradient(135deg, rgba(255,255,255,0.75) 0%, rgba(255,255,255,0.55) 100%)",
              backdropFilter: "blur(32px)",
              WebkitBackdropFilter: "blur(32px)",
              border: "1.5px solid rgba(255,255,255,0.85)",
              boxShadow: "0 16px 64px rgba(80,60,180,0.12), 0 2px 0 rgba(255,255,255,1) inset",
            }}>
              {/* subtle rainbow shimmer behind */}
              <div className="pointer-events-none absolute inset-0 rounded-2xl opacity-40"
                style={{ background: "linear-gradient(135deg, rgba(14,165,233,0.08) 0%, rgba(139,92,246,0.08) 40%, rgba(236,72,153,0.06) 70%, rgba(16,185,129,0.06) 100%)" }}
                aria-hidden />
              <div className="relative flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
                {schoolLogo && (
                  <div className="relative shrink-0">
                    <div className="absolute inset-0 rounded-2xl blur-xl opacity-60"
                      style={{ background: "linear-gradient(135deg,#0ea5e9,#8b5cf6)" }} aria-hidden />
                    <img
                      src={schoolLogo}
                      alt="School logo"
                      className="relative h-16 w-16 rounded-2xl object-contain shadow-xl sm:h-20 sm:w-20"
                      style={{ border: "2px solid rgba(255,255,255,0.9)" }}
                    />
                  </div>
                )}
                <div className="flex-1">
                  {schoolName && (
                    <h2 className="text-2xl font-black tracking-tight sm:text-3xl"
                      style={{ background: "linear-gradient(90deg, #0ea5e9 0%, #6366f1 40%, #8b5cf6 70%, #ec4899 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                      {schoolName}
                    </h2>
                  )}
                  <p className="mt-1 text-sm font-medium text-slate-500">
                    Powered by <span className="font-bold text-violet-600">ElimuPawa</span> · Digital Classroom Platform
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Link href="/student/sign-in"
                    className="rounded-xl px-4 py-2 text-sm font-semibold text-white transition hover:scale-105 active:scale-100"
                    style={{ background: "linear-gradient(135deg, #0ea5e9, #6366f1)", boxShadow: "0 4px 16px rgba(99,102,241,0.35)" }}>
                    Student Login
                  </Link>
                  <Link href="/teacher/sign-in"
                    className="rounded-xl px-4 py-2 text-sm font-semibold transition hover:scale-105 active:scale-100"
                    style={{ background: "rgba(255,255,255,0.7)", border: "1px solid rgba(99,102,241,0.25)", color: "#6366f1" }}>
                    Teacher Login
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════
            NAVBAR
        ══════════════════════════════════════════ */}
        <nav className="sticky top-4 z-50 my-4 flex items-center justify-between rounded-2xl px-5 py-3" style={glass.nav}>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl shadow-md"
              style={{ background: "linear-gradient(135deg, #0ea5e9, #8b5cf6)" }}>
              <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 text-white" aria-hidden>
                <path d="M12 3L2 8l10 5 10-5-10-5z" fill="currentColor" opacity=".95" />
                <path d="M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
                <path d="M2 16l10 5 10-5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeOpacity=".45" />
              </svg>
            </div>
            <span className="text-[17px] font-bold tracking-tight text-slate-800">
              Elimu<span style={{ background: "linear-gradient(90deg,#0ea5e9,#8b5cf6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Pawa</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/student/sign-in"
              className="hidden rounded-xl px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-white/60 sm:block"
              style={{ border: "1px solid rgba(100,80,200,0.2)" }}>
              Sign in
            </Link>
            <Link href="/student/sign-up"
              className="rounded-xl px-4 py-2 text-sm font-semibold text-white transition hover:scale-105"
              style={{ background: "linear-gradient(135deg, #0ea5e9, #8b5cf6)", boxShadow: "0 4px 12px rgba(99,102,241,0.3)" }}>
              Get started
            </Link>
          </div>
        </nav>

        {/* ══════════════════════════════════════════
            HERO
        ══════════════════════════════════════════ */}
        <div className="grid items-center gap-8 pb-10 pt-4 lg:grid-cols-[1fr_400px] lg:gap-12 lg:pb-16 lg:pt-8">

          {/* Left — copy */}
          <div className="space-y-6">
            <span className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-violet-700"
              style={glass.subtle}>
              <Zap className="h-3 w-3 text-sky-500" /> Virtual classroom platform
            </span>

            <h1 className="text-[clamp(2rem,7vw,4rem)] font-black leading-[1.06] tracking-tight text-slate-900">
              The classroom
              <br />
              <span style={{ background: "linear-gradient(90deg, #0ea5e9 0%, #10b981 35%, #8b5cf6 70%, #ec4899 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                your students deserve.
              </span>
            </h1>

            <p className="max-w-[500px] text-[15px] leading-relaxed text-slate-600">
              Everything teachers and students need — live video, real-time chat, quizzes,
              polls, and a collaborative whiteboard — all in one focused screen built for Kenyan schools.
            </p>

            {/* Trust badges */}
            <div className="flex flex-wrap gap-2">
              {trustItems.map(({ icon: Icon, label, color }) => (
                <span key={label} className="flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12px] font-medium text-slate-600" style={glass.subtle}>
                  <Icon className="h-3.5 w-3.5" style={{ color }} aria-hidden />
                  {label}
                </span>
              ))}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3 pt-1 sm:grid-cols-4">
              {stats.map(({ value, label, color }) => (
                <div key={label} className="rounded-2xl p-4 text-center transition hover:-translate-y-0.5" style={glass.card}>
                  <p className="text-[1.5rem] font-black leading-none" style={{ color }}>{value}</p>
                  <p className="mt-1.5 text-[11px] font-medium text-slate-500">{label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Right — CTA glass card */}
          <div className="relative rounded-3xl p-6 sm:p-7" style={glass.strong}>
            {/* Subtle glow accents */}
            <div className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-violet-400/15 blur-[50px]" aria-hidden />
            <div className="pointer-events-none absolute -bottom-6 -left-6 h-32 w-32 rounded-full bg-sky-400/15 blur-[40px]" aria-hidden />

            <div className="relative">
              <span className="mb-1 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-violet-600"
                style={{ background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.2)" }}>
                <Zap className="h-3 w-3" /> Get started
              </span>
              <h2 className="mt-3 text-xl font-black tracking-tight text-slate-900">Who are you joining as?</h2>
              <p className="mt-1 text-[13px] text-slate-500">Choose your role to get to the right sign-in page.</p>
            </div>

            <div className="relative mt-6 space-y-3">
              {/* Student */}
              <Link href="/student/sign-in"
                className="flex w-full items-center gap-4 rounded-2xl p-4 transition hover:scale-[1.02] hover:shadow-lg active:scale-100"
                style={{ background: "linear-gradient(135deg, rgba(16,185,129,0.12) 0%, rgba(14,165,233,0.08) 100%)", border: "1px solid rgba(16,185,129,0.25)" }}>
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-2xl"
                  style={{ background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.3)" }}>
                  📚
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-bold text-slate-800">I am a Student</p>
                  <p className="mt-0.5 text-[12px] text-slate-500">Sign in with ADM No &amp; password</p>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-emerald-500" />
              </Link>

              {/* Teacher */}
              <Link href="/teacher/sign-in"
                className="flex w-full items-center gap-4 rounded-2xl p-4 transition hover:scale-[1.02] hover:shadow-lg active:scale-100"
                style={{ background: "linear-gradient(135deg, rgba(139,92,246,0.12) 0%, rgba(236,72,153,0.06) 100%)", border: "1px solid rgba(139,92,246,0.25)" }}>
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-2xl"
                  style={{ background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.3)" }}>
                  🎓
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-bold text-slate-800">I am a Teacher</p>
                  <p className="mt-0.5 text-[12px] text-slate-500">Sign in with email or Google</p>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-violet-500" />
              </Link>
            </div>

            <p className="relative mt-5 text-center text-[11px] text-slate-400">
              Used by schools across Kenya · Secure · No credit card needed
            </p>
          </div>
        </div>

        {/* ── Gradient divider ── */}
        <div className="h-px w-full rounded-full" style={{ background: "linear-gradient(90deg, transparent, rgba(14,165,233,0.4), rgba(139,92,246,0.5), rgba(236,72,153,0.4), transparent)" }} />

        {/* ══════════════════════════════════════════
            FEATURES
        ══════════════════════════════════════════ */}
        <div className="py-14 lg:py-20">
          <div className="mb-12 text-center">
            <span className="mb-3 inline-block rounded-full px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.22em] text-violet-700"
              style={glass.subtle}>
              Everything in one place
            </span>
            <h2 className="text-[clamp(1.5rem,4vw,2.4rem)] font-black tracking-tight text-slate-900">
              One screen. Every tool your class needs.
            </h2>
            <p className="mx-auto mt-3 max-w-[460px] text-[14px] text-slate-500">
              No juggling between apps. No complicated setup. Just open ElimuPawa and start learning.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map(({ icon: Icon, label, desc, color, bg, border }) => (
              <div key={label}
                className="group relative overflow-hidden rounded-2xl p-5 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl"
                style={{ ...glass.card, border: `1px solid ${border}` }}>
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

        {/* ── Gradient divider ── */}
        <div className="h-px w-full rounded-full" style={{ background: "linear-gradient(90deg, transparent, rgba(236,72,153,0.3), rgba(139,92,246,0.4), rgba(14,165,233,0.3), transparent)" }} />

        {/* ══════════════════════════════════════════
            FOOTER
        ══════════════════════════════════════════ */}
        <div className="py-8 text-center">
          <p className="text-[12px] text-slate-400">
            © {new Date().getFullYear()} ElimuPawa · Built for learners everywhere
          </p>
        </div>

      </div>
    </div>
  );
}
