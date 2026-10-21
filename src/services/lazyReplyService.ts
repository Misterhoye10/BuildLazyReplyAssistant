export type Tone = "friendly" | "professional" | "brief"

export type ActionItem = {
  task: string
  deadline: string | null
}

export type AnalysisResult = {
  summary: string
  key_points?: string[]
  importantPoints: string[]
  questions: string[]
  action_items?: ActionItem[]
  actionItems: string[]
  suggestedReply: string
  suggested_reply?: string
}

// In production on Vercel, VITE_LAZYREPLY_API_URL points to the Render backend (e.g. https://lazyreply-api.onrender.com).
// In development, relative "/api/process" is automatically proxied by Vite to the Flask backend on port 5000.
const API_URL = import.meta.env.VITE_LAZYREPLY_API_URL
  ? import.meta.env.VITE_LAZYREPLY_API_URL.replace(/\/$/, "")
  : ""

export async function analyzeMessage(
  message: string,
  tone: Tone,
): Promise<AnalysisResult> {
  // Use relative endpoint when in development to leverage the Vite proxy (avoids mixed content & CORS)
  const isLocalBackend =
    API_URL.includes("localhost:5000") || API_URL.includes("127.0.0.1:5000")
  const endpoint =
    API_URL && !isLocalBackend ? `${API_URL}/api/process` : "/api/process"

  let response: Response
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, tone }),
    })
  } catch (err) {
    throw new Error(
      "Unable to reach the LazyReply backend. Please verify that the server is running.",
    )
  }

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error(
        "Please sign in or use the 1-Click Demo Pass to analyze messages.",
      )
    }

    let errorDetail = ""
    try {
      const errorJson = await response.json()
      if (errorJson && errorJson.error) {
        errorDetail = errorJson.error
      }
    } catch {
      // ignore json parse errors on non-200 responses
    }

    if (errorDetail) {
      throw new Error(errorDetail)
    }

    throw new Error(
      response.status >= 500
        ? "The AI service is taking a breather. Please try again in a moment."
        : "We couldn’t process that message. Check it and try again.",
    )
  }

  const raw = await response.json()

  // Normalize key points / important points
  const importantPoints: string[] = Array.isArray(raw.key_points)
    ? raw.key_points
    : Array.isArray(raw.importantPoints)
      ? raw.importantPoints
      : []

  // Normalize questions
  const questions: string[] = Array.isArray(raw.questions) ? raw.questions : []

  // Normalize action items
  let actionItems: string[] = []
  if (Array.isArray(raw.actionItems) && raw.actionItems.length > 0) {
    actionItems = raw.actionItems
  } else if (Array.isArray(raw.action_items)) {
    actionItems = raw.action_items.map((item: any) => {
      if (typeof item === "string") return item
      if (item && item.task) {
        return item.deadline
          ? `${item.task} (Deadline: ${item.deadline})`
          : item.task
      }
      return String(item)
    })
  }

  const suggestedReply =
    raw.suggested_reply || raw.suggestedReply || raw.reply || ""

  return {
    summary: raw.summary || "",
    key_points: importantPoints,
    importantPoints,
    questions,
    action_items: raw.action_items,
    actionItems,
    suggestedReply,
    suggested_reply: suggestedReply,
  }
}

export type RefineAction = "shorter" | "warmer" | "formal" | "regenerate"

export async function refineReply(
  originalMessage: string,
  currentReply: string,
  action: RefineAction,
): Promise<string> {
  const isLocalBackend =
    API_URL.includes("localhost:5000") || API_URL.includes("127.0.0.1:5000")
  const endpoint =
    API_URL && !isLocalBackend
      ? `${API_URL}/api/refine-reply`
      : "/api/refine-reply"

  let response: Response
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        original_message: originalMessage,
        current_reply: currentReply,
        action,
      }),
    })
  } catch (err) {
    throw new Error(
      "Unable to reach the LazyReply backend to refine the reply.",
    )
  }

  if (!response.ok) {
    let errorDetail = ""
    try {
      const errorJson = await response.json()
      if (errorJson && errorJson.error) {
        errorDetail = errorJson.error
      }
    } catch {
      // ignore
    }
    throw new Error(errorDetail || "Could not refine the reply.")
  }

  const data = await response.json()
  return data.suggested_reply || data.suggestedReply || currentReply
}
