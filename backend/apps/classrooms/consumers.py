import json
from urllib.parse import parse_qs

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer
from django.contrib.auth.models import User
from django.utils import timezone
from rest_framework_simplejwt.authentication import JWTAuthentication

from apps.classrooms.models import AttendanceRecord, ClassroomSession, Enrollment
from apps.classrooms.realtime import (
    broadcast_teacher_snapshot,
    classroom_room_group_name,
    classroom_user_group_name,
)


class ClassroomConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.room_code = self.scope["url_route"]["kwargs"]["room_code"]
        query = parse_qs(self.scope.get("query_string", b"").decode())
        self.username = (query.get("username") or [""])[0]
        self.role = (query.get("role") or [""])[0]
        self.channel_kind = (query.get("channel") or ["events"])[0]
        raw_token = (query.get("token") or [""])[0]

        if (
            not self.username
            or self.role not in {"student", "teacher"}
            or self.channel_kind not in {"events", "signals"}
        ):
            await self.close(code=4400)
            return

        is_authorized = await self._authorize_connection(raw_token)
        if not is_authorized:
            await self.close(code=4401)
            return

        self.group_name = classroom_user_group_name(self.room_code, self.role, self.username)

        await self.channel_layer.group_add(self.group_name, self.channel_name)
        if self.channel_kind == "events":
            await self.channel_layer.group_add(
                classroom_room_group_name(self.room_code, self.role),
                self.channel_name,
            )
        await self.accept()

        if self.role == "student" and self.channel_kind == "events":
            await self._update_student_presence(is_connected=True)

    async def disconnect(self, close_code):
        if getattr(self, "role", None) == "student" and getattr(self, "channel_kind", None) == "events":
            await self._update_student_presence(is_connected=False)
        if getattr(self, "role", None) == "student" and getattr(self, "channel_kind", None) == "signals":
            await self._relay_signal(
                target_role="teacher",
                target_username="",
                signal_payload={"kind": "viewer_left", "media": "screen"},
            )
            await self._relay_signal(
                target_role="teacher",
                target_username="",
                signal_payload={"kind": "viewer_left", "media": "audio"},
            )
            await self._relay_signal(
                target_role="teacher",
                target_username="",
                signal_payload={"kind": "viewer_left", "media": "camera"},
            )
        if getattr(self, "channel_kind", None) == "events":
            await self.channel_layer.group_discard(
                classroom_room_group_name(self.room_code, self.role),
                self.channel_name,
            )
        await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive(self, text_data=None, bytes_data=None):
        payload = json.loads(text_data or "{}")
        if payload.get("type") == "ping":
            await self.send(text_data=json.dumps({"type": "pong"}))
            return

        if self.channel_kind != "signals":
            return

        if payload.get("type") != "signal":
            return

        target_role = payload.get("target_role")
        target_username = (payload.get("target_username") or "").strip()
        signal_payload = payload.get("payload")

        if target_role not in {"student", "teacher"} or not isinstance(signal_payload, dict):
            return

        await self._relay_signal(target_role, target_username, signal_payload)

    async def classroom_snapshot(self, event):
        await self.send(text_data=json.dumps(event["payload"]))

    async def classroom_event(self, event):
        await self.send(text_data=json.dumps(event["payload"]))

    async def classroom_signal(self, event):
        await self.send(text_data=json.dumps(event["payload"]))

    async def _relay_signal(self, target_role, target_username, signal_payload):
        if target_role == "teacher" and not target_username:
            target_username = await self._get_teacher_username()

        if not target_username:
            return

        await self.channel_layer.group_send(
            classroom_user_group_name(self.room_code, target_role, target_username),
            {
                "type": "classroom.signal",
                "payload": {
                    "type": "signal",
                    "source_username": self.username,
                    "source_role": self.role,
                    "payload": signal_payload,
                },
            },
        )

    @database_sync_to_async
    def _get_teacher_username(self):
        session = (
            ClassroomSession.objects.select_related("teacher")
            .filter(room_code=self.room_code)
            .order_by("-created_at")
            .first()
        )
        if session is None:
            return ""
        return session.teacher.username

    @database_sync_to_async
    def _authorize_connection(self, raw_token):
        if not raw_token:
            return False

        try:
            authenticator = JWTAuthentication()
            validated_token = authenticator.get_validated_token(raw_token)
            user = authenticator.get_user(validated_token)
        except Exception:
            return False

        if user is None or not user.is_authenticated or user.username != self.username:
            return False

        session = (
            ClassroomSession.objects.select_related("teacher")
            .filter(room_code=self.room_code)
            .order_by("-created_at")
            .first()
        )
        if session is None:
            return False
        if self.channel_kind == "signals" and session.delivery_mode == "broadcast":
            return False

        if self.role == "teacher":
            return hasattr(user, "teacher_profile") and session.teacher_id == user.id

        return hasattr(user, "student_profile") and Enrollment.objects.filter(
            session=session,
            student=user,
        ).exists()

    @database_sync_to_async
    def _update_student_presence(self, is_connected):
        session = (
            ClassroomSession.objects.select_related("teacher")
            .filter(room_code=self.room_code)
            .order_by("-created_at")
            .first()
        )
        if session is None:
            return

        student = User.objects.filter(username=self.username).first()
        if student is None:
            return

        enrollment_exists = Enrollment.objects.filter(session=session, student=student).exists()
        if not enrollment_exists:
            return

        if session.join_approval_enabled:
            join_request = session.join_requests.filter(student=student).first()
            if join_request is None or join_request.status != "approved":
                return

        attendance, _ = AttendanceRecord.objects.get_or_create(
            session=session,
            student=student,
        )

        changed_fields = []
        if is_connected:
            if attendance.status != "Present":
                attendance.status = "Present"
                changed_fields.append("status")
            if attendance.joined_at is None:
                attendance.joined_at = timezone.now()
                changed_fields.append("joined_at")
        else:
            if attendance.status != "Pending":
                attendance.status = "Pending"
                changed_fields.append("status")

        if changed_fields:
            attendance.save(update_fields=changed_fields)
            broadcast_teacher_snapshot(session)
