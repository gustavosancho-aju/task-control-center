import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PriorityBadge } from '@/components/tasks/PriorityBadge'

describe('PriorityBadge', () => {
  it('renderiza LOW com "Baixa"', () => {
    render(<PriorityBadge priority="LOW" />)
    expect(screen.getByText('Baixa')).toBeInTheDocument()
  })

  it('renderiza MEDIUM com "Media"', () => {
    render(<PriorityBadge priority="MEDIUM" />)
    expect(screen.getByText('Media')).toBeInTheDocument()
  })

  it('renderiza HIGH com "Alta"', () => {
    render(<PriorityBadge priority="HIGH" />)
    expect(screen.getByText('Alta')).toBeInTheDocument()
  })

  it('renderiza URGENT com "Urgente"', () => {
    render(<PriorityBadge priority="URGENT" />)
    expect(screen.getByText('Urgente')).toBeInTheDocument()
  })
})
