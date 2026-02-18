"use client"

// React Flow CSS — must be first import
import "reactflow/dist/style.css"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import ReactFlow, {
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  MarkerType,
  MiniMap,
  NodeToolbar,
  Panel,
  Position,
  useEdgesState,
  useNodesState,
  type Edge,
  type Node,
  type NodeProps,
} from "reactflow"
import { cn } from "@/lib/utils"
import {
  AlertTriangle, CheckCircle2, Circle, Clock,
  Loader2, RefreshCw, ZoomIn, GitMerge,
} from "lucide-react"
import { ROLE_COLORS } from "@/lib/colors"
import type { AgentRole } from "@/lib/colors"

// ============================================================================
// TYPES
// ============================================================================

export type TaskStatus = "TODO" | "IN_PROGRESS" | "REVIEW" | "DONE" | "BLOCKED"

export interface Subtask {
  id: string
  title: string
  description?: string | null
  status: TaskStatus
  priority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT"
  agentName?: string | null
  estimatedHours?: number | null
  dependsOn: { id: string; title: string; status: string }[]
  dependents?: { id: string; title: string; status: string }[]
  executions?: { status: string; progress: number; startedAt?: string }[]
  isBlocked?: boolean
  isReady?: boolean
}

export interface DependencyGraphProps {
  subtasks: Subtask[]
  onNodeClick: (taskId: string) => void
}

interface NodeData {
  task: Subtask
  onNodeClick: (id: string) => void
}

// ============================================================================
// CONSTANTS & HELPERS
// ============================================================================

const NODE_W = 210
const NODE_H = 96
const H_GAP  = 80   // horizontal gap between levels
const V_GAP  = 20   // vertical gap between nodes in same level

const AGENT_ICONS: Record<string, string> = {
  MAESTRO: "🎯", SENTINEL: "🛡️", ARCHITECTON: "🏗️", PIXEL: "🎨",
}

const STATUS_CONFIG: Record<TaskStatus, {
  border: string; bg: string; text: string; dot: string; label: string
}> = {
  TODO:        { border: "#94a3b8", bg: "#f8fafc", text: "#475569", dot: "#94a3b8", label: "A fazer"     },
  IN_PROGRESS: { border: "#3b82f6", bg: "#eff6ff", text: "#1d4ed8", dot: "#3b82f6", label: "Executando"  },
  REVIEW:      { border: "#f59e0b", bg: "#fffbeb", text: "#92400e", dot: "#f59e0b", label: "Revisão"     },
  DONE:        { border: "#22c55e", bg: "#f0fdf4", text: "#166534", dot: "#22c55e", label: "Concluído"   },
  BLOCKED:     { border: "#ef4444", bg: "#fef2f2", text: "#991b1b", dot: "#ef4444", label: "Bloqueado"   },
}

const PRIORITY_DOT: Record<string, string> = {
  LOW: "#94a3b8", MEDIUM: "#60a5fa", HIGH: "#f97316", URGENT: "#ef4444",
}

function inferRole(name?: string | null): AgentRole | null {
  if (!name) return null
  const u = name.toUpperCase()
  if (u.includes("MAESTRO"))     return "MAESTRO"
  if (u.includes("SENTINEL"))    return "SENTINEL"
  if (u.includes("ARCHITECTON")) return "ARCHITECTON"
  if (u.includes("PIXEL"))       return "PIXEL"
  return null
}

function computeLevels(subtasks: Subtask[]): Map<string, number> {
  const levels = new Map<string, number>()
  const depMap = new Map(subtasks.map(t => [t.id, t.dependsOn.map(d => d.id)]))
  let changed = true
  while (changed) {
    changed = false
    for (const task of subtasks) {
      const deps  = depMap.get(task.id) ?? []
      const level = deps.reduce((max, depId) => Math.max(max, (levels.get(depId) ?? 0) + 1), 0)
      if (levels.get(task.id) !== level) {
        levels.set(task.id, level)
        changed = true
      }
    }
  }
  return levels
}

// ============================================================================
// CUSTOM NODE
// ============================================================================

function SubtaskNode({ data, selected }: NodeProps<NodeData>) {
  const { task, onNodeClick } = data
  const [hovered, setHovered] = useState(false)

  const cfg     = STATUS_CONFIG[task.status]
  const role    = inferRole(task.agentName)
  const icon    = role ? (AGENT_ICONS[role] ?? "🤖") : "🤖"
  const exec    = task.executions?.[0]
  const running = task.status === "IN_PROGRESS"
  const done    = task.status === "DONE"

  // Keep tooltip inside viewport
  const nodeRef = useRef<HTMLDivElement>(null)

  const pulseStyle = running
    ? { animation: "depgraph-pulse 1.8s ease-in-out infinite" }
    : {}

  return (
    <>
      {/* Handles — hidden, used by React Flow for edge routing */}
      <Handle
        type="target"
        position={Position.Left}
        style={{ opacity: 0, width: 8, height: 8, background: cfg.border }}
      />

      {/* Node card */}
      <div
        ref={nodeRef}
        onClick={() => onNodeClick(task.id)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          width: NODE_W,
          minHeight: NODE_H,
          borderColor: cfg.border,
          backgroundColor: cfg.bg,
          ...pulseStyle,
        }}
        className={cn(
          "relative rounded-xl border-2 shadow-sm cursor-pointer select-none",
          "transition-shadow duration-200",
          selected && "ring-2 ring-offset-1 ring-blue-400",
          running && "shadow-blue-200",
          done    && "opacity-80",
        )}
      >
        {/* Status stripe at top */}
        <div
          className="h-1.5 rounded-t-xl"
          style={{ background: cfg.border }}
        />

        {/* Card body */}
        <div className="px-3 pt-2 pb-2.5 space-y-2">
          {/* Icon + title row */}
          <div className="flex items-start gap-2">
            <span className="text-base leading-none mt-0.5 shrink-0">{icon}</span>
            <div className="min-w-0 flex-1">
              <p
                className="text-[11px] font-semibold leading-tight line-clamp-2"
                style={{ color: cfg.text }}
              >
                {task.title}
              </p>
              {task.agentName && (
                <p className="text-[10px] mt-0.5 truncate" style={{ color: cfg.border }}>
                  {task.agentName}
                </p>
              )}
            </div>
            {/* Status icon */}
            <div className="shrink-0 mt-0.5">
              {done    && <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />}
              {running && <Loader2 className="h-3.5 w-3.5 text-blue-500 animate-spin" />}
              {task.status === "BLOCKED" && <AlertTriangle className="h-3.5 w-3.5 text-red-400" />}
              {task.status === "REVIEW"  && <RefreshCw className="h-3.5 w-3.5 text-amber-500" />}
              {task.status === "TODO"    && <Circle className="h-3.5 w-3.5 text-slate-400" />}
            </div>
          </div>

          {/* Progress bar for running */}
          {running && exec !== undefined && (
            <div className="space-y-0.5">
              <div className="h-1.5 rounded-full bg-blue-100 overflow-hidden">
                <div
                  className="h-full rounded-full bg-blue-500 transition-all duration-500"
                  style={{ width: `${Math.min(100, exec.progress)}%` }}
                />
              </div>
              <p className="text-[9px] text-blue-600 font-medium">{exec.progress}% concluído</p>
            </div>
          )}

          {/* Footer: status badge + estimated hours */}
          <div className="flex items-center justify-between gap-1">
            <span
              className="text-[9px] font-medium px-1.5 py-0.5 rounded-full"
              style={{ background: cfg.border + "22", color: cfg.text }}
            >
              {cfg.label}
            </span>
            <div className="flex items-center gap-1.5">
              {task.priority && (
                <span
                  className="h-1.5 w-1.5 rounded-full shrink-0"
                  style={{ background: PRIORITY_DOT[task.priority] ?? "#94a3b8" }}
                  title={task.priority}
                />
              )}
              {task.estimatedHours && (
                <span className="text-[9px] text-slate-400 flex items-center gap-0.5">
                  <Clock className="h-2.5 w-2.5" />{task.estimatedHours}h
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tooltip via NodeToolbar */}
      <NodeToolbar
        isVisible={hovered}
        position={Position.Right}
        offset={8}
        style={{ zIndex: 9999 }}
      >
        <div className="w-52 rounded-lg border bg-white dark:bg-zinc-900 shadow-xl p-3 text-xs space-y-2 pointer-events-none">
          {/* Header */}
          <div className="flex items-start gap-2">
            <span className="text-base shrink-0">{icon}</span>
            <div>
              <p className="font-semibold text-foreground leading-tight">{task.title}</p>
              {task.agentName && (
                <p className="text-muted-foreground mt-0.5">{task.agentName}</p>
              )}
            </div>
          </div>

          {/* Description */}
          {task.description && (
            <p className="text-muted-foreground leading-relaxed line-clamp-3 border-t pt-2">
              {task.description}
            </p>
          )}

          {/* Meta grid */}
          <div className="grid grid-cols-2 gap-x-3 gap-y-1 border-t pt-2">
            <span className="text-muted-foreground">Status</span>
            <span
              className="font-medium"
              style={{ color: cfg.text }}
            >{cfg.label}</span>

            {task.priority && (
              <>
                <span className="text-muted-foreground">Prioridade</span>
                <span className="font-medium">{task.priority}</span>
              </>
            )}

            {task.estimatedHours && (
              <>
                <span className="text-muted-foreground">Estimativa</span>
                <span className="font-medium">{task.estimatedHours}h</span>
              </>
            )}

            {exec && (
              <>
                <span className="text-muted-foreground">Progresso</span>
                <span className="font-medium">{exec.progress}%</span>
              </>
            )}
          </div>

          {/* Dependencies */}
          {task.dependsOn.length > 0 && (
            <div className="border-t pt-2 space-y-1">
              <p className="text-muted-foreground font-medium">Depende de:</p>
              {task.dependsOn.map(dep => (
                <div key={dep.id} className="flex items-center gap-1.5">
                  <span
                    className="h-1.5 w-1.5 rounded-full shrink-0"
                    style={{ background: STATUS_CONFIG[dep.status as TaskStatus]?.dot ?? "#94a3b8" }}
                  />
                  <span className="truncate text-foreground">{dep.title}</span>
                </div>
              ))}
            </div>
          )}

          <p className="text-[10px] text-muted-foreground border-t pt-1.5 text-center">
            Clique para abrir detalhes
          </p>
        </div>
      </NodeToolbar>

      <Handle
        type="source"
        position={Position.Right}
        style={{ opacity: 0, width: 8, height: 8, background: cfg.border }}
      />
    </>
  )
}

// Defined at module level to avoid re-creating on every render
const nodeTypes = { subtask: SubtaskNode }

// ============================================================================
// GRAPH BUILDER
// ============================================================================

function buildGraph(
  subtasks: Subtask[],
  onNodeClick: (id: string) => void
): { nodes: Node<NodeData>[]; edges: Edge[] } {
  if (subtasks.length === 0) return { nodes: [], edges: [] }

  const levels  = computeLevels(subtasks)
  const byLevel = new Map<number, Subtask[]>()

  for (const task of subtasks) {
    const lvl = levels.get(task.id) ?? 0
    if (!byLevel.has(lvl)) byLevel.set(lvl, [])
    byLevel.get(lvl)!.push(task)
  }

  const maxPerLevel = Math.max(...[...byLevel.values()].map(v => v.length))

  // Build nodes
  const nodes: Node<NodeData>[] = []
  for (const [lvl, tasks] of byLevel) {
    const colTotalH = tasks.length * NODE_H + (tasks.length - 1) * V_GAP
    const maxColH   = maxPerLevel * NODE_H + (maxPerLevel - 1) * V_GAP
    const startY    = (maxColH - colTotalH) / 2

    tasks.forEach((task, i) => {
      nodes.push({
        id:       task.id,
        type:     "subtask",
        position: {
          x: lvl * (NODE_W + H_GAP),
          y: startY + i * (NODE_H + V_GAP),
        },
        data:     { task, onNodeClick },
        // Disable drag & selection flicker
        draggable:   false,
        selectable:  true,
      })
    })
  }

  // Build edges
  const edges: Edge[] = []
  const taskMap = new Map(subtasks.map(t => [t.id, t]))

  for (const task of subtasks) {
    for (const dep of task.dependsOn) {
      const sourceTask = taskMap.get(dep.id)
      const isDone    = sourceTask?.status === "DONE"
      const isRunning = sourceTask?.status === "IN_PROGRESS"
      const isBlocked = task.isBlocked

      edges.push({
        id:     `${dep.id}->${task.id}`,
        source: dep.id,
        target: task.id,
        type:   "smoothstep",
        animated: isRunning,
        markerEnd: {
          type:  MarkerType.ArrowClosed,
          width: 14,
          height: 14,
          color: isDone    ? "#22c55e"
               : isRunning ? "#3b82f6"
               : isBlocked ? "#ef4444"
               : "#94a3b8",
        },
        style: {
          strokeWidth:      isDone ? 2 : 1.5,
          stroke:           isDone    ? "#22c55e"
                          : isRunning ? "#3b82f6"
                          : isBlocked ? "#ef4444cc"
                          : "#94a3b8",
          strokeDasharray:  isBlocked && !isDone && !isRunning ? "5 3" : undefined,
        },
      })
    }
  }

  return { nodes, edges }
}

// ============================================================================
// LEGEND
// ============================================================================

function GraphLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-slate-500 dark:text-slate-400">
      {(Object.entries(STATUS_CONFIG) as [TaskStatus, typeof STATUS_CONFIG[TaskStatus]][]).map(([status, cfg]) => (
        <span key={status} className="flex items-center gap-1">
          <span
            className="inline-block h-2.5 w-2.5 rounded-sm border"
            style={{ background: cfg.bg, borderColor: cfg.border }}
          />
          {cfg.label}
        </span>
      ))}
      <span className="flex items-center gap-1 ml-2">
        <span className="inline-block h-px w-5 bg-slate-400 dark:bg-slate-500" style={{ borderTop: "2px dashed" }} />
        Bloqueado
      </span>
      <span className="flex items-center gap-1">
        <span className="inline-block h-px w-5 bg-green-500" style={{ borderTop: "2px solid" }} />
        Concluído
      </span>
    </div>
  )
}

// ============================================================================
// EMPTY STATE
// ============================================================================

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 h-full text-muted-foreground">
      <GitMerge className="h-10 w-10 opacity-20" />
      <div className="text-center">
        <p className="text-sm font-medium">Nenhuma subtarefa</p>
        <p className="text-xs mt-0.5 opacity-70">As subtarefas aparecerão aqui após o planejamento</p>
      </div>
    </div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function DependencyGraph({ subtasks, onNodeClick }: DependencyGraphProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [fitKey, setFitKey] = useState(0) // bump to force fitView

  // Stable callback to avoid rebuilding graph on every render
  const stableOnNodeClick = useCallback(onNodeClick, [onNodeClick]) // eslint-disable-line

  // Rebuild graph when subtasks change
  useEffect(() => {
    const { nodes: n, edges: e } = buildGraph(subtasks, stableOnNodeClick)
    setNodes(n)
    setEdges(e)
  }, [subtasks, stableOnNodeClick, setNodes, setEdges])

  // MiniMap node color helper
  const miniMapNodeColor = useCallback((node: Node<NodeData>) => {
    return STATUS_CONFIG[node.data.task.status]?.border ?? "#94a3b8"
  }, [])

  if (subtasks.length === 0) {
    return (
      <div className="h-80 rounded-xl border bg-muted/20 flex items-center justify-center">
        <EmptyState />
      </div>
    )
  }

  return (
    <div className="relative rounded-xl border overflow-hidden bg-slate-50 dark:bg-zinc-950">
      {/* Pulse keyframe injected inline — minimal, scoped */}
      <style>{`
        @keyframes depgraph-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(59,130,246,0.35); }
          50%       { box-shadow: 0 0 0 8px rgba(59,130,246,0); }
        }
      `}</style>

      {/* React Flow canvas */}
      <div style={{ height: 480 }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          onNodeClick={(_, node) => onNodeClick(node.id)}
          fitView
          fitViewOptions={{ padding: 0.25, maxZoom: 1.2 }}
          minZoom={0.2}
          maxZoom={2.5}
          nodesDraggable={false}
          nodesConnectable={false}
          deleteKeyCode={null}
          selectionKeyCode={null}
          panOnDrag={true}
          zoomOnScroll={true}
          zoomOnPinch={true}
          zoomOnDoubleClick={true}
          attributionPosition="bottom-right"
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={20}
            size={1}
            color="#cbd5e1"
            className="dark:[&>svg]:opacity-30"
          />

          <Controls
            showInteractive={false}
            className="[&>button]:border [&>button]:rounded-lg [&>button]:bg-white dark:[&>button]:bg-zinc-800 [&>button]:text-slate-600 dark:[&>button]:text-slate-300 [&>button]:shadow-sm"
          />

          <MiniMap
            nodeColor={miniMapNodeColor}
            maskColor="rgba(248,250,252,0.85)"
            className="rounded-lg border shadow-sm dark:bg-zinc-900 dark:[&_path]:fill-zinc-700"
            style={{ height: 80 }}
          />

          {/* Legend panel */}
          <Panel position="bottom-left" className="m-2">
            <div className="rounded-lg border bg-white/90 dark:bg-zinc-900/90 backdrop-blur px-3 py-2 shadow-sm">
              <GraphLegend />
            </div>
          </Panel>
        </ReactFlow>
      </div>
    </div>
  )
}
