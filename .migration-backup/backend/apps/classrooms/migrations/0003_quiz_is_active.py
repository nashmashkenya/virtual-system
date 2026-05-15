from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("classrooms", "0002_chatmessage_moderation_flags"),
    ]

    operations = [
        migrations.AddField(
            model_name="quiz",
            name="is_active",
            field=models.BooleanField(default=False),
        ),
    ]
