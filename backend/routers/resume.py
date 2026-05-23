import os
import uuid
from pathlib import Path

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.responses import Response
from pydantic import ValidationError

from models.schemas import AnalyzeResponse, ExportRequest, Suggestion
from services.openrouter_service import analyze_resume
from services.pdf_generator import generate_pdf
from services.pdf_parser import extract_text

router = APIRouter()

MAX_FILE_SIZE_BYTES = int(os.getenv("MAX_FILE_SIZE_MB", "10")) * 1024 * 1024

UPLOADS_DIR = Path("uploads")
UPLOADS_DIR.mkdir(exist_ok=True)


@router.post("/analyze", response_model=AnalyzeResponse)
async def analyze(
    resume: UploadFile = File(...),
    job_description: str = Form(...),
) -> AnalyzeResponse:
    """Parse uploaded PDF resume and return AI improvement suggestions."""
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

    try:
        result = analyze_resume(resume_text, job_description)
    except ValueError as exc:
        temp_path.unlink(missing_ok=True)
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    except Exception as exc:
        temp_path.unlink(missing_ok=True)
        raise HTTPException(status_code=502, detail="OpenRouter API request failed") from exc

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

    # Temp file is no longer needed — resume_text is carried in the response.
    temp_path.unlink(missing_ok=True)

    return AnalyzeResponse(
        suggestions=suggestions,
        resume_text=resume_text,
        match_score=result.get("match_score", 0),
        temp_file_id=temp_file_id,
    )


@router.post("/export")
async def export_resume(request: ExportRequest) -> Response:
    """Apply accepted suggestions to resume_text and return a clean PDF."""
    if not request.resume_text:
        raise HTTPException(status_code=422, detail="resume_text is required")

    try:
        pdf_bytes = generate_pdf(request.resume_text, request.accepted_suggestions)
    except Exception as exc:
        raise HTTPException(status_code=500, detail="PDF generation failed") from exc

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=optimized_resume.pdf"},
    )
