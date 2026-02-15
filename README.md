# NEXUS PROTOCOL - Task Control Center

Um sistema de gestão de tarefas futurista com tema Matrix/Cyberpunk desenvolvido com design de interface altamente imersivo.

## 🎨 Design Concept

**Estética**: Cyberpunk/Matrix - Terminal hacker do futuro
- Fundo preto absoluto com overlay de grid
- Elementos em verde neon (#00ff41) e branco brilhante
- Efeitos de scanline animados
- Tipografia monospace tech
- Glows e sombras neon intensas
- Animações de pulso para tasks em execução

## 🚀 Características

### Dashboard (index.html)
- **System Time**: Relógio em tempo real atualizado a cada segundo
- **Stats Grid**: 4 cards com estatísticas animadas
  - Total de tarefas
  - Processos ativos (pulsante)
  - Tarefas completadas
  - Eficiência do sistema
- **Active Processes**: Cards de tarefas em execução com:
  - Efeito de pulso/piscada constante
  - Barra de progresso animada
  - Timer de runtime em tempo real
  - Níveis de prioridade (Low, Medium, High, Critical)
- **System Log**: Feed de atividades recentes

### Task Board (board.html)
- **4 Colunas estilo Trello**:
  1. QUEUE - Tarefas na fila
  2. IN PROGRESS - Tarefas em execução (piscando)
  3. TESTING - Tarefas em teste
  4. COMPLETED - Tarefas finalizadas
- **Cards interativos** com:
  - ID único
  - Título e descrição
  - Tags de categoria
  - Prioridade
  - Assignee (agente responsável)
  - Barra de progresso (para tasks em execução)
  - Timer de runtime

## ✨ Efeitos Visuais

### Animações Principais
1. **Scanlines**: Linhas horizontais animadas que percorrem toda a tela
2. **Grid Overlay**: Grid de linhas sutis estilo radar
3. **Pulse Effect**: Cards em execução pulsam com glow neon
4. **Progress Shimmer**: Barras de progresso com efeito de brilho
5. **Matrix Rain**: Efeito de "chuva" de caracteres japoneses e binários (opcional)
6. **Glitch Effect**: Efeito de glitch aleatório em títulos
7. **Status Blink**: Indicador de status online piscando
8. **Hover Effects**: Transformações e glows ao passar o mouse

### Cursores Customizados
- Cursor padrão: círculo verde neon
- Cursor de interação: círculo maior e mais brilhante

## 🎯 Funcionalidades JavaScript

### Contadores e Timers
- **Stats Counter**: Animação de contagem de 0 até o valor final
- **System Time**: Atualização em tempo real
- **Runtime Counters**: Incremento automático do tempo de execução das tasks
- **Progress Simulation**: Incremento automático do progresso (simulação)

### Interatividade
- **Card Clicks**: Feedback visual ao clicar nos cards
- **Add Task Button**: Botão com animação e notificação
- **Keyboard Shortcuts**:
  - `Ctrl/Cmd + K`: Ativar protocolo de comando
  - `Ctrl/Cmd + N`: Novo task

### Sistema de Notificações
- Notificações animadas no canto superior direito
- Eventos aleatórios do sistema
- Feedback de ações

## 🛠️ Tecnologias

- **HTML5**: Estrutura semântica
- **CSS3**: Estilos avançados com:
  - CSS Variables para tema
  - CSS Grid e Flexbox para layout
  - Animações e transições CSS
  - Efeitos de glow e shadow
- **JavaScript (Vanilla)**: Lógica e interatividade
  - Sem dependências externas
  - Performance otimizada
  - Event listeners modernos

## 🎨 Fontes

- **Orbitron**: Títulos e logos (tech/sci-fi)
- **Share Tech Mono**: IDs, códigos e números (monospace tech)
- **Rajdhani**: Textos gerais (clean tech sans-serif)

Todas as fontes são carregadas do Google Fonts.

## 📱 Responsividade

O layout é totalmente responsivo com breakpoints em:
- Desktop: 1200px+
- Tablet: 768px - 1199px
- Mobile: < 768px

## 🎭 Paleta de Cores

```css
--neon-green: #00ff41        /* Verde neon principal */
--neon-green-bright: #0fff50 /* Verde neon brilhante */
--neon-green-dim: #00cc33    /* Verde neon escurecido */
--neon-green-dark: #003b00   /* Verde escuro */
--neon-white: #ffffff        /* Branco neon */
--bg-black: #000000          /* Fundo preto */
--bg-card: #0d0d0d          /* Fundo de cards */
```

## 🚀 Como Usar

1. Abra `index.html` no navegador para ver o Dashboard
2. Navegue para `board.html` através do menu ou diretamente
3. Observe os efeitos:
   - Tasks em execução piscam automaticamente
   - Contadores incrementam em tempo real
   - Progress bars avançam gradualmente
   - Matrix rain cai no fundo

## 🔧 Customização

### Modificar cores
Edite as CSS variables em `styles.css`:
```css
:root {
    --neon-green: #00ff41; /* Sua cor aqui */
}
```

### Desativar Matrix Rain
No `app.js`, comente a linha:
```javascript
// createMatrixRain();
```

### Ajustar velocidade das animações
Modifique as CSS variables de timing:
```css
--transition-fast: 0.15s ease;
--transition-normal: 0.3s ease;
```

## 📊 Estrutura de Arquivos

```
task-control-center/
├── index.html      # Dashboard principal
├── board.html      # Board estilo Trello
├── styles.css      # Estilos completos
├── app.js          # Lógica JavaScript
└── README.md       # Esta documentação
```

## 🎯 Próximas Melhorias (Sugestões)

- [ ] Drag and drop entre colunas do board
- [ ] Modal de detalhes de task
- [ ] Filtros e busca
- [ ] Integração com backend real
- [ ] Modo de tela cheia
- [ ] Temas adicionais (Blade Runner, Tron, etc.)
- [ ] Exportar dados para JSON
- [ ] Notificações do navegador
- [ ] WebSocket para updates em tempo real
- [ ] Dark mode toggle (atualmente sempre dark)

## 💡 Inspiração

Este projeto foi inspirado em:
- Matrix (filme)
- Blade Runner 2049
- Cyberpunk 2077
- Interfaces de comando hacker
- Terminal Unix/Linux
- Sistemas de vigilância futuristas

## 📝 Licença

Projeto desenvolvido para fins educacionais e demonstração de habilidades de frontend.

---

**[NEXUS PROTOCOL]** - SYSTEM STATUS: ONLINE
