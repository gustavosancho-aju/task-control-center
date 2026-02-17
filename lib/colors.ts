// ============================================================================
// Centralized color mappings for dark mode support
// All semantic colors (status, priority, agent roles, etc.) are defined here
// with proper light/dark variants using Tailwind's dark: prefix.
// ============================================================================

// ---------------------------------------------------------------------------
// Task Status Colors
// ---------------------------------------------------------------------------

export const STATUS_COLORS = {
  TODO: {
    badge: "bg-slate-500 dark:bg-slate-600",
    dot: "bg-muted-foreground",
    ring: "ring-slate-200 dark:ring-slate-700",
    soft: "bg-muted text-muted-foreground",
    indicator: "bg-slate-500",
  },
  IN_PROGRESS: {
    badge: "bg-blue-500 dark:bg-blue-600",
    dot: "bg-blue-500 dark:bg-blue-400",
    ring: "ring-blue-200 dark:ring-blue-800",
    soft: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
    indicator: "bg-blue-500",
  },
  REVIEW: {
    badge: "bg-yellow-500 dark:bg-yellow-600",
    dot: "bg-yellow-500 dark:bg-yellow-400",
    ring: "ring-yellow-200 dark:ring-yellow-800",
    soft: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300",
    indicator: "bg-yellow-500",
  },
  DONE: {
    badge: "bg-green-500 dark:bg-green-600",
    dot: "bg-green-500 dark:bg-green-400",
    ring: "ring-green-200 dark:ring-green-800",
    soft: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
    indicator: "bg-green-500",
  },
  BLOCKED: {
    badge: "bg-red-500 dark:bg-red-600",
    dot: "bg-red-500 dark:bg-red-400",
    ring: "ring-red-200 dark:ring-red-800",
    soft: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
    indicator: "bg-red-500",
  },
} as const

export type TaskStatus = keyof typeof STATUS_COLORS

// ---------------------------------------------------------------------------
// Task Priority Colors
// ---------------------------------------------------------------------------

export const PRIORITY_COLORS = {
  LOW: {
    badge: "bg-slate-400 dark:bg-slate-500 text-white",
    border: "border-l-slate-300 dark:border-l-slate-600",
    soft: "bg-slate-500/10 text-slate-600 border-slate-500/20 dark:text-slate-400",
    indicator: "bg-slate-400 dark:bg-slate-500",
    labeled: "bg-muted text-foreground border-border",
  },
  MEDIUM: {
    badge: "bg-blue-400 dark:bg-blue-500 text-white",
    border: "border-l-blue-400 dark:border-l-blue-500",
    soft: "bg-blue-500/10 text-blue-600 border-blue-500/20 dark:text-blue-400",
    indicator: "bg-blue-400 dark:bg-blue-500",
    labeled: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-800",
  },
  HIGH: {
    badge: "bg-orange-500 dark:bg-orange-600 text-white",
    border: "border-l-orange-500 dark:border-l-orange-600",
    soft: "bg-orange-500/10 text-orange-600 border-orange-500/20 dark:text-orange-400",
    indicator: "bg-orange-500 dark:bg-orange-600",
    labeled: "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/40 dark:text-orange-300 dark:border-orange-800",
  },
  URGENT: {
    badge: "bg-red-600 dark:bg-red-500 text-white",
    border: "border-l-red-500 dark:border-l-red-600",
    soft: "bg-red-500/10 text-red-600 border-red-500/20 dark:text-red-400",
    indicator: "bg-red-600 dark:bg-red-500",
    labeled: "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/40 dark:text-red-300 dark:border-red-800",
  },
} as const

export type TaskPriority = keyof typeof PRIORITY_COLORS

// ---------------------------------------------------------------------------
// Agent Role Colors
// ---------------------------------------------------------------------------

export const ROLE_COLORS = {
  MAESTRO: {
    badge: "bg-purple-500 dark:bg-purple-600 text-white",
    soft: "text-amber-600 bg-amber-50 border-amber-200 dark:text-amber-400 dark:bg-amber-900/30 dark:border-amber-800",
    monitor: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  },
  SENTINEL: {
    badge: "bg-green-600 dark:bg-green-700 text-white",
    soft: "text-green-600 bg-green-50 border-green-200 dark:text-green-400 dark:bg-green-900/30 dark:border-green-800",
    monitor: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  },
  ARCHITECTON: {
    badge: "bg-blue-600 dark:bg-blue-700 text-white",
    soft: "text-blue-600 bg-blue-50 border-blue-200 dark:text-blue-400 dark:bg-blue-900/30 dark:border-blue-800",
    monitor: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  },
  PIXEL: {
    badge: "bg-pink-500 dark:bg-pink-600 text-white",
    soft: "text-purple-600 bg-purple-50 border-purple-200 dark:text-purple-400 dark:bg-purple-900/30 dark:border-purple-800",
    monitor: "bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300",
  },
} as const

export type AgentRole = keyof typeof ROLE_COLORS

// ---------------------------------------------------------------------------
// Execution Status Colors
// ---------------------------------------------------------------------------

export const EXECUTION_COLORS = {
  QUEUED: {
    badge: "bg-muted text-muted-foreground",
    icon: "text-muted-foreground",
  },
  RUNNING: {
    badge: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
    icon: "text-blue-500 dark:text-blue-400",
    progress: {
      track: "bg-blue-100 dark:bg-blue-900/30",
      bar: "bg-blue-500 dark:bg-blue-400",
      pulse: "bg-blue-300/50 dark:bg-blue-500/30",
    },
    label: "text-blue-600 bg-blue-50 border-blue-200 dark:text-blue-400 dark:bg-blue-900/30 dark:border-blue-800",
  },
  PAUSED: {
    badge: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300",
    icon: "text-yellow-500 dark:text-yellow-400",
    label: "text-yellow-600 bg-yellow-50 border-yellow-200 dark:text-yellow-400 dark:bg-yellow-900/30 dark:border-yellow-800",
  },
  COMPLETED: {
    badge: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
    icon: "text-green-600 dark:text-green-400",
    result: "bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800",
  },
  FAILED: {
    badge: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
    icon: "text-red-600 dark:text-red-400",
    error: "bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800",
    errorText: "text-red-700 dark:text-red-300",
  },
  CANCELLED: {
    badge: "bg-muted text-muted-foreground",
    icon: "text-muted-foreground",
  },
} as const

// ---------------------------------------------------------------------------
// Complexity Colors (AI Analysis)
// ---------------------------------------------------------------------------

export const COMPLEXITY_COLORS = {
  LOW: "bg-green-500/10 text-green-600 border-green-500/20 dark:text-green-400",
  MEDIUM: "bg-blue-500/10 text-blue-600 border-blue-500/20 dark:text-blue-400",
  HIGH: "bg-orange-500/10 text-orange-600 border-orange-500/20 dark:text-orange-400",
  VERY_HIGH: "bg-red-500/10 text-red-600 border-red-500/20 dark:text-red-400",
} as const

// ---------------------------------------------------------------------------
// Semantic Colors
// ---------------------------------------------------------------------------

export const SEMANTIC_COLORS = {
  success: "text-green-600 dark:text-green-400",
  error: "text-red-600 dark:text-red-400",
  warning: "text-orange-600 dark:text-orange-400",
  info: "text-blue-600 dark:text-blue-400",
  ai: "text-purple-600 dark:text-purple-400",
  aiAccent: "border-purple-500/20 dark:border-purple-500/30",
  aiBg: "from-purple-500/5 dark:from-purple-500/10",
  aiBadge: "bg-purple-500/10 text-purple-600 border-purple-500/20 dark:text-purple-400",
  destructiveButton: "text-red-600 border-red-200 hover:bg-red-50 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-900/30",
  destructiveHover: "text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/30",
  notification: "bg-red-500 text-white",
  amber: "text-amber-500 dark:text-amber-400",
  star: "fill-amber-400 text-amber-400",
  errorBg: "bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800",
  errorText: "text-red-700 dark:text-red-300",
  executeHover: "hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-900/30 dark:hover:text-blue-400",
  focusRing: "focus:ring-primary focus:border-transparent",
} as const

// ---------------------------------------------------------------------------
// Metric Card Colors
// ---------------------------------------------------------------------------

export const METRIC_COLORS: Record<string, string> = {
  blue: "bg-blue-50 border-blue-100 dark:bg-blue-900/20 dark:border-blue-800",
  green: "bg-green-50 border-green-100 dark:bg-green-900/20 dark:border-green-800",
  purple: "bg-purple-50 border-purple-100 dark:bg-purple-900/20 dark:border-purple-800",
  orange: "bg-orange-50 border-orange-100 dark:bg-orange-900/20 dark:border-orange-800",
}

// ---------------------------------------------------------------------------
// Selected badge (for improvement tags, etc.)
// ---------------------------------------------------------------------------

export const SELECTED_BADGE = "bg-primary hover:bg-primary/90 dark:bg-primary dark:hover:bg-primary/90"
