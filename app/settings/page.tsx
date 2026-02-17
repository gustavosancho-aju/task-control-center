"use client"

import { useState, useEffect, useCallback } from "react"
import { useTheme } from "@/components/providers/ThemeProvider"
import { Header } from "@/components/layout/Header"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { SettingsSection } from "@/components/settings/SettingsSection"
import { ToggleSetting } from "@/components/settings/ToggleSetting"
import { SelectSetting } from "@/components/settings/SelectSetting"
import { SliderSetting } from "@/components/settings/SliderSetting"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { toast } from "sonner"
import {
  Palette,
  Bell,
  Bot,
  Settings2,
  Database,
  Sun,
  Moon,
  Monitor,
  Download,
  Upload,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Loader2,
} from "lucide-react"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Settings {
  theme: string
  language: string
  defaultView: string
  accentColor: string
  density: string
  dashboardLayout: string
  notifications: {
    creation: boolean
    completion: boolean
    error: boolean
    assignment: boolean
    statusChange: boolean
    comment: boolean
    sounds: boolean
    email: boolean
  }
  system: {
    autoProcessorInterval: number
    maxRetries: number
    executionTimeout: number
    retentionDays: number
  }
}

interface Agent {
  id: string
  name: string
  role: string
  isActive: boolean
  skills: string[]
  tasksCompleted: number
  successRate: number
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const THEME_OPTIONS = [
  { value: "light", label: "Claro", icon: Sun },
  { value: "dark", label: "Escuro", icon: Moon },
  { value: "system", label: "Sistema", icon: Monitor },
]

const DENSITY_OPTIONS = [
  { value: "compact", label: "Compacto" },
  { value: "normal", label: "Normal" },
  { value: "comfortable", label: "Confortavel" },
]

const LAYOUT_OPTIONS = [
  { value: "grid", label: "Grid" },
  { value: "list", label: "Lista" },
  { value: "kanban", label: "Kanban" },
]

const PRIORITY_OPTIONS = [
  { value: "LOW", label: "Baixa" },
  { value: "MEDIUM", label: "Media" },
  { value: "HIGH", label: "Alta" },
  { value: "URGENT", label: "Urgente" },
]

const ACCENT_COLORS = [
  { value: "#3b82f6", label: "Azul" },
  { value: "#8b5cf6", label: "Violeta" },
  { value: "#ec4899", label: "Rosa" },
  { value: "#f97316", label: "Laranja" },
  { value: "#22c55e", label: "Verde" },
  { value: "#06b6d4", label: "Ciano" },
  { value: "#ef4444", label: "Vermelho" },
  { value: "#eab308", label: "Amarelo" },
]

const AGENT_ROLE_LABELS: Record<string, { label: string; emoji: string }> = {
  MAESTRO: { label: "Maestro", emoji: "🎯" },
  SENTINEL: { label: "Sentinel", emoji: "🛡️" },
  ARCHITECTON: { label: "Architecton", emoji: "🏗️" },
  PIXEL: { label: "Pixel", emoji: "🎨" },
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function SettingsPage() {
  const { setTheme: setGlobalTheme } = useTheme()
  const [settings, setSettings] = useState<Settings | null>(null)
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [resetDialogOpen, setResetDialogOpen] = useState(false)
  const [resetting, setResetting] = useState(false)

  // --- Load settings ---
  useEffect(() => {
    async function load() {
      try {
        const [settingsRes, agentsRes] = await Promise.all([
          fetch("/api/settings"),
          fetch("/api/agents"),
        ])
        const settingsData = await settingsRes.json()
        const agentsData = await agentsRes.json()

        if (settingsData.success) setSettings(settingsData.data)
        if (agentsData.success) setAgents(agentsData.data || [])
      } catch {
        toast.error("Erro ao carregar configuracoes")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  // --- Save settings ---
  const saveSettings = useCallback(
    async (patch: Partial<Settings>, section: string) => {
      setSaving(section)
      try {
        const res = await fetch("/api/settings", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        })
        const data = await res.json()
        if (data.success) {
          setSettings(data.data)
          toast.success("Configuracoes salvas")

          // Apply theme via provider (syncs localStorage)
          if (patch.theme) {
            setGlobalTheme(patch.theme as 'light' | 'dark' | 'system')
          }
        } else {
          toast.error("Erro ao salvar configuracoes")
        }
      } catch {
        toast.error("Erro ao salvar configuracoes")
      } finally {
        setSaving(null)
      }
    },
    []
  )

  // --- Toggle agent ---
  const toggleAgent = useCallback(async (agentId: string, isActive: boolean) => {
    try {
      const res = await fetch(`/api/agents/${agentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive }),
      })
      const data = await res.json()
      if (data.success) {
        setAgents((prev) =>
          prev.map((a) => (a.id === agentId ? { ...a, isActive } : a))
        )
        toast.success(`Agente ${isActive ? "ativado" : "desativado"}`)
      }
    } catch {
      toast.error("Erro ao atualizar agente")
    }
  }, [])

  // --- Export data ---
  const exportData = useCallback(async () => {
    try {
      const res = await fetch("/api/tasks?limit=10000")
      const data = await res.json()
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `tcc-export-${new Date().toISOString().split("T")[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success("Dados exportados com sucesso")
    } catch {
      toast.error("Erro ao exportar dados")
    }
  }, [])

  // --- Import data ---
  const importData = useCallback(() => {
    const input = document.createElement("input")
    input.type = "file"
    input.accept = ".json"
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      try {
        const text = await file.text()
        const data = JSON.parse(text)
        if (data.data && Array.isArray(data.data)) {
          toast.info(`Arquivo carregado: ${data.data.length} registros encontrados`)
          toast.info("Importacao em lote sera implementada em breve")
        } else {
          toast.warning("Formato de arquivo nao reconhecido")
        }
      } catch {
        toast.error("Erro ao ler arquivo")
      }
    }
    input.click()
  }, [])

  // --- Reset system ---
  const resetSystem = useCallback(async () => {
    setResetting(true)
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          theme: "light",
          defaultView: "grid",
          density: "normal",
          dashboardLayout: "grid",
          accentColor: "#3b82f6",
          notifications: {
            creation: true,
            completion: true,
            error: true,
            assignment: true,
            statusChange: true,
            comment: true,
            sounds: false,
            email: false,
          },
          system: {
            autoProcessorInterval: 30,
            maxRetries: 3,
            executionTimeout: 300,
            retentionDays: 90,
          },
        }),
      })
      const data = await res.json()
      if (data.success) {
        setSettings(data.data)
        setGlobalTheme("light")
        toast.success("Sistema resetado para configuracoes padrao")
        setResetDialogOpen(false)
      }
    } catch {
      toast.error("Erro ao resetar sistema")
    } finally {
      setResetting(false)
    }
  }, [])

  // --- Loading skeleton ---
  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8 max-w-4xl">
          <div className="space-y-6">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-10 w-full max-w-lg" />
            <div className="space-y-4">
              <Skeleton className="h-64 w-full" />
              <Skeleton className="h-48 w-full" />
            </div>
          </div>
        </main>
      </div>
    )
  }

  if (!settings) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8 max-w-4xl">
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <AlertTriangle className="h-10 w-10 mb-3" />
            <p>Erro ao carregar configuracoes</p>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Title */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight">Configuracoes</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie as preferencias do sistema
          </p>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="appearance" className="space-y-6">
          <TabsList className="w-full justify-start flex-wrap h-auto gap-1 p-1">
            <TabsTrigger value="appearance" className="gap-1.5">
              <Palette className="h-3.5 w-3.5" />
              Aparencia
            </TabsTrigger>
            <TabsTrigger value="notifications" className="gap-1.5">
              <Bell className="h-3.5 w-3.5" />
              Notificacoes
            </TabsTrigger>
            <TabsTrigger value="agents" className="gap-1.5">
              <Bot className="h-3.5 w-3.5" />
              Agentes
            </TabsTrigger>
            <TabsTrigger value="system" className="gap-1.5">
              <Settings2 className="h-3.5 w-3.5" />
              Sistema
            </TabsTrigger>
            <TabsTrigger value="data" className="gap-1.5">
              <Database className="h-3.5 w-3.5" />
              Dados
            </TabsTrigger>
          </TabsList>

          {/* ================================================================
              TAB: Aparencia
              ================================================================ */}
          <TabsContent value="appearance" className="space-y-6">
            {/* Theme */}
            <SettingsSection
              title="Tema"
              description="Escolha entre tema claro, escuro ou automatico"
              saving={saving === "theme"}
            >
              <div className="grid grid-cols-3 gap-3">
                {THEME_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => saveSettings({ theme: opt.value }, "theme")}
                    className={`flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-all hover:bg-accent ${
                      settings.theme === opt.value
                        ? "border-primary bg-primary/5"
                        : "border-border"
                    }`}
                  >
                    <opt.icon className="h-5 w-5" />
                    <span className="text-sm font-medium">{opt.label}</span>
                  </button>
                ))}
              </div>
            </SettingsSection>

            {/* Accent Color */}
            <SettingsSection
              title="Cor de Destaque"
              description="Personalize a cor principal da interface"
              saving={saving === "accentColor"}
            >
              <div className="flex flex-wrap gap-3">
                {ACCENT_COLORS.map((color) => (
                  <button
                    key={color.value}
                    onClick={() =>
                      saveSettings({ accentColor: color.value }, "accentColor")
                    }
                    className={`group relative h-10 w-10 rounded-full border-2 transition-all hover:scale-110 ${
                      settings.accentColor === color.value
                        ? "border-foreground ring-2 ring-offset-2 ring-offset-background"
                        : "border-transparent"
                    }`}
                    style={{ backgroundColor: color.value }}
                    title={color.label}
                  >
                    {settings.accentColor === color.value && (
                      <CheckCircle2 className="absolute inset-0 m-auto h-5 w-5 text-white drop-shadow" />
                    )}
                  </button>
                ))}
              </div>
            </SettingsSection>

            {/* Density & Layout */}
            <SettingsSection
              title="Exibicao"
              description="Ajuste a densidade e layout do dashboard"
              saving={saving === "display"}
            >
              <SelectSetting
                id="density"
                label="Densidade"
                description="Espacamento entre elementos"
                value={settings.density}
                onValueChange={(v) => saveSettings({ density: v }, "display")}
                options={DENSITY_OPTIONS}
              />
              <Separator />
              <SelectSetting
                id="layout"
                label="Layout do Dashboard"
                description="Modo de visualizacao padrao"
                value={settings.dashboardLayout}
                onValueChange={(v) =>
                  saveSettings({ dashboardLayout: v }, "display")
                }
                options={LAYOUT_OPTIONS}
              />
            </SettingsSection>
          </TabsContent>

          {/* ================================================================
              TAB: Notificacoes
              ================================================================ */}
          <TabsContent value="notifications" className="space-y-6">
            <SettingsSection
              title="Notificacoes de Tarefas"
              description="Controle quais eventos geram notificacoes"
              saving={saving === "notifications"}
            >
              <ToggleSetting
                id="notif-creation"
                label="Criacao de tarefas"
                description="Notificar quando uma nova tarefa for criada"
                checked={settings.notifications.creation}
                onCheckedChange={(v) =>
                  saveSettings(
                    { notifications: { ...settings.notifications, creation: v } },
                    "notifications"
                  )
                }
              />
              <Separator />
              <ToggleSetting
                id="notif-completion"
                label="Conclusao de tarefas"
                description="Notificar quando uma tarefa for concluida"
                checked={settings.notifications.completion}
                onCheckedChange={(v) =>
                  saveSettings(
                    { notifications: { ...settings.notifications, completion: v } },
                    "notifications"
                  )
                }
              />
              <Separator />
              <ToggleSetting
                id="notif-error"
                label="Erros de execucao"
                description="Notificar quando ocorrer um erro"
                checked={settings.notifications.error}
                onCheckedChange={(v) =>
                  saveSettings(
                    { notifications: { ...settings.notifications, error: v } },
                    "notifications"
                  )
                }
              />
              <Separator />
              <ToggleSetting
                id="notif-assignment"
                label="Atribuicao de agentes"
                description="Notificar quando um agente for atribuido"
                checked={settings.notifications.assignment}
                onCheckedChange={(v) =>
                  saveSettings(
                    { notifications: { ...settings.notifications, assignment: v } },
                    "notifications"
                  )
                }
              />
              <Separator />
              <ToggleSetting
                id="notif-status"
                label="Mudanca de status"
                description="Notificar quando o status de uma tarefa mudar"
                checked={settings.notifications.statusChange}
                onCheckedChange={(v) =>
                  saveSettings(
                    {
                      notifications: {
                        ...settings.notifications,
                        statusChange: v,
                      },
                    },
                    "notifications"
                  )
                }
              />
              <Separator />
              <ToggleSetting
                id="notif-comment"
                label="Comentarios"
                description="Notificar quando houver novos comentarios"
                checked={settings.notifications.comment}
                onCheckedChange={(v) =>
                  saveSettings(
                    { notifications: { ...settings.notifications, comment: v } },
                    "notifications"
                  )
                }
              />
            </SettingsSection>

            <SettingsSection
              title="Preferencias"
              description="Sons e notificacoes por email"
              saving={saving === "notif-prefs"}
            >
              <ToggleSetting
                id="notif-sounds"
                label="Sons de notificacao"
                description="Reproduzir um som ao receber notificacoes"
                checked={settings.notifications.sounds}
                onCheckedChange={(v) =>
                  saveSettings(
                    { notifications: { ...settings.notifications, sounds: v } },
                    "notif-prefs"
                  )
                }
              />
              <Separator />
              <ToggleSetting
                id="notif-email"
                label="Notificacoes por email"
                description="Em breve - receba notificacoes por email"
                checked={settings.notifications.email}
                onCheckedChange={(v) =>
                  saveSettings(
                    { notifications: { ...settings.notifications, email: v } },
                    "notif-prefs"
                  )
                }
                disabled
              />
              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                <Badge variant="outline" className="text-[10px]">
                  Em breve
                </Badge>
                Notificacoes por email serao adicionadas em uma versao futura
              </div>
            </SettingsSection>
          </TabsContent>

          {/* ================================================================
              TAB: Agentes
              ================================================================ */}
          <TabsContent value="agents" className="space-y-6">
            {agents.length === 0 ? (
              <SettingsSection
                title="Agentes"
                description="Nenhum agente configurado"
              >
                <p className="text-sm text-muted-foreground py-4">
                  Nenhum agente encontrado. Crie agentes na pagina de monitor para configura-los aqui.
                </p>
              </SettingsSection>
            ) : (
              agents.map((agent) => {
                const roleInfo = AGENT_ROLE_LABELS[agent.role] || {
                  label: agent.role,
                  emoji: "🤖",
                }
                return (
                  <SettingsSection
                    key={agent.id}
                    title={`${roleInfo.emoji} ${agent.name}`}
                    description={`${roleInfo.label} - ${agent.tasksCompleted} tarefas concluidas - Taxa: ${(agent.successRate * 100).toFixed(0)}%`}
                  >
                    <div className="flex items-center justify-between py-2">
                      <div className="space-y-0.5">
                        <Label className="text-sm font-medium">
                          Agente ativo
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Ativar ou desativar este agente
                        </p>
                      </div>
                      <Switch
                        checked={agent.isActive}
                        onCheckedChange={(v) => toggleAgent(agent.id, v)}
                      />
                    </div>
                    <Separator />
                    <div className="space-y-2 py-2">
                      <Label className="text-sm font-medium">Capacidades</Label>
                      <div className="flex flex-wrap gap-1.5">
                        {agent.skills.length > 0 ? (
                          agent.skills.map((skill) => (
                            <Badge key={skill} variant="secondary" className="text-xs">
                              {skill}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            Nenhuma habilidade registrada
                          </span>
                        )}
                      </div>
                    </div>
                  </SettingsSection>
                )
              })
            )}
          </TabsContent>

          {/* ================================================================
              TAB: Sistema
              ================================================================ */}
          <TabsContent value="system" className="space-y-6">
            <SettingsSection
              title="Auto-Processador"
              description="Configuracoes do processamento automatico de tarefas"
              saving={saving === "system"}
            >
              <SliderSetting
                id="auto-interval"
                label="Intervalo de verificacao"
                description="Frequencia de verificacao da fila de tarefas"
                value={settings.system.autoProcessorInterval}
                onValueChange={(v) =>
                  saveSettings(
                    { system: { ...settings.system, autoProcessorInterval: v } },
                    "system"
                  )
                }
                min={5}
                max={120}
                step={5}
                unit="s"
              />
            </SettingsSection>

            <SettingsSection
              title="Execucao"
              description="Limites de tentativas e timeout"
              saving={saving === "execution"}
            >
              <SliderSetting
                id="max-retries"
                label="Maximo de tentativas"
                description="Numero maximo de retries para tarefas com falha"
                value={settings.system.maxRetries}
                onValueChange={(v) =>
                  saveSettings(
                    { system: { ...settings.system, maxRetries: v } },
                    "execution"
                  )
                }
                min={1}
                max={10}
              />
              <Separator />
              <SliderSetting
                id="exec-timeout"
                label="Timeout de execucao"
                description="Tempo maximo para execucao de uma tarefa"
                value={settings.system.executionTimeout}
                onValueChange={(v) =>
                  saveSettings(
                    { system: { ...settings.system, executionTimeout: v } },
                    "execution"
                  )
                }
                min={30}
                max={900}
                step={30}
                unit="s"
              />
            </SettingsSection>

            <SettingsSection
              title="Manutencao"
              description="Limpeza automatica de dados antigos"
              saving={saving === "maintenance"}
            >
              <SliderSetting
                id="retention"
                label="Retencao de dados"
                description="Dias para manter logs e execucoes antigas"
                value={settings.system.retentionDays}
                onValueChange={(v) =>
                  saveSettings(
                    { system: { ...settings.system, retentionDays: v } },
                    "maintenance"
                  )
                }
                min={7}
                max={365}
                step={7}
                unit=" dias"
              />
            </SettingsSection>
          </TabsContent>

          {/* ================================================================
              TAB: Dados
              ================================================================ */}
          <TabsContent value="data" className="space-y-6">
            <SettingsSection
              title="Exportar Dados"
              description="Exporte todos os dados do sistema em formato JSON"
            >
              <Button onClick={exportData} variant="outline" className="gap-2">
                <Download className="h-4 w-4" />
                Exportar todos os dados
              </Button>
            </SettingsSection>

            <SettingsSection
              title="Importar Dados"
              description="Importe dados de um arquivo JSON previamente exportado"
            >
              <Button onClick={importData} variant="outline" className="gap-2">
                <Upload className="h-4 w-4" />
                Importar dados
              </Button>
            </SettingsSection>

            <SettingsSection
              title="Resetar Sistema"
              description="Restaure todas as configuracoes para os valores padrao"
            >
              <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="destructive" className="gap-2">
                    <Trash2 className="h-4 w-4" />
                    Resetar configuracoes
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-destructive" />
                      Resetar Configuracoes
                    </DialogTitle>
                    <DialogDescription>
                      Esta acao ira restaurar todas as configuracoes para os
                      valores padrao. As tarefas e dados nao serao afetados.
                      Deseja continuar?
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setResetDialogOpen(false)}
                      disabled={resetting}
                    >
                      Cancelar
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={resetSystem}
                      disabled={resetting}
                      className="gap-2"
                    >
                      {resetting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                      Confirmar Reset
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </SettingsSection>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
