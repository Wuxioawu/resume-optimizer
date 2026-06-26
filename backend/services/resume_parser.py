import json
import os
import re

from services.openrouter_service import call_openrouter


def parse_resume(resume_text: str) -> dict:
    """Use AI to parse resume text into structured sections."""
    api_key = os.getenv("OPENROUTER_API_KEY")
    if not api_key:
        raise ValueError("OPENROUTER_API_KEY environment variable is not set")

    prompt = f"""Parse this resume text into a structured JSON object.

Return ONLY valid JSON with this exact structure:
{{
  "name": "Full Name",
  "contact": "City | email | phone | LinkedIn | GitHub",
  "summary": "Summary paragraph text",
  "experience": [
    {{
      "company": "Company Name",
      "title": "Job Title",
      "date": "Aug 2022 - Aug 2025",
      "location": "Beijing, China",
      "bullets": [
        "First bullet point",
        "Second bullet point"
      ]
    }}
  ],
  "projects": [
    {{
      "name": "Project Name",
      "role": "Full Stack Developer",
      "bullets": [
        "First bullet point"
      ]
    }}
  ],
  "education": [
    {{
      "school": "University Name",
      "degree": "Degree Name",
      "date": "Sep 2025 - Jun 2026",
      "location": "Dublin, Ireland"
    }}
  ],
  "skills": "Languages: Java, Python\\nFrameworks: Spring Boot, React"
}}

Rules:
- Preserve the exact wording from the original resume
- If a section is absent use an empty list [] or empty string ""
- Each bullet point should be a complete sentence string
- For skills group by category separated by newlines
- Do not invent or fabricate any content
- Return ONLY JSON, no markdown, no extra text
- IMPORTANT: Add proper spaces between all words in the output. Every word must be separated by a space. Do not copy joined words from the input - always add spaces.

Resume text:
{resume_text}"""

    print(f"\n[resume_parser] Parsing resume ({len(resume_text)} chars)...")
    raw = call_openrouter([{"role": "user", "content": prompt}], api_key)
    raw = re.sub(r"^```(?:json)?\s*", "", raw)
    raw = re.sub(r"\s*```$", "", raw)

    try:
        result = json.loads(raw.strip())
        print(f"[resume_parser] ✅ parsed — name={result.get('name')}, "
              f"exp={len(result.get('experience', []))}, "
              f"proj={len(result.get('projects', []))}")
        return result
    except json.JSONDecodeError as exc:
        raise ValueError(f"Model returned non-JSON: {exc}") from exc
