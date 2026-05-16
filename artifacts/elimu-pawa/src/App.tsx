import { useEffect, useRef, useState } from "react";
import { ClerkProvider, SignIn, SignUp, useAuth } from "@clerk/react";
import { publishableKeyFromHost } from "@clerk/react/internal";
import { dark } from "@clerk/themes";
import { Switch, Route, Link, useLocation, Router as WouterRouter } from "wouter";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { ToastStack } from "@/components/ui/toast-stack";
import { LandingPage } from "@/pages/landing";
import { StudentPage } from "@/pages/student";
import { StudentHomePage } from "@/pages/student-home";
import { StudentSignInPage } from "@/pages/student-signin";
import { StudentSignUpPage } from "@/pages/student-signup";
import { StudentDashboardPage } from "@/pages/student-dashboard";
import { TeacherPage } from "@/pages/teacher";
import { TeacherClassesPage } from "@/pages/teacher-classes";
import { SettingsPage } from "@/pages/settings";
import { PaymentsPage } from "@/pages/payments";
import { NotFoundPage } from "@/pages/not-found";
import { OnboardingPage } from "@/pages/onboarding";

// REQUIRED — copy verbatim. Resolves the key from window.location.hostname.
const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);

// REQUIRED — copy verbatim. Empty in dev (intentional), auto-set in prod.
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

if (!clerkPubKey) {
  throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY");
}

const baseAppearance = {
  baseTheme: dark,
  cssLayerName: "clerk",
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: "#3b82f6",
    colorForeground: "#f1f5f9",
    colorMutedForeground: "#94a3b8",
    colorDanger: "#ef4444",
    colorBackground: "#0f172a",
    colorInput: "#1e293b",
    colorInputForeground: "#f1f5f9",
    colorNeutral: "#334155",
    fontFamily: "Inter, sans-serif",
    borderRadius: "0.75rem",
  },
  elements: {
    rootBox: "w-full flex justify-center",
    cardBox: "bg-slate-900 border border-slate-700/50 rounded-2xl w-[440px] max-w-full overflow-hidden shadow-2xl",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none",
    footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
    headerTitle: "text-white font-bold",
    headerSubtitle: "text-slate-400",
    socialButtonsBlockButtonText: "text-slate-200",
    formFieldLabel: "text-slate-300 text-sm font-medium",
    footerActionLink: "text-blue-400 hover:text-blue-300 font-semibold",
    footerActionText: "text-slate-400",
    dividerText: "text-slate-500",
    identityPreviewEditButton: "text-blue-400",
    formFieldSuccessText: "text-emerald-400",
    alertText: "text-red-300",
    logoBox: "mb-2 flex justify-center",
    logoImage: "h-12 w-12",
    socialButtonsBlockButton: "border-slate-700 bg-slate-800 hover:bg-slate-700 text-white",
    formButtonPrimary: "bg-blue-600 hover:bg-blue-500 text-white font-semibold shadow-lg",
    formFieldInput: "bg-slate-800 border-slate-600 text-white",
    footerAction: "bg-transparent",
    dividerLine: "bg-slate-700",
    alert: "bg-red-500/10 border-red-500/30",
    otpCodeFieldInput: "bg-slate-800 border-slate-600 text-white",
    formFieldRow: "",
    main: "",
  },
};

// Students: no Google / social buttons
const studentAppearance = {
  ...baseAppearance,
  elements: {
    ...baseAppearance.elements,
    socialButtonsBlockButton: "!hidden",
    socialButtonsBlockButtonArrow: "!hidden",
    dividerRow: "!hidden",
    socialButtonsBlock: "!hidden",
  },
};

// Teachers: full experience including Google
const teacherAppearance = baseAppearance;

function AuthPage({
  type,
  role,
}: {
  type: "sign-in" | "sign-up";
  role: "student" | "teacher";
}) {
  const appearance = role === "student" ? studentAppearance : teacherAppearance;
  const studentSignIn = `${basePath}/student/sign-in`;
  const studentSignUp = `${basePath}/student/sign-up`;
  const teacherSignIn = `${basePath}/teacher/sign-in`;
  const teacherSignUp = `${basePath}/teacher/sign-up`;

  const signInUrl = role === "student" ? studentSignIn : teacherSignIn;
  const signUpUrl = role === "student" ? studentSignUp : teacherSignUp;
  const redirectUrl = `${basePath}/onboarding?role=${role}`;

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      {/* Back to home */}
      <Link
        href="/"
        className="absolute left-5 top-5 flex items-center gap-2 rounded-xl border border-slate-700/50 bg-slate-800/60 px-3 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-700/60 hover:text-white"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
          <path fillRule="evenodd" d="M17 10a.75.75 0 0 1-.75.75H5.612l4.158 3.96a.75.75 0 1 1-1.04 1.08l-5.5-5.25a.75.75 0 0 1 0-1.08l5.5-5.25a.75.75 0 1 1 1.04 1.08L5.612 9.25H16.25A.75.75 0 0 1 17 10Z" clipRule="evenodd" />
        </svg>
        Home
      </Link>

      {/* Role badge */}
      <div className="w-full max-w-[440px]">
        <div className="mb-4 flex justify-center">
          <span
            className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold"
            style={{
              background: role === "student"
                ? "rgba(16,185,129,0.12)"
                : "rgba(139,92,246,0.12)",
              border: role === "student"
                ? "1px solid rgba(16,185,129,0.3)"
                : "1px solid rgba(139,92,246,0.3)",
              color: role === "student" ? "#34d399" : "#c4b5fd",
            }}
          >
            {role === "student" ? "📚 Student account" : "🎓 Teacher account"}
          </span>
        </div>

        {type === "sign-in" ? (
          <SignIn
            appearance={appearance}
            routing="path"
            path={signInUrl}
            signUpUrl={signUpUrl}
            forceRedirectUrl={redirectUrl}
          />
        ) : (
          <SignUp
            appearance={appearance}
            routing="path"
            path={signUpUrl}
            signInUrl={signInUrl}
            forceRedirectUrl={redirectUrl}
          />
        )}
      </div>
    </div>
  );
}

function RedirectTo({ to }: { to: string }) {
  const [, navigate] = useLocation();
  useEffect(() => { navigate(to, { replace: true }); }, [navigate, to]);
  return null;
}

type RoleState = "loading" | "none" | "student" | "teacher" | "onboard";

function HomeRedirect() {
  const { isSignedIn, isLoaded } = useAuth();
  const [, navigate] = useLocation();
  const [roleState, setRoleState] = useState<RoleState>("loading");
  const hasFetched = useRef(false);

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      setRoleState("none");
      return;
    }
    if (hasFetched.current) return;
    hasFetched.current = true;

    fetch("/api/auth/me/", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { role?: string } | null) => {
        if (data?.role === "teacher") {
          navigate("/teacher", { replace: true });
        } else if (data?.role === "student") {
          navigate("/student", { replace: true });
        } else {
          navigate("/onboarding", { replace: true });
        }
      })
      .catch(() => navigate("/onboarding", { replace: true }));
  }, [isLoaded, isSignedIn, navigate]);

  if (!isLoaded || (isSignedIn && roleState === "loading")) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-slate-950">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  return <LandingPage />;
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={baseAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      localization={{
        signIn: {
          start: {
            title: "Welcome back",
            subtitle: "Sign in to your ElimuPawa account",
          },
        },
        signUp: {
          start: {
            title: "Join ElimuPawa",
            subtitle: "Create your account to get started",
          },
        },
      }}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <ThemeProvider>
        <Switch>
          <Route path="/" component={HomeRedirect} />

          {/* Student auth — custom forms (no Clerk) */}
          <Route path="/student/sign-in" component={StudentSignInPage} />
          <Route path="/student/sign-up" component={StudentSignUpPage} />
          <Route path="/student/dashboard" component={StudentDashboardPage} />

          {/* Teacher auth — email/password + Google via Clerk */}
          <Route path="/teacher/sign-in/*?" component={() => <AuthPage type="sign-in" role="teacher" />} />
          <Route path="/teacher/sign-up/*?" component={() => <AuthPage type="sign-up" role="teacher" />} />

          {/* Teacher class management */}
          <Route path="/teacher/classes" component={TeacherClassesPage} />

          {/* Generic fallback auth routes — send to landing so user picks role first */}
          <Route path="/sign-in/*?" component={() => <RedirectTo to="/" />} />
          <Route path="/sign-up/*?" component={() => <RedirectTo to="/" />} />

          {/* Legacy routes — redirect to landing so user can pick their role */}
          <Route path="/login" component={() => <RedirectTo to="/" />} />
          <Route path="/register" component={() => <RedirectTo to="/" />} />

          <Route path="/onboarding" component={OnboardingPage} />
          <Route path="/student/home" component={StudentHomePage} />
          <Route path="/student" component={StudentPage} />
          <Route path="/teacher" component={TeacherPage} />
          <Route path="/settings" component={SettingsPage} />
          <Route path="/payments" component={PaymentsPage} />
          <Route component={NotFoundPage} />
        </Switch>
        <ToastStack />
      </ThemeProvider>
    </ClerkProvider>
  );
}

function App() {
  return (
    <WouterRouter base={basePath}>
      <ClerkProviderWithRoutes />
    </WouterRouter>
  );
}

export default App;
