import os
import json
import re
import requests

MODELS = [
    "nvidia/nemotron-3-super-120b-a12b:free",
    "openai/gpt-oss-20b:free",
    "z-ai/glm-4.5-air:free",
    "google/gemma-4-31b-it:free",
    "meta-llama/llama-3.3-70b-instruct:free",
    "minimax/minimax-m2.5:free",
]


def call_openrouter(messages: list[dict], api_key: str) -> str:
    """Try each model in order until one succeeds."""
    errors = []
    print(f"\n{'='*50}")
    print(f"[openrouter] Starting request, trying {len(MODELS)} models...")
    print(f"{'='*50}")

    for index, model in enumerate(MODELS):
        print(f"\n[openrouter] Attempt {index + 1}/{len(MODELS)}: {model}")
        try:
            print(f"[openrouter] Sending request...")
            response = requests.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                json={"model": model, "messages": messages},
                timeout=120,
            )
            print(f"[openrouter] HTTP status: {response.status_code}")
            body = response.json()

            if "choices" in body:
                content = body["choices"][0]["message"]["content"].strip()
                print(f"[openrouter] ✅ SUCCESS with {model}")
                print(f"[openrouter] Response length: {len(content)} chars")
                print(f"[openrouter] Response preview: {content[:100]}...")
                return content

            # Failed - log the error and try next model
            error = body.get("error", {})
            error_code = error.get("code", "unknown")
            error_msg = str(error.get("message", ""))[:100]
            print(f"[openrouter] ❌ FAILED: code={error_code} msg={error_msg}")
            print(f"[openrouter] → Switching to next model...")
            errors.append(f"{model}: code={error_code}")

        except requests.exceptions.Timeout:
            print(f"[openrouter] ❌ TIMEOUT after 120s for {model}")
            print(f"[openrouter] → Switching to next model...")
            errors.append(f"{model}: timeout")

        except Exception as e:
            print(f"[openrouter] ❌ EXCEPTION for {model}: {str(e)}")
            print(f"[openrouter] → Switching to next model...")
            errors.append(f"{model}: {str(e)}")

    print(f"\n[openrouter] ❌ ALL {len(MODELS)} MODELS FAILED")
    print(f"[openrouter] Errors: {errors}")
    print(f"{'='*50}\n")
    raise ValueError(f"All models failed: {'; '.join(errors)}")


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
7. section must be one of: Summary, Experience, Skills, Education, Other
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
