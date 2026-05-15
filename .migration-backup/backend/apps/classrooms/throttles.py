"""DRF throttles for high-volume classroom write endpoints."""

from django.conf import settings
from django.core.exceptions import ImproperlyConfigured
from rest_framework.throttling import ScopedRateThrottle


class StudentWriteScopedThrottle(ScopedRateThrottle):
    """Per-view `throttle_scope` with rates from `REST_FRAMEWORK['DEFAULT_THROTTLE_RATES']`."""

    def get_rate(self):
        # DRF's SimpleRateThrottle caches DEFAULT_THROTTLE_RATES on the class at import time;
        # read live Django settings so tests can override rates and deploys pick up changes.
        rates = settings.REST_FRAMEWORK.get("DEFAULT_THROTTLE_RATES") or {}
        try:
            return rates[self.scope]
        except KeyError as exc:
            raise ImproperlyConfigured(
                f"No default throttle rate set for {self.scope!r} scope"
            ) from exc
