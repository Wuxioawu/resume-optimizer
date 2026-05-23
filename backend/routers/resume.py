import os
import uuid
from pathlib import Path

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.responses import Response
from pydantic import ValidationError

from models.schemas import AnalyzeResponse, ExportRequest, ResumeData, Suggestion
from services.openrouter_service import analyze_resume
from services.pdf_generator import generate_pdf
from services.pdf_parser import extract_text
from services.resume_parser import parse_resume

router = APIRouter()

MAX_FILE_SIZE_BYTES = int(os.getenv("MAX_FILE_SIZE_MB", "10")) * 1024 * 1024

UPLOADS_DIR = Path("uploads")
UPLOADS_DIR.mkdir(exist_ok=True)


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
        parsed_resume = ResumeData()

    suggestions: list[Suggestion] = []
    for s in result.get("suggestions", []):
        try:
            suggestions.append(
                Suggestion(
                    id=s.get("id", str(uuid.uuid4())),
                    section=s.get("section", "Other"),
                    original=s.get("original", ""),
                    suggested=s.get("suggested", ""),
                    reason=s.get("reason", ""),
                    impact=s.get("impact", "medium"),
                    accepted=False,
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
    """Apply accepted suggestions to structured resume data and return a clean PDF."""
    try:
        accepted = [s for s in request.accepted_suggestions if s.accepted]
        pdf_bytes = generate_pdf(request.parsed_resume.model_dump(), accepted)
    except Exception as exc:
        raise HTTPException(status_code=500, detail="PDF generation failed") from exc

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=optimized_resume.pdf"},
    )
