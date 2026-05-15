from rest_framework import serializers

from apps.classrooms.models import ClassroomSession, Enrollment, LearningProgram, SessionResource, WhiteboardState


class MetricSerializer(serializers.Serializer):
    label = serializers.CharField()
    value = serializers.CharField()
    detail = serializers.CharField()


class CourseSerializer(serializers.Serializer):
    title = serializers.CharField()
    coach = serializers.CharField()
    time = serializers.CharField()
    status = serializers.CharField()
    progress = serializers.IntegerField()


class MessageSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    sender = serializers.CharField()
    role = serializers.CharField()
    message = serializers.CharField()
    time = serializers.CharField()


class BreakoutRoomMemberSerializer(serializers.Serializer):
    student_id = serializers.IntegerField()
    name = serializers.CharField()
    status = serializers.CharField()


class StudentBreakoutRoomSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    name = serializers.CharField()
    member_names = serializers.ListField(child=serializers.CharField())
    teacher_present = serializers.BooleanField()


class BreakoutBroadcastSerializer(serializers.Serializer):
    message = serializers.CharField()
    sent_at = serializers.CharField()


class TeacherBreakoutRoomSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    name = serializers.CharField()
    member_count = serializers.IntegerField()
    teacher_present = serializers.BooleanField()
    spokesperson_student_id = serializers.IntegerField(allow_null=True)
    spokesperson_name = serializers.CharField(allow_null=True)
    students = BreakoutRoomMemberSerializer(many=True)


class PollOptionSerializer(serializers.Serializer):
    id = serializers.IntegerField(required=False)
    label = serializers.CharField()
    value = serializers.IntegerField()


class PollSerializer(serializers.Serializer):
    id = serializers.IntegerField(required=False, allow_null=True)
    question = serializers.CharField()
    response_count = serializers.IntegerField()
    selected_option_id = serializers.IntegerField(required=False, allow_null=True)
    options = PollOptionSerializer(many=True)


class StudentQuizChoiceSerializer(serializers.Serializer):
    id = serializers.IntegerField(required=False)
    label = serializers.CharField()


class StudentChatMessageSerializer(serializers.Serializer):
    message = serializers.CharField(max_length=1000)


class TeacherChatMessageSerializer(serializers.Serializer):
    message = serializers.CharField(max_length=1000)
    breakout_room_id = serializers.IntegerField(required=False, allow_null=True)


class QuizSerializer(serializers.Serializer):
    id = serializers.IntegerField(required=False, allow_null=True)
    question = serializers.CharField()
    selected_choice_id = serializers.IntegerField(required=False, allow_null=True)
    submitted = serializers.BooleanField(required=False)
    choices = StudentQuizChoiceSerializer(many=True)


class LiveClassSerializer(serializers.Serializer):
    course_title = serializers.CharField()
    session_title = serializers.CharField()
    youtube_embed_url = serializers.URLField()
    room_code = serializers.CharField()
    is_live = serializers.BooleanField()
    price_label = serializers.CharField()
    payment_required = serializers.BooleanField()
    student_paid = serializers.BooleanField()
    waiting_room_enabled = serializers.BooleanField()
    join_status = serializers.ChoiceField(choices=("not_required", "none", "pending", "approved", "denied"))
    can_join_room = serializers.BooleanField()
    delivery_mode = serializers.ChoiceField(choices=ClassroomSession.DELIVERY_MODE_CHOICES)
    expected_participants = serializers.IntegerField()
    broadcast_only = serializers.BooleanField()
    program_title = serializers.CharField(required=False, allow_blank=True)
    program_window = serializers.CharField(required=False, allow_blank=True)


class WhiteboardStrokeSerializer(serializers.Serializer):
    id = serializers.CharField()
    color = serializers.CharField()
    width = serializers.FloatField()
    tool = serializers.ChoiceField(choices=("pen", "eraser"))
    points = serializers.ListField(
        child=serializers.ListField(child=serializers.FloatField(), min_length=2, max_length=2),
    )


class WhiteboardPageSerializer(serializers.Serializer):
    id = serializers.CharField()
    name = serializers.CharField()
    strokes = WhiteboardStrokeSerializer(many=True)


class WhiteboardStateSerializer(serializers.Serializer):
    pages = WhiteboardPageSerializer(many=True)
    active_page = serializers.IntegerField()
    updated_at = serializers.CharField(required=False)


class RoomStateSerializer(serializers.Serializer):
    stage_mode = serializers.ChoiceField(choices=ClassroomSession.STAGE_MODE_CHOICES)
    teacher_camera_enabled = serializers.BooleanField()
    teacher_mic_enabled = serializers.BooleanField()
    screen_share_enabled = serializers.BooleanField()
    whiteboard_enabled = serializers.BooleanField()
    student_chat_enabled = serializers.BooleanField()
    chat_moderation_mode = serializers.ChoiceField(choices=ClassroomSession.CHAT_MODERATION_MODE_CHOICES)
    chat_slow_mode = serializers.BooleanField()
    qa_queue_max_pending = serializers.IntegerField()
    qa_queue_pending_count = serializers.IntegerField(required=False)
    student_raise_hand_enabled = serializers.BooleanField()
    join_approval_enabled = serializers.BooleanField()
    spotlight_mode = serializers.ChoiceField(choices=ClassroomSession.SPOTLIGHT_MODE_CHOICES)
    breakout_enabled = serializers.BooleanField()
    monitored_breakout_room_id = serializers.IntegerField(allow_null=True)
    breakout_timer_ends_at = serializers.CharField(allow_null=True)
    last_breakout_layout_available = serializers.BooleanField()
    recording_status = serializers.ChoiceField(choices=ClassroomSession.RECORDING_STATUS_CHOICES)
    recording_started_at = serializers.CharField(allow_null=True)


class SessionResourceItemSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    title = serializers.CharField()
    url = serializers.CharField()


class StudentDashboardSerializer(serializers.Serializer):
    live_class = LiveClassSerializer()
    room_state = RoomStateSerializer()
    breakout_room = StudentBreakoutRoomSerializer(allow_null=True)
    breakout_broadcast = BreakoutBroadcastSerializer(allow_null=True)
    whiteboard = WhiteboardStateSerializer()
    engagement_stats = MetricSerializer(many=True)
    poll = PollSerializer()
    quiz = QuizSerializer()
    courses = CourseSerializer(many=True)
    messages = MessageSerializer(many=True)
    session_resources = SessionResourceItemSerializer(many=True)


class FormDefaultsSerializer(serializers.Serializer):
    title = serializers.CharField()
    youtube_link = serializers.URLField()
    starts_at = serializers.CharField()
    delivery_mode = serializers.ChoiceField(choices=ClassroomSession.DELIVERY_MODE_CHOICES)
    expected_participants = serializers.IntegerField()


class AttendanceSerializer(serializers.Serializer):
    student_id = serializers.IntegerField()
    name = serializers.CharField()
    joined_at = serializers.CharField()
    status = serializers.CharField()
    payment = serializers.CharField()


class QueueSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    student_id = serializers.IntegerField()
    name = serializers.CharField()
    reason = serializers.CharField()
    wait = serializers.CharField()


class RaiseHandMutationSerializer(serializers.Serializer):
    request_id = serializers.IntegerField()


class StudentRaiseHandSerializer(serializers.Serializer):
    reason = serializers.CharField(max_length=255, required=False, allow_blank=True)


class StudentJoinRequestSerializer(serializers.Serializer):
    pass


class TeacherJoinRequestMutationSerializer(serializers.Serializer):
    request_id = serializers.IntegerField()
    action = serializers.ChoiceField(choices=("approve", "deny"))


class StreamPreviewSerializer(serializers.Serializer):
    badge = serializers.CharField()
    title = serializers.CharField()
    youtube_link = serializers.URLField()


class TeacherPollOptionSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    label = serializers.CharField()
    value = serializers.IntegerField()


class TeacherPollSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    question = serializers.CharField()
    is_active = serializers.BooleanField()
    response_count = serializers.IntegerField()
    options = TeacherPollOptionSerializer(many=True)


class TeacherQuizChoiceSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    label = serializers.CharField()


class TeacherQuizSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    question = serializers.CharField()
    is_active = serializers.BooleanField()
    choices = TeacherQuizChoiceSerializer(many=True)


class ModerationInsightSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    sender = serializers.CharField()
    role = serializers.CharField()
    message = serializers.CharField()
    is_pinned = serializers.BooleanField()


class QaQueueEntrySerializer(serializers.Serializer):
    id = serializers.IntegerField()
    student_id = serializers.IntegerField()
    sender = serializers.CharField()
    message = serializers.CharField()
    time = serializers.CharField()


class LastBreakoutSummaryRoomSerializer(serializers.Serializer):
    name = serializers.CharField()
    member_names = serializers.ListField(child=serializers.CharField())
    spokesperson_name = serializers.CharField(allow_null=True)


class LastBreakoutSummarySerializer(serializers.Serializer):
    room_count = serializers.IntegerField()
    total_learners = serializers.IntegerField()
    rooms = LastBreakoutSummaryRoomSerializer(many=True)


class TeacherDashboardSerializer(serializers.Serializer):
    form_defaults = FormDefaultsSerializer()
    room_state = RoomStateSerializer()
    whiteboard = WhiteboardStateSerializer()
    metrics = MetricSerializer(many=True)
    attendance = AttendanceSerializer(many=True)
    polls = TeacherPollSerializer(many=True)
    quizzes = TeacherQuizSerializer(many=True)
    raise_hand_queue = QueueSerializer(many=True)
    waiting_room_queue = QueueSerializer(many=True)
    breakout_rooms = TeacherBreakoutRoomSerializer(many=True)
    breakout_broadcast = BreakoutBroadcastSerializer(allow_null=True)
    last_breakout_summary = LastBreakoutSummarySerializer(allow_null=True)
    moderation_insights = ModerationInsightSerializer(many=True)
    qa_queue = QaQueueEntrySerializer(many=True)
    messages = MessageSerializer(many=True)
    stream_preview = StreamPreviewSerializer()


class CreateSessionSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=255)
    youtube_link = serializers.URLField()
    starts_at = serializers.CharField()


class TeacherSessionSerializer(serializers.ModelSerializer):
    youtube_link = serializers.URLField(source="youtube_live_url")
    teacher_name = serializers.SerializerMethodField()
    status = serializers.SerializerMethodField()
    enrolled_students = serializers.SerializerMethodField()

    organization_id = serializers.IntegerField(read_only=True)
    organization_name = serializers.SerializerMethodField()
    program_id = serializers.IntegerField(read_only=True, allow_null=True)
    program_title = serializers.SerializerMethodField()

    class Meta:
        model = ClassroomSession
        fields = [
            "id",
            "organization_id",
            "organization_name",
            "open_enrollment",
            "program_id",
            "program_title",
            "title",
            "description",
            "youtube_link",
            "starts_at",
            "room_code",
            "is_paid",
            "price_amount",
            "delivery_mode",
            "expected_participants",
            "teacher_name",
            "status",
            "enrolled_students",
            "created_at",
        ]

    def get_organization_name(self, obj):
        return obj.organization.name if obj.organization_id else ""

    def get_program_title(self, obj):
        return obj.program.title if obj.program_id else ""

    def get_teacher_name(self, obj):
        return obj.teacher.get_full_name() or obj.teacher.username

    def get_status(self, obj):
        from django.utils import timezone

        starts_at = obj.starts_at
        if timezone.is_naive(starts_at):
            starts_at = timezone.make_aware(starts_at, timezone.get_current_timezone())

        return "Live" if timezone.now() >= starts_at else "Scheduled"

    def get_enrolled_students(self, obj):
        return obj.enrollments.count()


class TeacherSessionMutationSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=255)
    youtube_link = serializers.URLField(required=False, allow_blank=True)
    starts_at = serializers.CharField()
    description = serializers.CharField(required=False, allow_blank=True)
    is_paid = serializers.BooleanField(required=False)
    price_amount = serializers.DecimalField(max_digits=10, decimal_places=2, required=False)
    delivery_mode = serializers.ChoiceField(choices=ClassroomSession.DELIVERY_MODE_CHOICES, required=False)
    expected_participants = serializers.IntegerField(min_value=1, max_value=5000, required=False)
    organization_id = serializers.IntegerField(required=False, allow_null=True)
    open_enrollment = serializers.BooleanField(required=False)
    program_id = serializers.IntegerField(required=False, allow_null=True)


class StudentDirectorySerializer(serializers.Serializer):
    id = serializers.IntegerField()
    username = serializers.CharField()
    full_name = serializers.CharField()
    email = serializers.EmailField()
    school_name = serializers.CharField(allow_blank=True)
    school_class = serializers.CharField(allow_blank=True)


class EnrollmentSerializer(serializers.ModelSerializer):
    student_id = serializers.IntegerField(source="student.id")
    username = serializers.CharField(source="student.username")
    full_name = serializers.SerializerMethodField()
    email = serializers.EmailField(source="student.email")
    school_name = serializers.SerializerMethodField()
    school_class = serializers.SerializerMethodField()

    class Meta:
        model = Enrollment
        fields = [
            "student_id",
            "username",
            "full_name",
            "email",
            "school_name",
            "school_class",
            "progress",
            "access_status",
            "enrollment_source",
            "display_time",
        ]

    def get_full_name(self, obj):
        return obj.student.get_full_name() or obj.student.username

    def get_school_name(self, obj):
        profile = getattr(obj.student, "student_profile", None)
        return profile.school_name if profile else ""

    def get_school_class(self, obj):
        profile = getattr(obj.student, "student_profile", None)
        return profile.school_class if profile else ""


class EnrollmentMutationSerializer(serializers.Serializer):
    student_id = serializers.IntegerField()
    access_status = serializers.ChoiceField(choices=Enrollment.ACCESS_STATUS_CHOICES, required=False)
    progress = serializers.IntegerField(min_value=0, max_value=100, required=False)
    display_time = serializers.CharField(required=False, allow_blank=True)


class StudentEnrollByCodeSerializer(serializers.Serializer):
    room_code = serializers.SlugField(max_length=80)


class LearningProgramSerializer(serializers.ModelSerializer):
    class Meta:
        model = LearningProgram
        fields = ["id", "organization_id", "title", "slug", "starts_at", "ends_at", "created_at"]


class LearningProgramMutationSerializer(serializers.Serializer):
    organization_id = serializers.IntegerField()
    title = serializers.CharField(max_length=255)
    starts_at = serializers.CharField()
    ends_at = serializers.CharField()


class SessionResourceSerializer(serializers.ModelSerializer):
    file_url = serializers.SerializerMethodField()

    class Meta:
        model = SessionResource
        fields = ["id", "title", "url", "file", "file_url", "sort_order"]

    def get_file_url(self, obj):
        if not obj.file:
            return None
        from django.conf import settings

        path = obj.file.url
        base = getattr(settings, "PUBLIC_BACKEND_BASE_URL", "") or ""
        p = path if path.startswith("/") else f"/{path}"
        return f"{base}{p}" if base else p


class SessionResourceWriteSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=255)
    url = serializers.URLField(required=False, allow_blank=True)
    file = serializers.FileField(required=False, allow_null=True)

    def validate(self, attrs):
        url = (attrs.get("url") or "").strip()
        upload = attrs.get("file")
        if not url and not upload:
            raise serializers.ValidationError("Provide a link URL or upload a file.")
        attrs["url"] = url
        return attrs


class SessionResourcePatchSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=255, required=False)
    url = serializers.URLField(required=False, allow_blank=True)
    file = serializers.FileField(required=False, allow_null=True)
    sort_order = serializers.IntegerField(min_value=0, required=False)


class AttendanceMutationSerializer(serializers.Serializer):
    student_id = serializers.IntegerField()
    status = serializers.ChoiceField(choices=("Present", "Pending"))


class ChatModerationMutationSerializer(serializers.Serializer):
    message_id = serializers.IntegerField()
    action = serializers.ChoiceField(choices=("pin", "unpin", "hide", "approve_qa", "dismiss_qa"))


class QaQueueBulkActionSerializer(serializers.Serializer):
    action = serializers.ChoiceField(choices=("approve_all", "dismiss_all"), default="approve_all")


class PollMutationSerializer(serializers.Serializer):
    poll_id = serializers.IntegerField()


class QuizMutationSerializer(serializers.Serializer):
    quiz_id = serializers.IntegerField()


class PollAuthoringSerializer(serializers.Serializer):
    question = serializers.CharField(max_length=255)
    options = serializers.ListField(
        child=serializers.CharField(max_length=255),
        min_length=2,
    )


class PollUpdateSerializer(PollAuthoringSerializer):
    poll_id = serializers.IntegerField()


class QuizAuthoringSerializer(serializers.Serializer):
    question = serializers.CharField(max_length=255)
    choices = serializers.ListField(
        child=serializers.CharField(max_length=255),
        min_length=2,
    )


class QuizUpdateSerializer(QuizAuthoringSerializer):
    quiz_id = serializers.IntegerField()


class StudentPollVoteSerializer(serializers.Serializer):
    option_id = serializers.IntegerField()


class StudentQuizSubmissionSerializer(serializers.Serializer):
    choice_id = serializers.IntegerField()


class TeacherRoomStateMutationSerializer(serializers.Serializer):
    stage_mode = serializers.ChoiceField(choices=ClassroomSession.STAGE_MODE_CHOICES, required=False)
    teacher_camera_enabled = serializers.BooleanField(required=False)
    teacher_mic_enabled = serializers.BooleanField(required=False)
    screen_share_enabled = serializers.BooleanField(required=False)
    whiteboard_enabled = serializers.BooleanField(required=False)
    student_chat_enabled = serializers.BooleanField(required=False)
    chat_moderation_mode = serializers.ChoiceField(
        choices=ClassroomSession.CHAT_MODERATION_MODE_CHOICES,
        required=False,
    )
    qa_queue_max_pending = serializers.IntegerField(required=False, min_value=5, max_value=500)
    chat_slow_mode = serializers.BooleanField(required=False)
    student_raise_hand_enabled = serializers.BooleanField(required=False)
    join_approval_enabled = serializers.BooleanField(required=False)
    spotlight_mode = serializers.ChoiceField(choices=ClassroomSession.SPOTLIGHT_MODE_CHOICES, required=False)
    monitored_breakout_room_id = serializers.IntegerField(required=False, allow_null=True)
    breakout_timer_minutes = serializers.IntegerField(required=False, min_value=1, max_value=180)
    extend_breakout_timer_minutes = serializers.IntegerField(required=False, min_value=1, max_value=30)
    clear_breakout_timer = serializers.BooleanField(required=False)
    recording_status = serializers.ChoiceField(choices=ClassroomSession.RECORDING_STATUS_CHOICES, required=False)


class TeacherBreakoutCreateSerializer(serializers.Serializer):
    room_count = serializers.IntegerField(min_value=2, max_value=8, required=False)
    reuse_last_breakouts = serializers.BooleanField(required=False)

    def validate(self, attrs):
        reuse_last_breakouts = attrs.get("reuse_last_breakouts", False)
        if reuse_last_breakouts:
            return attrs
        if attrs.get("room_count") is None:
            raise serializers.ValidationError({"room_count": "This field is required."})
        return attrs


class TeacherBreakoutMutationSerializer(serializers.Serializer):
    student_id = serializers.IntegerField(required=False)
    breakout_room_id = serializers.IntegerField(required=False, allow_null=True)
    room_id = serializers.IntegerField(required=False)
    spokesperson_student_id = serializers.IntegerField(required=False, allow_null=True)

    def validate(self, attrs):
        has_move_payload = "student_id" in attrs
        has_spokesperson_payload = "room_id" in attrs or "spokesperson_student_id" in attrs

        if has_move_payload and has_spokesperson_payload:
            raise serializers.ValidationError("Submit either a breakout move or a spokesperson update, not both.")
        if not has_move_payload and not has_spokesperson_payload:
            raise serializers.ValidationError("No breakout mutation payload was provided.")
        if has_spokesperson_payload and "room_id" not in attrs:
            raise serializers.ValidationError({"room_id": "This field is required for spokesperson updates."})
        return attrs


class TeacherBreakoutBroadcastSerializer(serializers.Serializer):
    message = serializers.CharField(max_length=1000)


class TeacherWhiteboardMutationSerializer(serializers.ModelSerializer):
    class Meta:
        model = WhiteboardState
        fields = ["pages", "active_page"]
