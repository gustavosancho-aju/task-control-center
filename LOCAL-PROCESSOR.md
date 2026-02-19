# Local Processor — Guia de Uso

Processador local que executa tarefas usando **Claude Code CLI** em vez da API Anthropic.

✅ **Benefício:** Usa assinatura Claude.ai (sem custo de API)

---

## Pré-requisitos

✅ Claude Code CLI instalado e autenticado
```bash
claude --version  # Deve retornar: 2.1.42 (Claude Code)
```

✅ Banco de dados configurado no `.env`
```bash
DATABASE_URL="postgresql://..."
```

---

## Como Usar

### 1. Iniciar o Processor

```bash
npm run processor
```

### 2. Configuração (Opcional)

Ajuste via variáveis de ambiente no `.env`:

```bash
# Intervalo entre ciclos (padrão: 15s)
PROCESSOR_INTERVAL=15

# Tarefas simultâneas (padrão: 2)
PROCESSOR_CONCURRENCY=2
```

### 3. Parar o Processor

Pressione `Ctrl+C` no terminal.

---

## Como Funciona

1. **Polling:** A cada `PROCESSOR_INTERVAL` segundos, busca tarefas `PENDING` na fila
2. **Execução:** Processa até `PROCESSOR_CONCURRENCY` tarefas em paralelo
3. **Claude Code CLI:** Usa `claude` command local (sem API key)
4. **Logs:** Exibe status de cada tarefa em tempo real

---

## Output Esperado

```
╔══════════════════════════════════════════╗
║   Task Control Center — Local Processor  ║
║   Modo: Claude Code CLI (sem API key)    ║
╚══════════════════════════════════════════╝
Intervalo: 15s | Concorrência: 2

✅ Claude Code CLI: 2.1.42 (Claude Code)
✅ Capabilities registradas
✅ Banco de dados conectado

[19:45:30] Aguardando tarefas... (ciclo #1)
[19:45:45] 🔄 2 tarefa(s) encontrada(s)
[19:45:45] ▶ [PIXEL] Gerar código HTML da apresentação
[19:45:45] ▶ [SENTINEL] Revisar qualidade da landing page
[19:46:12] ✅ [PIXEL] Gerar código HTML da apresentação
[19:46:18] ✅ [SENTINEL] Revisar qualidade da landing page
[19:46:18] 📊 Total: 2 ✅ | 0 ❌
```

---

## Comparação: Local vs Vercel

| Aspecto | Local Processor | Vercel (Produção) |
|---------|----------------|-------------------|
| **API** | Claude Code CLI | Anthropic API |
| **Custo** | Assinatura Claude.ai | Créditos API ($$$) |
| **Velocidade** | Rápido | Rápido |
| **Ambiente** | Desenvolvimento | Produção |
| **Processo** | Long-running | Serverless (cron) |

---

## Troubleshooting

### ❌ Claude Code CLI não encontrado

```bash
npm install -g @anthropic-ai/claude-code
claude login
```

### ❌ Erro de conexão com banco

Verifique `DATABASE_URL` no `.env`:
```bash
cat .env | grep DATABASE_URL
```

### ❌ Tarefas não aparecem

1. Verifique se há tarefas na fila: https://task-control-center.vercel.app/monitor
2. Verifique status do banco:
```bash
npx prisma studio
```

---

## Quando Usar

✅ **Use o Local Processor quando:**
- Desenvolver/testar localmente
- Economizar créditos da API
- Processar muitas tarefas de uma vez
- Debugging detalhado

❌ **NÃO use para:**
- Produção (use Vercel com cron)
- CI/CD pipelines
- Servidores sem Claude Code CLI

---

## Comandos Úteis

```bash
# Rodar processor
npm run processor

# Rodar com intervalo customizado (5s)
PROCESSOR_INTERVAL=5 npm run processor

# Rodar com mais concorrência (5 tarefas simultâneas)
PROCESSOR_CONCURRENCY=5 npm run processor

# Verificar fila no banco
npx prisma studio
```

---

*Configurado em 19/02/2026*
