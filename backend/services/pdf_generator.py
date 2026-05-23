import io
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import (
    HRFlowable, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle
)

from models.schemas import ResumeSection

# A4 usable width with 1-inch side margins
_COL_LEFT = 4.15 * inch
_COL_RIGHT = 2.12 * inch


def _styles() -> dict[str, ParagraphStyle]:
    return {
        "name": ParagraphStyle(
            "Name", fontName="Helvetica-Bold", fontSize=18,
            leading=22, alignment=TA_CENTER, spaceAfter=3,
        ),
        "contact": ParagraphStyle(
            "Contact", fontName="Helvetica", fontSize=9,
            leading=12, alignment=TA_CENTER, spaceAfter=6,
            textColor=colors.HexColor("#555555"),
        ),
        "section": ParagraphStyle(
            "Section", fontName="Helvetica-Bold", fontSize=11,
            leading=14, alignment=TA_LEFT, spaceBefore=6, spaceAfter=2,
        ),
        "job_title": ParagraphStyle(
            "JobTitle", fontName="Helvetica-Bold", fontSize=10,
            leading=13, alignment=TA_LEFT,
        ),
        "company": ParagraphStyle(
            "Company", fontName="Helvetica", fontSize=10,
            leading=13, alignment=TA_LEFT,
            textColor=colors.HexColor("#444444"),
        ),
        "date": ParagraphStyle(
            "Date", fontName="Helvetica", fontSize=9,
            leading=13, alignment=TA_RIGHT,
            textColor=colors.HexColor("#555555"),
        ),
        "body": ParagraphStyle(
            "Body", fontName="Helvetica", fontSize=10,
            leading=14, alignment=TA_LEFT, spaceAfter=2,
        ),
        "bullet": ParagraphStyle(
            "Bullet", fontName="Helvetica", fontSize=10,
            leading=14, alignment=TA_LEFT, leftIndent=14, spaceAfter=1,
        ),
    }


def _section_header(story: list, s: dict, label: str) -> None:
    story.append(Paragraph(label.upper(), s["section"]))
    story.append(HRFlowable(
        width="100%", thickness=0.5, color=colors.black, spaceAfter=3,
    ))


def _two_col(left: Paragraph, right: Paragraph) -> Table:
    """Single-row table: left-aligned left cell, right-aligned right cell."""
    t = Table([[left, right]], colWidths=[_COL_LEFT, _COL_RIGHT])
    t.setStyle(TableStyle([
        ("ALIGN",        (1, 0), (1, 0), "RIGHT"),
        ("VALIGN",       (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING",  (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
        ("TOPPADDING",   (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING",(0, 0), (-1, -1), 0),
    ]))
    return t


def generate_pdf(parsed_resume: ResumeSection) -> bytes:
    """Render a structured ResumeSection into a formatted A4 PDF."""
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer, pagesize=A4,
        rightMargin=inch, leftMargin=inch,
        topMargin=inch, bottomMargin=inch,
    )
    s = _styles()
    story: list = []

    # ── Name ──
    story.append(Paragraph(escape(parsed_resume.name or "Name"), s["name"]))

    # ── Contact ──
    if parsed_resume.contact:
        story.append(Paragraph(escape(parsed_resume.contact), s["contact"]))

    # ── Summary ──
    if parsed_resume.summary:
        _section_header(story, s, "Summary")
        story.append(Paragraph(escape(parsed_resume.summary), s["body"]))
        story.append(Spacer(1, 4))

    # ── Experience ──
    if parsed_resume.experience:
        _section_header(story, s, "Experience")
        for exp in parsed_resume.experience:
            story.append(_two_col(
                Paragraph(escape(exp.title), s["job_title"]),
                Paragraph(escape(exp.date), s["date"]),
            ))
            story.append(_two_col(
                Paragraph(escape(exp.company), s["company"]),
                Paragraph(escape(exp.location), s["date"]),
            ))
            for b in exp.bullets:
                story.append(Paragraph(f"• {escape(b)}", s["bullet"]))
            story.append(Spacer(1, 5))

    # ── Projects ──
    if parsed_resume.projects:
        _section_header(story, s, "Projects")
        for proj in parsed_resume.projects:
            story.append(_two_col(
                Paragraph(escape(proj.name), s["job_title"]),
                Paragraph(escape(proj.date), s["date"]),
            ))
            if proj.role:
                story.append(Paragraph(escape(proj.role), s["company"]))
            for b in proj.bullets:
                story.append(Paragraph(f"• {escape(b)}", s["bullet"]))
            story.append(Spacer(1, 5))

    # ── Education ──
    if parsed_resume.education:
        _section_header(story, s, "Education")
        for edu in parsed_resume.education:
            story.append(_two_col(
                Paragraph(escape(edu.school), s["job_title"]),
                Paragraph(escape(edu.date), s["date"]),
            ))
            story.append(_two_col(
                Paragraph(escape(edu.degree), s["company"]),
                Paragraph(escape(edu.location), s["date"]),
            ))
            story.append(Spacer(1, 4))

    # ── Skills ──
    if parsed_resume.skills:
        _section_header(story, s, "Skills")
        story.append(Paragraph(escape(parsed_resume.skills), s["body"]))

    doc.build(story)
    return buffer.getvalue()
