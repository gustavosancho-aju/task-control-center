'use strict';

(function() {
  // ======================
  // UTILITY FUNCTIONS
  // ======================
  
  const throttle = (func, delay) => {
    let lastCall = 0;
    return function(...args) {
      const now = Date.now();
      if (now - lastCall >= delay) {
        lastCall = now;
        return func.apply(this, args);
      }
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

  const isMobile = () => window.innerWidth <= 768;

  // ======================
  // INTERSECTION OBSERVER
  // ======================
  
  const initIntersectionObserver = () => {
    const animatedElements = document.querySelectorAll('[data-animate]');
    
    if (!animatedElements.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const delay = entry.target.dataset.delay || 0;
            setTimeout(() => {
              entry.target.classList.add('is-visible');
            }, parseInt(delay));
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.15,
        rootMargin: '0px 0px -50px 0px'
      }
    );

    animatedElements.forEach(el => observer.observe(el));
  };

  // ======================
  // SMART NAVIGATION
  // ======================
  
  const initSmartNav = () => {
    const nav = document.querySelector('nav');
    const navLinks = document.querySelectorAll('nav a[href^="#"]');
    
    if (!nav) return;

    const handleScroll = throttle(() => {
      if (window.scrollY > 80) {
        nav.classList.add('scrolled');
      } else {
        nav.classList.remove('scrolled');
      }
    }, 100);

    window.addEventListener('scroll', handleScroll, { passive: true });

    // Active links on scroll
    const sections = Array.from(navLinks).map(link => {
      const targetId = link.getAttribute('href').slice(1);
      return document.getElementById(targetId);
    }).filter(Boolean);

    const updateActiveLink = throttle(() => {
      const scrollPos = window.scrollY + 100;

      sections.forEach((section, index) => {
        const sectionTop = section.offsetTop;
        const sectionHeight = section.offsetHeight;

        if (scrollPos >= sectionTop && scrollPos < sectionTop + sectionHeight) {
          navLinks.forEach(link => link.removeAttribute('aria-current'));
          navLinks[index]?.setAttribute('aria-current', 'page');
        }
      });
    }, 100);

    window.addEventListener('scroll', updateActiveLink, { passive: true });
  };

  // ======================
  // MOBILE MENU
  // ======================
  
  const initMobileMenu = () => {
    const hamburger = document.querySelector('[data-hamburger]');
    const mobileMenu = document.querySelector('[data-mobile-menu]');
    const overlay = document.querySelector('[data-overlay]');
    const body = document.body;

    if (!hamburger || !mobileMenu) return;

    const openMenu = () => {
      hamburger.classList.add('active');
      hamburger.setAttribute('aria-expanded', 'true');
      mobileMenu.classList.add('active');
      if (overlay) overlay.classList.add('active');
      body.style.overflow = 'hidden';
    };

    const closeMenu = () => {
      hamburger.classList.remove('active');
      hamburger.setAttribute('aria-expanded', 'false');
      mobileMenu.classList.remove('active');
      if (overlay) overlay.classList.remove('active');
      body.style.overflow = '';
    };

    hamburger.addEventListener('click', () => {
      const isOpen = hamburger.classList.contains('active');
      isOpen ? closeMenu() : openMenu();
    });

    if (overlay) {
      overlay.addEventListener('click', closeMenu);
    }

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && mobileMenu.classList.contains('active')) {
        closeMenu();
      }
    });

    // Close on link click
    const mobileLinks = mobileMenu.querySelectorAll('a');
    mobileLinks.forEach(link => {
      link.addEventListener('click', closeMenu);
    });
  };

  // ======================
  // ANIMATED COUNTERS
  // ======================
  
  const initCounters = () => {
    const counters = document.querySelectorAll('[data-count]');
    
    if (!counters.length) return;

    const animateCounter = (element) => {
      const target = parseInt(element.dataset.count);
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

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            animateCounter(entry.target);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.5 }
    );

    counters.forEach(counter => observer.observe(counter));
  };

  // ======================
  // WHATSAPP BUTTON
  // ======================
  
  const initWhatsAppButton = () => {
    const whatsappBtn = document.querySelector('[data-whatsapp]');
    
    if (!whatsappBtn) return;

    setTimeout(() => {
      whatsappBtn.classList.add('visible');
    }, 3000);
  };

  // ======================
  // FORM HANDLING
  // ======================
  
  const initForm = () => {
    const form = document.querySelector('[data-form]');
    
    if (!form) return;

    // Floating labels
    const formGroups = form.querySelectorAll('.form-group');
    
    formGroups.forEach(group => {
      const input = group.querySelector('input, textarea');
      const label = group.querySelector('label');
      
      if (!input || !label) return;

      const updateLabelState = () => {
        if (input.value || document.activeElement === input) {
          label.classList.add('float');
        } else {
          label.classList.remove('float');
        }
      };

      input.addEventListener('focus', updateLabelState);
      input.addEventListener('blur', updateLabelState);
      input.addEventListener('input', updateLabelState);
      
      // Initial state
      updateLabelState();
    });

    // Phone mask
    const phoneInput = form.querySelector('input[type="tel"]');
    
    if (phoneInput) {
      phoneInput.addEventListener('input', (e) => {
        let value = e.target.value.replace(/\D/g, '');
        
        if (value.length > 11) value = value.slice(0, 11);
        
        if (value.length >= 6) {
          value = value.replace(/^(\d{2})(\d{5})(\d{0,4}).*/, '($1) $2-$3');
        } else if (value.length >= 2) {
          value = value.replace(/^(\d{2})(\d{0,5})/, '($1) $2');
        } else if (value.length > 0) {
          value = value.replace(/^(\d*)/, '($1');
        }
        
        e.target.value = value;
      });
    }

    // Validation on blur
    const inputs = form.querySelectorAll('input:not([type="submit"]), textarea');
    
    inputs.forEach(input => {
      input.addEventListener('blur', () => {
        const formGroup = input.closest('.form-group');
        if (!formGroup) return;

        formGroup.classList.remove('error', 'success');

        if (input.hasAttribute('required') && !input.value.trim()) {
          formGroup.classList.add('error');
          return;
        }

        if (input.type === 'email' && input.value) {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(input.value)) {
            formGroup.classList.add('error');
            return;
          }
        }

        if (input.type === 'tel' && input.value) {
          const phoneDigits = input.value.replace(/\D/g, '');
          if (phoneDigits.length < 11) {
            formGroup.classList.add('error');
            return;
          }
        }

        if (input.value) {
          formGroup.classList.add('success');
        }
      });
    });

    // Form submission
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const submitBtn = form.querySelector('button[type="submit"]');
      if (!submitBtn) return;

      // Validate all fields
      let isValid = true;
      inputs.forEach(input => {
        const event = new Event('blur');
        input.dispatchEvent(event);
        
        const formGroup = input.closest('.form-group');
        if (formGroup?.classList.contains('error')) {
          isValid = false;
        }
      });

      if (!isValid) return;

      // Loading state
      submitBtn.classList.add('loading');
      submitBtn.disabled = true;
      const originalText = submitBtn.textContent;
      submitBtn.textContent = 'Enviando...';

      // Simulate API call
      try {
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Success
        form.reset();
        formGroups.forEach(group => {
          group.classList.remove('error', 'success');
          const label = group.querySelector('label');
          if (label) label.classList.remove('float');
        });
        
        submitBtn.textContent = '✓ Enviado!';
        setTimeout(() => {
          submitBtn.textContent = originalText;
        }, 3000);
      } catch (error) {
        submitBtn.textContent = '✗ Erro ao enviar';
        setTimeout(() => {
          submitBtn.textContent = originalText;
        }, 3000);
      } finally {
        submitBtn.classList.remove('loading');
        submitBtn.disabled = false;
      }
    });
  };

  // ======================
  // FAQ ACCORDION
  // ======================
  
  const initFAQ = () => {
    const faqItems = document.querySelectorAll('[data-faq-item]');
    
    if (!faqItems.length) return;

    faqItems.forEach(item => {
      const question = item.querySelector('[data-faq-question]');
      const answer = item.querySelector('[data-faq-answer]');
      const icon = item.querySelector('[data-faq-icon]');
      
      if (!question || !answer) return;

      question.addEventListener('click', () => {
        const isOpen = item.classList.contains('active');
        
        // Close all items
        faqItems.forEach(otherItem => {
          if (otherItem !== item) {
            otherItem.classList.remove('active');
            const otherAnswer = otherItem.querySelector('[data-faq-answer]');
            const otherIcon = otherItem.querySelector('[data-faq-icon]');
            if (otherAnswer) otherAnswer.style.maxHeight = '0px';
            if (otherIcon) otherIcon.style.transform = 'rotate(0deg)';
            question.setAttribute('aria-expanded', 'false');
          }
        });
        
        // Toggle current item
        if (isOpen) {
          item.classList.remove('active');
          answer.style.maxHeight = '0px';
          if (icon) icon.style.transform = 'rotate(0deg)';
          question.setAttribute('aria-expanded', 'false');
        } else {
          item.classList.add('active');
          answer.style.maxHeight = answer.scrollHeight + 'px';
          if (icon) icon.style.transform = 'rotate(180deg)';
          question.setAttribute('aria-expanded', 'true');
        }
      });
    });
  };

  // ======================
  // SMOOTH SCROLL
  // ======================
  
  const initSmoothScroll = () => {
    const links = document.querySelectorAll('a[href^="#"]');
    
    links.forEach(link => {
      link.addEventListener('click', (e) => {
        const href = link.getAttribute('href');
        if (href === '#') return;
        
        const target = document.querySelector(href);
        if (!target) return;
        
        e.preventDefault();
        
        const navHeight = document.querySelector('nav')?.offsetHeight || 0;
        const targetPosition = target.offsetTop - navHeight;
        
        window.scrollTo({
          top: targetPosition,
          behavior: 'smooth'
        });
      });
    });
  };

  // ======================
  // PARALLAX EFFECT
  // ======================
  
  const initParallax = () => {
    if (isMobile()) return;

    const hero = document.querySelector('[data-hero]');
    const blob = document.querySelector('[data-blob]');
    const heroContent = hero?.querySelector('[data-hero-content]');
    
    if (!hero) return;

    let ticking = false;
    let scrollY = window.scrollY;

    const updateParallax = () => {
      const heroHeight = hero.offsetHeight;
      const scrollProgress = Math.min(scrollY / heroHeight, 1);
      
      if (blob) {
        const blobTransform = scrollProgress * 100;
        blob.style.transform = `translate(-50%, calc(-50% + ${blobTransform}px))`;
      }
      
      if (heroContent) {
        const contentTransform = scrollProgress * 50;
        heroContent.style.transform = `translateY(${contentTransform}px)`;
        heroContent.style.opacity = 1 - (scrollProgress * 0.5);
      }
      
      ticking = false;
    };

    const requestTick = () => {
      if (!ticking) {
        requestAnimationFrame(updateParallax);
        ticking = true;
      }
    };

    window.addEventListener('scroll', () => {
      scrollY = window.scrollY;
      requestTick();
    }, { passive: true });
  };

  // ======================
  // INITIALIZATION
  // ======================
  
  const init = () => {
    initIntersectionObserver();
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

  // Handle resize for parallax
  window.addEventListener('resize', debounce(() => {
    // Re-init parallax