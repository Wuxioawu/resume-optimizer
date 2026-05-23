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


class ExperienceEntry(BaseModel):
    company: str = ""
    title: str = ""
    date: str = ""
    location: str = ""
    bullets: list[str] = []


class ProjectEntry(BaseModel):
    name: str = ""
    role: str = ""
    date: str = ""
    bullets: list[str] = []


class EducationEntry(BaseModel):
    school: str = ""
    degree: str = ""
    date: str = ""
    location: str = ""


class ResumeData(BaseModel):
    name: str = ""
    contact: str = ""
    summary: str = ""
    experience: list[dict] = []
    projects: list[dict] = []
    education: list[dict] = []
    skills: str = ""


class AnalyzeResponse(BaseModel):
    suggestions: list[Suggestion]
    resume_text: str
    match_score: int
    temp_file_id: str
    parsed_resume: ResumeData


class ExportRequest(BaseModel):
    parsed_resume: ResumeData
    accepted_suggestions: list[Suggestion] = []
