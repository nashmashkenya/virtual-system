from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework.test import APIClient

from apps.organizations.models import Organization, OrganizationMembership


class OrganizationMembersApiTests(TestCase):
    def setUp(self):
        self.org = Organization.objects.create(name="Test Org", slug="test-org-api")
        self.admin = User.objects.create_user(username="org_admin", password="x")
        self.teacher = User.objects.create_user(username="org_teacher", password="x")
        self.student = User.objects.create_user(username="org_student", password="x")
        self.other = User.objects.create_user(username="org_other", password="x")
        self.new_user = User.objects.create_user(username="new_member", password="x")

        OrganizationMembership.objects.create(organization=self.org, user=self.admin, role="admin")
        OrganizationMembership.objects.create(organization=self.org, user=self.teacher, role="teacher")
        OrganizationMembership.objects.create(organization=self.org, user=self.student, role="student")

        self.members_url = f"/api/organizations/{self.org.id}/members/"

    def test_student_cannot_list_members(self):
        client = APIClient()
        client.force_authenticate(self.student)
        res = client.get(self.members_url)
        self.assertEqual(res.status_code, 403)

    def test_teacher_can_list_members(self):
        client = APIClient()
        client.force_authenticate(self.teacher)
        res = client.get(self.members_url)
        self.assertEqual(res.status_code, 200)
        usernames = {row["username"] for row in res.data}
        self.assertIn("org_student", usernames)

    def test_teacher_can_add_student_only(self):
        client = APIClient()
        client.force_authenticate(self.teacher)
        res = client.post(
            self.members_url,
            {"username": "new_member", "role": "student"},
            format="json",
        )
        self.assertEqual(res.status_code, 201)
        self.assertTrue(
            OrganizationMembership.objects.filter(
                organization=self.org,
                user=self.new_user,
                role="student",
            ).exists()
        )

    def test_teacher_cannot_assign_teacher_role(self):
        client = APIClient()
        client.force_authenticate(self.teacher)
        res = client.post(
            self.members_url,
            {"username": "org_other", "role": "teacher"},
            format="json",
        )
        self.assertEqual(res.status_code, 403)

    def test_admin_can_assign_teacher(self):
        client = APIClient()
        client.force_authenticate(self.admin)
        res = client.post(
            self.members_url,
            {"username": "org_other", "role": "teacher"},
            format="json",
        )
        self.assertEqual(res.status_code, 201)
        row = OrganizationMembership.objects.get(organization=self.org, user=self.other)
        self.assertEqual(row.role, "teacher")

    def test_teacher_can_remove_student(self):
        client = APIClient()
        client.force_authenticate(self.teacher)
        url = f"/api/organizations/{self.org.id}/members/{self.student.id}/"
        res = client.delete(url)
        self.assertEqual(res.status_code, 200)
        self.assertFalse(
            OrganizationMembership.objects.filter(organization=self.org, user=self.student).exists()
        )

    def test_teacher_cannot_remove_teacher(self):
        client = APIClient()
        client.force_authenticate(self.teacher)
        url = f"/api/organizations/{self.org.id}/members/{self.other.id}/"
        OrganizationMembership.objects.create(organization=self.org, user=self.other, role="teacher")
        res = client.delete(url)
        self.assertEqual(res.status_code, 403)

    def test_cannot_remove_self(self):
        client = APIClient()
        client.force_authenticate(self.admin)
        url = f"/api/organizations/{self.org.id}/members/{self.admin.id}/"
        res = client.delete(url)
        self.assertEqual(res.status_code, 400)

    def test_admin_can_remove_non_self_member(self):
        client = APIClient()
        client.force_authenticate(self.admin)
        url = f"/api/organizations/{self.org.id}/members/{self.student.id}/"
        res = client.delete(url)
        self.assertEqual(res.status_code, 200)
