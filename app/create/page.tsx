"use client"
import { useRouter } from "next/navigation"
import { Header } from "@/components/layout/Header"
import { TaskCreationForm } from "@/components/tasks/TaskCreationForm"

export default function CreateTaskPage() {
  const router = useRouter()

  const handleSubmit = async (task: { title: string; description?: string; priority: string }) => {
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(task),
    })
    if (res.ok) {
      router.push("/")
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Nova Tarefa</h1>
          <p className="text-muted-foreground">Crie uma nova tarefa para o Agency Dev Squad</p>
        </div>
        <TaskCreationForm onSubmit={handleSubmit} onCancel={() => router.push("/")} />
      </main>
    </div>
  )
}
