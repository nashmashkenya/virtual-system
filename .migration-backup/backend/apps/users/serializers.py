import re

from rest_framework import serializers
from django.contrib.auth.models import User


class DemoLoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField()


class OrganizationSummarySerializer(serializers.Serializer):
    id = serializers.IntegerField()
    name = serializers.CharField()
    slug = serializers.CharField()
    role = serializers.CharField()


class DemoUserSerializer(serializers.Serializer):
    username = serializers.CharField()
    full_name = serializers.CharField()
    email = serializers.EmailField(allow_blank=True)
    role = serializers.CharField()
    organizations = OrganizationSummarySerializer(many=True, required=False)


class RegistrationSerializer(serializers.Serializer):
    ROLE_CHOICES = (
        ("student", "Student"),
        ("teacher", "Teacher"),
    )

    first_name = serializers.CharField(max_length=150)
    last_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    username = serializers.CharField(max_length=150)
    email = serializers.EmailField(required=False, allow_blank=True, default="")
    password = serializers.CharField(write_only=True, required=False, allow_blank=True)
    role = serializers.ChoiceField(choices=ROLE_CHOICES)
    school_name = serializers.CharField(max_length=255, required=False, allow_blank=True)
    school_class = serializers.CharField(max_length=32, required=False, allow_blank=True)
    phone_number = serializers.CharField(max_length=32, required=False, allow_blank=True)
    bio = serializers.CharField(required=False, allow_blank=True)
    expertise = serializers.CharField(max_length=255, required=False, allow_blank=True)

    def validate_username(self, value):
        if User.objects.filter(username__iexact=value).exists():
            raise serializers.ValidationError("That username is already taken.")
        return value

    def validate_email(self, value):
        if not (value and str(value).strip()):
            return ""
        v = str(value).strip()
        if User.objects.filter(email__iexact=v).exists():
            raise serializers.ValidationError("That email is already registered.")
        return v

    def validate(self, attrs):
        role = attrs.get("role")
        if role == "student":
            required = [
                ("first_name", "First name is required."),
                ("last_name", "Last name is required."),
                ("username", "School admission number (username) is required."),
                ("phone_number", "Phone number is required."),
            ]
            for field, message in required:
                if not str(attrs.get(field, "")).strip():
                    raise serializers.ValidationError({field: message})
            if not str(attrs.get("school_class", "")).strip():
                raise serializers.ValidationError(
                    {"school_class": "School class is required (e.g. 4A, 4B)."}
                )
            phone = str(attrs.get("phone_number", ""))
            digits = "".join(c for c in phone if c.isdigit())
            if len(digits) < 7:
                raise serializers.ValidationError(
                    {
                        "phone_number": "Use a phone number with at least 7 digits. Your password is the first 7 digits."
                    }
                )
            attrs["password"] = digits[:7]
            uname = str(attrs["username"]).strip()
            safe_local = re.sub(r"[^a-zA-Z0-9._+-]", "_", uname)[:100] or "student"
            synthetic = f"{safe_local}@student.noreg"
            if User.objects.filter(email__iexact=synthetic).exists():
                raise serializers.ValidationError(
                    {"username": "An account with this admission number already exists."}
                )
            attrs["email"] = synthetic
        else:
            email = str(attrs.get("email", "")).strip()
            if not email:
                raise serializers.ValidationError({"email": "Email is required for teachers."})
            attrs["email"] = email
            password = attrs.get("password") or ""
            if len(password) < 8:
                raise serializers.ValidationError(
                    {"password": "Password must be at least 8 characters."}
                )
        return attrs


class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()


class PasswordResetConfirmSerializer(serializers.Serializer):
    uid = serializers.CharField()
    token = serializers.CharField()
    new_password = serializers.CharField(write_only=True, min_length=8)


class YouTubeIntegrationStatusSerializer(serializers.Serializer):
    connected = serializers.BooleanField()
    channel_name = serializers.CharField(allow_blank=True)
    channel_id = serializers.CharField(allow_blank=True)
    connected_at = serializers.DateTimeField(allow_null=True)
    oauth_configured = serializers.BooleanField()
    stream_status = serializers.CharField(allow_blank=True)
    stream_title = serializers.CharField(allow_blank=True)
    stream_checked_at = serializers.DateTimeField(allow_null=True)
    stream_message = serializers.CharField(allow_blank=True)


class YouTubeIntegrationStartSerializer(serializers.Serializer):
    auth_url = serializers.URLField()
