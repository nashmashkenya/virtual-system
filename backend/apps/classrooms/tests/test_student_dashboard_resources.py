import shutil
import tempfile

from django.contrib.auth.models import User
from django.core.files.base import ContentFile
from django.test import TestCase
from django.test.utils import override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from apps.classrooms.models import ClassroomSession, Enrollment, SessionResource
from apps.classrooms.views import absolute_media_url
from apps.users.models import StudentProfile, TeacherProfile


class StudentDashboardSessionResourcesTests(TestCase):
    def setUp(self):
        self._media = tempfile.mkdtemp()
        self._settings = override_settings(
            MEDIA_ROOT=self._media,
            PUBLIC_BACKEND_BASE_URL="http://test.example",
        )
        self._settings.enable()
        self.addCleanup(self._settings.disable)
        self.addCleanup(shutil.rmtree, self._media, True)

        self.teacher = User.objects.create_user(username="dash_teach", password="x")
        TeacherProfile.objects.create(user=self.teacher)
        self.student = User.objects.create_user(username="dash_student", password="x")
        StudentProfile.objects.create(user=self.student)
        self.session = ClassroomSession.objects.create(
            title="Dash Resources",
            description="",
            youtube_live_url="https://www.youtube.com/watch?v=dQw4w9WgXcQ",
            room_code="dash-res-room",
            starts_at=timezone.now(),
            teacher=self.teacher,
            is_paid=False,
            join_approval_enabled=False,
            student_chat_enabled=True,
        )
        Enrollment.objects.create(session=self.session, student=self.student)

    def test_dashboard_lists_external_url_in_session_resources(self):
        SessionResource.objects.create(
            session=self.session,
            title="Week 1 slides",
            url="https://example.com/week1",
            sort_order=0,
        )
        client = APIClient()
        client.force_authenticate(self.student)
        res = client.get("/api/student/dashboard/")
        self.assertEqual(res.status_code, 200)
        items = res.data["session_resources"]
        self.assertEqual(len(items), 1)
        self.assertEqual(items[0]["title"], "Week 1 slides")
        self.assertEqual(items[0]["url"], "https://example.com/week1")

    def test_dashboard_lists_absolute_url_for_uploaded_file(self):
        resource = SessionResource(session=self.session, title="Handout", url="", sort_order=0)
        resource.save()
        resource.file.save("handout.pdf", ContentFile(b"%PDF-1.4"), save=True)
        resource.refresh_from_db()

        client = APIClient()
        client.force_authenticate(self.student)
        res = client.get("/api/student/dashboard/")
        self.assertEqual(res.status_code, 200)
        items = res.data["session_resources"]
        self.assertEqual(len(items), 1)
        self.assertEqual(items[0]["title"], "Handout")
        expected = absolute_media_url(resource.file.url)
        self.assertEqual(items[0]["url"], expected)
        self.assertTrue(str(items[0]["url"]).startswith("http://test.example"))
