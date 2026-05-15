"""Self-enroll by room code must notify the teacher WebSocket so the roster updates live."""

from unittest.mock import patch

from django.contrib.auth.models import User
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from apps.classrooms.models import ClassroomSession, Enrollment
from apps.users.models import StudentProfile, TeacherProfile


class StudentEnrollTeacherSnapshotTests(TestCase):
    def setUp(self):
        self.teacher = User.objects.create_user(username="snap_t", password="x")
        TeacherProfile.objects.create(user=self.teacher)
        self.student = User.objects.create_user(username="snap_s", password="x")
        StudentProfile.objects.create(user=self.student)
        self.session = ClassroomSession.objects.create(
            title="Snap session",
            description="",
            youtube_live_url="https://www.youtube.com/watch?v=dQw4w9WgXcQ",
            room_code="snap-room-1",
            starts_at=timezone.now(),
            teacher=self.teacher,
            is_paid=False,
            open_enrollment=True,
            join_approval_enabled=False,
            student_chat_enabled=True,
        )

    @patch("apps.classrooms.views.broadcast_teacher_snapshot")
    def test_new_enrollment_broadcasts_teacher_snapshot(self, mock_snap):
        client = APIClient()
        client.force_authenticate(self.student)
        res = client.post("/api/student/enroll/", {"room_code": "snap-room-1"}, format="json")
        self.assertEqual(res.status_code, 201)
        self.assertTrue(
            Enrollment.objects.filter(session=self.session, student=self.student).exists(),
        )
        mock_snap.assert_called_once()

    @patch("apps.classrooms.views.broadcast_teacher_snapshot")
    def test_repeat_enroll_does_not_rebroadcast_teacher_snapshot(self, mock_snap):
        Enrollment.objects.create(
            session=self.session,
            student=self.student,
            access_status="upcoming",
            enrollment_source="join_code",
        )
        client = APIClient()
        client.force_authenticate(self.student)
        res = client.post("/api/student/enroll/", {"room_code": "snap-room-1"}, format="json")
        self.assertEqual(res.status_code, 200)
        mock_snap.assert_not_called()
