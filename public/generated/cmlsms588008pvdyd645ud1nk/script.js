'use strict';

document.addEventListener('DOMContentLoaded', function() {
    // Utility functions
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

    // Navigation functionality
    function initNavigation() {
        const nav = document.querySelector('.nav');
        const navLinks = document.querySelectorAll('.nav a[href^="#"]');
        
        if (!nav) return;

        // Scroll detection
        const handleScroll = throttle(() => {
            if (window.scrollY > 80) {
                nav.classList.add('scrolled');
            } else {
                nav.classList.remove('scrolled');
            }
            updateActiveNavLink();
        }, 16);

        // Active link detection
        function updateActiveNavLink() {
            const sections = document.querySelectorAll('section[id]');
            let current = '';

            sections.forEach(section => {
                const rect = section.getBoundingClientRect();
                if (rect.top <= 100 && rect.bottom >= 100) {
                    current = section.id;
                }
            });

            navLinks.forEach(link => {
                if (link.getAttribute('href') === `#${current}`) {
                    link.setAttribute('aria-current', 'page');
                } else {
                    link.removeAttribute('aria-current');
                }
            });
        }

        window.addEventListener('scroll', handleScroll, { passive: true });
    }

    // Mobile menu functionality
    function initMobileMenu() {
        const menuToggle = document.querySelector('.menu-toggle');
        const navDrawer = document.querySelector('.nav-drawer');
        const overlay = document.querySelector('.nav-overlay');
        const hamburgerIcon = document.querySelector('.hamburger');
        
        if (!menuToggle || !navDrawer) return;

        let isOpen = false;

        function toggleMenu() {
            isOpen = !isOpen;
            
            if (isOpen) {
                navDrawer.classList.add('active');
                if (overlay) overlay.classList.add('active');
                hamburgerIcon?.classList.add('active');
                document.body.style.overflow = 'hidden';
            } else {
                navDrawer.classList.remove('active');
                if (overlay) overlay.classList.remove('active');
                hamburgerIcon?.classList.remove('active');
                document.body.style.overflow = '';
            }
        }

        function closeMenu() {
            if (isOpen) {
                toggleMenu();
            }
        }

        menuToggle.addEventListener('click', toggleMenu);
        if (overlay) overlay.addEventListener('click', closeMenu);
        
        // Close with Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                closeMenu();
            }
        });

        // Close when clicking nav links
        navDrawer.addEventListener('click', (e) => {
            if (e.target.matches('a[href^="#"]')) {
                closeMenu();
            }
        });
    }

    // Intersection Observer for animations
    function initAnimations() {
        const animatedElements = document.querySelectorAll('[data-animate]');
        
        if (!animatedElements.length) return;

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const delay = parseInt(entry.target.dataset.delay) || 0;
                    
                    setTimeout(() => {
                        entry.target.classList.add('animate-in');
                    }, delay);
                    
                    observer.unobserve(entry.target);
                }
            });
        }, {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        });

        animatedElements.forEach(el => observer.observe(el));
    }

    // Counter animation
    function initCounters() {
        const counters = document.querySelectorAll('[data-count]');
        
        if (!counters.length) return;

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    animateCounter(entry.target);
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.5 });

        counters.forEach(counter => observer.observe(counter));
    }

    function animateCounter(element) {
        const target = parseInt(element.dataset.count);
        const duration = 2000;
        const startTime = performance.now();

        function updateCounter(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easedProgress = easeOutQuart(progress);
            const currentCount = Math.floor(easedProgress * target);
            
            element.textContent = currentCount.toLocaleString();
            
            if (progress < 1) {
                requestAnimationFrame(updateCounter);
            } else {
                element.textContent = target.toLocaleString();
            }
        }

        requestAnimationFrame(updateCounter);
    }

    // WhatsApp button
    function initWhatsAppButton() {
        const whatsappBtn = document.querySelector('.whatsapp-btn');
        
        if (!whatsappBtn) return;

        setTimeout(() => {
            whatsappBtn.classList.add('show');
        }, 3000);

        // Tooltip functionality
        let tooltipTimeout;
        
        whatsappBtn.addEventListener('mouseenter', () => {
            clearTimeout(tooltipTimeout);
            const tooltip = whatsappBtn.querySelector('.tooltip');
            if (tooltip) {
                tooltip.classList.add('show');
            }
        });

        whatsappBtn.addEventListener('mouseleave', () => {
            const tooltip = whatsappBtn.querySelector('.tooltip');
            if (tooltip) {
                tooltipTimeout = setTimeout(() => {
                    tooltip.classList.remove('show');
                }, 300);
            }
        });
    }

    // Form functionality
    function initForms() {
        const forms = document.querySelectorAll('form[data-contact-form]');
        
        forms.forEach(form => {
            initFloatingLabels(form);
            initPhoneMask(form);
            initFormValidation(form);
            initFormSubmit(form);
        });
    }

    function initFloatingLabels(form) {
        const inputs = form.querySelectorAll('.form-field input, .form-field textarea');
        
        inputs.forEach(input => {
            const label = input.parentElement.querySelector('label');
            if (!label) return;

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
            
            // Initial check
            updateLabel();
        });
    }

    function initPhoneMask(form) {
        const phoneInputs = form.querySelectorAll('input[type="tel"]');
        
        phoneInputs.forEach(input => {
            input.addEventListener('input', (e) => {
                let value = e.target.value.replace(/\D/g, '');
                
                if (value.length <= 11) {
                    value = value.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3');
                    value = value.replace(/^(\d{2})(\d{4})(\d{0,4})$/, '($1) $2-$3');
                    value = value.replace(/^(\d{2})(\d{0,5})$/, '($1) $2');
                    value = value.replace(/^(\d{0,2})$/, '($1');
                }
                
                e.target.value = value;
            });
        });
    }

    function initFormValidation(form) {
        const inputs = form.querySelectorAll('input[required], textarea[required]');
        
        inputs.forEach(input => {
            input.addEventListener('blur', () => {
                validateField(input);
            });
        });
    }

    function validateField(field) {
        const fieldContainer = field.parentElement;
        let isValid = true;
        let errorMessage = '';

        // Remove previous error
        fieldContainer.classList.remove('error');
        const existingError = fieldContainer.querySelector('.error-message');
        if (existingError) {
            existingError.remove();
        }

        if (!field.value.trim()) {
            isValid = false;
            errorMessage = 'Este campo é obrigatório';
        } else if (field.type === 'email') {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(field.value)) {
                isValid = false;
                errorMessage = 'Digite um email válido';
            }
        } else if (field.type === 'tel') {
            const phoneRegex = /^\(\d{2}\) \d{4,5}-\d{4}$/;
            if (!phoneRegex.test(field.value)) {
                isValid = false;
                errorMessage = 'Digite um telefone válido';
            }
        }

        if (!isValid) {
            fieldContainer.classList.add('error');
            const errorElement = document.createElement('span');
            errorElement.className = 'error-message';
            errorElement.textContent = errorMessage;
            fieldContainer.appendChild(errorElement);
        }

        return isValid;
    }

    function initFormSubmit(form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const submitBtn = form.querySelector('button[type="submit"]');
            const inputs = form.querySelectorAll('input[required], textarea[required]');
            
            // Validate all fields
            let isValid = true;
            inputs.forEach(input => {
                if (!validateField(input)) {
                    isValid = false;
                }
            });

            if (!isValid) return;

            // Show loading state
            submitBtn.classList.add('loading');
            submitBtn.disabled = true;

            try {
                // Simulate API call
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                // Success state
                submitBtn.classList.remove('loading');
                submitBtn.classList.add('success');
                submitBtn.textContent = 'Enviado com sucesso!';
                
                // Reset form after 3 seconds
                setTimeout(() => {
                    form.reset();
                    submitBtn.classList.remove('success');
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Enviar mensagem';
                    
                    // Reset floating labels
                    inputs.forEach(input => {
                        const label = input.parentElement.querySelector('label');
                        if (label) label.classList.remove('floating');
                    });
                }, 3000);
                
            } catch (error) {
                submitBtn.classList.remove('loading');
                submitBtn.classList.add('error');
                submitBtn.textContent = 'Erro ao enviar';
                
                setTimeout(() => {
                    submitBtn.classList.remove('error');
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Enviar mensagem';
                }, 3000);
            }
        });
    }

    // FAQ accordion
    function initFAQ() {
        const faqItems = document.querySelectorAll('.faq-item');
        
        faqItems.forEach(item => {
            const trigger = item.querySelector('.faq-trigger');
            const content = item.querySelector('.faq-content');
            const icon = item.querySelector('.faq-icon');
            
            if (!trigger || !content) return;

            trigger.addEventListener('click', () => {
                const isActive = item.classList.contains('active');
                
                // Close all other items
                faqItems.forEach(otherItem => {
                    if (otherItem !== item) {
                        otherItem.classList.remove('active');
                        const otherContent = otherItem.querySelector('.faq-content');
                        const otherIcon = otherItem.querySelector('.faq-icon');
                        if (otherContent) otherContent.style.maxHeight = null;
                        if (otherIcon) otherIcon.style.transform = '';
                    }
                });
                
                // Toggle current item
                if (isActive) {
                    item.classList.remove('active');
                    content.style.maxHeight = null;
                    if (icon) icon.style.transform = '';
                } else {
                    item.classList.add('active');
                    content.style.maxHeight = content.scrollHeight + 'px';
                    if (icon) icon.style.transform = 'rotate(180deg)';
                }
            });
        });
    }

    // Smooth scroll for anchor links
    function initSmoothScroll() {
        document.addEventListener('click', (e) => {
            const link = e.target.closest('a[href^="#"]');
            if (!link) return;

            const href = link.getAttribute('href');
            if (href === '#') return;

            const target = document.querySelector(href);
            if (!target) return;

            e.preventDefault();
            
            const navHeight = document.querySelector('.nav')?.offsetHeight || 0;
            const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - navHeight - 20;
            
            window.scrollTo({
                top: targetPosition,
                behavior: 'smooth'
            });
        });
    }

    // Parallax effect
    function initParallax() {
        if (window.innerWidth <= 768) return; // Disabled on mobile
        
        const heroSection = document.querySelector('.hero');
        const heroBlob = document.querySelector('.hero-blob');
        const heroBackground = document.querySelector('.hero-bg');
        
        if (!heroSection) return;

        let ticking = false;

        function updateParallax() {
            const scrolled = window.pageYOffset;
            const heroHeight = heroSection.offsetHeight;
            const parallaxSpeed1 = scrolled * 0.3;
            const parallaxSpeed2 = scrolled * 0.1;
            
            if (scrolled < heroHeight) {
                if (heroBlob) {
                    heroBlob.style.transform = `translateY(${parallaxSpeed1}px)`;
                }
                if (heroBackground) {
                    heroBackground.style.transform = `translateY(${parallaxSpeed2}px)`;
                }
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
        
        // Disable on resize if mobile
        window.addEventListener('resize', debounce(() => {
            if (window.innerWidth <= 768) {
                if (heroBlob) heroBlob.style.transform = '';
                if (heroBackground) heroBackground.style.transform = '';
            }
        }, 250));
    }

    // Initialize all functionality
    initNavigation();
    initMobileMenu();
    initAnimations();
    initCounters();
    initWhatsAppButton();
    initForms();
    initFAQ();
    initSmoothScroll();
    initParallax();

    // Add CSS classes for animations
    const style = document.createElement('style');
    style.textContent = `
        [data-animate] {
            opacity: 0;
            transform: translateY(30px);
            transition: opacity 0.6s ease, transform 0.6s ease;
        }
        [data-animate].animate-in {
            opacity: 1;
            transform: translateY(0);
        }
        .whatsapp-btn {
            transform: scale(0);
            transition: transform 0.3s ease;
        }
        .whatsapp-btn.show {
            transform: scale(1);
        }
        .tooltip {
            opacity: 0;
            transform: translateX(10px);
            transition: opacity 0.2s ease, transform 0.2s ease;
        }
        .tooltip.show {
            opacity: 1;
            transform: translateX(0);
        }
        .form-field.error input,
        .form-field.error textarea {
            border-color: #ef4444;
        }
        .error-message {
            color: #ef4444;
            font-size: 0.875rem;
            margin-top: 0.25rem;
            display: block;
        }
        button.loading {
            opacity: 0.7;
            pointer-events: none;
        }
        button.success {
            background-color: #10b981;
        }
        button.error {
            background-color: #ef4444;
        }
        .faq-content {
            max-height: 0;
            overflow: hidden;
            transition: max-height 0.3s ease;
        }
        .faq-icon {
            transition: transform 0.3s ease;
        }
        .nav {
            transition: all 0.3s ease;
        }
        .hamburger span {
            transition: all 0.3s ease;
        }
        .hamburger.active span:nth-child(1) {
            transform: rotate(45deg) translate(5px, 5px);
        }
        .hamburger.active span:nth-child(2) {
            opacity: 0;
        }
        .hamburger.active span:nth-child(3) {
            transform: rotate(-45deg) translate(7px, -6px);
        }
    `;
    document.head.appendChild(style);
});