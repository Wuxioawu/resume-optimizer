from typing import Literal
from pydantic import BaseModel, ConfigDict, field_validator


class SuggestionLocation(BaseModel):
    """
    Represents the exact location of a suggestion within the parsed resume.

    This model allows the frontend to identify which section, field,
    and item should be highlighted when displaying AI-generated suggestions.
    """

    kind: Literal["flat", "experience", "projects", "education"]
    field: str
    index: int | None = None
    bullet_index: int | None = None


class Suggestion(BaseModel):
    """
    Represents a single AI-generated resume improvement suggestion.

    Each suggestion contains:
    - the original text
    - the suggested replacement
    - the reason for the suggestion
    - its importance (impact)
    - whether the user accepted it
    - where it belongs in the resume
    """

    id: str
    section: Literal[
        "Summary",
        "Experience",
        "Skills",
        "Education",
        "Projects",
        "Other",
    ]
    original: str
    suggested: str
    reason: str
    impact: Literal["high", "medium", "low"]
    accepted: bool = False
    location: SuggestionLocation | None = None


class ExperienceEntry(BaseModel):
    """
    Represents one work experience entry in the resume.

    Example:
        Company: Google
        Title: Software Engineer
        Date: 2023 - Present
        Location: Dublin
        Bullets:
            - Built REST APIs
            - Improved system performance
    """

    model_config = ConfigDict(extra="ignore")

    company: str = ""
    title: str = ""
    date: str = ""
    location: str = ""
    bullets: list[str] = []

    @field_validator("company", "title", "date", "location", mode="before")
    @classmethod
    def _coerce_str(cls, v: object) -> str:
        """
        Convert any incoming value into a string.

        Purpose:
        - Convert None to an empty string.
        - Convert numbers or other objects into strings.
        - Prevent validation errors caused by unexpected AI outputs.
        """
        return "" if v is None else str(v)

    @field_validator("bullets", mode="before")
    @classmethod
    def _coerce_bullets(cls, v: object) -> list[str]:
        """
        Normalize the bullets field into a list of strings.

        Handles several possible AI outputs:
        - None        -> []
        - "text"      -> ["text"]
        - Iterable    -> list(iterable)

        Ensures the application always receives a valid list.
        """
        if v is None:
            return []

        if isinstance(v, str):
            return [v] if v.strip() else []

        if hasattr(v, "__iter__"):
            return list(v)

        return []


class ProjectEntry(BaseModel):
    """
    Represents one project entry in the resume.
    """

    model_config = ConfigDict(extra="ignore")

    name: str = ""
    role: str = ""
    date: str = ""
    bullets: list[str] = []

    @field_validator("name", "role", "date", mode="before")
    @classmethod
    def _coerce_str(cls, v: object) -> str:
        """
        Convert incoming values into strings.

        Converts None to "" to avoid validation failures.
        """
        return "" if v is None else str(v)

    @field_validator("bullets", mode="before")
    @classmethod
    def _coerce_bullets(cls, v: object) -> list[str]:
        """
        Ensure bullets is always a list of strings.

        This validator makes the parser tolerant of
        inconsistent AI-generated outputs.
        """
        if v is None:
            return []

        if isinstance(v, str):
            return [v] if v.strip() else []

        if hasattr(v, "__iter__"):
            return list(v)

        return []


class EducationEntry(BaseModel):
    """
    Represents one education record in the resume.
    """

    model_config = ConfigDict(extra="ignore")

    school: str = ""
    degree: str = ""
    date: str = ""
    location: str = ""

    @field_validator("school", "degree", "date", "location", mode="before")
    @classmethod
    def _coerce_str(cls, v: object) -> str:
        """
        Normalize all education fields into strings.

        Converts None into an empty string.
        """
        return "" if v is None else str(v)


class ResumeData(BaseModel):
    """
    Represents the complete parsed resume.

    This is the main data model produced after parsing
    a user's uploaded resume.
    """

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
        """
        Ensure all text fields are strings.

        Prevents None values from breaking downstream logic.
        """
        return "" if v is None else str(v)

    @field_validator("experience", "projects", "education", mode="before")
    @classmethod
    def _coerce_list(cls, v: object) -> list:
        """
        Ensure section fields are lists.

        If AI returns an invalid type,
        replace it with an empty list.
        """
        if not isinstance(v, list):
            return []

        return v


class AnalyzeResponse(BaseModel):
    """
    Response returned by the resume analysis API.

    Contains:
    - AI suggestions
    - Match score
    - Parsed resume structure
    """

    suggestions: list[Suggestion]
    match_score: int
    parsed_resume: ResumeData


class ResumeStyle(BaseModel):
    """
    Defines styling options when exporting a resume.

    Used by the PDF/DOCX export service.
    """

    accent_color: str = "#0f172a"
    header_alignment: Literal["left", "center", "right"] = "center"
    section_spacing: float = 8
    entry_spacing: float = 6
    line_spacing: float = 1.4


class ExportRequest(BaseModel):
    """
    Request body for exporting a resume.

    Includes:
    - Parsed resume
    - Accepted AI suggestions
    - Export styling configuration
    """

    parsed_resume: ResumeData
    accepted_suggestions: list[Suggestion] = []
    style: ResumeStyle = ResumeStyle()


class RewriteRequest(BaseModel):
    """
    Request body for AI-assisted resume rewriting.

    Users provide:
    - the parsed resume
    - a rewrite instruction
    - an optional job description

    The backend uses this information to
    generate a rewritten version of the resume.
    """

    parsed_resume: ResumeData
    instruction: str
    job_description: str = ""