from django.db import migrations


def backfill_organizations(apps, schema_editor):
    Organization = apps.get_model("organizations", "Organization")
    OrganizationMembership = apps.get_model("organizations", "OrganizationMembership")
    ClassroomSession = apps.get_model("classrooms", "ClassroomSession")
    Enrollment = apps.get_model("classrooms", "Enrollment")
    User = apps.get_model("auth", "User")

    org, _ = Organization.objects.get_or_create(
        slug="platform-default",
        defaults={"name": "Platform default"},
    )

    ClassroomSession.objects.filter(organization__isnull=True).update(organization=org)

    teacher_ids = set(ClassroomSession.objects.values_list("teacher_id", flat=True).distinct())
    for tid in teacher_ids:
        if not tid:
            continue
        teacher = User.objects.filter(pk=tid).first()
        if teacher is None:
            continue
        OrganizationMembership.objects.get_or_create(
            organization=org,
            user_id=teacher.pk,
            defaults={"role": "teacher"},
        )

    student_ids = set(Enrollment.objects.values_list("student_id", flat=True).distinct())
    for sid in student_ids:
        if not sid:
            continue
        OrganizationMembership.objects.get_or_create(
            organization=org,
            user_id=sid,
            defaults={"role": "student"},
        )


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):
    dependencies = [
        ("organizations", "0001_organization_hybrid_fields"),
        ("classrooms", "0018_organization_hybrid_fields"),
    ]

    operations = [
        migrations.RunPython(backfill_organizations, noop_reverse),
    ]
