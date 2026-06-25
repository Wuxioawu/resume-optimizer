# Resume Optimizer Project — CLAUDE.md

## Project Overview
An AI-powered resume optimization tool. Users upload a Job Description and their existing resume (PDF format).
The system uses the OpenRouter API to analyze the match, generates structured modification suggestions,
allows users to accept or reject each suggestion individually, and exports a final PDF.

---

## Tech Stack

### Frontend
- React 19 + TypeScript
- Tailwind CSS (styling)
- Axios (API requests)
- lucide-react (icons)
- Live preview and PDF export are handled entirely server-side and via a custom React component.

### Backend
- Python 3.12 + FastAPI
- pdfplumber (PDF text extraction)
- WeasyPrint (HTML-to-PDF generation)
- OpenRouter API (free-tier multi-model fallback chain)
- python-multipart (file uploads)

### Dev Tools
- Node.js 20+
- Python venv
- Docker (optional)

---

## Project Structure

```
resume-optimizer/
├── CLAUDE.md                          # This file
├── frontend/
│   ├── src/
│   │   ├── App.tsx                    # Entire UI — upload, editor, preview, suggestions
│   │   ├── api/
│   │   │   └── resumeApi.ts           # analyzeResume() and exportResume() API calls
│   │   └── types/
│   │       └── index.ts               # TypeScript type definitions
│   └── package.json
├── backend/
│   ├── main.py                        # FastAPI entry point + CORS config
│   ├── routers/
│   │   └── resume.py                  # /api/analyze and /api/export routes
│   ├── services/
│   │   ├── pdf_parser.py              # pdfplumber text extraction
│   │   ├── openrouter_service.py      # OpenRouter API + resume analysis prompt
│   │   ├── resume_parser.py           # OpenRouter API + resume structure parsing
│   │   └── pdf_generator.py           # HTML→PDF via WeasyPrint
│   ├── models/
│   │   └── schemas.py                 # Pydantic models (Suggestion, ResumeData, etc.)
│   └── requirements.txt
├── uploads/                           # Temp uploaded files (excluded from git)
└── outputs/                           # Generated resumes (excluded from git)
```

There is no `frontend/src/components/` directory. All UI (upload panel, live preview, inline editor, suggestions panel, export button) lives directly in `App.tsx`.

---

## Core Feature Flow

```
User uploads PDF resume + Job Description text
              ↓
Backend: pdfplumber extracts raw resume text
              ↓
Backend (resume_parser.py): OpenRouter call parses raw text → structured ResumeData
              ↓
Backend (openrouter_service.py): OpenRouter call generates improvement suggestions
              ↓
Both results returned to frontend in a single AnalyzeResponse
              ↓
Frontend: three-panel layout —
  Left (40%):  Live preview (custom ResumePreview component in App.tsx)
  Middle (30%): Inline editor (Personal / Experience / Projects / Education / Skills tabs)
  Right (30%): AI suggestions list
              ↓
User clicks "Accept" / toggles each suggestion — preview updates instantly in-browser
User may also manually edit fields in the editor
              ↓
User clicks "Export PDF"
              ↓
Backend: renders the submitted ResumeData as-is via WeasyPrint → PDF
              ↓
User downloads optimized_resume.pdf
```

---

## OpenRouter API Setup

The backend uses OpenRouter's free-tier endpoint with a sequential model fallback chain.
Both `openrouter_service.py` (analysis) and `resume_parser.py` (structure parsing) share the same
model list and try each model in order until one returns a valid response:

```python
MODELS = [
    "nvidia/nemotron-3-super-120b-a12b:free",
    "openai/gpt-oss-20b:free",
    "z-ai/glm-4.5-air:free",
    "google/gemma-4-31b-it:free",
    "meta-llama/llama-3.3-70b-instruct:free",
    "minimax/minimax-m2.5:free",
]
```

All calls go to `https://openrouter.ai/api/v1/chat/completions` with a 120 s timeout per model.
If every model fails, the endpoint raises HTTP 502.

---

## API Endpoints

```
POST /api/analyze
  Request:  FormData { resume: File, job_description: string }
  Response: {
    suggestions:   Suggestion[],
    match_score:   number,          # 0–100
    parsed_resume: ResumeData       # structured resume data
  }

POST /api/export
  Request:  {
    parsed_resume:        ResumeData,   # frontend sends final state (edits + accepted suggestions already applied)
    accepted_suggestions: Suggestion[]  # recorded for reference; backend renders parsed_resume as-is
  }
  Response: PDF file (blob), filename = optimized_resume.pdf
```

### Core Data Structures

```typescript
interface SuggestionLocation {
  kind:         "flat" | "experience" | "projects" | "education"
  field:        string
  index?:       number
  bullet_index?: number
}

interface Suggestion {
  id:        string
  section:   "Summary" | "Experience" | "Skills" | "Education" | "Projects" | "Other"
  original:  string        // exact text copied from resume
  suggested: string        // AI-recommended replacement
  reason:    string        // why this change helps
  impact:    "high" | "medium" | "low"
  accepted:  boolean
  location:  SuggestionLocation | null  // precise slot in ResumeData; null if unresolved
}

interface ResumeData {
  name:       string
  contact:    string
  summary:    string
  experience: ExperienceEntry[]
  projects:   ProjectEntry[]
  education:  EducationEntry[]
  skills:     string
}

interface ExperienceEntry { company: string; title: string; date: string; location: string; bullets: string[] }
interface ProjectEntry    { name: string; role: string; date: string; bullets: string[] }
interface EducationEntry  { school: string; degree: string; date: string; location: string }
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

# Build for production
cd frontend && npm run build
```

---

## Environment Variables

```bash
# backend/.env  (NEVER commit this file!)
OPENROUTER_API_KEY=your_api_key_here
MAX_FILE_SIZE_MB=10
ALLOWED_ORIGINS=http://localhost:5173

# frontend/.env
VITE_API_BASE_URL=http://localhost:8000
```

---

## Coding Standards

- **Python**: Follow PEP8; all functions must have docstrings; full type annotations required
- **TypeScript**: Strict mode enabled; all variables must be typed
- **Component naming**: PascalCase (e.g. `ResumePreview`)
- **API function naming**: camelCase (e.g. `analyzeResume`)
- **Styling**: Tailwind only — avoid custom CSS unless absolutely necessary
- **Comments**: English preferred; critical logic must be commented
- **Resume language**: All AI-generated resume content must be in professional English

---

## Important Rules

⚠️  **Never do the following:**
- Never hard-code the OPENROUTER_API_KEY anywhere in the codebase
- Never permanently store user-uploaded files (delete immediately after text extraction)
- Never call the OpenRouter API directly from the frontend (always go through the backend)
- Never modify files inside uploads/ or outputs/ directly (these are user data)
- Never remove any dependency from requirements.txt without checking all usages

✅  **After every code change, verify:**
- Backend API still returns valid JSON matching the Suggestion and ResumeData interfaces
- File upload size limit (max 10 MB) is enforced
- PDF export produces a valid PDF file
- No API keys are exposed in logs or responses

---

## Development Checklist

- [x] PDF upload and text extraction (backend)
- [x] OpenRouter API integration and suggestion generation
- [x] OpenRouter API integration for resume structure parsing
- [x] Suggestion display UI (frontend)
- [x] Accept / Reject interaction per suggestion
- [x] Live preview panel (ResumePreview component)
- [x] Inline resume editor (tabbed: Personal, Experience, Projects, Education, Skills)
- [x] PDF export via WeasyPrint
- [x] Error handling and loading states
- [x] File cleanup after processing

---

## Reference Links

- OpenRouter Docs:    https://openrouter.ai/docs
- FastAPI Docs:       https://fastapi.tiangolo.com
- WeasyPrint Docs:    https://doc.courtbouillon.org/weasyprint
- pdfplumber GitHub:  https://github.com/jsvine/pdfplumber
