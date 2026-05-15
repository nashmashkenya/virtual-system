from django.contrib.auth.models import User
from django.db import models

from apps.classrooms.models import ClassroomSession


class Payment(models.Model):
    STATUS_CHOICES = (
        ("pending", "Pending"),
        ("success", "Success"),
        ("failed", "Failed"),
    )

    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name="payments")
    session = models.ForeignKey(ClassroomSession, on_delete=models.CASCADE, related_name="payments")
    provider = models.CharField(max_length=64, default="mpesa")
    phone_number = models.CharField(max_length=32)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=24, choices=STATUS_CHOICES, default="pending")
    transaction_reference = models.CharField(max_length=128, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self) -> str:
        return f"{self.student_id}:{self.session_id}:{self.status}"
