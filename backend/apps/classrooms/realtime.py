from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer


def classroom_user_group_name(room_code, role, username):
    return f"classroom_{room_code}_{role}_{username}"


def classroom_room_group_name(room_code, role):
    return f"classroom_{room_code}_{role}_room"


def _send_group_payload(group_name, event_type, payload):
    channel_layer = get_channel_layer()
    if channel_layer is None:
        return

    try:
        async_to_sync(channel_layer.group_send)(
            group_name,
            {
                "type": event_type,
                "payload": payload,
            },
        )
    except Exception:
        # Realtime delivery should not break the request lifecycle.
        return


def broadcast_classroom_signal(room_code, role, username, payload):
    _send_group_payload(
        classroom_user_group_name(room_code, role, username),
        "classroom.signal",
        payload,
    )


def broadcast_teacher_snapshot(session):
    from apps.classrooms.serializers import (
        EnrollmentSerializer,
        TeacherDashboardSerializer,
        TeacherSessionSerializer,
    )
    from apps.classrooms.views import build_teacher_dashboard_from_db

    teacher_payload = {
        "type": "teacher_snapshot",
        "session": TeacherSessionSerializer(session).data,
        "dashboard": TeacherDashboardSerializer(build_teacher_dashboard_from_db(session)).data,
        "enrollments": EnrollmentSerializer(
            session.enrollments.select_related("student", "student__student_profile").order_by(
                "student__first_name",
                "student__username",
            ),
            many=True,
        ).data,
    }
    _send_group_payload(
        classroom_user_group_name(session.room_code, "teacher", session.teacher.username),
        "classroom.snapshot",
        teacher_payload,
    )


def broadcast_student_dashboard(session, student):
    from apps.classrooms.serializers import StudentDashboardSerializer
    from apps.classrooms.views import build_student_dashboard_from_db

    student_payload = {
        "type": "student_snapshot",
        "dashboard": StudentDashboardSerializer(
            build_student_dashboard_from_db(session, student_user=student)
        ).data,
    }
    _send_group_payload(
        classroom_user_group_name(session.room_code, "student", student.username),
        "classroom.snapshot",
        student_payload,
    )


def broadcast_student_room_event(session, payload):
    _send_group_payload(
        classroom_room_group_name(session.room_code, "student"),
        "classroom.event",
        payload,
    )


def broadcast_classroom_snapshots(session, student_room_event=None, refresh_students=None):
    broadcast_teacher_snapshot(session)
    broadcast_student_room_event(
        session,
        student_room_event
        or {
            "type": "student_event",
            "event": "refresh_required",
        },
    )

    if refresh_students:
        seen_usernames = set()
        for student in refresh_students:
            if student is None or student.username in seen_usernames:
                continue
            seen_usernames.add(student.username)
            broadcast_student_dashboard(session, student)
