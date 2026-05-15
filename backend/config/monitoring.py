"""Health checks and ops metrics (JSON) for production monitoring."""

import os
import time

from django.conf import settings
from django.db import connection
from django.core.cache import cache
from django.http import JsonResponse
from django.views import View


def _redis_ping():
    url = getattr(settings, "REDIS_URL", None) or os.getenv("REDIS_URL")
    if not url:
        return True, "no_redis_url"
    try:
        import redis

        client = redis.Redis.from_url(url, socket_connect_timeout=1.0, socket_timeout=1.0)
        ok = client.ping()
        return bool(ok), "ping"
    except Exception as exc:
        return False, str(exc)


class HealthDetailedView(View):
    """Deep health: database + cache + Redis connectivity (no secrets)."""

    def get(self, request):
        checks = {}

        db_ms = None
        try:
            t0 = time.perf_counter()
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
                cursor.fetchone()
            db_ms = round((time.perf_counter() - t0) * 1000, 2)
            checks["database"] = {"ok": True, "latency_ms": db_ms}
        except Exception as exc:
            checks["database"] = {"ok": False, "error": str(exc)}

        cache_ok = False
        cache_err = None
        try:
            cache.set("health_check_key", "1", 2)
            cache_ok = cache.get("health_check_key") == "1"
        except Exception as exc:
            cache_err = str(exc)
        checks["django_cache"] = {"ok": cache_ok, **({"error": cache_err} if cache_err else {})}

        url = getattr(settings, "REDIS_URL", None) or os.getenv("REDIS_URL")
        if not url:
            checks["redis_tcp"] = {"ok": True, "detail": "skipped_no_redis_url"}
            r_ok = True
        else:
            r_ok, r_detail = _redis_ping()
            checks["redis_tcp"] = {"ok": r_ok, "detail": r_detail}

        overall = checks["database"].get("ok") and cache_ok and r_ok
        return JsonResponse(
            {
                "status": "ok" if overall else "degraded",
                "service": "elimuapwa-classroom-api",
                "checks": checks,
            },
            status=200 if overall else 503,
        )


class OpsMetricsView(View):
    """Aggregated counters for ops dashboards. Protect with OPS_METRICS_KEY."""

    def get(self, request):
        expected = getattr(settings, "OPS_METRICS_KEY", "") or ""
        if not expected:
            return JsonResponse({"detail": "Metrics endpoint disabled (set OPS_METRICS_KEY)."}, status=501)

        provided = request.headers.get("X-Ops-Key", "") or ""
        if not provided and getattr(settings, "OPS_METRICS_ALLOW_QUERY_KEY", False):
            provided = request.GET.get("key", "")
        if provided != expected:
            return JsonResponse({"detail": "Unauthorized."}, status=401)

        from django.utils import timezone as dj_tz
        from apps.classrooms.models import ChatMessage, ClassroomSession, JoinRequest, RaiseHandRequest

        now = dj_tz.now()
        pending_qa = ChatMessage.objects.filter(
            qa_status="pending",
            role="student",
            breakout_room__isnull=True,
        ).count()
        open_hands = RaiseHandRequest.objects.filter(status="open").count()
        waiting_room_requests = JoinRequest.objects.filter(status="pending").count()
        sessions_total = ClassroomSession.objects.count()
        sessions_started = ClassroomSession.objects.filter(starts_at__lte=now).count()

        r_ok, r_detail = _redis_ping()
        db_ok = False
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
            db_ok = True
        except Exception:
            pass

        payload = {
            "generated_at": dj_tz.now().isoformat(),
            "sessions_total": sessions_total,
            "sessions_started_or_live": sessions_started,
            "pending_qa_messages": pending_qa,
            "pending_qa_count": pending_qa,
            "open_raise_hands": open_hands,
            "open_raise_hand_count": open_hands,
            "active_session_count": sessions_started,
            "waiting_room_request_count": waiting_room_requests,
            "database_ok": db_ok,
            "redis_ok": r_ok,
            "redis_detail": r_detail,
        }
        return JsonResponse(payload)
