import os
from pathlib import Path
from datetime import timedelta
from urllib.parse import urlparse, urlunparse

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = os.getenv(
    "SECRET_KEY",
    "django-insecure-edustream-classroom-local-dev-secret-key-2026",
)
DEBUG = os.getenv("DEBUG", "True").lower() == "true"
ALLOWED_HOSTS = [host.strip() for host in os.getenv("ALLOWED_HOSTS", "*").split(",") if host.strip()]

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "corsheaders",
    "rest_framework",
    "rest_framework_simplejwt.token_blacklist",
    "channels",
    "apps.users",
    "apps.organizations",
    "apps.classrooms",
    "apps.payments",
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"

if os.getenv("POSTGRES_HOST"):
    # Production: place PgBouncer (or similar) in front of Postgres and point HOST/PORT at the pooler
    # for high concurrency (e.g. holiday peaks). Django keeps using the same NAME/USER/PASSWORD.
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.postgresql",
            "NAME": os.getenv("POSTGRES_DB", "edustream"),
            "USER": os.getenv("POSTGRES_USER", "edustream"),
            "PASSWORD": os.getenv("POSTGRES_PASSWORD", "edustream"),
            "HOST": os.getenv("POSTGRES_HOST"),
            "PORT": os.getenv("POSTGRES_PORT", "5432"),
            "CONN_MAX_AGE": int(os.getenv("POSTGRES_CONN_MAX_AGE", "60")),
        }
    }
else:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": BASE_DIR / "db.sqlite3",
        }
    }


def _redis_url_with_database(url: str, db: int) -> str:
    """Point the same Redis server at a specific logical DB (0–15) for isolation."""
    parsed = urlparse(url.strip())
    return urlunparse(parsed._replace(path=f"/{db}"))


# Redis: use separate DB indexes so Django cache and Channels do not share keyspace.
# Production examples (same host, different DB):
#   REDIS_URL=redis://:password@redis.internal:6379/0   # implied: cache on 0, channels on 1
# Optional overrides (full URLs including DB index):
#   REDIS_CACHE_URL=redis://:password@redis.internal:6379/0
#   CHANNEL_REDIS_URL=redis://:password@redis.internal:6379/1
CHANNEL_LAYER_BACKEND = os.getenv("CHANNEL_LAYER_BACKEND", "auto").lower()
REDIS_URL = os.getenv("REDIS_URL")
PRODUCTION_REDIS_REQUIRED = not DEBUG

if PRODUCTION_REDIS_REQUIRED and not REDIS_URL:
    raise RuntimeError("REDIS_URL is required when DEBUG is false.")

_redis_cache_location = None
_redis_channels_hosts = None
if REDIS_URL:
    _redis_cache_location = os.getenv("REDIS_CACHE_URL") or _redis_url_with_database(REDIS_URL, 0)
    _redis_channels_hosts = [os.getenv("CHANNEL_REDIS_URL") or _redis_url_with_database(REDIS_URL, 1)]
else:
    _redis_channels_hosts = ["redis://127.0.0.1:6379/1"]

if CHANNEL_LAYER_BACKEND == "inmemory":
    if PRODUCTION_REDIS_REQUIRED:
        raise RuntimeError("In-memory channel layers are not allowed when DEBUG is false.")
    CHANNEL_LAYERS = {
        "default": {
            "BACKEND": "channels.layers.InMemoryChannelLayer",
        }
    }
elif CHANNEL_LAYER_BACKEND == "auto" and DEBUG and not REDIS_URL:
    # Local dev without Docker: avoid requiring Redis on 127.0.0.1:6379 for Channels.
    # Set REDIS_URL (or CHANNEL_LAYER_BACKEND=redis) to use Redis when it is available.
    CHANNEL_LAYERS = {
        "default": {
            "BACKEND": "channels.layers.InMemoryChannelLayer",
        }
    }
else:
    CHANNEL_LAYERS = {
        "default": {
            "BACKEND": "channels_redis.core.RedisChannelLayer",
            "CONFIG": {
                "hosts": _redis_channels_hosts,
            },
        }
    }

# Shared cache for DRF throttles and app code (use Redis in production / multi-worker).
if _redis_cache_location:
    CACHES = {
        "default": {
            "BACKEND": "django.core.cache.backends.redis.RedisCache",
            "LOCATION": _redis_cache_location,
            "KEY_PREFIX": "edustream",
            "TIMEOUT": 300,
        }
    }
else:
    CACHES = {
        "default": {
            "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
            "LOCATION": "edustream-local",
        }
    }

OPS_METRICS_KEY = os.getenv("OPS_METRICS_KEY", "")
OPS_METRICS_ALLOW_QUERY_KEY = os.getenv("OPS_METRICS_ALLOW_QUERY_KEY", "").lower() == "true"
YOUTUBE_OAUTH_CLIENT_ID = os.getenv("YOUTUBE_OAUTH_CLIENT_ID", "")
YOUTUBE_OAUTH_CLIENT_SECRET = os.getenv("YOUTUBE_OAUTH_CLIENT_SECRET", "")
YOUTUBE_OAUTH_REDIRECT_URI = os.getenv(
    "YOUTUBE_OAUTH_REDIRECT_URI", "http://127.0.0.1:8000/api/teacher/integrations/youtube/oauth/callback/"
)
FRONTEND_TEACHER_REDIRECT_URL = os.getenv("FRONTEND_TEACHER_REDIRECT_URL", "http://127.0.0.1:3000/teacher")

JSON_LOGS = os.getenv("JSON_LOGS", "").lower() == "true"
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "verbose": {
            "format": "{levelname} {asctime} {name} {message}",
            "style": "{",
        },
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "verbose",
        },
    },
    "root": {
        "handlers": ["console"],
        "level": os.getenv("LOG_LEVEL", "INFO"),
    },
    "loggers": {
        "django": {"handlers": ["console"], "level": os.getenv("DJANGO_LOG_LEVEL", "INFO"), "propagate": False},
    },
}

if JSON_LOGS:
    try:
        from pythonjsonlogger import jsonlogger

        LOGGING["formatters"]["json"] = {
            "()": "pythonjsonlogger.jsonlogger.JsonFormatter",
            "format": "%(levelname)s %(name)s %(message)s",
        }
        LOGGING["handlers"]["console"]["formatter"] = "json"
    except ImportError:
        pass

try:
    if os.getenv("SENTRY_DSN"):
        import sentry_sdk
        from sentry_sdk.integrations.django import DjangoIntegration

        sentry_sdk.init(
            dsn=os.environ["SENTRY_DSN"],
            integrations=[DjangoIntegration()],
            traces_sample_rate=float(os.getenv("SENTRY_TRACES_SAMPLE_RATE", "0")),
            send_default_pii=False,
            environment=os.getenv("SENTRY_ENVIRONMENT", "development"),
        )
except ImportError:
    pass

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
]

LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"
# Used to build absolute links to uploaded session files (student app may run on another origin).
PUBLIC_BACKEND_BASE_URL = os.getenv("PUBLIC_BACKEND_BASE_URL", "http://127.0.0.1:8000").rstrip("/")
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

CORS_ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.getenv(
        "CORS_ALLOWED_ORIGINS",
        "http://localhost:3000,http://127.0.0.1:3000",
    ).split(",")
    if origin.strip()
]

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework_simplejwt.authentication.JWTAuthentication",
        "rest_framework.authentication.SessionAuthentication",
        "rest_framework.authentication.BasicAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
    # Per-user limits for student mutation endpoints (large-class hardening).
    "DEFAULT_THROTTLE_RATES": {
        "student_chat": "30/minute",
        "student_chat_slow": "8/minute",
        "student_raise_hand": "12/minute",
        "student_poll_vote": "24/minute",
        "student_quiz_submit": "24/minute",
        "student_join_request": "8/minute",
        "anon": "60/minute",
    },
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=20),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    # Keep demo sessions stable under concurrent local requests from the app shell,
    # server components, and API proxies.
    "ROTATE_REFRESH_TOKENS": False,
    "BLACKLIST_AFTER_ROTATION": False,
    "UPDATE_LAST_LOGIN": True,
}
