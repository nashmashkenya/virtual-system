import React from "react";

// Mock user profiles for local development
const mockTeacherUser = {
  id: "mock_teacher_id",
  username: "mock_teacher",
  fullName: "Dev Teacher",
  firstName: "Dev",
  lastName: "Teacher",
  primaryEmailAddress: { emailAddress: "teacher@elimu.local" },
  emailAddresses: [{ emailAddress: "teacher@elimu.local" }],
};

const mockStudentUser = {
  id: "mock_student_id",
  username: "student",
  fullName: "Student Learner",
  firstName: "Student",
  lastName: "Learner",
  primaryEmailAddress: { emailAddress: "student@elimu.local" },
  emailAddresses: [{ emailAddress: "student@elimu.local" }],
};

export function ClerkProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export function useAuth() {
  const isStudentRoute = typeof window !== "undefined" && window.location.pathname.startsWith("/student");
  return {
    isSignedIn: true,
    isLoaded: true,
    userId: isStudentRoute ? "mock_student_id" : "mock_teacher_id",
    signOut: () => {
      if (typeof window !== "undefined") {
        window.location.href = "/";
      }
      return Promise.resolve();
    },
  };
}

export function useUser() {
  const isStudentRoute = typeof window !== "undefined" && window.location.pathname.startsWith("/student");
  return {
    isSignedIn: true,
    isLoaded: true,
    user: isStudentRoute ? mockStudentUser : mockTeacherUser,
  };
}

export function useClerk() {
  return {
    signOut: () => {
      if (typeof window !== "undefined") {
        window.location.href = "/";
      }
      return Promise.resolve();
    },
  };
}

export function SignIn() {
  return null;
}

export function SignUp() {
  return null;
}
