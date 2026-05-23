import io
import re
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import HRFlowable, Paragraph, SimpleDocTemplate, Spacer

from models.schemas import Suggestion


# ── Styles ──────────────────────────────────────────────────────────────────

def _build_styles() -> dict[str, ParagraphStyle]:
    return {
        "name": ParagraphStyle(
            "Name",
            fontName="Helvetica-Bold",
            fontSize=16,
            leading=20,
            alignment=TA_CENTER,
            spaceAfter=3,
        ),
        "contact": ParagraphStyle(
            "Contact",
            fontName="Helvetica",
            fontSize=9,
            leading=12,
            alignment=TA_CENTER,
            textColor=colors.HexColor("#444444"),
            spaceAfter=4,
        ),
        "header": ParagraphStyle(
            "Header",
            fontName="Helvetica-Bold",
            fontSize=11,
            leading=14,
            alignment=TA_LEFT,
            spaceBefore=8,
            spaceAfter=2,
        ),
        "body": ParagraphStyle(
            "Body",
            fontName="Helvetica",
            fontSize=10,
            leading=14,
            alignment=TA_LEFT,
            spaceAfter=2,
        ),
        "bullet": ParagraphStyle(
            "Bullet",
            fontName="Helvetica",
            fontSize=10,
            leading=14,
            alignment=TA_LEFT,
            leftIndent=14,
            spaceAfter=2,
        ),
    }


# ── Resume text parser ───────────────────────────────────────────────────────

def _is_contact_line(line: str, non_empty_index: int) -> bool:
    """True for lines that look like contact info near the top of the document."""
    if non_empty_index > 5:
        return False
    if "@" in line:
        return True
    if "|" in line or "·" in line:
        return True
    if re.search(r"\d{3}[-.\s]\d{3}[-.\s]\d{4}", line):
        return True
    if re.search(r"linkedin\.com|github\.com|portfolio", line, re.I):
        return True
    return False


def _is_section_header(line: str) -> bool:
    """True for lines that are mostly uppercase and short (≤ 60 chars)."""
    if not line or len(line) > 60:
        return False
    letters = [c for c in line if c.isalpha()]
    if not letters:
        return False
    if sum(1 for c in letters if c.isupper()) / len(letters) >= 0.8:
        return True
    known = {
        "experience", "education", "skills", "summary", "objective",
        "certifications", "projects", "awards", "publications", "volunteer",
        "languages", "interests", "references", "professional experience",
        "work experience", "technical skills", "core competencies",
        "achievements", "profile", "career objective",
    }
    return line.lower() in known


def _parse_resume(text: str) -> list[dict[str, str]]:
    """Convert raw resume text into a list of typed segments."""
    segments: list[dict[str, str]] = []
    non_empty_count = 0

    for line in text.splitlines():
        stripped = line.strip()

        if not stripped:
            segments.append({"type": "space", "text": ""})
            continue

        non_empty_count += 1

        if non_empty_count == 1:
            segments.append({"type": "name", "text": stripped})
        elif _is_contact_line(stripped, non_empty_count):
            segments.append({"type": "contact", "text": stripped})
        elif _is_section_header(stripped):
            segments.append({"type": "header", "text": stripped})
        elif re.match(r"^[•\-\*·–]\s*", stripped):
            clean = re.sub(r"^[•\-\*·–]\s*", "", stripped)
            segments.append({"type": "bullet", "text": clean})
        else:
            segments.append({"type": "body", "text": stripped})

    return segments


# ── Public API ───────────────────────────────────────────────────────────────

def generate_pdf(resume_text: str, accepted_suggestions: list[Suggestion]) -> bytes:
    """Apply accepted suggestions to resume_text, then render a clean PDF."""
    # Step 1: apply suggestions via simple string replacement
    updated = resume_text
    for s in accepted_suggestions:
        if s.original:
            updated = updated.replace(s.original, s.suggested, 1)

    print(f"[pdf_generator] suggestions applied : {len(accepted_suggestions)}")

    # Step 2: parse into typed segments
    segments = _parse_resume(updated)
    styles = _build_styles()

    # Step 3: build reportlab story
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=inch,
        leftMargin=inch,
        topMargin=inch,
        bottomMargin=inch,
    )

    story: list = []
    for seg in segments:
        t = escape(seg["text"])
        kind = seg["type"]

        if kind == "name":
            story.append(Paragraph(t, styles["name"]))

        elif kind == "contact":
            story.append(Paragraph(t, styles["contact"]))

        elif kind == "header":
            story.append(Spacer(1, 4))
            story.append(Paragraph(t.upper(), styles["header"]))
            story.append(HRFlowable(
                width="100%",
                thickness=0.5,
                color=colors.black,
                spaceAfter=3,
            ))

        elif kind == "bullet":
            story.append(Paragraph(f"• {t}", styles["bullet"]))

        elif kind == "body":
            story.append(Paragraph(t, styles["body"]))

        elif kind == "space":
            story.append(Spacer(1, 4))

    doc.build(story)
    return buffer.getvalue()
