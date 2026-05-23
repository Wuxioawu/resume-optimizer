from typing import Literal
from pydantic import BaseModel


class Suggestion(BaseModel):
    id: str
    section: Literal["Summary", "Experience", "Skills", "Education", "Other"]
    original: str
    suggested: str
    reason: str
    impact: Literal["high", "medium", "low"]
    accepted: bool = False


class AnalyzeResponse(BaseModel):
    suggestions: list[Suggestion]
    resume_text: str
    match_score: int
    temp_file_id: str


class ExportRequest(BaseModel):
    temp_file_id: str
    accepted_suggestions: list[Suggestion]
