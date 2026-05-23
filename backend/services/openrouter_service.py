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


def analyze_resume(resume_text: str, job_description: str) -> dict:
    """Call OpenRouter API, trying each free model in order until one succeeds."""
    api_key = os.getenv("OPENROUTER_API_KEY")
    if not api_key:
        raise ValueError("OPENROUTER_API_KEY environment variable is not set")

    prompt = f"""You are a professional resume optimization consultant specializing in matching
resumes to job descriptions for English-speaking markets.

Analyze the candidate's resume against the provided job description and return
specific, actionable improvement suggestions.

Rules:
1. Return ONLY valid JSON — no extra text, no markdown code fences
2. Every suggestion must include the exact original text and the recommended replacement
3. Tailor suggestions to keywords and requirements in the JD
4. Provide a maximum of 10 suggestions, prioritized by impact
5. Never fabricate experience — only reframe or expand on what already exists
6. Write all suggested text in professional English
7. section must be one of: Summary, Experience, Skills, Education, Other

Resume:
{resume_text}

Job Description:
{job_description}

Return format:
{{
  "match_score": 75,
  "suggestions": [
    {{
      "id": "1",
      "section": "Skills",
      "original": "Familiar with AWS",
      "suggested": "Proficient in AWS services including EC2, S3, VPC, IAM, and CloudFormation",
      "reason": "The JD requires specific AWS service experience. Listing individual services demonstrates hands-on depth.",
      "impact": "high"
    }}
  ]
}}"""

    last_error: str = "No models available"
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
                raise ValueError(f"Model {model} returned non-JSON output: {exc}") from exc

        error = body.get("error", {})
        if isinstance(error, dict):
            last_error = f"{model} error code {error.get('code')}: {error.get('message', '')[:80]}"
            continue

        last_error = f"{model} unknown error"
        continue

    raise ValueError(f"All OpenRouter models failed. Last error: {last_error}")
