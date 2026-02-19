/**
 * ═══════════════════════════════════════════════════════════════
 * PIXEL AESTHETICS - Sistema de Interações Premium
 * JavaScript Vanilla ES2022+ | Zero Dependências
 * ═══════════════════════════════════════════════════════════════
 */

(function() {
  'use strict';

  // ═══════════════════════════════════════════════════════════════
  // UTILITÁRIOS
  // ═══════════════════════════════════════════════════════════════

  const throttle = (fn, delay) => {
    let lastCall = 0;
    return function(...args) {
      const now = new Date().getTime();
      if (now - lastCall < delay) return;
      lastCall = now;
      return fn(...args);
    };
  };

  const debounce = (fn, delay) => {
    let timeoutId;
    return function(...args) {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => fn.apply(this, args), delay);
    };
  };

  const lerp = (start, end, factor) => {
    return start + (end - start) * factor;
  };

  const easeOutQuart = (t) => {
    return 1 - Math.pow(1 - t, 4);
  };

  const isTouchDevice = () => {
    return (('ontouchstart' in window) ||
      (navigator.maxTouchPoints > 0) ||
      (navigator.msMaxTouchPoints > 0));
  };

  // ═══════════════════════════════════════════════════════════════
  // 1. SISTEMA DE ANIMAÇÕES DE ENTRADA
  // ═══════════════════════════════════════════════════════════════

  const initScrollAnimations = () => {
    const animatedElements = document.querySelectorAll('[data-animate]');
    
    if (!animatedElements.length) return;

    const observerOptions = {
      threshold: 0.12,
      rootMargin: '0px 0px -60px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const element = entry.target;
          const delay = element.dataset.delay || 0;

          setTimeout(() => {
            element.classList.add('is-visible');
          }, delay);

          // Performance: desconecta após animar
          observer.unobserve(element);
        }
      });
    }, observerOptions);

    animatedElements.forEach(el => observer.observe(el));
  };

  // ═══════════════════════════════════════════════════════════════
  // 2. NAVEGAÇÃO INTELIGENTE
  // ═══════════════════════════════════════════════════════════════

  const initNavigation = () => {
    const header = document.querySelector('.header');
    const navLinks = document.querySelectorAll('.nav__link[href^="#"]');
    const sections = document.querySelectorAll('section[id]');

    if (!header) return;

    // Adiciona classe .scrolled no header
    const handleScroll = throttle(() => {
      if (window.scrollY > 80) {
        header.classList.add('scrolled');
      } else {
        header.classList.remove('scrolled');
      }
    }, 100);

    window.addEventListener('scroll', handleScroll);

    // Observer para highlight do link ativo
    const navHeight = header.offsetHeight;
    
    const sectionObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const sectionId = entry.target.getAttribute('id');
          
          navLinks.forEach(link => {
            const href = link.getAttribute('href');
            
            if (href === `#${sectionId}`) {
              // Remove active de todos
              navLinks.forEach(l => {
                l.classList.remove('active');
                l.removeAttribute('aria-current');
              });
              
              // Adiciona ao atual
              link.classList.add('active');
              link.setAttribute('aria-current', 'page');
            }
          });
        }
      });
    }, {
      threshold: 0.3,
      rootMargin: `-${navHeight}px 0px -60% 0px`
    });

    sections.forEach(section => sectionObserver.observe(section));

    // Scroll suave ao clicar
    navLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        
        const targetId = link.getAttribute('href').substring(1);
        const targetSection = document.getElementById(targetId);
        
        if (targetSection) {
          const offsetTop = targetSection.offsetTop - navHeight;
          
          window.scrollTo({
            top: offsetTop,
            behavior: 'smooth'
          });
        }
      });
    });
  };

  // ═══════════════════════════════════════════════════════════════
  // 3. MENU MOBILE (DRAWER)
  // ═══════════════════════════════════════════════════════════════

  const initMobileMenu = () => {
    const hamburger = document.querySelector('.nav__hamburger');
    const mobileMenu = document.querySelector('.nav__mobile');
    const overlay = document.querySelector('.nav__overlay');
    const mobileLinks = document.querySelectorAll('.nav__mobile .nav__link');
    const body = document.body;

    if (!hamburger || !mobileMenu || !overlay) return;

    const openMenu = () => {
      hamburger.classList.add('is-active');
      hamburger.setAttribute('aria-expanded', 'true');
      mobileMenu.classList.add('is-open');
      mobileMenu.setAttribute('aria-hidden', 'false');
      overlay.classList.add('is-visible');
      body.style.overflow = 'hidden';
    };

    const closeMenu = () => {
      hamburger.classList.remove('is-active');
      hamburger.setAttribute('aria-expanded', 'false');
      mobileMenu.classList.remove('is-open');
      mobileMenu.setAttribute('aria-hidden', 'true');
      overlay.classList.remove('is-visible');
      body.style.overflow = '';
    };

    hamburger.addEventListener('click', () => {
      if (mobileMenu.classList.contains('is-open')) {
        closeMenu();
      } else {
        openMenu();
      }
    });

    overlay.addEventListener('click', closeMenu);

    mobileLinks.forEach(link => {
      link.addEventListener('click', closeMenu);
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && mobileMenu.classList.contains('is-open')) {
        closeMenu();
      }
    });
  };

  // ═══════════════════════════════════════════════════════════════
  // 4. CONTADOR ANIMADO
  // ═══════════════════════════════════════════════════════════════

  const initCounters = () => {
    const counters = document.querySelectorAll('[data-target]');
    
    if (!counters.length) return;

    const animateCounter = (element) => {
      const target = parseFloat(element.dataset.target);
      const duration = 2000;
      const startTime = performance.now();
      const isDecimal = target % 1 !== 0;
      const hasPlus = target >= 1000;

      const updateCounter = (currentTime) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easedProgress = easeOutQuart(progress);
        const current = easedProgress * target;

        let formattedValue;
        if (isDecimal) {
          formattedValue = current.toFixed(1);
        } else {
          formattedValue = Math.floor(current).toString();
        }

        if (hasPlus && progress === 1) {
          formattedValue += '+';
        }

        element.textContent = formattedValue;

        if (progress < 1) {
          requestAnimationFrame(updateCounter);
        }
      };

      requestAnimationFrame(updateCounter);
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          animateCounter(entry.target);
          observer.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.5
    });

    counters.forEach(counter => observer.observe(counter));
  };

  // ═══════════════════════════════════════════════════════════════
  // 5. BOTÃO WHATSAPP FLUTUANTE
  // ═══════════════════════════════════════════════════════════════

  const initWhatsAppButton = () => {
    const whatsappBtn = document.querySelector('.whatsapp-float');
    const tooltip = whatsappBtn?.querySelector('.whatsapp-float__tooltip');

    if (!whatsappBtn) return;

    // Aparece após 3s
    setTimeout(() => {
      whatsappBtn.classList.add('visible');
    }, 3000);

    // Tooltip no hover
    whatsappBtn.addEventListener('mouseenter', () => {
      if (tooltip) tooltip.classList.add('visible');
    });

    whatsappBtn.addEventListener('mouseleave', () => {
      if (tooltip) tooltip.classList.remove('visible');
    });

    // Tracking de clique (preparado para analytics)
    whatsappBtn.addEventListener('click', () => {
      console.log('WhatsApp Click - Ready for analytics integration');
      // window.gtag?.('event', 'whatsapp_click', { event_category: 'engagement' });
    });
  };

  // ═══════════════════════════════════════════════════════════════
  // 6. FORMULÁRIO COM UX PREMIUM
  // ═══════════════════════════════════════════════════════════════

  const initForm = () => {
    const form = document.querySelector('.contact__form');
    if (!form) return;

    const formFields = form.querySelectorAll('.form-field');
    const phoneInput = form.querySelector('input[type="tel"]');
    const submitBtn = form.querySelector('.btn--submit');

    // ─────────────────────────────────────────────────────────────
    // a) Floating Labels
    // ─────────────────────────────────────────────────────────────

    const initFloatingLabels = () => {
      formFields.forEach(field => {
        const input = field.querySelector('.form-field__input');
        if (!input) return;

        const updateFieldState = () => {
          if (input.value.trim() !== '') {
            field.classList.add('has-value');
          } else {
            field.classList.remove('has-value');
          }
        };

        input.addEventListener('focus', () => {
          field.classList.add('has-value');
        });

        input.addEventListener('blur', () => {
          updateFieldState();
        });

        // Check inicial
        updateFieldState();
      });
    };

    // ─────────────────────────────────────────────────────────────
    // b) Máscara de Telefone
    // ─────────────────────────────────────────────────────────────

    const maskPhone = (value) => {
      const numbers = value.replace(/\D/g, '');
      const limited = numbers.substring(0, 11);
      
      if (limited.length <= 10) {
        return limited.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
      } else {
        return limited.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3');
      }
    };

    if (phoneInput) {
      phoneInput.addEventListener('input', (e) => {
        e.target.value = maskPhone(e.target.value);
      });
    }

    // ─────────────────────────────────────────────────────────────
    // c) Validação em Tempo Real
    // ─────────────────────────────────────────────────────────────

    const showError = (field, message) => {
      clearError(field);
      
      const errorElement = document.createElement('div');
      errorElement.className = 'form-field__error';
      errorElement.textContent = message;
      errorElement.style.animation = 'fadeIn 0.3s ease';
      
      field.appendChild(errorElement);
      field.classList.add('has-error');
    };

    const clearError = (field) => {
      const existingError = field.querySelector('.form-field__error');
      if (existingError) {
        existingError.remove();
      }
      field.classList.remove('has-error');
    };

    const validateField = (field) => {
      const input = field.querySelector('.form-field__input');
      if (!input) return true;

      const value = input.value.trim();
      const fieldName = input.getAttribute('name');
      const isRequired = input.hasAttribute('required');

      clearError(field);

      // Required validation
      if (isRequired && value === '') {
        showError(field, 'Este campo é obrigatório');
        return false;
      }

      // Phone validation
      if (fieldName === 'phone' && value !== '') {
        const numbers = value.replace(/\D/g, '');
        if (numbers.length < 10) {
          showError(field, 'Telefone incompleto');
          return false;
        }
      }

      // Email validation
      if (input.type === 'email' && value !== '') {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          showError(field, 'E-mail inválido');
          return false;
        }
      }

      return true;
    };

    // Validação no blur
    formFields.forEach(field => {
      const input = field.querySelector('.form-field__input');
      if (input) {
        input.addEventListener('blur', () => {
          validateField(field);
        });
      }
    });

    // ─────────────────────────────────────────────────────────────
    // d) Submit com Loading State
    // ─────────────────────────────────────────────────────────────

    const showSuccessMessage = () => {
      const successHTML = `
        <div class="form-success" style="animation: fadeIn 0.5s ease">
          <svg class="form-success__icon" width="64" height="64" viewBox="0 0 64 64" fill="none">
            <circle cx="32" cy="32" r="32" fill="#C4A572" opacity="0.1"/>
            <path d="M20 32L28 40L44 24" stroke="#C4A572" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <h3 class="form-success__title">Mensagem enviada!</h3>
          <p class="form-success__text">Em breve entraremos em contato 💕</p>
        </div>
      `;
      
      form.innerHTML = successHTML;
    };

    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      // Valida todos os campos
      let isValid = true;
      formFields.forEach(field => {
        if (!validateField(field)) {
          isValid = false;
        }
      });

      if (!isValid) return;

      // Loading state
      submitBtn.disabled = true;
      submitBtn.classList.add('is-loading');
      const originalText = submitBtn.textContent;
      submitBtn.innerHTML = '<span class="btn__spinner"></span> Enviando...';

      // Simula envio
      setTimeout(() => {
        showSuccessMessage();
        
        // Tracking (preparado para analytics)
        console.log('Form submitted successfully - Ready for analytics');
        // window.gtag?.('event', 'form_submit', { event_category: 'engagement' });
      }, 1500);
    });

    // Inicializa floating labels
    initFloatingLabels();
  };

  // ═══════════════════════════════════════════════════════════════
  // 7. ACCORDION FAQ
  // ═══════════════════════════════════════════════════════════════

  const initAccordion = () => {
    const accordionItems = document.querySelectorAll('.accordion__item');
    
    if (!accordionItems.length) return;

    accordionItems.forEach(item => {
      const header = item.querySelector('.accordion__header');
      const content = item.querySelector('.accordion__content');
      const button = item.querySelector('.accordion__button');

      if (!header || !content || !button) return;

      header.addEventListener('click', () => {
        const isOpen = item.classList.contains('is-open');

        // Fecha todos os outros
        accordionItems.forEach(otherItem => {
          if (otherItem !== item) {
            otherItem.classList.remove('is-open');
            const otherContent = otherItem.querySelector('.accordion__content');
            const otherButton = otherItem.querySelector('.accordion__button');
            
            if (otherContent) {
              otherContent.style.maxHeight = null;
              otherContent.setAttribute('aria-hidden', 'true');
            }
            if (otherButton) {
              otherButton.setAttribute('aria-expanded', 'false');
            }
          }
        });

        // Toggle atual
        if (!isOpen) {
          item.classList.add('is-open');
          content.style.maxHeight = content.scrollHeight + 'px';
          content.setAttribute('aria-hidden', 'false');
          button.setAttribute('aria-expanded', 'true');
        } else {
          item.classList.remove('is-open');
          content.style.maxHeight = null;
          content.setAttribute('aria-hidden', 'true');
          button.setAttribute('aria-expanded', 'false');
        }
      });
    });
  };

  // ═══════════════════════════════════════════════════════════════
  // 8. PARALLAX SUTIL NO HERO
  // ═══════════════════════════════════════════════════════════════

  const initHeroParallax = () => {
    const heroBlob = document.querySelector('.hero__blob');
    const heroBackground = document.querySelector('.hero__background');
    
    if (!heroBlob && !heroBackground) return;
    if (window.innerWidth < 768) return; // Desativa em mobile

    let ticking = false;

    const updateParallax = () => {
      const scrollY = window.scrollY;

      if (heroBlob) {
        heroBlob.style.transform = `translateY(${scrollY * 0.15}px)`;
      }

      if (heroBackground) {
        heroBackground.style.transform = `translateY(${scrollY * 0.3}px)`;
      }

      ticking = false;
    };

    const requestTick = () => {
      if (!ticking) {
        requestAnimationFrame(updateParallax);
        ticking = true;
      }
    };

    window.addEventListener('scroll', requestTick);

    // Desativa em resize para mobile
    const handleResize = debounce(() => {
      if (window.innerWidth < 768) {
        if (heroBlob) heroBlob.style.transform = '';
        if (heroBackground) heroBackground.style.transform = '';
        window.removeEventListener('scroll', requestTick);
      }
    }, 250);

    window.addEventListener('resize', handleResize);
  };

  // ═══════════════════════════════════════════════════════════════
  // 9. EFEITO CURSOR GLOW (desktop)
  // ═══════════════════════════════════════════════════════════════

  const initCursorGlow = () => {
    if (isTouchDevice()) return;
    if (window.innerWidth < 768) return;

    const cursorGlow = document.createElement('div');
    cursorGlow.className = 'cursor-glow';
    cursorGlow.style.cssText = `
      position: fixed;
      width: 600px;
      height: 600px;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(196, 165, 114, 0.06) 0%, transparent 70%);
      pointer-events: none;
      z-index: 9999;
      transform: translate(-50%, -50%);
      transition: opacity 0.3s ease;
      opacity: 0;
    `;
    document.body.appendChild(cursorGlow);

    let currentX = 0;
    let currentY = 0;
    let targetX = 0;
    let targetY = 0;

    const updateCursor = () => {
      currentX = lerp(currentX, targetX, 0.1);
      currentY = lerp(currentY, targetY, 0.1);

      cursorGlow.style.left = `${currentX}px`;
      cursorGlow.style.top = `${currentY}px`;

      requestAnimationFrame(updateCursor);
    };

    document.addEventListener('mousemove', (e) => {
      targetX = e.clientX;
      targetY = e.clientY;
      cursorGlow.style.opacity = '1';
    });

    document.addEventListener('mouseleave', () => {
      cursorGlow.style.opacity = '0';
    });

    updateCursor();
  };

  // ═══════════════════════════════════════════════════════════════
  // 10. REVEAL DE CARDS COM STAGGER
  // ═══════════════════════════════════════════════════════════════

  const initCardReveal = () => {
    const serviceCards = document.querySelectorAll('.service-card');
    const testimonialCards = document.querySelectorAll('.testimonial-card');
    const allCards = [...serviceCards, ...testimonialCards];

    if (!allCards.length) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry, index) => {
        if (entry.isIntersecting) {
          const card = entry.target;
          const delay = index * 100;
          
          card.style.transitionDelay = `${delay}ms`;
          
          setTimeout(() => {
            card.classList.add('is-visible');
          }, 50);

          observer.unobserve(card);
        }
      });
    }, {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    });

    allCards.forEach(card => observer.observe(card));
  };

  // ═══════════════════════════════════════════════════════════════
  // INICIALIZAÇÃO GLOBAL
  // ═══════════════════════════════════════════════════════════════

  const init = () => {
    // Aguarda DOM estar pronto
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
      return;
    }

    // Inicializa todos os módulos
    initScrollAnimations();
    initNavigation();
    initMobileMenu();
    initCounters();
    initWhatsAppButton();
    initForm();
    initAccordion();
    initHeroParallax();
    initCursorGlow();
    initCardReveal();

    // Log de inicialização (dev)
    console.log('%c🎨 PIXEL AESTHETICS', 'color: #C4A572; font-size: 16px; font-weight: bold;');
    console.log('%cSistema de interações carregado', 'color: #666; font-size: 12px;');
  };

  // Inicializa
  init();

})();