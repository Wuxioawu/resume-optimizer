import difflib
import os
import re
import unicodedata
import uuid
from pathlib import Path

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.responses import Response
from pydantic import ValidationError

from models.schemas import AnalyzeResponse, ExportRequest, ResumeData, Suggestion, SuggestionLocation
from services.openrouter_service import analyze_resume
from services.pdf_generator import generate_pdf
from services.pdf_parser import extract_text
from services.resume_parser import parse_resume

router = APIRouter()

MAX_FILE_SIZE_BYTES = int(os.getenv("MAX_FILE_SIZE_MB", "10")) * 1024 * 1024

UPLOADS_DIR = Path("uploads")
UPLOADS_DIR.mkdir(exist_ok=True)

# ── Location resolution ────────────────────────────────────────────────────────

_FUZZY_THRESHOLD = 0.80
_MIN_FUZZY_LEN = 10  # skip fuzzy for very short strings to avoid false positives


def _normalize(text: str) -> str:
    """Canonical form for matching: NFKC, straight quotes/dashes, lowercase, collapsed whitespace."""
    text = unicodedata.normalize("NFKC", text)
    text = text.replace("‘", "'").replace("’", "'")   # curly apostrophes
    text = text.replace("“", '"').replace("”", '"')   # curly double quotes
    text = text.replace("–", "-").replace("—", "-")   # en/em dash
    text = text.replace(" ", " ")                          # non-breaking space
    text = text.lower()
    return re.sub(r"\s+", " ", text).strip()


def _best_match(norm_orig: str, candidates: list[tuple[str, dict]]) -> dict | None:
    """Return location dict of the first exact-substring hit, or best fuzzy hit above threshold."""
    best_ratio = _FUZZY_THRESHOLD
    best_loc: dict | None = None
    for norm_field, loc in candidates:
        if not norm_field:
            continue
        if norm_orig in norm_field:
            return loc  # exact substring always wins immediately
        if len(norm_orig) >= _MIN_FUZZY_LEN:
            r = difflib.SequenceMatcher(None, norm_orig, norm_field).ratio()
            if r > best_ratio:
                best_ratio = r
                best_loc = loc
    return best_loc


def _search_section(norm_orig: str, section: str, resume: dict) -> dict | None:
    """Search one section for norm_orig. Returns a location dict or None."""
    if section == "Summary":
        norm_f = _normalize(resume.get("summary", ""))
        return {"kind": "flat", "field": "summary"} if _best_match(norm_orig, [(norm_f, {})]) is not None else None

    if section == "Skills":
        norm_f = _normalize(resume.get("skills", ""))
        return {"kind": "flat", "field": "skills"} if _best_match(norm_orig, [(norm_f, {})]) is not None else None

    if section == "Experience":
        candidates: list[tuple[str, dict]] = []
        for i, exp in enumerate(resume.get("experience", [])):
            for j, bullet in enumerate(exp.get("bullets", [])):
                candidates.append((_normalize(bullet), {"kind": "experience", "field": "bullet", "index": i, "bullet_index": j}))
            for fld in ("title", "company"):
                candidates.append((_normalize(exp.get(fld, "")), {"kind": "experience", "field": fld, "index": i}))
        return _best_match(norm_orig, candidates)

    if section == "Projects":
        candidates = []
        for i, proj in enumerate(resume.get("projects", [])):
            for j, bullet in enumerate(proj.get("bullets", [])):
                candidates.append((_normalize(bullet), {"kind": "projects", "field": "bullet", "index": i, "bullet_index": j}))
            for fld in ("name", "role"):
                candidates.append((_normalize(proj.get(fld, "")), {"kind": "projects", "field": fld, "index": i}))
        return _best_match(norm_orig, candidates)

    if section == "Education":
        candidates = []
        for i, edu in enumerate(resume.get("education", [])):
            for fld in ("school", "degree"):
                candidates.append((_normalize(edu.get(fld, "")), {"kind": "education", "field": fld, "index": i}))
        return _best_match(norm_orig, candidates)

    return None


def resolve_location(original: str, section: str, parsed_resume: dict) -> dict | None:
    """Find the precise slot in parsed_resume that contains original. Returns a location dict or None."""
    original = original.strip()
    if not original:
        return None
    norm_orig = _normalize(original)

    # 1. Declared section first
    loc = _search_section(norm_orig, section, parsed_resume)
    if loc:
        return loc

    # 2. Cross-section fallback
    for fallback in ("Summary", "Skills", "Experience", "Projects", "Education"):
        if fallback == section:
            continue
        loc = _search_section(norm_orig, fallback, parsed_resume)
        if loc:
            return loc

    return None


# ── Special-case helpers for flat sections (avoid false None on exact match) ──

def _flat_matches(norm_orig: str, norm_field: str) -> bool:
    if not norm_field:
        return False
    if norm_orig in norm_field:
        return True
    if len(norm_orig) >= _MIN_FUZZY_LEN:
        return difflib.SequenceMatcher(None, norm_orig, norm_field).ratio() >= _FUZZY_THRESHOLD
    return False


# ── Routes ────────────────────────────────────────────────────────────────────

@router.post("/analyze", response_model=AnalyzeResponse)
async def analyze(
    resume: UploadFile = File(...),
    job_description: str = Form(...),
) -> AnalyzeResponse:
    """Parse uploaded PDF resume and return AI improvement suggestions plus structured data."""
    content = await resume.read()
    if len(content) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(status_code=413, detail="File exceeds size limit")

    temp_file_id = str(uuid.uuid4())
    temp_path = UPLOADS_DIR / f"{temp_file_id}.pdf"
    temp_path.write_bytes(content)

    try:
        resume_text = extract_text(str(temp_path))
    except Exception as exc:
        temp_path.unlink(missing_ok=True)
        raise HTTPException(status_code=422, detail="Could not extract text from PDF") from exc

    if not resume_text.strip():
        temp_path.unlink(missing_ok=True)
        raise HTTPException(status_code=422, detail="Could not extract text from PDF")

    temp_path.unlink(missing_ok=True)

    try:
        result = analyze_resume(resume_text, job_description)
    except ValueError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=502, detail="OpenRouter API request failed") from exc

    try:
        parsed_dict = parse_resume(resume_text)
        parsed_resume = ResumeData(**parsed_dict)
    except Exception:
        parsed_dict = {}
        parsed_resume = ResumeData()

    suggestions: list[Suggestion] = []
    for s in result.get("suggestions", []):
        try:
            loc_dict = resolve_location(
                s.get("original", ""),
                s.get("section", "Other"),
                parsed_dict,
            )
            loc = SuggestionLocation(**loc_dict) if loc_dict else None
            suggestions.append(
                Suggestion(
                    id=s.get("id", str(uuid.uuid4())),
                    section=s.get("section", "Other"),
                    original=s.get("original", ""),
                    suggested=s.get("suggested", ""),
                    reason=s.get("reason", ""),
                    impact=s.get("impact", "medium"),
                    accepted=False,
                    location=loc,
                )
            )
        except ValidationError:
            continue

    return AnalyzeResponse(
        suggestions=suggestions,
        resume_text=resume_text,
        match_score=result.get("match_score", 0),
        temp_file_id=temp_file_id,
        parsed_resume=parsed_resume,
    )


@router.post("/export")
async def export_resume(request: ExportRequest) -> Response:
    """Render the submitted ResumeData as a PDF. Frontend has already applied all changes."""
    try:
        pdf_bytes = generate_pdf(request.parsed_resume.model_dump())
    except Exception as exc:
        raise HTTPException(status_code=500, detail="PDF generation failed") from exc

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=optimized_resume.pdf"},
    )
