# ElimuPawa Classroom — Teacher User Manual

---

## Table of Contents

1. [Getting Started](#1-getting-started)
2. [Signing In](#2-signing-in)
3. [Your Teacher Dashboard](#3-your-teacher-dashboard)
4. [My Classes — Subjects, Lessons & Student Access](#4-my-classes--subjects-lessons--student-access)
5. [Running a Live Class](#5-running-a-live-class)
6. [Managing Your Students During a Live Class](#6-managing-your-students-during-a-live-class)
7. [Engagement Tools — Polls & Quizzes](#7-engagement-tools--polls--quizzes)
8. [Breakout Rooms](#8-breakout-rooms)
9. [Whiteboard](#9-whiteboard)
10. [Chat & Q&A Moderation](#10-chat--qa-moderation)
11. [Recording a Class](#11-recording-a-class)
12. [YouTube Broadcast Classes](#12-youtube-broadcast-classes)
13. [Class Resources & Handouts](#13-class-resources--handouts)
14. [Attendance & Enrollment](#14-attendance--enrollment)
15. [Settings](#15-settings)
16. [Tips & Troubleshooting](#16-tips--troubleshooting)

---

## 1. Getting Started

ElimuPawa Classroom is a browser-based virtual classroom platform built for Kenyan schools. As a teacher you can:

- Create and manage class subjects and scheduled lessons
- Control exactly which students have access to each lesson
- Host live interactive classes with up to 200 students
- Broadcast lectures via YouTube Live to thousands of learners
- Run polls, quizzes, and breakout group work
- Share your screen or whiteboard
- Chat and moderate student questions in real time

**Requirements**
- A modern web browser (Chrome, Firefox, Edge, or Safari)
- Internet connection (at least 1 Mbps for interactive classes)
- A device with a camera and microphone for video teaching
- No downloads or app installs needed

---

## 2. Signing In

1. Open your school's ElimuPawa link in a browser.
2. On the landing page, tap **"I am a Teacher"** on the right-hand card.
3. You are taken to the Teacher sign-in page.
4. Sign in with your **email and password**, or tap **Continue with Google** to use your Google account.

> **Tip:** If you forgot your password, tap **Forgot password?** below the sign-in form and follow the email instructions sent to your registered address.

Once signed in, you will be taken to your **Teacher Dashboard** at `/teacher`. To manage your classes and lessons, go to **My Classes** at `/teacher/classes`.

> **Note for new teachers:** Your sign-in uses a secure email-based system (powered by Clerk). Students use a separate sign-in with their ADM number — do not use the student sign-in link.

---

## 3. Your Teacher Dashboard

The Teacher Dashboard (`/teacher`) is your live classroom screen. It has three main areas:

### Top Control Bar
The bar across the top shows:
- **Live status badge** (with a pulsing dot) — shows your room's current status
- **Room type** — Interactive room or YouTube Broadcast
- **Sync status** — whether your room state is up to date
- **Room code** — the code students use to join (shown in indigo monospace font)
- **Session selector** — switch between your class rooms
- **Invite button** — copies the room join link to your clipboard
- **Class tools button** — opens the side panel for setup, roster, and activities
- **Simple/Advanced toggle** — switch between a clean view and the full control panel

### Stage Area
The large central area shows:
- Your **live video or whiteboard** when class is running
- A **camera preview** (picture-in-picture) in the bottom right corner
- Overlay badges showing student count, stage mode, mic status, and active features

### Meeting Dock (Simple View)
A floating toolbar at the bottom of the screen gives you quick access to mic, camera, screen share, student panel, and end-class controls.

---

## 4. My Classes — Subjects, Lessons & Student Access

**My Classes** (`/teacher/classes`) is where you manage everything before going live — create your class subjects, schedule individual lessons, and choose which students can access each lesson. Visit it from the top navigation or directly at `/teacher/classes`.

---

### 4.1 Creating a Class (Subject)

A **class** represents a subject you teach to a specific class level (e.g. "Mathematics — Form 2").

1. Go to **My Classes** and tap **+ New Class** (top right).
2. A form appears. Fill in:
   - **Subject** — select from the dropdown list of subjects set by your school administrator (e.g. Mathematics, English, Kiswahili)
   - **Class Level** — select the class this subject is for (e.g. Form 2, Grade 6)
   - **Description** *(optional)* — a short note about the class
3. Tap **Create Class**.

Your new class card appears in the list. Each card shows the subject, class level, and creation date.

> **Note:** Subjects and class levels are set by your school administrator to ensure uniformity across all teachers. If a subject or class level you need is not in the dropdown, contact your admin.

---

### 4.2 Scheduling a Lesson

A **lesson** is a single scheduled session within a class — each class can have many lessons.

1. From **My Classes**, tap **Schedule Lessons** on the class card you want to add a lesson to.
2. You are taken to the lessons view for that class. Tap **+ Schedule Lesson**.
3. Fill in:
   - **Lesson Title** — e.g. "Introduction to Fractions" or "Week 3 — Comprehension"
   - **Date & Time** — pick the scheduled date and start time
   - **Duration** — how long the lesson will run (default is 60 minutes)
4. Tap **Schedule Lesson**.

The lesson appears in the list with its date, time, and duration. A **Live** badge appears next to any lesson that is currently in progress.

---

### 4.3 Managing Student Access Per Lesson

You control exactly which students can see and access each lesson. Students who are not approved will not see the lesson on their dashboard at all.

1. From the lessons list, find the lesson you want to manage and tap **Manage Students**.
2. A checklist appears showing all students registered in the system.
3. Tick the checkbox next to each student who should have access to this lesson.
4. Tap **Save** to apply your selection.

Students you have ticked will see the lesson on their student dashboard under "Upcoming Lessons". Students left unticked cannot see or access it.

> **Tip:** You can update student access at any time — even after the lesson date. Simply re-open Manage Students and adjust the list.

---

### 4.4 Navigating Between Classes and Lessons

- The **breadcrumb** at the top of the page shows your current location: `My Classes / Subject (Level) / Manage Students — Lesson Title`
- Tap **My Classes** in the breadcrumb to go back to the full class list.
- Tap the class name in the breadcrumb to go back to the lessons list for that class.

---

### 4.5 Deleting a Class or Lesson

- To delete a **lesson**: tap the **Delete** button (trash icon) on the lesson card. This also removes all student access records for that lesson.
- To delete a **class**: tap the **Delete** button on the class card. This removes the class and all its lessons permanently.

> **Warning:** Deleting a class cannot be undone. Students will immediately lose access to all lessons in that class.

---

## 5. Running a Live Class

### Starting the Meeting Controls
When you open the Teacher Dashboard (`/teacher`) with a session selected, the meeting dock appears at the bottom of the screen.

### Turning on Your Camera
- Tap the **Camera** button in the dock.
- Your browser will ask for camera permission — tap **Allow**.
- Your live camera preview appears in the bottom-right corner of the stage.
- Tap **Camera** again to turn it off.

### Turning on Your Microphone
- Tap the **Mic** button in the dock.
- Your browser will ask for microphone permission — tap **Allow**.
- A small audio level bar appears to show you are being heard.
- Tap **Mic** again to mute yourself.

### Screen Sharing
- Tap **Present** in the dock.
- A browser dialog lets you choose to share your entire screen, a window, or a browser tab.
- Your screen content appears on the main stage for all students.
- Tap **Stop presenting** to end screen share.

### Stage Modes
You can switch what students see on the main stage:
- **Whiteboard** — a collaborative drawing board (see Section 9)
- **Camera** — your live camera feed fills the stage
- **Screen share** — your shared screen fills the stage
- **YouTube** — the embedded YouTube video plays

Switch stage modes from the **Stage & share** section in the Advanced controls panel.

### Ending the Class
Tap the red **Leave class** button in the dock. This does not delete the room — it simply ends your active session. Students will be disconnected.

---

## 6. Managing Your Students During a Live Class

### Viewing Students
1. Open **Class tools** → tap the **Students** tab.
2. You will see a list of enrolled students with their status (live, present, or pending).

### Waiting Room (Join Approval)
If you want to approve students before they enter:
1. Turn on **Waiting room** from the meeting dock or Advanced controls → Class tools section.
2. When a student requests to join, their name and reason appear under **Waiting** in the Students tab.
3. Tap **Approve** to let them in, or **Deny** to decline.
4. Tap **Approve all** to let everyone in at once.

### Removing a Student
1. In the Students tab, find the student's card.
2. Tap the **Remove** option next to their name.
3. Confirm the removal — the student is disconnected from the session.

### Raise Hand Requests
When a student raises their hand, a notification appears in your dock. You can:
- **Grant speaking** — allow the student to unmute and speak
- **Dismiss** — lower the hand without granting speech

### Student Stream Filter
In the Students tab, use the filter dropdown to view students by stream (school class/form) to manage large rosters more easily.

---

## 7. Engagement Tools — Polls & Quizzes

### Creating a Poll
1. Open **Class tools** → tap **Activities** tab.
2. Scroll to the **Polls** section.
3. Tap **New poll**.
4. Enter your question in the **Poll question** field.
5. Enter the answer options, one per line, in the options field.
6. Tap **Save poll**.
7. To launch it live, tap **Activate** next to the poll — students will see it immediately on their screens.

### Creating a Quiz
1. In the **Activities** tab, scroll to **Quizzes**.
2. Tap **New quiz**.
3. Enter the question and answer choices (one per line).
4. Tap **Save quiz**.
5. Tap **Activate** to push the quiz live to all connected students.

### Viewing Results
Once students respond, results are collected automatically. You can see response counts in real time in the Activities panel. Deactivate a poll or quiz to close it for students.

---

## 8. Breakout Rooms

Breakout rooms let you split students into small groups for discussions or group work.

### Starting Breakout Groups
1. Open **Class tools** → **Activities** tab → scroll to **Breakout rooms**.
2. Choose the **number of groups** (2–6) from the dropdown.
3. Optionally set a **timer** (in minutes) for the breakout session.
4. Tap **Start small groups** — students are split evenly and automatically moved into their groups.

### During Breakouts
- Students can chat within their group.
- You can **monitor** any group by tapping **Monitor** next to a group name — you join their chat as a silent observer.
- You can **broadcast a message** to all groups at once using the broadcast field.
- Assign a **spokesperson** per group to lead the report-back.

### Ending Breakouts
Tap **Bring everyone back** — all students return to the main class instantly.

### Reusing Last Groups
If you ran breakouts before, tap **Use the same groups as last time** to recreate the same layout without reshuffling.

---

## 9. Whiteboard

The whiteboard turns your stage into a shared drawing canvas.

### Activating the Whiteboard
1. In the Advanced controls → Stage & share section, tap **Whiteboard**.
2. The stage switches to the whiteboard view.

### Drawing Tools
Use the toolbar inside the whiteboard area to:
- Draw freehand lines, shapes, and text
- Select and move objects
- Change colours and stroke sizes
- Erase content

### Whiteboard Controls (top-right overlay)
- **Save state** — a dot indicator shows Saving → Saved → Ready
- **Lock board** — prevent edits (useful for presenting)
- **Present mode** — hides the drawing toolbar for a cleaner student view
- **Retry** — if a save fails, tap Retry to re-upload your whiteboard state

### Clearing the Whiteboard
Tap the clear button inside the whiteboard toolbar. This resets the board for everyone.

---

## 10. Chat & Q&A Moderation

### Student Chat
By default, students can send messages in the class chat. To control this:
- **Disable chat** — tap Chat on/off from the Advanced controls → Class tools section
- **Slow mode** — limits how often students can send messages (reduces spam)
- **Q&A queue mode** — messages are held for your approval before being shown to the class

### Q&A Queue Mode
1. Toggle **Q&A queue on** from the controls.
2. Student messages go into a pending queue.
3. In the Students tab, find the **Q&A queue** section.
4. Tap **Approve** next to a message to display it, or **Dismiss** to remove it.
5. Tap **Approve all** or **Dismiss all** to bulk-action the queue.
6. Set the **max pending** limit to cap the queue size.

### Moderating Individual Messages
Find any sent chat message and tap **Moderate** to remove it from the chat for all students.

---

## 11. Recording a Class

You can record your camera or screen share directly in the browser.

### Starting a Recording
1. Open the Advanced controls panel (tap **Advanced** in the top bar).
2. Scroll to the **Recording** section.
3. Tap **Start recording**.
4. Recording begins from your active media source (screen share takes priority over camera).

### Pausing and Stopping
- Tap **Pause recording** to temporarily pause.
- Tap **Resume recording** to continue.
- Tap **Stop recording** — the file is automatically downloaded to your device as a video file.

> **Note:** Recordings are saved locally on your device. Make sure you have enough storage space before starting a long recording.

---

## 12. YouTube Broadcast Classes

For large classes (200–5,000 students), use Broadcast mode so students watch your live stream on YouTube while interacting in ElimuPawa.

### Setting Up a Broadcast Class
1. Create a new session with **Delivery mode: Broadcast lecture**.
2. Open **Class tools → Class setup**.
3. In Step 1, fill in your class basics and tap **Create class now**.
4. Go to [YouTube Studio](https://studio.youtube.com/) and start a live stream. Copy the **watch link**.
5. Back in ElimuPawa, paste the YouTube link into the **YouTube Live link** field.

### Connecting Google / YouTube (Optional)
Connecting your Google account lets ElimuPawa automatically check your stream status:
1. In the Class setup panel, scroll to **Google connect**.
2. Tap **Connect with Google** — you will be redirected to Google's sign-in page.
3. Approve the permissions and you will be returned to ElimuPawa automatically.
4. Your stream status (Live, Scheduled, Offline) will now update automatically.

### Ready Check
The **Ready score (0/3)** shows your broadcast readiness:
- ✅ YouTube connected
- ✅ YouTube link added
- ✅ Stream status confirmed

All three checked = you are ready to go live.

---

## 13. Class Resources & Handouts

Share documents, links, and files with your students for each session.

### Adding a Resource
1. Open **Class tools → Class setup**.
2. Scroll to the **Students & handouts** section (tap to expand).
3. Enter a **Resource title** and either:
   - Paste a **URL** (link to a document, video, or website), or
   - Upload a **file** from your device
4. Tap **Add resource** — it becomes available to all enrolled students.

### Removing a Resource
Find the resource in the list and tap the **Remove** (×) button next to it.

---

## 14. Attendance & Enrollment

### Viewing Attendance
In the Students tab, each student card shows their attendance status:
- **Present** — they are connected to the live class
- **Pending** — they have not yet joined

Tap **Mark present** or **Mark pending** to manually update a student's attendance.

### Managing Enrollments
To update a student's access to a class:
1. Open the **Students** tab in Class tools.
2. Find the student and tap the **enrollment status** dropdown.
3. Set it to **Enrolled**, **Waitlisted**, or **Blocked** as needed.
4. Tap **Save** to apply.

### Downloading the Roster
Tap the **Download roster (PDF)** button in the Students tab to export a printable list of enrolled students with their attendance records.

### Per-Lesson Student Access
In addition to live class enrollment above, you can also control which students see each **scheduled lesson** on their dashboard. See [Section 4.3](#43-managing-student-access-per-lesson) for full details.

---

## 15. Settings

Access your personal settings at `/settings` (tap the **Settings** icon in the bottom navigation bar).

### Dark Mode
Toggle between light and dark mode using the switch on the Settings page. Your preference is saved automatically.

### Profile Summary
The settings page shows your account name, email address, and role. To update personal details, tap the profile icon in the top navigation and use your account settings.

---

## 16. Tips & Troubleshooting

### Students Cannot Hear Me
- Check that your **Mic** button in the dock is green (on).
- Make sure your browser has microphone permission (check the address bar for a blocked icon).
- Refresh the page and turn the mic on again.

### Camera is Not Showing
- Tap **Camera** in the dock and allow the browser permission prompt.
- Only one browser tab can use your camera at a time — close other video apps.
- On mobile, ensure the browser has camera access in your device's settings.

### Students Cannot Join or Cannot See a Lesson
- Make sure you have **approved the student** in My Classes → the lesson → Manage Students.
- Only students with a tick next to their name will see the lesson on their dashboard.
- Share the **Room code** (shown in the top bar of the Teacher Dashboard) for the live class itself.
- Or tap **Invite** to copy a direct join link and send it via WhatsApp or SMS.

### A Subject or Class Level Is Missing from the Dropdown
- Subjects and class levels are managed by your school administrator.
- Contact your admin and ask them to add the missing item at `/admin`.
- Once added, it will appear in your dropdown immediately on next page load.

### Students Cannot Sign In
- Students sign in using their **ADM number** and the **first 7 digits** of the parent/guardian phone number registered during sign-up.
- If a student registered with phone number 0712345678, their password is **0712345**.
- If a student cannot sign in, they may need to re-register or contact the admin.

### Whiteboard Is Not Saving
- A red dot with "Save failed" appears in the top-right of the whiteboard.
- Tap **Retry** to re-attempt the save.
- Check your internet connection and try again.

### Page Feels Slow
- Close unused browser tabs.
- Turn off your camera if you are only teaching via whiteboard or screen share.
- On a slow connection, use **Broadcast mode** instead of Interactive so students watch YouTube (lower load on your side).

### How to Switch Between Your Classes
Use the **Session selector** dropdown in the top bar of the Teacher Dashboard to switch between live rooms without leaving the dashboard. To switch between class subjects and lessons, go to **My Classes** (`/teacher/classes`).

---

*ElimuPawa Classroom — built for teachers, designed for Kenya.*

*For technical support, contact your school administrator.*
