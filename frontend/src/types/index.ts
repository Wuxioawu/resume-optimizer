export interface Suggestion {
  id: string
  section: "Summary" | "Experience" | "Skills" | "Education" | "Other"
  original: string
  suggested: string
  reason: string
  impact: "high" | "medium" | "low"
  accepted: boolean
}

export interface AnalyzeResponse {
  suggestions: Suggestion[]
  resume_text: string
  match_score: number
  temp_file_id: string
}
