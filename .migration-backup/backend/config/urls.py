from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.http import JsonResponse
from django.urls import path

from config.monitoring import HealthDetailedView, OpsMetricsView
from rest_framework_simplejwt.views import TokenRefreshView
from apps.classrooms.views import (
    CreateSessionView,
    StudentChatMessageView,
    StudentDashboardView,
    StudentEnrollByCodeView,
    StudentJoinRequestView,
    StudentPollVoteView,
    StudentRaiseHandView,
    StudentQuizSubmissionView,
    TeacherDashboardView,
    TeacherStudentDirectoryView,
    TeacherSessionAttendanceView,
    TeacherSessionBreakoutView,
    TeacherSessionChatMessageView,
    TeacherSessionChatModerationView,
    TeacherSessionDetailView,
    TeacherSessionEnrollmentExportView,
    TeacherSessionEnrollmentView,
    TeacherSessionJoinRequestView,
    TeacherSessionPollView,
    TeacherProgramListCreateView,
    TeacherSessionQaQueueBulkView,
    TeacherSessionQuizView,
    TeacherSessionRaiseHandView,
    TeacherSessionResourceDetailView,
    TeacherSessionResourcesView,
    TeacherSessionRoomStateView,
    TeacherSessionWhiteboardView,
)
from apps.organizations.views import OrganizationMemberDetailView, OrganizationMembersView
from apps.payments.views import PaymentSummaryView, SimulatePaymentView
from apps.users.views import (
    CurrentDemoUserView,
    DemoLoginView,
    DemoLogoutView,
    DemoUsersView,
    PasswordResetConfirmView,
    PasswordResetRequestView,
    RegisterView,
    TeacherYouTubeOAuthCallbackView,
    TeacherYouTubeIntegrationView,
)


def healthcheck(_request):
    return JsonResponse({"status": "ok", "service": "elimuapwa-classroom-api"})


urlpatterns = [
    path("admin/", admin.site.urls),
    path("health/", healthcheck, name="healthcheck"),
    path("health/detailed/", HealthDetailedView.as_view(), name="health-detailed"),
    path("api/ops/metrics/", OpsMetricsView.as_view(), name="ops-metrics"),
    path("api/student/dashboard/", StudentDashboardView.as_view(), name="student-dashboard"),
    path("api/student/enroll/", StudentEnrollByCodeView.as_view(), name="student-enroll-by-code"),
    path("api/student/chat-message/", StudentChatMessageView.as_view(), name="student-chat-message"),
    path("api/student/join-request/", StudentJoinRequestView.as_view(), name="student-join-request"),
    path("api/student/poll-vote/", StudentPollVoteView.as_view(), name="student-poll-vote"),
    path("api/student/quiz-submit/", StudentQuizSubmissionView.as_view(), name="student-quiz-submit"),
    path("api/student/raise-hand/", StudentRaiseHandView.as_view(), name="student-raise-hand"),
    path("api/teacher/dashboard/", TeacherDashboardView.as_view(), name="teacher-dashboard"),
    path("api/teacher/programs/", TeacherProgramListCreateView.as_view(), name="teacher-programs"),
    path("api/teacher/sessions/", CreateSessionView.as_view(), name="teacher-create-session"),
    path("api/teacher/sessions/<int:session_id>/", TeacherSessionDetailView.as_view(), name="teacher-session-detail"),
    path("api/teacher/sessions/<int:session_id>/enrollments/", TeacherSessionEnrollmentView.as_view(), name="teacher-session-enrollments"),
    path(
        "api/teacher/sessions/<int:session_id>/enrollments/export/",
        TeacherSessionEnrollmentExportView.as_view(),
        name="teacher-session-enrollments-export",
    ),
    path("api/teacher/sessions/<int:session_id>/breakouts/", TeacherSessionBreakoutView.as_view(), name="teacher-session-breakouts"),
    path("api/teacher/sessions/<int:session_id>/join-requests/", TeacherSessionJoinRequestView.as_view(), name="teacher-session-join-requests"),
    path("api/teacher/sessions/<int:session_id>/attendance/", TeacherSessionAttendanceView.as_view(), name="teacher-session-attendance"),
    path("api/teacher/sessions/<int:session_id>/chat-message/", TeacherSessionChatMessageView.as_view(), name="teacher-session-chat-message"),
    path("api/teacher/sessions/<int:session_id>/chat-moderation/", TeacherSessionChatModerationView.as_view(), name="teacher-session-chat-moderation"),
    path(
        "api/teacher/sessions/<int:session_id>/qa-queue/bulk/",
        TeacherSessionQaQueueBulkView.as_view(),
        name="teacher-session-qa-queue-bulk",
    ),
    path("api/teacher/sessions/<int:session_id>/polls/", TeacherSessionPollView.as_view(), name="teacher-session-polls"),
    path("api/teacher/sessions/<int:session_id>/quizzes/", TeacherSessionQuizView.as_view(), name="teacher-session-quizzes"),
    path("api/teacher/sessions/<int:session_id>/raise-hands/", TeacherSessionRaiseHandView.as_view(), name="teacher-session-raise-hands"),
    path("api/teacher/sessions/<int:session_id>/room-state/", TeacherSessionRoomStateView.as_view(), name="teacher-session-room-state"),
    path("api/teacher/sessions/<int:session_id>/whiteboard/", TeacherSessionWhiteboardView.as_view(), name="teacher-session-whiteboard"),
    path(
        "api/teacher/sessions/<int:session_id>/resources/",
        TeacherSessionResourcesView.as_view(),
        name="teacher-session-resources",
    ),
    path(
        "api/teacher/sessions/<int:session_id>/resources/<int:resource_id>/",
        TeacherSessionResourceDetailView.as_view(),
        name="teacher-session-resource-detail",
    ),
    path("api/teacher/students/", TeacherStudentDirectoryView.as_view(), name="teacher-students"),
    path(
        "api/teacher/integrations/youtube/",
        TeacherYouTubeIntegrationView.as_view(),
        name="teacher-youtube-integration",
    ),
    path(
        "api/teacher/integrations/youtube/oauth/callback/",
        TeacherYouTubeOAuthCallbackView.as_view(),
        name="teacher-youtube-oauth-callback",
    ),
    path(
        "api/organizations/<int:organization_id>/members/",
        OrganizationMembersView.as_view(),
        name="organization-members",
    ),
    path(
        "api/organizations/<int:organization_id>/members/<int:user_id>/",
        OrganizationMemberDetailView.as_view(),
        name="organization-member-detail",
    ),
    path("api/payments/summary/", PaymentSummaryView.as_view(), name="payment-summary"),
    path("api/payments/simulate/", SimulatePaymentView.as_view(), name="payment-simulate"),
    path("api/auth/demo-users/", DemoUsersView.as_view(), name="demo-users"),
    path("api/auth/login/", DemoLoginView.as_view(), name="demo-login"),
    path("api/auth/register/", RegisterView.as_view(), name="auth-register"),
    path("api/auth/refresh/", TokenRefreshView.as_view(), name="token-refresh"),
    path("api/auth/logout/", DemoLogoutView.as_view(), name="demo-logout"),
    path("api/auth/me/", CurrentDemoUserView.as_view(), name="demo-me"),
    path("api/auth/password-reset/request/", PasswordResetRequestView.as_view(), name="password-reset-request"),
    path("api/auth/password-reset/confirm/", PasswordResetConfirmView.as_view(), name="password-reset-confirm"),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
