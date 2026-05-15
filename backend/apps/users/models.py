from django.contrib.auth.models import User
from django.db import models


class StudentProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="student_profile")
    school_name = models.CharField(max_length=255, blank=True)
    school_class = models.CharField(
        max_length=32,
        blank=True,
        help_text="e.g. 4A, 4B",
    )
    phone_number = models.CharField(max_length=32, blank=True)

    def __str__(self) -> str:
        return self.user.get_username()


class TeacherProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="teacher_profile")
    bio = models.TextField(blank=True)
    expertise = models.CharField(max_length=255, blank=True)
    youtube_connected = models.BooleanField(default=False)
    youtube_channel_name = models.CharField(max_length=255, blank=True)
    youtube_channel_id = models.CharField(max_length=128, blank=True)
    youtube_oauth_access_token = models.TextField(blank=True)
    youtube_oauth_refresh_token = models.TextField(blank=True)
    youtube_oauth_token_expires_at = models.DateTimeField(null=True, blank=True)
    youtube_connected_at = models.DateTimeField(null=True, blank=True)

    def __str__(self) -> str:
        return self.user.get_username()
