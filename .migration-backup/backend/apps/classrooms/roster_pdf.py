"""Compressed PDF export of session enrollment roster for teachers."""

from __future__ import annotations

import io

from django.utils import timezone
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.platypus import LongTable, Paragraph, SimpleDocTemplate, Spacer, TableStyle


def _trunc(text: str, max_len: int) -> str:
    text = (text or "").strip()
    if len(text) <= max_len:
        return text
    return text[: max_len - 1] + "…"


def build_session_roster_pdf(session, enrollments_qs) -> bytes:
    """
    Build a landscape PDF with a repeating header row. Uses ReportLab stream compression.
    `enrollments_qs` should be ordered and select_related(student, student__student_profile).
    """
    rows = list(enrollments_qs)
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=landscape(A4),
        leftMargin=16,
        rightMargin=16,
        topMargin=14,
        bottomMargin=14,
        title=f"Roster {session.room_code}",
        author="ElimuPawa Classroom",
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "RosterTitle",
        parent=styles["Heading1"],
        fontSize=13,
        leading=16,
        spaceAfter=6,
    )
    meta_style = ParagraphStyle(
        "RosterMeta",
        parent=styles["Normal"],
        fontSize=8,
        leading=10,
        textColor=colors.HexColor("#475569"),
    )

    teacher_label = session.teacher.get_full_name().strip() or session.teacher.username
    generated = timezone.localtime(timezone.now()).strftime("%Y-%m-%d %H:%M")

    story = [
        Paragraph(f"<b>{_trunc(session.title, 90)}</b>", title_style),
        Paragraph(
            f"Room <b>{session.room_code}</b> &nbsp;|&nbsp; Instructor: <b>{_trunc(teacher_label, 48)}</b> "
            f"&nbsp;|&nbsp; Generated <b>{generated}</b> &nbsp;|&nbsp; <b>{len(rows)}</b> learners",
            meta_style,
        ),
        Spacer(1, 8),
    ]

    header = [
        "#",
        "Username",
        "Full name",
        "Email",
        "School",
        "Phone",
        "%",
        "Access",
        "Src",
        "Time",
    ]
    data: list[list[str]] = [header]

    for index, enrollment in enumerate(rows, start=1):
        profile = getattr(enrollment.student, "student_profile", None)
        data.append(
            [
                str(index),
                _trunc(enrollment.student.username, 18),
                _trunc(enrollment.student.get_full_name() or enrollment.student.username, 24),
                _trunc(enrollment.student.email, 32),
                _trunc(profile.school_name if profile else "", 18),
                _trunc(profile.phone_number if profile else "", 11),
                str(enrollment.progress),
                _trunc(enrollment.get_access_status_display(), 11),
                enrollment.enrollment_source,
                _trunc(enrollment.display_time or "", 14),
            ]
        )

    # Total width ~756pt on landscape A4 with margins
    col_widths = [24, 72, 100, 118, 76, 56, 26, 48, 40, 46]

    table = LongTable(data, colWidths=col_widths, repeatRows=1)
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1e293b")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.HexColor("#f8fafc")),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 7),
                ("ALIGN", (0, 0), (0, -1), "CENTER"),
                ("ALIGN", (6, 0), (6, -1), "CENTER"),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("GRID", (0, 0), (-1, -1), 0.2, colors.HexColor("#cbd5e1")),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f1f5f9")]),
                ("TOPPADDING", (0, 0), (-1, -1), 3),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
                ("LEFTPADDING", (0, 0), (-1, -1), 3),
                ("RIGHTPADDING", (0, 0), (-1, -1), 3),
            ]
        )
    )
    story.append(table)
    doc.build(story)
    return buffer.getvalue()
