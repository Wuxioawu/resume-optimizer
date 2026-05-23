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
  Summary:    "bg-[#6366f1]/20 text-[#a78bfa]  border-[#6366f1]/30",
  Experience: "bg-[#8b5cf6]/20 text-[#c4b5fd]  border-[#8b5cf6]/30",
  Skills:     "bg-[#0ea5e9]/20 text-[#38bdf8]  border-[#0ea5e9]/30",
  Education:  "bg-[#10b981]/20 text-[#34d399]  border-[#10b981]/30",
  Other:      "bg-[#64748b]/20 text-[#94a3b8]  border-[#64748b]/30",
}

const IMPACT_CONFIG: Record<
  Suggestion["impact"],
  { icon: LucideIcon; cls: string }
> = {
  high:   { icon: Flame,  cls: "text-[#ef4444] bg-[#ef4444]/10 border-[#ef4444]/30" },
  medium: { icon: Zap,    cls: "text-[#f59e0b] bg-[#f59e0b]/10 border-[#f59e0b]/30" },
  low:    { icon: Minus,  cls: "text-[#10b981] bg-[#10b981]/10 border-[#10b981]/30" },
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
  const scoreOffset = CIRCUMFERENCE * (1 - displayScore / 100)
  const hasResults = state === "results" || state === "exporting"

  return (
    <div className="min-h-screen bg-[#050508] text-[#f8fafc] flex flex-col">

      {/* ── Background mesh ── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden>
        <div className="absolute -top-32 left-1/4 w-[700px] h-[700px] rounded-full bg-[#6366f1]/5 blur-[130px]" />
        <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] rounded-full bg-[#8b5cf6]/5 blur-[130px]" />
      </div>

      {/* ── Header ── */}
      <header className="sticky top-0 z-50 border-b border-[#1e1e30] bg-[#0d0d14]/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 bg-[#6366f1] blur-md opacity-50 rounded-full scale-[2]" />
              <Sparkles className="relative text-[#a78bfa]" size={22} />
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
                className="px-3 py-1.5 text-xs text-[#64748b] hover:text-[#f8fafc] border border-[#1e1e30] hover:border-[#6366f1]/40 rounded-lg transition-all"
              >
                Start Over
              </button>
            )}
            <a
              href="#"
              className="p-2 rounded-lg border border-[#1e1e30] hover:border-[#6366f1]/40 text-[#64748b] hover:text-[#f8fafc] transition-all"
            >
              <ExternalLink size={15} />
            </a>
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#1e1e30] hover:border-[#f59e0b]/40 text-[#64748b] hover:text-[#f59e0b] transition-all text-xs">
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
            <h2 className="text-5xl font-bold text-[#f8fafc] mb-3 leading-tight tracking-tight">
              Optimize Your Resume
              <br />
              <span className="gradient-text">with AI</span>
            </h2>
            <p className="text-[#64748b] text-base mb-8 flex items-center justify-center gap-2">
              <FileText size={15} />
              Upload your resume and get instant AI-powered suggestions
            </p>
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <div className="feature-badge"><Zap size={13} className="text-[#6366f1]" />Instant Analysis</div>
              <div className="feature-badge"><Target size={13} className="text-[#6366f1]" />ATS Optimized</div>
              <div className="feature-badge"><TrendingUp size={13} className="text-[#6366f1]" />Higher Match Rate</div>
            </div>
          </div>
        )}

        {/* ── Score bar ── */}
        {hasResults && result && (
          <div
            className="bg-[#12121e] rounded-2xl border border-[#1e1e30] p-5"
            style={{ boxShadow: "0 0 60px rgba(99,102,241,0.07)" }}
          >
            <div className="flex flex-wrap items-center gap-6">
              {/* Animated circle */}
              <div className="relative flex-shrink-0">
                <svg width="96" height="96" viewBox="0 0 120 120">
                  <defs>
                    <linearGradient id="score-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#6366f1" />
                      <stop offset="100%" stopColor="#a78bfa" />
                    </linearGradient>
                  </defs>
                  <circle cx="60" cy="60" r="45" fill="none" stroke="#1e1e30" strokeWidth="8" />
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
                  <Award size={15} className="text-[#a78bfa]" />
                  <span className="font-semibold text-[#f8fafc] text-sm">Resume Match Score</span>
                </div>
                <div className="w-full h-1.5 bg-[#1e1e30] rounded-full overflow-hidden mb-2">
                  <div
                    className="h-full rounded-full transition-all duration-[1200ms] ease-out"
                    style={{
                      width: `${displayScore}%`,
                      background: "linear-gradient(90deg, #6366f1, #a78bfa)",
                      boxShadow: "0 0 12px rgba(99,102,241,0.55)",
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
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#10b981]/30 text-[#10b981] hover:bg-[#10b981]/10 transition-all text-xs font-medium hover:scale-[1.02]"
                >
                  <CheckCheck size={12} />Accept All
                </button>
                <button
                  onClick={rejectAll}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#ef4444]/30 text-[#ef4444] hover:bg-[#ef4444]/10 transition-all text-xs font-medium hover:scale-[1.02]"
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
          <div className="bg-[#12121e] rounded-2xl border border-[#1e1e30] p-6 flex flex-col gap-5 card-glow">
            <div className="flex items-center gap-2">
              <Upload size={15} className="text-[#a78bfa]" />
              <h2 className="text-sm font-semibold text-[#f8fafc]">Upload Resume</h2>
            </div>

            {/* Drop zone */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all group ${
                resumeFile
                  ? "border-[#10b981]/40 bg-[#10b981]/5"
                  : "border-[#1e1e30] hover:border-[#6366f1]/50 bg-[#0d0d14] hover:bg-[#6366f1]/5"
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
                  <div className="text-[#f8fafc] font-medium text-sm truncate max-w-full px-4">
                    {resumeFile.name}
                  </div>
                  <div className="text-[#64748b] text-xs">
                    {(resumeFile.size / 1024 / 1024).toFixed(2)} MB · click to change
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <FileText
                    className="text-[#6366f1] group-hover:text-[#a78bfa] transition-colors"
                    size={34}
                  />
                  <div className="text-[#f8fafc] text-sm font-medium">Drop your PDF here</div>
                  <div className="text-[#64748b] text-xs">or click to browse</div>
                  <div className="text-[#1e1e30] text-xs mt-0.5">Max 10 MB</div>
                </div>
              )}
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3 text-[#64748b] text-xs">
              <div className="flex-1 h-px bg-[#1e1e30]" />
              <span>or</span>
              <div className="flex-1 h-px bg-[#1e1e30]" />
            </div>

            {/* Job description */}
            <div className="flex flex-col gap-2 flex-1">
              <div className="flex items-center gap-2">
                <Briefcase size={12} className="text-[#a78bfa]" />
                <label className="text-[11px] font-semibold text-[#64748b] uppercase tracking-widest">
                  Job Description
                </label>
                {jobDescription.length > 0 && (
                  <span className="ml-auto text-[11px] text-[#64748b]">
                    {jobDescription.length} chars
                  </span>
                )}
              </div>
              <textarea
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                placeholder="Paste the full job description here…"
                rows={10}
                className="w-full bg-[#0d0d14] border border-[#1e1e30] rounded-xl px-4 py-3 text-sm text-[#f8fafc] placeholder-[#3d4a5c] resize-none focus:outline-none focus:border-[#6366f1]/50 focus:ring-1 focus:ring-[#6366f1]/20 transition-all"
              />
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-start gap-2 text-xs text-[#ef4444] bg-[#ef4444]/10 border border-[#ef4444]/20 rounded-xl px-4 py-3">
                <X size={13} className="flex-shrink-0 mt-0.5" />
                {error}
              </div>
            )}

            {/* Analyze button */}
            <button
              onClick={handleAnalyze}
              disabled={state === "loading" || !resumeFile || !jobDescription.trim()}
              className="btn-shimmer w-full py-3 rounded-xl text-white font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:scale-[1.01] active:scale-[0.98] transition-all"
              style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}
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
          <div className="bg-[#12121e] rounded-2xl border border-[#1e1e30] p-6 flex flex-col card-glow">
            <div className="flex items-center gap-2 mb-5">
              <Lightbulb size={15} className="text-[#a78bfa]" />
              <h2 className="text-sm font-semibold text-[#f8fafc]">
                {state === "loading" ? "Analyzing…" : "AI Suggestions"}
              </h2>
              {suggestions.length > 0 && (
                <span className="ml-auto px-2 py-0.5 text-[11px] rounded-full bg-[#6366f1]/20 text-[#a78bfa] border border-[#6366f1]/30">
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
                <h3 className="text-[#f8fafc] font-semibold mb-5 text-sm">Ready to optimize</h3>
                <div className="flex flex-col gap-3 text-left w-full max-w-[260px]">
                  {EMPTY_STEPS.map(({ icon: Icon, text }, i) => (
                    <div key={i} className="flex items-center gap-3 text-xs text-[#64748b]">
                      <div className="w-5 h-5 rounded-full bg-[#1e1e30] flex items-center justify-center flex-shrink-0 text-[10px] text-[#a78bfa] font-bold">
                        {i + 1}
                      </div>
                      <Icon size={12} className="text-[#a78bfa] flex-shrink-0" />
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
                  <div className="absolute inset-0 bg-[#6366f1] blur-xl opacity-30 rounded-full scale-[2]" />
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
                          ? "border-[#10b981]/25 bg-[#10b981]/5"
                          : "border-[#1e1e30] bg-[#0d0d14]"
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
                              ? "bg-[#10b981] text-white hover:bg-[#059669]"
                              : "border border-[#1e1e30] text-[#64748b] hover:border-[#6366f1]/40 hover:text-[#a78bfa]"
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
                        <div className="flex items-center gap-1 text-[10px] text-[#ef4444]/60 uppercase tracking-widest mb-1">
                          <ArrowRight size={8} />Original
                        </div>
                        <p className="text-[11px] text-[#94a3b8] bg-[#ef4444]/5 border border-[#ef4444]/10 rounded-lg px-3 py-2 leading-relaxed">
                          {s.original}
                        </p>
                      </div>

                      {/* Suggested */}
                      <div className="mb-2">
                        <div className="flex items-center gap-1 text-[10px] text-[#10b981]/60 uppercase tracking-widest mb-1">
                          <Sparkles size={8} />Suggested
                        </div>
                        <p className="text-[11px] text-[#f8fafc] bg-[#10b981]/5 border border-[#10b981]/10 rounded-lg px-3 py-2 leading-relaxed font-medium">
                          {s.suggested}
                        </p>
                      </div>

                      {/* Reason */}
                      <div className="flex items-start gap-1.5 text-[10px] text-[#64748b] bg-[#1e1e30]/40 rounded-lg px-3 py-2">
                        <Info size={10} className="mt-0.5 flex-shrink-0 text-[#a78bfa]" />
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
      <footer className="relative border-t border-[#1e1e30] py-5 flex items-center justify-center gap-1.5 text-[11px] text-[#64748b]">
        Made with
        <Heart size={11} className="text-[#ef4444] fill-[#ef4444]" />
        using AI
        <span className="mx-1.5 text-[#1e1e30]">·</span>
        <ExternalLink size={11} />
        Open Source
      </footer>
    </div>
  )
}

export default App
