import axios from "axios"
import type { AnalyzeResponse, ResumeData, Suggestion } from "../types"

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000"

export async function analyzeResume(
  resume: File,
  jobDescription: string
): Promise<AnalyzeResponse> {
  const form = new FormData()
  form.append("resume", resume)
  form.append("job_description", jobDescription)

  const { data } = await axios.post<AnalyzeResponse>(`${BASE_URL}/api/analyze`, form, {
    headers: { "Content-Type": "multipart/form-data" },
  })
  return data
}

export async function exportResume(
  parsedResume: ResumeData,
  acceptedSuggestions: Suggestion[]
): Promise<Blob> {
  const { data } = await axios.post(
    `${BASE_URL}/api/export`,
    {
      parsed_resume: parsedResume,
      accepted_suggestions: acceptedSuggestions,
    },
    { responseType: "blob" }
  )
  return data
}
