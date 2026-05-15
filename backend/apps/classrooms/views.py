from django.db import OperationalError, transaction
from django.db.models import Count, Max, Q
from django.http import HttpResponse
from django.utils import timezone
from django.utils.dateparse import parse_datetime
from django.utils.text import slugify
from rest_framework import status
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from django.contrib.auth.models import User
from apps.classrooms.throttles import StudentWriteScopedThrottle
from apps.classrooms.roster_pdf import build_session_roster_pdf
from apps.classrooms.models import (
    AttendanceRecord,
    BreakoutRoom,
    ChatMessage,
    ClassroomSession,
    Enrollment,
    JoinRequest,
    LearningProgram,
    Poll,
    PollOption,
    PollVote,
    Quiz,
    QuizChoice,
    QuizSubmission,
    RaiseHandRequest,
    SessionResource,
    WhiteboardState,
)
from apps.classrooms.realtime import (
    broadcast_classroom_signal,
    broadcast_classroom_snapshots,
    broadcast_student_dashboard,
    broadcast_teacher_snapshot,
)
from apps.organizations.models import OrganizationMembership
from apps.organizations.services import (
    ensure_student_membership,
    ensure_teacher_workspace,
    resolve_organization_for_teacher,
)
from apps.classrooms.serializers import (
    AttendanceMutationSerializer,
    ChatModerationMutationSerializer,
    CreateSessionSerializer,
    EnrollmentMutationSerializer,
    EnrollmentSerializer,
    LearningProgramMutationSerializer,
    LearningProgramSerializer,
    PollAuthoringSerializer,
    PollMutationSerializer,
    PollUpdateSerializer,
    QaQueueBulkActionSerializer,
    RaiseHandMutationSerializer,
    QuizAuthoringSerializer,
    QuizMutationSerializer,
    StudentChatMessageSerializer,
    StudentJoinRequestSerializer,
    StudentRaiseHandSerializer,
    StudentPollVoteSerializer,
    StudentQuizSubmissionSerializer,
    TeacherChatMessageSerializer,
    TeacherJoinRequestMutationSerializer,
    TeacherRoomStateMutationSerializer,
    QuizUpdateSerializer,
    StudentDirectorySerializer,
    StudentDashboardSerializer,
    SessionResourcePatchSerializer,
    SessionResourceSerializer,
    SessionResourceWriteSerializer,
    StudentEnrollByCodeSerializer,
    TeacherSessionMutationSerializer,
    TeacherSessionSerializer,
    TeacherDashboardSerializer,
    TeacherBreakoutMutationSerializer,
    TeacherBreakoutCreateSerializer,
    StudentBreakoutRoomSerializer,
    TeacherBreakoutBroadcastSerializer,
    TeacherWhiteboardMutationSerializer,
)
from apps.users.permissions import IsStudentUser, IsTeacherUser


STUDENT_DASHBOARD = {
    "live_class": {
        "course_title": "Data Analytics Bootcamp",
        "session_title": "Growth reporting with realtime classroom insights",
        "youtube_embed_url": "https://www.youtube.com/embed/jfKfPfyJRdk?rel=0",
        "room_code": "data-analytics-bootcamp",
        "is_live": True,
        "price_label": "KSh 3,500",
        "payment_required": True,
        "student_paid": False,
        "waiting_room_enabled": False,
        "join_status": "not_required",
        "can_join_room": True,
        "delivery_mode": "broadcast",
        "expected_participants": 1200,
        "broadcast_only": True,
        "program_title": "",
        "program_window": "",
    },
    "room_state": {
        "stage_mode": "camera",
        "teacher_camera_enabled": False,
        "teacher_mic_enabled": True,
        "screen_share_enabled": False,
        "whiteboard_enabled": False,
        "student_chat_enabled": True,
        "chat_moderation_mode": "open",
        "qa_queue_max_pending": 75,
        "chat_slow_mode": False,
        "qa_queue_pending_count": 0,
        "student_raise_hand_enabled": True,
        "join_approval_enabled": False,
        "spotlight_mode": "off",
        "breakout_enabled": False,
        "monitored_breakout_room_id": None,
        "breakout_timer_ends_at": None,
        "last_breakout_layout_available": False,
        "recording_status": "idle",
        "recording_started_at": None,
    },
    "breakout_room": None,
    "breakout_broadcast": None,
    "whiteboard": {
        "pages": [
            {
                "id": "page-1",
                "name": "Page 1",
                "strokes": [],
            }
        ],
        "active_page": 0,
        "updated_at": "-",
    },
    "engagement_stats": [
        {"label": "Chat", "value": "24 messages", "detail": "Teacher highlights enabled"},
        {"label": "Raise Hand", "value": "Priority enabled", "detail": "Queue sorted by urgency"},
        {"label": "Polls", "value": "1 live poll", "detail": "Realtime responses"},
        {"label": "Quiz", "value": "4 questions", "detail": "Auto-save active"},
    ],
    "poll": {
        "id": 1,
        "question": "Which metric should the class prioritize this week?",
        "response_count": 37,
        "selected_option_id": None,
        "options": [
            {"id": 1, "label": "Attendance rate", "value": 36},
            {"id": 2, "label": "Completion rate", "value": 48},
            {"id": 3, "label": "Average quiz score", "value": 16},
        ],
    },
    "quiz": {
        "id": 1,
        "question": "Which dashboard view is best for tracking cohort retention?",
        "selected_choice_id": None,
        "submitted": False,
        "choices": [
            {"id": 1, "label": "Weekly retention chart"},
            {"id": 2, "label": "Invoice ledger"},
            {"id": 3, "label": "Chat transcript"},
            {"id": 4, "label": "Quiz timer"},
        ],
    },
    "courses": [
        {
            "title": "Data Analytics Bootcamp",
            "coach": "Grace Njeri",
            "time": "Today • 6:00 PM",
            "status": "Live now",
            "progress": 82,
        },
        {
            "title": "UI Engineering Masterclass",
            "coach": "David Kimani",
            "time": "Tomorrow • 8:00 PM",
            "status": "Upcoming",
            "progress": 54,
        },
        {
            "title": "Business English Live",
            "coach": "Mary Atieno",
            "time": "Sat • 10:00 AM",
            "status": "Paid",
            "progress": 67,
        },
    ],
    "messages": [
        {
            "id": 1,
            "sender": "Grace Njeri",
            "role": "teacher",
            "message": "Welcome in. We are reviewing dashboards and cohort KPIs today.",
            "time": "6:02 PM",
        },
        {
            "id": 2,
            "sender": "Kevin",
            "role": "student",
            "message": "Can you repeat the retention formula after the break?",
            "time": "6:04 PM",
        },
        {
            "id": 3,
            "sender": "Aisha",
            "role": "student",
            "message": "Quiz panel loaded perfectly on my phone.",
            "time": "6:05 PM",
        },
    ],
    "session_resources": [],
}

# Used when teachers skip the video URL at session create/update (valid URL required on the model).
DEFAULT_SESSION_YOUTUBE_URL = "https://www.youtube.com/embed/jfKfPfyJRdk?rel=0"

TEACHER_DASHBOARD = {
    "form_defaults": {
        "title": "Advanced Data Analytics",
        "youtube_link": "https://www.youtube.com/live/jfKfPfyJRdk",
        "starts_at": "2026-04-10T18:00",
        "delivery_mode": "broadcast",
        "expected_participants": 1200,
    },
    "room_state": {
        "stage_mode": "camera",
        "teacher_camera_enabled": False,
        "teacher_mic_enabled": True,
        "screen_share_enabled": False,
        "whiteboard_enabled": False,
        "student_chat_enabled": True,
        "chat_moderation_mode": "open",
        "qa_queue_max_pending": 75,
        "chat_slow_mode": False,
        "qa_queue_pending_count": 0,
        "student_raise_hand_enabled": True,
        "join_approval_enabled": False,
        "spotlight_mode": "off",
        "breakout_enabled": False,
        "monitored_breakout_room_id": None,
        "breakout_timer_ends_at": None,
        "last_breakout_layout_available": False,
        "recording_status": "idle",
        "recording_started_at": None,
    },
    "whiteboard": {
        "pages": [
            {
                "id": "page-1",
                "name": "Page 1",
                "strokes": [],
            }
        ],
        "active_page": 0,
        "updated_at": "-",
    },
    "metrics": [
        {"label": "Live attendance", "value": "42", "detail": "48 enrolled learners"},
        {"label": "Paid learners", "value": "18", "detail": "Access unlocked for the next class"},
        {"label": "Locked learners", "value": "06", "detail": "Need payment or approval"},
        {"label": "Average progress", "value": "76%", "detail": "Across the active roster"},
        {"label": "Raised hands", "value": "07", "detail": "2 urgent questions"},
        {"label": "Q&A queue", "value": "00 / 75", "detail": "Open chat (not queuing)"},
        {"label": "Revenue today", "value": "KSh 72,000", "detail": "12 successful payments"},
    ],
    "attendance": [
        {"student_id": 1, "name": "Aisha Noor", "joined_at": "5:58 PM", "status": "Present", "payment": "Paid"},
        {"student_id": 2, "name": "Brian Otieno", "joined_at": "6:01 PM", "status": "Present", "payment": "Paid"},
        {"student_id": 3, "name": "Faith Wanjiru", "joined_at": "-", "status": "Pending", "payment": "Locked"},
        {"student_id": 4, "name": "John Kamau", "joined_at": "6:03 PM", "status": "Present", "payment": "Paid"},
    ],
    "polls": [
        {
            "id": 1,
            "question": "Which metric should the class prioritize this week?",
            "is_active": True,
            "response_count": 37,
            "options": [
                {"id": 1, "label": "Attendance rate", "value": 36},
                {"id": 2, "label": "Completion rate", "value": 48},
                {"id": 3, "label": "Average quiz score", "value": 16},
            ],
        }
    ],
    "quizzes": [
        {
            "id": 1,
            "question": "Which dashboard view is best for tracking cohort retention?",
            "is_active": True,
            "choices": [
                {"id": 1, "label": "Weekly retention chart"},
                {"id": 2, "label": "Invoice ledger"},
                {"id": 3, "label": "Chat transcript"},
                {"id": 4, "label": "Quiz timer"},
            ],
        }
    ],
    "raise_hand_queue": [
        {"id": 1, "student_id": 1, "name": "Kevin", "reason": "Needs clarification on CAC", "wait": "1m"},
        {"id": 2, "student_id": 2, "name": "Joy", "reason": "Sharing sample dashboard", "wait": "3m"},
        {"id": 3, "student_id": 3, "name": "Ahmed", "reason": "Question on assignment", "wait": "5m"},
    ],
    "waiting_room_queue": [
        {"id": 1, "student_id": 1, "name": "Kevin", "reason": "Waiting to join class", "wait": "1m"},
    ],
    "breakout_rooms": [
        {
            "id": 1,
            "name": "Breakout Room 1",
            "member_count": 2,
            "teacher_present": True,
            "spokesperson_student_id": 1,
            "spokesperson_name": "Aisha Noor",
            "students": [
                {"student_id": 1, "name": "Aisha Noor", "status": "Present"},
                {"student_id": 2, "name": "Brian Otieno", "status": "Pending"},
            ],
        }
    ],
    "breakout_broadcast": {
        "message": "You have 5 minutes left. Choose one speaker for your group.",
        "sent_at": "6:12 PM",
    },
    "last_breakout_summary": {
        "room_count": 2,
        "total_learners": 4,
        "rooms": [
            {
                "name": "Breakout Room 1",
                "member_names": ["Aisha Noor", "Brian Otieno"],
                "spokesperson_name": "Aisha Noor",
            },
            {
                "name": "Breakout Room 2",
                "member_names": ["Faith Wanjiru", "John Kamau"],
                "spokesperson_name": "John Kamau",
            },
        ],
    },
    "moderation_insights": [
        {
            "id": 1,
            "sender": "Kevin",
            "role": "student",
            "message": "Kevin asks about CAC formula consistency.",
            "is_pinned": True,
        },
        {
            "id": 2,
            "sender": "Aisha",
            "role": "student",
            "message": "Aisha shared a polished dashboard screenshot.",
            "is_pinned": False,
        },
        {
            "id": 3,
            "sender": "Joy",
            "role": "student",
            "message": "Joy flagged an audio sync issue from mobile Safari.",
            "is_pinned": False,
        },
    ],
    "qa_queue": [],
    "messages": [
        {
            "id": 1,
            "sender": "Grace Njeri",
            "role": "teacher",
            "message": "Welcome in. We are reviewing dashboards and cohort KPIs today.",
            "time": "6:02 PM",
        },
        {
            "id": 2,
            "sender": "Kevin",
            "role": "student",
            "message": "Can you repeat the retention formula after the break?",
            "time": "6:04 PM",
        },
        {
            "id": 3,
            "sender": "Aisha",
            "role": "student",
            "message": "Quiz panel loaded perfectly on my phone.",
            "time": "6:05 PM",
        },
    ],
    "stream_preview": {
        "badge": "Now streaming",
        "title": "Advanced Data Analytics",
        "youtube_link": "https://www.youtube.com/live/jfKfPfyJRdk",
    },
}


def format_time(value):
    if not value:
        return "-"
    return value.strftime("%I:%M %p").lstrip("0")


def format_program_window(program):
    if program is None:
        return ""
    return f"{program.starts_at.date().isoformat()} → {program.ends_at.date().isoformat()}"


def absolute_media_url(relative_path: str) -> str:
    """Build absolute URL for uploaded files (student UI may run on a different origin)."""
    from django.conf import settings

    if not relative_path:
        return ""
    base = getattr(settings, "PUBLIC_BACKEND_BASE_URL", "") or ""
    path = relative_path if relative_path.startswith("/") else f"/{relative_path}"
    return f"{base}{path}" if base else path


def parse_session_datetime(value):
    parsed = parse_datetime(value)
    if parsed is None:
        return timezone.now()
    if timezone.is_naive(parsed):
        return timezone.make_aware(parsed, timezone.get_current_timezone())
    return parsed


def full_name(user):
    return (user.get_full_name() or user.username).strip()


def is_broadcast_classroom(session):
    return session is not None and session.delivery_mode == "broadcast"


def save_breakout_layout_snapshot(session):
    layout = [
        {
            "name": room.name,
            "student_ids": student_ids,
            "spokesperson_student_id": room.spokesperson_id if room.spokesperson_id in student_ids else None,
        }
        for room in session.breakout_rooms.prefetch_related("enrollments").all()
        for student_ids in [list(room.enrollments.order_by("student__username", "student_id").values_list("student_id", flat=True))]
    ]
    session.last_breakout_layout = layout
    session.save(update_fields=["last_breakout_layout"])
    return layout


def close_breakout_rooms(session, *, closing_message=""):
    breakout_room_ids = list(session.breakout_rooms.values_list("id", flat=True))
    had_monitored_breakout_room = session.monitored_breakout_room_id is not None

    with transaction.atomic():
        if breakout_room_ids:
            save_breakout_layout_snapshot(session)
        if breakout_room_ids:
            session.messages.filter(breakout_room_id__in=breakout_room_ids).update(is_hidden=True)

        session.enrollments.update(breakout_room=None)
        session.breakout_rooms.all().delete()

        if had_monitored_breakout_room:
            session.monitored_breakout_room = None

        changed_fields = []
        if session.breakout_enabled:
            session.breakout_enabled = False
            changed_fields.append("breakout_enabled")
        if had_monitored_breakout_room:
            changed_fields.append("monitored_breakout_room")
        if session.breakout_timer_ends_at is not None:
            session.breakout_timer_ends_at = None
            changed_fields.append("breakout_timer_ends_at")
        if session.breakout_broadcast_message:
            session.breakout_broadcast_message = ""
            changed_fields.append("breakout_broadcast_message")
        if session.breakout_broadcast_sent_at is not None:
            session.breakout_broadcast_sent_at = None
            changed_fields.append("breakout_broadcast_sent_at")
        if changed_fields:
            session.save(update_fields=changed_fields)

        if closing_message:
            ChatMessage.objects.create(
                session=session,
                sender=session.teacher,
                role="teacher",
                message=closing_message,
            )


def sync_expired_breakout_timer(session):
    if session is None or not session.breakout_enabled or session.breakout_timer_ends_at is None:
        return False

    if session.breakout_timer_ends_at > timezone.now():
        return False

    close_breakout_rooms(
        session,
        closing_message="Breakout time is up. Everyone has returned to the main room.",
    )
    return True


def pending_qa_message_count(session):
    if session is None:
        return 0
    return session.messages.filter(
        qa_status="pending",
        role="student",
        breakout_room__isnull=True,
    ).count()


def default_room_state():
    return {
        "stage_mode": "camera",
        "teacher_camera_enabled": False,
        "teacher_mic_enabled": False,
        "screen_share_enabled": False,
        "whiteboard_enabled": False,
        "student_chat_enabled": True,
        "chat_moderation_mode": "open",
        "qa_queue_max_pending": 75,
        "chat_slow_mode": False,
        "qa_queue_pending_count": 0,
        "student_raise_hand_enabled": True,
        "join_approval_enabled": False,
        "spotlight_mode": "off",
        "breakout_enabled": False,
        "monitored_breakout_room_id": None,
        "breakout_timer_ends_at": None,
        "last_breakout_layout_available": False,
        "recording_status": "idle",
        "recording_started_at": None,
    }


def default_whiteboard_state():
    return {
        "pages": [
            {
                "id": "page-1",
                "name": "Page 1",
                "strokes": [],
            }
        ],
        "active_page": 0,
        "updated_at": "-",
    }


def build_room_state(session):
    if session is None:
        return default_room_state()

    return {
        "stage_mode": session.stage_mode,
        "teacher_camera_enabled": session.teacher_camera_enabled,
        "teacher_mic_enabled": session.teacher_mic_enabled,
        "screen_share_enabled": session.screen_share_enabled,
        "whiteboard_enabled": session.whiteboard_enabled,
        "student_chat_enabled": session.student_chat_enabled,
        "chat_moderation_mode": session.chat_moderation_mode,
        "qa_queue_max_pending": session.qa_queue_max_pending,
        "chat_slow_mode": session.chat_slow_mode,
        "qa_queue_pending_count": pending_qa_message_count(session),
        "student_raise_hand_enabled": session.student_raise_hand_enabled,
        "join_approval_enabled": session.join_approval_enabled,
        "spotlight_mode": session.spotlight_mode,
        "breakout_enabled": session.breakout_enabled,
        "monitored_breakout_room_id": session.monitored_breakout_room_id,
        "breakout_timer_ends_at": session.breakout_timer_ends_at.isoformat() if session.breakout_timer_ends_at else None,
        "last_breakout_layout_available": bool(session.last_breakout_layout),
        "recording_status": session.recording_status,
        "recording_started_at": session.recording_started_at.isoformat() if session.recording_started_at else None,
    }


def build_whiteboard_payload(session):
    if session is None:
        return default_whiteboard_state()

    whiteboard, _ = WhiteboardState.objects.get_or_create(session=session)
    pages = whiteboard.pages if whiteboard.pages else default_whiteboard_state()["pages"]
    return {
        "pages": pages,
        "active_page": whiteboard.active_page,
        "updated_at": whiteboard.updated_at.isoformat() if whiteboard.updated_at else "-",
    }


def build_breakout_broadcast(session):
    if not session.breakout_broadcast_message or not session.breakout_broadcast_sent_at:
        return None

    return {
        "message": session.breakout_broadcast_message,
        "sent_at": format_time(session.breakout_broadcast_sent_at),
    }


def get_student_enrollment(session, student_user):
    if session is None or student_user is None:
        return None

    return session.enrollments.select_related("breakout_room").filter(student=student_user).first()


def get_student_breakout_room(session, student_user):
    if session is None or student_user is None or not session.breakout_enabled:
        return None

    enrollment = get_student_enrollment(session, student_user)
    if enrollment is None:
        return None
    return enrollment.breakout_room


def build_breakout_rooms(session, attendance_records=None):
    attendance_records = attendance_records or {}
    rooms = session.breakout_rooms.select_related("spokesperson").prefetch_related("enrollments__student").all()
    payload = []
    for room in rooms:
        members = []
        for enrollment in room.enrollments.select_related("student").all():
            record = attendance_records.get(enrollment.student_id)
            members.append(
                {
                    "student_id": enrollment.student_id,
                    "name": full_name(enrollment.student),
                    "status": record.status if record else "Pending",
                }
            )
        member_ids = {member["student_id"] for member in members}
        spokesperson_student_id = room.spokesperson_id if room.spokesperson_id in member_ids else None
        payload.append(
            {
                "id": room.id,
                "name": room.name,
                "member_count": len(members),
                "teacher_present": session.monitored_breakout_room_id == room.id,
                "spokesperson_student_id": spokesperson_student_id,
                "spokesperson_name": full_name(room.spokesperson) if spokesperson_student_id and room.spokesperson else None,
                "students": members,
            }
        )
    return payload


def build_last_breakout_summary(session, enrollments=None):
    if not session.last_breakout_layout:
        return None

    if enrollments is None:
        enrollments = list(session.enrollments.select_related("student").all())

    student_name_by_id = {enrollment.student_id: full_name(enrollment.student) for enrollment in enrollments}
    rooms = []
    total_learners = 0
    for room in session.last_breakout_layout:
        member_names = [student_name_by_id.get(student_id, "Removed learner") for student_id in room.get("student_ids", [])]
        total_learners += len(member_names)
        rooms.append(
            {
                "name": room.get("name") or "Breakout room",
                "member_names": member_names,
                "spokesperson_name": student_name_by_id.get(room.get("spokesperson_student_id")) if room.get("spokesperson_student_id") else None,
            }
        )

    return {
        "room_count": len(rooms),
        "total_learners": total_learners,
        "rooms": rooms,
    }


def build_student_breakout_room(session, student_user):
    breakout_room = get_student_breakout_room(session, student_user)
    if breakout_room is None:
        return None

    member_names = [
        full_name(enrollment.student)
        for enrollment in breakout_room.enrollments.select_related("student").all()
    ]
    return {
        "id": breakout_room.id,
        "name": breakout_room.name,
        "member_names": member_names,
        "teacher_present": session.monitored_breakout_room_id == breakout_room.id,
    }


def get_visible_messages_query(session, student_user=None):
    query = session.messages.filter(is_hidden=False).select_related("sender", "breakout_room")
    if student_user is None or not session.breakout_enabled:
        return query

    breakout_room = get_student_breakout_room(session, student_user)
    if breakout_room is None:
        return query.filter(breakout_room__isnull=True)

    return query.filter(Q(breakout_room__isnull=True) | Q(breakout_room=breakout_room))


def get_student_join_request(session, student_user):
    if session is None or student_user is None:
        return None

    return session.join_requests.filter(student=student_user).first()


def get_student_join_status(session, student_user):
    if session is None or student_user is None:
        return "not_required"

    if not session.join_approval_enabled:
        return "not_required"

    join_request = get_student_join_request(session, student_user)
    if join_request is None:
        return "none"

    return join_request.status


def student_can_join_room(session, student_user):
    status_value = get_student_join_status(session, student_user)
    return status_value in {"not_required", "approved"}


def ensure_student_join_access(session, student_user, message):
    if not session.join_approval_enabled:
        return None

    if student_can_join_room(session, student_user):
        return None

    return Response({"message": message}, status=status.HTTP_403_FORBIDDEN)


def get_primary_session():
    return (
        ClassroomSession.objects.select_related("teacher", "organization", "program")
        .prefetch_related(
            "enrollments__student",
            "enrollments__breakout_room",
            "attendance_records__student",
            "messages__sender",
            "messages__breakout_room",
            "raise_hand_requests__student",
            "breakout_rooms__spokesperson",
            "breakout_rooms__enrollments__student",
            "polls__options",
            "quizzes__choices",
            "payments",
            "resources",
        )
        .order_by("starts_at", "created_at")
        .first()
    )


def build_student_dashboard_from_db(session, student_user=None):
    sync_expired_breakout_timer(session)
    active_poll = session.polls.filter(is_active=True).first() or session.polls.first()
    quiz = session.quizzes.filter(is_active=True).first() or session.quizzes.first()
    enrollments_query = session.enrollments.select_related("student", "breakout_room")
    if student_user is not None:
        enrollments_query = enrollments_query.filter(student=student_user)
    enrollments = list(enrollments_query)
    if student_user is not None:
        schedule_enrollments = list(
            student_user.enrollments.select_related("session__teacher").order_by(
                "session__starts_at",
                "session__created_at",
            )
        )
    else:
        schedule_enrollments = enrollments
    messages = list(get_visible_messages_query(session, student_user).order_by("sent_at")[:10])
    open_hands = session.raise_hand_requests.filter(status="open")
    successful_payments = session.payments.filter(status="success")
    if student_user is not None:
        successful_payments = successful_payments.filter(student=student_user)
    join_status = get_student_join_status(session, student_user)
    student_breakout_room = build_student_breakout_room(session, student_user)
    selected_poll_vote = None
    if active_poll and student_user is not None:
        selected_poll_vote = active_poll.votes.filter(student=student_user).first()
    selected_quiz_submission = None
    if quiz and student_user is not None:
        selected_quiz_submission = quiz.submissions.filter(student=student_user).first()
    poll_vote_counts = {}
    total_poll_votes = 0
    if active_poll:
        poll_vote_counts = {
            row["selected_option_id"]: row["count"]
            for row in active_poll.votes.values("selected_option_id").annotate(count=Count("id"))
        }
        total_poll_votes = active_poll.votes.count()

    return {
        "live_class": {
            "course_title": session.title,
            "session_title": session.description or session.title,
            "youtube_embed_url": session.youtube_live_url,
            "room_code": session.room_code,
            "is_live": timezone.now() >= session.starts_at,
            "price_label": f"KSh {int(session.price_amount):,}",
            "payment_required": session.is_paid,
            "student_paid": successful_payments.exists(),
            "waiting_room_enabled": session.join_approval_enabled,
            "join_status": join_status,
            "can_join_room": student_can_join_room(session, student_user),
            "delivery_mode": session.delivery_mode,
            "expected_participants": session.expected_participants,
            "broadcast_only": is_broadcast_classroom(session),
            "program_title": session.program.title if session.program_id else "",
            "program_window": format_program_window(session.program) if session.program_id else "",
        },
        "room_state": build_room_state(session),
        "breakout_room": student_breakout_room,
        "breakout_broadcast": build_breakout_broadcast(session),
        "whiteboard": build_whiteboard_payload(session),
        "engagement_stats": [
            {"label": "Chat", "value": f"{len(messages)} messages", "detail": "Teacher highlights enabled"},
            {
                "label": "Raise Hand",
                "value": f"{open_hands.count()} in queue",
                "detail": "Queue sorted by urgency",
            },
            {
                "label": "Polls",
                "value": f"{session.polls.count()} live poll" if session.polls.count() == 1 else f"{session.polls.count()} live polls",
                "detail": "Realtime responses",
            },
            {
                "label": "Quiz",
                "value": f"{quiz.choices.count() if quiz else 0} questions",
                "detail": "Auto-save active",
            },
        ],
        "poll": {
            "id": active_poll.id if active_poll else None,
            "question": active_poll.question if active_poll else STUDENT_DASHBOARD["poll"]["question"],
            "response_count": total_poll_votes if active_poll and total_poll_votes else active_poll.response_count if active_poll else 0,
            "selected_option_id": selected_poll_vote.selected_option_id if selected_poll_vote else None,
            "options": (
                [
                    {
                        "id": option.id,
                        "label": option.label,
                        "value": round((poll_vote_counts.get(option.id, 0) / total_poll_votes) * 100)
                        if total_poll_votes
                        else option.value,
                    }
                    for option in active_poll.options.all()
                ]
                if active_poll
                else []
            ),
        },
        "quiz": {
            "id": quiz.id if quiz else None,
            "question": quiz.question if quiz else STUDENT_DASHBOARD["quiz"]["question"],
            "selected_choice_id": selected_quiz_submission.selected_choice_id if selected_quiz_submission else None,
            "submitted": bool(selected_quiz_submission),
            "choices": (
                [{"id": choice.id, "label": choice.label} for choice in quiz.choices.all()]
                if quiz
                else []
            ),
        },
        "courses": [
            {
                "session_id": enrollment.session_id,
                "title": enrollment.session.title,
                "coach": full_name(enrollment.session.teacher),
                "time": enrollment.display_time or format_time(enrollment.session.starts_at),
                "starts_at": enrollment.session.starts_at.isoformat(),
                "status": (
                    "Live"
                    if timezone.now() >= enrollment.session.starts_at
                    else enrollment.get_access_status_display()
                ),
                "join_status": (
                    get_student_join_status(enrollment.session, student_user)
                    if student_user is not None
                    else "not_required"
                ),
                "can_join_room": (
                    student_can_join_room(enrollment.session, student_user)
                    if student_user is not None
                    else True
                ),
                "progress": enrollment.progress,
            }
            for enrollment in schedule_enrollments
        ],
        "messages": [
            {
                "id": message.id,
                "sender": full_name(message.sender),
                "role": message.role,
                "message": message.message,
                "time": format_time(message.sent_at),
            }
            for message in messages
        ],
        "session_resources": [
            {
                "id": resource.id,
                "title": resource.title,
                "url": (
                    absolute_media_url(resource.file.url)
                    if resource.file
                    else (resource.url or "")
                ),
            }
            for resource in session.resources.all()
        ],
    }


def build_teacher_dashboard_from_db(session):
    sync_expired_breakout_timer(session)
    open_hands = list(session.raise_hand_requests.filter(status="open").select_related("student"))
    waiting_room_requests = list(session.join_requests.filter(status="pending").select_related("student"))
    enrollments = list(session.enrollments.select_related("student", "student__student_profile", "breakout_room").all())
    attendance_records = {
        record.student_id: record
        for record in session.attendance_records.select_related("student").all()
    }
    successful_payments = {
        payment.student_id: payment
        for payment in session.payments.filter(status="success").select_related("student")
    }
    moderation_insights = [
        {
            "id": message.id,
            "sender": full_name(message.sender),
            "role": message.role,
            "message": message.message,
            "is_pinned": message.is_pinned,
        }
        for message in session.messages.filter(is_hidden=False).select_related("sender").order_by("-is_pinned", "-sent_at")[:4]
    ]
    qa_queue = [
        {
            "id": message.id,
            "student_id": message.sender_id,
            "sender": full_name(message.sender),
            "message": message.message,
            "time": format_time(message.sent_at),
        }
        for message in session.messages.filter(
            role="student",
            qa_status="pending",
            breakout_room__isnull=True,
        )
        .select_related("sender")
        .order_by("sent_at")[:200]
    ]
    messages = [
        {
            "id": message.id,
            "sender": full_name(message.sender),
            "role": message.role,
            "message": message.message,
            "time": format_time(message.sent_at),
        }
        for message in session.messages.filter(is_hidden=False).select_related("sender").order_by("-sent_at")[:12]
    ]
    breakout_rooms = build_breakout_rooms(session, attendance_records=attendance_records)
    attendance = []
    for enrollment in enrollments:
        record = attendance_records.get(enrollment.student_id)
        attendance.append(
            {
                "student_id": enrollment.student_id,
                "name": full_name(enrollment.student),
                "joined_at": format_time(record.joined_at if record else None),
                "status": record.status if record else "Pending",
                "payment": (
                    "Paid"
                    if enrollment.access_status == "paid" or enrollment.student_id in successful_payments
                    else "Locked"
                ),
            }
        )
    paid_learners = sum(1 for enrollment in enrollments if enrollment.access_status == "paid")
    locked_learners = sum(1 for enrollment in enrollments if enrollment.access_status == "locked")
    average_progress = round(
        sum(enrollment.progress for enrollment in enrollments) / len(enrollments),
    ) if enrollments else 0
    polls = [
        {
            "id": poll.id,
            "question": poll.question,
            "is_active": poll.is_active,
            "response_count": poll.response_count,
            "options": [
                {
                    "id": option.id,
                    "label": option.label,
                    "value": option.value,
                }
                for option in poll.options.all()
            ],
        }
        for poll in session.polls.prefetch_related("options").order_by("-is_active", "id")
    ]
    quizzes = [
        {
            "id": quiz.id,
            "question": quiz.question,
            "is_active": quiz.is_active,
            "choices": [
                {
                    "id": choice.id,
                    "label": choice.label,
                }
                for choice in quiz.choices.all()
            ],
        }
        for quiz in session.quizzes.prefetch_related("choices").order_by("-is_active", "id")
    ]
    last_breakout_summary = build_last_breakout_summary(session, enrollments=enrollments)
    qa_pending_count = pending_qa_message_count(session)

    return {
        "form_defaults": {
            "title": session.title,
            "youtube_link": session.youtube_live_url,
            "starts_at": session.starts_at.strftime("%Y-%m-%dT%H:%M"),
            "delivery_mode": session.delivery_mode,
            "expected_participants": session.expected_participants,
        },
        "room_state": build_room_state(session),
        "whiteboard": build_whiteboard_payload(session),
        "metrics": [
            {
                "label": "Live attendance",
                "value": str(sum(1 for row in attendance if row["status"] == "Present")),
                "detail": f"{len(enrollments)} enrolled learners",
            },
            {
                "label": "Paid learners",
                "value": str(paid_learners),
                "detail": "Access unlocked for the next class",
            },
            {
                "label": "Locked learners",
                "value": str(locked_learners),
                "detail": "Need payment or approval",
            },
            {
                "label": "Average progress",
                "value": f"{average_progress}%",
                "detail": "Across the active roster",
            },
            {
                "label": "Raised hands",
                "value": f"{len(open_hands):02d}",
                "detail": "Realtime learner queue",
            },
            {
                "label": "Q&A queue",
                "value": f"{qa_pending_count:02d} / {session.qa_queue_max_pending}",
                "detail": (
                    "Pending questions vs room limit"
                    if session.chat_moderation_mode == "qa_queue"
                    else "Open chat (not queuing)"
                ),
            },
            {
                "label": "Revenue today",
                "value": f"KSh {int(sum(payment.amount for payment in successful_payments.values())):,}",
                "detail": f"{len(successful_payments)} successful payments",
            },
        ],
        "attendance": attendance,
        "polls": polls,
        "quizzes": quizzes,
        "raise_hand_queue": [
            {
                "id": entry.id,
                "student_id": entry.student_id,
                "name": full_name(entry.student),
                "school_class": getattr(getattr(entry.student, "student_profile", None), "school_class", ""),
                "reason": entry.reason,
                "wait": f"{max(int((timezone.now() - entry.created_at).total_seconds() // 60), 1)}m",
            }
            for entry in open_hands
        ],
        "waiting_room_queue": [
            {
                "id": entry.id,
                "student_id": entry.student_id,
                "name": full_name(entry.student),
                "school_class": getattr(getattr(entry.student, "student_profile", None), "school_class", ""),
                "reason": "Waiting to join class",
                "wait": f"{max(int((timezone.now() - entry.created_at).total_seconds() // 60), 1)}m",
            }
            for entry in waiting_room_requests
        ],
        "breakout_rooms": breakout_rooms,
        "breakout_broadcast": build_breakout_broadcast(session),
        "last_breakout_summary": last_breakout_summary,
        "moderation_insights": moderation_insights,
        "qa_queue": qa_queue,
        "messages": messages,
        "stream_preview": {
            "badge": "Now streaming" if timezone.now() >= session.starts_at else "Scheduled",
            "title": session.title,
            "youtube_link": session.youtube_live_url,
        },
    }


class StudentDashboardView(APIView):
    permission_classes = [IsAuthenticated, IsStudentUser]

    def get(self, request):
        try:
            student_user = request.user
            session = None
            enrollment = (
                student_user.enrollments.select_related("session__teacher", "session__program", "session__organization")
                .prefetch_related("session__resources")
                .order_by(
                    "-session__starts_at",
                    "-session__created_at",
                )
                .first()
            )
            session = enrollment.session if enrollment else None
            payload = (
                build_student_dashboard_from_db(session, student_user=student_user)
                if session
                else STUDENT_DASHBOARD
            )
        except OperationalError:
            payload = STUDENT_DASHBOARD

        serializer = StudentDashboardSerializer(payload)
        return Response(serializer.data)


class StudentEnrollByCodeView(APIView):
    permission_classes = [IsAuthenticated, IsStudentUser]

    def post(self, request):
        serializer = StudentEnrollByCodeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        room_code = serializer.validated_data["room_code"]
        session = (
            ClassroomSession.objects.select_related("organization", "teacher")
            .filter(room_code=room_code)
            .first()
        )
        if session is None:
            return Response({"message": "Class not found."}, status=status.HTTP_404_NOT_FOUND)
        if not session.open_enrollment:
            return Response(
                {"message": "Self-enrollment is disabled for this class."},
                status=status.HTTP_403_FORBIDDEN,
            )
        if session.organization_id:
            ensure_student_membership(request.user, session.organization)
        enrollment, created = Enrollment.objects.get_or_create(
            session=session,
            student=request.user,
            defaults={
                "access_status": "upcoming",
                "enrollment_source": "join_code",
            },
        )
        if created:
            # Push updated roster + session counts to the teacher's WebSocket (school roster UI).
            broadcast_teacher_snapshot(session)
        broadcast_student_dashboard(session, request.user)
        return Response(
            {
                "message": "Enrolled successfully." if created else "Already enrolled in this class.",
                "session": TeacherSessionSerializer(session).data,
            },
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )


def get_student_primary_session(student_user):
    enrollment = (
        student_user.enrollments.select_related("session__teacher", "session__program", "session__organization")
        .prefetch_related("session__resources")
        .order_by(
            "-session__starts_at",
            "-session__created_at",
        )
        .first()
    )
    session = enrollment.session if enrollment else None
    if session is not None:
        sync_expired_breakout_timer(session)
    return session


class StudentPollVoteView(APIView):
    permission_classes = [IsAuthenticated, IsStudentUser]
    throttle_classes = [StudentWriteScopedThrottle]
    throttle_scope = "student_poll_vote"

    def post(self, request):
        session = get_student_primary_session(request.user)
        if session is None:
            return Response({"message": "No classroom session found."}, status=status.HTTP_404_NOT_FOUND)
        access_error = ensure_student_join_access(
            session,
            request.user,
            "Teacher approval is required before joining class activities.",
        )
        if access_error is not None:
            return access_error
        if session.is_paid and not session.payments.filter(student=request.user, status="success").exists():
            return Response({"message": "Payment required before voting."}, status=status.HTTP_403_FORBIDDEN)

        poll = session.polls.filter(is_active=True).first() or session.polls.first()
        if poll is None:
            return Response({"message": "No active poll found."}, status=status.HTTP_404_NOT_FOUND)

        serializer = StudentPollVoteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        option = poll.options.filter(pk=serializer.validated_data["option_id"]).first()
        if option is None:
            return Response({"message": "Poll option not found."}, status=status.HTTP_404_NOT_FOUND)

        PollVote.objects.update_or_create(
            poll=poll,
            student=request.user,
            defaults={"selected_option": option},
        )
        poll.response_count = poll.votes.count()
        poll.save(update_fields=["response_count"])
        dashboard = build_student_dashboard_from_db(session, student_user=request.user)
        common_poll = build_student_dashboard_from_db(session)["poll"]
        broadcast_classroom_snapshots(
            session,
            student_room_event={
                "type": "student_event",
                "event": "poll_updated",
                "poll": common_poll,
            },
            refresh_students=[request.user],
        )
        return Response(
            {
                "message": "Poll vote submitted successfully.",
                "poll": dashboard["poll"],
            },
            status=status.HTTP_200_OK,
        )


class StudentQuizSubmissionView(APIView):
    permission_classes = [IsAuthenticated, IsStudentUser]
    throttle_classes = [StudentWriteScopedThrottle]
    throttle_scope = "student_quiz_submit"

    def post(self, request):
        session = get_student_primary_session(request.user)
        if session is None:
            return Response({"message": "No classroom session found."}, status=status.HTTP_404_NOT_FOUND)
        access_error = ensure_student_join_access(
            session,
            request.user,
            "Teacher approval is required before joining class activities.",
        )
        if access_error is not None:
            return access_error
        if session.is_paid and not session.payments.filter(student=request.user, status="success").exists():
            return Response({"message": "Payment required before submitting quiz answers."}, status=status.HTTP_403_FORBIDDEN)

        quiz = session.quizzes.filter(is_active=True).first() or session.quizzes.first()
        if quiz is None:
            return Response({"message": "No active quiz found."}, status=status.HTTP_404_NOT_FOUND)

        serializer = StudentQuizSubmissionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        choice = quiz.choices.filter(pk=serializer.validated_data["choice_id"]).first()
        if choice is None:
            return Response({"message": "Quiz choice not found."}, status=status.HTTP_404_NOT_FOUND)

        QuizSubmission.objects.update_or_create(
            quiz=quiz,
            student=request.user,
            defaults={"selected_choice": choice},
        )
        broadcast_classroom_snapshots(session)
        broadcast_student_dashboard(session, request.user)

        dashboard = build_student_dashboard_from_db(session, student_user=request.user)
        return Response(
            {
                "message": "Quiz answer submitted successfully.",
                "quiz": dashboard["quiz"],
            },
            status=status.HTTP_200_OK,
        )


class StudentChatMessageView(APIView):
    permission_classes = [IsAuthenticated, IsStudentUser]
    throttle_classes = [StudentWriteScopedThrottle]
    throttle_scope = "student_chat"

    def get_throttles(self):
        if self.request.user.is_authenticated:
            session = get_student_primary_session(self.request.user)
            if session is not None and session.chat_slow_mode:
                self.throttle_scope = "student_chat_slow"
            else:
                self.throttle_scope = "student_chat"
        return super().get_throttles()

    def post(self, request):
        session = get_student_primary_session(request.user)
        if session is None:
            return Response({"message": "No classroom session found."}, status=status.HTTP_404_NOT_FOUND)
        access_error = ensure_student_join_access(
            session,
            request.user,
            "Teacher approval is required before sending classroom messages.",
        )
        if access_error is not None:
            return access_error
        if session.is_paid and not session.payments.filter(student=request.user, status="success").exists():
            return Response(
                {"message": "Payment required before sending chat messages."},
                status=status.HTTP_403_FORBIDDEN,
            )
        if not session.student_chat_enabled:
            return Response(
                {"message": "Student chat is disabled for this room right now."},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = StudentChatMessageSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        enrollment = get_student_enrollment(session, request.user)
        breakout_room = enrollment.breakout_room if session.breakout_enabled and enrollment else None

        use_qa_queue = session.chat_moderation_mode == "qa_queue" and breakout_room is None
        if use_qa_queue:
            if pending_qa_message_count(session) >= session.qa_queue_max_pending:
                return Response(
                    {"message": "The question queue is full right now. Try again shortly."},
                    status=status.HTTP_429_TOO_MANY_REQUESTS,
                )
            chat_message = ChatMessage.objects.create(
                session=session,
                sender=request.user,
                breakout_room=breakout_room,
                role="student",
                message=serializer.validated_data["message"].strip(),
                is_hidden=True,
                qa_status="pending",
            )
        else:
            chat_message = ChatMessage.objects.create(
                session=session,
                sender=request.user,
                breakout_room=breakout_room,
                role="student",
                message=serializer.validated_data["message"].strip(),
            )
        chat_payload = {
            "id": chat_message.id,
            "sender": full_name(request.user),
            "role": chat_message.role,
            "message": chat_message.message,
            "time": format_time(chat_message.sent_at),
        }
        if use_qa_queue:
            broadcast_classroom_snapshots(session)
        elif breakout_room is None:
            broadcast_classroom_snapshots(
                session,
                student_room_event={
                    "type": "student_event",
                    "event": "message_created",
                    "message": chat_payload,
                },
            )
        else:
            broadcast_classroom_snapshots(session)

        return Response(
            {
                "message": (
                    "Question submitted to the moderator."
                    if use_qa_queue
                    else "Chat message sent successfully."
                ),
                "chat_message": chat_payload,
                "qa_queued": use_qa_queue,
            },
            status=status.HTTP_201_CREATED,
        )


class TeacherSessionChatMessageView(APIView):
    permission_classes = [IsAuthenticated, IsTeacherUser]

    def get_object(self, request, session_id):
        session = request.user.teaching_sessions.get(pk=session_id)
        sync_expired_breakout_timer(session)
        return session

    def post(self, request, session_id):
        session = self.get_object(request, session_id)
        serializer = TeacherChatMessageSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        breakout_room = None
        breakout_room_id = serializer.validated_data.get("breakout_room_id")
        if breakout_room_id is not None:
            breakout_room = session.breakout_rooms.filter(pk=breakout_room_id).first()
            if breakout_room is None:
                return Response({"message": "Breakout room not found."}, status=status.HTTP_404_NOT_FOUND)

        chat_message = ChatMessage.objects.create(
            session=session,
            sender=request.user,
            breakout_room=breakout_room,
            role="teacher",
            message=serializer.validated_data["message"].strip(),
        )
        chat_payload = {
            "id": chat_message.id,
            "sender": full_name(request.user),
            "role": chat_message.role,
            "message": chat_message.message,
            "time": format_time(chat_message.sent_at),
        }
        if breakout_room is None:
            broadcast_classroom_snapshots(
                session,
                student_room_event={
                    "type": "student_event",
                    "event": "message_created",
                    "message": chat_payload,
                },
            )
        else:
            broadcast_classroom_snapshots(session)

        return Response(
            {
                "message": "Teacher chat message sent successfully.",
                "chat_message": chat_payload,
            },
            status=status.HTTP_201_CREATED,
        )


class StudentJoinRequestView(APIView):
    permission_classes = [IsAuthenticated, IsStudentUser]
    throttle_classes = [StudentWriteScopedThrottle]
    throttle_scope = "student_join_request"

    def post(self, request):
        session = get_student_primary_session(request.user)
        if session is None:
            return Response({"message": "No classroom session found."}, status=status.HTTP_404_NOT_FOUND)
        if session.is_paid and not session.payments.filter(student=request.user, status="success").exists():
            return Response(
                {"message": "Payment required before requesting to join."},
                status=status.HTTP_403_FORBIDDEN,
            )
        if not session.join_approval_enabled:
            return Response(
                {"message": "Waiting room is not enabled for this classroom."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        StudentJoinRequestSerializer(data=request.data).is_valid(raise_exception=True)
        join_request, _ = JoinRequest.objects.update_or_create(
            session=session,
            student=request.user,
            defaults={"status": "pending"},
        )
        broadcast_classroom_snapshots(session)
        broadcast_student_dashboard(session, request.user)

        return Response(
            {
                "message": "Join request sent successfully.",
                "request": {
                    "id": join_request.id,
                    "status": join_request.status,
                },
            },
            status=status.HTTP_200_OK,
        )


class StudentRaiseHandView(APIView):
    permission_classes = [IsAuthenticated, IsStudentUser]
    throttle_classes = [StudentWriteScopedThrottle]
    throttle_scope = "student_raise_hand"

    def post(self, request):
        session = get_student_primary_session(request.user)
        if session is None:
            return Response({"message": "No classroom session found."}, status=status.HTTP_404_NOT_FOUND)
        access_error = ensure_student_join_access(
            session,
            request.user,
            "Teacher approval is required before raising your hand.",
        )
        if access_error is not None:
            return access_error
        if session.is_paid and not session.payments.filter(student=request.user, status="success").exists():
            return Response(
                {"message": "Payment required before raising your hand."},
                status=status.HTTP_403_FORBIDDEN,
            )
        if not session.student_raise_hand_enabled:
            return Response(
                {"message": "Hand raising is disabled for this room right now."},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = StudentRaiseHandSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        reason = serializer.validated_data.get("reason") or "Needs help"

        raise_hand, _ = RaiseHandRequest.objects.update_or_create(
            session=session,
            student=request.user,
            status="open",
            defaults={"reason": reason},
        )
        broadcast_classroom_snapshots(session)
        broadcast_student_dashboard(session, request.user)

        return Response(
            {
                "message": "Raise-hand request sent successfully.",
                "request": {
                    "id": raise_hand.id,
                    "reason": raise_hand.reason,
                    "status": raise_hand.status,
                },
            },
            status=status.HTTP_200_OK,
        )


class TeacherDashboardView(APIView):
    permission_classes = [IsAuthenticated, IsTeacherUser]

    def get(self, request):
        try:
            teacher_user = request.user
            session = teacher_user.teaching_sessions.order_by("starts_at", "created_at").first()
            payload = build_teacher_dashboard_from_db(session) if session else TEACHER_DASHBOARD
        except OperationalError:
            payload = TEACHER_DASHBOARD

        serializer = TeacherDashboardSerializer(payload)
        return Response(serializer.data)


class CreateSessionView(APIView):
    permission_classes = [IsAuthenticated, IsTeacherUser]

    def get(self, request):
        sessions = request.user.teaching_sessions.select_related("organization", "program").order_by(
            "-starts_at", "-created_at"
        )
        serializer = TeacherSessionSerializer(sessions, many=True)
        return Response(serializer.data)

    def post(self, request):
        serializer = TeacherSessionMutationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        starts_at = parse_session_datetime(serializer.validated_data["starts_at"])
        teacher = request.user
        org = resolve_organization_for_teacher(teacher, serializer.validated_data.get("organization_id"))
        if org is None:
            org = ensure_teacher_workspace(teacher)
        open_enrollment = serializer.validated_data.get("open_enrollment", True)
        program = None
        program_id = serializer.validated_data.get("program_id")
        if program_id is not None:
            program = LearningProgram.objects.filter(pk=program_id, organization=org).first()
            if program is None:
                return Response(
                    {"message": "Program not found for this organization."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        base_room_code = slugify(serializer.validated_data["title"]) or "classroom"
        room_code = base_room_code
        suffix = 1
        while ClassroomSession.objects.filter(room_code=room_code).exists():
            suffix += 1
            room_code = f"{base_room_code}-{suffix}"

        raw_youtube = (serializer.validated_data.get("youtube_link") or "").strip()
        youtube_url = raw_youtube or DEFAULT_SESSION_YOUTUBE_URL

        session = ClassroomSession.objects.create(
            title=serializer.validated_data["title"],
            description=serializer.validated_data.get("description", serializer.validated_data["title"]),
            youtube_live_url=youtube_url,
            starts_at=starts_at,
            teacher=teacher,
            organization=org,
            open_enrollment=open_enrollment,
            program=program,
            is_paid=serializer.validated_data.get("is_paid", True),
            price_amount=serializer.validated_data.get("price_amount", 3500),
            delivery_mode=serializer.validated_data.get("delivery_mode", "interactive"),
            expected_participants=serializer.validated_data.get("expected_participants", 50),
            room_code=room_code,
        )

        payload = {
            "message": "Session created successfully.",
            "session": TeacherSessionSerializer(session).data,
        }
        return Response(payload, status=status.HTTP_201_CREATED)


class TeacherSessionDetailView(APIView):
    permission_classes = [IsAuthenticated, IsTeacherUser]

    def get_object(self, request, session_id):
        session = request.user.teaching_sessions.get(pk=session_id)
        sync_expired_breakout_timer(session)
        return session

    def get(self, request, session_id):
        session = self.get_object(request, session_id)
        payload = {
            "session": TeacherSessionSerializer(session).data,
            "dashboard": TeacherDashboardSerializer(build_teacher_dashboard_from_db(session)).data,
        }
        return Response(payload)

    def patch(self, request, session_id):
        session = self.get_object(request, session_id)
        serializer = TeacherSessionMutationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        session.title = serializer.validated_data["title"]
        session.description = serializer.validated_data.get("description", session.description)
        if "youtube_link" in serializer.validated_data:
            raw_youtube = (serializer.validated_data.get("youtube_link") or "").strip()
            session.youtube_live_url = raw_youtube or DEFAULT_SESSION_YOUTUBE_URL
        session.starts_at = parse_session_datetime(serializer.validated_data["starts_at"])
        session.is_paid = serializer.validated_data.get("is_paid", session.is_paid)
        session.price_amount = serializer.validated_data.get("price_amount", session.price_amount)
        session.delivery_mode = serializer.validated_data.get("delivery_mode", session.delivery_mode)
        session.expected_participants = serializer.validated_data.get("expected_participants", session.expected_participants)
        if "organization_id" in serializer.validated_data:
            new_org = resolve_organization_for_teacher(request.user, serializer.validated_data["organization_id"])
            if new_org is None:
                return Response(
                    {"message": "Invalid organization for this account."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            session.organization = new_org
        if "open_enrollment" in serializer.validated_data:
            session.open_enrollment = serializer.validated_data["open_enrollment"]
        if "program_id" in serializer.validated_data:
            pid = serializer.validated_data["program_id"]
            if pid is None:
                session.program = None
            else:
                program = LearningProgram.objects.filter(pk=pid, organization_id=session.organization_id).first()
                if program is None:
                    return Response(
                        {"message": "Program not found for this organization."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                session.program = program
        session.save()
        broadcast_classroom_snapshots(session)

        payload = {
            "message": "Session updated successfully.",
            "session": TeacherSessionSerializer(session).data,
        }
        return Response(payload, status=status.HTTP_200_OK)

    def delete(self, request, session_id):
        session = self.get_object(request, session_id)
        session.delete()
        return Response({"message": "Session deleted successfully."}, status=status.HTTP_200_OK)


class TeacherSessionRoomStateView(APIView):
    permission_classes = [IsAuthenticated, IsTeacherUser]

    def get_object(self, request, session_id):
        session = request.user.teaching_sessions.get(pk=session_id)
        sync_expired_breakout_timer(session)
        return session

    def patch(self, request, session_id):
        session = self.get_object(request, session_id)
        serializer = TeacherRoomStateMutationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        changed_fields = []
        for field, value in serializer.validated_data.items():
            if field == "monitored_breakout_room_id":
                continue
            if field in {"breakout_timer_minutes", "extend_breakout_timer_minutes", "clear_breakout_timer"}:
                continue
            setattr(session, field, value)
            changed_fields.append(field)

        if "monitored_breakout_room_id" in serializer.validated_data:
            monitored_breakout_room_id = serializer.validated_data["monitored_breakout_room_id"]
            monitored_breakout_room = None
            if monitored_breakout_room_id is not None:
                monitored_breakout_room = session.breakout_rooms.filter(pk=monitored_breakout_room_id).first()
                if monitored_breakout_room is None:
                    return Response({"message": "Breakout room not found."}, status=status.HTTP_404_NOT_FOUND)
            session.monitored_breakout_room = monitored_breakout_room
            changed_fields.append("monitored_breakout_room")

        if "stage_mode" in serializer.validated_data:
            stage_mode = serializer.validated_data["stage_mode"]
            session.whiteboard_enabled = stage_mode == "whiteboard"
            if "whiteboard_enabled" not in serializer.validated_data:
                changed_fields.append("whiteboard_enabled")
            session.screen_share_enabled = stage_mode == "screenshare"
            if "screen_share_enabled" not in serializer.validated_data:
                changed_fields.append("screen_share_enabled")
            if stage_mode == "camera" and "spotlight_mode" not in serializer.validated_data and session.spotlight_mode == "content":
                session.spotlight_mode = "off"
                changed_fields.append("spotlight_mode")

        if (
            "join_approval_enabled" in serializer.validated_data
            and serializer.validated_data["join_approval_enabled"] is False
        ):
            session.join_requests.filter(status="pending").update(status="approved")

        if (
            "breakout_enabled" in serializer.validated_data
            and serializer.validated_data["breakout_enabled"] is False
            and session.monitored_breakout_room_id is not None
        ):
            session.monitored_breakout_room = None
            changed_fields.append("monitored_breakout_room")

        if (
            "breakout_enabled" in serializer.validated_data
            and serializer.validated_data["breakout_enabled"] is False
            and session.breakout_timer_ends_at is not None
        ):
            session.breakout_timer_ends_at = None
            changed_fields.append("breakout_timer_ends_at")

        if (
            "teacher_camera_enabled" in serializer.validated_data
            and serializer.validated_data["teacher_camera_enabled"] is False
            and "spotlight_mode" not in serializer.validated_data
            and session.spotlight_mode == "teacher"
        ):
            session.spotlight_mode = "off"
            changed_fields.append("spotlight_mode")

        if serializer.validated_data.get("clear_breakout_timer") and session.breakout_timer_ends_at is not None:
            session.breakout_timer_ends_at = None
            changed_fields.append("breakout_timer_ends_at")

        if "breakout_timer_minutes" in serializer.validated_data:
            session.breakout_timer_ends_at = timezone.now() + timezone.timedelta(
                minutes=serializer.validated_data["breakout_timer_minutes"]
            )
            changed_fields.append("breakout_timer_ends_at")

        if "extend_breakout_timer_minutes" in serializer.validated_data:
            if not session.breakout_enabled or session.breakout_timer_ends_at is None:
                return Response(
                    {"message": "Start a breakout timer before extending it."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            session.breakout_timer_ends_at = max(session.breakout_timer_ends_at, timezone.now()) + timezone.timedelta(
                minutes=serializer.validated_data["extend_breakout_timer_minutes"]
            )
            changed_fields.append("breakout_timer_ends_at")

        if "recording_status" in serializer.validated_data:
            recording_status = serializer.validated_data["recording_status"]
            if recording_status == "recording" and session.recording_started_at is None:
                session.recording_started_at = timezone.now()
                changed_fields.append("recording_started_at")
            elif recording_status == "idle" and session.recording_started_at is not None:
                session.recording_started_at = None
                changed_fields.append("recording_started_at")

        if changed_fields:
            session.save(update_fields=list(dict.fromkeys(changed_fields)))
            broadcast_classroom_snapshots(
                session,
                student_room_event={
                    "type": "student_event",
                    "event": "room_state_updated",
                    "room_state": build_room_state(session),
                },
            )

        return Response(
            {
                "message": "Room state updated successfully.",
                "room_state": build_room_state(session),
            },
            status=status.HTTP_200_OK,
        )


class TeacherSessionBreakoutView(APIView):
    permission_classes = [IsAuthenticated, IsTeacherUser]

    def get_object(self, request, session_id):
        session = request.user.teaching_sessions.get(pk=session_id)
        sync_expired_breakout_timer(session)
        return session

    def post(self, request, session_id):
        session = self.get_object(request, session_id)
        if is_broadcast_classroom(session) or session.expected_participants > 200:
            return Response(
                {"message": "Breakout rooms are disabled for large broadcast classes."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        serializer = TeacherBreakoutCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        reuse_last_breakouts = serializer.validated_data.get("reuse_last_breakouts", False)
        room_count = serializer.validated_data.get("room_count")
        enrollments = list(session.enrollments.select_related("student").order_by("student__username", "student_id"))
        existing_breakout_room_ids = list(session.breakout_rooms.values_list("id", flat=True))
        saved_layout = session.last_breakout_layout if reuse_last_breakouts else []
        if reuse_last_breakouts and not saved_layout:
            return Response({"message": "No previous breakout groups available."}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            if session.monitored_breakout_room_id is not None:
                session.monitored_breakout_room = None
                session.save(update_fields=["monitored_breakout_room"])
            if existing_breakout_room_ids:
                session.messages.filter(breakout_room_id__in=existing_breakout_room_ids).update(is_hidden=True)
            session.enrollments.update(breakout_room=None)
            session.breakout_rooms.all().delete()
            room_blueprints = (
                [
                    {
                        "name": item.get("name") or f"Breakout Room {index}",
                        "student_ids": item.get("student_ids") or [],
                        "spokesperson_student_id": item.get("spokesperson_student_id"),
                    }
                    for index, item in enumerate(saved_layout, start=1)
                ]
                if reuse_last_breakouts
                else [
                    {"name": f"Breakout Room {index}", "student_ids": [], "spokesperson_student_id": None}
                    for index in range(1, (room_count or 0) + 1)
                ]
            )
            rooms = [
                BreakoutRoom.objects.create(
                    session=session,
                    name=blueprint["name"],
                    sort_order=index,
                )
                for index, blueprint in enumerate(room_blueprints, start=1)
            ]
            enrollments_by_student_id = {enrollment.student_id: enrollment for enrollment in enrollments}
            unassigned_student_ids = set(enrollments_by_student_id)
            if reuse_last_breakouts:
                for room, blueprint in zip(rooms, room_blueprints):
                    for student_id in blueprint["student_ids"]:
                        enrollment = enrollments_by_student_id.get(student_id)
                        if enrollment is None:
                            continue
                        enrollment.breakout_room = room
                        unassigned_student_ids.discard(student_id)
            remaining_enrollments = [enrollments_by_student_id[student_id] for student_id in sorted(unassigned_student_ids)]
            for index, enrollment in enumerate(remaining_enrollments):
                enrollment.breakout_room = rooms[index % len(rooms)]
            if enrollments:
                Enrollment.objects.bulk_update(enrollments, ["breakout_room"])
            room_updates = []
            for room, blueprint in zip(rooms, room_blueprints):
                spokesperson_student_id = blueprint.get("spokesperson_student_id")
                spokesperson_enrollment = enrollments_by_student_id.get(spokesperson_student_id) if spokesperson_student_id else None
                room.spokesperson = (
                    spokesperson_enrollment.student
                    if spokesperson_enrollment and spokesperson_enrollment.breakout_room_id == room.id
                    else None
                )
                room_updates.append(room)
            if room_updates:
                BreakoutRoom.objects.bulk_update(room_updates, ["spokesperson"])
            if not session.breakout_enabled:
                session.breakout_enabled = True
                session.save(update_fields=["breakout_enabled"])
            save_breakout_layout_snapshot(session)

        broadcast_classroom_snapshots(session)
        return Response(
            {
                "message": "Breakout rooms reopened successfully." if reuse_last_breakouts else "Breakout rooms created successfully.",
                "breakout_rooms": build_breakout_rooms(session),
                "room_state": build_room_state(session),
            },
            status=status.HTTP_200_OK,
        )

    def patch(self, request, session_id):
        session = self.get_object(request, session_id)
        serializer = TeacherBreakoutMutationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        if "room_id" in serializer.validated_data or "spokesperson_student_id" in serializer.validated_data:
            room = session.breakout_rooms.filter(pk=serializer.validated_data["room_id"]).first()
            if room is None:
                return Response({"message": "Breakout room not found."}, status=status.HTTP_404_NOT_FOUND)

            spokesperson_student_id = serializer.validated_data.get("spokesperson_student_id")
            spokesperson = None
            if spokesperson_student_id is not None:
                spokesperson_enrollment = room.enrollments.select_related("student").filter(
                    student_id=spokesperson_student_id
                ).first()
                if spokesperson_enrollment is None:
                    return Response(
                        {"message": "Spokesperson must be assigned to that breakout room."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                spokesperson = spokesperson_enrollment.student

            room.spokesperson = spokesperson
            room.save(update_fields=["spokesperson"])
            success_message = "Breakout spokesperson updated successfully."
        else:
            enrollment = session.enrollments.select_related("student").filter(
                student_id=serializer.validated_data["student_id"]
            ).first()
            if enrollment is None:
                return Response({"message": "Student enrollment not found."}, status=status.HTTP_404_NOT_FOUND)

            previous_breakout_room_id = enrollment.breakout_room_id
            breakout_room = None
            breakout_room_id = serializer.validated_data.get("breakout_room_id")
            if breakout_room_id is not None:
                breakout_room = session.breakout_rooms.filter(pk=breakout_room_id).first()
                if breakout_room is None:
                    return Response({"message": "Breakout room not found."}, status=status.HTTP_404_NOT_FOUND)

            enrollment.breakout_room = breakout_room
            enrollment.save(update_fields=["breakout_room"])
            if previous_breakout_room_id and previous_breakout_room_id != breakout_room_id:
                previous_breakout_room = session.breakout_rooms.filter(pk=previous_breakout_room_id).first()
                if previous_breakout_room and previous_breakout_room.spokesperson_id == enrollment.student_id:
                    previous_breakout_room.spokesperson = None
                    previous_breakout_room.save(update_fields=["spokesperson"])
            if breakout_room and not session.breakout_enabled:
                session.breakout_enabled = True
                session.save(update_fields=["breakout_enabled"])
            success_message = "Breakout assignment updated successfully."
        save_breakout_layout_snapshot(session)

        broadcast_classroom_snapshots(session)
        return Response(
            {
                "message": success_message,
                "breakout_rooms": build_breakout_rooms(session),
            },
            status=status.HTTP_200_OK,
        )

    def delete(self, request, session_id):
        session = self.get_object(request, session_id)
        close_breakout_rooms(session)

        broadcast_classroom_snapshots(session)
        return Response(
            {
                "message": "Breakout rooms closed successfully.",
                "breakout_rooms": [],
                "room_state": build_room_state(session),
            },
            status=status.HTTP_200_OK,
        )

    def put(self, request, session_id):
        session = self.get_object(request, session_id)
        serializer = TeacherBreakoutBroadcastSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        message_text = serializer.validated_data["message"].strip()
        if not message_text:
            return Response({"message": "Broadcast message cannot be empty."}, status=status.HTTP_400_BAD_REQUEST)

        sent_at = timezone.now()
        session.breakout_broadcast_message = message_text
        session.breakout_broadcast_sent_at = sent_at
        session.save(update_fields=["breakout_broadcast_message", "breakout_broadcast_sent_at"])
        ChatMessage.objects.create(
            session=session,
            sender=request.user,
            breakout_room=None,
            role="teacher",
            message=f"[Breakout broadcast] {message_text}",
        )
        broadcast_classroom_snapshots(
            session,
            student_room_event={
                "type": "student_event",
                "event": "breakout_broadcast_updated",
                "breakout_broadcast": build_breakout_broadcast(session),
            },
        )

        return Response(
            {
                "message": "Breakout broadcast sent successfully.",
                "broadcast": build_breakout_broadcast(session),
            },
            status=status.HTTP_200_OK,
        )


class TeacherSessionJoinRequestView(APIView):
    permission_classes = [IsAuthenticated, IsTeacherUser]

    def get_object(self, request, session_id):
        return request.user.teaching_sessions.get(pk=session_id)

    def patch(self, request, session_id):
        session = self.get_object(request, session_id)
        serializer = TeacherJoinRequestMutationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        join_request = session.join_requests.filter(
            pk=serializer.validated_data["request_id"]
        ).select_related("student").first()
        if join_request is None:
            return Response({"message": "Join request not found."}, status=status.HTTP_404_NOT_FOUND)

        join_request.status = "approved" if serializer.validated_data["action"] == "approve" else "denied"
        join_request.save(update_fields=["status", "updated_at"])
        if join_request.status == "approved":
            attendance, _ = AttendanceRecord.objects.get_or_create(
                session=session,
                student=join_request.student,
            )
            changed_fields = []
            if attendance.status != "Present":
                attendance.status = "Present"
                changed_fields.append("status")
            if attendance.joined_at is None:
                attendance.joined_at = timezone.now()
                changed_fields.append("joined_at")
            if changed_fields:
                attendance.save(update_fields=changed_fields)
        broadcast_classroom_snapshots(session)
        broadcast_student_dashboard(session, enrollment.student)
        broadcast_student_dashboard(session, join_request.student)

        return Response(
            {
                "message": "Join request updated successfully.",
                "request": {
                    "id": join_request.id,
                    "student_id": join_request.student_id,
                    "status": join_request.status,
                },
            },
            status=status.HTTP_200_OK,
        )


class TeacherSessionWhiteboardView(APIView):
    permission_classes = [IsAuthenticated, IsTeacherUser]

    def get_object(self, request, session_id):
        return request.user.teaching_sessions.get(pk=session_id)

    def get(self, request, session_id):
        session = self.get_object(request, session_id)
        return Response(build_whiteboard_payload(session), status=status.HTTP_200_OK)

    def put(self, request, session_id):
        session = self.get_object(request, session_id)
        serializer = TeacherWhiteboardMutationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        whiteboard, _ = WhiteboardState.objects.get_or_create(session=session)
        whiteboard.pages = serializer.validated_data["pages"]
        whiteboard.active_page = serializer.validated_data["active_page"]
        whiteboard.save(update_fields=["pages", "active_page", "updated_at"])
        if not session.whiteboard_enabled or session.stage_mode != "whiteboard":
            session.whiteboard_enabled = True
            session.stage_mode = "whiteboard"
            session.save(update_fields=["whiteboard_enabled", "stage_mode"])
        broadcast_classroom_snapshots(session)
        return Response(
            {
                "message": "Whiteboard updated successfully.",
                "whiteboard": build_whiteboard_payload(session),
            },
            status=status.HTTP_200_OK,
        )

    def delete(self, request, session_id):
        session = self.get_object(request, session_id)
        whiteboard, _ = WhiteboardState.objects.get_or_create(session=session)
        whiteboard.pages = default_whiteboard_state()["pages"]
        whiteboard.active_page = 0
        whiteboard.save(update_fields=["pages", "active_page", "updated_at"])
        broadcast_classroom_snapshots(session)
        return Response(
            {
                "message": "Whiteboard cleared successfully.",
                "whiteboard": build_whiteboard_payload(session),
            },
            status=status.HTTP_200_OK,
        )


class TeacherStudentDirectoryView(APIView):
    permission_classes = [IsAuthenticated, IsTeacherUser]

    def get(self, request):
        students = User.objects.filter(student_profile__isnull=False).order_by("first_name", "username")
        payload = [
            {
                "id": student.id,
                "username": student.username,
                "full_name": full_name(student),
                "email": student.email,
                "school_name": student.student_profile.school_name if hasattr(student, "student_profile") else "",
                "school_class": student.student_profile.school_class if hasattr(student, "student_profile") else "",
            }
            for student in students
        ]
        serializer = StudentDirectorySerializer(payload, many=True)
        return Response(serializer.data)


class TeacherSessionEnrollmentView(APIView):
    permission_classes = [IsAuthenticated, IsTeacherUser]

    def get_object(self, request, session_id):
        return request.user.teaching_sessions.get(pk=session_id)

    def get(self, request, session_id):
        session = self.get_object(request, session_id)
        enrollments = session.enrollments.select_related("student", "student__student_profile").order_by(
            "student__first_name",
            "student__username",
        )
        serializer = EnrollmentSerializer(enrollments, many=True)
        return Response(serializer.data)

    def post(self, request, session_id):
        session = self.get_object(request, session_id)
        serializer = EnrollmentMutationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        student = User.objects.filter(pk=serializer.validated_data["student_id"], student_profile__isnull=False).first()
        if student is None:
            return Response({"message": "Student not found."}, status=status.HTTP_404_NOT_FOUND)

        enrollment, created = Enrollment.objects.get_or_create(
            session=session,
            student=student,
            defaults={
                "access_status": serializer.validated_data.get("access_status", "upcoming"),
                "progress": serializer.validated_data.get("progress", 0),
                "display_time": serializer.validated_data.get("display_time", ""),
                "enrollment_source": "roster",
            },
        )
        if not created:
            enrollment.access_status = serializer.validated_data.get("access_status", enrollment.access_status)
            enrollment.progress = serializer.validated_data.get("progress", enrollment.progress)
            enrollment.display_time = serializer.validated_data.get("display_time", enrollment.display_time)
            enrollment.save(update_fields=["access_status", "progress", "display_time"])
        broadcast_teacher_snapshot(session)
        broadcast_student_dashboard(session, student)

        return Response(
            {
                "message": "Student assigned successfully.",
                "enrollment": EnrollmentSerializer(enrollment).data,
            },
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )

    def patch(self, request, session_id):
        session = self.get_object(request, session_id)
        serializer = EnrollmentMutationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        enrollment = Enrollment.objects.filter(
            session=session,
            student_id=serializer.validated_data["student_id"],
        ).select_related("student", "student__student_profile").first()
        if enrollment is None:
            return Response({"message": "Enrollment not found."}, status=status.HTTP_404_NOT_FOUND)

        enrollment.access_status = serializer.validated_data.get("access_status", enrollment.access_status)
        enrollment.progress = serializer.validated_data.get("progress", enrollment.progress)
        enrollment.display_time = serializer.validated_data.get("display_time", enrollment.display_time)
        enrollment.save(update_fields=["access_status", "progress", "display_time"])
        broadcast_teacher_snapshot(session)
        broadcast_student_dashboard(session, enrollment.student)

        return Response(
            {
                "message": "Enrollment updated successfully.",
                "enrollment": EnrollmentSerializer(enrollment).data,
            },
            status=status.HTTP_200_OK,
        )

    def delete(self, request, session_id):
        session = self.get_object(request, session_id)
        serializer = EnrollmentMutationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        enrollment = Enrollment.objects.select_related("student").filter(
            session=session,
            student_id=serializer.validated_data["student_id"],
        ).first()
        if enrollment is None:
            return Response({"message": "Enrollment not found."}, status=status.HTTP_404_NOT_FOUND)

        removed_student = enrollment.student
        enrollment.delete()
        broadcast_teacher_snapshot(session)
        broadcast_classroom_signal(
            session.room_code,
            "student",
            removed_student.username,
            {
                "type": "signal",
                "source_username": request.user.username,
                "source_role": "teacher",
                "payload": {
                    "kind": "removed_from_room",
                    "session_title": session.title,
                },
            },
        )

        return Response({"message": "Student removed successfully."}, status=status.HTTP_200_OK)


class TeacherSessionEnrollmentExportView(APIView):
    """Compressed PDF export of session enrollments for the room roster (teacher only)."""

    permission_classes = [IsAuthenticated, IsTeacherUser]

    def get(self, request, session_id):
        session = request.user.teaching_sessions.select_related("teacher").filter(pk=session_id).first()
        if session is None:
            return Response({"message": "Session not found."}, status=status.HTTP_404_NOT_FOUND)

        enrollments = session.enrollments.select_related("student", "student__student_profile").order_by(
            "student__first_name",
            "student__username",
        )

        pdf_bytes = build_session_roster_pdf(session, enrollments)
        response = HttpResponse(pdf_bytes, content_type="application/pdf")
        safe_code = "".join(c if c.isalnum() or c in "-_" else "-" for c in session.room_code)[:80]
        response["Content-Disposition"] = f'attachment; filename="roster-{safe_code}-{session_id}.pdf"'
        return response


class TeacherSessionAttendanceView(APIView):
    permission_classes = [IsAuthenticated, IsTeacherUser]

    def get_object(self, request, session_id):
        return request.user.teaching_sessions.get(pk=session_id)

    def patch(self, request, session_id):
        session = self.get_object(request, session_id)
        serializer = AttendanceMutationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        enrollment_exists = Enrollment.objects.filter(
            session=session,
            student_id=serializer.validated_data["student_id"],
        ).exists()
        if not enrollment_exists:
            return Response({"message": "Enrollment not found."}, status=status.HTTP_404_NOT_FOUND)

        attendance, _ = AttendanceRecord.objects.get_or_create(
            session=session,
            student_id=serializer.validated_data["student_id"],
        )
        attendance.status = serializer.validated_data["status"]
        attendance.joined_at = timezone.now() if attendance.status == "Present" else None
        attendance.save(update_fields=["status", "joined_at"])
        broadcast_teacher_snapshot(session)

        return Response(
            {
                "message": "Attendance updated successfully.",
                "attendance": {
                    "student_id": attendance.student_id,
                    "status": attendance.status,
                    "joined_at": format_time(attendance.joined_at),
                },
            },
            status=status.HTTP_200_OK,
        )


class TeacherSessionRaiseHandView(APIView):
    permission_classes = [IsAuthenticated, IsTeacherUser]

    def get_object(self, request, session_id):
        return request.user.teaching_sessions.get(pk=session_id)

    def patch(self, request, session_id):
        session = self.get_object(request, session_id)
        serializer = RaiseHandMutationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        raise_hand = session.raise_hand_requests.filter(
            pk=serializer.validated_data["request_id"],
        ).select_related("student").first()
        if raise_hand is None:
            return Response({"message": "Raise-hand request not found."}, status=status.HTTP_404_NOT_FOUND)

        raise_hand.status = "resolved"
        raise_hand.save(update_fields=["status"])
        broadcast_teacher_snapshot(session)
        broadcast_classroom_signal(
            session.room_code,
            "student",
            raise_hand.student.username,
            {
                "type": "signal",
                "source_username": request.user.username,
                "source_role": "teacher",
                "payload": {
                    "kind": "raise_hand_resolved",
                    "request_id": raise_hand.id,
                },
            },
        )

        return Response(
            {
                "message": "Raise-hand request resolved successfully.",
                "request": {
                    "id": raise_hand.id,
                    "student_id": raise_hand.student_id,
                    "status": raise_hand.status,
                },
            },
            status=status.HTTP_200_OK,
        )


class TeacherSessionChatModerationView(APIView):
    permission_classes = [IsAuthenticated, IsTeacherUser]

    def get_object(self, request, session_id):
        return request.user.teaching_sessions.get(pk=session_id)

    def patch(self, request, session_id):
        session = self.get_object(request, session_id)
        serializer = ChatModerationMutationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        message = session.messages.select_related("sender").filter(
            pk=serializer.validated_data["message_id"],
        ).first()
        if message is None:
            return Response({"message": "Chat message not found."}, status=status.HTTP_404_NOT_FOUND)

        action = serializer.validated_data["action"]
        approved_payload = None
        if action == "pin":
            message.is_pinned = True
        elif action == "unpin":
            message.is_pinned = False
        elif action == "hide":
            message.is_hidden = True
            message.is_pinned = False
        elif action == "approve_qa":
            if message.qa_status != "pending":
                return Response(
                    {"message": "Only pending questions can be approved."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            message.is_hidden = False
            message.qa_status = "approved"
            approved_payload = {
                "id": message.id,
                "sender": full_name(message.sender),
                "role": message.role,
                "message": message.message,
                "time": format_time(message.sent_at),
            }
        elif action == "dismiss_qa":
            if message.qa_status != "pending":
                return Response(
                    {"message": "Only pending questions can be dismissed."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            message.is_hidden = True
            message.qa_status = "dismissed"
            message.is_pinned = False

        message.save(update_fields=["is_pinned", "is_hidden", "qa_status"])
        if approved_payload is not None:
            broadcast_classroom_snapshots(
                session,
                student_room_event={
                    "type": "student_event",
                    "event": "message_created",
                    "message": approved_payload,
                },
            )
        else:
            broadcast_classroom_snapshots(session)

        return Response(
            {
                "message": "Chat moderation updated successfully.",
                "chat_message": {
                    "id": message.id,
                    "is_pinned": message.is_pinned,
                    "is_hidden": message.is_hidden,
                    "qa_status": message.qa_status,
                },
            },
            status=status.HTTP_200_OK,
        )


class TeacherSessionQaQueueBulkView(APIView):
    permission_classes = [IsAuthenticated, IsTeacherUser]

    def get_object(self, request, session_id):
        return request.user.teaching_sessions.get(pk=session_id)

    def post(self, request, session_id):
        session = self.get_object(request, session_id)
        serializer = QaQueueBulkActionSerializer(data=request.data or {})
        serializer.is_valid(raise_exception=True)
        action = serializer.validated_data["action"]

        if action == "approve_all":
            with transaction.atomic():
                pending = session.messages.filter(
                    role="student",
                    qa_status="pending",
                    breakout_room__isnull=True,
                ).select_for_update()
                messages = list(pending)
                for message in messages:
                    message.is_hidden = False
                    message.qa_status = "approved"
                if messages:
                    ChatMessage.objects.bulk_update(messages, ["is_hidden", "qa_status"])

            count = len(messages)
            if count == 0:
                return Response(
                    {"message": "No pending questions to publish.", "approved": 0, "dismissed": 0},
                    status=status.HTTP_200_OK,
                )

            broadcast_classroom_snapshots(session)
            return Response(
                {
                    "message": f"Published {count} question(s) to class chat.",
                    "approved": count,
                    "dismissed": 0,
                },
                status=status.HTTP_200_OK,
            )

        with transaction.atomic():
            pending = session.messages.filter(
                role="student",
                qa_status="pending",
                breakout_room__isnull=True,
            ).select_for_update()
            messages = list(pending)
            for message in messages:
                message.is_hidden = True
                message.qa_status = "dismissed"
                message.is_pinned = False
            if messages:
                ChatMessage.objects.bulk_update(messages, ["is_hidden", "qa_status", "is_pinned"])

        count = len(messages)
        if count == 0:
            return Response(
                {"message": "No pending questions to dismiss.", "approved": 0, "dismissed": 0},
                status=status.HTTP_200_OK,
            )

        broadcast_classroom_snapshots(session)
        return Response(
            {
                "message": f"Dismissed {count} pending question(s).",
                "approved": 0,
                "dismissed": count,
            },
            status=status.HTTP_200_OK,
        )


class TeacherSessionPollView(APIView):
    permission_classes = [IsAuthenticated, IsTeacherUser]

    def get_object(self, request, session_id):
        return request.user.teaching_sessions.get(pk=session_id)

    def get(self, request, session_id):
        session = self.get_object(request, session_id)
        payload = build_teacher_dashboard_from_db(session)["polls"]
        return Response(payload)

    def post(self, request, session_id):
        session = self.get_object(request, session_id)
        serializer = PollAuthoringSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        poll = Poll.objects.create(
            session=session,
            question=serializer.validated_data["question"],
            is_active=not session.polls.exists(),
        )
        for index, label in enumerate(serializer.validated_data["options"], start=1):
            PollOption.objects.create(poll=poll, label=label, value=0)
        broadcast_classroom_snapshots(
            session,
            student_room_event={
                "type": "student_event",
                "event": "poll_updated",
                "poll": build_student_dashboard_from_db(session)["poll"],
            },
        )

        return Response(
            {
                "message": "Poll created successfully.",
                "poll": {
                    "id": poll.id,
                    "question": poll.question,
                    "is_active": poll.is_active,
                },
            },
            status=status.HTTP_201_CREATED,
        )
    
    def put(self, request, session_id):
        session = self.get_object(request, session_id)
        serializer = PollUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        poll = session.polls.filter(pk=serializer.validated_data["poll_id"]).first()
        if poll is None:
            return Response({"message": "Poll not found."}, status=status.HTTP_404_NOT_FOUND)

        poll.question = serializer.validated_data["question"]
        poll.save(update_fields=["question"])
        poll.options.all().delete()
        for label in serializer.validated_data["options"]:
            PollOption.objects.create(poll=poll, label=label, value=0)
        broadcast_classroom_snapshots(
            session,
            student_room_event={
                "type": "student_event",
                "event": "poll_updated",
                "poll": build_student_dashboard_from_db(session)["poll"],
            },
        )

        return Response(
            {
                "message": "Poll updated successfully.",
                "poll": {
                    "id": poll.id,
                    "question": poll.question,
                    "is_active": poll.is_active,
                },
            },
            status=status.HTTP_200_OK,
        )

    def patch(self, request, session_id):
        session = self.get_object(request, session_id)
        serializer = PollMutationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        poll = session.polls.filter(pk=serializer.validated_data["poll_id"]).first()
        if poll is None:
            return Response({"message": "Poll not found."}, status=status.HTTP_404_NOT_FOUND)

        session.polls.update(is_active=False)
        poll.is_active = True
        poll.save(update_fields=["is_active"])
        broadcast_classroom_snapshots(
            session,
            student_room_event={
                "type": "student_event",
                "event": "poll_updated",
                "poll": build_student_dashboard_from_db(session)["poll"],
            },
        )

        return Response(
            {
                "message": "Poll activated successfully.",
                "poll": {
                    "id": poll.id,
                    "question": poll.question,
                    "is_active": poll.is_active,
                },
            },
            status=status.HTTP_200_OK,
        )


class TeacherSessionQuizView(APIView):
    permission_classes = [IsAuthenticated, IsTeacherUser]

    def get_object(self, request, session_id):
        return request.user.teaching_sessions.get(pk=session_id)

    def get(self, request, session_id):
        session = self.get_object(request, session_id)
        payload = build_teacher_dashboard_from_db(session)["quizzes"]
        return Response(payload)

    def post(self, request, session_id):
        session = self.get_object(request, session_id)
        serializer = QuizAuthoringSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        quiz = Quiz.objects.create(
            session=session,
            question=serializer.validated_data["question"],
            is_active=not session.quizzes.exists(),
        )
        for label in serializer.validated_data["choices"]:
            QuizChoice.objects.create(quiz=quiz, label=label)
        broadcast_classroom_snapshots(session)

        return Response(
            {
                "message": "Quiz created successfully.",
                "quiz": {
                    "id": quiz.id,
                    "question": quiz.question,
                    "is_active": quiz.is_active,
                },
            },
            status=status.HTTP_201_CREATED,
        )

    def put(self, request, session_id):
        session = self.get_object(request, session_id)
        serializer = QuizUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        quiz = session.quizzes.filter(pk=serializer.validated_data["quiz_id"]).first()
        if quiz is None:
            return Response({"message": "Quiz not found."}, status=status.HTTP_404_NOT_FOUND)

        quiz.question = serializer.validated_data["question"]
        quiz.save(update_fields=["question"])
        quiz.choices.all().delete()
        for label in serializer.validated_data["choices"]:
            QuizChoice.objects.create(quiz=quiz, label=label)
        broadcast_classroom_snapshots(session)

        return Response(
            {
                "message": "Quiz updated successfully.",
                "quiz": {
                    "id": quiz.id,
                    "question": quiz.question,
                    "is_active": quiz.is_active,
                },
            },
            status=status.HTTP_200_OK,
        )

    def patch(self, request, session_id):
        session = self.get_object(request, session_id)
        serializer = QuizMutationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        quiz = session.quizzes.filter(pk=serializer.validated_data["quiz_id"]).first()
        if quiz is None:
            return Response({"message": "Quiz not found."}, status=status.HTTP_404_NOT_FOUND)

        session.quizzes.update(is_active=False)
        quiz.is_active = True
        quiz.save(update_fields=["is_active"])
        broadcast_classroom_snapshots(session)

        return Response(
            {
                "message": "Quiz activated successfully.",
                "quiz": {
                    "id": quiz.id,
                    "question": quiz.question,
                    "is_active": quiz.is_active,
                },
            },
            status=status.HTTP_200_OK,
        )


class TeacherProgramListCreateView(APIView):
    permission_classes = [IsAuthenticated, IsTeacherUser]

    def get(self, request):
        org_ids = OrganizationMembership.objects.filter(
            user=request.user,
            role__in=("admin", "teacher"),
        ).values_list("organization_id", flat=True)
        programs = LearningProgram.objects.filter(organization_id__in=org_ids).select_related("organization")
        return Response(LearningProgramSerializer(programs, many=True).data)

    def post(self, request):
        serializer = LearningProgramMutationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        org = resolve_organization_for_teacher(request.user, serializer.validated_data["organization_id"])
        if org is None:
            return Response(
                {"message": "You do not manage that organization."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        base_slug = slugify(serializer.validated_data["title"]) or "program"
        slug = base_slug[:80]
        suffix = 1
        while LearningProgram.objects.filter(organization=org, slug=slug).exists():
            suffix += 1
            slug = f"{base_slug}-{suffix}"[:80]
        program = LearningProgram.objects.create(
            organization=org,
            title=serializer.validated_data["title"],
            slug=slug,
            starts_at=parse_session_datetime(serializer.validated_data["starts_at"]),
            ends_at=parse_session_datetime(serializer.validated_data["ends_at"]),
        )
        return Response(LearningProgramSerializer(program).data, status=status.HTTP_201_CREATED)


class TeacherSessionResourcesView(APIView):
    permission_classes = [IsAuthenticated, IsTeacherUser]
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    def get_object(self, request, session_id):
        return request.user.teaching_sessions.select_related("organization").get(pk=session_id)

    def get(self, request, session_id):
        session = self.get_object(request, session_id)
        resources = session.resources.all()
        return Response(SessionResourceSerializer(resources, many=True).data)

    def post(self, request, session_id):
        session = self.get_object(request, session_id)
        serializer = SessionResourceWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        next_order = (session.resources.aggregate(Max("sort_order"))["sort_order__max"] or 0) + 1
        resource = SessionResource(
            session=session,
            title=data["title"],
            url=(data.get("url") or "").strip(),
            sort_order=next_order,
        )
        upload = data.get("file")
        if upload:
            resource.file = upload
        resource.full_clean()
        resource.save()
        broadcast_classroom_snapshots(session)
        broadcast_student_dashboard_for_session(session)
        return Response(SessionResourceSerializer(resource).data, status=status.HTTP_201_CREATED)


def broadcast_student_dashboard_for_session(session):
    for enrollment in session.enrollments.select_related("student"):
        broadcast_student_dashboard(session, enrollment.student)


class TeacherSessionResourceDetailView(APIView):
    permission_classes = [IsAuthenticated, IsTeacherUser]
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    def get_object(self, request, session_id):
        return request.user.teaching_sessions.get(pk=session_id)

    def patch(self, request, session_id, resource_id):
        session = self.get_object(request, session_id)
        resource = session.resources.filter(pk=resource_id).first()
        if resource is None:
            return Response({"message": "Resource not found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = SessionResourcePatchSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        if "title" in data:
            resource.title = data["title"]
        if "url" in data:
            resource.url = (data["url"] or "").strip()
        if "sort_order" in data:
            resource.sort_order = data["sort_order"]
        if data.get("file"):
            resource.file = data["file"]
        resource.full_clean()
        resource.save()
        broadcast_classroom_snapshots(session)
        broadcast_student_dashboard_for_session(session)
        return Response(SessionResourceSerializer(resource).data, status=status.HTTP_200_OK)

    def delete(self, request, session_id, resource_id):
        session = self.get_object(request, session_id)
        resource = session.resources.filter(pk=resource_id).first()
        if resource is None:
            return Response({"message": "Resource not found."}, status=status.HTTP_404_NOT_FOUND)
        resource.delete()
        broadcast_classroom_snapshots(session)
        broadcast_student_dashboard_for_session(session)
        return Response({"message": "Resource removed."}, status=status.HTTP_200_OK)
