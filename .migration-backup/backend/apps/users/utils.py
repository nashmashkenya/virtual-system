from django.contrib.auth import authenticate
from django.contrib.auth.models import User

from apps.organizations.models import OrganizationMembership
from apps.users.models import StudentProfile, TeacherProfile


def infer_role(user):
    # Do not use hasattr() on reverse OneToOne relations: missing profiles raise
    # RelatedObjectDoesNotExist, not AttributeError, so hasattr can crash.
    if TeacherProfile.objects.filter(user_id=user.pk).exists():
        return "teacher"
    if StudentProfile.objects.filter(user_id=user.pk).exists():
        return "student"
    return "admin"


def serialize_user(user):
    memberships = OrganizationMembership.objects.filter(user=user).select_related("organization")
    organizations = [
        {
            "id": m.organization_id,
            "name": m.organization.name,
            "slug": m.organization.slug,
            "role": m.role,
        }
        for m in memberships.order_by("organization__name")
    ]
    return {
        "username": user.username,
        "full_name": user.get_full_name() or user.username,
        "email": user.email,
        "role": infer_role(user),
        "organizations": organizations,
    }


def get_demo_users():
    demo_users = User.objects.filter(email__iendswith="@edustream.test").order_by("username")
    return [serialize_user(user) for user in demo_users]


def authenticate_demo_user(username, password):
    return authenticate(username=username, password=password)
