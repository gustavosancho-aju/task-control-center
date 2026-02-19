'use strict';

document.addEventListener('DOMContentLoaded', function() {
    
    // Utilitários
    const throttle = (func, limit) => {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        }
    };

    const debounce = (func, wait) => {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    };

    // Função de easing
    const easeOutQuart = (t) => 1 - Math.pow(1 - t, 4);

    // 1. IntersectionObserver para animações
    const initScrollAnimations = () => {
        const animatedElements = document.querySelectorAll('[data-animate]');
        
        if (!animatedElements.length) return;

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const element = entry.target;
                    const delay = parseInt(element.dataset.delay || 0);
                    
                    setTimeout(() => {
                        element.style.opacity = '1';
                        element.style.transform = 'translateY(0)';
                    }, delay);
                    
                    observer.unobserve(element);
                }
            });
        }, {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        });

        animatedElements.forEach(el => {
            el.style.opacity = '0';
            el.style.transform = 'translateY(50px)';
            el.style.transition = 'opacity 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94), transform 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
            observer.observe(el);
        });
    };

    // 2. Navegação inteligente
    const initSmartNav = () => {
        const nav = document.querySelector('.nav');
        const navLinks = document.querySelectorAll('.nav-link');
        const sections = document.querySelectorAll('section[id]');
        
        if (!nav) return;

        // Adiciona classe .scrolled
        const handleScroll = throttle(() => {
            if (window.scrollY > 80) {
                nav.classList.add('scrolled');
            } else {
                nav.classList.remove('scrolled');
            }
        }, 100);

        // Marca link ativo
        const updateActiveLink = throttle(() => {
            let current = '';
            
            sections.forEach(section => {
                const sectionTop = section.offsetTop - 100;
                const sectionHeight = section.offsetHeight;
                
                if (window.scrollY >= sectionTop && window.scrollY < sectionTop + sectionHeight) {
                    current = section.getAttribute('id');
                }
            });

            navLinks.forEach(link => {
                link.removeAttribute('aria-current');
                if (link.getAttribute('href') === '#' + current) {
                    link.setAttribute('aria-current', 'page');
                }
            });
        }, 100);

        window.addEventListener('scroll', handleScroll, { passive: true });
        window.addEventListener('scroll', updateActiveLink, { passive: true });
    };

    // 3. Menu mobile
    const initMobileMenu = () => {
        const hamburger = document.querySelector('.hamburger');
        const mobileMenu = document.querySelector('.mobile-menu');
        const overlay = document.querySelector('.mobile-overlay');
        const mobileLinks = document.querySelectorAll('.mobile-menu .nav-link');
        
        if (!hamburger || !mobileMenu) return;

        const openMenu = () => {
            hamburger.classList.add('active');
            mobileMenu.classList.add('active');
            if (overlay) overlay.classList.add('active');
            document.body.style.overflow = 'hidden';
        };

        const closeMenu = () => {
            hamburger.classList.remove('active');
            mobileMenu.classList.remove('active');
            if (overlay) overlay.classList.remove('active');
            document.body.style.overflow = '';
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

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && hamburger.classList.contains('active')) {
                closeMenu();
            }
        });
    };

    // 4. Contadores animados
    const initCounters = () => {
        const counters = document.querySelectorAll('[data-count]');
        
        if (!counters.length) return;

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const counter = entry.target;
                    const target = parseInt(counter.dataset.count);
                    const duration = 2000;
                    const startTime = performance.now();

                    const animateCounter = (currentTime) => {
                        const elapsed = currentTime - startTime;
                        const progress = Math.min(elapsed / duration, 1);
                        const easedProgress = easeOutQuart(progress);
                        const current = Math.floor(easedProgress * target);
                        
                        counter.textContent = current.toLocaleString('pt-BR');
                        
                        if (progress < 1) {
                            requestAnimationFrame(animateCounter);
                        }
                    };

                    requestAnimationFrame(animateCounter);
                    observer.unobserve(counter);
                }
            });
        }, {
            threshold: 0.5
        });

        counters.forEach(counter => observer.observe(counter));
    };

    // 5. Botão WhatsApp
    const initWhatsAppButton = () => {
        const whatsappBtn = document.querySelector('.whatsapp-btn');
        
        if (!whatsappBtn) return;

        setTimeout(() => {
            whatsappBtn.style.transform = 'scale(1)';
            whatsappBtn.style.opacity = '1';
        }, 3000);

        // Tooltip
        const tooltip = whatsappBtn.querySelector('.tooltip');
        if (tooltip) {
            whatsappBtn.addEventListener('mouseenter', () => {
                tooltip.style.opacity = '1';
                tooltip.style.transform = 'translateY(-10px)';
            });

            whatsappBtn.addEventListener('mouseleave', () => {
                tooltip.style.opacity = '0';
                tooltip.style.transform = 'translateY(0)';
            });
        }
    };

    // 6. Formulário
    const initForm = () => {
        const form = document.querySelector('.form');
        const inputs = document.querySelectorAll('.form-input');
        const phoneInput = document.querySelector('input[type="tel"]');
        
        if (!form) return;

        // Floating labels
        inputs.forEach(input => {
            const label = input.parentElement.querySelector('.form-label');
            
            if (!label) return;

            const updateLabel = () => {
                if (input.value || input === document.activeElement) {
                    label.classList.add('active');
                } else {
                    label.classList.remove('active');
                }
            };

            input.addEventListener('focus', updateLabel);
            input.addEventListener('blur', updateLabel);
            input.addEventListener('input', updateLabel);
            
            // Estado inicial
            updateLabel();
        });

        // Máscara de telefone
        if (phoneInput) {
            phoneInput.addEventListener('input', (e) => {
                let value = e.target.value.replace(/\D/g, '');
                value = value.replace(/^(\d{2})(\d)/g, '($1) $2');
                value = value.replace(/(\d)(\d{4})$/, '$1-$2');
                e.target.value = value;
            });
        }

        // Validação no blur
        inputs.forEach(input => {
            input.addEventListener('blur', () => {
                const parent = input.parentElement;
                
                if (input.hasAttribute('required') && !input.value.trim()) {
                    parent.classList.add('error');
                    parent.classList.remove('success');
                } else if (input.type === 'email' && input.value) {
                    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                    if (emailRegex.test(input.value)) {
                        parent.classList.add('success');
                        parent.classList.remove('error');
                    } else {
                        parent.classList.add('error');
                        parent.classList.remove('success');
                    }
                } else if (input.value) {
                    parent.classList.add('success');
                    parent.classList.remove('error');
                }
            });
        });

        // Submit com loading
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const submitBtn = form.querySelector('.btn-submit');
            const originalText = submitBtn.textContent;
            
            submitBtn.classList.add('loading');
            submitBtn.textContent = 'Enviando...';
            submitBtn.disabled = true;
            
            // Simula envio
            setTimeout(() => {
                submitBtn.classList.remove('loading');
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
                
                // Reset form
                form.reset();
                inputs.forEach(input => {
                    const label = input.parentElement.querySelector('.form-label');
                    const parent = input.parentElement;
                    
                    if (label) label.classList.remove('active');
                    parent.classList.remove('success', 'error');
                });
            }, 2000);
        });
    };

    // 7. FAQ Accordion
    const initFAQ = () => {
        const faqItems = document.querySelectorAll('.faq-item');
        
        if (!faqItems.length) return;

        faqItems.forEach(item => {
            const question = item.querySelector('.faq-question');
            const answer = item.querySelector('.faq-answer');
            const icon = item.querySelector('.faq-icon');
            
            if (!question || !answer) return;

            question.addEventListener('click', () => {
                const isActive = item.classList.contains('active');
                
                // Fecha todos os outros
                faqItems.forEach(otherItem => {
                    if (otherItem !== item) {
                        otherItem.classList.remove('active');
                        const otherAnswer = otherItem.querySelector('.faq-answer');
                        const otherIcon = otherItem.querySelector('.faq-icon');
                        
                        if (otherAnswer) otherAnswer.style.maxHeight = '0';
                        if (otherIcon) otherIcon.style.transform = 'rotate(0deg)';
                    }
                });
                
                // Toggle atual
                if (isActive) {
                    item.classList.remove('active');
                    answer.style.maxHeight = '0';
                    if (icon) icon.style.transform = 'rotate(0deg)';
                } else {
                    item.classList.add('active');
                    answer.style.maxHeight = answer.scrollHeight + 'px';
                    if (icon) icon.style.transform = 'rotate(180deg)';
                }
            });
        });
    };

    // 8. Smooth scroll
    const initSmoothScroll = () => {
        const links = document.querySelectorAll('a[href^="#"]');
        
        links.forEach(link => {
            link.addEventListener('click', (e) => {
                const href = link.getAttribute('href');
                
                if (href === '#') return;
                
                const target = document.querySelector(href);
                
                if (target) {
                    e.preventDefault();
                    
                    const offsetTop = target.offsetTop - 80;
                    
                    window.scrollTo({
                        top: offsetTop,
                        behavior: 'smooth'
                    });
                }
            });
        });
    };

    // 9. Parallax
    const initParallax = () => {
        const isMobile = window.innerWidth <= 768;
        
        if (isMobile) return;
        
        const hero = document.querySelector('.hero');
        const heroBlob = document.querySelector('.hero-blob');
        
        if (!hero) return;

        const handleParallax = throttle(() => {
            const scrolled = window.pageYOffset;
            const parallaxSpeed1 = scrolled * 0.5;
            const parallaxSpeed2 = scrolled * 0.3;
            
            if (hero) {
                hero.style.transform = `translateY(${parallaxSpeed1}px)`;
            }
            
            if (heroBlob) {
                heroBlob.style.transform = `translateY(${parallaxSpeed2}px)`;
            }
        }, 16);

        window.addEventListener('scroll', handleParallax, { passive: true });
    };

    // Inicialização
    initScrollAnimations();
    initSmartNav();
    initMobileMenu();
    initCounters();
    initWhatsAppButton();
    initForm();
    initFAQ();
    initSmoothScroll();
    initParallax();

    // Resize handler
    window.addEventListener('resize', debounce(() => {
        // Reinicia parallax no resize
        initParallax();
    }, 250));
});