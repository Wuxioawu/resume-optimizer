from typing import Literal
from pydantic import BaseModel, ConfigDict, field_validator


class SuggestionLocation(BaseModel):
    kind: Literal["flat", "experience", "projects", "education"]
    field: str
    index: int | None = None
    bullet_index: int | None = None


class Suggestion(BaseModel):
    id: str
    section: Literal["Summary", "Experience", "Skills", "Education", "Projects", "Other"]
    original: str
    suggested: str
    reason: str
    impact: Literal["high", "medium", "low"]
    accepted: bool = False
    location: SuggestionLocation | None = None


class ExperienceEntry(BaseModel):
    model_config = ConfigDict(extra="ignore")

    company: str = ""
    title: str = ""
    date: str = ""
    location: str = ""
    bullets: list[str] = []

    @field_validator("company", "title", "date", "location", mode="before")
    @classmethod
    def _coerce_str(cls, v: object) -> str:
        return "" if v is None else str(v)

    @field_validator("bullets", mode="before")
    @classmethod
    def _coerce_bullets(cls, v: object) -> list[str]:
        if v is None:
            return []
        if isinstance(v, str):
            return [v] if v.strip() else []
        if hasattr(v, "__iter__"):
            return list(v)
        return []


class ProjectEntry(BaseModel):
    model_config = ConfigDict(extra="ignore")

    name: str = ""
    role: str = ""
    date: str = ""
    bullets: list[str] = []

    @field_validator("name", "role", "date", mode="before")
    @classmethod
    def _coerce_str(cls, v: object) -> str:
        return "" if v is None else str(v)

    @field_validator("bullets", mode="before")
    @classmethod
    def _coerce_bullets(cls, v: object) -> list[str]:
        if v is None:
            return []
        if isinstance(v, str):
            return [v] if v.strip() else []
        if hasattr(v, "__iter__"):
            return list(v)
        return []


class EducationEntry(BaseModel):
    model_config = ConfigDict(extra="ignore")

    school: str = ""
    degree: str = ""
    date: str = ""
    location: str = ""

    @field_validator("school", "degree", "date", "location", mode="before")
    @classmethod
    def _coerce_str(cls, v: object) -> str:
        return "" if v is None else str(v)


class ResumeData(BaseModel):
    model_config = ConfigDict(extra="ignore")

    name: str = ""
    contact: str = ""
    summary: str = ""
    experience: list[ExperienceEntry] = []
    projects: list[ProjectEntry] = []
    education: list[EducationEntry] = []
    skills: str = ""

    @field_validator("name", "contact", "summary", "skills", mode="before")
    @classmethod
    def _coerce_str(cls, v: object) -> str:
        return "" if v is None else str(v)

    @field_validator("experience", "projects", "education", mode="before")
    @classmethod
    def _coerce_list(cls, v: object) -> list:
        if not isinstance(v, list):
            return []
        return v


class AnalyzeResponse(BaseModel):
    suggestions: list[Suggestion]
    match_score: int
    parsed_resume: ResumeData


class ExportRequest(BaseModel):
    parsed_resume: ResumeData
    accepted_suggestions: list[Suggestion] = []
