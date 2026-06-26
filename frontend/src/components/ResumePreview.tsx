import React from "react"
import type { ResumeData, ResumeStyle } from "../types"

// These are compile-time only and disappear after the project is built.

// the function 
interface ResumePreviewProps {
  resume: ResumeData
  style: ResumeStyle
}

function SectionHead({ label }: { label: string }) {
  return (
    <div className="mb-1" style={{ marginTop: "var(--section-spacing)" }}>
      <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: "var(--accent)" }}>{label}</p>
      <hr className="border-t" style={{ borderColor: "var(--accent)" }} />
    </div>
  )
}

export default function ResumePreview({ resume, style }: ResumePreviewProps) {
  return (
    <div className="bg-white p-5 text-[#0f172a] font-sans min-h-full"
      style={ 
        { "--accent": style.accentColor, 
          "--header-align": style.headerAlignment, 
          "--section-spacing": `${style.sectionSpacing}px`, 
          "--entry-spacing": `${style.entrySpacing}px`, 
          "--line-spacing": style.lineSpacing, 
          lineHeight: "var(--line-spacing)" 
        } as React.CSSProperties}>

      <div style={{ textAlign: "var(--header-align)" as React.CSSProperties["textAlign"] }}>
        <p className="text-lg font-bold">{resume.name || "Your Name"}</p>
        {resume.contact && <p className="text-[9px] text-[#555] mb-1">{resume.contact}</p>}
      </div>

      {resume.summary && (
        <><SectionHead label="Summary" /><p className="text-[9px] text-[#374151]">{resume.summary}</p></>
      )}

      {resume.experience.length > 0 && (
        <><SectionHead label="Experience" />
          {resume.experience.map((exp, i) => (
            <div key={i} style={{ marginBottom: "var(--entry-spacing)" }}>
              <div className="flex justify-between"><span className="text-[9px] font-bold">{exp.title}</span><span className="text-[8px] text-[#555]">{exp.date}</span></div>
              <div className="flex justify-between"><span className="text-[9px] text-[#444]">{exp.company}</span><span className="text-[8px] text-[#555]">{exp.location}</span></div>
              {exp.bullets.map((b, j) => <p key={j} className="text-[8px] text-[#374151] pl-2">• {b}</p>)}
            </div>
          ))}</>
      )}

      {resume.projects.length > 0 && (
        <><SectionHead label="Projects" />
          {resume.projects.map((proj, i) => (
            <div key={i} style={{ marginBottom: "var(--entry-spacing)" }}>
              <div className="flex justify-between"><span className="text-[9px] font-bold">{proj.name}</span><span className="text-[8px] text-[#555]">{proj.date}</span></div>
              {proj.role && <p className="text-[8px] text-[#444] italic">{proj.role}</p>}
              {proj.bullets.map((b, j) => <p key={j} className="text-[8px] text-[#374151] pl-2">• {b}</p>)}
            </div>
          ))}</>
      )}

      {resume.education.length > 0 && (
        <><SectionHead label="Education" />
          {resume.education.map((edu, i) => (
            <div key={i} style={{ marginBottom: "var(--entry-spacing)" }}>
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
