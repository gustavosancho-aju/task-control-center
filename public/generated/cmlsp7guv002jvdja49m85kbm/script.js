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

    function debounce(func, delay) {
        let timeoutId;
        return function() {
            const args = arguments;
            const context = this;
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func.apply(context, args), delay);
        };
    }

    function easeOutQuart(t) {
        return 1 - (--t) * t * t * t;
    }

    function isMobile() {
        return window.innerWidth <= 768;
    }

    // 1. IntersectionObserver for animations
    function initScrollAnimations() {
        const animatedElements = document.querySelectorAll('[data-animate]');
        
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
        }, {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        });

        animatedElements.forEach(el => observer.observe(el));
    }

    // 2. Smart Navigation
    function initNavigation() {
        const navbar = document.querySelector('.navbar');
        const navLinks = document.querySelectorAll('.nav-link[href^="#"]');
        
        // Scrolled state
        const handleScroll = throttle(() => {
            if (window.scrollY > 80) {
                navbar.classList.add('scrolled');
            } else {
                navbar.classList.remove('scrolled');
            }
        }, 16);
        
        window.addEventListener('scroll', handleScroll, { passive: true });
        
        // Active links
        const sections = Array.from(navLinks).map(link => {
            const href = link.getAttribute('href');
            return document.querySelector(href);
        }).filter(Boolean);
        
        const updateActiveLink = throttle(() => {
            const scrollPos = window.scrollY + 100;
            
            let current = '';
            sections.forEach(section => {
                if (section.offsetTop <= scrollPos && 
                    section.offsetTop + section.offsetHeight > scrollPos) {
                    current = section.id;
                }
            });
            
            navLinks.forEach(link => {
                link.removeAttribute('aria-current');
                if (link.getAttribute('href') === '#' + current) {
                    link.setAttribute('aria-current', 'page');
                }
            });
        }, 100);
        
        window.addEventListener('scroll', updateActiveLink, { passive: true });
    }

    // 3. Mobile Menu
    function initMobileMenu() {
        const menuToggle = document.querySelector('.mobile-menu-toggle');
        const navbar = document.querySelector('.navbar');
        const navDrawer = document.querySelector('.nav-drawer');
        const overlay = document.querySelector('.nav-overlay');
        
        if (!menuToggle || !navbar || !navDrawer || !overlay) return;
        
        function openMenu() {
            navbar.classList.add('menu-open');
            document.body.classList.add('menu-open');
            menuToggle.setAttribute('aria-expanded', 'true');
            navDrawer.setAttribute('aria-hidden', 'false');
        }
        
        function closeMenu() {
            navbar.classList.remove('menu-open');
            document.body.classList.remove('menu-open');
            menuToggle.setAttribute('aria-expanded', 'false');
            navDrawer.setAttribute('aria-hidden', 'true');
        }
        
        menuToggle.addEventListener('click', () => {
            if (navbar.classList.contains('menu-open')) {
                closeMenu();
            } else {
                openMenu();
            }
        });
        
        overlay.addEventListener('click', closeMenu);
        
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && navbar.classList.contains('menu-open')) {
                closeMenu();
            }
        });
        
        // Close menu on nav link click
        document.querySelectorAll('.nav-drawer .nav-link').forEach(link => {
            link.addEventListener('click', closeMenu);
        });
    }

    // 4. Animated Counters
    function initCounters() {
        const counters = document.querySelectorAll('[data-count]');
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const counter = entry.target;
                    const target = parseInt(counter.dataset.count);
                    const duration = 2000;
                    const startTime = performance.now();
                    
                    function updateCounter(currentTime) {
                        const elapsed = currentTime - startTime;
                        const progress = Math.min(elapsed / duration, 1);
                        const easedProgress = easeOutQuart(progress);
                        const currentValue = Math.floor(easedProgress * target);
                        
                        counter.textContent = currentValue.toLocaleString();
                        
                        if (progress < 1) {
                            requestAnimationFrame(updateCounter);
                        }
                    }
                    
                    requestAnimationFrame(updateCounter);
                    observer.unobserve(counter);
                }
            });
        }, { threshold: 0.5 });
        
        counters.forEach(counter => observer.observe(counter));
    }

    // 5. WhatsApp Button
    function initWhatsAppButton() {
        const whatsappBtn = document.querySelector('.whatsapp-btn');
        if (!whatsappBtn) return;
        
        setTimeout(() => {
            whatsappBtn.classList.add('show');
        }, 3000);
    }

    // 6. Form Handling
    function initForms() {
        const forms = document.querySelectorAll('form');
        
        forms.forEach(form => {
            // Floating labels
            const inputs = form.querySelectorAll('.form-group input, .form-group textarea');
            inputs.forEach(input => {
                const label = input.parentElement.querySelector('label');
                if (!label) return;
                
                function updateLabel() {
                    if (input.value || input === document.activeElement) {
                        label.classList.add('active');
                    } else {
                        label.classList.remove('active');
                    }
                }
                
                input.addEventListener('focus', updateLabel);
                input.addEventListener('blur', updateLabel);
                input.addEventListener('input', updateLabel);
                updateLabel(); // Initial check
            });
            
            // Phone mask
            const phoneInput = form.querySelector('input[type="tel"]');
            if (phoneInput) {
                phoneInput.addEventListener('input', function(e) {
                    let value = e.target.value.replace(/\D/g, '');
                    if (value.length <= 11) {
                        value = value.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3');
                        value = value.replace(/^(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
                        value = value.replace(/^(\d{2})(\d{0,5})/, '($1) $2');
                        value = value.replace(/^(\d{0,2})/, '($1');
                        if (value === '(') value = '';
                    }
                    e.target.value = value;
                });
            }
            
            // Validation
            inputs.forEach(input => {
                input.addEventListener('blur', function() {
                    validateField(input);
                });
            });
            
            // Form submission
            form.addEventListener('submit', async function(e) {
                e.preventDefault();
                
                let isValid = true;
                inputs.forEach(input => {
                    if (!validateField(input)) {
                        isValid = false;
                    }
                });
                
                if (!isValid) return;
                
                const submitBtn = form.querySelector('button[type="submit"]');
                const originalText = submitBtn.textContent;
                
                submitBtn.classList.add('loading');
                submitBtn.textContent = 'Enviando...';
                submitBtn.disabled = true;
                
                try {
                    // Simulate form submission
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    
                    // Show success message
                    form.innerHTML = '<div class="success-message"><h3>Mensagem enviada com sucesso!</h3><p>Entraremos em contato em breve.</p></div>';
                } catch (error) {
                    console.error('Form submission error:', error);
                } finally {
                    submitBtn.classList.remove('loading');
                    submitBtn.textContent = originalText;
                    submitBtn.disabled = false;
                }
            });
        });
        
        function validateField(field) {
            const value = field.value.trim();
            const type = field.type;
            const required = field.hasAttribute('required');
            const formGroup = field.closest('.form-group');
            
            let isValid = true;
            let errorMessage = '';
            
            if (required && !value) {
                isValid = false;
                errorMessage = 'Este campo é obrigatório';
            } else if (value) {
                if (type === 'email' && !isValidEmail(value)) {
                    isValid = false;
                    errorMessage = 'Email inválido';
                } else if (type === 'tel' && value.replace(/\D/g, '').length < 10) {
                    isValid = false;
                    errorMessage = 'Telefone inválido';
                }
            }
            
            // Update UI
            let errorEl = formGroup.querySelector('.field-error');
            if (!isValid) {
                if (!errorEl) {
                    errorEl = document.createElement('span');
                    errorEl.className = 'field-error';
                    formGroup.appendChild(errorEl);
                }
                errorEl.textContent = errorMessage;
                formGroup.classList.add('error');
            } else {
                if (errorEl) {
                    errorEl.remove();
                }
                formGroup.classList.remove('error');
            }
            
            return isValid;
        }
        
        function isValidEmail(email) {
            return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
        }
    }

    // 7. FAQ Accordion
    function initFAQ() {
        const faqItems = document.querySelectorAll('.faq-item');
        
        faqItems.forEach(item => {
            const question = item.querySelector('.faq-question');
            const answer = item.querySelector('.faq-answer');
            
            if (!question || !answer) return;
            
            question.addEventListener('click', () => {
                const isOpen = item.classList.contains('open');
                
                // Close all other items
                faqItems.forEach(otherItem => {
                    if (otherItem !== item && otherItem.classList.contains('open')) {
                        otherItem.classList.remove('open');
                        const otherAnswer = otherItem.querySelector('.faq-answer');
                        otherAnswer.style.maxHeight = '0px';
                        otherItem.querySelector('.faq-icon').style.transform = 'rotate(0deg)';
                    }
                });
                
                // Toggle current item
                if (isOpen) {
                    item.classList.remove('open');
                    answer.style.maxHeight = '0px';
                    item.querySelector('.faq-icon').style.transform = 'rotate(0deg)';
                } else {
                    item.classList.add('open');
                    answer.style.maxHeight = answer.scrollHeight + 'px';
                    item.querySelector('.faq-icon').style.transform = 'rotate(180deg)';
                }
            });
        });
    }

    // 8. Smooth Scroll
    function initSmoothScroll() {
        const links = document.querySelectorAll('a[href^="#"]');
        
        links.forEach(link => {
            link.addEventListener('click', function(e) {
                const href = this.getAttribute('href');
                if (href === '#') return;
                
                const target = document.querySelector(href);
                if (!target) return;
                
                e.preventDefault();
                
                const headerHeight = document.querySelector('.navbar').offsetHeight;
                const targetPosition = target.offsetTop - headerHeight - 20;
                
                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            });
        });
    }

    // 9. Parallax Effect
    function initParallax() {
        if (isMobile()) return;
        
        const heroBlob = document.querySelector('.hero-blob');
        const heroBackground = document.querySelector('.hero-background');
        
        if (!heroBlob && !heroBackground) return;
        
        let ticking = false;
        
        function updateParallax() {
            const scrolled = window.pageYOffset;
            const rate = scrolled * -0.5;
            const blobRate = scrolled * -0.3;
            
            if (heroBackground) {
                heroBackground.style.transform = `translateY(${rate}px)`;
            }
            
            if (heroBlob) {
                heroBlob.style.transform = `translateY(${blobRate}px)`;
            }
            
            ticking = false;
        }
        
        function requestTick() {
            if (!ticking) {
                requestAnimationFrame(updateParallax);
                ticking = true;
            }
        }
        
        window.addEventListener('scroll', requestTick, { passive: true });
    }

    // Initialize all modules
    function init() {
        initScrollAnimations();
        initNavigation();
        initMobileMenu();
        initCounters();
        initWhatsAppButton();
        initForms();
        initFAQ();
        initSmoothScroll();
        initParallax();
    }
    
    init();
});