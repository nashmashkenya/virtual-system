from django.contrib.auth.models import User
from django.db import models


class LearningProgram(models.Model):
    """Holiday / cohort window tied to an organization (e.g. winter revision camp)."""

    organization = models.ForeignKey(
        "organizations.Organization",
        on_delete=models.CASCADE,
        related_name="programs",
    )
    title = models.CharField(max_length=255)
    slug = models.SlugField(max_length=80)
    starts_at = models.DateTimeField()
    ends_at = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-starts_at"]
        unique_together = ("organization", "slug")

    def __str__(self) -> str:
        return self.title


class ClassroomSession(models.Model):
    DELIVERY_MODE_CHOICES = (
        ("interactive", "Interactive room"),
        ("broadcast", "Broadcast lecture"),
    )
    STAGE_MODE_CHOICES = (
        ("camera", "Camera"),
        ("screenshare", "Screen share"),
        ("whiteboard", "Whiteboard"),
        ("slides", "Slides"),
    )
    SPOTLIGHT_MODE_CHOICES = (
        ("off", "Off"),
        ("teacher", "Teacher"),
        ("content", "Content"),
    )
    RECORDING_STATUS_CHOICES = (
        ("idle", "Idle"),
        ("recording", "Recording"),
        ("paused", "Paused"),
    )
    CHAT_MODERATION_MODE_CHOICES = (
        ("open", "Open chat"),
        ("qa_queue", "Q&A moderation queue"),
    )

    organization = models.ForeignKey(
        "organizations.Organization",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="sessions",
    )
    open_enrollment = models.BooleanField(
        default=True,
        help_text="When True, learners with the room code can self-enroll.",
    )
    program = models.ForeignKey(
        LearningProgram,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="sessions",
    )

    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    youtube_live_url = models.URLField()
    room_code = models.SlugField(unique=True)
    starts_at = models.DateTimeField()
    teacher = models.ForeignKey(User, on_delete=models.CASCADE, related_name="teaching_sessions")
    is_paid = models.BooleanField(default=True)
    price_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    delivery_mode = models.CharField(max_length=24, choices=DELIVERY_MODE_CHOICES, default="interactive")
    expected_participants = models.PositiveIntegerField(default=50)
    stage_mode = models.CharField(max_length=24, choices=STAGE_MODE_CHOICES, default="camera")
    teacher_camera_enabled = models.BooleanField(default=False)
    teacher_mic_enabled = models.BooleanField(default=False)
    screen_share_enabled = models.BooleanField(default=False)
    whiteboard_enabled = models.BooleanField(default=False)
    student_chat_enabled = models.BooleanField(default=True)
    chat_moderation_mode = models.CharField(
        max_length=16,
        choices=CHAT_MODERATION_MODE_CHOICES,
        default="open",
    )
    qa_queue_max_pending = models.PositiveIntegerField(default=75)
    chat_slow_mode = models.BooleanField(
        default=False,
        help_text="When True, student main-room chat uses a stricter per-user rate limit.",
    )
    student_raise_hand_enabled = models.BooleanField(default=True)
    join_approval_enabled = models.BooleanField(default=False)
    spotlight_mode = models.CharField(max_length=16, choices=SPOTLIGHT_MODE_CHOICES, default="off")
    breakout_enabled = models.BooleanField(default=False)
    monitored_breakout_room = models.ForeignKey(
        "BreakoutRoom",
        on_delete=models.SET_NULL,
        related_name="monitored_sessions",
        null=True,
        blank=True,
    )
    breakout_timer_ends_at = models.DateTimeField(null=True, blank=True)
    last_breakout_layout = models.JSONField(default=list, blank=True)
    breakout_broadcast_message = models.TextField(blank=True)
    breakout_broadcast_sent_at = models.DateTimeField(null=True, blank=True)
    recording_status = models.CharField(max_length=16, choices=RECORDING_STATUS_CHOICES, default="idle")
    recording_started_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self) -> str:
        return self.title


class Enrollment(models.Model):
    ACCESS_STATUS_CHOICES = (
        ("live_now", "Live now"),
        ("upcoming", "Upcoming"),
        ("paid", "Paid"),
        ("locked", "Locked"),
    )
    ENROLLMENT_SOURCE_CHOICES = (
        ("roster", "Roster"),
        ("join_code", "Join code"),
        ("invite", "Invite"),
    )

    session = models.ForeignKey(ClassroomSession, on_delete=models.CASCADE, related_name="enrollments")
    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name="enrollments")
    breakout_room = models.ForeignKey(
        "BreakoutRoom",
        on_delete=models.SET_NULL,
        related_name="enrollments",
        null=True,
        blank=True,
    )
    progress = models.PositiveSmallIntegerField(default=0)
    access_status = models.CharField(max_length=24, choices=ACCESS_STATUS_CHOICES, default="upcoming")
    enrollment_source = models.CharField(
        max_length=24,
        choices=ENROLLMENT_SOURCE_CHOICES,
        default="roster",
    )
    display_time = models.CharField(max_length=64, blank=True)

    class Meta:
        unique_together = ("session", "student")

    def __str__(self) -> str:
        return f"{self.student.username}:{self.session.title}"


class AttendanceRecord(models.Model):
    STATUS_CHOICES = (
        ("Present", "Present"),
        ("Pending", "Pending"),
    )

    session = models.ForeignKey(ClassroomSession, on_delete=models.CASCADE, related_name="attendance_records")
    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name="attendance_records")
    joined_at = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=16, choices=STATUS_CHOICES, default="Pending")

    class Meta:
        unique_together = ("session", "student")

    def __str__(self) -> str:
        return f"{self.student.username}:{self.status}"


class ChatMessage(models.Model):
    ROLE_CHOICES = (
        ("teacher", "Teacher"),
        ("student", "Student"),
    )
    QA_STATUS_CHOICES = (
        ("none", "Not queued"),
        ("pending", "Pending moderation"),
        ("approved", "Approved to class chat"),
        ("dismissed", "Dismissed"),
    )

    session = models.ForeignKey(ClassroomSession, on_delete=models.CASCADE, related_name="messages")
    sender = models.ForeignKey(User, on_delete=models.CASCADE, related_name="chat_messages")
    breakout_room = models.ForeignKey(
        "BreakoutRoom",
        on_delete=models.SET_NULL,
        related_name="messages",
        null=True,
        blank=True,
    )
    role = models.CharField(max_length=16, choices=ROLE_CHOICES)
    message = models.TextField()
    is_pinned = models.BooleanField(default=False)
    is_hidden = models.BooleanField(default=False)
    qa_status = models.CharField(max_length=16, choices=QA_STATUS_CHOICES, default="none")
    sent_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["sent_at"]

    def __str__(self) -> str:
        return f"{self.sender.username}:{self.role}"


class RaiseHandRequest(models.Model):
    STATUS_CHOICES = (
        ("open", "Open"),
        ("resolved", "Resolved"),
    )

    session = models.ForeignKey(ClassroomSession, on_delete=models.CASCADE, related_name="raise_hand_requests")
    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name="raise_hand_requests")
    reason = models.CharField(max_length=255)
    status = models.CharField(max_length=16, choices=STATUS_CHOICES, default="open")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]

    def __str__(self) -> str:
        return f"{self.student.username}:{self.reason}"


class JoinRequest(models.Model):
    STATUS_CHOICES = (
        ("pending", "Pending"),
        ("approved", "Approved"),
        ("denied", "Denied"),
    )

    session = models.ForeignKey(ClassroomSession, on_delete=models.CASCADE, related_name="join_requests")
    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name="join_requests")
    status = models.CharField(max_length=16, choices=STATUS_CHOICES, default="pending")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("session", "student")
        ordering = ["created_at"]

    def __str__(self) -> str:
        return f"{self.student.username}:{self.status}"


class BreakoutRoom(models.Model):
    session = models.ForeignKey(ClassroomSession, on_delete=models.CASCADE, related_name="breakout_rooms")
    name = models.CharField(max_length=120)
    spokesperson = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        related_name="breakout_spokesperson_rooms",
        null=True,
        blank=True,
    )
    sort_order = models.PositiveSmallIntegerField(default=1)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["sort_order", "id"]

    def __str__(self) -> str:
        return f"{self.session.room_code}:{self.name}"


class Poll(models.Model):
    session = models.ForeignKey(ClassroomSession, on_delete=models.CASCADE, related_name="polls")
    question = models.CharField(max_length=255)
    is_active = models.BooleanField(default=False)
    response_count = models.PositiveIntegerField(default=0)

    def __str__(self) -> str:
        return self.question


class PollOption(models.Model):
    poll = models.ForeignKey(Poll, on_delete=models.CASCADE, related_name="options")
    label = models.CharField(max_length=255)
    value = models.PositiveSmallIntegerField(default=0)

    def __str__(self) -> str:
        return self.label


class Quiz(models.Model):
    session = models.ForeignKey(ClassroomSession, on_delete=models.CASCADE, related_name="quizzes")
    question = models.CharField(max_length=255)
    is_active = models.BooleanField(default=False)

    def __str__(self) -> str:
        return self.question


class QuizChoice(models.Model):
    quiz = models.ForeignKey(Quiz, on_delete=models.CASCADE, related_name="choices")
    label = models.CharField(max_length=255)

    def __str__(self) -> str:
        return self.label


class PollVote(models.Model):
    poll = models.ForeignKey(Poll, on_delete=models.CASCADE, related_name="votes")
    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name="poll_votes")
    selected_option = models.ForeignKey(PollOption, on_delete=models.CASCADE, related_name="votes")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("poll", "student")

    def __str__(self) -> str:
        return f"{self.student.username}:{self.poll_id}:{self.selected_option_id}"


class QuizSubmission(models.Model):
    quiz = models.ForeignKey(Quiz, on_delete=models.CASCADE, related_name="submissions")
    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name="quiz_submissions")
    selected_choice = models.ForeignKey(QuizChoice, on_delete=models.CASCADE, related_name="submissions")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("quiz", "student")

    def __str__(self) -> str:
        return f"{self.student.username}:{self.quiz_id}:{self.selected_choice_id}"


class SessionResource(models.Model):
    """Async materials: external link and/or uploaded file (slides, PDFs)."""

    session = models.ForeignKey(ClassroomSession, on_delete=models.CASCADE, related_name="resources")
    title = models.CharField(max_length=255)
    url = models.URLField(blank=True, default="")
    file = models.FileField(
        upload_to="session_resources/%Y/%m/",
        max_length=512,
        blank=True,
        null=True,
    )
    sort_order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ["sort_order", "id"]

    def clean(self):
        from django.core.exceptions import ValidationError

        if not (self.url or self.file):
            raise ValidationError("Provide a URL or upload a file.")

    def __str__(self) -> str:
        return f"{self.session.room_code}:{self.title}"


class WhiteboardState(models.Model):
    session = models.OneToOneField(
        ClassroomSession,
        on_delete=models.CASCADE,
        related_name="whiteboard_state",
    )
    pages = models.JSONField(default=list, blank=True)
    active_page = models.PositiveIntegerField(default=0)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self) -> str:
        return f"whiteboard:{self.session.room_code}"
