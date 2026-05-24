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

    errors = []
    print(f"\n[resume_parser] Parsing resume into sections...")
    print(f"[resume_parser] Resume length: {len(resume_text)} chars")

    for index, model in enumerate(MODELS):
        print(f"[resume_parser] Attempt {index + 1}/{len(MODELS)}: {model}")
        try:
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

            print(f"[resume_parser] HTTP status: {response.status_code}")
            body = response.json()

            if "choices" in body:
                raw = body["choices"][0]["message"]["content"].strip()
                raw = re.sub(r"^```(?:json)?\s*", "", raw)
                raw = re.sub(r"\s*```$", "", raw)
                result = json.loads(raw.strip())
                print(f"[resume_parser] ✅ SUCCESS with {model}")
                print(f"[resume_parser] Name: {result.get('name')}")
                print(f"[resume_parser] Experience entries: {len(result.get('experience', []))}")
                print(f"[resume_parser] Projects entries: {len(result.get('projects', []))}")
                return result

            error = body.get("error", {})
            code = error.get("code") if isinstance(error, dict) else "unknown"
            msg = str(error.get("message", ""))[:80] if isinstance(error, dict) else ""
            print(f"[resume_parser] ❌ FAILED: code={code} msg={msg}")
            errors.append(f"{model}: code={code}")

        except json.JSONDecodeError as exc:
            print(f"[resume_parser] ❌ JSON parse error: {exc}")
            errors.append(f"{model}: json error")

        except Exception as e:
            print(f"[resume_parser] ❌ Exception: {str(e)}")
            errors.append(f"{model}: {str(e)}")

    print(f"[resume_parser] ❌ ALL MODELS FAILED: {errors}")
    raise ValueError(f"All models failed: {'; '.join(errors)}")
