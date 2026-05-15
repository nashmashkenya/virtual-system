#!/usr/bin/env python3
"""
Soak / load harness for ElimuPawa Classroom API.

Modes:
  student (default): GET /api/student/dashboard/ + POST /api/student/chat-message/
  teacher: GET /api/teacher/dashboard/
  mixed: half workers student, half teacher (same totals as --workers)

Prerequisites:
  - Backend running (e.g. python manage.py runserver 8000)
  - Demo users from seed_demo_data: aisha.student, grace.teacher (password123), or pass --username / --teacher-username

Usage:
  python scripts/load_soak.py --base-url http://127.0.0.1:8000 --workers 50 --seconds 30
  python scripts/load_soak.py --mode teacher --workers 20 --seconds 30
  python scripts/load_soak.py --mode mixed --workers 40 --seconds 30

This does NOT replace Locust/k6; it is a zero-dependency smoke/soak for CI or laptops.
"""

from __future__ import annotations

import argparse
import json
import random
import sys
import threading
import time
import urllib.error
import urllib.request


def post_json(url: str, payload: dict | None, headers: dict | None = None, timeout: float = 30.0):
    data = json.dumps(payload or {}).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data,
        headers={**(headers or {}), "Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return resp.status, json.loads(resp.read().decode("utf-8"))


def get_json(url: str, headers: dict | None = None, timeout: float = 30.0):
    req = urllib.request.Request(url, headers=headers or {}, method="GET")
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return resp.status, json.loads(resp.read().decode("utf-8"))


def login(base: str, username: str, password: str) -> str:
    status, body = post_json(
        f"{base.rstrip('/')}/api/auth/login/",
        {"username": username, "password": password},
    )
    if status != 200 or "access" not in body:
        raise RuntimeError(f"Login failed: {body}")
    return body["access"]


def student_worker(
    base: str,
    token: str,
    stop_at: float,
    stats: dict,
    lock: threading.Lock,
) -> None:
    headers = {"Authorization": f"Bearer {token}"}
    dash_url = f"{base.rstrip('/')}/api/student/dashboard/"
    chat_url = f"{base.rstrip('/')}/api/student/chat-message/"
    while time.time() < stop_at:
        try:
            _, _ = get_json(dash_url, headers=headers)
            with lock:
                stats["dashboard_ok"] += 1
        except Exception:
            with lock:
                stats["dashboard_err"] += 1

        msg = f"load-{threading.get_ident()}-{random.randint(0, 1_000_000)}"
        try:
            status, _ = post_json(chat_url, {"message": msg}, headers=headers)
            with lock:
                if status in (200, 201):
                    stats["chat_ok"] += 1
                else:
                    stats["chat_err"] += 1
        except urllib.error.HTTPError as exc:
            with lock:
                stats["chat_err"] += 1
            if exc.code == 429:
                with lock:
                    stats["chat_429"] += 1
        except Exception:
            with lock:
                stats["chat_err"] += 1

        time.sleep(0.05)


def teacher_worker(
    base: str,
    token: str,
    stop_at: float,
    stats: dict,
    lock: threading.Lock,
) -> None:
    headers = {"Authorization": f"Bearer {token}"}
    dash_url = f"{base.rstrip('/')}/api/teacher/dashboard/"
    while time.time() < stop_at:
        try:
            _, _ = get_json(dash_url, headers=headers)
            with lock:
                stats["teacher_dashboard_ok"] += 1
        except Exception:
            with lock:
                stats["teacher_dashboard_err"] += 1
        time.sleep(0.05)


def main() -> int:
    parser = argparse.ArgumentParser(description="ElimuPawa Classroom soak loader (student and/or teacher).")
    parser.add_argument("--base-url", default="http://127.0.0.1:8000", help="API base URL")
    parser.add_argument(
        "--mode",
        choices=["student", "teacher", "mixed"],
        default="student",
        help="student: dashboard+chat; teacher: teacher dashboard; mixed: split workers",
    )
    parser.add_argument("--username", default="aisha.student", help="Student username (student / mixed)")
    parser.add_argument("--password", default="password123", help="Student password")
    parser.add_argument("--teacher-username", default="grace.teacher", help="Teacher username (teacher / mixed)")
    parser.add_argument("--teacher-password", default="password123", help="Teacher password")
    parser.add_argument("--workers", type=int, default=20, help="Concurrent threads (split in mixed mode)")
    parser.add_argument("--seconds", type=int, default=30, help="Duration")
    args = parser.parse_args()

    base = args.base_url.rstrip("/")
    student_token: str | None = None
    teacher_token: str | None = None

    if args.mode in ("student", "mixed"):
        try:
            student_token = login(base, args.username, args.password)
        except Exception as exc:
            print(f"Student login error: {exc}", file=sys.stderr)
            return 1
    if args.mode in ("teacher", "mixed"):
        try:
            teacher_token = login(base, args.teacher_username, args.teacher_password)
        except Exception as exc:
            print(f"Teacher login error: {exc}", file=sys.stderr)
            return 1

    stats: dict[str, int] = {
        "dashboard_ok": 0,
        "dashboard_err": 0,
        "chat_ok": 0,
        "chat_err": 0,
        "chat_429": 0,
        "teacher_dashboard_ok": 0,
        "teacher_dashboard_err": 0,
    }
    lock = threading.Lock()
    stop_at = time.time() + args.seconds
    threads: list[threading.Thread] = []

    if args.mode == "student":
        assert student_token is not None
        for _ in range(max(1, args.workers)):
            threads.append(
                threading.Thread(
                    target=student_worker,
                    args=(base, student_token, stop_at, stats, lock),
                    daemon=True,
                )
            )
    elif args.mode == "teacher":
        assert teacher_token is not None
        for _ in range(max(1, args.workers)):
            threads.append(
                threading.Thread(
                    target=teacher_worker,
                    args=(base, teacher_token, stop_at, stats, lock),
                    daemon=True,
                )
            )
    else:
        assert student_token is not None and teacher_token is not None
        w = max(1, args.workers)
        w_student = max(1, w // 2)
        w_teacher = w - w_student
        for _ in range(w_student):
            threads.append(
                threading.Thread(
                    target=student_worker,
                    args=(base, student_token, stop_at, stats, lock),
                    daemon=True,
                )
            )
        for _ in range(w_teacher):
            threads.append(
                threading.Thread(
                    target=teacher_worker,
                    args=(base, teacher_token, stop_at, stats, lock),
                    daemon=True,
                )
            )

    for t in threads:
        t.start()
    for t in threads:
        t.join()

    out = {
        "seconds": args.seconds,
        "workers": args.workers,
        "mode": args.mode,
        **stats,
    }
    print(json.dumps(out, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
