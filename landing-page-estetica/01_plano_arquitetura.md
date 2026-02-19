# PLANO TÉCNICO DETALHADO - LANDING PAGE ESTÉTICA

## 1. ESTRUTURA DE SEÇÕES (Ordem Hierárquica)

### **SEÇÃO 1: HERO/ABERTURA**
- Logo + Menu fixo minimalista
- Headline principal
- Subheadline
- CTA primário (WhatsApp)
- Imagem hero (mulher relaxada em spa)

### **SEÇÃO 2: PROPOSTA DE VALOR**
- 3 pilares de diferenciação em cards
- Micro-copy explicativo

### **SEÇÃO 3: SERVIÇOS**
- Grid 2x2 de serviços com:
  - Ícone
  - Nome do serviço
  - Descrição breve (2-3 linhas)
  - Benefício principal
  - Duração aproximada

### **SEÇÃO 4: PROVA SOCIAL**
- 3 depoimentos com foto (avatares)
- Nome + Idade
- Serviço contratado
- Depoimento curto

### **SEÇÃO 5: SOBRE/CREDIBILIDADE**
- Foto da profissional/espaço
- Texto institucional (150 palavras)
- Certificações/tempo de mercado

### **SEÇÃO 6: PROCESSO DE AGENDAMENTO**
- 3 passos visuais (numerados)
- Simplicidade e clareza

### **SEÇÃO 7: FAQ**
- 5 perguntas frequentes em accordion
- Reduzir objeções

### **SEÇÃO 8: CTA FINAL**
- Headline de urgência suave
- Botão WhatsApp grande
- Benefício de agendar hoje

### **SEÇÃO 9: FOOTER**
- Horário de funcionamento
- Endereço (se presencial)
- Links institucionais
- Redes sociais

---

## 2. PALETA DE CORES (Hex Codes)

```css
/* Cores Primárias */
--primary-rose: #D4827B;        /* Rosa terracota - Ação/CTAs */
--primary-gold: #C9A961;        /* Dourado suave - Detalhes premium */

/* Cores Secundárias */
--secondary-cream: #F5EDE4;     /* Creme quente - Backgrounds */
--secondary-blush: #E8D5D0;     /* Blush claro - Cards/Seções alternadas */

/* Cores Neutras */
--neutral-charcoal: #3D3935;    /* Marrom escuro - Textos principais */
--neutral-taupe: #7A6F68;       /* Taupe - Textos secundários */
--neutral-white: #FFFFFF;       /* Branco puro - Contraste */
--neutral-light: #FAF8F5;       /* Off-white - Backgrounds claros */

/* Cores de Apoio */
--accent-terracota: #B8695E;    /* Terracota escuro - Hover states */
--success-green: #8B9D83;       /* Verde sálvia - Confirmações */
--shadow: rgba(61, 57, 53, 0.08); /* Sombras suaves */
```

**Aplicação Estratégica:**
- **Backgrounds principais**: `--secondary-cream` e `--neutral-light` (alternados)
- **CTAs**: `--primary-rose` (hover: `--accent-terracota`)
- **Destaques/Ícones**: `--primary-gold`
- **Textos**: `--neutral-charcoal` (títulos), `--neutral-taupe` (corpo)

---

## 3. TIPOGRAFIA (Google Fonts)

### **Fonte para Títulos:**
```html
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;600;700&display=swap" rel="stylesheet">
```
- **Família**: Playfair Display
- **Pesos**: 500 (subtítulos), 600 (h2/h3), 700 (h1)
- **Uso**: Headlines, títulos de seção, nomes de serviços
- **Característica**: Serif elegante, transmite sofisticação

### **Fonte para Corpo de Texto:**
```html
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet">
```
- **Família**: Inter
- **Pesos**: 300 (legendas), 400 (corpo), 500 (destaque), 600 (botões)
- **Uso**: Parágrafos, descrições, CTAs, navegação
- **Característica**: Sans-serif moderna, excelente legibilidade

**Hierarquia Tipográfica:**
```css
h1: 3.5rem / 56px (Playfair Display 700)
h2: 2.5rem / 40px (Playfair Display 600)
h3: 1.75rem / 28px (Playfair Display 600)
p: 1.125rem / 18px (Inter 400)
small: 0.875rem / 14px (Inter 300)
button: 1rem / 16px (Inter 600)
```

---

## 4. PROPOSTA DE VALOR ÚNICA (PVU) + HEADLINE

### **Proposta de Valor Única:**
*"Desperte sua melhor versão através do cuidado personalizado que honra sua essência e transforma sua rotina em ritual de bem-estar"*

**Pilares de Diferenciação:**
1. **Atendimento Individualizado** - Protocolos personalizados para seu momento de vida
2. **Ambiente Acolhedor** - Espaço pensado para sua tranquilidade e privacidade
3. **Técnicas Integradas** - Combinamos tradição e inovação para resultados visíveis

---

### **HEADLINE PRINCIPAL (Hero Section):**

**H1 (Principal):**
```
Reconecte-se com Você em um Espaço 
Feito para o Seu Bem-Estar
```

**Subheadline:**
```
Massagens terapêuticas, tratamentos estéticos e maquiagem que 
realçam sua beleza natural. Agende seu momento de autocuidado.
```

---

### **Headlines Secundárias (Por Seção):**

**Proposta de Valor:**
```
Por Que Escolher Nosso Espaço?
```

**Serviços:**
```
Descubra o Tratamento Perfeito Para Você
```

**Depoimentos:**
```
O Que Nossas Clientes Dizem
```

**Sobre:**
```
Cuidado Profissional, Toque Humano
```

**Processo:**
```
Agendar é Simples e Rápido
```

**CTA Final:**
```
Reserve Agora Seu Horário Especial
```

---

## 5. TEXTOS DOS CTAs (Call-to-Actions)

### **CTA Primário (Hero + CTA Final):**
```
💬 Agendar pelo WhatsApp
```
**Link:** `https://wa.me/5511999998888?text=Olá!%20Gostaria%20de%20agendar%20um%20horário.%20Vim%20pelo%20site.`

---

### **CTA Secundário (Serviços):**
```
Quero Conhecer Este Serviço
```
**Link:** `https://wa.me/5511999998888?text=Olá!%20Tenho%20interesse%20no%20serviço%20de%20[NOME_SERVIÇO].%20Poderia%20me%20dar%20mais%20informações?`

---

### **CTA Terciário (Footer Fixo - Mobile):**
```
💬 Fale Conosco
```

---

### **Micro-copy de Apoio (abaixo dos CTAs principais):**
```
✓ Resposta em até 2 horas  |  ✓ Primeira consulta sem compromisso
```

---

## 6. STACK TÉCNICA DETALHADA

### **6.1 HTML5 SEMÂNTICO - Estrutura:**

```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <!-- Meta Tags Essenciais -->
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="Espaço de estética especializado em massagens, drenagem linfática e maquiagem. Agende seu momento de bem-estar.">
    <meta name="keywords" content="massagem relaxante, drenagem linfática, maquiagem social, estética, spa">
    
    <!-- Open Graph (Compartilhamento) -->
    <meta property="og:title" content="Espaço de Bem-Estar | Estética & Massagens">
    <meta property="og:description" content="Reconecte-se com você. Massagens terapêuticas e tratamentos estéticos personalizados.">
    <meta property="og:image" content="img/og-image.jpg">
    
    <!-- Favicon -->
    <link rel="icon" type="image/png" href="img/favicon.png">
    
    <!-- CSS -->
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <header><!-- Menu fixo --></header>
    <main>
        <section id="hero"><!-- Abertura --></section>
        <section id="valores"><!-- Proposta de Valor --></section>
        <section id="servicos"><!-- Serviços --></section>
        <section id="depoimentos"><!-- Prova Social --></section>
        <section id="sobre"><!-- Sobre --></section>
        <section id="processo"><!-- Como Agendar --></section>
        <section id="faq"><!-- Perguntas --></section>
        <section id="cta-final"><!-- Conversão Final --></section>
    </main>
    <footer><!-- Informações --></footer>
    
    <!-- WhatsApp Flutuante -->
    <a href="https://wa.me/5511999998888" class="whatsapp-float" aria-label="WhatsApp">
        <!-- Ícone SVG -->
    </a>
    
    <script src="script.js"></script>
</body>
</html>
```

---

### **6.2 CSS3 PURO - Estratégias:**

**Arquitetura CSS:**
```
styles.css
├── 1. CSS Reset & Variables
├── 2. Typography System
├── 3. Layout Grid (CSS Grid + Flexbox)
├── 4. Components
│   ├── Buttons
│   ├── Cards
│   ├── Forms
│   └── Accordion
├── 5. Sections (por ordem da página)
├── 6. Animations (@keyframes)
├── 7. Media Queries (Mobile First)
└── 8. Utilities
```

**Técnicas Específicas:**

1. **CSS Custom Properties (Variáveis):**
```css
:root {
    /* Cores */
    --primary-rose: #D4827B;
    
    /* Espaçamentos (Sistema 8px) */
    --spacing-xs: 0.5rem;    /* 8px */
    --spacing-sm: 1rem;      /* 16px */
    --spacing-md: 2rem;      /* 32px */
    --spacing-lg: 4rem;      /* 64px */
    --spacing-xl: 6rem;      /* 96px */
    
    /* Bordas */
    --radius-sm: 8px;
    --radius-md: 16px;
    --radius-lg: 24px;
    
    /* Sombras */
    --shadow-sm: 0 2px 8px var(--shadow);
    --shadow-md: 0 4px 16px var(--shadow);
    --shadow-lg: 0 8px 32px var(--shadow);
    
    /* Transições */
    --transition-fast: 0.2s ease;
    --transition-normal: 0.3s ease;
}
```

2. **Layout Responsivo (Mobile First):**
```css
/* Base: Mobile (<640px) */
.container {
    padding: 0 1.5rem;
    max-width: 100%;
}

/* Tablet (≥768px) */
@media (min-width: 48em) {
    .container { max-width: 720px; }
}

/* Desktop (≥1024px) */
@media (min-width: 64em) {
    .container { max-width: 960px; }
}

/* Large Desktop (≥1280px) */
@media (min-width: 80em) {
    .container { max-width: 1200px; }
}
```

3. **CSS Grid para Serviços:**
```css
.servicos-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 2rem;
}
```

4. **Animações Suaves:**
```css
@keyframes fadeInUp {
    from {
        opacity: 0;
        transform: translateY(30px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

.animate-on-scroll {
    opacity: 0;
    animation: fadeInUp 0.6s ease forwards;
}
```

---

### **6.3 JAVASCRIPT VANILLA - Funcionalidades:**

**Estrutura do script.js:**

```javascript
// 1. MENU STICKY & MOBILE
class NavigationController {
    constructor() {
        this.header = document.querySelector('header');
        this.menuToggle = document.querySelector('.menu-toggle');
        this.init();
    }
    
    init() {
        this.handleScroll();
        this.handleMobileMenu();
    }
    
    handleScroll() {
        let lastScroll = 0;
        window.addEventListener('scroll', () => {
            const currentScroll = window.pageYOffset;
            
            // Adiciona sombra no menu após scroll
            if (currentScroll > 100) {
                this.header.classList.add('scrolled');
            } else {
                this.header.classList.remove('scrolled');
            }
            
            lastScroll = currentScroll;
        });
    }
    
    handleMobileMenu() {
        this.menuToggle?.addEventListener('click', () => {
            document.body.classList.toggle('menu-open');
        });
    }
}

// 2. ACCORDION FAQ
class AccordionController {
    constructor() {
        this.accordions = document.querySelectorAll('.accordion-item');
        this.init();
    }
    
    init() {
        this.accordions.forEach(item => {
            const trigger = item.querySelector('.accordion-trigger');
            trigger.addEventListener('click', () => this.toggle(item));
        });
    }
    
    toggle(item) {
        const isActive = item.classList.contains('active');
        
        // Fecha todos
        this.accordions.forEach(acc => acc.classList.remove('active'));
        
        // Abre o clicado (se não estava ativo)
        if (!isActive) {
            item.classList.add('active');
        }
    }
}

// 3. ANIMAÇÃO DE ENTRADA (Intersection Observer)
class ScrollAnimationController {
    constructor() {
        this.elements = document.querySelectorAll('[data-animate]');
        this.init();
    }
    
    init() {
        const options = {
            threshold: 0.15,
            rootMargin: '0px 0px -100px 0px'
        };
        
        const observer = new In