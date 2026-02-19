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

    // 1. Intersection Observer for animations
    const initAnimationObserver = () => {
        const animateElements = document.querySelectorAll('[data-animate]');
        
        if (!animateElements.length) return;

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

        animateElements.forEach(element => {
            observer.observe(element);
        });
    };

    // 2. Smart Navigation
    const initSmartNav = () => {
        const nav = document.querySelector('nav');
        const navLinks = document.querySelectorAll('nav a[href^="#"]');
        
        if (!nav) return;

        const updateActiveLink = throttle(() => {
            const sections = document.querySelectorAll('section[id]');
            let current = '';

            sections.forEach(section => {
                const sectionTop = section.offsetTop;
                const sectionHeight = section.clientHeight;
                if (window.pageYOffset >= sectionTop - 200) {
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

        const handleScroll = throttle(() => {
            if (window.scrollY > 80) {
                nav.classList.add('scrolled');
            } else {
                nav.classList.remove('scrolled');
            }
            updateActiveLink();
        }, 16);

        window.addEventListener('scroll', handleScroll, { passive: true });
        updateActiveLink();
    };

    // 3. Mobile Menu
    const initMobileMenu = () => {
        const hamburger = document.querySelector('.hamburger');
        const nav = document.querySelector('nav');
        const overlay = document.querySelector('.nav-overlay');
        const drawer = document.querySelector('.nav-drawer');
        const navLinks = document.querySelectorAll('.nav-drawer a');

        if (!hamburger || !nav) return;

        const openMenu = () => {
            hamburger.classList.add('active');
            nav.classList.add('menu-open');
            document.body.style.overflow = 'hidden';
        };

        const closeMenu = () => {
            hamburger.classList.remove('active');
            nav.classList.remove('menu-open');
            document.body.style.overflow = '';
        };

        hamburger.addEventListener('click', () => {
            if (nav.classList.contains('menu-open')) {
                closeMenu();
            } else {
                openMenu();
            }
        });

        if (overlay) {
            overlay.addEventListener('click', closeMenu);
        }

        navLinks.forEach(link => {
            link.addEventListener('click', closeMenu);
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && nav.classList.contains('menu-open')) {
                closeMenu();
            }
        });
    };

    // 4. Animated Counters
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

                    const updateCounter = (currentTime) => {
                        const elapsed = currentTime - startTime;
                        const progress = Math.min(elapsed / duration, 1);
                        const easedProgress = easeOutQuart(progress);
                        const current = Math.floor(easedProgress * target);
                        
                        counter.textContent = current.toLocaleString();
                        
                        if (progress < 1) {
                            requestAnimationFrame(updateCounter);
                        } else {
                            counter.textContent = target.toLocaleString();
                        }
                    };

                    requestAnimationFrame(updateCounter);
                    observer.unobserve(counter);
                }
            });
        }, { threshold: 0.5 });

        counters.forEach(counter => {
            observer.observe(counter);
        });
    };

    // 5. WhatsApp Button
    const initWhatsAppButton = () => {
        const whatsappBtn = document.querySelector('.whatsapp-btn');
        
        if (!whatsappBtn) return;

        setTimeout(() => {
            whatsappBtn.classList.add('show');
        }, 3000);

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
                }, 200);
            }
        });
    };

    // 6. Form Handling
    const initForms = () => {
        const forms = document.querySelectorAll('form');
        
        forms.forEach(form => {
            // Floating labels
            const inputs = form.querySelectorAll('input, textarea');
            inputs.forEach(input => {
                const checkFloating = () => {
                    if (input.value.trim() !== '' || input === document.activeElement) {
                        input.parentElement.classList.add('floating');
                    } else {
                        input.parentElement.classList.remove('floating');
                    }
                };

                input.addEventListener('focus', checkFloating);
                input.addEventListener('blur', checkFloating);
                input.addEventListener('input', checkFloating);
                checkFloating(); // Initial check
            });

            // Phone mask
            const phoneInputs = form.querySelectorAll('input[type="tel"]');
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

            // Form submission
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                
                const submitBtn = form.querySelector('button[type="submit"]');
                let isValid = true;

                // Validate all fields
                inputs.forEach(input => {
                    if (!validateField(input)) {
                        isValid = false;
                    }
                });

                if (!isValid) return;

                // Loading state
                if (submitBtn) {
                    submitBtn.classList.add('loading');
                    submitBtn.disabled = true;
                }

                try {
                    // Simulate form submission
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    
                    // Success state
                    form.classList.add('success');
                    form.reset();
                    
                    // Reset floating labels
                    inputs.forEach(input => {
                        input.parentElement.classList.remove('floating');
                    });
                    
                } catch (error) {
                    console.error('Form submission error:', error);
                } finally {
                    if (submitBtn) {
                        submitBtn.classList.remove('loading');
                        submitBtn.disabled = false;
                    }
                }
            });
        });

        function validateField(field) {
            const value = field.value.trim();
            const type = field.type;
            const required = field.required;
            let isValid = true;
            let errorMessage = '';

            // Clear previous errors
            field.classList.remove('error');
            const errorElement = field.parentElement.querySelector('.error-message');
            if (errorElement) {
                errorElement.remove();
            }

            // Required validation
            if (required && !value) {
                isValid = false;
                errorMessage = 'Este campo é obrigatório';
            }
            // Email validation
            else if (type === 'email' && value) {
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(value)) {
                    isValid = false;
                    errorMessage = 'Digite um email válido';
                }
            }
            // Phone validation
            else if (type === 'tel' && value) {
                const phoneRegex = /^\(\d{2}\) \d{5}-\d{4}$/;
                if (!phoneRegex.test(value)) {
                    isValid = false;
                    errorMessage = 'Digite um telefone válido';
                }
            }

            if (!isValid) {
                field.classList.add('error');
                const errorDiv = document.createElement('div');
                errorDiv.className = 'error-message';
                errorDiv.textContent = errorMessage;
                field.parentElement.appendChild(errorDiv);
            }

            return isValid;
        }
    };

    // 7. FAQ Accordion
    const initFAQ = () => {
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
                        if (otherAnswer) otherAnswer.style.maxHeight = '0';
                        if (otherIcon) otherIcon.style.transform = 'rotate(0deg)';
                    }
                });

                // Toggle current item
                if (isOpen) {
                    item.classList.remove('open');
                    answer.style.maxHeight = '0';
                    if (icon) icon.style.transform = 'rotate(0deg)';
                } else {
                    item.classList.add('open');
                    answer.style.maxHeight = answer.scrollHeight + 'px';
                    if (icon) icon.style.transform = 'rotate(180deg)';
                }
            });
        });
    };

    // 8. Smooth Scroll
    const initSmoothScroll = () => {
        const links = document.querySelectorAll('a[href^="#"]');
        
        links.forEach(link => {
            link.addEventListener('click', (e) => {
                const href = link.getAttribute('href');
                if (href === '#') return;
                
                const target = document.querySelector(href);
                if (!target) return;
                
                e.preventDefault();
                
                const headerHeight = document.querySelector('nav')?.offsetHeight || 0;
                const targetPosition = target.offsetTop - headerHeight - 20;
                
                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            });
        });
    };

    // 9. Parallax Effect
    const initParallax = () => {
        const isMobile = window.innerWidth <= 768;
        if (isMobile) return;

        const hero = document.querySelector('.hero');
        const blob = hero?.querySelector('.hero-blob');
        const background = hero?.querySelector('.hero-bg');
        
        if (!hero) return;

        let ticking = false;

        const updateParallax = () => {
            const scrolled = window.pageYOffset;
            const heroHeight = hero.offsetHeight;
            const scrollProgress = scrolled / heroHeight;

            if (scrollProgress <= 1) {
                if (blob) {
                    const blobTransform = scrolled * 0.5;
                    blob.style.transform = `translateY(${blobTransform}px)`;
                }
                
                if (background) {
                    const bgTransform = scrolled * 0.3;
                    background.style.transform = `translateY(${bgTransform}px)`;
                }
            }
            
            ticking = false;
        };

        const requestParallax = () => {
            if (!ticking) {
                requestAnimationFrame(updateParallax);
                ticking = true;
            }
        };

        window.addEventListener('scroll', requestParallax, { passive: true });

        // Disable parallax on resize if mobile
        window.addEventListener('resize', debounce(() => {
            const newIsMobile = window.innerWidth <= 768;
            if (newIsMobile && blob && background) {
                blob.style.transform = '';
                background.style.transform = '';
                window.removeEventListener('scroll', requestParallax);
            }
        }, 250));
    };

    // Initialize all modules
    initAnimationObserver();
    initSmartNav();
    initMobileMenu();
    initCounters();
    initWhatsAppButton();
    initForms();
    initFAQ();
    initSmoothScroll();
    initParallax();
});