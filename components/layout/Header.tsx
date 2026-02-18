"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { GlobalSearch } from "@/components/search/GlobalSearch"
import {
  Search,
  X,
  Menu,
  LayoutDashboard,
  Columns3,
  BarChart3,
  Activity,
  FileText,
  Shield,
  Plus,
  Command,
  Settings,
  GitMerge,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { ThemeToggle } from "@/components/layout/ThemeToggle"
import { NotificationCenter } from "@/components/notifications/NotificationCenter"

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/kanban", label: "Kanban", icon: Columns3 },
  { href: "/orchestrations", label: "Orquestrações", icon: GitMerge },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/monitor", label: "Monitor", icon: Activity },
  { href: "/templates", label: "Templates", icon: FileText },
  { href: "/audit", label: "Auditoria", icon: Shield },
  { href: "/settings", label: "Config", icon: Settings },
]

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const ACTIVE_ORCH_STATUSES = new Set([
  "PLANNING", "CREATING_SUBTASKS", "ASSIGNING_AGENTS", "EXECUTING", "REVIEWING",
])

export function Header() {
  const pathname = usePathname()

  // Mobile menu
  const [mobileOpen, setMobileOpen] = useState(false)

  // Global search
  const [searchOpen, setSearchOpen] = useState(false)

  // Active orchestrations count (for badge)
  const [activeOrchCount, setActiveOrchCount] = useState(0)

  useEffect(() => {
    async function fetchOrchCount() {
      try {
        const res = await fetch("/api/orchestrate?limit=50", { cache: "no-store" })
        if (!res.ok) return
        const json = await res.json()
        if (!json.success) return
        const active = (json.data as { status: string }[]).filter(
          (o) => ACTIVE_ORCH_STATUSES.has(o.status)
        ).length
        setActiveOrchCount(active)
      } catch {
        // silent
      }
    }
    fetchOrchCount()
    const interval = setInterval(fetchOrchCount, 30_000)
    return () => clearInterval(interval)
  }, [])

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  // Cmd/Ctrl + K to open search
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        setSearchOpen((prev) => !prev)
      }
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [])

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/"
    return pathname.startsWith(href)
  }

  return (
    <>
      <header className="border-b bg-background/95 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-14">
            {/* ---- Logo ---- */}
            <Link href="/" className="flex items-center gap-2.5 shrink-0">
              <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary text-primary-foreground text-sm font-bold">
                TC
              </div>
              <span className="font-bold text-lg hidden sm:inline">Task Control Center</span>
            </Link>

            {/* ---- Desktop nav ---- */}
            <nav className="hidden md:flex items-center gap-1 ml-8">
              {NAV_ITEMS.map((item) => (
                <Link key={item.href} href={item.href}>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "gap-2 transition-colors",
                      isActive(item.href)
                        ? "bg-accent text-accent-foreground font-medium"
                        : "text-muted-foreground"
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                    {item.href === "/orchestrations" && activeOrchCount > 0 && (
                      <span className="ml-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-blue-500 px-1 text-[10px] font-bold text-white">
                        {activeOrchCount}
                      </span>
                    )}
                  </Button>
                </Link>
              ))}
            </nav>

            {/* ---- Right section ---- */}
            <div className="flex items-center gap-2">
              {/* Search trigger (desktop) */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSearchOpen(true)}
                className="hidden sm:flex items-center gap-2 text-muted-foreground h-9 w-56 justify-start"
              >
                <Search className="h-4 w-4 shrink-0" />
                <span className="text-sm flex-1 text-left">Buscar...</span>
                <kbd className="pointer-events-none inline-flex items-center gap-0.5 rounded border bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
                  <Command className="h-3 w-3" />K
                </kbd>
              </Button>

              {/* Search trigger (mobile) */}
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setSearchOpen(true)}
                className="sm:hidden text-muted-foreground"
              >
                <Search className="h-4 w-4" />
              </Button>

              {/* Theme Toggle */}
              <ThemeToggle />

              {/* Notifications */}
              <NotificationCenter />

              <Separator orientation="vertical" className="h-6 hidden md:block" />

              {/* New task */}
              <Link href="/create" className="hidden md:block">
                <Button size="sm" className="gap-1.5">
                  <Plus className="h-4 w-4" />
                  Nova Tarefa
                </Button>
              </Link>

              {/* Mobile menu toggle */}
              <Button
                variant="ghost"
                size="icon-sm"
                className="md:hidden"
                onClick={() => setMobileOpen((o) => !o)}
              >
                {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
            </div>
          </div>
        </div>

        {/* ---- Mobile menu ---- */}
        {mobileOpen && (
          <div className="md:hidden border-t bg-background animate-in slide-in-from-top-2 duration-200">
            <nav className="container mx-auto px-4 py-3 space-y-1">
              {NAV_ITEMS.map((item) => (
                <Link key={item.href} href={item.href} className="block">
                  <Button
                    variant="ghost"
                    className={cn(
                      "w-full justify-start gap-3",
                      isActive(item.href)
                        ? "bg-accent text-accent-foreground font-medium"
                        : "text-muted-foreground"
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                    {item.href === "/orchestrations" && activeOrchCount > 0 && (
                      <span className="ml-auto flex h-4 min-w-4 items-center justify-center rounded-full bg-blue-500 px-1 text-[10px] font-bold text-white">
                        {activeOrchCount}
                      </span>
                    )}
                  </Button>
                </Link>
              ))}
              <Separator className="my-2" />
              <Link href="/create" className="block">
                <Button className="w-full gap-2">
                  <Plus className="h-4 w-4" />
                  Nova Tarefa
                </Button>
              </Link>
            </nav>
          </div>
        )}
      </header>

      {/* Global Search Modal */}
      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
    </>
  )
}
