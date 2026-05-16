import { Link } from "wouter";
import {
  ArrowRight, BookOpen,
  BarChart2, MessageSquare, PenTool,
  Smartphone, Users, Video, Zap, Globe, ShieldCheck,
} from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";

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
  { value: "500+",   label: "Active students",   gradient: "from-cyan-400 to-cyan-600",    shadow: "rgba(6,182,212,0.3)"   },
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

function CTACard() {
  return (
    <div className="relative rounded-3xl p-[1.5px]" style={{ background: "linear-gradient(135deg, rgba(6,182,212,0.6), rgba(139,92,246,0.5), rgba(236,72,153,0.4))" }}>
      <div
        className="relative overflow-hidden rounded-[22px] p-6 sm:p-8"
        style={{
          background: "linear-gradient(145deg, rgba(10,15,40,0.97) 0%, rgba(14,20,50,0.97) 100%)",
          backdropFilter: "blur(24px)",
        }}
      >
        {/* Glows */}
        <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-violet-500/20 blur-[40px]" aria-hidden />
        <div className="pointer-events-none absolute -bottom-8 -left-8 h-28 w-28 rounded-full bg-cyan-500/15 blur-[35px]" aria-hidden />

        {/* Header */}
        <div className="relative mb-7">
          <p className="mb-1 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-violet-300"
            style={{ background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.3)" }}>
            <Zap className="h-3 w-3" /> Get started
          </p>
          <h2 className="mt-3 text-xl font-black tracking-tight text-white">Who are you joining as?</h2>
          <p className="mt-1 text-[13px] text-slate-400">
            Choose your role to get to the right sign-in page.
          </p>
        </div>

        {/* Role CTAs */}
        <div className="relative space-y-3">
          {/* Student */}
          <div
            className="rounded-2xl p-[1px]"
            style={{ background: "linear-gradient(135deg, rgba(16,185,129,0.5), rgba(6,182,212,0.3))" }}
          >
            <Link
              href="/student/sign-in"
              className="flex w-full items-center gap-4 rounded-[14px] p-4 transition hover:brightness-110"
              style={{ background: "linear-gradient(135deg, rgba(16,185,129,0.1) 0%, rgba(6,182,212,0.06) 100%)" }}
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-2xl"
                style={{ background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.25)" }}>
                📚
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-bold text-white">I am a Student</p>
                <p className="mt-0.5 text-[12px] text-slate-400">Sign in with email and password</p>
              </div>
              <ArrowRight className="h-4 w-4 text-emerald-400 shrink-0" />
            </Link>
          </div>

          {/* Teacher */}
          <div
            className="rounded-2xl p-[1px]"
            style={{ background: "linear-gradient(135deg, rgba(139,92,246,0.5), rgba(236,72,153,0.3))" }}
          >
            <Link
              href="/teacher/sign-in"
              className="flex w-full items-center gap-4 rounded-[14px] p-4 transition hover:brightness-110"
              style={{ background: "linear-gradient(135deg, rgba(139,92,246,0.1) 0%, rgba(236,72,153,0.06) 100%)" }}
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-2xl"
                style={{ background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.25)" }}>
                🎓
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-bold text-white">I am a Teacher</p>
                <p className="mt-0.5 text-[12px] text-slate-400">Sign in with email or Google</p>
              </div>
              <ArrowRight className="h-4 w-4 text-violet-400 shrink-0" />
            </Link>
          </div>
        </div>

        {/* Footer */}
        <p className="relative mt-5 text-center text-[11px] text-slate-600">
          Used by schools across Kenya · Secure · No credit card needed
        </p>
      </div>
    </div>
  );
}

export function LandingPage() {
  return (
    <div className="min-h-screen w-full overflow-x-hidden" style={{ background: "linear-gradient(160deg, #060b18 0%, #09142a 45%, #0b1630 100%)" }}>

      {/* Background glows */}
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

        {/* Navbar */}
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
              href="/sign-up"
              className="hidden rounded-xl px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110 sm:block"
              style={{ background: "linear-gradient(135deg, rgba(6,182,212,0.2), rgba(139,92,246,0.2))", border: "1px solid rgba(139,92,246,0.3)" }}
            >
              Create account
            </Link>
            <ThemeToggle />
          </div>
        </nav>

        {/* Hero */}
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

            {/* Trust badges */}
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

            {/* Stats */}
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

          {/* Right — CTA card */}
          <CTACard />
        </div>

        {/* Divider */}
        <div className="h-px w-full" style={{ background: "linear-gradient(90deg, transparent, rgba(6,182,212,0.4), rgba(139,92,246,0.5), rgba(236,72,153,0.4), transparent)" }} />

        {/* Features */}
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

        {/* Footer divider */}
        <div className="h-px w-full" style={{ background: "linear-gradient(90deg, transparent, rgba(236,72,153,0.3), rgba(139,92,246,0.4), rgba(6,182,212,0.3), transparent)" }} />

        {/* Footer */}
        <div className="py-8 text-center">
          <p className="text-[12px] text-slate-700">
            © {new Date().getFullYear()} ElimuPawa · Built for learners everywhere
          </p>
        </div>
      </div>
    </div>
  );
}
