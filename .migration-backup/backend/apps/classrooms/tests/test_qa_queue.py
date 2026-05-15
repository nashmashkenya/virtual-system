from django.contrib.auth.models import User
from django.core.cache import cache
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from apps.classrooms.models import ChatMessage, ClassroomSession, Enrollment
from apps.users.models import StudentProfile, TeacherProfile


class QaQueueTests(TestCase):
    def setUp(self):
        cache.clear()
        self.teacher = User.objects.create_user(username="tqa", password="x")
        TeacherProfile.objects.create(user=self.teacher)
        self.student = User.objects.create_user(username="sqa", password="x")
        StudentProfile.objects.create(user=self.student)

        self.session = ClassroomSession.objects.create(
            title="QA Test",
            description="",
            youtube_live_url="https://www.youtube.com/watch?v=dQw4w9WgXcQ",
            room_code="qa-test-room",
            starts_at=timezone.now(),
            teacher=self.teacher,
            is_paid=False,
            join_approval_enabled=False,
            student_chat_enabled=True,
            chat_moderation_mode="qa_queue",
        )
        Enrollment.objects.create(session=self.session, student=self.student)

    def test_student_message_is_queued(self):
        client = APIClient()
        client.force_authenticate(self.student)
        res = client.post("/api/student/chat-message/", {"message": "Why is the sky blue?"}, format="json")
        self.assertEqual(res.status_code, 201)
        self.assertTrue(res.data.get("qa_queued"))
        msg = ChatMessage.objects.get(pk=res.data["chat_message"]["id"])
        self.assertTrue(msg.is_hidden)
        self.assertEqual(msg.qa_status, "pending")

    def test_teacher_approve_publishes(self):
        client = APIClient()
        client.force_authenticate(self.student)
        res = client.post("/api/student/chat-message/", {"message": "Exam date?"}, format="json")
        self.assertEqual(res.status_code, 201)
        message_id = res.data["chat_message"]["id"]

        client.force_authenticate(self.teacher)
        res = client.patch(
            f"/api/teacher/sessions/{self.session.id}/chat-moderation/",
            {"message_id": message_id, "action": "approve_qa"},
            format="json",
        )
        self.assertEqual(res.status_code, 200)
        msg = ChatMessage.objects.get(pk=message_id)
        self.assertFalse(msg.is_hidden)
        self.assertEqual(msg.qa_status, "approved")

    def test_queue_capacity_returns_429(self):
        self.session.qa_queue_max_pending = 1
        self.session.save(update_fields=["qa_queue_max_pending"])

        client = APIClient()
        client.force_authenticate(self.student)
        r1 = client.post("/api/student/chat-message/", {"message": "First"}, format="json")
        self.assertEqual(r1.status_code, 201)
        r2 = client.post("/api/student/chat-message/", {"message": "Second"}, format="json")
        self.assertEqual(r2.status_code, 429)

    def test_bulk_approve_publishes_all_pending(self):
        client = APIClient()
        client.force_authenticate(self.student)
        r1 = client.post("/api/student/chat-message/", {"message": "First bulk"}, format="json")
        r2 = client.post("/api/student/chat-message/", {"message": "Second bulk"}, format="json")
        self.assertEqual(r1.status_code, 201)
        self.assertEqual(r2.status_code, 201)
        self.assertEqual(
            ChatMessage.objects.filter(session=self.session, qa_status="pending").count(),
            2,
        )

        client.force_authenticate(self.teacher)
        res = client.post(f"/api/teacher/sessions/{self.session.id}/qa-queue/bulk/", {}, format="json")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data.get("approved"), 2)
        self.assertFalse(ChatMessage.objects.filter(session=self.session, qa_status="pending").exists())
        self.assertEqual(
            ChatMessage.objects.filter(session=self.session, qa_status="approved", is_hidden=False).count(),
            2,
        )

    def test_bulk_approve_empty_queue(self):
        client = APIClient()
        client.force_authenticate(self.teacher)
        res = client.post(f"/api/teacher/sessions/{self.session.id}/qa-queue/bulk/", {}, format="json")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data.get("approved"), 0)

    def test_bulk_dismiss_clears_pending(self):
        client = APIClient()
        client.force_authenticate(self.student)
        client.post("/api/student/chat-message/", {"message": "Dismiss me"}, format="json")
        self.assertEqual(
            ChatMessage.objects.filter(session=self.session, qa_status="pending").count(),
            1,
        )

        client.force_authenticate(self.teacher)
        res = client.post(
            f"/api/teacher/sessions/{self.session.id}/qa-queue/bulk/",
            {"action": "dismiss_all"},
            format="json",
        )
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data.get("dismissed"), 1)
        self.assertEqual(res.data.get("approved"), 0)
        self.assertFalse(
            ChatMessage.objects.filter(session=self.session, qa_status="pending").exists(),
        )
