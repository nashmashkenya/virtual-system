from decimal import Decimal

from django.db import OperationalError
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.classrooms.models import ClassroomSession
from apps.classrooms.realtime import broadcast_classroom_snapshots
from apps.payments.models import Payment
from apps.payments.serializers import PaymentSummarySerializer, SimulatePaymentSerializer
from apps.users.permissions import IsStudentUser


PAYMENT_SUMMARY = {
    "course_name": "Data Analytics Bootcamp",
    "plan": "Monthly live access",
    "price": "KSh 3,500",
    "status": "awaiting_payment",
    "cta": "Pay with M-Pesa",
}


class PaymentSummaryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            user = request.user
            session = None
            if hasattr(user, "student_profile"):
                enrollment = user.enrollments.select_related("session").order_by(
                    "session__starts_at",
                    "session__created_at",
                ).first()
                session = enrollment.session if enrollment else None
            elif hasattr(user, "teacher_profile"):
                session = user.teaching_sessions.order_by("starts_at", "created_at").first()
            payload = (
                {
                    "course_name": session.title,
                    "plan": "Monthly live access",
                    "price": f"KSh {int(session.price_amount):,}",
                    "status": (
                        "paid"
                        if hasattr(user, "student_profile")
                        and session.payments.filter(student=user, status="success").exists()
                        else "revenue_live"
                        if hasattr(user, "teacher_profile") and session.payments.filter(status="success").exists()
                        else "awaiting_payment"
                    ),
                    "cta": "Pay with M-Pesa",
                }
                if session
                else PAYMENT_SUMMARY
            )
        except OperationalError:
            payload = PAYMENT_SUMMARY

        serializer = PaymentSummarySerializer(payload)
        return Response(serializer.data)


class SimulatePaymentView(APIView):
    permission_classes = [IsAuthenticated, IsStudentUser]

    def post(self, request):
        serializer = SimulatePaymentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        transaction_reference = "MPESA-DEMO-2026"

        try:
            student = request.user
            enrollment = student.enrollments.select_related("session").order_by(
                "session__starts_at",
                "session__created_at",
            ).first()
            session = enrollment.session if enrollment else ClassroomSession.objects.order_by("starts_at", "created_at").first()

            if session and student:
                payment, created = Payment.objects.get_or_create(
                    student=student,
                    session=session,
                    defaults={
                        "provider": "mpesa",
                        "phone_number": serializer.validated_data["phone_number"],
                        "amount": session.price_amount or Decimal("3500.00"),
                        "status": "success",
                        "transaction_reference": transaction_reference,
                    },
                )
                if not created:
                    payment.phone_number = serializer.validated_data["phone_number"]
                    payment.status = "success"
                    payment.transaction_reference = transaction_reference
                    payment.amount = payment.amount or Decimal("3500.00")
                    payment.save(update_fields=["phone_number", "status", "transaction_reference", "amount"])
                broadcast_classroom_snapshots(session)
        except OperationalError:
            pass

        return Response(
            {
                "message": "Payment successful.",
                "status": "success",
                "transaction_reference": transaction_reference,
                "phone_number": serializer.validated_data["phone_number"],
                "course_name": serializer.validated_data.get("course_name", "Data Analytics Bootcamp"),
            },
            status=status.HTTP_200_OK,
        )
