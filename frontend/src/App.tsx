import React, { useState, useRef, useEffect } from "react"
import {
  Sparkles, FileText, Zap, Target, TrendingUp,
  Upload, CheckCircle, Briefcase, Loader2, Award, CheckSquare,
  CheckCheck, X, Download, Lightbulb, Heart, Edit3, Palette,
} from "lucide-react"
import { analyzeResume, exportResume, rewriteResume } from "./api/resumeApi"
import type {
  Suggestion, SuggestionLocation, ResumeData, ResumeStyle,
} from "./types"
import ResumePreview from "./components/ResumePreview"
import StylePanel from "./components/StylePanel"
import EditorPanel from "./components/EditorPanel"
import SuggestionsPanel from "./components/SuggestionsPanel"

type AppState = "idle" | "loading" | "results" | "exporting"
type RightTab = "editor" | "suggestions" | "style"

const DEFAULT_STYLE: ResumeStyle = { accentColor: "#0f172a", headerAlignment: "center", sectionSpacing: 8, entrySpacing: 6, lineSpacing: 1.4 }

const CIRCUMFERENCE = 2 * Math.PI * 45

// ── Location helpers ──────────────────────────────────────────────────────────

function locationKey(loc: SuggestionLocation | null | undefined): string | null {
  if (!loc) return null
  const base = `${loc.kind}:${loc.field}`
  if (loc.index !== undefined) {
    if (loc.bullet_index !== undefined) return `${base}:${loc.index}:${loc.bullet_index}`
    return `${base}:${loc.index}`
  }
  return base
}

function readFieldAt(r: ResumeData, loc: SuggestionLocation): string {
  if (loc.kind === "flat") {
    if (loc.field === "summary") return r.summary
    if (loc.field === "skills")  return r.skills
    if (loc.field === "name")    return r.name
    if (loc.field === "contact") return r.contact
    return ""
  }
  const idx = loc.index
  if (idx === undefined) return ""
  if (loc.kind === "experience") {
    const e = r.experience[idx]
    if (!e) return ""
    if (loc.field === "bullet") return loc.bullet_index !== undefined ? e.bullets[loc.bullet_index] ?? "" : ""
    if (loc.field === "title")    return e.title
    if (loc.field === "company")  return e.company
    if (loc.field === "date")     return e.date
    if (loc.field === "location") return e.location
    return ""
  }
  if (loc.kind === "projects") {
    const p = r.projects[idx]
    if (!p) return ""
    if (loc.field === "bullet") return loc.bullet_index !== undefined ? p.bullets[loc.bullet_index] ?? "" : ""
    if (loc.field === "name") return p.name
    if (loc.field === "role") return p.role
    if (loc.field === "date") return p.date
    return ""
  }
  if (loc.kind === "education") {
    const e = r.education[idx]
    if (!e) return ""
    if (loc.field === "school")   return e.school
    if (loc.field === "degree")   return e.degree
    if (loc.field === "date")     return e.date
    if (loc.field === "location") return e.location
    return ""
  }
  return ""
}

function writeFieldAt(r: ResumeData, loc: SuggestionLocation, value: string): ResumeData {
  if (loc.kind === "flat") {
    if (loc.field === "summary") return { ...r, summary: value }
    if (loc.field === "skills")  return { ...r, skills: value }
    if (loc.field === "name")    return { ...r, name: value }
    if (loc.field === "contact") return { ...r, contact: value }
    return r
  }
  const idx = loc.index
  if (idx === undefined) return r
  if (loc.kind === "experience") {
    return {
      ...r,
      experience: r.experience.map((e, i) => {
        if (i !== idx) return e
        if (loc.field === "bullet" && loc.bullet_index !== undefined)
          return { ...e, bullets: e.bullets.map((b, j) => j === loc.bullet_index ? value : b) }
        if (loc.field === "title")    return { ...e, title: value }
        if (loc.field === "company")  return { ...e, company: value }
        if (loc.field === "date")     return { ...e, date: value }
        if (loc.field === "location") return { ...e, location: value }
        return e
      }),
    }
  }
  if (loc.kind === "projects") {
    return {
      ...r,
      projects: r.projects.map((p, i) => {
        if (i !== idx) return p
        if (loc.field === "bullet" && loc.bullet_index !== undefined)
          return { ...p, bullets: p.bullets.map((b, j) => j === loc.bullet_index ? value : b) }
        if (loc.field === "name") return { ...p, name: value }
        if (loc.field === "role") return { ...p, role: value }
        if (loc.field === "date") return { ...p, date: value }
        return p
      }),
    }
  }
  if (loc.kind === "education") {
    return {
      ...r,
      education: r.education.map((e, i) => {
        if (i !== idx) return e
        if (loc.field === "school")   return { ...e, school: value }
        if (loc.field === "degree")   return { ...e, degree: value }
        if (loc.field === "date")     return { ...e, date: value }
        if (loc.field === "location") return { ...e, location: value }
        return e
      }),
    }
  }
  return r
}

// ── Resizable split ───────────────────────────────────────────────────────────

const SPLIT_KEY = "resume-split-px"
const MIN_LEFT_PX = 360
const MIN_RIGHT_PX = 380

// ── App ───────────────────────────────────────────────────────────────────────

function App() {
  const [state, setState] = useState<AppState>("idle")
  const [error, setError] = useState<string | null>(null)
  const [resumeFile, setResumeFile] = useState<File | null>(null)
  const [jobDescription, setJobDescription] = useState("")
  const [parsedResume, setParsedResume] = useState<ResumeData | null>(null)
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  // Source-of-truth for which suggestions are applied — replaces suggestion.accepted
  const [acceptedIds, setAcceptedIds] = useState<Set<string>>(new Set())
  // Snapshots the field value at the moment each suggestion was accepted, enabling exact restore on reject
  const [priorValues, setPriorValues] = useState<Map<string, string>>(new Map())
  const [rightTab, setRightTab] = useState<RightTab>("suggestions")
  const [resumeStyle, setResumeStyle] = useState<ResumeStyle>(DEFAULT_STYLE)
  const [matchScore, setMatchScore] = useState(0)
  const [displayScore, setDisplayScore] = useState(0)
  const [poppingId, setPoppingId] = useState<string | null>(null)
  const [rewriteInstruction, setRewriteInstruction] = useState("")
  const [isRewriting, setIsRewriting] = useState(false)
  const [leftPx, setLeftPx] = useState<number>(() => {
    const stored = localStorage.getItem(SPLIT_KEY)
    return stored ? Math.max(MIN_LEFT_PX, Number(stored)) : 600
  })
  const fileInputRef = useRef<HTMLInputElement>(null)
  const splitContainerRef = useRef<HTMLDivElement>(null)

  const handleDividerMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    const container = splitContainerRef.current
    if (!container) return
    const startX = e.clientX
    const startLeft = leftPx
    let lastLeft = startLeft
    document.body.style.userSelect = "none"
    document.body.style.cursor = "col-resize"
    const onMove = (ev: MouseEvent) => {
      const max = container.offsetWidth - MIN_RIGHT_PX - 8
      lastLeft = Math.min(max, Math.max(MIN_LEFT_PX, startLeft + ev.clientX - startX))
      setLeftPx(lastLeft)
    }
    const onUp = () => {
      document.removeEventListener("mousemove", onMove)
      document.removeEventListener("mouseup", onUp)
      document.body.style.userSelect = ""
      document.body.style.cursor = ""
      localStorage.setItem(SPLIT_KEY, String(lastLeft))
    }
    document.addEventListener("mousemove", onMove)
    document.addEventListener("mouseup", onUp)
  }

  useEffect(() => {
    const t = setTimeout(() => setDisplayScore(matchScore), 120)
    return () => clearTimeout(t)
  }, [matchScore])

  const MAX_FILE_BYTES = (Number(import.meta.env.VITE_MAX_FILE_SIZE_MB) || 10) * 1024 * 1024

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null
    if (file && file.size > MAX_FILE_BYTES) {
      setError(`File exceeds the ${MAX_FILE_BYTES / 1024 / 1024} MB limit. Please upload a smaller PDF.`)
      e.target.value = ""
      return
    }
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
      setParsedResume(data.parsed_resume)
      setSuggestions(data.suggestions)
      setAcceptedIds(new Set())
      setPriorValues(new Map())
      setMatchScore(data.match_score)
      setState("results")
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Analysis failed. Please try again.")
      setState("idle")
    }
  }

  // ── Accept / reject ─────────────────────────────────────────────────────────
  //
  // Invariant: id ∈ acceptedIds  ↔  parsedResume[location] === suggestion.suggested
  //
  // Enforced by option (a): at most one accepted suggestion per location.
  // Accepting B on a location that already has A accepted auto-rejects A first
  // (restoring priorValues["A"]) before applying B, keeping state in sync.

  const toggleSuggestion = (id: string) => {
    const s = suggestions.find(x => x.id === id)
    if (!s || !s.location || !parsedResume) return

    const willAccept = !acceptedIds.has(id)
    const locKey = locationKey(s.location)!

    if (willAccept) {
      const conflicting = suggestions.find(
        other => other.id !== id && acceptedIds.has(other.id) && locationKey(other.location) === locKey
      )

      let nextResume = parsedResume
      const newPrior = new Map(priorValues)
      const newIds = new Set(acceptedIds)

      // Auto-reject any existing accepted suggestion at the same location
      if (conflicting?.location) {
        const conflictPrior = newPrior.get(conflicting.id)
        if (conflictPrior !== undefined) {
          nextResume = writeFieldAt(nextResume, conflicting.location, conflictPrior)
        }
        newPrior.delete(conflicting.id)
        newIds.delete(conflicting.id)
      }

      // Snapshot current field value, then apply
      newPrior.set(id, readFieldAt(nextResume, s.location))
      newIds.add(id)
      nextResume = writeFieldAt(nextResume, s.location, s.suggested)

      setParsedResume(nextResume)
      setPriorValues(newPrior)
      setAcceptedIds(newIds)
    } else {
      // Reject: restore exact pre-accept snapshot
      const prior = priorValues.get(id)
      let nextResume = parsedResume
      if (prior !== undefined) {
        nextResume = writeFieldAt(nextResume, s.location, prior)
      }
      const newPrior = new Map(priorValues)
      newPrior.delete(id)
      const newIds = new Set(acceptedIds)
      newIds.delete(id)

      setParsedResume(nextResume)
      setPriorValues(newPrior)
      setAcceptedIds(newIds)
    }

    setPoppingId(id)
    setTimeout(() => setPoppingId(null), 300)
  }

  const acceptAll = () => {
    if (!parsedResume) return

    let nextResume = parsedResume
    const newPrior = new Map(priorValues)
    const newIds = new Set(acceptedIds)
    // Track which location key is currently accepted (for same-location collision during bulk accept)
    const locKeyToId = new Map<string, string>()
    for (const s of suggestions) {
      if (newIds.has(s.id) && s.location) {
        const k = locationKey(s.location)
        if (k) locKeyToId.set(k, s.id)
      }
    }

    for (const s of suggestions) {
      if (newIds.has(s.id) || !s.location) continue
      const k = locationKey(s.location)
      if (!k) continue

      const conflictId = locKeyToId.get(k)
      if (conflictId) {
        const conflict = suggestions.find(x => x.id === conflictId)
        const conflictPrior = newPrior.get(conflictId)
        if (conflict?.location && conflictPrior !== undefined) {
          nextResume = writeFieldAt(nextResume, conflict.location, conflictPrior)
        }
        newPrior.delete(conflictId)
        newIds.delete(conflictId)
      }

      newPrior.set(s.id, readFieldAt(nextResume, s.location))
      newIds.add(s.id)
      locKeyToId.set(k, s.id)
      nextResume = writeFieldAt(nextResume, s.location, s.suggested)
    }

    setParsedResume(nextResume)
    setPriorValues(newPrior)
    setAcceptedIds(newIds)
  }

  const rejectAll = () => {
    if (!parsedResume) return

    let nextResume = parsedResume
    const newPrior = new Map(priorValues)
    const newIds = new Set(acceptedIds)

    for (const s of suggestions) {
      if (!newIds.has(s.id) || !s.location) continue
      const prior = newPrior.get(s.id)
      if (prior !== undefined) {
        nextResume = writeFieldAt(nextResume, s.location, prior)
      }
      newPrior.delete(s.id)
      newIds.delete(s.id)
    }

    setParsedResume(nextResume)
    setPriorValues(newPrior)
    setAcceptedIds(newIds)
  }

  // ── Export ──────────────────────────────────────────────────────────────────

  const handleExport = async () => {
    if (!parsedResume) return
    setState("exporting")
    setError(null)
    try {
      // parsedResume already reflects all accepted suggestions and manual edits.
      // Backend renders it as-is — no re-application.
      const blob = await exportResume(parsedResume, resumeStyle)
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url; a.download = "optimized_resume.pdf"; a.click()
      URL.revokeObjectURL(url)
    } catch {
      setError("Export failed. Please try again.")
    } finally {
      setState("results")
    }
  }

  const handleReset = () => {
    setState("idle"); setParsedResume(null); setSuggestions([])
    setAcceptedIds(new Set()); setPriorValues(new Map())
    setResumeFile(null); setJobDescription(""); setMatchScore(0)
    setDisplayScore(0); setError(null)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  // ── AI Rewrite ──────────────────────────────────────────────────────────────

  const handleRewrite = async () => {
    if (!parsedResume || !rewriteInstruction.trim() || isRewriting) return
    setIsRewriting(true)
    setError(null)
    try {
      const incoming = await rewriteResume(parsedResume, rewriteInstruction, jobDescription)

      // Snapshot current state — compute all updates together to preserve the invariant
      let nextResume = parsedResume
      const newAcceptedIds = new Set(acceptedIds)
      const newPriorValues = new Map(priorValues)
      let nextSuggestions = [...suggestions]

      for (const inc of incoming) {
        const incKey = locationKey(inc.location)

        if (incKey !== null) {
          // Replace any existing suggestion at this location.
          // If it was accepted, revert the field first so the location is clean.
          const conflict = nextSuggestions.find(s => locationKey(s.location) === incKey)
          if (conflict) {
            if (newAcceptedIds.has(conflict.id) && conflict.location) {
              const prior = newPriorValues.get(conflict.id)
              if (prior !== undefined) {
                nextResume = writeFieldAt(nextResume, conflict.location, prior)
              }
            }
            newAcceptedIds.delete(conflict.id)
            newPriorValues.delete(conflict.id)
            nextSuggestions = nextSuggestions.filter(s => s.id !== conflict.id)
          }
        } else {
          // Advisory (null location): skip pure text duplicates
          const isDup = nextSuggestions.some(
            s => s.location === null && s.original === inc.original && s.suggested === inc.suggested
          )
          if (isDup) continue
        }

        nextSuggestions = [inc, ...nextSuggestions]
      }

      setParsedResume(nextResume)
      setAcceptedIds(newAcceptedIds)
      setPriorValues(newPriorValues)
      setSuggestions(nextSuggestions)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Rewrite failed. Please try again.")
    } finally {
      setIsRewriting(false)
    }
  }

  // ── Editor helper ───────────────────────────────────────────────────────────

  const setResume = (updater: (r: ResumeData) => ResumeData) =>
    setParsedResume(prev => prev ? updater(prev) : prev)

  // ── Derived values ──────────────────────────────────────────────────────────

  const acceptedCount = acceptedIds.size
  const scoreOffset = CIRCUMFERENCE * (1 - displayScore / 100)
  const hasResults = state === "results" || state === "exporting"

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#f8fafc] text-[#0f172a] flex flex-col">

      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-[#e2e8f0]" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
        <div className="max-w-[1600px] mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="text-[#6366f1]" size={19} />
            <span className="text-sm font-bold gradient-text">ResumeAI</span>
          </div>
          <div className="flex items-center gap-2">
            {hasResults && (
              <button onClick={handleReset} className="px-3 py-1.5 text-xs text-[#64748b] hover:text-[#0f172a] border border-[#e2e8f0] hover:border-[#6366f1]/40 rounded-lg transition-all">
                Start Over
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col max-w-[1600px] mx-auto w-full px-4">

        {/* ── IDLE ── */}
        {state === "idle" && (
          <div className="flex-1 flex flex-col items-center justify-center py-10 gap-8">
            <div className="text-center">
              <h1 className="text-5xl font-bold mb-3">
                Optimize Your Resume <span className="gradient-text">with AI</span>
              </h1>
              <p className="text-[#64748b] text-sm mb-5 flex items-center justify-center gap-2">
                <FileText size={14} />Upload your resume and get instant AI-powered suggestions
              </p>
              <div className="flex items-center justify-center gap-3">
                <div className="feature-badge"><Zap size={12} />Instant Analysis</div>
                <div className="feature-badge"><Target size={12} />ATS Optimized</div>
                <div className="feature-badge"><TrendingUp size={12} />Higher Match Rate</div>
              </div>
            </div>

            <div className="w-full max-w-2xl bg-white rounded-2xl border border-[#e2e8f0] p-6 flex flex-col gap-4 card-glow" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
              <div
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${resumeFile ? "border-[#10b981]/40 bg-[#f0fdf4]" : "border-[#e2e8f0] hover:border-[#6366f1]/40 bg-[#f8fafc] hover:bg-[#eef2ff]"}`}
              >
                <input ref={fileInputRef} type="file" accept=".pdf" onChange={handleFileChange} className="hidden" />
                {resumeFile ? (
                  <div className="flex flex-col items-center gap-2">
                    <CheckCircle className="text-[#10b981]" size={28} />
                    <p className="text-[#0f172a] font-medium text-sm">{resumeFile.name}</p>
                    <p className="text-[#64748b] text-xs">{(resumeFile.size / 1024 / 1024).toFixed(2)} MB · click to change</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="text-[#6366f1]" size={28} />
                    <p className="text-[#0f172a] font-medium text-sm">Drop your PDF here</p>
                    <p className="text-[#64748b] text-xs">or click to browse · Max 10 MB</p>
                  </div>
                )}
              </div>

              <div>
                <label className="text-[11px] font-semibold text-[#64748b] uppercase tracking-widest flex items-center gap-1.5 mb-1.5">
                  <Briefcase size={11} className="text-[#6366f1]" />Job Description
                </label>
                <textarea
                  value={jobDescription}
                  onChange={e => setJobDescription(e.target.value)}
                  placeholder="Paste the full job description here…"
                  rows={8}
                  className="w-full bg-[#f8fafc] border border-[#e2e8f0] rounded-xl px-4 py-3 text-sm text-[#0f172a] placeholder-[#94a3b8] resize-none focus:outline-none focus:border-[#6366f1]/50 focus:ring-1 focus:ring-[#6366f1]/15 transition-all"
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 text-xs text-[#dc2626] bg-[#fef2f2] border border-[#fecaca] rounded-xl px-4 py-3">
                  <X size={12} />{error}
                </div>
              )}

              <button
                onClick={handleAnalyze}
                disabled={!resumeFile || !jobDescription.trim()}
                className="btn-shimmer w-full py-3 rounded-xl text-white font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:scale-[1.01] active:scale-[0.98] transition-all"
                style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)", boxShadow: "0 2px 8px rgba(99,102,241,0.3)" }}
              >
                <span className="flex items-center justify-center gap-2">
                  <Sparkles size={15} />Analyze with AI
                </span>
              </button>
            </div>
          </div>
        )}

        {/* ── LOADING ── */}
        {state === "loading" && (
          <div className="flex-1 flex flex-col items-center justify-center gap-4">
            <Loader2 size={44} className="text-[#6366f1] animate-spin" />
            <p className="text-[#64748b] text-sm">AI is analyzing your resume…</p>
          </div>
        )}

        {/* ── RESULTS ── */}
        {hasResults && parsedResume && (
          <div className="flex flex-col gap-3 py-4 flex-1">

            {/* Score bar */}
            <div className="bg-white rounded-2xl border border-[#e2e8f0] px-5 py-3 flex flex-wrap items-center gap-4" style={{ borderLeft: "4px solid #6366f1", boxShadow: "0 1px 6px rgba(99,102,241,0.08)" }}>
              <div className="relative flex-shrink-0">
                <svg width="68" height="68" viewBox="0 0 120 120">
                  <defs>
                    <linearGradient id="sg" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#6366f1" /><stop offset="100%" stopColor="#8b5cf6" />
                    </linearGradient>
                  </defs>
                  <circle cx="60" cy="60" r="45" fill="none" stroke="#e2e8f0" strokeWidth="8" />
                  <circle cx="60" cy="60" r="45" fill="none" stroke="url(#sg)" strokeWidth="8"
                    strokeLinecap="round" strokeDasharray={CIRCUMFERENCE} strokeDashoffset={scoreOffset}
                    transform="rotate(-90 60 60)" className="score-ring" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xs font-bold gradient-text">{displayScore}%</span>
                </div>
              </div>

              <div className="flex-1 min-w-[140px]">
                <div className="flex items-center gap-1.5 mb-1">
                  <Award size={13} className="text-[#6366f1]" />
                  <span className="font-semibold text-[#0f172a] text-sm">Resume Match Score</span>
                </div>
                <div className="w-full h-1.5 bg-[#e2e8f0] rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-[1200ms] ease-out" style={{ width: `${displayScore}%`, background: "linear-gradient(90deg, #6366f1, #8b5cf6)" }} />
                </div>
                <p className="text-[11px] text-[#64748b] mt-1 flex items-center gap-1">
                  <CheckSquare size={10} />{acceptedCount} of {suggestions.length} accepted
                </p>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
                <button onClick={acceptAll} className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[#6366f1]/30 text-[#6366f1] hover:bg-[#eef2ff] text-xs font-medium transition-all">
                  <CheckCheck size={11} />Accept All
                </button>
                <button onClick={rejectAll} className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[#e2e8f0] text-[#64748b] hover:bg-[#f8fafc] text-xs font-medium transition-all">
                  <X size={11} />Reject All
                </button>
                <button
                  onClick={handleExport}
                  disabled={state === "exporting"}
                  className="btn-shimmer flex items-center gap-1 px-4 py-1.5 rounded-lg text-white text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}
                >
                  <Download size={11} />{state === "exporting" ? "Exporting…" : "Export PDF"}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-xs text-[#dc2626] bg-[#fef2f2] border border-[#fecaca] rounded-xl px-4 py-2">
                <X size={12} />{error}
              </div>
            )}

            {/* Two panels with resizable divider */}
            <div ref={splitContainerRef} className="flex flex-1 min-h-0" style={{ height: "calc(100vh - 220px)" }}>

              {/* LEFT: Preview */}
              <div className="flex flex-col gap-1.5 flex-shrink-0 overflow-hidden" style={{ width: leftPx, minWidth: MIN_LEFT_PX }}>
                <div className="flex items-center gap-1.5 px-1">
                  <FileText size={12} className="text-[#6366f1]" />
                  <span className="text-xs font-semibold">Live Preview</span>
                  <span className="text-[10px] text-[#94a3b8] ml-auto">Updates as you edit</span>
                </div>
                <div className="flex-1 overflow-y-auto rounded-xl border border-[#e2e8f0] bg-[#f1f5f9] styled-scroll">
                  <div className="p-3 min-h-full">
                    <div className="bg-white rounded shadow-sm">
                      <ResumePreview resume={parsedResume} style={resumeStyle} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Divider */}
              <div
                onMouseDown={handleDividerMouseDown}
                className="w-2 flex-shrink-0 cursor-col-resize group relative"
              >
                <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-px bg-[#e2e8f0] group-hover:bg-[#6366f1]/50 transition-colors" />
              </div>

              {/* RIGHT: Editor + Suggestions + Style */}
              <div className="flex flex-col gap-1.5 flex-1 min-w-0 overflow-hidden" style={{ minWidth: MIN_RIGHT_PX }}>

                {/* Three-tab bar */}
                <div className="flex gap-0.5 bg-[#f1f5f9] rounded-xl p-1 flex-shrink-0">
                  <button
                    onClick={() => setRightTab("editor")}
                    className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-[9px] font-medium transition-all ${rightTab === "editor" ? "bg-white text-[#6366f1] shadow-sm" : "text-[#64748b] hover:text-[#0f172a]"}`}
                  >
                    <Edit3 size={11} />Editor
                  </button>
                  <button
                    onClick={() => setRightTab("suggestions")}
                    className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-[9px] font-medium transition-all ${rightTab === "suggestions" ? "bg-white text-[#6366f1] shadow-sm" : "text-[#64748b] hover:text-[#0f172a]"}`}
                  >
                    <Lightbulb size={11} />Suggestions
                    <span className="px-1 rounded-full bg-[#eef2ff] text-[#6366f1] border border-[#c7d2fe]">{suggestions.length}</span>
                  </button>
                  <button
                    onClick={() => setRightTab("style")}
                    className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-[9px] font-medium transition-all ${rightTab === "style" ? "bg-white text-[#6366f1] shadow-sm" : "text-[#64748b] hover:text-[#0f172a]"}`}
                  >
                    <Palette size={11} />Style
                  </button>
                </div>

                {/* Editor tab */}
                {rightTab === "editor" && (
                  <div className="flex-1 overflow-y-auto rounded-xl border border-[#e2e8f0] bg-white p-3 styled-scroll">
                    <EditorPanel resume={parsedResume} setResume={setResume} />
                  </div>
                )}

                {/* Suggestions tab */}
                {rightTab === "suggestions" && (
                  <SuggestionsPanel
                    suggestions={suggestions}
                    acceptedIds={acceptedIds}
                    poppingId={poppingId}
                    rewriteInstruction={rewriteInstruction}
                    isRewriting={isRewriting}
                    onToggle={toggleSuggestion}
                    onRewrite={handleRewrite}
                    onRewriteInstructionChange={setRewriteInstruction}
                  />
                )}

                {/* Style tab */}
                {rightTab === "style" && (
                  <StylePanel style={resumeStyle} onChange={setResumeStyle} />
                )}

              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="border-t border-[#e2e8f0] bg-[#f8fafc] py-4 flex items-center justify-center gap-1.5 text-[11px] text-[#64748b]">
        Made with <Heart size={10} className="text-[#6366f1] fill-[#6366f1]" /> using AI
      </footer>
    </div>
  )
}

export default App
