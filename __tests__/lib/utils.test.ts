import { describe, it, expect } from 'vitest'
import { cn } from '@/lib/utils'

describe('cn (classnames helper)', () => {
  it('concatena classes simples', () => {
    expect(cn('foo', 'bar')).toBe('foo bar')
  })

  it('remove classes falsy', () => {
    expect(cn('foo', false, undefined, null, 'bar')).toBe('foo bar')
  })

  it('resolve conflitos tailwind (última ganha)', () => {
    expect(cn('p-4', 'p-8')).toBe('p-8')
    expect(cn('text-sm', 'text-lg')).toBe('text-lg')
  })

  it('suporta classes condicionais (objeto)', () => {
    expect(cn('base', { active: true, disabled: false })).toBe('base active')
  })

  it('retorna string vazia quando sem input', () => {
    expect(cn()).toBe('')
  })

  it('suporta arrays de classes', () => {
    expect(cn(['foo', 'bar'], 'baz')).toBe('foo bar baz')
  })
})
