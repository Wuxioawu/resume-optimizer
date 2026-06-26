import { useState } from "react"
import type { LucideIcon } from "lucide-react"
import {
  User, Briefcase, FolderOpen, GraduationCap, Wrench,
  Trash2, X, Plus,
} from "lucide-react"
import type { ResumeData, ExperienceEntry, ProjectEntry, EducationEntry } from "../types"

type EditorTab = "personal" | "experience" | "projects" | "education" | "skills"

const EDITOR_TABS: { id: EditorTab; label: string; icon: LucideIcon }[] = [
  { id: "personal",   label: "Personal",   icon: User },
  { id: "experience", label: "Experience", icon: Briefcase },
  { id: "projects",   label: "Projects",   icon: FolderOpen },
  { id: "education",  label: "Education",  icon: GraduationCap },
  { id: "skills",     label: "Skills",     icon: Wrench },
]

const inputCls = "w-full bg-[#f8fafc] border border-[#e2e8f0] rounded-lg px-3 py-1.5 text-xs text-[#0f172a] placeholder-[#94a3b8] focus:outline-none focus:border-[#6366f1]/50 focus:ring-1 focus:ring-[#6366f1]/15 transition-all"

export interface EditorPanelProps {
  resume: ResumeData
  setResume: (updater: (r: ResumeData) => ResumeData) => void
}

export default function EditorPanel({ resume, setResume }: EditorPanelProps) {
  const [activeTab, setActiveTab] = useState<EditorTab>("personal")

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

  return (
    <>
      <div className="flex gap-0.5 bg-[#f1f5f9] rounded-xl p-1 mb-2 flex-shrink-0">
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

      {activeTab === "personal" && (
        <div className="flex flex-col gap-3">
          <div>
            <label className="block text-[10px] font-semibold text-[#64748b] uppercase tracking-widest mb-1">Full Name</label>
            <input value={resume.name} onChange={e => setResume(r => ({ ...r, name: e.target.value }))} className={inputCls} placeholder="Full Name" />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-[#64748b] uppercase tracking-widest mb-1">Contact</label>
            <input value={resume.contact} onChange={e => setResume(r => ({ ...r, contact: e.target.value }))} className={inputCls} placeholder="email | phone | city, state" />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-[#64748b] uppercase tracking-widest mb-1">Summary</label>
            <textarea value={resume.summary} onChange={e => setResume(r => ({ ...r, summary: e.target.value }))} rows={7} className={`${inputCls} resize-none`} placeholder="Professional summary…" />
          </div>
        </div>
      )}

      {activeTab === "experience" && (
        <div className="flex flex-col gap-3">
          {resume.experience.map((exp, i) => (
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
          {resume.projects.map((proj, i) => (
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
          {resume.education.map((edu, i) => (
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
            value={resume.skills}
            onChange={e => setResume(r => ({ ...r, skills: e.target.value }))}
            rows={12}
            className={`${inputCls} resize-none`}
            placeholder="Python, React, AWS, Docker — or comma-separated categories"
          />
          <p className="text-[10px] text-[#94a3b8] mt-1">Separate skills with commas, or group by category</p>
        </div>
      )}
    </>
  )
}
