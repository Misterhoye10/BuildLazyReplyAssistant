# LazyReply — AI-Powered Messaging Productivity Assistant

> Turn long, overwhelming messages into clear summaries, actionable insights, and ready-to-send replies with minimal effort.

---

## Overview

**LazyReply** helps professionals, teams, and busy individuals handle message overload without spending valuable cognitive energy decoding, interpreting, and drafting replies.

Users paste long emails, work threads, or conversation snippets into the interface. LazyReply analyzes the message using an **open-weight AI instruction-following model**, extracting:
1. **Quick Summary**: The core purpose and essential context.
2. **Important Points**: Critical facts, figures, dates, and background.
3. **Questions to Answer**: Sender questions that explicitly require a response.
4. **Action Items & Deadlines**: Tasks and commitments with explicitly stated deadlines.
5. **Suggested Reply**: A ready-to-send draft composed in the user's preferred tone (**Friendly**, **Professional**, or **Brief**).

---

## Technology Stack

- **Frontend**:
  - React 19 & TypeScript 5.7
  - Tailwind CSS v4 (via `@tailwindcss/vite`)
  - Vite 8 build tool
  - Responsive, accessible design generated via Figma Make
- **Backend**:
  - Python 3.13 with Flask 3.1
  - Flask-CORS for secure cross-origin resource sharing
  - Python-dotenv for environment variable isolation
  - Gunicorn WSGI production server
- **AI Inference**:
  - **Groq Cloud LPU Inference**: Blazing-fast (<1 second) response time using genuine open-weight models (`qwen/qwen3.8-27b`, `llama-3.3-70b-versatile`).
  - Native JSON mode enforcement with fallback JSON sanitization.

---

## Architecture & API Contract

### System Flow

```
[User Interface] (React / Vite)
       │
       ▼  POST /api/process { message, tone }
[Backend API] (Python Flask)
       │
       ▼  Validates length (<=4,000), non-empty, tone whitelist
[AI Service] (Groq LPU / Open-Weight Model)
       │
       ▼  Structured JSON extraction & normalization
[User Interface]
       │
       ▼ Displays: Summary, Key Points, Questions, Action Items, Suggested Reply
[Clipboard Copy with Feedback]
```

### API Endpoints

#### 1. `GET /api/health`
Verifies backend operational status.
- **Response `200 OK`**:
  ```json
  {
    "status": "healthy",
    "service": "LazyReply API",
    "version": "1.0.0",
    "provider": "Groq",
    "model_configured": true,
    "model": "qwen/qwen3.8-27b"
  }
  ```

#### 2. `POST /api/process` (also aliased to `/analyze`)
Processes user message and generates structured analysis.
- **Request Body**:
  ```json
  {
    "message": "Hi Maya, please send the final proposal by Friday at 3 PM...",
    "tone": "professional"
  }
  ```
  *Allowed tones:* `friendly`, `professional`, `brief`.
- **Response `200 OK`**:
  ```json
  {
    "summary": "Daniel confirms team approval and requests final proposal with budget under $48,000 by Friday at 3 PM.",
    "key_points": [
      "The revised scope has been approved.",
      "Budget must stay under $48,000.",
      "Client meeting is scheduled for Monday at 10 AM."
    ],
    "questions": [
      "Could you send the final version by Friday at 3 PM?",
      "Let me know if the timing is tight."
    ],
    "action_items": [
      {
        "task": "Send final proposal with updated budget and change log",
        "deadline": "Friday at 3 PM"
      }
    ],
    "suggested_reply": "Hi Daniel, thanks for the feedback...",
    "importantPoints": [...],
    "actionItems": [
      "Send final proposal with updated budget and change log (Deadline: Friday at 3 PM)"
    ],
    "suggestedReply": "Hi Daniel, thanks for the feedback..."
  }
  ```

#### 3. `POST /api/refine-reply`
Ultra-fast single-card refinement for the suggested reply draft without re-analyzing the entire message.
- **Request Body**:
  ```json
  {
    "original_message": "Can you send the pitch deck by Friday at 3 PM?",
    "current_reply": "I will send the pitch deck by Friday at 3 PM.",
    "action": "shorter"
  }
  ```
  *Allowed actions:* `shorter`, `warmer`, `formal`, `regenerate`.
- **Response `200 OK`**:
  ```json
  {
    "suggested_reply": "Deck sent by Friday 3 PM."
  }
  ```

---

## Environment Variables

### Backend Configuration (`backend/.env`)

| Variable | Description | Example Value |
| :--- | :--- | :--- |
| `GROQ_API_KEY` | Groq Cloud API Key | `gsk_your_groq_api_key_here` |
| `GROQ_MODEL` | Open-weight model ID | `qwen/qwen3.8-27b` |
| `PORT` | Local server port | `5000` |
| `FLASK_ENV` | Environment mode | `development` or `production` |
| `CORS_ORIGIN` | Allowed CORS origin | `*` or `https://your-app.vercel.app` |

### Frontend Configuration (`.env`)

| Variable | Description | Example Value |
| :--- | :--- | :--- |
| `VITE_LAZYREPLY_API_URL` | Backend URL for production | `http://localhost:5000` (or Render URL) |

*(Note: Never commit `.env` files containing real secrets to GitHub. Both root `.env` and `backend/.env` are ignored by `.gitignore`).*

---

## Getting Started Locally

### Prerequisites
- Node.js 18+ and npm
- Python 3.10+

### 1. Clone the Repository
```bash
git clone https://github.com/Misterhoye10/BuildLazyReplyAssistant.git
cd BuildLazyReplyAssistant
```

### 2. Backend Setup
```bash
# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
.\venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r backend/requirements.txt

# Configure environment
cp backend/.env.example backend/.env
# Add your GROQ_API_KEY in backend/.env

# Run the Flask backend server
python -m backend.app
# Backend runs at http://localhost:5000
```

### 3. Frontend Setup
In a new terminal window:
```bash
# Install frontend packages
npm install

# Start development server
npm run dev
# App preview available at http://localhost:8443
```

---

## Running Automated Tests

### Backend Unit & Integration Tests (Pytest)
```bash
.\venv\Scripts\python.exe -m pytest backend/tests
```
Runs 10 automated test suites covering:
- Health check uptime
- Input validation (empty, whitespace, length limit, invalid tones)
- API contract matching PRD specification
- AI error handling and rate limit management
- End-to-end integration with live Groq open-weight inference

### Frontend Production Build Test
```bash
npm run build
```

---

## Deployment Guide

### Backend Deployment (Render)
1. Push your repository to GitHub.
2. In [Render Dashboard](https://dashboard.render.com), click **New +** -> **Blueprint** or **Web Service**.
3. If using **Web Service**:
   - **Environment**: Python
   - **Build Command**: `pip install -r backend/requirements.txt`
   - **Start Command**: `gunicorn --bind 0.0.0.0:$PORT backend.app:app`
4. In **Environment Variables**, add:
   - `GROQ_API_KEY`: Your Groq API key
   - `GROQ_MODEL`: `qwen/qwen3.8-27b`
   - `FLASK_ENV`: `production`
   - `CORS_ORIGIN`: `*` (or your frontend Vercel URL)
5. Copy your live Render URL (e.g. `https://lazyreply-api.onrender.com`).

### Frontend Deployment (Vercel)
1. In [Vercel Dashboard](https://vercel.com), click **Add New** -> **Project** and select this repository.
2. Framework Preset will auto-detect as **Vite**.
3. Under **Environment Variables**, add:
   - `VITE_LAZYREPLY_API_URL`: Your live backend Render URL (e.g. `https://lazyreply-api.onrender.com`).
4. Click **Deploy**.

---

## Security & Privacy

- **Zero Data Retention**: LazyReply does not persist messages, generated summaries, or conversation history in any database.
- **In-Memory Only**: Message processing is purely ephemeral.
- **No Client Secrets**: API keys are isolated exclusively to the server-side environment.
- **Input Guardrails**: 4,000 character maximum validation on both client and server to prevent payload abuse.

---

## License

MIT License. Designed and built with pride for productivity.
