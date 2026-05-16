import { Link } from "wouter";
import { BookOpen, Video, MessageSquare, PenTool, BarChart2, Users, ArrowLeft, ExternalLink } from "lucide-react";

const sections = [
  { id: "account",   label: "Creating your account" },
  { id: "classes",   label: "Setting up classes" },
  { id: "lessons",   label: "Scheduling lessons" },
  { id: "students",  label: "Managing students" },
  { id: "classroom", label: "Running a live classroom" },
  { id: "tools",     label: "Polls, quizzes & whiteboard" },
  { id: "video",     label: "Live video & YouTube" },
  { id: "tips",      label: "Tips & best practices" },
];

function Num({ n }: { n: number }) {
  return (
    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-[11px] font-black text-white">
      {n}
    </span>
  );
}

function Step({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-3 text-sm text-slate-600">
      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-emerald-300 bg-emerald-50 text-[10px] font-black text-emerald-600">
        ›
      </span>
      <span>{children}</span>
    </li>
  );
}

function Tip({ children, warn }: { children: React.ReactNode; warn?: boolean }) {
  return (
    <div className={`flex gap-3 rounded-xl border px-4 py-3 text-sm ${warn ? "border-amber-200 bg-amber-50 text-amber-800" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`}>
      <span className="mt-0.5 shrink-0">{warn ? "⚠️" : "💡"}</span>
      <span>{children}</span>
    </div>
  );
}

function Card({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-2 text-2xl">{icon}</div>
      <p className="text-sm font-bold text-slate-800">{title}</p>
      <p className="mt-1 text-xs text-slate-500">{desc}</p>
    </div>
  );
}

export function TeacherGuidePage() {
  return (
    <div className="min-h-screen bg-slate-50">

      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-white/20 bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-700 px-5 py-4 shadow-lg">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/"
              className="flex items-center gap-1.5 rounded-xl border border-white/25 bg-white/15 px-3 py-2 text-xs font-bold text-white transition hover:bg-white/25">
              <ArrowLeft className="h-3.5 w-3.5" /> Home
            </Link>
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-emerald-200" />
              <span className="text-base font-black text-white">Teacher's Guide</span>
            </div>
          </div>
          <span className="hidden rounded-full bg-white/20 px-3 py-1 text-xs font-semibold text-white sm:block">
            ElimuPawa
          </span>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-5 py-8">

        {/* Intro */}
        <p className="mb-6 text-sm text-slate-500">
          Everything you need to run your virtual classroom — from setting up classes to managing live sessions.
        </p>

        {/* Table of contents */}
        <div className="mb-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-slate-400">Contents</p>
          <ol className="grid gap-y-2 sm:grid-cols-2">
            {sections.map((s, i) => (
              <li key={s.id}>
                <a href={`#${s.id}`}
                  className="flex items-center gap-2 text-sm font-medium text-emerald-700 hover:underline">
                  <span className="text-xs text-slate-400">{i + 1}.</span> {s.label}
                </a>
              </li>
            ))}
          </ol>
        </div>

        {/* ── 1. Account ── */}
        <section id="account" className="mb-10 scroll-mt-20">
          <h2 className="mb-4 flex items-center gap-2.5 text-lg font-black text-slate-900 border-b-2 border-emerald-100 pb-2">
            <Num n={1} /> Creating your teacher account
          </h2>
          <p className="mb-3 text-sm text-slate-600">Sign in with your email or Google account — no app download needed.</p>
          <ol className="mb-3 space-y-2">
            <Step>Go to <strong>virtual-system.replit.app/teacher/sign-in</strong></Step>
            <Step>Click <strong>"Sign up"</strong> if you're new, or sign in with your existing credentials</Step>
            <Step>You can use <strong>email + password</strong> or <strong>"Continue with Google"</strong> for one-tap access</Step>
            <Step>After signing in you land on the <strong>Teacher Dashboard</strong> — your control centre</Step>
          </ol>
          <Tip>Use the same email every time you sign in. All your classes and lesson history are tied to it.</Tip>
        </section>

        {/* ── 2. Classes ── */}
        <section id="classes" className="mb-10 scroll-mt-20">
          <h2 className="mb-4 flex items-center gap-2.5 text-lg font-black text-slate-900 border-b-2 border-emerald-100 pb-2">
            <Num n={2} /> Setting up classes &amp; subjects
          </h2>
          <p className="mb-3 text-sm text-slate-600">A class links a subject, a class level, and a group of students together.</p>
          <ol className="mb-3 space-y-2">
            <Step>Click <strong>Classes</strong> in the sidebar (or nav on mobile)</Step>
            <Step>Click <strong>"New Class"</strong></Step>
            <Step>Pick your <strong>Subject</strong> (e.g. Mathematics) and <strong>Class Level</strong> (e.g. Form 3)</Step>
            <Step>Click <strong>"Create Class"</strong> — it appears in your list immediately</Step>
          </ol>
          <Tip>You can create multiple classes for the same subject at different levels — e.g. "Maths Form 2" and "Maths Form 4".</Tip>
          <Tip warn>If the subject or class level you need is not listed, ask your school administrator to add it in the Admin panel.</Tip>
        </section>

        {/* ── 3. Lessons ── */}
        <section id="lessons" className="mb-10 scroll-mt-20">
          <h2 className="mb-4 flex items-center gap-2.5 text-lg font-black text-slate-900 border-b-2 border-emerald-100 pb-2">
            <Num n={3} /> Scheduling lessons
          </h2>
          <p className="mb-3 text-sm text-slate-600">Lessons are the individual sessions students join. Each belongs to one of your classes.</p>
          <ol className="mb-4 space-y-2">
            <Step>Open a class and click <strong>"Schedule Lesson"</strong></Step>
            <Step>Enter a <strong>title</strong>, <strong>date</strong>, and <strong>start time</strong></Step>
            <Step>Set the <strong>duration</strong> (default 60 minutes)</Step>
            <Step>Click <strong>"Save"</strong> — enrolled students see it on their dashboard immediately</Step>
          </ol>
          <div className="grid gap-3 sm:grid-cols-3">
            <Card icon="📅" title="Upcoming lessons" desc="Students see scheduled lessons on their dashboard and can prepare in advance." />
            <Card icon="✏️" title="Editing a lesson"  desc="Click the lesson title and select Edit to change the time, title, or duration." />
            <Card icon="🗑️" title="Cancelling"       desc="Open the lesson and click Delete. It disappears from student dashboards." />
          </div>
        </section>

        {/* ── 4. Students ── */}
        <section id="students" className="mb-10 scroll-mt-20">
          <h2 className="mb-4 flex items-center gap-2.5 text-lg font-black text-slate-900 border-b-2 border-emerald-100 pb-2">
            <Num n={4} /> Managing students
          </h2>
          <p className="mb-3 text-sm text-slate-600">Students register themselves with their ADM number. You approve them per lesson before they can join.</p>
          <h3 className="mb-2 text-sm font-bold text-slate-800">Approving students for a lesson</h3>
          <ol className="mb-3 space-y-2">
            <Step>Open a lesson and scroll to the <strong>Students</strong> section</Step>
            <Step>Students who requested access appear with a <strong>Pending</strong> badge</Step>
            <Step>Click <strong>"Approve"</strong> next to each student — they can now enter the classroom</Step>
            <Step>Use <strong>"Approve all"</strong> at the top to approve everyone at once</Step>
          </ol>
          <Tip warn>Unapproved students see a "Waiting for approval" message and cannot enter until you approve them.</Tip>
        </section>

        {/* ── 5. Classroom ── */}
        <section id="classroom" className="mb-10 scroll-mt-20">
          <h2 className="mb-4 flex items-center gap-2.5 text-lg font-black text-slate-900 border-b-2 border-emerald-100 pb-2">
            <Num n={5} /> Running a live classroom
          </h2>
          <ol className="mb-4 space-y-2">
            <Step>Click <strong>"Start Lesson"</strong> on the lesson card when it's time</Step>
            <Step>The <strong>Teacher Room</strong> opens — you see the roster, chat, and all controls</Step>
            <Step>Approved students can join from their dashboard</Step>
            <Step>When done, click <strong>"End Lesson"</strong> to close the session for everyone</Step>
          </ol>
          <div className="grid gap-3 sm:grid-cols-2">
            <Card icon="👥" title="Roster panel"    desc="See who is online, manage raised hands, and mute students." />
            <Card icon="💬" title="Class chat"      desc="Send messages to all students. Students can reply and ask questions." />
            <Card icon="🖐️" title="Raise hand"     desc="Students tap Raise hand — you get a notification and can call on them." />
            <Card icon="🏠" title="Breakout rooms"  desc="Split students into small groups, then bring them back together." />
          </div>
        </section>

        {/* ── 6. Tools ── */}
        <section id="tools" className="mb-10 scroll-mt-20">
          <h2 className="mb-4 flex items-center gap-2.5 text-lg font-black text-slate-900 border-b-2 border-emerald-100 pb-2">
            <Num n={6} /> Classroom tools
          </h2>

          <div className="mb-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <BarChart2 className="h-4 w-4 text-emerald-600" />
              <h3 className="text-sm font-black text-slate-800">Polls</h3>
            </div>
            <ol className="space-y-2">
              <Step>Open the <strong>Polls</strong> panel from the toolbar in the classroom</Step>
              <Step>Type your question and add 2–4 answer options</Step>
              <Step>Click <strong>"Launch Poll"</strong> — all students see it immediately</Step>
              <Step>Watch results update live as students vote, then click <strong>"Close Poll"</strong></Step>
            </ol>
          </div>

          <div className="mb-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <Users className="h-4 w-4 text-violet-600" />
              <h3 className="text-sm font-black text-slate-800">Quizzes</h3>
            </div>
            <ol className="space-y-2">
              <Step>Open the <strong>Quiz</strong> panel and click <strong>"New Quiz"</strong></Step>
              <Step>Add questions with multiple-choice answers — mark the correct answer for each</Step>
              <Step>Click <strong>"Launch Quiz"</strong> — students answer within the time limit you set</Step>
              <Step>Results show each student's score when the quiz closes</Step>
            </ol>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <PenTool className="h-4 w-4 text-sky-600" />
              <h3 className="text-sm font-black text-slate-800">Whiteboard</h3>
            </div>
            <ol className="mb-3 space-y-2">
              <Step>Click the <strong>Whiteboard</strong> tab in the classroom</Step>
              <Step>Use pen, shapes, and text tools to write or draw</Step>
              <Step>Students see your whiteboard live — you can allow them to draw too</Step>
              <Step>Click <strong>"Clear"</strong> to reset or <strong>"Save"</strong> to keep a snapshot</Step>
            </ol>
            <Tip>Works great for maths equations and diagrams. On a touchscreen you can draw with your finger.</Tip>
          </div>
        </section>

        {/* ── 7. Video ── */}
        <section id="video" className="mb-10 scroll-mt-20">
          <h2 className="mb-4 flex items-center gap-2.5 text-lg font-black text-slate-900 border-b-2 border-emerald-100 pb-2">
            <Num n={7} /> Live video &amp; YouTube streaming
          </h2>

          <div className="mb-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <Video className="h-4 w-4 text-emerald-600" />
              <h3 className="text-sm font-black text-slate-800">Browser webcam (simplest)</h3>
            </div>
            <ol className="space-y-2">
              <Step>Click <strong>"Start Video"</strong> in the classroom toolbar</Step>
              <Step>Allow the browser to access your camera and microphone when prompted</Step>
              <Step>Your stream is visible to all students instantly — no app needed</Step>
            </ol>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <ExternalLink className="h-4 w-4 text-red-500" />
              <h3 className="text-sm font-black text-slate-800">YouTube Live (recommended for large classes)</h3>
            </div>
            <ol className="mb-3 space-y-2">
              <Step>Open <strong>YouTube Studio</strong> on your phone or computer and start a Live stream</Step>
              <Step>Copy your stream URL</Step>
              <Step>In ElimuPawa, click <strong>"YouTube Live"</strong> in the video panel and paste the link</Step>
              <Step>Click <strong>"Go Live"</strong> — students watch your YouTube stream inside the classroom</Step>
            </ol>
            <Tip>On Android: YouTube app → tap your profile photo → "Go Live" to stream from your phone camera instantly.</Tip>
            <div className="mt-2">
              <Tip warn>YouTube Live requires a verified channel. There may be a 24-hour activation wait the very first time you go live.</Tip>
            </div>
          </div>
        </section>

        {/* ── 8. Tips ── */}
        <section id="tips" className="mb-10 scroll-mt-20">
          <h2 className="mb-4 flex items-center gap-2.5 text-lg font-black text-slate-900 border-b-2 border-emerald-100 pb-2">
            <Num n={8} /> Tips &amp; best practices
          </h2>
          {[
            {
              title: "Before the lesson",
              items: [
                "Schedule the lesson at least a day before so students see it on their dashboards",
                "Approve all expected students before the lesson starts to avoid delays",
                "Test your camera/microphone in a separate browser tab beforehand",
                "Prepare poll and quiz questions in advance so you can launch them quickly",
              ],
            },
            {
              title: "During the lesson",
              items: [
                "Start with a quick poll to check attendance and warm students up",
                "Use the whiteboard for worked examples — students follow along much better visually",
                "Check the chat regularly — students often ask questions there",
                "Use breakout rooms for 5–10 minute group tasks, then bring everyone back",
                "Run a short quiz at the end to check understanding before closing",
              ],
            },
            {
              title: "After the lesson",
              items: [
                "Review quiz scores — students below 50% may need a follow-up session",
                "Post notes or PDFs in the class materials section for students to review",
                "Schedule the next lesson promptly so students can plan ahead",
              ],
            },
          ].map(({ title, items }) => (
            <div key={title} className="mb-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="mb-3 text-sm font-bold text-slate-800">{title}</h3>
              <ul className="space-y-2">
                {items.map((item) => (
                  <li key={item} className="flex gap-2 text-sm text-slate-600">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>

        {/* Footer */}
        <div className="border-t border-slate-200 pt-6 text-center text-xs text-slate-400">
          <p>ElimuPawa Teacher's Guide · Last updated May 2026</p>
          <Link href="/" className="mt-2 inline-block text-emerald-600 hover:underline">← Back to home</Link>
        </div>
      </div>
    </div>
  );
}
