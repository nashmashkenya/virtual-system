from django.contrib.auth.models import User
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from apps.classrooms.models import ClassroomSession, JoinRequest
from apps.users.models import StudentProfile, TeacherProfile


class OpsMetricsAuthTests(TestCase):
    @override_settings(OPS_METRICS_KEY="")
    def test_metrics_disabled_without_key(self):
        response = APIClient().get("/api/ops/metrics/")
        self.assertEqual(response.status_code, 501)

    @override_settings(OPS_METRICS_KEY="secret-key")
    def test_metrics_rejects_missing_key(self):
        response = APIClient().get("/api/ops/metrics/")
        self.assertEqual(response.status_code, 401)

    @override_settings(OPS_METRICS_KEY="secret-key")
    def test_metrics_rejects_invalid_key(self):
        response = APIClient().get("/api/ops/metrics/", HTTP_X_OPS_KEY="wrong-key")
        self.assertEqual(response.status_code, 401)

    @override_settings(OPS_METRICS_KEY="secret-key")
    def test_metrics_rejects_query_key_by_default(self):
        response = APIClient().get("/api/ops/metrics/?key=secret-key")
        self.assertEqual(response.status_code, 401)

    @override_settings(OPS_METRICS_KEY="secret-key", OPS_METRICS_ALLOW_QUERY_KEY=True)
    def test_metrics_accepts_query_key_when_explicitly_enabled(self):
        response = APIClient().get("/api/ops/metrics/?key=secret-key")
        self.assertEqual(response.status_code, 200)

    @override_settings(OPS_METRICS_KEY="secret-key")
    def test_metrics_accepts_valid_key_and_returns_expected_fields(self):
        teacher = User.objects.create_user(username="ops-teacher", password="x")
        TeacherProfile.objects.create(user=teacher)
        student = User.objects.create_user(username="ops-student", password="x")
        StudentProfile.objects.create(user=student)
        session = ClassroomSession.objects.create(
            title="Ops class",
            description="",
            youtube_live_url="https://www.youtube.com/watch?v=dQw4w9WgXcQ",
            room_code="ops-room",
            starts_at=timezone.now(),
            teacher=teacher,
            is_paid=False,
        )
        JoinRequest.objects.create(session=session, student=student, status="pending")

        response = APIClient().get("/api/ops/metrics/", HTTP_X_OPS_KEY="secret-key")
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertIn("generated_at", payload)
        self.assertIn("pending_qa_count", payload)
        self.assertIn("active_session_count", payload)
        self.assertIn("waiting_room_request_count", payload)
        self.assertIn("open_raise_hand_count", payload)
        self.assertEqual(payload["waiting_room_request_count"], 1)
