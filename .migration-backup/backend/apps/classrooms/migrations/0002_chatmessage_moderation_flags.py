from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("classrooms", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="chatmessage",
            name="is_hidden",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="chatmessage",
            name="is_pinned",
            field=models.BooleanField(default=False),
        ),
    ]
