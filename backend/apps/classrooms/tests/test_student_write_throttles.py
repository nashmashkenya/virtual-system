from django.conf import settings
from django.contrib.auth.models import User
from django.core.cache import cache
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from apps.classrooms.models import ClassroomSession, Enrollment
from apps.users.models import StudentProfile, TeacherProfile


def _rf_with_rates(**rates):
    rf = {**settings.REST_FRAMEWORK}
    merged = {**(rf.get("DEFAULT_THROTTLE_RATES") or {}), **rates}
    rf["DEFAULT_THROTTLE_RATES"] = merged
    return rf


@override_settings(
    REST_FRAMEWORK=_rf_with_rates(
        student_chat="2/minute",
        student_chat_slow="1/minute",
        student_raise_hand="2/minute",
    )
)
class StudentWriteThrottleTests(TestCase):
    def setUp(self):
        cache.clear()
        self.teacher = User.objects.create_user(username="t1", password="x")
        TeacherProfile.objects.create(user=self.teacher)
        self.student = User.objects.create_user(username="s1", password="x")
        StudentProfile.objects.create(user=self.student)

        self.session = ClassroomSession.objects.create(
            title="Test",
            description="",
            youtube_live_url="https://www.youtube.com/watch?v=dQw4w9WgXcQ",
            room_code="test-room",
            starts_at=timezone.now(),
            teacher=self.teacher,
            is_paid=False,
            join_approval_enabled=False,
            student_chat_enabled=True,
            student_raise_hand_enabled=True,
        )
        Enrollment.objects.create(session=self.session, student=self.student)

    def test_chat_throttle_429_after_limit(self):
        client = APIClient()
        client.force_authenticate(self.student)
        for i in range(2):
            res = client.post(
                "/api/student/chat-message/",
                {"message": f"hello-{i}"},
                format="json",
            )
            self.assertEqual(res.status_code, 201, res.content)
        res = client.post("/api/student/chat-message/", {"message": "spam"}, format="json")
        self.assertEqual(res.status_code, 429)

    def test_raise_hand_throttle_429_after_limit(self):
        client = APIClient()
        client.force_authenticate(self.student)
        for i in range(2):
            res = client.post(
                "/api/student/raise-hand/",
                {"reason": f"q-{i}"},
                format="json",
            )
            self.assertEqual(res.status_code, 200, res.content)
        res = client.post("/api/student/raise-hand/", {"reason": "again"}, format="json")
        self.assertEqual(res.status_code, 429)

    def test_slow_chat_mode_uses_stricter_throttle(self):
        self.session.chat_slow_mode = True
        self.session.save(update_fields=["chat_slow_mode"])

        client = APIClient()
        client.force_authenticate(self.student)
        first = client.post("/api/student/chat-message/", {"message": "first"}, format="json")
        second = client.post("/api/student/chat-message/", {"message": "second"}, format="json")

        self.assertEqual(first.status_code, 201, first.content)
        self.assertEqual(second.status_code, 429, second.content)
