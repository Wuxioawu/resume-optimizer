export interface Suggestion {
  id: string
  section: "Summary" | "Experience" | "Skills" | "Education" | "Other"
  original: string
  suggested: string
  reason: string
  impact: "high" | "medium" | "low"
  accepted: boolean
}

export interface ExperienceEntry {
  company: string
  title: string
  date: string
  location: string
  bullets: string[]
}

export interface ProjectEntry {
  name: string
  role: string
  date: string
  bullets: string[]
}

export interface EducationEntry {
  school: string
  degree: string
  date: string
  location: string
}

export interface ResumeData {
  name: string
  contact: string
  summary: string
  experience: ExperienceEntry[]
  projects: ProjectEntry[]
  education: EducationEntry[]
  skills: string
}

export interface AnalyzeResponse {
  suggestions: Suggestion[]
  resume_text: string
  match_score: number
  temp_file_id: string
  parsed_resume: ResumeData
}
