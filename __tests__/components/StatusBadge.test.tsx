import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StatusBadge } from '@/components/tasks/StatusBadge'

describe('StatusBadge', () => {
  it('renderiza TODO com "A Fazer"', () => {
    render(<StatusBadge status="TODO" />)
    expect(screen.getByText('A Fazer')).toBeInTheDocument()
  })

  it('renderiza IN_PROGRESS com "Em Progresso"', () => {
    render(<StatusBadge status="IN_PROGRESS" />)
    expect(screen.getByText('Em Progresso')).toBeInTheDocument()
  })

  it('renderiza REVIEW com "Em Revisao"', () => {
    render(<StatusBadge status="REVIEW" />)
    expect(screen.getByText('Em Revisao')).toBeInTheDocument()
  })

  it('renderiza DONE com "Concluido"', () => {
    render(<StatusBadge status="DONE" />)
    expect(screen.getByText('Concluido')).toBeInTheDocument()
  })

  it('renderiza BLOCKED com "Bloqueado"', () => {
    render(<StatusBadge status="BLOCKED" />)
    expect(screen.getByText('Bloqueado')).toBeInTheDocument()
  })
})
