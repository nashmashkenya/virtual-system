from django.contrib.auth.models import User
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.organizations.models import OrganizationMembership


class OrganizationMembersView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, organization_id):
        membership = OrganizationMembership.objects.filter(
            user=request.user,
            organization_id=organization_id,
        ).first()
        if not membership or membership.role not in ("admin", "teacher"):
            return Response({"message": "Forbidden."}, status=status.HTTP_403_FORBIDDEN)

        rows = (
            OrganizationMembership.objects.filter(organization_id=organization_id)
            .select_related("user")
            .order_by("role", "user__username")
        )
        payload = [
            {
                "user_id": row.user_id,
                "username": row.user.username,
                "full_name": row.user.get_full_name() or row.user.username,
                "email": row.user.email,
                "role": row.role,
            }
            for row in rows
        ]
        return Response(payload)

    def post(self, request, organization_id):
        membership = OrganizationMembership.objects.filter(
            user=request.user,
            organization_id=organization_id,
        ).first()
        if not membership or membership.role not in ("admin", "teacher"):
            return Response({"message": "Forbidden."}, status=status.HTTP_403_FORBIDDEN)

        username = (request.data.get("username") or "").strip()
        role = (request.data.get("role") or "student").strip()
        if not username:
            return Response({"message": "Username is required."}, status=status.HTTP_400_BAD_REQUEST)
        if role not in ("student", "teacher", "admin"):
            return Response({"message": "Invalid role."}, status=status.HTTP_400_BAD_REQUEST)
        if membership.role == "teacher" and role != "student":
            return Response(
                {"message": "Teachers can only add students to an organization."},
                status=status.HTTP_403_FORBIDDEN,
            )
        if membership.role != "admin" and role in ("teacher", "admin"):
            return Response(
                {"message": "Only organization admins can assign teacher or admin roles."},
                status=status.HTTP_403_FORBIDDEN,
            )

        target = User.objects.filter(username__iexact=username).first()
        if target is None:
            return Response({"message": "User not found."}, status=status.HTTP_404_NOT_FOUND)

        OrganizationMembership.objects.update_or_create(
            organization_id=organization_id,
            user=target,
            defaults={"role": role},
        )
        return Response({"message": "Member saved."}, status=status.HTTP_201_CREATED)


class OrganizationMemberDetailView(APIView):
    """Remove a user from an organization (admin: any role; teacher: students only)."""

    permission_classes = [IsAuthenticated]

    def delete(self, request, organization_id, user_id):
        membership = OrganizationMembership.objects.filter(
            user=request.user,
            organization_id=organization_id,
        ).first()
        if not membership or membership.role not in ("admin", "teacher"):
            return Response({"message": "Forbidden."}, status=status.HTTP_403_FORBIDDEN)

        target = OrganizationMembership.objects.filter(
            organization_id=organization_id,
            user_id=user_id,
        ).first()
        if target is None:
            return Response({"message": "Member not found."}, status=status.HTTP_404_NOT_FOUND)

        if membership.role == "teacher" and target.role != "student":
            return Response(
                {"message": "Teachers can only remove students."},
                status=status.HTTP_403_FORBIDDEN,
            )
        if target.user_id == request.user.id:
            return Response(
                {"message": "You cannot remove yourself this way."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        target.delete()
        return Response({"message": "Member removed."}, status=status.HTTP_200_OK)
