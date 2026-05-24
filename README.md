# ResumeAI — AI-Powered Resume Optimizer

An AI-powered web application that analyzes your resume against a job description, generates targeted improvement suggestions, lets you accept or reject each one, and exports a polished PDF.

---

## Features

- **PDF Upload & Parsing** — Upload your existing resume as a PDF; the backend extracts and structures the text automatically.
- **AI Analysis** — Sends your resume and the job description to an LLM (via OpenRouter) for a detailed match analysis.
- **Match Score** — Displays a percentage score showing how well your resume aligns with the job description.
- **Structured Suggestions** — Up to 10 prioritized suggestions, each with the original text, recommended replacement, reason, and impact level (high / medium / low).
- **Accept / Reject per Suggestion** — Toggle each suggestion individually, or use Accept All / Reject All.
- **Live Preview** — A real-time resume preview updates instantly as you accept suggestions or edit content directly.
- **Inline Editor** — Edit every field of your resume (personal info, experience, projects, education, skills) directly in the app.
- **PDF Export** — Generates a clean, professionally formatted A4 PDF with all accepted changes applied.

---

## Tech Stack

| Layer     | Technology |
|-----------|-----------|
| Frontend  | React 18 + TypeScript, Tailwind CSS, Vite |
| Backend   | Python 3.11 + FastAPI |
| AI        | OpenRouter API (multiple free LLM models with fallback) |
| PDF Parse | pdfplumber |
| PDF Export | WeasyPrint |
| HTTP      | Axios (frontend), requests (backend) |

---

## Project Structure

```
resume-optimizer/
├── frontend/
│   ├── src/
│   │   ├── App.tsx              # Main UI — upload, editor, suggestions, preview
│   │   ├── api/
│   │   │   └── resumeApi.ts     # analyzeResume() and exportResume() API calls
│   │   └── types/
│   │       └── index.ts         # Shared TypeScript interfaces
│   └── package.json
├── backend/
│   ├── main.py                  # FastAPI app entry point
│   ├── routers/
│   │   └── resume.py            # /api/analyze and /api/export route handlers
│   ├── services/
│   │   ├── pdf_parser.py        # pdfplumber text extraction
│   │   ├── resume_parser.py     # LLM-based structured resume parsing
│   │   ├── openrouter_service.py # Gemini/LLM suggestion generation
│   │   └── pdf_generator.py     # WeasyPrint HTML-to-PDF generation
│   ├── models/
│   │   └── schemas.py           # Pydantic request/response models
│   └── requirements.txt
├── uploads/                     # Temporary upload storage (auto-cleaned)
├── outputs/                     # Generated PDF storage (auto-cleaned)
└── CLAUDE.md                    # Project conventions for AI assistants
```

---

## Getting Started

### Prerequisites

- Node.js 20+
- Python 3.11+
- An [OpenRouter](https://openrouter.ai) API key (free tier available)

### 1. Clone the repository

```bash
git clone <repo-url>
cd resume-optimizer
```

### 2. Backend setup

```bash
cd backend
python -m venv venv
source venv/bin/activate       # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

Create `backend/.env`:

```env
OPENROUTER_API_KEY=your_openrouter_api_key_here
MAX_FILE_SIZE_MB=10
ALLOWED_ORIGINS=http://localhost:5173
```

Start the backend:

```bash
uvicorn main:app --reload --port 8000
```

### 3. Frontend setup

```bash
cd frontend
npm install
```

Create `frontend/.env`:

```env
VITE_API_BASE_URL=http://localhost:8000
```

Start the frontend:

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## How It Works

```
1. User uploads PDF resume + pastes job description
          ↓
2. Backend extracts text with pdfplumber
          ↓
3. LLM (via OpenRouter) parses resume into structured JSON
          ↓
4. LLM analyzes resume vs. job description → returns suggestions + match score
          ↓
5. Frontend displays live preview, inline editor, and suggestion cards
          ↓
6. User accepts/rejects suggestions (preview updates in real time)
          ↓
7. User clicks Export PDF → backend generates polished A4 PDF via WeasyPrint
          ↓
8. Browser downloads optimized_resume.pdf
```

---

## API Endpoints

### `POST /api/analyze`

Accepts a PDF resume and job description; returns structured resume data and suggestions.

**Request** — `multipart/form-data`

| Field | Type | Description |
|-------|------|-------------|
| `resume` | File | PDF resume (max 10 MB) |
| `job_description` | string | Full job description text |

**Response**

```json
{
  "match_score": 72,
  "suggestions": [
    {
      "id": "1",
      "section": "Skills",
      "original": "Familiar with AWS",
      "suggested": "Proficient in AWS services including EC2, S3, IAM, and CloudFormation",
      "reason": "The JD requires specific AWS experience. Listing services shows hands-on depth.",
      "impact": "high",
      "accepted": false
    }
  ],
  "parsed_resume": { ... }
}
```

### `POST /api/export`

Accepts the final resume data and returns a PDF file.

**Request** — `application/json`

```json
{
  "resume_data": { ... },
  "accepted_suggestions": [ ... ]
}
```

**Response** — `application/pdf` blob

---

## Suggestion Structure

```typescript
interface Suggestion {
  id: string
  section: "Summary" | "Experience" | "Skills" | "Education" | "Other"
  original: string    // Exact text from the resume
  suggested: string   // AI-recommended replacement
  reason: string      // Why this change improves the match
  impact: "high" | "medium" | "low"
  accepted: boolean
}
```

---

## Environment Variables

| Variable | Location | Description |
|----------|----------|-------------|
| `OPENROUTER_API_KEY` | `backend/.env` | OpenRouter API key |
| `MAX_FILE_SIZE_MB` | `backend/.env` | Upload size limit (default: 10) |
| `ALLOWED_ORIGINS` | `backend/.env` | CORS allowed origins |
| `VITE_API_BASE_URL` | `frontend/.env` | Backend base URL |

> Never commit `.env` files — they are listed in `.gitignore`.

---

## LLM Fallback Strategy

The backend tries multiple free OpenRouter models in order and uses the first successful response:

1. `nvidia/nemotron-3-super-120b-a12b:free`
2. `openai/gpt-oss-20b:free`
3. `z-ai/glm-4.5-air:free`
4. `google/gemma-4-31b-it:free`
5. `meta-llama/llama-3.3-70b-instruct:free`
6. `minimax/minimax-m2.5:free`

This ensures high availability even when individual free-tier models are rate-limited.

---

## Development

```bash
# Run backend tests
cd backend && pytest tests/

# Run frontend type check
cd frontend && npm run build

# Lint frontend
cd frontend && npm run lint
```

---

## License

MIT
