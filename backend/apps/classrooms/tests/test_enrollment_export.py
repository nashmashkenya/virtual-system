from django.contrib.auth.models import User
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from apps.classrooms.models import ClassroomSession, Enrollment
from apps.users.models import StudentProfile, TeacherProfile


class TeacherEnrollmentExportTests(TestCase):
    def setUp(self):
        self.teacher = User.objects.create_user(username="exp_t", password="x", email="t@test.edu")
        TeacherProfile.objects.create(user=self.teacher)
        self.student = User.objects.create_user(
            username="exp_s",
            password="x",
            email="s@test.edu",
            first_name="Sam",
            last_name="Student",
        )
        StudentProfile.objects.create(user=self.student, school_name="Demo High", phone_number="0712000999")
        self.session = ClassroomSession.objects.create(
            title="Export 101",
            description="",
            youtube_live_url="https://www.youtube.com/watch?v=dQw4w9WgXcQ",
            room_code="export-room",
            starts_at=timezone.now(),
            teacher=self.teacher,
            is_paid=False,
            open_enrollment=True,
            join_approval_enabled=False,
            student_chat_enabled=True,
        )
        Enrollment.objects.create(
            session=self.session,
            student=self.student,
            access_status="upcoming",
            enrollment_source="join_code",
            progress=12,
            display_time="Mon 10:00",
        )

    def test_teacher_downloads_pdf_roster(self):
        client = APIClient()
        client.force_authenticate(self.teacher)
        res = client.get(f"/api/teacher/sessions/{self.session.id}/enrollments/export/")
        self.assertEqual(res.status_code, 200)
        self.assertIn("application/pdf", res["Content-Type"])
        self.assertIn("attachment", res["Content-Disposition"])
        self.assertIn(".pdf", res["Content-Disposition"])
        self.assertTrue(res.content.startswith(b"%PDF"))
        # Compressed streams are typical; small roster should still be a compact file
        self.assertLess(len(res.content), 512 * 1024)

    def test_non_teacher_forbidden(self):
        client = APIClient()
        client.force_authenticate(self.student)
        res = client.get(f"/api/teacher/sessions/{self.session.id}/enrollments/export/")
        self.assertEqual(res.status_code, 403)
