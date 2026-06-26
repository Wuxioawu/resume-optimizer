import os
import json
import re
import requests
from concurrent.futures import ThreadPoolExecutor, as_completed

MODELS = [
    "nvidia/nemotron-3-super-120b-a12b:free",
    "openai/gpt-oss-20b:free",
    "z-ai/glm-4.5-air:free",
    "google/gemma-4-31b-it:free",
    "meta-llama/llama-3.3-70b-instruct:free",
    "minimax/minimax-m2.5:free",
]

_MODEL_TIMEOUT = 30  # seconds per model; racing means we don't need to wait 120s


def _try_model(model: str, messages: list[dict], api_key: str) -> str | None:
    """Send one request. Returns response content on success, None on failure."""
    try:
        response = requests.post(
            "https://openrouter.ai/api/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json={"model": model, "messages": messages},
            timeout=_MODEL_TIMEOUT,
        )
        body = response.json()
        if "choices" in body:
            return body["choices"][0]["message"]["content"].strip()
        error = body.get("error", {})
        print(f"[openrouter] ❌ {model}: {error.get('code')} {str(error.get('message', ''))[:80]}")
        return None
    except requests.exceptions.Timeout:
        print(f"[openrouter] ❌ {model}: timeout after {_MODEL_TIMEOUT}s")
        return None
    except Exception as exc:
        print(f"[openrouter] ❌ {model}: {exc}")
        return None


def call_openrouter(messages: list[dict], api_key: str) -> str:
    """Fire all models concurrently; return the first successful response."""
    print(f"[openrouter] Racing {len(MODELS)} models concurrently (timeout={_MODEL_TIMEOUT}s each)...")

    with ThreadPoolExecutor(max_workers=len(MODELS)) as executor:
        futures = {
            executor.submit(_try_model, model, messages, api_key): model
            for model in MODELS
        }
        for future in as_completed(futures):
            result = future.result()
            if result is not None:
                winner = futures[future]
                print(f"[openrouter] ✅ Winner: {winner} ({len(result)} chars)")
                return result

    raise ValueError(f"All {len(MODELS)} models failed or timed out")


def rewrite_resume(parsed_dict: dict, instruction: str, job_description: str) -> list[dict]:
    """Call OpenRouter to generate targeted rewrite suggestions from a user instruction."""
    api_key = os.getenv("OPENROUTER_API_KEY")
    if not api_key:
        raise ValueError("OPENROUTER_API_KEY is not set")

    resume_json = json.dumps(parsed_dict, indent=2)
    jd_block = f"\n\nJob Description:\n{job_description}" if job_description.strip() else ""

    prompt = f"""You are a professional resume optimization consultant for English-speaking job markets.

The user wants to improve their resume with this specific instruction: "{instruction}"

Rules:
1. Return ONLY valid JSON — no markdown, no code fences, no extra text
2. Every suggestion must include the EXACT original text copied from the resume JSON below
3. Focus ALL suggestions on the user's instruction — do not suggest unrelated changes
4. Maximum 8 suggestions ordered by impact
5. Never fabricate experience — only reframe what already exists
6. All suggested text must be in professional English
7. section must be one of: Summary, Experience, Skills, Education, Projects, Other
8. The original field MUST be copied EXACTLY from the resume text including all spaces

Resume (JSON):
{resume_json}{jd_block}

Return exactly this JSON format:
{{
  "suggestions": [
    {{
      "id": "1",
      "section": "Experience",
      "original": "exact text copied from resume",
      "suggested": "improved version following the instruction",
      "reason": "why this change satisfies the instruction",
      "impact": "high"
    }}
  ]
}}"""

    raw = call_openrouter([{"role": "user", "content": prompt}], api_key)
    raw = re.sub(r"^```(?:json)?\s*", "", raw)
    raw = re.sub(r"\s*```$", "", raw)

    try:
        result = json.loads(raw.strip())
        return result.get("suggestions", [])
    except json.JSONDecodeError as exc:
        raise ValueError(f"Model returned non-JSON: {exc}") from exc


def analyze_resume(resume_text: str, job_description: str) -> dict:
    """Call OpenRouter API to analyze resume against job description."""
    api_key = os.getenv("OPENROUTER_API_KEY")
    if not api_key:
        raise ValueError("OPENROUTER_API_KEY is not set")

    print(f"\n[analyze_resume] Starting analysis...")
    print(f"[analyze_resume] Resume length: {len(resume_text)} chars")
    print(f"[analyze_resume] JD length: {len(job_description)} chars")

    prompt = f"""You are a professional resume optimization consultant for English-speaking job markets.

Analyze the candidate's resume against the job description and return improvement suggestions.

Rules:
1. Return ONLY valid JSON — no markdown, no code fences, no extra text
2. Every suggestion must include the EXACT original text copied from the resume
3. Tailor suggestions to keywords in the job description
4. Maximum 8 suggestions ordered by impact
5. Never fabricate experience — only reframe what already exists
6. All suggested text must be in professional English
7. section must be one of: Summary, Experience, Skills, Education, Projects, Other
8. The original field MUST be copied EXACTLY from the resume text including all spaces

Resume:
{resume_text}

Job Description:
{job_description}

Return exactly this JSON format:
{{
  "match_score": 75,
  "suggestions": [
    {{
      "id": "1",
      "section": "Skills",
      "original": "exact text copied from resume",
      "suggested": "improved version",
      "reason": "why this helps",
      "impact": "high"
    }}
  ]
}}"""

    raw = call_openrouter([{"role": "user", "content": prompt}], api_key)

    # Clean markdown fences if model ignores rule #1
    raw = re.sub(r"^```(?:json)?\s*", "", raw)
    raw = re.sub(r"\s*```$", "", raw)

    print(f"\n[analyze_resume] Parsing JSON response...")
    try:
        result = json.loads(raw.strip())
        print(f"[analyze_resume] ✅ JSON parsed successfully")
        print(f"[analyze_resume] Match score: {result.get('match_score')}")
        print(f"[analyze_resume] Suggestions count: {len(result.get('suggestions', []))}")
        return result
    except json.JSONDecodeError as exc:
        print(f"[analyze_resume] ❌ JSON parse failed: {exc}")
        print(f"[analyze_resume] Raw response: {raw[:200]}")
        raise ValueError(f"Model returned non-JSON: {exc}") from exc
