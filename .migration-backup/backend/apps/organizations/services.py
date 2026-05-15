from __future__ import annotations

from typing import Optional

from django.contrib.auth.models import User

from apps.organizations.models import Organization, OrganizationMembership


def ensure_teacher_workspace(user: User) -> Organization:
    """Create a personal organization for a new teacher account (single-tenant default)."""
    from django.utils.text import slugify

    base = slugify(f"{user.username}-workspace") or "workspace"
    slug = base[:80]
    suffix = 1
    while Organization.objects.filter(slug=slug).exists():
        suffix += 1
        slug = f"{base}-{suffix}"[:80]

    org = Organization.objects.create(
        name=f"{user.get_full_name() or user.username}'s workspace",
        slug=slug,
    )
    OrganizationMembership.objects.create(organization=org, user=user, role="teacher")
    return org


def resolve_organization_for_teacher(user: User, organization_id: Optional[int]) -> Optional[Organization]:
    """Pick org for a new/updated session: explicit id (must be teacher/admin) or first membership."""
    memberships = OrganizationMembership.objects.filter(
        user=user,
        role__in=("admin", "teacher"),
    ).select_related("organization")

    if organization_id is not None:
        m = memberships.filter(organization_id=organization_id).first()
        return m.organization if m else None

    m = memberships.first()
    return m.organization if m else None


def ensure_student_membership(user: User, organization: Organization) -> None:
    """Link a learner to an org when they join an open class (idempotent)."""
    existing = OrganizationMembership.objects.filter(organization=organization, user=user).first()
    if existing:
        return
    OrganizationMembership.objects.create(organization=organization, user=user, role="student")
