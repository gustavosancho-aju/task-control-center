'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/button'
import { TemplateForm } from '@/components/templates/TemplateForm'
import { notifySuccess, notifyError } from '@/lib/notifications'

export default function NewTemplatePage() {
  const router = useRouter()

  const handleSubmit = async (data: {
    name: string
    description: string
    defaultTitle: string
    defaultDescription: string
    defaultPriority: string
    defaultAgentRole: string
    defaultTags: string[]
    subtaskTemplates: { title: string; description?: string; priority?: string }[]
  }) => {
    try {
      const res = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          defaultAgentRole: data.defaultAgentRole === 'none' || !data.defaultAgentRole ? null : data.defaultAgentRole,
          subtaskTemplates: data.subtaskTemplates.length > 0 ? data.subtaskTemplates : null,
        }),
      })
      const result = await res.json()
      if (!res.ok || !result.success) {
        notifyError('Erro ao criar template', result.error)
        return
      }
      notifySuccess('Template criado', `"${data.name}" salvo com sucesso.`)
      router.push('/templates')
    } catch {
      notifyError('Erro', 'Não foi possível criar o template.')
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/templates')}
          className="gap-2 mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para Templates
        </Button>

        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight">Novo Template</h1>
          <p className="text-muted-foreground mt-1">
            Defina um modelo reutilizável para criação de tarefas
          </p>
        </div>

        <TemplateForm
          onSubmit={handleSubmit}
          onCancel={() => router.push('/templates')}
          submitLabel="Criar Template"
        />
      </main>
    </div>
  )
}
