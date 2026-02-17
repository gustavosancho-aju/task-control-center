'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { AlertTriangle } from 'lucide-react'

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function GlobalError({ error, reset }: ErrorProps) {
  useEffect(() => {
    // TODO: Send to error tracking service in production
    // Example: Sentry.captureException(error)
    console.error('[GlobalError]', error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="flex justify-center">
          <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertTriangle className="h-8 w-8 text-destructive" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Algo deu errado</h1>
          <p className="text-muted-foreground">
            Ocorreu um erro inesperado. Nossa equipe foi notificada.
          </p>
          {process.env.NODE_ENV === 'development' && (
            <details className="mt-4 text-left">
              <summary className="text-sm text-muted-foreground cursor-pointer">
                Detalhes do erro (dev only)
              </summary>
              <pre className="mt-2 p-3 bg-muted rounded-md text-xs overflow-auto">
                {error.message}
                {error.digest && `\nDigest: ${error.digest}`}
              </pre>
            </details>
          )}
        </div>

        <div className="flex gap-3 justify-center">
          <Button onClick={reset}>Tentar novamente</Button>
          <Button variant="outline" onClick={() => (window.location.href = '/')}>
            Ir para início
          </Button>
        </div>
      </div>
    </div>
  )
}
