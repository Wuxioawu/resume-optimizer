# Resume Optimizer Project — CLAUDE.md

## Project Overview
An AI-powered resume optimization tool. Users upload a Job Description and their existing resume (PDF format).
The system uses the Claude API to analyze the match, generates structured modification suggestions,
allows users to accept or reject each suggestion individually, and exports a final editable PDF.

---

## Tech Stack

### Frontend
- React 18 + TypeScript
- Tailwind CSS (styling)
- PDF.js (PDF preview)
- pdf-lib (PDF editing/export)
- Axios (API requests)

### Backend
- Python 3.11 + FastAPI
- pdfplumber (PDF text extraction)
- reportlab (PDF generation)
- PyMuPDF / fitz (PDF editing)
- Google Gemini API (gemini-1.5-flash) — FREE
- python-multipart (file uploads)

### Dev Tools
- Node.js 20+
- Python venv
- Docker (optional)

---

## Project Structure

```
resume-optimizer/
├── CLAUDE.md                        # This file
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── UploadPanel.tsx      # File upload area
│   │   │   ├── SuggestionPanel.tsx  # Suggestions list panel
│   │   │   ├── PDFViewer.tsx        # PDF preview component
│   │   │   └── ExportButton.tsx     # Export to PDF button
│   │   ├── api/
│   │   │   └── resumeApi.ts         # API call functions
│   │   ├── types/
│   │   │   └── index.ts             # TypeScript type definitions
│   │   └── App.tsx
│   └── package.json
├── backend/
│   ├── main.py                      # FastAPI entry point
│   ├── routers/
│   │   └── resume.py                # Resume-related routes
│   ├── services/
│   │   ├── pdf_parser.py            # PDF parsing service
│   │   ├── gemini_service.py        # Gemini API service
│   │   └── pdf_generator.py         # PDF generation service
│   ├── models/
│   │   └── schemas.py               # Pydantic data models
│   └── requirements.txt
├── uploads/                         # Temp uploaded files (excluded from git)
└── outputs/                         # Generated resumes (excluded from git)
```

---

## Core Feature Flow

```
User uploads PDF resume + Job Description text
              ↓
Backend: pdfplumber extracts resume text
              ↓
Backend: calls Gemini API for analysis
              ↓
Gemini returns structured suggestions (JSON format)
Each suggestion contains:
  - section:   which part to modify (e.g. "Work Experience")
  - original:  original text
  - suggested: recommended replacement text
  - reason:    why this change improves the resume
  - impact:    expected impact level (high / medium / low)
              ↓
Frontend: shows original PDF preview + suggestion list side by side
              ↓
User clicks "Accept ✅" or "Reject ❌" for each suggestion
              ↓
User clicks "Export PDF"
              ↓
Backend: merges accepted suggestions and generates new PDF
              ↓
User downloads the final editable PDF
```

---

## API Endpoints

```
POST /api/analyze
  Request:  FormData { resume: File, job_description: string }
  Response: { suggestions: Suggestion[], resume_text: string, match_score: number }

POST /api/export
  Request:  { resume_text: string, accepted_suggestions: Suggestion[] }
  Response: PDF file (blob)
```

### Suggestion Data Structure
```typescript
interface Suggestion {
  id: string
  section: "Summary" | "Experience" | "Skills" | "Education" | "Other"
  original: string       // Original text from resume
  suggested: string      // AI-recommended replacement
  reason: string         // Why this change helps
  impact: "high" | "medium" | "low"
  accepted: boolean      // Whether the user accepted this suggestion
}
```

---

## Gemini API Prompt Template

Use the following prompt when calling `google-generativeai` to analyze resumes:

```python
import google.generativeai as genai

genai.configure(api_key=GEMINI_API_KEY)
model = genai.GenerativeModel("gemini-1.5-flash")

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

response = model.generate_content(prompt)
```

---

## Common Commands

```bash
# Start backend
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000

# Start frontend
cd frontend
npm install
npm run dev

# Run backend tests
cd backend && pytest tests/

# Run frontend tests
cd frontend && npm test

# Build for production
cd frontend && npm run build
```

---

## Environment Variables

```bash
# backend/.env  (NEVER commit this file!)
GEMINI_API_KEY=your_api_key_here
MAX_FILE_SIZE_MB=10
ALLOWED_ORIGINS=http://localhost:5173

# frontend/.env
VITE_API_BASE_URL=http://localhost:8000
```

---

## Coding Standards

- **Python**: Follow PEP8; all functions must have docstrings; full type annotations required
- **TypeScript**: Strict mode enabled; all variables must be typed
- **Component naming**: PascalCase (e.g. `SuggestionCard`)
- **API function naming**: camelCase (e.g. `analyzeResume`)
- **Styling**: Tailwind only — avoid custom CSS unless absolutely necessary
- **Comments**: English preferred; critical logic must be commented
- **Resume language**: All AI-generated resume content must be in professional English

---

## Important Rules

⚠️  **Never do the following:**
- Never hard-code the GEMINI_API_KEY anywhere in the codebase
- Never permanently store user-uploaded files (delete within 1 hour of processing)
- Never call the Gemini API directly from the frontend (always go through the backend)
- Never modify files inside uploads/ or outputs/ directly (these are user data)
- Never remove any dependency from requirements.txt without checking all usages

✅  **After every code change, verify:**
- Backend API still returns valid JSON matching the Suggestion interface
- File upload size limit (max 10MB) is enforced
- PDF export produces a valid, editable PDF file
- No API keys are exposed in logs or responses

---

## Development Checklist

- [ ] PDF upload and text extraction (backend)
- [ ] Gemini API integration and suggestion generation
- [ ] Suggestion display UI (frontend)
- [ ] Accept / Reject interaction per suggestion
- [ ] PDF export with accepted changes applied
- [ ] Error handling and loading states
- [ ] File cleanup after processing

---

## Reference Links

- Gemini API Docs:     https://ai.google.dev/gemini-api/docs
- google-generativeai: https://pypi.org/project/google-generativeai
- FastAPI Docs:        https://fastapi.tiangolo.com
- pdf-lib Docs:        https://pdf-lib.js.org
- pdfplumber GitHub:   https://github.com/jsvine/pdfplumber
- PDF.js Docs:         https://mozilla.github.io/pdf.js
