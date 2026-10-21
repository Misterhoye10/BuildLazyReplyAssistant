import json
import re
import requests
try:
    from backend.config import Config
except ImportError:
    from config import Config

class AIServiceError(Exception):
    """Custom exception for AI service errors."""
    def __init__(self, message: str, status_code: int = 502):
        super().__init__(message)
        self.status_code = status_code

def build_system_prompt(tone: str) -> str:
    tone_instructions = {
        "friendly": "Warm, conversational, approachable, and appreciative while remaining helpful and clear.",
        "professional": "Polished, courteous, direct, respectful, and suitable for workplace communication.",
        "brief": "Ultra-concise, punchy, and direct (1-3 sentences maximum) while addressing the core need.",
    }

    selected_tone_instruction = tone_instructions.get(
        tone.lower(), tone_instructions["professional"]
    )

    return f"""You are the intelligence engine of LazyReply, an AI productivity assistant designed to turn long, messy messages into clear summaries, actionable insights, and ready-to-send replies.

Your task is to analyze the user's submitted message and return a strictly valid JSON object.

### RULES & CONSTRAINTS:
1. NEVER hallucinate or invent facts, figures, deadlines, or names not present in the original message.
2. If a section contains no relevant information, return an empty array []. Do NOT fabricate questions, tasks, or deadlines.
3. For action items, extract only explicit commitments, requests, or tasks. Provide a 'deadline' string only if explicitly mentioned (e.g., "Friday at 3 PM"); otherwise, set 'deadline' to null.
4. For questions, extract questions that the sender explicitly asks that may require the recipient to respond. If none, return [].
5. Suggested Reply tone: {tone.upper()}. Style: {selected_tone_instruction}
   - The reply must address the sender's points accurately.
   - If the sender asked a question that depends on the user's personal schedule, knowledge, or decision, DO NOT guess or pretend to know. Instead, insert a clear editable placeholder like "[Insert your availability]" or "[Add preferred date]".
   - The user will copy and edit this reply before sending.

### JSON OUTPUT FORMAT:
You must respond ONLY with a JSON object matching this exact structure:
{{
  "summary": "Concise summary capturing the core purpose and critical facts.",
  "key_points": [
    "Key point 1",
    "Key point 2"
  ],
  "questions": [
    "Sender question 1 requiring recipient reply"
  ],
  "action_items": [
    {{
      "task": "Explicit action or task",
      "deadline": "Deadline string if mentioned or null"
    }}
  ],
  "suggested_reply": "Ready-to-send response written in the specified {tone} tone."
}}"""

def clean_and_parse_json(raw_text: str) -> dict:
    """Safely parse JSON response from the model, handling markdown fences or surrounding commentary."""
    text = raw_text.strip()
    
    # Direct parse attempt
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    # Match json code block ```json ... ```
    match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", text)
    if match:
        try:
            return json.loads(match.group(1).strip())
        except json.JSONDecodeError:
            pass

    # Match outermost curly braces
    first_brace = text.find("{")
    last_brace = text.rfind("}")
    if first_brace != -1 and last_brace != -1 and last_brace > first_brace:
        try:
            return json.loads(text[first_brace : last_brace + 1])
        except json.JSONDecodeError:
            pass

    raise AIServiceError("The AI model returned an unparseable response. Please try again.", status_code=502)

def process_message(message: str, tone: str) -> dict:
    """Analyze message using Groq open-weight inference and return structured JSON."""
    api_key = Config.GROQ_API_KEY
    if not api_key:
        raise AIServiceError(
            "AI service is not configured on the server. Please set GROQ_API_KEY in the environment.",
            status_code=503,
        )

    system_prompt = build_system_prompt(tone)
    user_prompt = f"Please analyze this message:\n\n---\n{message}\n---"

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    payload = {
        "model": Config.GROQ_MODEL,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        "response_format": {"type": "json_object"},
        "temperature": 0.2,
        "max_tokens": 1500,
    }

    url = f"{Config.AI_API_BASE.rstrip('/')}/chat/completions"

    try:
        response = requests.post(url, headers=headers, json=payload, timeout=Config.REQUEST_TIMEOUT)
    except requests.exceptions.Timeout:
        raise AIServiceError("The AI service request timed out. Please try again.", status_code=504)
    except requests.exceptions.RequestException as e:
        raise AIServiceError(f"Network error connecting to AI provider: {str(e)}", status_code=502)

    if response.status_code == 401 or response.status_code == 403:
        raise AIServiceError("AI provider authentication failed. Check server configuration.", status_code=500)
    elif response.status_code == 429:
        raise AIServiceError("AI service rate limit reached. Please wait a moment and try again.", status_code=429)
    elif response.status_code != 200:
        error_msg = "AI inference provider returned an error."
        try:
            err_json = response.json()
            if "error" in err_json and "message" in err_json["error"]:
                error_msg = err_json["error"]["message"]
        except Exception:
            pass
        raise AIServiceError(f"AI provider error: {error_msg}", status_code=502)

    data = response.json()
    choices = data.get("choices", [])
    if not choices or not choices[0].get("message", {}).get("content"):
        raise AIServiceError("No output returned from the AI model.", status_code=502)

    raw_content = choices[0]["message"]["content"]
    parsed = clean_and_parse_json(raw_content)

    # Validate and normalize structure
    summary = str(parsed.get("summary", "")).strip()
    key_points = parsed.get("key_points", [])
    if not isinstance(key_points, list):
        key_points = [str(key_points)] if key_points else []
    key_points = [str(p).strip() for p in key_points if str(p).strip()]

    questions = parsed.get("questions", [])
    if not isinstance(questions, list):
        questions = [str(questions)] if questions else []
    questions = [str(q).strip() for q in questions if str(q).strip()]

    raw_actions = parsed.get("action_items", [])
    action_items = []
    if isinstance(raw_actions, list):
        for item in raw_actions:
            if isinstance(item, dict):
                task = str(item.get("task", "")).strip()
                deadline = item.get("deadline")
                if deadline is not None:
                    deadline = str(deadline).strip() or None
                if task:
                    action_items.append({"task": task, "deadline": deadline})
            elif isinstance(item, str) and item.strip():
                action_items.append({"task": item.strip(), "deadline": None})

    suggested_reply = str(parsed.get("suggested_reply", "")).strip()

    # Formatted action items as strings for backwards compatibility & clean display
    formatted_actions = []
    for item in action_items:
        if item["deadline"]:
            formatted_actions.append(f"{item['task']} (Deadline: {item['deadline']})")
        else:
            formatted_actions.append(item["task"])

    return {
        "summary": summary,
        "key_points": key_points,
        "questions": questions,
        "action_items": action_items,
        "suggested_reply": suggested_reply,
        # Aliases for frontend compatibility
        "importantPoints": key_points,
        "actionItems": formatted_actions,
        "suggestedReply": suggested_reply,
    }

def refine_reply(original_message: str, current_reply: str, action: str) -> str:
    """Refine an existing reply draft (e.g. shorter, warmer, formal, regenerate)."""
    api_key = Config.GROQ_API_KEY
    if not api_key:
        raise AIServiceError(
            "AI service is not configured on the server. Please set GROQ_API_KEY in the environment.",
            status_code=503,
        )

    action_prompts = {
        "shorter": "Make the reply extremely concise, punchy, and direct (1 to 2 sentences max) while retaining the core response points.",
        "warmer": "Make the reply friendly, approachable, warm, and appreciative without adding fluff.",
        "formal": "Make the reply highly professional, polite, polished, and suitable for executive or corporate communication.",
        "regenerate": "Provide a fresh, natural alternative draft addressing the sender's points.",
    }

    instruction = action_prompts.get(action.lower(), "Provide a refined and clear alternative draft.")

    system_prompt = f"""You are LazyReply's fast reply refiner.
Your job is to rewrite the suggested reply based on this instruction:
{instruction}

RULES:
1. Never fabricate commitments, facts, or deadlines not mentioned.
2. If the user's availability or personal schedule is required, preserve honest placeholders like [Insert availability].
3. Respond ONLY with the refined reply text. Do NOT wrap in quotes, do NOT add introductory pleasantries like 'Here is the refined reply:'."""

    user_prompt = f"""Original message context:
{original_message}

Current suggested reply draft:
{current_reply}

Please refine the reply:"""

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    payload = {
        "model": Config.GROQ_MODEL,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        "temperature": 0.3,
        "max_tokens": 500,
    }

    url = f"{Config.AI_API_BASE.rstrip('/')}/chat/completions"

    try:
        response = requests.post(url, headers=headers, json=payload, timeout=Config.REQUEST_TIMEOUT)
    except requests.exceptions.Timeout:
        raise AIServiceError("The reply refinement request timed out. Please try again.", status_code=504)
    except requests.exceptions.RequestException as e:
        raise AIServiceError(f"Network error connecting to AI provider: {str(e)}", status_code=502)

    if response.status_code != 200:
        raise AIServiceError("Failed to refine reply from AI provider.", status_code=502)

    data = response.json()
    choices = data.get("choices", [])
    if not choices or not choices[0].get("message", {}).get("content"):
        raise AIServiceError("No output returned from the AI model.", status_code=502)

    refined = choices[0]["message"]["content"].strip()
    if refined.startswith('"') and refined.endswith('"'):
        refined = refined[1:-1].strip()
    return refined

