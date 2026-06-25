import axios from "axios"
import type { AnalyzeResponse, ResumeData } from "../types"

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000"

export async function analyzeResume(
  resume: File,
  jobDescription: string
): Promise<AnalyzeResponse> {
  const form = new FormData()
  form.append("resume", resume)
  form.append("job_description", jobDescription)

  try {
    const { data } = await axios.post<AnalyzeResponse>(`${BASE_URL}/api/analyze`, form, {
      headers: { "Content-Type": "multipart/form-data" },
      timeout: 60_000,
    })
    return data
  } catch (err) {
    if (axios.isAxiosError(err) && err.code === "ECONNABORTED") {
      throw new Error("Analysis timed out. The AI models are busy — please try again in a moment.")
    }
    throw err
  }
}

export async function exportResume(parsedResume: ResumeData): Promise<Blob> {
  const { data } = await axios.post(
    `${BASE_URL}/api/export`,
    {
      parsed_resume: parsedResume,
      accepted_suggestions: [],
    },
    { responseType: "blob" }
  )
  return data
}
