from django.conf import settings
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.tokens import PasswordResetTokenGenerator
from django.core.exceptions import ValidationError
from django.core import signing
from django.shortcuts import redirect
from django.utils import timezone
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from urllib.parse import parse_qs, urlencode, urlparse
from datetime import timedelta
import requests
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken

from apps.users.models import StudentProfile, TeacherProfile
from apps.users.serializers import (
    DemoLoginSerializer,
    DemoUserSerializer,
    PasswordResetConfirmSerializer,
    PasswordResetRequestSerializer,
    RegistrationSerializer,
    YouTubeIntegrationStartSerializer,
    YouTubeIntegrationStatusSerializer,
)
from apps.organizations.services import ensure_teacher_workspace
from apps.users.utils import (
    authenticate_demo_user,
    get_demo_users,
    serialize_user,
)

password_reset_token_generator = PasswordResetTokenGenerator()


def _extract_youtube_video_id(youtube_link: str) -> str:
    if not youtube_link:
        return ""
    try:
        parsed = urlparse(youtube_link.strip())
    except Exception:
        return ""
    host = parsed.hostname or ""
    host = host.replace("www.", "")
    path_parts = [part for part in parsed.path.split("/") if part]
    if host == "youtu.be":
        return path_parts[0] if path_parts else ""
    if host in {"youtube.com", "m.youtube.com"}:
        if parsed.path == "/watch":
            query = parse_qs(parsed.query)
            return (query.get("v") or [""])[0]
        if path_parts and path_parts[0] in {"embed", "live"} and len(path_parts) > 1:
            return path_parts[1]
    return ""


def _refresh_youtube_access_token(profile: TeacherProfile) -> str:
    if not profile.youtube_oauth_refresh_token:
        return ""
    try:
        token_response = requests.post(
            "https://oauth2.googleapis.com/token",
            data={
                "client_id": settings.YOUTUBE_OAUTH_CLIENT_ID,
                "client_secret": settings.YOUTUBE_OAUTH_CLIENT_SECRET,
                "refresh_token": profile.youtube_oauth_refresh_token,
                "grant_type": "refresh_token",
            },
            timeout=15,
        )
    except requests.RequestException:
        return ""
    if token_response.status_code >= 400:
        return ""
    payload = token_response.json()
    next_access_token = payload.get("access_token", "")
    if not next_access_token:
        return ""
    expires_in = int(payload.get("expires_in") or 0)
    profile.youtube_oauth_access_token = next_access_token
    profile.youtube_oauth_token_expires_at = timezone.now() + timedelta(seconds=expires_in) if expires_in else None
    profile.save(update_fields=["youtube_oauth_access_token", "youtube_oauth_token_expires_at"])
    return next_access_token


def _get_valid_youtube_access_token(profile: TeacherProfile) -> str:
    if (
        profile.youtube_oauth_access_token
        and profile.youtube_oauth_token_expires_at
        and profile.youtube_oauth_token_expires_at > timezone.now() + timedelta(seconds=60)
    ):
        return profile.youtube_oauth_access_token
    if profile.youtube_oauth_refresh_token:
        return _refresh_youtube_access_token(profile)
    return profile.youtube_oauth_access_token or ""


def _fetch_youtube_stream_status(profile: TeacherProfile, youtube_link: str) -> dict:
    default_payload = {
        "stream_status": "",
        "stream_title": "",
        "stream_checked_at": timezone.now(),
        "stream_message": "",
    }
    if not youtube_link:
        return {
            **default_payload,
            "stream_status": "no_link",
            "stream_message": "Add a YouTube live/watch link to check stream status.",
        }
    video_id = _extract_youtube_video_id(youtube_link)
    if not video_id:
        return {
            **default_payload,
            "stream_status": "invalid_link",
            "stream_message": "Invalid YouTube link format.",
        }

    access_token = _get_valid_youtube_access_token(profile)
    if not access_token:
        return {
            **default_payload,
            "stream_status": "token_unavailable",
            "stream_message": "Reconnect YouTube to resume live status checks.",
        }
    try:
        response = requests.get(
            "https://www.googleapis.com/youtube/v3/videos",
            params={"part": "snippet,liveStreamingDetails", "id": video_id},
            headers={"Authorization": f"Bearer {access_token}"},
            timeout=15,
        )
    except requests.RequestException:
        return {
            **default_payload,
            "stream_status": "api_error",
            "stream_message": "Could not verify stream state from YouTube API.",
        }
    if response.status_code == 401 and profile.youtube_oauth_refresh_token:
        refreshed = _refresh_youtube_access_token(profile)
        if refreshed:
            response = requests.get(
                "https://www.googleapis.com/youtube/v3/videos",
                params={"part": "snippet,liveStreamingDetails", "id": video_id},
                headers={"Authorization": f"Bearer {refreshed}"},
                timeout=15,
            )
    if response.status_code >= 400:
        return {
            **default_payload,
            "stream_status": "api_error",
            "stream_message": "Could not verify stream state from YouTube API.",
        }
    items = response.json().get("items") or []
    if not items:
        return {
            **default_payload,
            "stream_status": "offline",
            "stream_message": "No active stream found for this video link yet.",
        }
    video_item = items[0]
    snippet = video_item.get("snippet") or {}
    live_details = video_item.get("liveStreamingDetails") or {}
    live_flag = snippet.get("liveBroadcastContent") or "none"
    status = "offline"
    message = "Stream not live yet."
    if live_details.get("actualEndTime"):
        status = "ended"
        message = "Stream has ended."
    elif live_details.get("actualStartTime") or live_flag == "live":
        status = "live"
        message = "Stream is live."
    elif live_details.get("scheduledStartTime") or live_flag == "upcoming":
        status = "scheduled"
        message = "Stream is scheduled but not live yet."

    return {
        **default_payload,
        "stream_status": status,
        "stream_title": snippet.get("title", ""),
        "stream_message": message,
    }


class DemoUsersView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        serializer = DemoUserSerializer(instance=get_demo_users(), many=True)
        return Response(serializer.data)


class DemoLoginView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [AnonRateThrottle]

    def post(self, request):
        serializer = DemoLoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = authenticate_demo_user(
            serializer.validated_data["username"],
            serializer.validated_data["password"],
        )
        if user is None:
            return Response({"message": "Invalid demo credentials."}, status=status.HTTP_401_UNAUTHORIZED)

        refresh = RefreshToken.for_user(user)
        return Response(
            {
                "message": "Login successful.",
                "access": str(refresh.access_token),
                "refresh": str(refresh),
                "user": serialize_user(user),
            }
        )


class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegistrationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = User.objects.create_user(
            username=serializer.validated_data["username"],
            email=serializer.validated_data["email"],
            password=serializer.validated_data["password"],
            first_name=serializer.validated_data["first_name"],
            last_name=serializer.validated_data.get("last_name", ""),
        )

        if serializer.validated_data["role"] == "student":
            StudentProfile.objects.create(
                user=user,
                school_name=serializer.validated_data.get("school_name", ""),
                school_class=serializer.validated_data.get("school_class", ""),
                phone_number=serializer.validated_data.get("phone_number", ""),
            )
        else:
            TeacherProfile.objects.create(
                user=user,
                bio=serializer.validated_data.get("bio", ""),
                expertise=serializer.validated_data.get("expertise", ""),
            )
            ensure_teacher_workspace(user)

        refresh = RefreshToken.for_user(user)
        return Response(
            {
                "message": "Registration successful.",
                "access": str(refresh.access_token),
                "refresh": str(refresh),
                "user": serialize_user(user),
            },
            status=status.HTTP_201_CREATED,
        )


class CurrentDemoUserView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = DemoUserSerializer(instance=serialize_user(request.user))
        return Response(serializer.data)


class DemoLogoutView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        refresh_token = request.data.get("refresh")
        if refresh_token:
            try:
                token = RefreshToken(refresh_token)
                token.blacklist()
            except TokenError:
                pass

        return Response({"message": "Logout successful."}, status=status.HTTP_200_OK)


class PasswordResetRequestView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = User.objects.filter(email__iexact=serializer.validated_data["email"]).first()
        payload = {
            "message": "If an account exists for that email, a reset link has been prepared.",
        }

        if user and settings.DEBUG:
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            token = password_reset_token_generator.make_token(user)
            reset_url = f"http://localhost:3000/reset-password?uid={uid}&token={token}"
            payload["reset_url"] = reset_url
            payload["uid"] = uid
            payload["token"] = token

        return Response(payload, status=status.HTTP_200_OK)


class PasswordResetConfirmView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            user_id = force_str(urlsafe_base64_decode(serializer.validated_data["uid"]))
            user = User.objects.get(pk=user_id)
        except (User.DoesNotExist, ValueError, TypeError, OverflowError):
            return Response({"message": "Invalid reset link."}, status=status.HTTP_400_BAD_REQUEST)

        if not password_reset_token_generator.check_token(user, serializer.validated_data["token"]):
            return Response({"message": "This reset link is invalid or expired."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            validate_password(serializer.validated_data["new_password"], user=user)
        except ValidationError as exc:
            return Response({"message": exc.messages[0]}, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(serializer.validated_data["new_password"])
        user.save(update_fields=["password"])

        return Response({"message": "Password updated successfully."}, status=status.HTTP_200_OK)


class TeacherYouTubeIntegrationView(APIView):
    permission_classes = [IsAuthenticated]

    def _teacher_profile_or_403(self, request):
        profile = getattr(request.user, "teacher_profile", None)
        if profile is None:
            return None, Response({"detail": "Teacher profile required."}, status=status.HTTP_403_FORBIDDEN)
        return profile, None

    def get(self, request):
        profile, error = self._teacher_profile_or_403(request)
        if error is not None:
            return error
        oauth_configured = bool(
            settings.YOUTUBE_OAUTH_CLIENT_ID
            and settings.YOUTUBE_OAUTH_CLIENT_SECRET
            and settings.YOUTUBE_OAUTH_REDIRECT_URI
        )
        payload = {
            "connected": profile.youtube_connected,
            "channel_name": profile.youtube_channel_name,
            "channel_id": profile.youtube_channel_id,
            "connected_at": profile.youtube_connected_at,
            "oauth_configured": oauth_configured,
            "stream_status": "",
            "stream_title": "",
            "stream_checked_at": None,
            "stream_message": "",
        }
        youtube_link = request.query_params.get("youtube_link", "").strip()
        if profile.youtube_connected and oauth_configured:
            payload.update(_fetch_youtube_stream_status(profile, youtube_link))
        serializer = YouTubeIntegrationStatusSerializer(instance=payload)
        return Response(serializer.data)

    def post(self, request):
        profile, error = self._teacher_profile_or_403(request)
        if error is not None:
            return error
        if not (
            settings.YOUTUBE_OAUTH_CLIENT_ID
            and settings.YOUTUBE_OAUTH_CLIENT_SECRET
            and settings.YOUTUBE_OAUTH_REDIRECT_URI
        ):
            return Response(
                {"detail": "YouTube OAuth is not configured on the server."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        state_payload = {
            "teacher_user_id": request.user.id,
            "nonce": str(timezone.now().timestamp()),
        }
        signed_state = signing.dumps(state_payload, salt="youtube-oauth-state")
        auth_params = {
            "client_id": settings.YOUTUBE_OAUTH_CLIENT_ID,
            "redirect_uri": settings.YOUTUBE_OAUTH_REDIRECT_URI,
            "response_type": "code",
            "scope": "https://www.googleapis.com/auth/youtube.readonly",
            "access_type": "offline",
            "include_granted_scopes": "true",
            "prompt": "consent",
            "state": signed_state,
        }
        auth_url = f"https://accounts.google.com/o/oauth2/v2/auth?{urlencode(auth_params)}"
        serializer = YouTubeIntegrationStartSerializer(instance={"auth_url": auth_url})
        return Response(serializer.data, status=status.HTTP_200_OK)

    def delete(self, request):
        profile, error = self._teacher_profile_or_403(request)
        if error is not None:
            return error

        profile.youtube_connected = False
        profile.youtube_channel_name = ""
        profile.youtube_channel_id = ""
        profile.youtube_oauth_access_token = ""
        profile.youtube_oauth_refresh_token = ""
        profile.youtube_oauth_token_expires_at = None
        profile.youtube_connected_at = None
        profile.save(
            update_fields=[
                "youtube_connected",
                "youtube_channel_name",
                "youtube_channel_id",
                "youtube_oauth_access_token",
                "youtube_oauth_refresh_token",
                "youtube_oauth_token_expires_at",
                "youtube_connected_at",
            ]
        )
        return Response(status=status.HTTP_204_NO_CONTENT)


class TeacherYouTubeOAuthCallbackView(APIView):
    permission_classes = []
    authentication_classes = []

    def get(self, request):
        frontend_teacher_url = settings.FRONTEND_TEACHER_REDIRECT_URL
        if not (
            settings.YOUTUBE_OAUTH_CLIENT_ID
            and settings.YOUTUBE_OAUTH_CLIENT_SECRET
            and settings.YOUTUBE_OAUTH_REDIRECT_URI
        ):
            return redirect(f"{frontend_teacher_url}?youtube_oauth=not_configured")
        error_value = request.query_params.get("error")
        if error_value:
            return redirect(f"{frontend_teacher_url}?youtube_oauth=denied")

        code = request.query_params.get("code")
        signed_state = request.query_params.get("state")
        if not code or not signed_state:
            return redirect(f"{frontend_teacher_url}?youtube_oauth=missing_code")

        try:
            state_payload = signing.loads(signed_state, max_age=900, salt="youtube-oauth-state")
            teacher_user_id = int(state_payload["teacher_user_id"])
        except Exception:
            return redirect(f"{frontend_teacher_url}?youtube_oauth=invalid_state")

        try:
            teacher = User.objects.get(pk=teacher_user_id)
            profile = teacher.teacher_profile
        except (User.DoesNotExist, AttributeError):
            return redirect(f"{frontend_teacher_url}?youtube_oauth=teacher_not_found")

        try:
            token_response = requests.post(
                "https://oauth2.googleapis.com/token",
                data={
                    "code": code,
                    "client_id": settings.YOUTUBE_OAUTH_CLIENT_ID,
                    "client_secret": settings.YOUTUBE_OAUTH_CLIENT_SECRET,
                    "redirect_uri": settings.YOUTUBE_OAUTH_REDIRECT_URI,
                    "grant_type": "authorization_code",
                },
                timeout=15,
            )
        except requests.RequestException:
            return redirect(f"{frontend_teacher_url}?youtube_oauth=token_exchange_failed")
        if token_response.status_code >= 400:
            return redirect(f"{frontend_teacher_url}?youtube_oauth=token_exchange_failed")

        token_payload = token_response.json()
        access_token = token_payload.get("access_token", "")
        refresh_token = token_payload.get("refresh_token") or profile.youtube_oauth_refresh_token
        expires_in = int(token_payload.get("expires_in") or 0)
        token_expires_at = timezone.now() + timedelta(seconds=expires_in) if expires_in else None

        channel_name = ""
        channel_id = ""
        if access_token:
            try:
                channel_response = requests.get(
                    "https://www.googleapis.com/youtube/v3/channels",
                    params={"part": "snippet", "mine": "true"},
                    headers={"Authorization": f"Bearer {access_token}"},
                    timeout=15,
                )
                if channel_response.status_code < 400:
                    items = channel_response.json().get("items") or []
                    if items:
                        channel = items[0]
                        channel_id = channel.get("id", "")
                        channel_name = ((channel.get("snippet") or {}).get("title")) or ""
            except requests.RequestException:
                pass

        profile.youtube_connected = bool(access_token)
        profile.youtube_channel_name = channel_name
        profile.youtube_channel_id = channel_id
        profile.youtube_oauth_access_token = access_token
        profile.youtube_oauth_refresh_token = refresh_token or ""
        profile.youtube_oauth_token_expires_at = token_expires_at
        profile.youtube_connected_at = timezone.now() if access_token else None
        profile.save(
            update_fields=[
                "youtube_connected",
                "youtube_channel_name",
                "youtube_channel_id",
                "youtube_oauth_access_token",
                "youtube_oauth_refresh_token",
                "youtube_oauth_token_expires_at",
                "youtube_connected_at",
            ]
        )

        return redirect(f"{frontend_teacher_url}?youtube_oauth=connected")
