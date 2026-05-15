from datetime import timedelta
from decimal import Decimal

from django.contrib.auth.models import User
from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.classrooms.models import (
    AttendanceRecord,
    ChatMessage,
    ClassroomSession,
    Enrollment,
    LearningProgram,
    Poll,
    PollOption,
    Quiz,
    QuizChoice,
    RaiseHandRequest,
    SessionResource,
)
from apps.organizations.models import Organization, OrganizationMembership
from apps.payments.models import Payment
from apps.users.models import StudentProfile, TeacherProfile


class Command(BaseCommand):
    help = "Seed demo ElimuPawa Classroom data."

    def handle(self, *args, **options):
        teacher, _ = User.objects.get_or_create(
            username="grace.teacher",
            defaults={"first_name": "Grace", "last_name": "Njeri", "email": "grace@edustream.test"},
        )
        teacher.set_password("password123")
        teacher.save()
        TeacherProfile.objects.get_or_create(
            user=teacher,
            defaults={"bio": "Analytics instructor", "expertise": "Data Analytics"},
        )

        school_org, _ = Organization.objects.get_or_create(
            slug="edustream-demo-school",
            defaults={"name": "ElimuPawa Demo School"},
        )
        OrganizationMembership.objects.get_or_create(
            organization=school_org,
            user=teacher,
            defaults={"role": "teacher"},
        )

        students = []
        for username, first_name, last_name, school, phone in [
            ("aisha.student", "Aisha", "Noor", "ElimuPawa Demo School", "0712000001"),
            ("brian.student", "Brian", "Otieno", "ElimuPawa Demo School", "0712000002"),
            ("faith.student", "Faith", "Wanjiru", "ElimuPawa Demo School", "0712000003"),
            ("john.student", "John", "Kamau", "ElimuPawa Demo School", "0712000004"),
        ]:
            student, _ = User.objects.get_or_create(
                username=username,
                defaults={"first_name": first_name, "last_name": last_name, "email": f"{username}@edustream.test"},
            )
            student.set_password("password123")
            student.save()
            StudentProfile.objects.get_or_create(
                user=student,
                defaults={"school_name": school, "phone_number": phone},
            )
            OrganizationMembership.objects.get_or_create(
                organization=school_org,
                user=student,
                defaults={"role": "student"},
            )
            students.append(student)

        session, _ = ClassroomSession.objects.get_or_create(
            room_code="analytics-room",
            defaults={
                "title": "Data Analytics Bootcamp",
                "description": "Growth reporting with realtime classroom insights",
                "youtube_live_url": "https://www.youtube.com/embed/jfKfPfyJRdk?rel=0",
                "starts_at": timezone.now() + timedelta(minutes=8),
                "teacher": teacher,
                "organization": school_org,
                "open_enrollment": True,
                "is_paid": True,
                "price_amount": Decimal("3500.00"),
            },
        )
        if session.organization_id != school_org.id:
            session.organization = school_org
            session.open_enrollment = True
            session.save(update_fields=["organization", "open_enrollment"])

        holiday_program, _ = LearningProgram.objects.get_or_create(
            organization=school_org,
            slug="winter-revision-2026",
            defaults={
                "title": "Winter revision 2026",
                "starts_at": timezone.now(),
                "ends_at": timezone.now() + timedelta(days=14),
            },
        )
        if session.program_id != holiday_program.id:
            session.program = holiday_program
            session.save(update_fields=["program"])

        SessionResource.objects.get_or_create(
            session=session,
            title="Sample reading (link)",
            defaults={
                "url": "https://example.com/elimuapwa-demo-resource",
                "sort_order": 0,
            },
        )

        enrollments = [
            (students[0], 82, "live_now", "Today • 6:00 PM"),
            (students[1], 54, "upcoming", "Tomorrow • 8:00 PM"),
            (students[2], 67, "paid", "Sat • 10:00 AM"),
            (students[3], 23, "locked", "Mon • 7:30 PM"),
        ]
        for student, progress, access_status, display_time in enrollments:
            Enrollment.objects.get_or_create(
                session=session,
                student=student,
                defaults={
                    "progress": progress,
                    "access_status": access_status,
                    "display_time": display_time,
                },
            )

        for student, joined_at, status in [
            (students[0], timezone.now() - timedelta(minutes=6), "Present"),
            (students[1], timezone.now() - timedelta(minutes=3), "Present"),
            (students[2], None, "Pending"),
            (students[3], timezone.now() - timedelta(minutes=1), "Present"),
        ]:
            AttendanceRecord.objects.get_or_create(
                session=session,
                student=student,
                defaults={"joined_at": joined_at, "status": status},
            )

        for sender, role, message in [
            (teacher, "teacher", "Welcome in. We are reviewing dashboards and cohort KPIs today."),
            (students[1], "student", "Can you repeat the retention formula after the break?"),
            (students[0], "student", "Quiz panel loaded perfectly on my phone."),
        ]:
            ChatMessage.objects.get_or_create(
                session=session,
                sender=sender,
                message=message,
                defaults={"role": role},
            )

        for student, reason in [
            (students[1], "Needs clarification on CAC"),
            (students[0], "Sharing sample dashboard"),
            (students[3], "Question on assignment"),
        ]:
            RaiseHandRequest.objects.get_or_create(
                session=session,
                student=student,
                reason=reason,
            )

        poll, _ = Poll.objects.get_or_create(
            session=session,
            question="Which metric should the class prioritize this week?",
            defaults={"is_active": True, "response_count": 37},
        )
        for label, value in [
            ("Attendance rate", 36),
            ("Completion rate", 48),
            ("Average quiz score", 16),
        ]:
            PollOption.objects.get_or_create(poll=poll, label=label, defaults={"value": value})

        quiz, _ = Quiz.objects.get_or_create(
            session=session,
            question="Which dashboard view is best for tracking cohort retention?",
        )
        for label in [
            "Weekly retention chart",
            "Invoice ledger",
            "Chat transcript",
            "Quiz timer",
        ]:
            QuizChoice.objects.get_or_create(quiz=quiz, label=label)

        Payment.objects.get_or_create(
            student=students[0],
            session=session,
            defaults={
                "provider": "mpesa",
                "phone_number": "0712000001",
                "amount": Decimal("3500.00"),
                "status": "success",
                "transaction_reference": "MPESA-DEMO-2026",
            },
        )

        self.stdout.write(self.style.SUCCESS("ElimuPawa demo data seeded successfully."))
