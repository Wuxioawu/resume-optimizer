import os
import json
import re
import requests

MODELS = [
    "google/gemma-4-31b-it:free",
    "nvidia/nemotron-3-super-120b-a12b:free",
    "meta-llama/llama-3.3-70b-instruct:free",
    "google/gemma-4-26b-a4b-it:free",
    "minimax/minimax-m2.5:free",
]


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
- If a section is absent, use an empty list [] or empty string ""
- Each bullet point should be a single string (no nested lists)
- For skills, group by category separated by newlines (e.g. "Languages: Java, Python\\nFrameworks: React")
- Do not invent or fabricate any content

Resume text:
{resume_text}"""

    last_error = "No models available"
    for model in MODELS:
        response = requests.post(
            "https://openrouter.ai/api/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": model,
                "messages": [{"role": "user", "content": prompt}],
            },
            timeout=120,
        )

        body = response.json()

        if "choices" in body:
            raw = body["choices"][0]["message"]["content"].strip()
            raw = re.sub(r"^```(?:json)?\s*", "", raw)
            raw = re.sub(r"\s*```$", "", raw)
            try:
                return json.loads(raw.strip())
            except json.JSONDecodeError as exc:
                raise ValueError(f"Model {model} returned non-JSON: {exc}") from exc

        error = body.get("error", {})
        if isinstance(error, dict):
            last_error = f"{model} error {error.get('code')}: {error.get('message', '')[:80]}"
            continue

        last_error = f"{model} unknown error"
        continue

    raise ValueError(f"All models failed. Last error: {last_error}")
