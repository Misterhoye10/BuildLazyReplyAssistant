export type Tone = "friendly" | "professional" | "brief"

export type AnalysisResult = {
  summary: string
  importantPoints: string[]
  actionItems: string[]
  suggestedReply: string
}

const API_URL = import.meta.env.VITE_LAZYREPLY_API_URL

export async function analyzeMessage(
  message: string,
  tone: Tone,
): Promise<AnalysisResult> {
  if (!API_URL) {
    throw new Error(
      "The AI backend is not connected in this preview. Configure VITE_LAZYREPLY_API_URL to connect your Flask endpoint.",
    )
  }

  const response = await fetch(`${API_URL.replace(/\/$/, "")}/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, tone }),
  })

  if (!response.ok) {
    throw new Error(
      response.status >= 500
        ? "The AI service is taking a breather. Please try again in a moment."
        : "We couldn’t process that message. Check it and try again.",
    )
  }

  return (await response.json()) as AnalysisResult
}
