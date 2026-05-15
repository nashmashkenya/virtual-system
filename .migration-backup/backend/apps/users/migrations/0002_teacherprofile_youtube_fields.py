from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("users", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="teacherprofile",
            name="youtube_connected",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="teacherprofile",
            name="youtube_channel_name",
            field=models.CharField(blank=True, max_length=255),
        ),
        migrations.AddField(
            model_name="teacherprofile",
            name="youtube_connected_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
