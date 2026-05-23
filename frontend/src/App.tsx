import { useState, useRef } from "react"
import { analyzeResume, exportResume } from "./api/resumeApi"
import type { Suggestion, AnalyzeResponse } from "./types"

type AppState = "idle" | "loading" | "results" | "exporting"

const IMPACT_COLORS: Record<Suggestion["impact"], string> = {
  high: "bg-red-100 text-red-700 border-red-200",
  medium: "bg-yellow-100 text-yellow-700 border-yellow-200",
  low: "bg-green-100 text-green-700 border-green-200",
}

function App() {
  const [state, setState] = useState<AppState>("idle")
  const [error, setError] = useState<string | null>(null)
  const [resumeFile, setResumeFile] = useState<File | null>(null)
  const [jobDescription, setJobDescription] = useState("")
  const [result, setResult] = useState<AnalyzeResponse | null>(null)
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null
    setResumeFile(file)
    setError(null)
  }

  const handleAnalyze = async () => {
    if (!resumeFile) return setError("Please upload a PDF resume.")
    if (!jobDescription.trim()) return setError("Please paste a job description.")

    setState("loading")
    setError(null)

    try {
      const data = await analyzeResume(resumeFile, jobDescription)
      setResult(data)
      setSuggestions(data.suggestions)
      setState("results")
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Analysis failed. Please try again."
      setError(msg)
      setState("idle")
    }
  }

  const toggleSuggestion = (id: string) => {
    setSuggestions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, accepted: !s.accepted } : s))
    )
  }

  const acceptAll = () => setSuggestions((prev) => prev.map((s) => ({ ...s, accepted: true })))
  const rejectAll = () => setSuggestions((prev) => prev.map((s) => ({ ...s, accepted: false })))

  const handleExport = async () => {
    if (!result) return
    setState("exporting")
    setError(null)
    try {
      const accepted = suggestions.filter((s) => s.accepted)
      const blob = await exportResume(result.temp_file_id, accepted)
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = "optimized_resume.pdf"
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      setError("Export failed. Please try again.")
    } finally {
      setState("results")
    }
  }

  const handleReset = () => {
    setState("idle")
    setResult(null)
    setSuggestions([])
    setResumeFile(null)
    setJobDescription("")
    setError(null)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const acceptedCount = suggestions.filter((s) => s.accepted).length

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Resume Optimizer</h1>
          <p className="text-sm text-gray-500">Powered by Google Gemini AI — Free</p>
        </div>
        {state === "results" && (
          <button
            onClick={handleReset}
            className="text-sm text-gray-500 hover:text-gray-800 underline"
          >
            Start Over
          </button>
        )}
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Match Score Bar */}
        {state === "results" && result && (
          <div className="mb-6 bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-6">
            <div className="flex items-center gap-3">
              <span className="text-4xl font-bold text-indigo-600">{result.match_score}%</span>
              <div>
                <div className="font-semibold text-gray-800">Resume Match Score</div>
                <div className="text-sm text-gray-500">
                  {acceptedCount} of {suggestions.length} suggestions accepted
                </div>
              </div>
            </div>
            <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-500 rounded-full transition-all"
                style={{ width: `${result.match_score}%` }}
              />
            </div>
            <div className="flex gap-2 ml-4">
              <button
                onClick={acceptAll}
                className="text-xs px-3 py-1.5 bg-green-50 text-green-700 border border-green-200 rounded-lg hover:bg-green-100"
              >
                Accept All
              </button>
              <button
                onClick={rejectAll}
                className="text-xs px-3 py-1.5 bg-red-50 text-red-700 border border-red-200 rounded-lg hover:bg-red-100"
              >
                Reject All
              </button>
              <button
                onClick={handleExport}
                disabled={state === "exporting" || acceptedCount === 0}
                className="text-xs px-4 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed font-medium"
              >
                {state === "exporting" ? "Exporting…" : "Export PDF"}
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Panel — Upload */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 flex flex-col gap-5">
            <h2 className="text-lg font-semibold text-gray-900">Upload & Analyze</h2>

            {/* PDF Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Resume (PDF)
              </label>
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50 transition-colors"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  onChange={handleFileChange}
                  className="hidden"
                />
                {resumeFile ? (
                  <div>
                    <div className="text-indigo-600 font-medium">{resumeFile.name}</div>
                    <div className="text-xs text-gray-400 mt-1">
                      {(resumeFile.size / 1024 / 1024).toFixed(2)} MB — click to change
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="text-gray-400 text-3xl mb-2">📄</div>
                    <div className="text-sm text-gray-500">
                      Click to upload PDF <span className="text-gray-400">(max 10 MB)</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Job Description */}
            <div className="flex-1 flex flex-col">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Job Description
              </label>
              <textarea
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                placeholder="Paste the full job description here…"
                rows={12}
                className="flex-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
              />
            </div>

            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            <button
              onClick={handleAnalyze}
              disabled={state === "loading" || !resumeFile || !jobDescription.trim()}
              className="w-full py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {state === "loading" ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Analyzing with Gemini…
                </span>
              ) : (
                "Analyze Resume"
              )}
            </button>
          </div>

          {/* Right Panel — Suggestions */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-5">
              {state === "idle" && "Suggestions will appear here"}
              {state === "loading" && "Analyzing your resume…"}
              {(state === "results" || state === "exporting") &&
                `${suggestions.length} Suggestions`}
            </h2>

            {state === "idle" && (
              <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                <div className="text-5xl mb-3">✨</div>
                <p className="text-sm text-center">
                  Upload your resume and paste a job description,<br />
                  then click <span className="font-medium text-gray-600">Analyze Resume</span>.
                </p>
              </div>
            )}

            {state === "loading" && (
              <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                <svg className="animate-spin h-8 w-8 text-indigo-500 mb-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                <p className="text-sm">Gemini is analyzing your resume…</p>
              </div>
            )}

            {(state === "results" || state === "exporting") && (
              <div className="flex flex-col gap-4 overflow-y-auto max-h-[70vh] pr-1">
                {suggestions.map((s) => (
                  <div
                    key={s.id}
                    className={`border rounded-xl p-4 transition-all ${
                      s.accepted
                        ? "border-green-300 bg-green-50"
                        : "border-gray-200 bg-white"
                    }`}
                  >
                    {/* Header row */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                          {s.section}
                        </span>
                        <span
                          className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${IMPACT_COLORS[s.impact]}`}
                        >
                          {s.impact} impact
                        </span>
                      </div>
                      <button
                        onClick={() => toggleSuggestion(s.id)}
                        className={`text-xs px-3 py-1 rounded-lg font-medium transition-colors ${
                          s.accepted
                            ? "bg-green-600 text-white hover:bg-red-500"
                            : "bg-gray-100 text-gray-700 hover:bg-green-100 hover:text-green-700"
                        }`}
                      >
                        {s.accepted ? "✓ Accepted — click to reject" : "Accept"}
                      </button>
                    </div>

                    {/* Original */}
                    <div className="mb-2">
                      <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">Original</div>
                      <p className="text-sm text-gray-700 bg-red-50 border border-red-100 rounded px-2 py-1.5">
                        {s.original}
                      </p>
                    </div>

                    {/* Suggested */}
                    <div className="mb-2">
                      <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">Suggested</div>
                      <p className="text-sm text-gray-800 font-medium bg-green-50 border border-green-100 rounded px-2 py-1.5">
                        {s.suggested}
                      </p>
                    </div>

                    {/* Reason */}
                    <div className="text-xs text-gray-500 bg-gray-50 rounded px-2 py-1.5">
                      <span className="font-medium">Why: </span>{s.reason}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

export default App
