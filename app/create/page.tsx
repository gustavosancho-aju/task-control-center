"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { FileText } from "lucide-react"
import { Header } from "@/components/layout/Header"
import { Button } from "@/components/ui/button"
import { TaskCreationForm } from "@/components/tasks/TaskCreationForm"
import { TemplatePicker } from "@/components/templates/TemplatePicker"
import { notifyTaskCreated, notifyError } from "@/lib/notifications"
import { useCreateTask } from "@/lib/hooks/use-tasks"

export default function CreateTaskPage() {
  const router = useRouter()
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false)
  const createTask = useCreateTask()

  const handleSubmit = async (task: { title: string; description?: string; priority: string }) => {
    try {
      await createTask.mutateAsync(task)
      notifyTaskCreated(task.title)
      router.push("/")
    } catch {
      notifyError("Erro ao criar tarefa", "Falha na conexão com o servidor")
    }
  }

  return (
    <div className="min-h-screen bg-muted/40">
      <Header />
      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Nova Tarefa</h1>
            <p className="text-muted-foreground">Crie uma nova tarefa para o Agency Dev Squad</p>
          </div>
          <Button
            variant="outline"
            onClick={() => setTemplatePickerOpen(true)}
            className="gap-1.5 flex-shrink-0"
          >
            <FileText className="h-4 w-4" />
            Usar Template
          </Button>
        </div>
        <TaskCreationForm onSubmit={handleSubmit} onCancel={() => router.push("/")} />

        <TemplatePicker
          open={templatePickerOpen}
          onOpenChange={setTemplatePickerOpen}
        />
      </main>
    </div>
  )
}
