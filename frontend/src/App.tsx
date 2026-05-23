import { useState, useRef, useEffect } from "react"
import type { LucideIcon } from "lucide-react"
import {
  Sparkles, ExternalLink, Star, FileText, Zap, Target, TrendingUp,
  Upload, CheckCircle, Briefcase, Loader2, Award, CheckSquare,
  CheckCheck, X, Download, Lightbulb, Flame, Minus, ArrowRight,
  Info, ThumbsUp, Bot, Heart,
} from "lucide-react"
import { analyzeResume, exportResume } from "./api/resumeApi"
import type { Suggestion, AnalyzeResponse } from "./types"

type AppState = "idle" | "loading" | "results" | "exporting"

const CIRCUMFERENCE = 2 * Math.PI * 45

const SECTION_COLORS: Record<string, string> = {
  Summary:    "bg-[#eef2ff] text-[#4f46e5] border-[#c7d2fe]",
  Experience: "bg-[#f5f3ff] text-[#7c3aed] border-[#ddd6fe]",
  Skills:     "bg-[#f0f9ff] text-[#0284c7] border-[#bae6fd]",
  Education:  "bg-[#ecfdf5] text-[#059669] border-[#a7f3d0]",
  Other:      "bg-[#f8fafc] text-[#64748b] border-[#e2e8f0]",
}

const IMPACT_CONFIG: Record<
  Suggestion["impact"],
  { icon: LucideIcon; cls: string }
> = {
  high:   { icon: Flame, cls: "text-[#dc2626] bg-[#fef2f2] border-[#fecaca]" },
  medium: { icon: Zap,   cls: "text-[#d97706] bg-[#fffbeb] border-[#fde68a]" },
  low:    { icon: Minus, cls: "text-[#16a34a] bg-[#f0fdf4] border-[#bbf7d0]" },
}

const EMPTY_STEPS: { icon: LucideIcon; text: string }[] = [
  { icon: Upload,      text: "Upload your resume PDF" },
  { icon: FileText,    text: "Paste the job description" },
  { icon: Sparkles,    text: "Click Analyze" },
  { icon: CheckCircle, text: "Accept suggestions you like" },
  { icon: Download,    text: "Export optimized PDF" },
]

function App() {
  const [state, setState] = useState<AppState>("idle")
  const [error, setError] = useState<string | null>(null)
  const [resumeFile, setResumeFile] = useState<File | null>(null)
  const [jobDescription, setJobDescription] = useState("")
  const [result, setResult] = useState<AnalyzeResponse | null>(null)
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [poppingId, setPoppingId] = useState<string | null>(null)
  const [displayScore, setDisplayScore] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (result) {
      const t = setTimeout(() => setDisplayScore(result.match_score), 120)
      return () => clearTimeout(t)
    }
    setDisplayScore(0)
  }, [result])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setResumeFile(e.target.files?.[0] ?? null)
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
      setError(err instanceof Error ? err.message : "Analysis failed. Please try again.")
      setState("idle")
    }
  }

  const toggleSuggestion = (id: string) => {
    setSuggestions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, accepted: !s.accepted } : s))
    )
    setPoppingId(id)
    setTimeout(() => setPoppingId(null), 300)
  }

  const acceptAll = () => setSuggestions((prev) => prev.map((s) => ({ ...s, accepted: true })))
  const rejectAll = () => setSuggestions((prev) => prev.map((s) => ({ ...s, accepted: false })))

  const handleExport = async () => {
    if (!result) return
    setState("exporting")
    setError(null)
    try {
      const accepted = suggestions.filter((s) => s.accepted)
      const blob = await exportResume(result.temp_file_id, result.resume_text, accepted)
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
  const scoreOffset = CIRCUMFERENCE * (1 - displayScore / 100)
  const hasResults = state === "results" || state === "exporting"

  return (
    <div className="min-h-screen bg-[#f8fafc] text-[#0f172a] flex flex-col">

      {/* ── Background mesh ── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden>
        <div className="absolute -top-32 left-1/4 w-[700px] h-[700px] rounded-full bg-[#6366f1]/5 blur-[130px]" />
        <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] rounded-full bg-[#8b5cf6]/5 blur-[130px]" />
      </div>

      {/* ── Header ── */}
      <header className="sticky top-0 z-50 bg-white border-b border-[#e2e8f0]"
        style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}
      >
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 bg-[#6366f1] blur-md opacity-20 rounded-full scale-[2]" />
              <Sparkles className="relative text-[#6366f1]" size={22} />
            </div>
            <div>
              <span className="text-lg font-bold gradient-text">ResumeAI</span>
              <p className="text-[11px] text-[#64748b] leading-none mt-0.5">Powered by AI · Free</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {hasResults && (
              <button
                onClick={handleReset}
                className="px-3 py-1.5 text-xs text-[#64748b] hover:text-[#0f172a] border border-[#e2e8f0] hover:border-[#6366f1]/40 rounded-lg transition-all"
              >
                Start Over
              </button>
            )}
            <a
              href="#"
              className="p-2 rounded-lg border border-[#e2e8f0] hover:border-[#6366f1]/40 text-[#64748b] hover:text-[#6366f1] transition-all"
            >
              <ExternalLink size={15} />
            </a>
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#e2e8f0] hover:border-[#f59e0b]/50 text-[#64748b] hover:text-[#d97706] transition-all text-xs">
              <Star size={12} />
              Star
            </button>
          </div>
        </div>
      </header>

      <main className="relative flex-1 max-w-7xl mx-auto w-full px-4 py-8 flex flex-col gap-6">

        {/* ── Hero ── */}
        {state === "idle" && (
          <div className="text-center py-10">
            <h2 className="text-5xl font-bold text-[#0f172a] mb-3 leading-tight tracking-tight">
              Optimize Your Resume
              <br />
              <span className="gradient-text">with AI</span>
            </h2>
            <p className="text-[#64748b] text-base mb-8 flex items-center justify-center gap-2">
              <FileText size={15} />
              Upload your resume and get instant AI-powered suggestions
            </p>
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <div className="feature-badge"><Zap size={13} />Instant Analysis</div>
              <div className="feature-badge"><Target size={13} />ATS Optimized</div>
              <div className="feature-badge"><TrendingUp size={13} />Higher Match Rate</div>
            </div>
          </div>
        )}

        {/* ── Score bar ── */}
        {hasResults && result && (
          <div
            className="bg-white rounded-2xl border border-[#e2e8f0] p-5"
            style={{
              borderLeft: "4px solid #6366f1",
              boxShadow: "0 1px 8px rgba(99,102,241,0.08), 0 1px 3px rgba(0,0,0,0.05)",
            }}
          >
            <div className="flex flex-wrap items-center gap-6">
              {/* Animated circle */}
              <div className="relative flex-shrink-0">
                <svg width="96" height="96" viewBox="0 0 120 120">
                  <defs>
                    <linearGradient id="score-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#6366f1" />
                      <stop offset="100%" stopColor="#8b5cf6" />
                    </linearGradient>
                  </defs>
                  <circle cx="60" cy="60" r="45" fill="none" stroke="#e2e8f0" strokeWidth="8" />
                  <circle
                    cx="60" cy="60" r="45"
                    fill="none"
                    stroke="url(#score-grad)"
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={CIRCUMFERENCE}
                    strokeDashoffset={scoreOffset}
                    transform="rotate(-90 60 60)"
                    className="score-ring"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-lg font-bold gradient-text">{displayScore}%</span>
                </div>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-[180px]">
                <div className="flex items-center gap-2 mb-2.5">
                  <Award size={15} className="text-[#6366f1]" />
                  <span className="font-semibold text-[#0f172a] text-sm">Resume Match Score</span>
                </div>
                <div className="w-full h-2 bg-[#e2e8f0] rounded-full overflow-hidden mb-2">
                  <div
                    className="h-full rounded-full transition-all duration-[1200ms] ease-out"
                    style={{
                      width: `${displayScore}%`,
                      background: "linear-gradient(90deg, #6366f1, #8b5cf6)",
                      boxShadow: "0 0 8px rgba(99,102,241,0.35)",
                    }}
                  />
                </div>
                <div className="flex items-center gap-1.5 text-xs text-[#64748b]">
                  <CheckSquare size={11} />
                  {acceptedCount} of {suggestions.length} suggestions accepted
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
                <button
                  onClick={acceptAll}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#6366f1]/30 text-[#6366f1] hover:bg-[#eef2ff] transition-all text-xs font-medium hover:scale-[1.02]"
                >
                  <CheckCheck size={12} />Accept All
                </button>
                <button
                  onClick={rejectAll}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#e2e8f0] text-[#64748b] hover:bg-[#f8fafc] transition-all text-xs font-medium hover:scale-[1.02]"
                >
                  <X size={12} />Reject All
                </button>
                <button
                  onClick={handleExport}
                  disabled={state === "exporting" || acceptedCount === 0}
                  className="btn-shimmer flex items-center gap-1.5 px-4 py-2 rounded-lg text-white text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.97] transition-all"
                  style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}
                >
                  <Download size={12} />
                  {state === "exporting" ? "Exporting…" : "Export PDF"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Two-column grid ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1">

          {/* Left: Upload */}
          <div
            className="bg-white rounded-2xl border border-[#e2e8f0] p-6 flex flex-col gap-5 card-glow"
            style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}
          >
            <div className="flex items-center gap-2">
              <Upload size={15} className="text-[#6366f1]" />
              <h2 className="text-sm font-semibold text-[#0f172a]">Upload Resume</h2>
            </div>

            {/* Drop zone */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all group ${
                resumeFile
                  ? "border-[#10b981]/40 bg-[#f0fdf4]"
                  : "border-[#e2e8f0] hover:border-[#6366f1]/40 bg-[#f8fafc] hover:bg-[#eef2ff]"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                onChange={handleFileChange}
                className="hidden"
              />
              {resumeFile ? (
                <div className="flex flex-col items-center gap-2">
                  <CheckCircle className="text-[#10b981]" size={30} />
                  <div className="text-[#0f172a] font-medium text-sm truncate max-w-full px-4">
                    {resumeFile.name}
                  </div>
                  <div className="text-[#64748b] text-xs">
                    {(resumeFile.size / 1024 / 1024).toFixed(2)} MB · click to change
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <FileText
                    className="text-[#6366f1] group-hover:text-[#4f46e5] transition-colors"
                    size={34}
                  />
                  <div className="text-[#0f172a] text-sm font-medium">Drop your PDF here</div>
                  <div className="text-[#64748b] text-xs">or click to browse</div>
                  <div className="text-[#94a3b8] text-xs mt-0.5">Max 10 MB</div>
                </div>
              )}
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3 text-[#94a3b8] text-xs">
              <div className="flex-1 h-px bg-[#e2e8f0]" />
              <span>or</span>
              <div className="flex-1 h-px bg-[#e2e8f0]" />
            </div>

            {/* Job description */}
            <div className="flex flex-col gap-2 flex-1">
              <div className="flex items-center gap-2">
                <Briefcase size={12} className="text-[#6366f1]" />
                <label className="text-[11px] font-semibold text-[#64748b] uppercase tracking-widest">
                  Job Description
                </label>
                {jobDescription.length > 0 && (
                  <span className="ml-auto text-[11px] text-[#94a3b8]">
                    {jobDescription.length} chars
                  </span>
                )}
              </div>
              <textarea
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                placeholder="Paste the full job description here…"
                rows={10}
                className="w-full bg-[#f8fafc] border border-[#e2e8f0] rounded-xl px-4 py-3 text-sm text-[#0f172a] placeholder-[#94a3b8] resize-none focus:outline-none focus:border-[#6366f1]/50 focus:ring-1 focus:ring-[#6366f1]/15 transition-all"
              />
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-start gap-2 text-xs text-[#dc2626] bg-[#fef2f2] border border-[#fecaca] rounded-xl px-4 py-3">
                <X size={13} className="flex-shrink-0 mt-0.5" />
                {error}
              </div>
            )}

            {/* Analyze button */}
            <button
              onClick={handleAnalyze}
              disabled={state === "loading" || !resumeFile || !jobDescription.trim()}
              className="btn-shimmer w-full py-3 rounded-xl text-white font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:scale-[1.01] active:scale-[0.98] transition-all"
              style={{
                background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                boxShadow: "0 2px 8px rgba(99,102,241,0.3)",
              }}
            >
              {state === "loading" ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 size={15} className="animate-spin" />
                  Analyzing...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <Sparkles size={15} />
                  Analyze with AI
                </span>
              )}
            </button>
          </div>

          {/* Right: Suggestions */}
          <div
            className="bg-white rounded-2xl border border-[#e2e8f0] p-6 flex flex-col card-glow"
            style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}
          >
            <div className="flex items-center gap-2 mb-5">
              <Lightbulb size={15} className="text-[#6366f1]" />
              <h2 className="text-sm font-semibold text-[#0f172a]">
                {state === "loading" ? "Analyzing…" : "AI Suggestions"}
              </h2>
              {suggestions.length > 0 && (
                <span className="ml-auto px-2 py-0.5 text-[11px] rounded-full bg-[#eef2ff] text-[#6366f1] border border-[#c7d2fe]">
                  {suggestions.length}
                </span>
              )}
            </div>

            {/* Empty state */}
            {state === "idle" && (
              <div className="flex flex-col items-center justify-center flex-1 py-10 text-center">
                <div className="pulse-glow mb-6">
                  <Bot size={50} className="text-[#6366f1]" />
                </div>
                <h3 className="text-[#0f172a] font-semibold mb-5 text-sm">Ready to optimize</h3>
                <div className="flex flex-col gap-3 text-left w-full max-w-[260px]">
                  {EMPTY_STEPS.map(({ icon: Icon, text }, i) => (
                    <div key={i} className="flex items-center gap-3 text-xs text-[#64748b]">
                      <div className="w-5 h-5 rounded-full bg-[#eef2ff] flex items-center justify-center flex-shrink-0 text-[10px] text-[#6366f1] font-bold border border-[#c7d2fe]">
                        {i + 1}
                      </div>
                      <Icon size={12} className="text-[#6366f1] flex-shrink-0" />
                      <span>{text}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Loading state */}
            {state === "loading" && (
              <div className="flex flex-col items-center justify-center flex-1 py-10 gap-5">
                <div className="relative">
                  <div className="absolute inset-0 bg-[#6366f1]/10 blur-xl rounded-full scale-[2]" />
                  <Loader2 size={40} className="relative text-[#6366f1] animate-spin" />
                </div>
                <p className="text-[#64748b] text-sm">AI is analyzing your resume…</p>
              </div>
            )}

            {/* Suggestion cards */}
            {hasResults && (
              <div className="flex flex-col gap-3 overflow-y-auto max-h-[65vh] pr-1 styled-scroll">
                {suggestions.map((s, i) => {
                  const sectionCls = SECTION_COLORS[s.section] ?? SECTION_COLORS["Other"]
                  const { icon: ImpactIcon, cls: impactCls } = IMPACT_CONFIG[s.impact]

                  return (
                    <div
                      key={s.id}
                      className={`suggestion-card rounded-xl border p-4 slide-in ${
                        s.accepted
                          ? "border-[#a7f3d0] bg-[#f0fdf4]"
                          : "border-[#e2e8f0] bg-white"
                      }`}
                      style={{ animationDelay: `${i * 45}ms` }}
                    >
                      {/* Header row */}
                      <div className="flex items-center justify-between mb-3 gap-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${sectionCls}`}>
                            {s.section}
                          </span>
                          <span className={`flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${impactCls}`}>
                            <ImpactIcon size={9} />
                            {s.impact}
                          </span>
                        </div>
                        <button
                          onClick={() => toggleSuggestion(s.id)}
                          className={`flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-lg font-medium transition-all flex-shrink-0 hover:scale-[1.03] active:scale-[0.95] ${
                            poppingId === s.id ? "pop" : ""
                          } ${
                            s.accepted
                              ? "bg-[#6366f1] text-white hover:bg-[#4f46e5]"
                              : "border border-[#e2e8f0] text-[#6366f1] hover:border-[#6366f1] hover:bg-[#eef2ff]"
                          }`}
                        >
                          {s.accepted ? (
                            <><CheckCircle size={11} />Accepted</>
                          ) : (
                            <><ThumbsUp size={11} />Accept</>
                          )}
                        </button>
                      </div>

                      {/* Original */}
                      <div className="mb-2">
                        <div className="flex items-center gap-1 text-[10px] text-[#dc2626]/70 uppercase tracking-widest mb-1">
                          <ArrowRight size={8} />Original
                        </div>
                        <p className="text-[11px] text-[#64748b] bg-[#fef2f2] border border-[#fecaca]/60 rounded-lg px-3 py-2 leading-relaxed">
                          {s.original}
                        </p>
                      </div>

                      {/* Suggested */}
                      <div className="mb-2">
                        <div className="flex items-center gap-1 text-[10px] text-[#16a34a]/70 uppercase tracking-widest mb-1">
                          <Sparkles size={8} />Suggested
                        </div>
                        <p className="text-[11px] text-[#166534] bg-[#f0fdf4] border border-[#bbf7d0]/60 rounded-lg px-3 py-2 leading-relaxed font-medium">
                          {s.suggested}
                        </p>
                      </div>

                      {/* Reason */}
                      <div className="flex items-start gap-1.5 text-[10px] text-[#64748b] bg-[#f8fafc] border border-[#e2e8f0] rounded-lg px-3 py-2">
                        <Info size={10} className="mt-0.5 flex-shrink-0 text-[#6366f1]" />
                        <span className="leading-relaxed">{s.reason}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-[#e2e8f0] bg-[#f8fafc] py-5 flex items-center justify-center gap-1.5 text-[11px] text-[#64748b]">
        Made with
        <Heart size={11} className="text-[#6366f1] fill-[#6366f1]" />
        using AI
        <span className="mx-1.5 text-[#cbd5e1]">·</span>
        <ExternalLink size={11} />
        Open Source
      </footer>
    </div>
  )
}

export default App
