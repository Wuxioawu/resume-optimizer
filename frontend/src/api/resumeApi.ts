import axios from "axios"
import type { AnalyzeResponse, Suggestion } from "../types"

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
  tempFileId: string,
  acceptedSuggestions: Suggestion[]
): Promise<Blob> {
  const { data } = await axios.post(
    `${BASE_URL}/api/export`,
    { temp_file_id: tempFileId, accepted_suggestions: acceptedSuggestions },
    { responseType: "blob" }
  )
  return data
}
