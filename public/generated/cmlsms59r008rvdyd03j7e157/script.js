'use strict';

document.addEventListener('DOMContentLoaded', function() {
    // Utilitários
    function throttle(func, delay) {
        let timeoutId;
        let lastExecTime = 0;
        return function (...args) {
            const currentTime = Date.now();
            if (currentTime - lastExecTime > delay) {
                func.apply(this, args);
                lastExecTime = currentTime;
            } else {
                clearTimeout(timeoutId);
                timeoutId = setTimeout(() => {
                    func.apply(this, args);
                    lastExecTime = Date.now();
                }, delay - (currentTime - lastExecTime));
            }
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

    // 1. IntersectionObserver para animações
    const animationObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const element = entry.target;
                const delay = parseInt(element.dataset.delay) || 0;
                
                setTimeout(() => {
                    element.classList.add('animate-in');
                }, delay);
                
                animationObserver.unobserve(element);
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    });

    // Observar todos os elementos com data-animate
    document.querySelectorAll('[data-animate]').forEach(el => {
        animationObserver.observe(el);
    });

    // 2. Navegação inteligente
    const navbar = document.querySelector('.navbar');
    const navLinks = document.querySelectorAll('.nav-link');

    function updateNavigation() {
        // Adicionar classe scrolled
        if (window.scrollY > 80) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }

        // Atualizar link ativo baseado na seção visível
        const sections = document.querySelectorAll('section[id]');
        let currentSection = '';

        sections.forEach(section => {
            const rect = section.getBoundingClientRect();
            if (rect.top <= 100 && rect.bottom >= 100) {
                currentSection = section.id;
            }
        });

        navLinks.forEach(link => {
            link.removeAttribute('aria-current');
            if (link.getAttribute('href') === `#${currentSection}`) {
                link.setAttribute('aria-current', 'page');
            }
        });
    }

    window.addEventListener('scroll', throttle(updateNavigation, 100), { passive: true });

    // 3. Menu mobile
    const menuToggle = document.querySelector('.menu-toggle');
    const mobileMenu = document.querySelector('.mobile-menu');
    const menuOverlay = document.querySelector('.menu-overlay');
    const body = document.body;

    function openMenu() {
        menuToggle.classList.add('active');
        mobileMenu.classList.add('active');
        menuOverlay.classList.add('active');
        body.classList.add('menu-open');
        menuToggle.setAttribute('aria-expanded', 'true');
    }

    function closeMenu() {
        menuToggle.classList.remove('active');
        mobileMenu.classList.remove('active');
        menuOverlay.classList.remove('active');
        body.classList.remove('menu-open');
        menuToggle.setAttribute('aria-expanded', 'false');
    }

    menuToggle.addEventListener('click', function() {
        if (this.classList.contains('active')) {
            closeMenu();
        } else {
            openMenu();
        }
    });

    menuOverlay.addEventListener('click', closeMenu);

    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && mobileMenu.classList.contains('active')) {
            closeMenu();
        }
    });

    // Fechar menu ao clicar em link
    document.querySelectorAll('.mobile-menu .nav-link').forEach(link => {
        link.addEventListener('click', closeMenu);
    });

    // 4. Contadores animados
    const counters = document.querySelectorAll('[data-count]');
    const counterObserver = new IntersectionObserver((entries) => {
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
                    
                    counter.textContent = currentValue.toLocaleString('pt-BR');
                    
                    if (progress < 1) {
                        requestAnimationFrame(updateCounter);
                    } else {
                        counter.textContent = target.toLocaleString('pt-BR');
                    }
                }

                requestAnimationFrame(updateCounter);
                counterObserver.unobserve(counter);
            }
        });
    }, { threshold: 0.5 });

    counters.forEach(counter => {
        counterObserver.observe(counter);
    });

    // 5. Botão WhatsApp
    const whatsappButton = document.querySelector('.whatsapp-button');
    
    setTimeout(() => {
        whatsappButton.classList.add('show');
    }, 3000);

    // 6. Formulário
    const form = document.querySelector('.contact-form');
    const inputs = form.querySelectorAll('.form-input');
    const phoneInput = form.querySelector('input[type="tel"]');
    const submitBtn = form.querySelector('.submit-btn');

    // Floating labels
    inputs.forEach(input => {
        const label = input.nextElementSibling;
        
        function updateLabel() {
            if (input.value || input === document.activeElement) {
                label.classList.add('floating');
            } else {
                label.classList.remove('floating');
            }
        }

        input.addEventListener('focus', updateLabel);
        input.addEventListener('blur', updateLabel);
        input.addEventListener('input', updateLabel);
        
        // Validação no blur
        input.addEventListener('blur', function() {
            validateField(this);
        });

        // Estado inicial
        updateLabel();
    });

    // Máscara de telefone
    if (phoneInput) {
        phoneInput.addEventListener('input', function() {
            let value = this.value.replace(/\D/g, '');
            value = value.replace(/^(\d{2})(\d)/g, '($1) $2');
            value = value.replace(/(\d)(\d{4})$/, '$1-$2');
            this.value = value;
        });
    }

    function validateField(field) {
        const value = field.value.trim();
        const type = field.type;
        const fieldContainer = field.closest('.form-group');
        let isValid = true;

        // Remove classes anteriores
        fieldContainer.classList.remove('error', 'success');

        if (!value) {
            isValid = false;
        } else if (type === 'email') {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            isValid = emailRegex.test(value);
        } else if (type === 'tel') {
            const phoneRegex = /^\(\d{2}\) \d{5}-\d{4}$/;
            isValid = phoneRegex.test(value);
        }

        fieldContainer.classList.add(isValid ? 'success' : 'error');
        return isValid;
    }

    // Submit do formulário
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // Validar todos os campos
        let isFormValid = true;
        inputs.forEach(input => {
            if (!validateField(input)) {
                isFormValid = false;
            }
        });

        if (!isFormValid) return;

        // Estado loading
        submitBtn.classList.add('loading');
        submitBtn.disabled = true;

        try {
            // Simular envio (substituir pela sua lógica)
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Sucesso
            submitBtn.classList.remove('loading');
            submitBtn.classList.add('success');
            submitBtn.textContent = 'Enviado!';
            
            // Reset após 3 segundos
            setTimeout(() => {
                submitBtn.classList.remove('success');
                submitBtn.textContent = 'Enviar Mensagem';
                submitBtn.disabled = false;
                form.reset();
                inputs.forEach(input => {
                    const label = input.nextElementSibling;
                    label.classList.remove('floating');
                    input.closest('.form-group').classList.remove('success', 'error');
                });
            }, 3000);
            
        } catch (error) {
            submitBtn.classList.remove('loading');
            submitBtn.classList.add('error');
            submitBtn.textContent = 'Erro ao enviar';
            
            setTimeout(() => {
                submitBtn.classList.remove('error');
                submitBtn.textContent = 'Enviar Mensagem';
                submitBtn.disabled = false;
            }, 3000);
        }
    });

    // 7. FAQ Accordion
    const faqItems = document.querySelectorAll('.faq-item');
    
    faqItems.forEach(item => {
        const question = item.querySelector('.faq-question');
        const answer = item.querySelector('.faq-answer');
        const icon = item.querySelector('.faq-icon');
        
        question.addEventListener('click', function() {
            const isOpen = item.classList.contains('active');
            
            // Fechar todos os outros
            faqItems.forEach(otherItem => {
                if (otherItem !== item) {
                    otherItem.classList.remove('active');
                    const otherAnswer = otherItem.querySelector('.faq-answer');
                    const otherIcon = otherItem.querySelector('.faq-icon');
                    otherAnswer.style.maxHeight = null;
                    otherIcon.style.transform = 'rotate(0deg)';
                    otherItem.querySelector('.faq-question').setAttribute('aria-expanded', 'false');
                }
            });
            
            // Toggle atual
            if (isOpen) {
                item.classList.remove('active');
                answer.style.maxHeight = null;
                icon.style.transform = 'rotate(0deg)';
                question.setAttribute('aria-expanded', 'false');
            } else {
                item.classList.add('active');
                answer.style.maxHeight = answer.scrollHeight + 'px';
                icon.style.transform = 'rotate(180deg)';
                question.setAttribute('aria-expanded', 'true');
            }
        });
    });

    // 8. Smooth scroll
    document.querySelectorAll('a[href^="#"]').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            const targetElement = document.querySelector(targetId);
            
            if (targetElement) {
                const offsetTop = targetElement.offsetTop - 80; // Compensar navbar
                window.scrollTo({
                    top: offsetTop,
                    behavior: 'smooth'
                });
            }
        });
    });

    // 9. Parallax (apenas desktop)
    const isMobile = window.innerWidth <= 768;
    
    if (!isMobile) {
        const heroBlob = document.querySelector('.hero-blob');
        const heroBackground = document.querySelector('.hero');
        let ticking = false;

        function updateParallax() {
            const scrolled = window.pageYOffset;
            const rate1 = scrolled * -0.5; // Blob mais lento
            const rate2 = scrolled * -0.3; // Background menos lento
            
            if (heroBlob) {
                heroBlob.style.transform = `translateY(${rate1}px)`;
            }
            
            if (heroBackground) {
                heroBackground.style.backgroundPosition = `center ${rate2}px`;
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

    // Inicialização
    updateNavigation();
});