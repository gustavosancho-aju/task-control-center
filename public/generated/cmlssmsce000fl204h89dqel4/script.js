'use strict';

(function() {
  // ============================================================================
  // UTILITIES
  // ============================================================================
  
  const throttle = (func, delay) => {
    let lastCall = 0;
    return function(...args) {
      const now = new Date().getTime();
      if (now - lastCall < delay) return;
      lastCall = now;
      return func(...args);
    };
  };

  const debounce = (func, delay) => {
    let timeoutId;
    return function(...args) {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
  };

  const easeOutQuart = (t) => 1 - Math.pow(1 - t, 4);

  const isMobile = () => window.innerWidth < 768;

  // ============================================================================
  // INTERSECTION OBSERVER - FADE IN ANIMATIONS
  // ============================================================================
  
  const initAnimateOnScroll = () => {
    const elements = document.querySelectorAll('[data-animate]');
    if (!elements.length) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const delay = entry.target.getAttribute('data-delay') || 0;
          setTimeout(() => {
            entry.target.classList.add('animate-in');
          }, parseInt(delay));
          observer.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    });

    elements.forEach(el => observer.observe(el));
  };

  // ============================================================================
  // SMART NAVIGATION
  // ============================================================================
  
  const initSmartNav = () => {
    const nav = document.querySelector('.nav');
    const navLinks = document.querySelectorAll('.nav__link');
    const sections = document.querySelectorAll('section[id]');
    
    if (!nav) return;

    // Scroll effect
    const handleScroll = throttle(() => {
      if (window.scrollY > 80) {
        nav.classList.add('scrolled');
      } else {
        nav.classList.remove('scrolled');
      }

      // Active section detection
      let current = '';
      sections.forEach(section => {
        const sectionTop = section.offsetTop;
        const sectionHeight = section.clientHeight;
        if (window.scrollY >= sectionTop - 100) {
          current = section.getAttribute('id');
        }
      });

      navLinks.forEach(link => {
        link.removeAttribute('aria-current');
        if (link.getAttribute('href') === `#${current}`) {
          link.setAttribute('aria-current', 'page');
        }
      });
    }, 100);

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
  };

  // ============================================================================
  // MOBILE MENU
  // ============================================================================
  
  const initMobileMenu = () => {
    const hamburger = document.querySelector('.hamburger');
    const mobileMenu = document.querySelector('.mobile-menu');
    const overlay = document.querySelector('.mobile-menu__overlay');
    const mobileLinks = document.querySelectorAll('.mobile-menu__link');
    
    if (!hamburger || !mobileMenu) return;

    const openMenu = () => {
      hamburger.classList.add('active');
      mobileMenu.classList.add('active');
      document.body.style.overflow = 'hidden';
      hamburger.setAttribute('aria-expanded', 'true');
    };

    const closeMenu = () => {
      hamburger.classList.remove('active');
      mobileMenu.classList.remove('active');
      document.body.style.overflow = '';
      hamburger.setAttribute('aria-expanded', 'false');
    };

    hamburger.addEventListener('click', () => {
      if (hamburger.classList.contains('active')) {
        closeMenu();
      } else {
        openMenu();
      }
    });

    if (overlay) {
      overlay.addEventListener('click', closeMenu);
    }

    mobileLinks.forEach(link => {
      link.addEventListener('click', closeMenu);
    });

    // Close with Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && mobileMenu.classList.contains('active')) {
        closeMenu();
      }
    });
  };

  // ============================================================================
  // ANIMATED COUNTERS
  // ============================================================================
  
  const initCounters = () => {
    const counters = document.querySelectorAll('[data-count]');
    if (!counters.length) return;

    const animateCounter = (element) => {
      const target = parseInt(element.getAttribute('data-count'));
      const duration = 2000;
      const startTime = performance.now();
      
      const updateCounter = (currentTime) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easedProgress = easeOutQuart(progress);
        const current = Math.floor(easedProgress * target);
        
        element.textContent = current.toLocaleString('pt-BR');
        
        if (progress < 1) {
          requestAnimationFrame(updateCounter);
        } else {
          element.textContent = target.toLocaleString('pt-BR');
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

  // ============================================================================
  // WHATSAPP BUTTON
  // ============================================================================
  
  const initWhatsAppButton = () => {
    const whatsappBtn = document.querySelector('.whatsapp-btn');
    if (!whatsappBtn) return;

    setTimeout(() => {
      whatsappBtn.classList.add('show');
    }, 3000);
  };

  // ============================================================================
  // FORM WITH FLOATING LABELS
  // ============================================================================
  
  const initForm = () => {
    const form = document.querySelector('.contact-form');
    if (!form) return;

    // Floating labels
    const inputs = form.querySelectorAll('.form__input');
    
    inputs.forEach(input => {
      const handleInputState = () => {
        const wrapper = input.closest('.form__group');
        if (input.value.trim() !== '' || document.activeElement === input) {
          wrapper.classList.add('has-value');
        } else {
          wrapper.classList.remove('has-value');
        }
      };

      input.addEventListener('focus', handleInputState);
      input.addEventListener('blur', handleInputState);
      input.addEventListener('input', handleInputState);
      
      // Initial check
      if (input.value.trim() !== '') {
        input.closest('.form__group').classList.add('has-value');
      }
    });

    // Phone mask
    const phoneInput = form.querySelector('input[type="tel"]');
    if (phoneInput) {
      phoneInput.addEventListener('input', (e) => {
        let value = e.target.value.replace(/\D/g, '');
        
        if (value.length > 11) {
          value = value.slice(0, 11);
        }
        
        if (value.length > 6) {
          value = value.replace(/^(\d{2})(\d{5})(\d{0,4}).*/, '($1) $2-$3');
        } else if (value.length > 2) {
          value = value.replace(/^(\d{2})(\d{0,5})/, '($1) $2');
        } else if (value.length > 0) {
          value = value.replace(/^(\d*)/, '($1');
        }
        
        e.target.value = value;
      });
    }

    // Validation on blur
    const validateField = (field) => {
      const wrapper = field.closest('.form__group');
      let isValid = true;
      let errorMessage = '';

      if (field.hasAttribute('required') && field.value.trim() === '') {
        isValid = false;
        errorMessage = 'Este campo é obrigatório';
      } else if (field.type === 'email' && field.value.trim() !== '') {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(field.value)) {
          isValid = false;
          errorMessage = 'Email inválido';
        }
      } else if (field.type === 'tel' && field.value.trim() !== '') {
        const phoneRegex = /^\(\d{2}\) \d{5}-\d{4}$/;
        if (!phoneRegex.test(field.value)) {
          isValid = false;
          errorMessage = 'Telefone inválido';
        }
      }

      // Remove previous error
      const existingError = wrapper.querySelector('.form__error');
      if (existingError) {
        existingError.remove();
      }

      if (!isValid) {
        wrapper.classList.add('has-error');
        const errorEl = document.createElement('span');
        errorEl.className = 'form__error';
        errorEl.textContent = errorMessage;
        wrapper.appendChild(errorEl);
      } else {
        wrapper.classList.remove('has-error');
      }

      return isValid;
    };

    inputs.forEach(input => {
      input.addEventListener('blur', () => validateField(input));
    });

    // Form submission
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      // Validate all fields
      let isFormValid = true;
      inputs.forEach(input => {
        if (!validateField(input)) {
          isFormValid = false;
        }
      });

      if (!isFormValid) return;

      const submitBtn = form.querySelector('.form__submit');
      const originalText = submitBtn.textContent;
      
      // Loading state
      submitBtn.disabled = true;
      submitBtn.classList.add('loading');
      submitBtn.textContent = 'Enviando...';

      try {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Success state
        submitBtn.textContent = '✓ Enviado!';
        form.reset();
        
        // Reset floating labels
        inputs.forEach(input => {
          input.closest('.form__group').classList.remove('has-value');
        });
        
        setTimeout(() => {
          submitBtn.disabled = false;
          submitBtn.classList.remove('loading');
          submitBtn.textContent = originalText;
        }, 3000);
        
      } catch (error) {
        // Error state
        submitBtn.textContent = '✗ Erro. Tente novamente';
        submitBtn.classList.add('error');
        
        setTimeout(() => {
          submitBtn.disabled = false;
          submitBtn.classList.remove('loading', 'error');
          submitBtn.textContent = originalText;
        }, 3000);
      }
    });
  };

  // ============================================================================
  // FAQ ACCORDION
  // ============================================================================
  
  const initFAQ = () => {
    const faqItems = document.querySelectorAll('.faq__item');
    if (!faqItems.length) return;

    faqItems.forEach(item => {
      const question = item.querySelector('.faq__question');
      const answer = item.querySelector('.faq__answer');
      
      if (!question || !answer) return;

      question.addEventListener('click', () => {
        const isOpen = item.classList.contains('active');
        
        // Close all items
        faqItems.forEach(otherItem => {
          otherItem.classList.remove('active');
          const otherAnswer = otherItem.querySelector('.faq__answer');
          if (otherAnswer) {
            otherAnswer.style.maxHeight = null;
          }
          const otherQuestion = otherItem.querySelector('.faq__question');
          if (otherQuestion) {
            otherQuestion.setAttribute('aria-expanded', 'false');
          }
        });

        // Toggle current item
        if (!isOpen) {
          item.classList.add('active');
          answer.style.maxHeight = answer.scrollHeight + 'px';
          question.setAttribute('aria-expanded', 'true');
        }
      });
    });
  };

  // ============================================================================
  // SMOOTH SCROLL
  // ============================================================================
  
  const initSmoothScroll = () => {
    const links = document.querySelectorAll('a[href^="#"]');
    
    links.forEach(link => {
      link.addEventListener('click', (e) => {
        const href = link.getAttribute('href');
        if (href === '#' || href === '') return;
        
        const target = document.querySelector(href);
        if (!target) return;
        
        e.preventDefault();
        
        const navHeight = document.querySelector('.nav')?.offsetHeight || 0;
        const targetPosition = target.offsetTop - navHeight;
        
        window.scrollTo({
          top: targetPosition,
          behavior: 'smooth'
        });
      });
    });
  };

  // ============================================================================
  // PARALLAX EFFECT
  // ============================================================================
  
  const initParallax = () => {
    if (isMobile()) return;

    const hero = document.querySelector('.hero');
    const heroBlob = document.querySelector('.hero__blob');
    const heroBackground = document.querySelector('.hero__background');
    
    if (!hero) return;

    let ticking = false;
    let scrollY = window.scrollY;

    const updateParallax = () => {
      const heroHeight = hero.offsetHeight;
      const scrollProgress = Math.min(scrollY / heroHeight, 1);
      
      if (heroBlob) {
        const blobTransform = scrollProgress * 50;
        heroBlob.style.transform = `translate(-50%, calc(-50% + ${blobTransform}px))`;
      }
      
      if (heroBackground) {
        const bgTransform = scrollProgress * 30;
        heroBackground.style.transform = `translateY(${bgTransform}px)`;
      }
      
      ticking = false;
    };

    const requestTick = () => {
      if (!ticking) {
        requestAnimationFrame(updateParallax);
        ticking = true;
      }
    };

    const handleScroll = () => {
      scrollY = window.scrollY;
      requestTick();
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    updateParallax();
  };

  // ============================================================================
  // INITIALIZE ALL
  // ============================================================================
  
  const init = () => {
    initAnimateOnScroll();
    initSmartNav();
    initMobileMenu();
    initCounters();
    initWhatsAppButton();
    initForm();
    initFAQ();
    initSmoothScroll();
    initParallax();
  };

  // Start when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();