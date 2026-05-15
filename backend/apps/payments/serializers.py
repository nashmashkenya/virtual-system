from rest_framework import serializers


class PaymentSummarySerializer(serializers.Serializer):
    course_name = serializers.CharField()
    plan = serializers.CharField()
    price = serializers.CharField()
    status = serializers.CharField()
    cta = serializers.CharField()


class SimulatePaymentSerializer(serializers.Serializer):
    phone_number = serializers.CharField(max_length=32)
    course_name = serializers.CharField(max_length=255, required=False)
