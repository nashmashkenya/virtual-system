import { Switch, Route, Router as WouterRouter } from "wouter";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { ToastStack } from "@/components/ui/toast-stack";
import { LandingPage } from "@/pages/landing";
import { LoginPage } from "@/pages/login";
import { RegisterPage } from "@/pages/register";
import { ForgotPasswordPage } from "@/pages/forgot-password";
import { ResetPasswordPage } from "@/pages/reset-password";
import { StudentPage } from "@/pages/student";
import { StudentHomePage } from "@/pages/student-home";
import { TeacherPage } from "@/pages/teacher";
import { SettingsPage } from "@/pages/settings";
import { PaymentsPage } from "@/pages/payments";
import { NotFoundPage } from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={LandingPage} />
      <Route path="/login" component={LoginPage} />
      <Route path="/register" component={RegisterPage} />
      <Route path="/forgot-password" component={ForgotPasswordPage} />
      <Route path="/reset-password" component={ResetPasswordPage} />
      <Route path="/student/home" component={StudentHomePage} />
      <Route path="/student" component={StudentPage} />
      <Route path="/teacher" component={TeacherPage} />
      <Route path="/settings" component={SettingsPage} />
      <Route path="/payments" component={PaymentsPage} />
      <Route component={NotFoundPage} />
    </Switch>
  );
}

function App() {
  return (
    <ThemeProvider>
      <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
        <Router />
      </WouterRouter>
      <ToastStack />
    </ThemeProvider>
  );
}

export default App;
