'use strict';

document.addEventListener('DOMContentLoaded', function() {
    
    // =============================================================================
    // UTILITY FUNCTIONS
    // =============================================================================
    
    function throttle(func, wait) {
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
    
    function debounce(func, wait, immediate) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                timeout = null;
                if (!immediate) func(...args);
            };
            const callNow = immediate && !timeout;
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
            if (callNow) func(...args);
        };
    }
    
    function easeOutQuart(t) {
        return 1 - (--t) * t * t * t;
    }
    
    function isMobile() {
        return window.innerWidth <= 768;
    }
    
    // =============================================================================
    // INTERSECTION OBSERVER - ANIMATIONS
    // =============================================================================
    
    const animatedElements = document.querySelectorAll('[data-animate]');
    
    if (animatedElements.length > 0) {
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
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
    
    // =============================================================================
    // NAVIGATION - SMART NAV & ACTIVE LINKS
    // =============================================================================
    
    const nav = document.querySelector('.nav');
    const navLinks = document.querySelectorAll('.nav a[href^="#"]');
    
    // Smart nav - scrolled class
    const handleNavScroll = throttle(() => {
        if (window.scrollY > 80) {
            nav?.classList.add('scrolled');
        } else {
            nav?.classList.remove('scrolled');
        }
    }, 16);
    
    window.addEventListener('scroll', handleNavScroll, { passive: true });
    
    // Active links
    const sections = Array.from(navLinks).map(link => {
        const href = link.getAttribute('href');
        return document.querySelector(href);
    }).filter(Boolean);
    
    const updateActiveLink = throttle(() => {
        let currentSection = '';
        
        sections.forEach(section => {
            const rect = section.getBoundingClientRect();
            if (rect.top <= 100 && rect.bottom >= 100) {
                currentSection = section.id;
            }
        });
        
        navLinks.forEach(link => {
            const href = link.getAttribute('href').substring(1);
            if (href === currentSection) {
                link.setAttribute('aria-current', 'page');
                link.classList.add('active');
            } else {
                link.removeAttribute('aria-current');
                link.classList.remove('active');
            }
        });
    }, 100);
    
    window.addEventListener('scroll', updateActiveLink, { passive: true });
    
    // =============================================================================
    // MOBILE MENU
    // =============================================================================
    
    const hamburger = document.querySelector('.hamburger');
    const mobileMenu = document.querySelector('.mobile-menu');
    const overlay = document.querySelector('.mobile-menu-overlay');
    const body = document.body;
    
    function openMobileMenu() {
        hamburger?.classList.add('active');
        mobileMenu?.classList.add('active');
        overlay?.classList.add('active');
        body.style.overflow = 'hidden';
    }
    
    function closeMobileMenu() {
        hamburger?.classList.remove('active');
        mobileMenu?.classList.remove('active');
        overlay?.classList.remove('active');
        body.style.overflow = '';
    }
    
    hamburger?.addEventListener('click', () => {
        if (hamburger.classList.contains('active')) {
            closeMobileMenu();
        } else {
            openMobileMenu();
        }
    });
    
    overlay?.addEventListener('click', closeMobileMenu);
    
    // Close menu on escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && mobileMenu?.classList.contains('active')) {
            closeMobileMenu();
        }
    });
    
    // Close menu on mobile nav link click
    const mobileNavLinks = mobileMenu?.querySelectorAll('a[href^="#"]');
    mobileNavLinks?.forEach(link => {
        link.addEventListener('click', closeMobileMenu);
    });
    
    // =============================================================================
    // ANIMATED COUNTERS
    // =============================================================================
    
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
            
            element.textContent = current.toLocaleString();
            
            if (progress < 1) {
                requestAnimationFrame(update);
            } else {
                element.textContent = target.toLocaleString();
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
    
    // =============================================================================
    // WHATSAPP BUTTON
    // =============================================================================
    
    const whatsappBtn = document.querySelector('.whatsapp-btn');
    
    if (whatsappBtn) {
        setTimeout(() => {
            whatsappBtn.classList.add('visible');
        }, 3000);
    }
    
    // =============================================================================
    // FORM HANDLING
    // =============================================================================
    
    const forms = document.querySelectorAll('form');
    
    forms.forEach(form => {
        const inputs = form.querySelectorAll('input, textarea');
        const phoneInputs = form.querySelectorAll('input[type="tel"]');
        const submitBtn = form.querySelector('[type="submit"]');
        
        // Floating labels
        inputs.forEach(input => {
            const label = form.querySelector(`label[for="${input.id}"]`);
            
            function updateLabel() {
                if (input.value || input === document.activeElement) {
                    label?.classList.add('float');
                } else {
                    label?.classList.remove('float');
                }
            }
            
            input.addEventListener('focus', updateLabel);
            input.addEventListener('blur', updateLabel);
            input.addEventListener('input', updateLabel);
            
            // Initial state
            updateLabel();
        });
        
        // Phone mask
        phoneInputs.forEach(phoneInput => {
            phoneInput.addEventListener('input', (e) => {
                let value = e.target.value.replace(/\D/g, '');
                value = value.replace(/^(\d{2})(\d{5})(\d{4}).*/, '($1) $2-$3');
                e.target.value = value;
            });
        });
        
        // Validation
        inputs.forEach(input => {
            input.addEventListener('blur', () => {
                validateField(input);
            });
        });
        
        function validateField(field) {
            const value = field.value.trim();
            let isValid = true;
            let message = '';
            
            if (field.hasAttribute('required') && !value) {
                isValid = false;
                message = 'Este campo é obrigatório';
            } else if (field.type === 'email' && value) {
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(value)) {
                    isValid = false;
                    message = 'E-mail inválido';
                }
            } else if (field.type === 'tel' && value) {
                const phoneRegex = /^\(\d{2}\) \d{5}-\d{4}$/;
                if (!phoneRegex.test(value)) {
                    isValid = false;
                    message = 'Telefone inválido';
                }
            }
            
            const errorElement = field.parentElement.querySelector('.error-message');
            
            if (isValid) {
                field.classList.remove('error');
                if (errorElement) {
                    errorElement.remove();
                }
            } else {
                field.classList.add('error');
                if (!errorElement) {
                    const error = document.createElement('span');
                    error.className = 'error-message';
                    error.textContent = message;
                    field.parentElement.appendChild(error);
                }
            }
            
            return isValid;
        }
        
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
            
            // Loading state
            const originalText = submitBtn.textContent;
            submitBtn.textContent = 'Enviando...';
            submitBtn.disabled = true;
            submitBtn.classList.add('loading');
            
            try {
                // Simulate form submission
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                // Success
                form.classList.add('success');
                submitBtn.textContent = 'Enviado!';
                
                setTimeout(() => {
                    form.reset();
                    form.classList.remove('success');
                    submitBtn.textContent = originalText;
                    submitBtn.disabled = false;
                    submitBtn.classList.remove('loading');
                    
                    // Reset floating labels
                    inputs.forEach(input => {
                        const label = form.querySelector(`label[for="${input.id}"]`);
                        label?.classList.remove('float');
                    });
                }, 3000);
                
            } catch (error) {
                submitBtn.textContent = 'Erro. Tente novamente';
                setTimeout(() => {
                    submitBtn.textContent = originalText;
                    submitBtn.disabled = false;
                    submitBtn.classList.remove('loading');
                }, 3000);
            }
        });
    });
    
    // =============================================================================
    // FAQ ACCORDION
    // =============================================================================
    
    const faqItems = document.querySelectorAll('.faq-item');
    
    faqItems.forEach(item => {
        const trigger = item.querySelector('.faq-trigger');
        const content = item.querySelector('.faq-content');
        const icon = item.querySelector('.faq-icon');
        
        trigger?.addEventListener('click', () => {
            const isOpen = item.classList.contains('active');
            
            // Close all other items
            faqItems.forEach(otherItem => {
                if (otherItem !== item) {
                    otherItem.classList.remove('active');
                    const otherContent = otherItem.querySelector('.faq-content');
                    const otherIcon = otherItem.querySelector('.faq-icon');
                    if (otherContent) otherContent.style.maxHeight = '0';
                    if (otherIcon) otherIcon.style.transform = 'rotate(0deg)';
                }
            });
            
            // Toggle current item
            if (isOpen) {
                item.classList.remove('active');
                if (content) content.style.maxHeight = '0';
                if (icon) icon.style.transform = 'rotate(0deg)';
            } else {
                item.classList.add('active');
                if (content) content.style.maxHeight = content.scrollHeight + 'px';
                if (icon) icon.style.transform = 'rotate(180deg)';
            }
        });
    });
    
    // =============================================================================
    // SMOOTH SCROLL
    // =============================================================================
    
    const anchorLinks = document.querySelectorAll('a[href^="#"]');
    
    anchorLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            const href = link.getAttribute('href');
            if (href === '#') return;
            
            const target = document.querySelector(href);
            if (target) {
                e.preventDefault();
                
                const headerHeight = nav?.offsetHeight || 0;
                const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - headerHeight - 20;
                
                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });
    
    // =============================================================================
    // PARALLAX EFFECT
    // =============================================================================
    
    if (!isMobile()) {
        const heroSection = document.querySelector('.hero');
        const heroBlob = document.querySelector('.hero-blob');
        const heroBackground = document.querySelector('.hero-background');
        
        let ticking = false;
        
        function updateParallax() {
            if (heroSection) {
                const scrolled = window.pageYOffset;
                const rect = heroSection.getBoundingClientRect();
                
                if (rect.bottom >= 0 && rect.top <= window.innerHeight) {
                    const speed1 = scrolled * 0.3;
                    const speed2 = scrolled * 0.1;
                    
                    if (heroBlob) {
                        heroBlob.style.transform = `translateY(${speed1}px)`;
                    }
                    
                    if (heroBackground) {
                        heroBackground.style.transform = `translateY(${speed2}px)`;
                    }
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
        
        window.addEventListener('scroll', requestParallaxUpdate, { passive: true });
        
        // Handle resize to re-enable/disable parallax
        window.addEventListener('resize', debounce(() => {
            if (isMobile()) {
                // Reset transforms on mobile
                if (heroBlob) heroBlob.style.transform = '';
                if (heroBackground) heroBackground.style.transform = '';
            }
        }, 250));
    }
    
    // =============================================================================
    // INITIALIZATION
    // =============================================================================
    
    // Initial calls
    handleNavScroll();
    updateActiveLink();
    
    console.log('Synkra AIOS Landing Page initialized successfully');
});