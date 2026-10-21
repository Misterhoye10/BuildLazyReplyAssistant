import { useRef, useState, type ReactNode } from "react"
import {
  analyzeMessage,
  refineReply,
  type AnalysisResult,
  type RefineAction,
  type Tone,
} from "./services/lazyReplyService"

const SAMPLE_MESSAGE = `Hi Maya,

Thanks again for walking us through the revised proposal. The overall direction looks strong, and the team is happy with the updated scope.

Could you send the final version by Friday at 3 PM? Please include the updated budget breakdown—we need to keep the total under $48,000—and call out what changed from the first draft.

We’re meeting with the client on Monday at 10 AM, so I’d also love a few talking points before then. Let me know if the timing is tight.

Best,
Daniel`

const SAMPLE_RESULT: AnalysisResult = {
  summary:
    "Daniel likes the revised proposal and needs the final version, with budget details and key changes, before a Monday client meeting.",
  importantPoints: [
    "The revised scope and direction have been approved by the team.",
    "The total updated budget must stay under $48,000.",
    "A client meeting is scheduled for Monday at 10 AM.",
  ],
  questions: [
    "Could you send the final version by Friday at 3 PM?",
    "Let me know if the timing is tight.",
  ],
  actionItems: [
    "Send the final proposal by Friday at 3 PM.",
    "Add the updated budget breakdown and highlight changes from the first draft.",
    "Share a few client talking points before Monday.",
  ],
  suggestedReply:
    "Hi Daniel, thanks for the clear feedback. I’ll send the final proposal by Friday at 3 PM with the revised budget breakdown, keeping the total under $48,000, and a summary of changes from the first draft. I’ll also include a few talking points for Monday’s client meeting. The timing works on my end.",
}

type IconName =
  | "arrow"
  | "bolt"
  | "check"
  | "clipboard"
  | "clock"
  | "copy"
  | "feather"
  | "lock"
  | "refresh"
  | "spark"
  | "target"
  | "user"
  | "x"
  | "eye"
  | "eye-off"

function Icon({
  name,
  className = "size-5",
}: {
  name: IconName
  className?: string
}) {
  const paths: Record<IconName, ReactNode> = {
    arrow: (
      <>
        <path d="M5 12h14" />
        <path d="m13 6 6 6-6 6" />
      </>
    ),
    bolt: <path d="m13 2-9 12h7l-1 8 9-12h-7l1-8Z" />,
    check: <path d="m5 12 4 4L19 6" />,
    clipboard: (
      <>
        <rect width="14" height="16" x="5" y="5" rx="2" />
        <path d="M9 5a3 3 0 0 1 6 0v1H9V5Z" />
        <path d="m9 13 2 2 4-4" />
      </>
    ),
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    copy: (
      <>
        <rect width="13" height="13" x="8" y="8" rx="2" />
        <path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3" />
      </>
    ),
    feather: (
      <>
        <path d="M20 4c-6-1-12 2-14 8-1 3 0 6 0 6s3 1 6 0c6-2 9-8 8-14Z" />
        <path d="M4 21c3-6 7-10 13-14" />
      </>
    ),
    lock: (
      <>
        <rect width="16" height="12" x="4" y="9" rx="3" />
        <path d="M8 9V7a4 4 0 0 1 8 0v2" />
      </>
    ),
    refresh: (
      <>
        <path d="M20 7v5h-5" />
        <path d="M4 17v-5h5" />
        <path d="M6.1 9a7 7 0 0 1 11.6-2L20 12" />
        <path d="m4 12 2.3 5a7 7 0 0 0 11.6-2" />
      </>
    ),
    spark: (
      <>
        <path d="m12 3 1.2 4.3a5 5 0 0 0 3.5 3.5L21 12l-4.3 1.2a5 5 0 0 0-3.5 3.5L12 21l-1.2-4.3a5 5 0 0 0-3.5-3.5L3 12l4.3-1.2a5 5 0 0 0 3.5-3.5L12 3Z" />
      </>
    ),
    target: (
      <>
        <circle cx="12" cy="12" r="9" />
        <circle cx="12" cy="12" r="4" />
        <path d="M12 8V3" />
      </>
    ),
    user: (
      <>
        <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </>
    ),
    x: (
      <>
        <path d="M18 6 6 18" />
        <path d="m6 6 12 12" />
      </>
    ),
    eye: (
      <>
        <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
        <circle cx="12" cy="12" r="3" />
      </>
    ),
    "eye-off": (
      <>
        <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
        <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
        <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
        <line x1="2" x2="22" y1="2" y2="22" />
      </>
    ),
  }

  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[name]}
    </svg>
  )
}

function Logo() {
  return (
    <a
      className="group inline-flex items-center gap-2.5"
      href="#"
      aria-label="LazyReply home"
    >
      <span className="grid size-8 place-items-center rounded-xl bg-ink text-cream transition-transform group-hover:-rotate-3">
        <Icon name="feather" className="size-4" />
      </span>
      <span className="text-[1.05rem] font-bold tracking-[-0.04em]">
        LazyReply
      </span>
    </a>
  )
}

function Button({
  children,
  variant = "primary",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost"
}) {
  const styles = {
    primary:
      "bg-ink text-cream shadow-button hover:-translate-y-0.5 hover:bg-forest hover:shadow-button-hover disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-55",
    secondary:
      "border border-line bg-white/70 text-ink hover:border-sage-dark hover:bg-sage-pale",
    ghost: "text-muted hover:bg-sage-pale hover:text-ink",
  }

  return (
    <button
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest ${styles[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}

function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="mb-4 flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-[0.17em] text-forest">
      <span className="h-px w-5 bg-sage-dark" />
      {children}
      <span className="h-px w-5 bg-sage-dark" />
    </p>
  )
}

function SectionTitle({
  children,
  copy,
}: {
  children: ReactNode
  copy: string
}) {
  return (
    <div className="mx-auto mb-12 max-w-2xl text-center">
      <Eyebrow>Built for busy inboxes</Eyebrow>
      <h2 className="font-display text-4xl leading-tight tracking-[-0.04em] text-balance sm:text-5xl">
        {children}
      </h2>
      <p className="mx-auto mt-4 max-w-xl leading-7 text-muted">{copy}</p>
    </div>
  )
}

function ProductPreview() {
  return (
    <div className="relative mx-auto mt-16 max-w-5xl px-2 sm:px-6">
      <div className="absolute inset-x-20 bottom-0 top-16 -z-10 rounded-full bg-sage/25 blur-3xl" />
      <div className="preview-float overflow-hidden rounded-[1.75rem] border border-line bg-white/85 p-2 shadow-product backdrop-blur sm:p-3">
        <div className="flex items-center justify-between border-b border-line px-4 py-3 sm:px-5">
          <div className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-clay/55" />
            <span className="size-2.5 rounded-full bg-gold/55" />
            <span className="size-2.5 rounded-full bg-sage-dark/55" />
          </div>
          <span className="rounded-full bg-sage-pale px-3 py-1 text-[0.65rem] font-bold uppercase tracking-wider text-forest">
            Product preview
          </span>
          <span className="w-12" />
        </div>
        <div className="grid gap-3 bg-canvas/70 p-3 sm:p-5 md:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-2xl border border-line bg-white p-5">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-sm font-bold">Paste your message</span>
              <span className="text-xs text-faint">482 / 4,000</span>
            </div>
            <div className="min-h-44 rounded-xl border border-line bg-canvas p-4 text-left text-sm leading-6 text-muted">
              Hi Maya, thanks again for walking us through the revised proposal.
              The overall direction looks strong...
            </div>
            <div className="mt-4 flex gap-2">
              {["Friendly", "Professional", "Brief"].map((tone, index) => (
                <span
                  className={`rounded-lg px-3 py-2 text-xs font-semibold ${
                    index === 0
                      ? "bg-sage-pale text-forest ring-1 ring-sage"
                      : "bg-canvas text-muted"
                  }`}
                  key={tone}
                >
                  {tone}
                </span>
              ))}
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              [
                "Quick Summary",
                "Final proposal is needed by Friday ahead of Monday’s client meeting.",
              ],
              [
                "Important Points",
                "Budget must stay under $48,000 and show revised costs.",
              ],
              [
                "Action Items",
                "Finalize proposal • Add budget • Prepare talking points",
              ],
              [
                "Suggested Reply",
                "Thanks for the clear feedback. I’ll send the final version by Friday...",
              ],
            ].map(([title, copy], index) => (
              <div
                className={`rounded-2xl border border-line bg-white p-4 text-left ${
                  index === 3 ? "sm:col-span-2" : ""
                }`}
                key={title}
              >
                <div className="mb-3 flex items-center gap-2 text-xs font-bold text-forest">
                  <span className="grid size-6 place-items-center rounded-lg bg-sage-pale">
                    <Icon
                      name={
                        index === 2
                          ? "clipboard"
                          : index === 3
                            ? "feather"
                            : "spark"
                      }
                      className="size-3.5"
                    />
                  </span>
                  {title}
                </div>
                <p className="text-xs leading-5 text-muted">{copy}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

type ResultSectionProps = {
  title: string
  icon: IconName
  content?: string | string[]
  loading?: boolean
  onCopy?: () => void
  copied?: boolean
  isEditable?: boolean
  onContentChange?: (val: string) => void
  onRefine?: (action: RefineAction) => void
  refineActionLoading?: RefineAction | null
}

function ResultSection({
  title,
  icon,
  content,
  loading,
  onCopy,
  copied,
  isEditable,
  onContentChange,
  onRefine,
  refineActionLoading,
}: ResultSectionProps) {
  const [isEditing, setIsEditing] = useState(false)

  return (
    <section className="group rounded-2xl border border-line bg-white p-5 transition-all hover:border-sage hover:shadow-soft">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="grid size-8 place-items-center rounded-xl bg-sage-pale text-forest">
            <Icon name={icon} className="size-4" />
          </span>
          <h3 className="text-sm font-bold tracking-[-0.01em]">{title}</h3>
        </div>
        {Boolean(
          content &&
            (Array.isArray(content) ? content.length > 0 : Boolean(content)),
        ) && (
          <button
            type="button"
            onClick={onCopy}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold text-muted transition hover:bg-sage-pale hover:text-forest focus-visible:outline-2 focus-visible:outline-forest"
            aria-label={`Copy ${title}`}
          >
            <Icon name={copied ? "check" : "copy"} className="size-3.5" />
            {copied ? "Copied" : "Copy"}
          </button>
        )}
      </div>
      {loading ? (
        <div className="space-y-2.5" aria-label={`Loading ${title}`}>
          <div className="shimmer h-3 w-full rounded-full" />
          <div className="shimmer h-3 w-5/6 rounded-full" />
          <div className="shimmer h-3 w-2/3 rounded-full" />
        </div>
      ) : Array.isArray(content) ? (
        content.length > 0 ? (
          <ul className="space-y-2.5">
            {content.map((item) => (
              <li
                className="flex gap-2.5 text-sm leading-6 text-body"
                key={item}
              >
                <span className="mt-2.5 size-1.5 shrink-0 rounded-full bg-sage-dark" />
                {item}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs italic text-muted">
            None explicitly mentioned in the message.
          </p>
        )
      ) : content ? (
        isEditable && isEditing ? (
          <div className="space-y-2">
            <textarea
              value={typeof content === "string" ? content : ""}
              onChange={(e) => onContentChange?.(e.target.value)}
              rows={4}
              className="w-full resize-y rounded-xl border border-sage-dark bg-canvas p-3 text-sm leading-6 text-body outline-none focus:bg-white focus:ring-2 focus:ring-sage/20"
              placeholder="Edit your reply draft..."
            />
            <p className="text-[0.7rem] italic text-muted">
              Tip: Fill in bracketed placeholders like [Insert availability]
              directly before copying.
            </p>
          </div>
        ) : (
          <p className="whitespace-pre-wrap text-sm leading-6 text-body">
            {content}
          </p>
        )
      ) : (
        <div className="space-y-2.5 opacity-60">
          <div className="h-2.5 w-full rounded-full bg-stone" />
          <div className="h-2.5 w-4/5 rounded-full bg-stone" />
          <div className="h-2.5 w-3/5 rounded-full bg-stone" />
        </div>
      )}

      {onRefine && content && !loading && (
        <div className="mt-4 border-t border-line/70 pt-3.5">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 text-[0.68rem] font-bold uppercase tracking-wider text-muted">
              <Icon name="spark" className="size-3 text-forest" /> Quick refine
            </span>
            {isEditable && (
              <button
                type="button"
                onClick={() => setIsEditing(!isEditing)}
                className="text-[0.72rem] font-semibold text-muted underline decoration-sage underline-offset-2 transition hover:text-forest"
              >
                {isEditing ? "Done editing" : "Edit draft manually"}
              </button>
            )}
          </div>

          <div className="flex flex-wrap gap-1.5">
            {[
              {
                action: "shorter" as RefineAction,
                label: "Make shorter",
                icon: "bolt" as IconName,
              },
              {
                action: "warmer" as RefineAction,
                label: "Warmer",
                icon: "spark" as IconName,
              },
              {
                action: "formal" as RefineAction,
                label: "More formal",
                icon: "clipboard" as IconName,
              },
              {
                action: "regenerate" as RefineAction,
                label: "Regenerate",
                icon: "refresh" as IconName,
              },
            ].map((btn) => (
              <button
                key={btn.action}
                type="button"
                disabled={Boolean(refineActionLoading)}
                onClick={() => onRefine(btn.action)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-canvas/70 px-2.5 py-1 text-xs font-semibold text-ink transition hover:border-sage hover:bg-white disabled:opacity-50"
              >
                {refineActionLoading === btn.action ? (
                  <span className="size-3 animate-spin rounded-full border border-forest/40 border-t-forest" />
                ) : (
                  <Icon name={btn.icon} className="size-3 text-forest" />
                )}
                {btn.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}

export type User = {
  name: string
  email: string
  provider?: "google" | "email"
}

function nameFromEmail(email: string): string {
  if (!email || !email.includes("@")) return "User"
  const local = email.split("@")[0].trim()
  const cleaned = local.replace(/[._-]+/g, " ")
  return (
    cleaned
      .split(" ")
      .filter(Boolean)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ") || "User"
  )
}

function AuthPage({
  onBack,
  onLogin,
}: {
  onBack: () => void
  onLogin: (user: User) => void
}) {
  const [tab, setTab] = useState<"signin" | "signup">("signin")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [isGooglePromptOpen, setIsGooglePromptOpen] = useState(false)
  const [googleEmail, setGoogleEmail] = useState("")

  const handleGoogleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const targetEmail = googleEmail.trim() || "user@gmail.com"
    const derivedName = nameFromEmail(targetEmail)
    onLogin({
      name: derivedName,
      email: targetEmail,
      provider: "google",
    })
  }

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    const cleanEmail = email.trim()
    if (!cleanEmail || !cleanEmail.includes("@")) {
      setError("Please enter a valid email address.")
      return
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.")
      return
    }

    const resolvedName =
      tab === "signup" && name.trim()
        ? name.trim()
        : nameFromEmail(cleanEmail)

    onLogin({
      name: resolvedName,
      email: cleanEmail,
      provider: "email",
    })
  }

  return (
    <div className="flex min-h-screen flex-col bg-cream text-ink">
      <header className="border-b border-line bg-white/60 px-5 py-4 backdrop-blur sm:px-8">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <button
            onClick={onBack}
            type="button"
            className="inline-flex items-center gap-2 text-xs font-semibold text-muted transition hover:text-ink"
          >
            <span className="grid size-7 place-items-center rounded-lg bg-sage-pale font-bold text-forest">
              ←
            </span>
            Back to home
          </button>
          <Logo />
          <div className="w-20" />
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center p-4 py-12 sm:p-6">
        <div className="w-full max-w-md overflow-hidden rounded-3xl border border-line bg-white p-7 shadow-product sm:p-9">
          <div className="text-center">
            <span className="mx-auto mb-3 grid size-12 place-items-center rounded-2xl bg-ink text-cream shadow-sm">
              <Icon name="feather" className="size-6" />
            </span>
            <h1 className="font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
              {tab === "signin" ? "Sign in to LazyReply" : "Create your account"}
            </h1>
            <p className="mt-1.5 text-xs text-muted">
              {tab === "signin"
                ? "Enter your details to access your AI message workspace."
                : "Join to turn long messages into clear summaries and replies."}
            </p>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-1 rounded-xl border border-line bg-canvas p-1">
            <button
              type="button"
              onClick={() => {
                setTab("signin")
                setError("")
              }}
              className={`rounded-lg py-2 text-xs font-semibold transition ${
                tab === "signin"
                  ? "bg-white text-ink shadow-sm"
                  : "text-muted hover:text-ink"
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setTab("signup")
                setError("")
              }}
              className={`rounded-lg py-2 text-xs font-semibold transition ${
                tab === "signup"
                  ? "bg-white text-ink shadow-sm"
                  : "text-muted hover:text-ink"
              }`}
            >
              Create Account
            </button>
          </div>

          <div className="mt-5">
            <button
              type="button"
              onClick={() => setIsGooglePromptOpen(true)}
              className="flex min-h-11 w-full items-center justify-center gap-2.5 rounded-xl border border-line bg-canvas/60 text-sm font-semibold text-ink shadow-sm transition hover:border-sage-dark hover:bg-sage-pale/40 focus-visible:outline-2 focus-visible:outline-forest"
            >
              <svg className="size-4 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              Continue with Google
            </button>
          </div>

          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-line" />
            <span className="text-[0.7rem] font-medium uppercase tracking-wider text-faint">
              or with email
            </span>
            <div className="h-px flex-1 bg-line" />
          </div>

          {error && (
            <div className="mb-4 rounded-xl border border-error/20 bg-error-pale p-3 text-xs text-error">
              {error}
            </div>
          )}

          <form onSubmit={handleEmailSubmit} className="space-y-3.5">
            {tab === "signup" && (
              <div>
                <label
                  className="mb-1 block text-xs font-semibold text-muted"
                  htmlFor="signup-name"
                >
                  Full Name
                </label>
                <input
                  id="signup-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. David Chen"
                  className="w-full rounded-xl border border-line bg-canvas/40 px-3.5 py-2.5 text-sm outline-none transition focus:border-sage-dark focus:bg-white focus:ring-2 focus:ring-sage/20"
                />
              </div>
            )}

            <div>
              <label
                className="mb-1 block text-xs font-semibold text-muted"
                htmlFor="auth-email-input"
              >
                Email Address
              </label>
              <input
                id="auth-email-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                required
                className="w-full rounded-xl border border-line bg-canvas/40 px-3.5 py-2.5 text-sm outline-none transition focus:border-sage-dark focus:bg-white focus:ring-2 focus:ring-sage/20"
              />
            </div>

            <div>
              <div className="mb-1 flex items-center justify-between">
                <label
                  className="block text-xs font-semibold text-muted"
                  htmlFor="auth-password-input"
                >
                  Password
                </label>
                {tab === "signin" && (
                  <span className="text-[0.68rem] text-muted">
                    Min 6 characters
                  </span>
                )}
              </div>
              <div className="relative">
                <input
                  id="auth-password-input"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full rounded-xl border border-line bg-canvas/40 px-3.5 py-2.5 pr-10 text-sm outline-none transition focus:border-sage-dark focus:bg-white focus:ring-2 focus:ring-sage/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-muted hover:text-ink"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  <Icon
                    name={showPassword ? "eye-off" : "eye"}
                    className="size-4"
                  />
                </button>
              </div>
            </div>

            <Button type="submit" className="mt-2 w-full py-3">
              {tab === "signin" ? "Sign In" : "Create Account"}
              <Icon name="arrow" className="size-4" />
            </Button>
          </form>

          <div className="mt-6 rounded-2xl border border-dashed border-line bg-canvas/50 p-3 text-center">
            <p className="text-[0.7rem] text-muted">
              Hackathon Judge?{" "}
              <button
                type="button"
                onClick={() =>
                  onLogin({
                    name: "Hackathon Judge",
                    email: "judge@hackathon.dev",
                    provider: "email",
                  })
                }
                className="ml-1 font-bold text-forest underline decoration-forest/30 hover:decoration-forest"
              >
                1-Click Fast Pass
              </button>
            </p>
          </div>
        </div>
      </main>

      {/* Interactive Google Sign-In Dialog */}
      {isGooglePromptOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl border border-line bg-white p-6 shadow-product animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div className="flex items-center gap-2">
                <svg className="size-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span className="text-xs font-bold text-muted">
                  Sign in with Google
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsGooglePromptOpen(false)}
                className="grid size-6 place-items-center rounded-full text-muted hover:bg-canvas"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleGoogleSubmit} className="mt-4">
              <p className="text-sm font-bold text-ink">
                Enter your Google Account
              </p>
              <p className="mt-1 text-xs text-muted">
                LazyReply will use your Google profile name and email for your
                session.
              </p>

              <div className="mt-3">
                <label className="mb-1 block text-xs font-semibold text-muted">
                  Google Account Email
                </label>
                <input
                  type="email"
                  value={googleEmail}
                  onChange={(e) => setGoogleEmail(e.target.value)}
                  placeholder="e.g. yourname@gmail.com"
                  required
                  autoFocus
                  className="w-full rounded-xl border border-line bg-canvas px-3 py-2 text-sm outline-none focus:border-sage-dark focus:bg-white"
                />
              </div>

              <div className="mt-4 flex gap-2">
                <Button type="submit" className="flex-1 py-2 text-xs">
                  Continue with Google
                </Button>
                <Button
                  variant="secondary"
                  type="button"
                  onClick={() => setIsGooglePromptOpen(false)}
                  className="py-2 text-xs"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

function Workspace({
  user,
  onRequireAuth,
  standalone = false,
}: {
  user: User | null
  onRequireAuth: () => void
  standalone?: boolean
}) {
  const [message, setMessage] = useState("")
  const [tone, setTone] = useState<Tone>("friendly")
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [status, setStatus] =
    useState<"idle" | "loading" | "success" | "error">("idle")
  const [error, setError] = useState("")
  const [validation, setValidation] = useState("")
  const [isExample, setIsExample] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  const [refineLoading, setRefineLoading] = useState<RefineAction | null>(null)
  const errorRef = useRef<HTMLDivElement>(null)

  const handleRefine = async (action: RefineAction) => {
    if (!result || !result.suggestedReply) return
    setRefineLoading(action)
    try {
      const refined = await refineReply(
        message,
        result.suggestedReply,
        action,
      )
      setResult((prev) =>
        prev
          ? {
              ...prev,
              suggestedReply: refined,
              suggested_reply: refined,
            }
          : null,
      )
    } catch {
      // Keep existing reply if refinement fails
    } finally {
      setRefineLoading(null)
    }
  }

  const handleReplyChange = (newText: string) => {
    setResult((prev) =>
      prev
        ? {
            ...prev,
            suggestedReply: newText,
            suggested_reply: newText,
          }
        : null,
    )
  }

  const handleMessageChange = (value: string) => {
    setMessage(value)
    setValidation("")
    if (isExample) {
      setResult(null)
      setStatus("idle")
      setIsExample(false)
    }
  }

  const loadExample = () => {
    setMessage(SAMPLE_MESSAGE)
    setTone("friendly")
    setResult(SAMPLE_RESULT)
    setStatus("success")
    setValidation("")
    setError("")
    setIsExample(true)
  }

  const reset = () => {
    setMessage("")
    setResult(null)
    setStatus("idle")
    setError("")
    setValidation("")
    setIsExample(false)
  }

  const submit = async () => {
    if (!user) {
      onRequireAuth()
      return
    }

    const trimmed = message.trim()
    if (!trimmed) {
      setValidation(
        "Paste a message first so LazyReply has something to untangle.",
      )
      return
    }
    if (message.length > 4000) {
      setValidation("Your message is over the 4,000 character limit.")
      return
    }

    setStatus("loading")
    setError("")
    setResult(null)
    setIsExample(false)
    try {
      const response = await analyzeMessage(trimmed, tone)
      setResult(response)
      setStatus("success")
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Something went wrong. Please try again.",
      )
      setStatus("error")
      requestAnimationFrame(() => errorRef.current?.focus())
    }
  }

  const copyContent = async (key: string, content: string | string[]) => {
    await navigator.clipboard.writeText(
      Array.isArray(content) ? content.join("\n") : content,
    )
    setCopied(key)
    window.setTimeout(() => setCopied(null), 1600)
  }

  const resultSections: Array<{
    key: keyof AnalysisResult
    title: string
    icon: IconName
  }> = [
    { key: "summary", title: "Quick Summary", icon: "spark" },
    { key: "importantPoints", title: "Important Points", icon: "target" },
    { key: "questions", title: "Questions to Answer", icon: "clock" },
    { key: "actionItems", title: "Action Items", icon: "clipboard" },
    { key: "suggestedReply", title: "Suggested Reply", icon: "feather" },
  ]

  return (
    <section
      className={`scroll-mt-6 ${
        standalone
          ? "bg-transparent py-2"
          : "bg-canvas px-4 py-20 sm:px-6 sm:py-28"
      }`}
      id="workspace"
    >
      <div className="mx-auto max-w-7xl">
        {!standalone && (
          <SectionTitle copy="Paste the message that’s taking up too much headspace. We’ll pull out what matters and help shape a reply.">
            From message overload to{" "}
            <em className="font-normal text-forest">handled.</em>
          </SectionTitle>
        )}

        <div className="grid overflow-hidden rounded-[1.75rem] border border-line bg-white shadow-product lg:grid-cols-[0.92fr_1.08fr]">
          <div className="border-b border-line bg-white p-5 sm:p-8 lg:border-b-0 lg:border-r">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.15em] text-forest">
                  Your message
                </p>
                <h3 className="mt-1.5 text-xl font-bold tracking-[-0.03em]">
                  What landed in your inbox?
                </h3>
              </div>
              <Button
                variant="secondary"
                onClick={loadExample}
                type="button"
                className="shrink-0"
              >
                <Icon name="spark" className="size-4" />
                <span className="hidden sm:inline">Try an example</span>
                <span className="sm:hidden">Example</span>
              </Button>
            </div>

            <label className="sr-only" htmlFor="message">
              Message to analyze
            </label>
            <textarea
              id="message"
              value={message}
              maxLength={4200}
              onChange={(event) => handleMessageChange(event.target.value)}
              placeholder="Paste a long email, Slack message, or text here..."
              aria-describedby={validation ? "message-error" : "message-count"}
              aria-invalid={Boolean(validation)}
              className={`min-h-72 w-full resize-y rounded-2xl border bg-canvas p-4 text-[0.95rem] leading-7 text-ink outline-none transition placeholder:text-faint focus:bg-white focus:ring-4 ${
                validation
                  ? "border-error/50 focus:border-error focus:ring-error/10"
                  : "border-line focus:border-sage-dark focus:ring-sage/25"
              }`}
            />
            <div className="mt-2 flex min-h-5 items-start justify-between gap-4 text-xs">
              <p
                className="font-medium text-error"
                id="message-error"
                role="alert"
              >
                {validation}
              </p>
              <p
                className={`ml-auto shrink-0 tabular-nums ${
                  message.length > 4000
                    ? "font-semibold text-error"
                    : "text-faint"
                }`}
                id="message-count"
              >
                {message.length.toLocaleString()} / 4,000
              </p>
            </div>

            <fieldset className="mt-5">
              <legend className="mb-3 text-sm font-bold">Reply tone</legend>
              <div className="grid grid-cols-3 gap-2 rounded-xl bg-canvas p-1.5">
                {(["friendly", "professional", "brief"] as Tone[]).map(
                  (option) => (
                    <label className="relative cursor-pointer" key={option}>
                      <input
                        checked={tone === option}
                        className="peer sr-only"
                        name="tone"
                        onChange={() => setTone(option)}
                        type="radio"
                        value={option}
                      />
                      <span className="flex min-h-10 items-center justify-center rounded-lg px-2 text-xs font-semibold capitalize text-muted transition peer-checked:bg-white peer-checked:text-ink peer-checked:shadow-soft peer-focus-visible:outline-2 peer-focus-visible:outline-forest sm:text-sm">
                        {option}
                      </span>
                    </label>
                  ),
                )}
              </div>
            </fieldset>

            <Button
              className="mt-6 w-full py-3"
              disabled={status === "loading"}
              onClick={submit}
              type="button"
            >
              {status === "loading" ? (
                <>
                  <span className="size-4 animate-spin rounded-full border-2 border-cream/40 border-t-cream" />
                  Lightening the load…
                </>
              ) : !user ? (
                <>
                  <Icon name="lock" className="size-4" />
                  Sign in to make this effortless
                  <Icon name="arrow" className="ml-1 size-4" />
                </>
              ) : (
                <>
                  <Icon name="bolt" className="size-4" />
                  Make this effortless
                  <Icon name="arrow" className="ml-1 size-4" />
                </>
              )}
            </Button>
            <button
              className="mx-auto mt-3 flex min-h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold text-muted transition hover:bg-canvas hover:text-ink focus-visible:outline-2 focus-visible:outline-forest"
              onClick={reset}
              type="button"
            >
              <Icon name="refresh" className="size-3.5" />
              Reset
            </button>

            <div className="mt-5 flex items-start gap-2.5 rounded-xl bg-sage-pale/70 p-3.5 text-xs leading-5 text-forest">
              <Icon name="lock" className="mt-0.5 size-4 shrink-0" />
              <p>
                <strong>Private by design.</strong> Your message is only sent
                when you click the button and isn’t stored by this interface.
              </p>
            </div>
          </div>

          <div className="bg-canvas/75 p-5 sm:p-8" aria-live="polite">
            <div className="mb-5 flex min-h-10 items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-xs font-bold uppercase tracking-[0.15em] text-forest">
                    The useful bits
                  </p>
                  {isExample && (
                    <span className="rounded-full border border-sage bg-sage-pale px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-wider text-forest">
                      Example output
                    </span>
                  )}
                </div>
                <h3 className="mt-1.5 text-xl font-bold tracking-[-0.03em]">
                  Clarity, ready to go.
                </h3>
              </div>
              {status === "success" && (
                <span className="hidden items-center gap-1.5 text-xs font-semibold text-forest sm:flex">
                  <span className="grid size-5 place-items-center rounded-full bg-sage-pale">
                    <Icon name="check" className="size-3" />
                  </span>
                  Ready
                </span>
              )}
            </div>

            {status === "error" ? (
              <div
                className="mb-4 rounded-2xl border border-error/20 bg-error-pale p-5 outline-none"
                ref={errorRef}
                role="alert"
                tabIndex={-1}
              >
                <div className="flex items-start gap-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-white text-error">
                    <Icon name="bolt" className="size-4" />
                  </span>
                  <div>
                    <p className="font-bold text-error">
                      LazyReply couldn’t run yet
                    </p>
                    <p className="mt-1 text-sm leading-6 text-body">{error}</p>
                    <button
                      className="mt-3 text-sm font-bold text-error underline decoration-error/30 underline-offset-4 hover:decoration-error"
                      onClick={loadExample}
                      type="button"
                    >
                      View a clearly labeled example instead
                    </button>
                  </div>
                </div>
              </div>
            ) : status === "idle" ? (
              <div className="mb-4 flex min-h-24 items-center gap-3 rounded-2xl border border-dashed border-line bg-white/50 px-5 py-4">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-sage-pale text-forest">
                  <Icon name="spark" className="size-5" />
                </span>
                <div>
                  <p className="text-sm font-bold">
                    Your calmer inbox starts here
                  </p>
                  <p className="mt-1 text-xs leading-5 text-muted">
                    Paste a message or try the example to preview the format.
                  </p>
                </div>
              </div>
            ) : null}

            <div className="grid gap-3">
              {resultSections.map((section) => (
                <ResultSection
                  key={section.key}
                  title={section.title}
                  icon={section.icon}
                  content={result?.[section.key]}
                  loading={status === "loading"}
                  copied={copied === section.key}
                  isEditable={section.key === "suggestedReply"}
                  onContentChange={
                    section.key === "suggestedReply"
                      ? handleReplyChange
                      : undefined
                  }
                  onRefine={
                    section.key === "suggestedReply" ? handleRefine : undefined
                  }
                  refineActionLoading={
                    section.key === "suggestedReply" ? refineLoading : null
                  }
                  onCopy={() =>
                    result?.[section.key] &&
                    copyContent(section.key, result[section.key])
                  }
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function AppDashboard({
  user,
  onLogout,
}: {
  user: User
  onLogout: () => void
}) {
  const userInitials = user.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : user.email.slice(0, 2).toUpperCase()

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <header className="sticky top-0 z-30 border-b border-line bg-white/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-8">
          <Logo />

          <div className="flex items-center gap-2.5 sm:gap-4">
            <div className="flex items-center gap-2.5 rounded-2xl border border-line bg-canvas/80 px-3 py-1.5 shadow-soft">
              <span className="grid size-8 place-items-center rounded-xl bg-sage-pale text-xs font-bold text-forest">
                {userInitials}
              </span>
              <div className="hidden text-left sm:block">
                <p className="text-xs font-bold leading-tight text-ink">
                  {user.name}
                </p>
                <p className="text-[0.68rem] leading-tight text-muted">
                  {user.email}
                </p>
              </div>
              <span className="size-2 rounded-full bg-forest" title="Connected" />
            </div>

            <button
              onClick={onLogout}
              className="inline-flex min-h-9 items-center rounded-xl border border-line bg-white px-3 text-xs font-semibold text-muted transition hover:border-error/40 hover:bg-error-pale hover:text-error"
              type="button"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-10">
        <div className="mb-6 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
              Hello, {user.name.split(" ")[0]}
            </h1>
            <p className="mt-0.5 text-xs text-muted">
              Paste your email or message below to extract key points and draft a
              ready-to-send reply.
            </p>
          </div>
          <div className="inline-flex items-center gap-1.5 self-start rounded-full border border-sage/60 bg-white/70 px-3 py-1 text-[0.68rem] font-bold text-forest shadow-soft">
            <Icon name="spark" className="size-3.5" />
            AI Model: Qwen 27B Active
          </div>
        </div>

        <Workspace user={user} onRequireAuth={() => {}} standalone />
      </main>
    </div>
  )
}

function LandingPage({ onOpenAuth }: { onOpenAuth: () => void }) {
  return (
    <div className="min-h-screen overflow-hidden bg-cream text-ink">
      <header className="absolute inset-x-0 top-0 z-20">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8">
          <Logo />
          <div className="hidden items-center gap-8 text-sm font-semibold text-muted md:flex">
            <a className="transition hover:text-ink" href="#benefits">
              Why LazyReply
            </a>
            <a className="transition hover:text-ink" href="#how-it-works">
              How it works
            </a>
            <a className="transition hover:text-ink" href="#privacy">
              Privacy
            </a>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={onOpenAuth}
              type="button"
              className="rounded-xl px-3 py-2 text-xs font-semibold text-muted transition hover:text-ink"
            >
              Sign in
            </button>
            <Button variant="secondary" onClick={onOpenAuth}>
              Try it now
              <Icon name="arrow" className="size-4" />
            </Button>
          </div>
        </nav>
      </header>

      <main>
        <section className="relative px-4 pb-24 pt-36 sm:px-6 sm:pb-32 sm:pt-44">
          <div className="pointer-events-none absolute left-[-8rem] top-32 size-80 rounded-full bg-sage/20 blur-3xl" />
          <div className="mx-auto max-w-4xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-sage bg-white/60 px-3.5 py-2 text-xs font-bold text-forest shadow-soft backdrop-blur">
              <span className="grid size-5 place-items-center rounded-full bg-sage-pale">
                <Icon name="spark" className="size-3" />
              </span>
              Less overthinking. More done.
            </div>
            <h1 className="font-display text-[clamp(3.4rem,8vw,7.4rem)] leading-[0.92] tracking-[-0.065em] text-balance">
              Your messages are doing{" "}
              <em className="relative font-normal text-forest">
                too much.
                <svg
                  aria-hidden="true"
                  className="absolute -bottom-2 left-0 w-full text-sage-dark/65"
                  fill="none"
                  viewBox="0 0 420 14"
                >
                  <path
                    d="M2 10C108 2 280 2 418 8"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                </svg>
              </em>
            </h1>
            <p className="mx-auto mt-8 max-w-2xl text-lg leading-8 text-muted sm:text-xl">
              Let AI do the heavy lifting. Turn long, messy messages into clear
              summaries, action items, and thoughtful replies—without the mental
              load.
            </p>
            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button
                className="w-full px-6 py-3 sm:w-auto"
                onClick={onOpenAuth}
              >
                Try LazyReply
                <Icon name="arrow" className="size-4" />
              </Button>
              <p className="flex items-center gap-2 px-3 text-xs font-semibold text-muted">
                <Icon name="check" className="size-4 text-forest" />
                Sign in with Google or Email in seconds.
              </p>
            </div>
          </div>
          <ProductPreview />
        </section>

        <section
          className="border-y border-line bg-white/45 px-4 py-20 sm:px-6 sm:py-28"
          id="benefits"
        >
          <div className="mx-auto max-w-7xl">
            <SectionTitle copy="LazyReply gives you the context you need, the next steps to take, and the words to move forward.">
              Spend less energy decoding.
              <br />
              More energy <em className="font-normal text-forest">doing.</em>
            </SectionTitle>
            <div className="grid gap-4 md:grid-cols-3">
              {[
                {
                  number: "01",
                  icon: "spark" as IconName,
                  title: "Understand faster",
                  copy: "Get the point of any long message in seconds—without rereading it three times.",
                },
                {
                  number: "02",
                  icon: "target" as IconName,
                  title: "Catch action items",
                  copy: "Deadlines, decisions, and asks are pulled forward so nothing important slips by.",
                },
                {
                  number: "03",
                  icon: "feather" as IconName,
                  title: "Reply with less effort",
                  copy: "Start with a thoughtful, tone-aware draft that sounds human and is easy to make yours.",
                },
              ].map((benefit) => (
                <article
                  className="group relative overflow-hidden rounded-3xl border border-line bg-cream p-7 transition duration-300 hover:-translate-y-1 hover:border-sage hover:shadow-soft sm:p-8"
                  key={benefit.title}
                >
                  <span className="absolute right-6 top-5 font-display text-5xl text-stone transition group-hover:text-sage-pale">
                    {benefit.number}
                  </span>
                  <span className="mb-10 grid size-11 place-items-center rounded-2xl bg-sage-pale text-forest">
                    <Icon name={benefit.icon} className="size-5" />
                  </span>
                  <h3 className="text-xl font-bold tracking-[-0.03em]">
                    {benefit.title}
                  </h3>
                  <p className="mt-3 text-sm leading-6 text-muted">
                    {benefit.copy}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 py-20 sm:px-6 sm:py-28" id="how-it-works">
          <div className="mx-auto max-w-6xl">
            <div className="grid items-start gap-14 lg:grid-cols-[0.8fr_1.2fr] lg:gap-24">
              <div className="lg:sticky lg:top-24">
                <p className="mb-4 text-xs font-bold uppercase tracking-[0.17em] text-forest">
                  How it works
                </p>
                <h2 className="font-display text-5xl leading-[1.03] tracking-[-0.05em] sm:text-6xl">
                  Three steps.
                  <br />
                  Zero fuss.
                </h2>
                <p className="mt-5 max-w-sm leading-7 text-muted">
                  A deliberately simple workflow for the messages that feel
                  anything but simple.
                </p>
              </div>
              <ol className="divide-y divide-line">
                {[
                  [
                    "Paste the message",
                    "Drop in an email, work message, or text that needs untangling.",
                  ],
                  [
                    "Choose your tone",
                    "Pick friendly, professional, or brief for a reply that fits the moment.",
                  ],
                  [
                    "Review and respond",
                    "Scan the key details, copy the reply, and get back to what matters.",
                  ],
                ].map(([title, copy], index) => (
                  <li
                    className="group flex gap-5 py-8 first:pt-0 sm:gap-8"
                    key={title}
                  >
                    <span className="font-display text-3xl text-sage-dark/70">
                      0{index + 1}
                    </span>
                    <div>
                      <h3 className="text-xl font-bold tracking-[-0.03em] transition group-hover:text-forest">
                        {title}
                      </h3>
                      <p className="mt-2 max-w-lg leading-7 text-muted">
                        {copy}
                      </p>
                    </div>
                    <Icon
                      name="arrow"
                      className="ml-auto mt-1 hidden size-5 text-sage-dark transition-transform group-hover:translate-x-1 sm:block"
                    />
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        <Workspace user={null} onRequireAuth={onOpenAuth} />

        <section
          className="bg-ink px-4 py-20 text-cream sm:px-6 sm:py-24"
          id="privacy"
        >
          <div className="mx-auto grid max-w-5xl items-center gap-10 md:grid-cols-[auto_1fr] md:gap-14">
            <div className="grid size-24 place-items-center rounded-[1.75rem] border border-cream/10 bg-cream/5 text-sage">
              <Icon name="lock" className="size-10" />
            </div>
            <div>
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.17em] text-sage">
                A private place to think
              </p>
              <h2 className="font-display text-4xl tracking-[-0.04em] sm:text-5xl">
                Your messages are yours.
              </h2>
              <p className="mt-5 max-w-2xl leading-7 text-cream/65">
                LazyReply is designed to process only what you choose to submit.
                This MVP has no accounts, no message history, and no database.
                When a backend is connected, data handling should remain
                transparent and minimal.
              </p>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-cream/10 bg-ink px-5 py-7 text-cream sm:px-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 text-xs text-cream/50 sm:flex-row">
          <Logo />
          <p>Built for fewer tabs in your brain.</p>
          <p>© {new Date().getFullYear()} LazyReply</p>
        </div>
      </footer>
    </div>
  )
}

function App() {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem("lazyreply_user")
      return saved ? JSON.parse(saved) : null
    } catch {
      return null
    }
  })
  const [currentView, setCurrentView] = useState<"landing" | "auth">("landing")

  const handleLogin = (newUser: User) => {
    setUser(newUser)
    try {
      localStorage.setItem("lazyreply_user", JSON.stringify(newUser))
    } catch {
      // ignore storage errors
    }
    setCurrentView("landing")
  }

  const handleLogout = () => {
    setUser(null)
    try {
      localStorage.removeItem("lazyreply_user")
    } catch {
      // ignore storage errors
    }
    setCurrentView("landing")
  }

  if (user) {
    return <AppDashboard user={user} onLogout={handleLogout} />
  }

  if (currentView === "auth") {
    return (
      <AuthPage
        onBack={() => setCurrentView("landing")}
        onLogin={handleLogin}
      />
    )
  }

  return <LandingPage onOpenAuth={() => setCurrentView("auth")} />
}

export default App
