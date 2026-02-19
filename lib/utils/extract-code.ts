/**
 * Extrai bloco de código de uma resposta do Claude.
 * Lida com fences markdown (```html, ```css, ```js, etc.)
 * e com respostas onde o fence de fechamento está ausente.
 */
export function extractCode(text: string, language?: string): string {
  // Tenta extrair de um bloco com fence
  const langPattern = language ? language : '[a-zA-Z]*'
  const fenceRegex = new RegExp('```' + langPattern + '\\s*\\n([\\s\\S]*?)```', 'i')
  const match = text.match(fenceRegex)

  if (match) {
    return match[1].trim()
  }

  // Fallback: se começa com fence mas não tem fechamento
  const lines = text.trim().split('\n')
  if (lines[0]?.startsWith('```')) {
    lines.shift() // remove fence de abertura
    if (lines[lines.length - 1]?.startsWith('```')) {
      lines.pop() // remove fence de fechamento
    }
    return lines.join('\n').trim()
  }

  // Sem fence: retorna o texto como está
  return text.trim()
}

/**
 * Extrai todas as classes CSS usadas em um HTML.
 * Usado para garantir que o CSS gerado use os mesmos nomes.
 */
export function extractHtmlClasses(html: string): string[] {
  const classRegex = /class="([^"]+)"/g
  const classes = new Set<string>()

  let m: RegExpExecArray | null
  while ((m = classRegex.exec(html)) !== null) {
    m[1].split(/\s+/).forEach(cls => {
      if (cls.trim()) classes.add(cls.trim())
    })
  }

  return [...classes].sort()
}
