'use strict';

document.addEventListener('DOMContentLoaded', function() {
    
    // Utility functions
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
        return function(...args) {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func.apply(this, args), delay);
        };
    }

    function easeOutQuart(t) {
        return 1 - Math.pow(1 - t, 4);
    }

    // IntersectionObserver for animations
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

    // Observe all elements with data-animate
    document.querySelectorAll('[data-animate]').forEach(el => {
        observer.observe(el);
    });

    // Smart Navigation
    const nav = document.querySelector('nav');
    const navLinks = document.querySelectorAll('nav a[href^="#"]');
    
    const handleScroll = throttle(() => {
        if (window.scrollY > 80) {
            nav.classList.add('scrolled');
        } else {
            nav.classList.remove('scrolled');
        }

        // Update active nav links
        let current = '';
        const sections = document.querySelectorAll('section[id]');
        
        sections.forEach(section => {
            const sectionTop = section.getBoundingClientRect().top;
            if (sectionTop <= 100) {
                current = section.getAttribute('id');
            }
        });

        navLinks.forEach(link => {
            link.removeAttribute('aria-current');
            if (link.getAttribute('href') === `#${current}`) {
                link.setAttribute('aria-current', 'page');
            }
        });
    }, 16);

    window.addEventListener('scroll', handleScroll, { passive: true });

    // Mobile Menu
    const hamburger = document.querySelector('.hamburger');
    const mobileMenu = document.querySelector('.mobile-menu');
    const overlay = document.querySelector('.menu-overlay');
    
    function openMobileMenu() {
        hamburger.classList.add('active');
        mobileMenu.classList.add('open');
        overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
        hamburger.setAttribute('aria-expanded', 'true');
    }
    
    function closeMobileMenu() {
        hamburger.classList.remove('active');
        mobileMenu.classList.remove('open');
        overlay.classList.remove('active');
        document.body.style.overflow = '';
        hamburger.setAttribute('aria-expanded', 'false');
    }
    
    if (hamburger) {
        hamburger.addEventListener('click', () => {
            if (hamburger.classList.contains('active')) {
                closeMobileMenu();
            } else {
                openMobileMenu();
            }
        });
    }
    
    if (overlay) {
        overlay.addEventListener('click', closeMobileMenu);
    }
    
    // Close menu with Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && mobileMenu.classList.contains('open')) {
            closeMobileMenu();
        }
    });

    // Animated Counters
    function animateCounter(element) {
        const target = parseInt(element.dataset.count);
        const duration = 2000;
        const startTime = performance.now();
        
        function updateCounter(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easedProgress = easeOutQuart(progress);
            const current = Math.floor(easedProgress * target);
            
            element.textContent = current.toLocaleString();
            
            if (progress < 1) {
                requestAnimationFrame(updateCounter);
            } else {
                element.textContent = target.toLocaleString();
            }
        }
        
        requestAnimationFrame(updateCounter);
    }

    // Observe counters
    const counterObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                animateCounter(entry.target);
                counterObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.5 });

    document.querySelectorAll('[data-count]').forEach(counter => {
        counterObserver.observe(counter);
    });

    // WhatsApp Button
    const whatsappBtn = document.querySelector('.whatsapp-btn');
    if (whatsappBtn) {
        setTimeout(() => {
            whatsappBtn.classList.add('show');
        }, 3000);
    }

    // Form handling
    const form = document.querySelector('form');
    if (form) {
        // Floating labels
        const formGroups = form.querySelectorAll('.form-group');
        
        formGroups.forEach(group => {
            const input = group.querySelector('input, textarea');
            const label = group.querySelector('label');
            
            if (!input || !label) return;
            
            function updateLabel() {
                if (input.value.trim() !== '' || input === document.activeElement) {
                    group.classList.add('focused');
                } else {
                    group.classList.remove('focused');
                }
            }
            
            input.addEventListener('focus', updateLabel);
            input.addEventListener('blur', updateLabel);
            input.addEventListener('input', updateLabel);
            
            // Initial state
            updateLabel();
        });

        // Phone mask
        const phoneInput = form.querySelector('input[type="tel"]');
        if (phoneInput) {
            phoneInput.addEventListener('input', (e) => {
                let value = e.target.value.replace(/\D/g, '');
                value = value.replace(/^(\d{2})(\d{5})(\d{4}).*/, '($1) $2-$3');
                e.target.value = value;
            });
        }

        // Form validation
        const inputs = form.querySelectorAll('input[required], textarea[required]');
        
        function validateInput(input) {
            const group = input.closest('.form-group');
            let isValid = true;
            
            // Remove existing error
            group.classList.remove('error');
            const existingError = group.querySelector('.error-message');
            if (existingError) {
                existingError.remove();
            }
            
            // Check if empty
            if (input.value.trim() === '') {
                isValid = false;
                showError(group, 'Este campo é obrigatório');
            }
            
            // Email validation
            if (input.type === 'email' && input.value.trim() !== '') {
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(input.value)) {
                    isValid = false;
                    showError(group, 'Email inválido');
                }
            }
            
            // Phone validation
            if (input.type === 'tel' && input.value.trim() !== '') {
                const phoneRegex = /^\(\d{2}\) \d{5}-\d{4}$/;
                if (!phoneRegex.test(input.value)) {
                    isValid = false;
                    showError(group, 'Telefone inválido');
                }
            }
            
            return isValid;
        }
        
        function showError(group, message) {
            group.classList.add('error');
            const errorEl = document.createElement('span');
            errorEl.className = 'error-message';
            errorEl.textContent = message;
            group.appendChild(errorEl);
        }
        
        inputs.forEach(input => {
            input.addEventListener('blur', () => validateInput(input));
        });

        // Form submission
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            // Validate all inputs
            let isFormValid = true;
            inputs.forEach(input => {
                if (!validateInput(input)) {
                    isFormValid = false;
                }
            });
            
            if (!isFormValid) return;
            
            const submitBtn = form.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            
            // Loading state
            submitBtn.disabled = true;
            submitBtn.textContent = 'Enviando...';
            submitBtn.classList.add('loading');
            
            try {
                // Simulate form submission
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                // Success state
                submitBtn.textContent = 'Enviado com sucesso!';
                submitBtn.classList.add('success');
                
                // Reset form after delay
                setTimeout(() => {
                    form.reset();
                    formGroups.forEach(group => group.classList.remove('focused'));
                    submitBtn.disabled = false;
                    submitBtn.textContent = originalText;
                    submitBtn.classList.remove('loading', 'success');
                }, 3000);
                
            } catch (error) {
                submitBtn.textContent = 'Erro ao enviar';
                submitBtn.classList.add('error');
                
                setTimeout(() => {
                    submitBtn.disabled = false;
                    submitBtn.textContent = originalText;
                    submitBtn.classList.remove('loading', 'error');
                }, 3000);
            }
        });
    }

    // FAQ Accordion
    const faqItems = document.querySelectorAll('.faq-item');
    
    faqItems.forEach(item => {
        const question = item.querySelector('.faq-question');
        const answer = item.querySelector('.faq-answer');
        const icon = item.querySelector('.faq-icon');
        
        if (!question || !answer) return;
        
        question.addEventListener('click', () => {
            const isOpen = item.classList.contains('open');
            
            // Close all other items
            faqItems.forEach(otherItem => {
                if (otherItem !== item) {
                    otherItem.classList.remove('open');
                    const otherAnswer = otherItem.querySelector('.faq-answer');
                    const otherIcon = otherItem.querySelector('.faq-icon');
                    if (otherAnswer) otherAnswer.style.maxHeight = '0px';
                    if (otherIcon) otherIcon.style.transform = 'rotate(0deg)';
                }
            });
            
            // Toggle current item
            if (isOpen) {
                item.classList.remove('open');
                answer.style.maxHeight = '0px';
                if (icon) icon.style.transform = 'rotate(0deg)';
            } else {
                item.classList.add('open');
                answer.style.maxHeight = answer.scrollHeight + 'px';
                if (icon) icon.style.transform = 'rotate(180deg)';
            }
        });
    });

    // Smooth scroll for internal anchors
    document.querySelectorAll('a[href^="#"]').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('href').substring(1);
            const target = document.getElementById(targetId);
            
            if (target) {
                const offsetTop = target.getBoundingClientRect().top + window.scrollY - 80;
                
                window.scrollTo({
                    top: offsetTop,
                    behavior: 'smooth'
                });
            }
            
            // Close mobile menu if open
            if (mobileMenu && mobileMenu.classList.contains('open')) {
                closeMobileMenu();
            }
        });
    });

    // Parallax effect (desktop only)
    const isMobile = window.innerWidth <= 768;
    
    if (!isMobile) {
        const hero = document.querySelector('.hero');
        const heroBlob = document.querySelector('.hero-blob');
        
        if (hero && heroBlob) {
            const handleParallax = throttle(() => {
                const scrolled = window.scrollY;
                const heroHeight = hero.offsetHeight;
                
                if (scrolled < heroHeight) {
                    const bgSpeed = scrolled * 0.3;
                    const blobSpeed = scrolled * 0.5;
                    
                    requestAnimationFrame(() => {
                        hero.style.transform = `translateY(${bgSpeed}px)`;
                        heroBlob.style.transform = `translate(-50%, calc(-50% + ${blobSpeed}px))`;
                    });
                }
            }, 16);
            
            window.addEventListener('scroll', handleParallax, { passive: true });
        }
    }

    // Resize handler to disable parallax on mobile
    const handleResize = debounce(() => {
        const newIsMobile = window.innerWidth <= 768;
        if (newIsMobile && !isMobile) {
            // Reset parallax styles
            const hero = document.querySelector('.hero');
            const heroBlob = document.querySelector('.hero-blob');
            if (hero) hero.style.transform = '';
            if (heroBlob) heroBlob.style.transform = '';
        }
    }, 250);
    
    window.addEventListener('resize', handleResize);
});