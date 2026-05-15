from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ("classrooms", "0003_quiz_is_active"),
    ]

    operations = [
        migrations.CreateModel(
            name="PollVote",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("poll", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="votes", to="classrooms.poll")),
                ("selected_option", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="votes", to="classrooms.polloption")),
                ("student", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="poll_votes", to="auth.user")),
            ],
            options={
                "unique_together": {("poll", "student")},
            },
        ),
        migrations.CreateModel(
            name="QuizSubmission",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("quiz", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="submissions", to="classrooms.quiz")),
                ("selected_choice", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="submissions", to="classrooms.quizchoice")),
                ("student", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="quiz_submissions", to="auth.user")),
            ],
            options={
                "unique_together": {("quiz", "student")},
            },
        ),
    ]
