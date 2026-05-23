import { useState, useRef, useEffect } from "react"
import type { LucideIcon } from "lucide-react"
import {
  Sparkles, Star, FileText, Zap, Target, TrendingUp,
  Upload, CheckCircle, Briefcase, Loader2, Award, CheckSquare,
  CheckCheck, X, Download, Lightbulb, Flame, Minus, ArrowRight,
  Info, ThumbsUp, Heart, User, GraduationCap, FolderOpen,
  Wrench, Plus, Trash2, Edit3,
} from "lucide-react"
import { analyzeResume, exportResume } from "./api/resumeApi"
import type {
  Suggestion, ResumeData, ExperienceEntry, ProjectEntry, EducationEntry,
} from "./types"

type AppState = "idle" | "loading" | "results" | "exporting"
type EditorTab = "personal" | "experience" | "projects" | "education" | "skills"

const CIRCUMFERENCE = 2 * Math.PI * 45

const SECTION_COLORS: Record<string, string> = {
  Summary:    "bg-[#eef2ff] text-[#4f46e5] border-[#c7d2fe]",
  Experience: "bg-[#f5f3ff] text-[#7c3aed] border-[#ddd6fe]",
  Skills:     "bg-[#f0f9ff] text-[#0284c7] border-[#bae6fd]",
  Education:  "bg-[#ecfdf5] text-[#059669] border-[#a7f3d0]",
  Other:      "bg-[#f8fafc] text-[#64748b] border-[#e2e8f0]",
}

const IMPACT_CONFIG: Record<Suggestion["impact"], { icon: LucideIcon; cls: string }> = {
  high:   { icon: Flame, cls: "text-[#dc2626] bg-[#fef2f2] border-[#fecaca]" },
  medium: { icon: Zap,   cls: "text-[#d97706] bg-[#fffbeb] border-[#fde68a]" },
  low:    { icon: Minus, cls: "text-[#16a34a] bg-[#f0fdf4] border-[#bbf7d0]" },
}

const EDITOR_TABS: { id: EditorTab; label: string; icon: LucideIcon }[] = [
  { id: "personal",   label: "Personal",   icon: User },
  { id: "experience", label: "Experience", icon: Briefcase },
  { id: "projects",   label: "Projects",   icon: FolderOpen },
  { id: "education",  label: "Education",  icon: GraduationCap },
  { id: "skills",     label: "Skills",     icon: Wrench },
]

function applyText(r: ResumeData, section: string, orig: string, sugg: string): ResumeData {
  const sub = (s: string) => s.includes(orig) ? s.replace(orig, sugg) : s
  switch (section) {
    case "Summary":    return { ...r, summary: sub(r.summary) }
    case "Skills":     return { ...r, skills: sub(r.skills) }
    case "Experience": return {
      ...r,
      experience: r.experience.map(e => ({
        ...e, title: sub(e.title), company: sub(e.company),
        bullets: e.bullets.map(sub),
      })),
    }
    case "Education": return {
      ...r,
      education: r.education.map(e => ({
        ...e, school: sub(e.school), degree: sub(e.degree),
      })),
    }
    default: return r
  }
}

function ResumePreview({ resume }: { resume: ResumeData }) {
  const SectionHead = ({ label }: { label: string }) => (
    <div className="mt-3 mb-1">
      <p className="text-[9px] font-bold uppercase tracking-widest">{label}</p>
      <hr className="border-t border-[#0f172a]" />
    </div>
  )
  return (
    <div className="bg-white p-5 text-[#0f172a] font-sans min-h-full">
      <p className="text-lg font-bold text-center">{resume.name || "Your Name"}</p>
      {resume.contact && <p className="text-[9px] text-center text-[#555] mb-1">{resume.contact}</p>}

      {resume.summary && (
        <><SectionHead label="Summary" /><p className="text-[9px] text-[#374151] leading-relaxed">{resume.summary}</p></>
      )}

      {resume.experience.length > 0 && (
        <><SectionHead label="Experience" />
        {resume.experience.map((exp, i) => (
          <div key={i} className="mb-2">
            <div className="flex justify-between"><span className="text-[9px] font-bold">{exp.title}</span><span className="text-[8px] text-[#555]">{exp.date}</span></div>
            <div className="flex justify-between"><span className="text-[9px] text-[#444]">{exp.company}</span><span className="text-[8px] text-[#555]">{exp.location}</span></div>
            {exp.bullets.map((b, j) => <p key={j} className="text-[8px] text-[#374151] pl-2">• {b}</p>)}
          </div>
        ))}</>
      )}

      {resume.projects.length > 0 && (
        <><SectionHead label="Projects" />
        {resume.projects.map((proj, i) => (
          <div key={i} className="mb-2">
            <div className="flex justify-between"><span className="text-[9px] font-bold">{proj.name}</span><span className="text-[8px] text-[#555]">{proj.date}</span></div>
            {proj.role && <p className="text-[8px] text-[#444] italic">{proj.role}</p>}
            {proj.bullets.map((b, j) => <p key={j} className="text-[8px] text-[#374151] pl-2">• {b}</p>)}
          </div>
        ))}</>
      )}

      {resume.education.length > 0 && (
        <><SectionHead label="Education" />
        {resume.education.map((edu, i) => (
          <div key={i} className="mb-1.5">
            <div className="flex justify-between"><span className="text-[9px] font-bold">{edu.school}</span><span className="text-[8px] text-[#555]">{edu.date}</span></div>
            <div className="flex justify-between"><span className="text-[9px] text-[#444]">{edu.degree}</span><span className="text-[8px] text-[#555]">{edu.location}</span></div>
          </div>
        ))}</>
      )}

      {resume.skills && (
        <><SectionHead label="Skills" /><p className="text-[8px] text-[#374151]">{resume.skills}</p></>
      )}
    </div>
  )
}

const inputCls = "w-full bg-[#f8fafc] border border-[#e2e8f0] rounded-lg px-3 py-1.5 text-xs text-[#0f172a] placeholder-[#94a3b8] focus:outline-none focus:border-[#6366f1]/50 focus:ring-1 focus:ring-[#6366f1]/15 transition-all"

function App() {
  const [state, setState] = useState<AppState>("idle")
  const [error, setError] = useState<string | null>(null)
  const [resumeFile, setResumeFile] = useState<File | null>(null)
  const [jobDescription, setJobDescription] = useState("")
  const [parsedResume, setParsedResume] = useState<ResumeData | null>(null)
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [activeTab, setActiveTab] = useState<EditorTab>("personal")
  const [matchScore, setMatchScore] = useState(0)
  const [displayScore, setDisplayScore] = useState(0)
  const [poppingId, setPoppingId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const t = setTimeout(() => setDisplayScore(matchScore), 120)
    return () => clearTimeout(t)
  }, [matchScore])

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
      setParsedResume(data.parsed_resume)
      setSuggestions(data.suggestions)
      setMatchScore(data.match_score)
      setState("results")
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Analysis failed. Please try again.")
      setState("idle")
    }
  }

  const toggleSuggestion = (id: string) => {
    const s = suggestions.find(x => x.id === id)
    if (!s) return
    const willAccept = !s.accepted
    setParsedResume(prev =>
      prev
        ? willAccept
          ? applyText(prev, s.section, s.original, s.suggested)
          : applyText(prev, s.section, s.suggested, s.original)
        : prev
    )
    setSuggestions(prev => prev.map(x => x.id === id ? { ...x, accepted: willAccept } : x))
    setPoppingId(id)
    setTimeout(() => setPoppingId(null), 300)
  }

  const acceptAll = () => {
    if (!parsedResume) return
    let r = parsedResume
    suggestions.forEach(s => { if (!s.accepted) r = applyText(r, s.section, s.original, s.suggested) })
    setParsedResume(r)
    setSuggestions(prev => prev.map(s => ({ ...s, accepted: true })))
  }

  const rejectAll = () => {
    if (!parsedResume) return
    let r = parsedResume
    ;[...suggestions].reverse().forEach(s => { if (s.accepted) r = applyText(r, s.section, s.suggested, s.original) })
    setParsedResume(r)
    setSuggestions(prev => prev.map(s => ({ ...s, accepted: false })))
  }

  const handleExport = async () => {
    if (!parsedResume) return
    setState("exporting")
    setError(null)
    try {
      const accepted = suggestions.filter(s => s.accepted)
      const blob = await exportResume(parsedResume, accepted)
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
    setResumeFile(null); setJobDescription(""); setMatchScore(0)
    setDisplayScore(0); setError(null)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const setResume = (updater: (r: ResumeData) => ResumeData) =>
    setParsedResume(prev => prev ? updater(prev) : prev)

  const updateExp = (i: number, updates: Partial<ExperienceEntry>) =>
    setResume(r => ({ ...r, experience: r.experience.map((e, j) => j === i ? { ...e, ...updates } : e) }))

  const setExpBullet = (ei: number, bi: number, val: string) =>
    setResume(r => ({ ...r, experience: r.experience.map((e, i) => i === ei ? { ...e, bullets: e.bullets.map((b, j) => j === bi ? val : b) } : e) }))

  const addExpBullet = (i: number) =>
    setResume(r => ({ ...r, experience: r.experience.map((e, j) => j === i ? { ...e, bullets: [...e.bullets, ""] } : e) }))

  const removeExpBullet = (ei: number, bi: number) =>
    setResume(r => ({ ...r, experience: r.experience.map((e, i) => i === ei ? { ...e, bullets: e.bullets.filter((_, j) => j !== bi) } : e) }))

  const addExp = () =>
    setResume(r => ({ ...r, experience: [...r.experience, { company: "", title: "", date: "", location: "", bullets: [] }] }))

  const removeExp = (i: number) =>
    setResume(r => ({ ...r, experience: r.experience.filter((_, j) => j !== i) }))

  const updateProj = (i: number, updates: Partial<ProjectEntry>) =>
    setResume(r => ({ ...r, projects: r.projects.map((p, j) => j === i ? { ...p, ...updates } : p) }))

  const setProjBullet = (pi: number, bi: number, val: string) =>
    setResume(r => ({ ...r, projects: r.projects.map((p, i) => i === pi ? { ...p, bullets: p.bullets.map((b, j) => j === bi ? val : b) } : p) }))

  const addProjBullet = (i: number) =>
    setResume(r => ({ ...r, projects: r.projects.map((p, j) => j === i ? { ...p, bullets: [...p.bullets, ""] } : p) }))

  const removeProjBullet = (pi: number, bi: number) =>
    setResume(r => ({ ...r, projects: r.projects.map((p, i) => i === pi ? { ...p, bullets: p.bullets.filter((_, j) => j !== bi) } : p) }))

  const addProj = () =>
    setResume(r => ({ ...r, projects: [...r.projects, { name: "", role: "", date: "", bullets: [] }] }))

  const removeProj = (i: number) =>
    setResume(r => ({ ...r, projects: r.projects.filter((_, j) => j !== i) }))

  const updateEdu = (i: number, updates: Partial<EducationEntry>) =>
    setResume(r => ({ ...r, education: r.education.map((e, j) => j === i ? { ...e, ...updates } : e) }))

  const addEdu = () =>
    setResume(r => ({ ...r, education: [...r.education, { school: "", degree: "", date: "", location: "" }] }))

  const removeEdu = (i: number) =>
    setResume(r => ({ ...r, education: r.education.filter((_, j) => j !== i) }))

  const acceptedCount = suggestions.filter(s => s.accepted).length
  const scoreOffset = CIRCUMFERENCE * (1 - displayScore / 100)
  const hasResults = state === "results" || state === "exporting"

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
            <button className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[#e2e8f0] text-[#64748b] text-xs hover:border-[#6366f1]/40 transition-all">
              <Star size={11} />Star
            </button>
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

            {/* Three panels */}
            <div className="flex gap-3 flex-1 min-h-0" style={{ height: "calc(100vh - 220px)" }}>

              {/* LEFT: Preview (40%) */}
              <div className="w-[40%] flex flex-col gap-1.5 min-w-0">
                <div className="flex items-center gap-1.5 px-1">
                  <FileText size={12} className="text-[#6366f1]" />
                  <span className="text-xs font-semibold">Live Preview</span>
                  <span className="text-[10px] text-[#94a3b8] ml-auto">Updates as you edit</span>
                </div>
                <div className="flex-1 overflow-y-auto rounded-xl border border-[#e2e8f0] bg-[#f1f5f9] styled-scroll">
                  <div className="p-3 min-h-full">
                    <div className="bg-white rounded shadow-sm">
                      <ResumePreview resume={parsedResume} />
                    </div>
                  </div>
                </div>
              </div>

              {/* MIDDLE: Editor (30%) */}
              <div className="w-[30%] flex flex-col gap-1.5 min-w-0">
                <div className="flex items-center gap-1.5 px-1">
                  <Edit3 size={12} className="text-[#6366f1]" />
                  <span className="text-xs font-semibold">Editor</span>
                </div>
                {/* Tabs */}
                <div className="flex gap-0.5 bg-[#f1f5f9] rounded-xl p-1 flex-shrink-0">
                  {EDITOR_TABS.map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex-1 flex flex-col items-center gap-0.5 py-1.5 rounded-lg text-[9px] font-medium transition-all ${activeTab === tab.id ? "bg-white text-[#6366f1] shadow-sm" : "text-[#64748b] hover:text-[#0f172a]"}`}
                    >
                      <tab.icon size={11} />{tab.label}
                    </button>
                  ))}
                </div>
                <div className="flex-1 overflow-y-auto rounded-xl border border-[#e2e8f0] bg-white p-3 styled-scroll">

                  {activeTab === "personal" && (
                    <div className="flex flex-col gap-3">
                      <div>
                        <label className="block text-[10px] font-semibold text-[#64748b] uppercase tracking-widest mb-1">Full Name</label>
                        <input value={parsedResume.name} onChange={e => setResume(r => ({ ...r, name: e.target.value }))} className={inputCls} placeholder="Full Name" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-[#64748b] uppercase tracking-widest mb-1">Contact</label>
                        <input value={parsedResume.contact} onChange={e => setResume(r => ({ ...r, contact: e.target.value }))} className={inputCls} placeholder="email | phone | city, state" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-[#64748b] uppercase tracking-widest mb-1">Summary</label>
                        <textarea value={parsedResume.summary} onChange={e => setResume(r => ({ ...r, summary: e.target.value }))} rows={7} className={`${inputCls} resize-none`} placeholder="Professional summary…" />
                      </div>
                    </div>
                  )}

                  {activeTab === "experience" && (
                    <div className="flex flex-col gap-3">
                      {parsedResume.experience.map((exp, i) => (
                        <div key={i} className="border border-[#e2e8f0] rounded-xl p-3 flex flex-col gap-2 relative">
                          <button onClick={() => removeExp(i)} className="absolute top-2 right-2 text-[#94a3b8] hover:text-[#dc2626] transition-colors"><Trash2 size={11} /></button>
                          <div className="grid grid-cols-2 gap-1.5">
                            <div><label className="block text-[9px] text-[#64748b] mb-0.5">Title</label><input value={exp.title} onChange={e => updateExp(i, { title: e.target.value })} className={inputCls} placeholder="Job Title" /></div>
                            <div><label className="block text-[9px] text-[#64748b] mb-0.5">Company</label><input value={exp.company} onChange={e => updateExp(i, { company: e.target.value })} className={inputCls} placeholder="Company" /></div>
                            <div><label className="block text-[9px] text-[#64748b] mb-0.5">Date</label><input value={exp.date} onChange={e => updateExp(i, { date: e.target.value })} className={inputCls} placeholder="Jan 2020 – Dec 2022" /></div>
                            <div><label className="block text-[9px] text-[#64748b] mb-0.5">Location</label><input value={exp.location} onChange={e => updateExp(i, { location: e.target.value })} className={inputCls} placeholder="City, State" /></div>
                          </div>
                          <div>
                            <label className="block text-[9px] text-[#64748b] mb-1">Bullets</label>
                            {exp.bullets.map((b, bi) => (
                              <div key={bi} className="flex gap-1 mb-1">
                                <input value={b} onChange={e => setExpBullet(i, bi, e.target.value)} className={`${inputCls} flex-1`} placeholder="Achievement…" />
                                <button onClick={() => removeExpBullet(i, bi)} className="text-[#94a3b8] hover:text-[#dc2626] px-1 transition-colors"><X size={10} /></button>
                              </div>
                            ))}
                            <button onClick={() => addExpBullet(i)} className="flex items-center gap-1 text-[10px] text-[#6366f1] hover:text-[#4f46e5] mt-0.5"><Plus size={10} />Add bullet</button>
                          </div>
                        </div>
                      ))}
                      <button onClick={addExp} className="flex items-center justify-center gap-1.5 w-full py-2 border-2 border-dashed border-[#e2e8f0] rounded-xl text-xs text-[#6366f1] hover:border-[#6366f1]/40 hover:bg-[#eef2ff] transition-all">
                        <Plus size={12} />Add Experience
                      </button>
                    </div>
                  )}

                  {activeTab === "projects" && (
                    <div className="flex flex-col gap-3">
                      {parsedResume.projects.map((proj, i) => (
                        <div key={i} className="border border-[#e2e8f0] rounded-xl p-3 flex flex-col gap-2 relative">
                          <button onClick={() => removeProj(i)} className="absolute top-2 right-2 text-[#94a3b8] hover:text-[#dc2626] transition-colors"><Trash2 size={11} /></button>
                          <div className="grid grid-cols-2 gap-1.5">
                            <div><label className="block text-[9px] text-[#64748b] mb-0.5">Name</label><input value={proj.name} onChange={e => updateProj(i, { name: e.target.value })} className={inputCls} placeholder="Project Name" /></div>
                            <div><label className="block text-[9px] text-[#64748b] mb-0.5">Date</label><input value={proj.date} onChange={e => updateProj(i, { date: e.target.value })} className={inputCls} placeholder="2023" /></div>
                          </div>
                          <div><label className="block text-[9px] text-[#64748b] mb-0.5">Role / Tech Stack</label><input value={proj.role} onChange={e => updateProj(i, { role: e.target.value })} className={inputCls} placeholder="React, Node.js…" /></div>
                          <div>
                            <label className="block text-[9px] text-[#64748b] mb-1">Bullets</label>
                            {proj.bullets.map((b, bi) => (
                              <div key={bi} className="flex gap-1 mb-1">
                                <input value={b} onChange={e => setProjBullet(i, bi, e.target.value)} className={`${inputCls} flex-1`} placeholder="What it does…" />
                                <button onClick={() => removeProjBullet(i, bi)} className="text-[#94a3b8] hover:text-[#dc2626] px-1 transition-colors"><X size={10} /></button>
                              </div>
                            ))}
                            <button onClick={() => addProjBullet(i)} className="flex items-center gap-1 text-[10px] text-[#6366f1] hover:text-[#4f46e5] mt-0.5"><Plus size={10} />Add bullet</button>
                          </div>
                        </div>
                      ))}
                      <button onClick={addProj} className="flex items-center justify-center gap-1.5 w-full py-2 border-2 border-dashed border-[#e2e8f0] rounded-xl text-xs text-[#6366f1] hover:border-[#6366f1]/40 hover:bg-[#eef2ff] transition-all">
                        <Plus size={12} />Add Project
                      </button>
                    </div>
                  )}

                  {activeTab === "education" && (
                    <div className="flex flex-col gap-3">
                      {parsedResume.education.map((edu, i) => (
                        <div key={i} className="border border-[#e2e8f0] rounded-xl p-3 flex flex-col gap-2 relative">
                          <button onClick={() => removeEdu(i)} className="absolute top-2 right-2 text-[#94a3b8] hover:text-[#dc2626] transition-colors"><Trash2 size={11} /></button>
                          <div><label className="block text-[9px] text-[#64748b] mb-0.5">School</label><input value={edu.school} onChange={e => updateEdu(i, { school: e.target.value })} className={inputCls} placeholder="University Name" /></div>
                          <div><label className="block text-[9px] text-[#64748b] mb-0.5">Degree</label><input value={edu.degree} onChange={e => updateEdu(i, { degree: e.target.value })} className={inputCls} placeholder="BS Computer Science" /></div>
                          <div className="grid grid-cols-2 gap-1.5">
                            <div><label className="block text-[9px] text-[#64748b] mb-0.5">Date</label><input value={edu.date} onChange={e => updateEdu(i, { date: e.target.value })} className={inputCls} placeholder="May 2021" /></div>
                            <div><label className="block text-[9px] text-[#64748b] mb-0.5">Location</label><input value={edu.location} onChange={e => updateEdu(i, { location: e.target.value })} className={inputCls} placeholder="City, State" /></div>
                          </div>
                        </div>
                      ))}
                      <button onClick={addEdu} className="flex items-center justify-center gap-1.5 w-full py-2 border-2 border-dashed border-[#e2e8f0] rounded-xl text-xs text-[#6366f1] hover:border-[#6366f1]/40 hover:bg-[#eef2ff] transition-all">
                        <Plus size={12} />Add Education
                      </button>
                    </div>
                  )}

                  {activeTab === "skills" && (
                    <div>
                      <label className="block text-[10px] font-semibold text-[#64748b] uppercase tracking-widest mb-1.5">Skills</label>
                      <textarea
                        value={parsedResume.skills}
                        onChange={e => setResume(r => ({ ...r, skills: e.target.value }))}
                        rows={12}
                        className={`${inputCls} resize-none`}
                        placeholder="Python, React, AWS, Docker — or comma-separated categories"
                      />
                      <p className="text-[10px] text-[#94a3b8] mt-1">Separate skills with commas, or group by category</p>
                    </div>
                  )}
                </div>
              </div>

              {/* RIGHT: Suggestions (30%) */}
              <div className="w-[30%] flex flex-col gap-1.5 min-w-0">
                <div className="flex items-center gap-1.5 px-1">
                  <Lightbulb size={12} className="text-[#6366f1]" />
                  <span className="text-xs font-semibold">AI Suggestions</span>
                  <span className="ml-auto px-1.5 py-0.5 text-[10px] rounded-full bg-[#eef2ff] text-[#6366f1] border border-[#c7d2fe]">{suggestions.length}</span>
                </div>
                <div className="flex-1 overflow-y-auto flex flex-col gap-2 styled-scroll">
                  {suggestions.map((s, i) => {
                    const sectionCls = SECTION_COLORS[s.section] ?? SECTION_COLORS["Other"]
                    const { icon: ImpactIcon, cls: impactCls } = IMPACT_CONFIG[s.impact]
                    return (
                      <div
                        key={s.id}
                        className={`suggestion-card rounded-xl border p-3 slide-in ${s.accepted ? "border-[#a7f3d0] bg-[#f0fdf4]" : "border-[#e2e8f0] bg-white"}`}
                        style={{ animationDelay: `${i * 40}ms` }}
                      >
                        <div className="flex items-center justify-between mb-2 gap-1">
                          <div className="flex items-center gap-1 flex-wrap">
                            <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full border ${sectionCls}`}>{s.section}</span>
                            <span className={`flex items-center gap-0.5 text-[9px] font-semibold px-1.5 py-0.5 rounded-full border ${impactCls}`}>
                              <ImpactIcon size={8} />{s.impact}
                            </span>
                          </div>
                          <button
                            onClick={() => toggleSuggestion(s.id)}
                            className={`flex items-center gap-1 text-[10px] px-2 py-1 rounded-lg font-medium transition-all flex-shrink-0 ${poppingId === s.id ? "pop" : ""} ${s.accepted ? "bg-[#6366f1] text-white" : "border border-[#e2e8f0] text-[#6366f1] hover:border-[#6366f1] hover:bg-[#eef2ff]"}`}
                          >
                            {s.accepted ? <><CheckCircle size={9} />Accepted</> : <><ThumbsUp size={9} />Accept</>}
                          </button>
                        </div>

                        <div className="mb-1.5">
                          <p className="text-[9px] text-[#dc2626]/60 uppercase tracking-widest mb-0.5 flex items-center gap-0.5"><ArrowRight size={7} />Original</p>
                          <p className="text-[10px] text-[#64748b] bg-[#fef2f2] border border-[#fecaca]/60 rounded-lg px-2 py-1.5 leading-relaxed">{s.original}</p>
                        </div>

                        <div className="mb-1.5">
                          <p className="text-[9px] text-[#16a34a]/60 uppercase tracking-widest mb-0.5 flex items-center gap-0.5"><Sparkles size={7} />Suggested</p>
                          <p className="text-[10px] text-[#166534] bg-[#f0fdf4] border border-[#bbf7d0]/60 rounded-lg px-2 py-1.5 leading-relaxed font-medium">{s.suggested}</p>
                        </div>

                        <div className="flex items-start gap-1 text-[9px] text-[#64748b] bg-[#f8fafc] border border-[#e2e8f0] rounded-lg px-2 py-1.5">
                          <Info size={9} className="mt-0.5 flex-shrink-0 text-[#6366f1]" />
                          <span className="leading-relaxed">{s.reason}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
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
