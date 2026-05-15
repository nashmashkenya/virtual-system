import shutil
import tempfile

from django.contrib.auth.models import User
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from django.test.utils import override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from apps.classrooms.models import ClassroomSession, SessionResource
from apps.users.models import StudentProfile, TeacherProfile


class SessionResourceApiTests(TestCase):
    def setUp(self):
        self._media = tempfile.mkdtemp()
        self._settings = override_settings(
            MEDIA_ROOT=self._media,
            PUBLIC_BACKEND_BASE_URL="http://test.example",
        )
        self._settings.enable()
        self.addCleanup(self._settings.disable)
        self.addCleanup(shutil.rmtree, self._media, True)

        self.teacher = User.objects.create_user(username="res_teacher", password="x")
        TeacherProfile.objects.create(user=self.teacher)
        self.session = ClassroomSession.objects.create(
            title="Resources",
            description="",
            youtube_live_url="https://www.youtube.com/watch?v=dQw4w9WgXcQ",
            room_code="res-test-room",
            starts_at=timezone.now(),
            teacher=self.teacher,
            is_paid=False,
            join_approval_enabled=False,
            student_chat_enabled=True,
        )
        self.base = f"/api/teacher/sessions/{self.session.id}/resources/"

    def test_create_with_url_only(self):
        client = APIClient()
        client.force_authenticate(self.teacher)
        res = client.post(
            self.base,
            {"title": "Slides", "url": "https://example.com/slides"},
            format="json",
        )
        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.data["title"], "Slides")
        self.assertEqual(res.data["url"], "https://example.com/slides")
        self.assertIsNone(res.data.get("file_url"))

    def test_create_requires_url_or_file(self):
        client = APIClient()
        client.force_authenticate(self.teacher)
        res = client.post(self.base, {"title": "Empty"}, format="json")
        self.assertEqual(res.status_code, 400)

    def test_create_with_uploaded_file(self):
        client = APIClient()
        client.force_authenticate(self.teacher)
        pdf = SimpleUploadedFile("notes.pdf", b"%PDF-1.4 test", content_type="application/pdf")
        res = client.post(
            self.base,
            {"title": "Chapter 1", "file": pdf},
            format="multipart",
        )
        self.assertEqual(res.status_code, 201)
        self.assertIn("file_url", res.data)
        self.assertIsNotNone(res.data["file_url"])
        self.assertIn("http://test.example", res.data["file_url"])
        obj = SessionResource.objects.get(pk=res.data["id"])
        self.assertTrue(obj.file.name)

    def test_student_cannot_create(self):
        student = User.objects.create_user(username="res_student", password="x")
        StudentProfile.objects.create(user=student)
        client = APIClient()
        client.force_authenticate(student)
        res = client.post(
            self.base,
            {"title": "X", "url": "https://example.com"},
            format="json",
        )
        self.assertEqual(res.status_code, 403)
