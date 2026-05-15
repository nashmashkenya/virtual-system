from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("users", "0002_teacherprofile_youtube_fields"),
    ]

    operations = [
        migrations.AddField(
            model_name="teacherprofile",
            name="youtube_channel_id",
            field=models.CharField(blank=True, max_length=128),
        ),
        migrations.AddField(
            model_name="teacherprofile",
            name="youtube_oauth_access_token",
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name="teacherprofile",
            name="youtube_oauth_refresh_token",
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name="teacherprofile",
            name="youtube_oauth_token_expires_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
