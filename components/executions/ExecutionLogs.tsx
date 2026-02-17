'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Badge } from '@/components/ui/badge'
import { ChevronDown, ChevronRight, Pause, ArrowDownToLine } from 'lucide-react'

interface LogEntry {
  id: string
  executionId: string
  level: 'INFO' | 'WARNING' | 'ERROR' | 'DEBUG'
  message: string
  data: Record<string, unknown> | null
  createdAt: string
}

interface ExecutionLogsProps {
  executionId: string
  autoScroll?: boolean
}

const LEVEL_STYLES: Record<LogEntry['level'], { badge: string; text: string; dot: string }> = {
  INFO: {
    badge: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    text: 'text-blue-300',
    dot: 'bg-blue-400',
  },
  WARNING: {
    badge: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    text: 'text-yellow-300',
    dot: 'bg-yellow-400',
  },
  ERROR: {
    badge: 'bg-red-500/20 text-red-400 border-red-500/30',
    text: 'text-red-300',
    dot: 'bg-red-400',
  },
  DEBUG: {
    badge: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
    text: 'text-gray-400',
    dot: 'bg-gray-500',
  },
}

function formatTimestamp(dateStr: string): string {
  const date = new Date(dateStr)
  const h = date.getHours().toString().padStart(2, '0')
  const m = date.getMinutes().toString().padStart(2, '0')
  const s = date.getSeconds().toString().padStart(2, '0')
  const ms = date.getMilliseconds().toString().padStart(3, '0')
  return `${h}:${m}:${s}.${ms}`
}

function LogLine({ log }: { log: LogEntry }) {
  const [expanded, setExpanded] = useState(false)
  const style = LEVEL_STYLES[log.level]
  const hasData = log.data && Object.keys(log.data).length > 0

  return (
    <div className="group animate-in fade-in slide-in-from-bottom-1 duration-300">
      <div className="flex items-start gap-2 py-1 px-3 hover:bg-white/5 dark:hover:bg-white/5 rounded transition-colors">
        <span className="text-gray-500 font-mono text-xs shrink-0 pt-0.5 select-all">
          {formatTimestamp(log.createdAt)}
        </span>

        <span className={`mt-1 h-2 w-2 rounded-full shrink-0 ${style.dot}`} />

        <Badge
          variant="outline"
          className={`text-[10px] font-mono px-1.5 py-0 h-5 shrink-0 border ${style.badge}`}
        >
          {log.level}
        </Badge>

        <span className={`font-mono text-sm leading-relaxed break-all ${style.text}`}>
          {log.message}
        </span>

        {hasData && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="ml-auto shrink-0 text-gray-500 hover:text-gray-300 transition-colors p-0.5"
            aria-label={expanded ? 'Recolher dados' : 'Expandir dados'}
          >
            {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          </button>
        )}
      </div>

      {expanded && hasData && (
        <div className="ml-[6.5rem] mb-1 animate-in fade-in slide-in-from-top-1 duration-200">
          <pre className="text-xs font-mono text-gray-400 bg-black/40 rounded px-3 py-2 overflow-x-auto border border-gray-800">
            {JSON.stringify(log.data, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}

export function ExecutionLogs({ executionId, autoScroll = true }: ExecutionLogsProps) {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isScrollPaused, setIsScrollPaused] = useState(!autoScroll)
  const [executionStatus, setExecutionStatus] = useState<string | null>(null)

  const containerRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const isActive = executionStatus === 'RUNNING' || executionStatus === 'QUEUED'

  const scrollToBottom = useCallback(() => {
    if (!isScrollPaused && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [isScrollPaused])

  // Detect manual scroll to pause auto-scroll
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = el
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 40
      if (!isAtBottom && !isScrollPaused) {
        setIsScrollPaused(true)
      }
    }

    el.addEventListener('scroll', handleScroll)
    return () => el.removeEventListener('scroll', handleScroll)
  }, [isScrollPaused])

  // Fetch logs
  const fetchLogs = useCallback(async () => {
    try {
      const res = await fetch(`/api/executions/${executionId}/logs?limit=200`)
      if (!res.ok) throw new Error('Erro ao buscar logs')
      const data = await res.json()
      if (data.success) {
        setLogs(data.data.reverse())
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }, [executionId])

  // Fetch execution status
  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/executions/${executionId}`)
      if (!res.ok) return
      const data = await res.json()
      if (data.success) {
        setExecutionStatus(data.data.status)
      }
    } catch {
      // silent
    }
  }, [executionId])

  // Initial load
  useEffect(() => {
    fetchLogs()
    fetchStatus()
  }, [fetchLogs, fetchStatus])

  // Polling while active
  useEffect(() => {
    if (!isActive) {
      if (pollRef.current) clearInterval(pollRef.current)
      return
    }

    pollRef.current = setInterval(() => {
      fetchLogs()
      fetchStatus()
    }, 2000)

    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [isActive, fetchLogs, fetchStatus])

  // Auto-scroll on new logs
  useEffect(() => {
    scrollToBottom()
  }, [logs, scrollToBottom])

  if (loading) {
    return (
      <div className="bg-gray-950 rounded-lg border border-gray-800 p-6 flex items-center justify-center min-h-[300px]">
        <div className="flex items-center gap-3 text-gray-400">
          <div className="h-4 w-4 border-2 border-gray-600 border-t-blue-400 rounded-full animate-spin" />
          <span className="font-mono text-sm">Carregando logs...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-gray-950 rounded-lg border border-red-900/50 p-6 flex items-center justify-center min-h-[300px]">
        <span className="font-mono text-sm text-red-400">{error}</span>
      </div>
    )
  }

  return (
    <div className="bg-gray-950 rounded-lg border border-gray-800 overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-900 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-gray-400">
            {logs.length} log{logs.length !== 1 ? 's' : ''}
          </span>
          {isActive && (
            <span className="flex items-center gap-1.5 text-xs text-green-400">
              <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
              ao vivo
            </span>
          )}
        </div>

        <button
          onClick={() => {
            if (isScrollPaused) {
              setIsScrollPaused(false)
              bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
            } else {
              setIsScrollPaused(true)
            }
          }}
          className="flex items-center gap-1.5 text-xs font-mono text-gray-400 hover:text-gray-200 transition-colors px-2 py-1 rounded hover:bg-gray-800"
          title={isScrollPaused ? 'Ativar auto-scroll' : 'Pausar auto-scroll'}
        >
          {isScrollPaused ? (
            <>
              <ArrowDownToLine className="h-3.5 w-3.5" />
              Seguir
            </>
          ) : (
            <>
              <Pause className="h-3.5 w-3.5" />
              Pausar scroll
            </>
          )}
        </button>
      </div>

      {/* Logs container */}
      <div
        ref={containerRef}
        className="overflow-y-auto max-h-[500px] min-h-[200px] py-2 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent"
      >
        {logs.length === 0 ? (
          <div className="flex items-center justify-center h-[200px] text-gray-500 font-mono text-sm">
            Nenhum log registrado
          </div>
        ) : (
          logs.map((log) => <LogLine key={log.id} log={log} />)
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
