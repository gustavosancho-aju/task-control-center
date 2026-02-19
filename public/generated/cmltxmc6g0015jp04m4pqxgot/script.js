'use strict';

document.addEventListener('DOMContentLoaded', () => {
  // ============================================================================
  // UTILITY FUNCTIONS
  // ============================================================================

  function throttle(func, delay) {
    let lastCall = 0;
    return function (...args) {
      const now = new Date().getTime();
      if (now - lastCall < delay) return;
      lastCall = now;
      return func(...args);
    };
  }

  function debounce(func, delay) {
    let timeoutId;
    return function (...args) {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
  }

  function easeOutQuart(t) {
    return 1 - Math.pow(1 - t, 4);
  }

  function isMobile() {
    return window.innerWidth <= 768;
  }

  // ============================================================================
  // 1. INTERSECTION OBSERVER - FADE IN ANIMATIONS
  // ============================================================================

  const animatedElements = document.querySelectorAll('[data-animate]');

  if (animatedElements.length > 0) {
    const observerOptions = {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const delay = entry.target.dataset.delay || 0;
          setTimeout(() => {
            entry.target.classList.add('animate-in');
          }, delay);
          observer.unobserve(entry.target);
        }
      });
    }, observerOptions);

    animatedElements.forEach(el => observer.observe(el));
  }

  // ============================================================================
  // 2. SMART NAVIGATION
  // ============================================================================

  const nav = document.querySelector('nav');
  const navLinks = document.querySelectorAll('nav a[href^="#"]');

  function handleNavScroll() {
    if (window.scrollY > 80) {
      nav?.classList.add('scrolled');
    } else {
      nav?.classList.remove('scrolled');
    }
  }

  function updateActiveLink() {
    const sections = document.querySelectorAll('section[id]');
    const scrollPos = window.scrollY + 100;

    sections.forEach(section => {
      const sectionTop = section.offsetTop;
      const sectionHeight = section.offsetHeight;
      const sectionId = section.getAttribute('id');

      if (scrollPos >= sectionTop && scrollPos < sectionTop + sectionHeight) {
        navLinks.forEach(link => {
          link.removeAttribute('aria-current');
          if (link.getAttribute('href') === `#${sectionId}`) {
            link.setAttribute('aria-current', 'page');
          }
        });
      }
    });
  }

  window.addEventListener('scroll', throttle(() => {
    handleNavScroll();
    updateActiveLink();
  }, 100), { passive: true });

  handleNavScroll();
  updateActiveLink();

  // ============================================================================
  // 3. MOBILE MENU
  // ============================================================================

  const hamburger = document.querySelector('.hamburger');
  const mobileMenu = document.querySelector('.mobile-menu');
  const overlay = document.querySelector('.menu-overlay');
  const mobileLinks = document.querySelectorAll('.mobile-menu a');

  function openMenu() {
    hamburger?.classList.add('active');
    mobileMenu?.classList.add('active');
    overlay?.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeMenu() {
    hamburger?.classList.remove('active');
    mobileMenu?.classList.remove('active');
    overlay?.classList.remove('active');
    document.body.style.overflow = '';
  }

  hamburger?.addEventListener('click', () => {
    if (hamburger.classList.contains('active')) {
      closeMenu();
    } else {
      openMenu();
    }
  });

  overlay?.addEventListener('click', closeMenu);

  mobileLinks.forEach(link => {
    link.addEventListener('click', () => {
      closeMenu();
    });
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && mobileMenu?.classList.contains('active')) {
      closeMenu();
    }
  });

  // ============================================================================
  // 4. ANIMATED COUNTERS
  // ============================================================================

  const counters = document.querySelectorAll('[data-count]');

  function animateCounter(element) {
    const target = parseInt(element.dataset.count);
    const duration = 2000;
    const startTime = performance.now();

    function update(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easeOutQuart(progress);
      const current = Math.floor(easedProgress * target);

      element.textContent = current.toLocaleString('pt-BR');

      if (progress < 1) {
        requestAnimationFrame(update);
      } else {
        element.textContent = target.toLocaleString('pt-BR');
      }
    }

    requestAnimationFrame(update);
  }

  if (counters.length > 0) {
    const counterObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          animateCounter(entry.target);
          counterObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.5 });

    counters.forEach(counter => counterObserver.observe(counter));
  }

  // ============================================================================
  // 5. WHATSAPP BUTTON
  // ============================================================================

  const whatsappBtn = document.querySelector('.whatsapp-float');

  if (whatsappBtn) {
    setTimeout(() => {
      whatsappBtn.classList.add('show');
    }, 3000);
  }

  // ============================================================================
  // 6. FORM HANDLING
  // ============================================================================

  const form = document.querySelector('form');
  const formInputs = document.querySelectorAll('form input, form textarea');
  const phoneInput = document.querySelector('input[type="tel"]');
  const submitBtn = document.querySelector('form button[type="submit"]');

  // Floating Labels
  function handleFloatingLabel(input) {
    const label = input.previousElementSibling;
    if (!label || label.tagName !== 'LABEL') return;

    if (input.value || document.activeElement === input) {
      label.classList.add('active');
    } else {
      label.classList.remove('active');
    }
  }

  formInputs.forEach(input => {
    input.addEventListener('focus', () => handleFloatingLabel(input));
    input.addEventListener('blur', () => handleFloatingLabel(input));
    input.addEventListener('input', () => handleFloatingLabel(input));
    handleFloatingLabel(input);
  });

  // Phone Mask
  if (phoneInput) {
    phoneInput.addEventListener('input', (e) => {
      let value = e.target.value.replace(/\D/g, '');
      
      if (value.length <= 11) {
        value = value.replace(/^(\d{2})(\d)/g, '($1) $2');
        value = value.replace(/(\d)(\d{4})$/, '$1-$2');
      } else {
        value = value.slice(0, 11);
        value = value.replace(/^(\d{2})(\d)/g, '($1) $2');
        value = value.replace(/(\d)(\d{4})$/, '$1-$2');
      }
      
      e.target.value = value;
    });
  }

  // Validation
  function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  }

  function validateField(input) {
    const formGroup = input.closest('.form-group');
    if (!formGroup) return true;

    let isValid = true;
    let errorMsg = '';

    if (input.hasAttribute('required') && !input.value.trim()) {
      isValid = false;
      errorMsg = 'Este campo é obrigatório';
    } else if (input.type === 'email' && input.value && !validateEmail(input.value)) {
      isValid = false;
      errorMsg = 'Digite um e-mail válido';
    } else if (input.type === 'tel' && input.value) {
      const digitsOnly = input.value.replace(/\D/g, '');
      if (digitsOnly.length < 10) {
        isValid = false;
        errorMsg = 'Digite um telefone válido';
      }
    }

    let errorElement = formGroup.querySelector('.error-message');
    
    if (!isValid) {
      input.classList.add('error');
      if (!errorElement) {
        errorElement = document.createElement('span');
        errorElement.className = 'error-message';
        formGroup.appendChild(errorElement);
      }
      errorElement.textContent = errorMsg;
    } else {
      input.classList.remove('error');
      if (errorElement) {
        errorElement.remove();
      }
    }

    return isValid;
  }

  formInputs.forEach(input => {
    input.addEventListener('blur', () => validateField(input));
  });

  // Form Submit
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      let isFormValid = true;
      formInputs.forEach(input => {
        if (!validateField(input)) {
          isFormValid = false;
        }
      });

      if (!isFormValid) return;

      // Loading state
      const originalText = submitBtn.textContent;
      submitBtn.disabled = true;
      submitBtn.classList.add('loading');
      submitBtn.textContent = 'Enviando...';

      // Simulate API call
      try {
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Success
        form.reset();
        formInputs.forEach(input => handleFloatingLabel(input));
        
        const successMsg = document.createElement('div');
        successMsg.className = 'success-message';
        successMsg.textContent = 'Mensagem enviada com sucesso!';
        form.appendChild(successMsg);

        setTimeout(() => {
          successMsg.remove();
        }, 5000);

      } catch (error) {
        const errorMsg = document.createElement('div');
        errorMsg.className = 'error-message';
        errorMsg.textContent = 'Erro ao enviar. Tente novamente.';
        form.appendChild(errorMsg);

        setTimeout(() => {
          errorMsg.remove();
        }, 5000);
      } finally {
        submitBtn.disabled = false;
        submitBtn.classList.remove('loading');
        submitBtn.textContent = originalText;
      }
    });
  }

  // ============================================================================
  // 7. FAQ ACCORDION
  // ============================================================================

  const faqItems = document.querySelectorAll('.faq-item');

  faqItems.forEach(item => {
    const question = item.querySelector('.faq-question');
    const answer = item.querySelector('.faq-answer');
    const icon = item.querySelector('.faq-icon');

    if (!question || !answer) return;

    question.addEventListener('click', () => {
      const isActive = item.classList.contains('active');

      // Close all others
      faqItems.forEach(otherItem => {
        if (otherItem !== item) {
          otherItem.classList.remove('active');
          const otherAnswer = otherItem.querySelector('.faq-answer');
          const otherIcon = otherItem.querySelector('.faq-icon');
          if (otherAnswer) otherAnswer.style.maxHeight = null;
          if (otherIcon) otherIcon.style.transform = '';
        }
      });

      // Toggle current
      if (isActive) {
        item.classList.remove('active');
        answer.style.maxHeight = null;
        if (icon) icon.style.transform = '';
      } else {
        item.classList.add('active');
        answer.style.maxHeight = answer.scrollHeight + 'px';
        if (icon) icon.style.transform = 'rotate(180deg)';
      }
    });
  });

  // ============================================================================
  // 8. SMOOTH SCROLL
  // ============================================================================

  const anchorLinks = document.querySelectorAll('a[href^="#"]');

  anchorLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      const href = link.getAttribute('href');
      if (href === '#' || href === '') return;

      const target = document.querySelector(href);
      if (!target) return;

      e.preventDefault();

      const offsetTop = target.offsetTop - 80;

      window.scrollTo({
        top: offsetTop,
        behavior: 'smooth'
      });
    });
  });

  // ============================================================================
  // 9. PARALLAX EFFECT
  // ============================================================================

  const heroSection = document.querySelector('.hero');
  const heroBlob = document.querySelector('.hero-blob');
  const heroBackground = document.querySelector('.hero-background');

  let ticking = false;
  let lastScrollY = window.scrollY;

  function updateParallax() {
    if (isMobile() || !heroSection) {
      ticking = false;
      return;
    }

    const scrollY = window.scrollY;
    const heroHeight = heroSection.offsetHeight;

    if (scrollY < heroHeight) {
      if (heroBlob) {
        heroBlob.style.transform = `translateY(${scrollY * 0.3}px)`;
      }
      if (heroBackground) {
        heroBackground.style.transform = `translateY(${scrollY * 0.5}px)`;
      }
    }

    ticking = false;
  }

  function requestParallaxUpdate() {
    if (!ticking) {
      requestAnimationFrame(updateParallax);
      ticking = true;
    }
  }

  if (heroSection && !isMobile()) {
    window.addEventListener('scroll', requestParallaxUpdate, { passive: true });
    updateParallax();
  }

  // Disable parallax on resize to mobile
  window.addEventListener('resize', debounce(() => {
    if (isMobile() && heroBlob && heroBackground) {
      heroBlob.style.transform = '';
      heroBackground.style.transform = '';
    }
  }, 250));

  // ============================================================================
  // INITIALIZATION COMPLETE
  // ============================================================================

  console.log('🎨 Synkra AIOS Landing Page initialized');
});