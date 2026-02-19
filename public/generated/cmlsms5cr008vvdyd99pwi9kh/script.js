'use strict';

document.addEventListener('DOMContentLoaded', function() {
  // Utility Functions
  function throttle(func, limit) {
    let inThrottle;
    return function() {
      const args = arguments;
      const context = this;
      if (!inThrottle) {
        func.apply(context, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }

  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  function easeOutQuart(t) {
    return 1 - (--t) * t * t * t;
  }

  // 1. IntersectionObserver for animations
  const animatedElements = document.querySelectorAll('[data-animate]');
  
  if (animatedElements.length) {
    const observerOptions = {
      root: null,
      rootMargin: '0px',
      threshold: 0.1
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const element = entry.target;
          const delay = parseInt(element.dataset.delay) || 0;
          
          setTimeout(() => {
            element.classList.add('animate-in');
          }, delay);
          
          observer.unobserve(element);
        }
      });
    }, observerOptions);

    animatedElements.forEach(el => observer.observe(el));
  }

  // 2. Smart Navigation
  const nav = document.querySelector('nav');
  const navLinks = document.querySelectorAll('nav a[href^="#"]');
  
  function updateActiveNavLink() {
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

  const handleScroll = throttle(() => {
    if (window.scrollY > 80) {
      nav?.classList.add('scrolled');
    } else {
      nav?.classList.remove('scrolled');
    }
    updateActiveNavLink();
  }, 16);

  window.addEventListener('scroll', handleScroll, { passive: true });

  // 3. Mobile Menu
  const hamburger = document.querySelector('.hamburger');
  const mobileMenu = document.querySelector('.mobile-menu');
  const mobileOverlay = document.querySelector('.mobile-overlay');
  const body = document.body;

  function toggleMobileMenu() {
    const isOpen = hamburger.classList.contains('active');
    
    if (isOpen) {
      closeMobileMenu();
    } else {
      openMobileMenu();
    }
  }

  function openMobileMenu() {
    hamburger.classList.add('active');
    mobileMenu.classList.add('active');
    mobileOverlay.classList.add('active');
    body.style.overflow = 'hidden';
  }

  function closeMobileMenu() {
    hamburger.classList.remove('active');
    mobileMenu.classList.remove('active');
    mobileOverlay.classList.remove('active');
    body.style.overflow = '';
  }

  hamburger?.addEventListener('click', toggleMobileMenu);
  mobileOverlay?.addEventListener('click', closeMobileMenu);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && mobileMenu?.classList.contains('active')) {
      closeMobileMenu();
    }
  });

  // 4. Animated Counters
  const counters = document.querySelectorAll('[data-count]');
  
  if (counters.length) {
    const counterObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const counter = entry.target;
          const target = parseInt(counter.dataset.count);
          const duration = 2000;
          const startTime = performance.now();
          
          function animate(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easedProgress = easeOutQuart(progress);
            const current = Math.floor(easedProgress * target);
            
            counter.textContent = current.toLocaleString();
            
            if (progress < 1) {
              requestAnimationFrame(animate);
            } else {
              counter.textContent = target.toLocaleString();
            }
          }
          
          requestAnimationFrame(animate);
          counterObserver.unobserve(counter);
        }
      });
    });

    counters.forEach(counter => counterObserver.observe(counter));
  }

  // 5. WhatsApp Button
  const whatsappBtn = document.querySelector('.whatsapp-btn');
  
  if (whatsappBtn) {
    setTimeout(() => {
      whatsappBtn.classList.add('show');
    }, 3000);
  }

  // 6. Form Handling
  const forms = document.querySelectorAll('form');
  
  forms.forEach(form => {
    const inputs = form.querySelectorAll('input, textarea');
    const phoneInputs = form.querySelectorAll('input[type="tel"]');
    
    // Floating Labels
    inputs.forEach(input => {
      const label = input.parentElement.querySelector('label');
      
      function updateLabel() {
        if (input.value || document.activeElement === input) {
          label?.classList.add('float');
        } else {
          label?.classList.remove('float');
        }
      }
      
      input.addEventListener('focus', updateLabel);
      input.addEventListener('blur', updateLabel);
      input.addEventListener('input', updateLabel);
      
      // Initial check
      updateLabel();
    });

    // Phone Mask
    phoneInputs.forEach(input => {
      input.addEventListener('input', (e) => {
        let value = e.target.value.replace(/\D/g, '');
        value = value.substring(0, 11);
        
        if (value.length >= 7) {
          value = value.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
        } else if (value.length >= 3) {
          value = value.replace(/(\d{2})(\d+)/, '($1) $2');
        } else if (value.length >= 1) {
          value = value.replace(/(\d+)/, '($1');
        }
        
        e.target.value = value;
      });
    });

    // Form Validation
    inputs.forEach(input => {
      input.addEventListener('blur', validateInput);
    });

    function validateInput(e) {
      const input = e.target;
      const value = input.value.trim();
      const type = input.type;
      
      input.parentElement.classList.remove('error');
      
      if (input.hasAttribute('required') && !value) {
        showFieldError(input, 'Este campo é obrigatório');
        return false;
      }
      
      if (type === 'email' && value && !isValidEmail(value)) {
        showFieldError(input, 'Email inválido');
        return false;
      }
      
      if (type === 'tel' && value && value.replace(/\D/g, '').length < 10) {
        showFieldError(input, 'Telefone inválido');
        return false;
      }
      
      return true;
    }

    function showFieldError(input, message) {
      input.parentElement.classList.add('error');
      let errorElement = input.parentElement.querySelector('.error-message');
      
      if (!errorElement) {
        errorElement = document.createElement('span');
        errorElement.className = 'error-message';
        input.parentElement.appendChild(errorElement);
      }
      
      errorElement.textContent = message;
    }

    function isValidEmail(email) {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    // Form Submit
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const submitBtn = form.querySelector('button[type="submit"]');
      const originalText = submitBtn.textContent;
      
      // Validate all fields
      let isValid = true;
      inputs.forEach(input => {
        if (!validateInput({ target: input })) {
          isValid = false;
        }
      });
      
      if (!isValid) return;
      
      // Loading state
      submitBtn.textContent = 'Enviando...';
      submitBtn.disabled = true;
      form.classList.add('loading');
      
      try {
        // Simulate form submission
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Success state
        form.classList.add('success');
        form.reset();
        
        // Reset floating labels
        inputs.forEach(input => {
          const label = input.parentElement.querySelector('label');
          label?.classList.remove('float');
        });
        
      } catch (error) {
        console.error('Form submission error:', error);
      } finally {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
        form.classList.remove('loading');
        
        setTimeout(() => {
          form.classList.remove('success');
        }, 5000);
      }
    });
  });

  // 7. FAQ Accordion
  const faqItems = document.querySelectorAll('.faq-item');
  
  faqItems.forEach(item => {
    const question = item.querySelector('.faq-question');
    const answer = item.querySelector('.faq-answer');
    const icon = item.querySelector('.faq-icon');
    
    question.addEventListener('click', () => {
      const isOpen = item.classList.contains('open');
      
      // Close all other items
      faqItems.forEach(otherItem => {
        if (otherItem !== item) {
          otherItem.classList.remove('open');
          const otherAnswer = otherItem.querySelector('.faq-answer');
          const otherIcon = otherItem.querySelector('.faq-icon');
          otherAnswer.style.maxHeight = '0px';
          otherIcon?.style.transform = 'rotate(0deg)';
        }
      });
      
      // Toggle current item
      if (isOpen) {
        item.classList.remove('open');
        answer.style.maxHeight = '0px';
        icon.style.transform = 'rotate(0deg)';
      } else {
        item.classList.add('open');
        answer.style.maxHeight = answer.scrollHeight + 'px';
        icon.style.transform = 'rotate(180deg)';
      }
    });
  });

  // 8. Smooth Scroll
  const anchorLinks = document.querySelectorAll('a[href^="#"]');
  
  anchorLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      const href = link.getAttribute('href');
      if (href === '#') return;
      
      const target = document.querySelector(href);
      if (!target) return;
      
      e.preventDefault();
      
      // Close mobile menu if open
      if (mobileMenu?.classList.contains('active')) {
        closeMobileMenu();
      }
      
      const navHeight = nav?.offsetHeight || 0;
      const targetPosition = target.offsetTop - navHeight - 20;
      
      window.scrollTo({
        top: targetPosition,
        behavior: 'smooth'
      });
    });
  });

  // 9. Parallax Effect
  const heroSection = document.querySelector('.hero');
  const heroBlob = document.querySelector('.hero-blob');
  const heroBackground = document.querySelector('.hero-background');
  
  if (heroSection && (heroBlob || heroBackground)) {
    const isMobile = window.innerWidth <= 768;
    
    if (!isMobile) {
      const handleParallax = () => {
        const scrolled = window.pageYOffset;
        const heroHeight = heroSection.offsetHeight;
        const scrollProgress = Math.min(scrolled / heroHeight, 1);
        
        if (heroBlob) {
          const blobTransform = scrolled * 0.3;
          heroBlob.style.transform = `translateY(${blobTransform}px)`;
        }
        
        if (heroBackground) {
          const bgTransform = scrolled * 0.5;
          heroBackground.style.transform = `translateY(${bgTransform}px)`;
        }
        
        requestAnimationFrame(handleParallax);
      };
      
      let isScrolling = false;
      window.addEventListener('scroll', () => {
        if (!isScrolling) {
          requestAnimationFrame(handleParallax);
          isScrolling = true;
        }
      }, { passive: true });
    }
  }

  // Initialize on load
  handleScroll();
  updateActiveNavLink();
});