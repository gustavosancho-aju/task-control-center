/* ========================================
   NEXUS PROTOCOL - JavaScript
   ======================================== */

// ========================================
// SYSTEM TIME
// ========================================

function updateSystemTime() {
    const timeElement = document.getElementById('systemTime');
    if (timeElement) {
        const now = new Date();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        timeElement.textContent = `${hours}:${minutes}:${seconds}`;
    }
}

// Update every second
setInterval(updateSystemTime, 1000);
updateSystemTime(); // Initial call

// ========================================
// ANIMATED COUNTER
// ========================================

function animateCounter(element, target, duration = 2000) {
    const start = 0;
    const increment = target / (duration / 16); // 60fps
    let current = start;

    const timer = setInterval(() => {
        current += increment;
        if (current >= target) {
            element.textContent = target;
            clearInterval(timer);
        } else {
            element.textContent = Math.floor(current);
        }
    }, 16);
}

// ========================================
// STATS ANIMATION
// ========================================

function initStatsCounters() {
    const statValues = document.querySelectorAll('.stat-value');

    statValues.forEach((element, index) => {
        const target = parseInt(element.getAttribute('data-target'));
        if (target) {
            // Stagger the animations
            setTimeout(() => {
                animateCounter(element, target, 1500);
            }, index * 200);
        }
    });
}

// ========================================
// RUNTIME COUNTERS FOR ACTIVE TASKS
// ========================================

function parseTimeString(timeStr) {
    // Parse "00:42:18" format
    const parts = timeStr.split(':');
    return {
        hours: parseInt(parts[0]),
        minutes: parseInt(parts[1]),
        seconds: parseInt(parts[2])
    };
}

function formatTime(hours, minutes, seconds) {
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function updateRuntimeCounters() {
    const timeElements = document.querySelectorAll('.task-time, .card-time');

    timeElements.forEach(element => {
        if (element.textContent.includes('Runtime:')) {
            const timeStr = element.textContent.replace('Runtime: ', '');
            let time = parseTimeString(timeStr);

            // Increment time
            time.seconds++;
            if (time.seconds >= 60) {
                time.seconds = 0;
                time.minutes++;
            }
            if (time.minutes >= 60) {
                time.minutes = 0;
                time.hours++;
            }

            element.textContent = `Runtime: ${formatTime(time.hours, time.minutes, time.seconds)}`;
        } else if (element.textContent.match(/^\d{2}:\d{2}:\d{2}$/)) {
            const timeStr = element.textContent;
            let time = parseTimeString(timeStr);

            // Increment time
            time.seconds++;
            if (time.seconds >= 60) {
                time.seconds = 0;
                time.minutes++;
            }
            if (time.minutes >= 60) {
                time.minutes = 0;
                time.hours++;
            }

            element.textContent = formatTime(time.hours, time.minutes, time.seconds);
        }
    });
}

// Update runtime every second
setInterval(updateRuntimeCounters, 1000);

// ========================================
// PROGRESS BAR ANIMATION
// ========================================

function animateProgressBars() {
    const progressFills = document.querySelectorAll('.progress-fill');

    progressFills.forEach((fill, index) => {
        const targetWidth = fill.style.width;
        fill.style.width = '0%';

        setTimeout(() => {
            fill.style.transition = 'width 1.5s ease-out';
            fill.style.width = targetWidth;
        }, index * 100);
    });
}

// ========================================
// SIMULATE PROGRESS UPDATES
// ========================================

function simulateProgressUpdates() {
    const progressElements = document.querySelectorAll('.task-executing .progress-fill, .card-processing .progress-fill');

    progressElements.forEach(element => {
        const currentWidth = parseFloat(element.style.width);
        if (currentWidth < 100) {
            // Random increment between 0.1% and 0.5%
            const increment = Math.random() * 0.4 + 0.1;
            const newWidth = Math.min(currentWidth + increment, 100);
            element.style.width = `${newWidth.toFixed(1)}%`;

            // Update progress text
            const progressText = element.parentElement.parentElement.querySelector('.progress-text');
            if (progressText) {
                progressText.textContent = `${Math.floor(newWidth)}%`;
            }
        }
    });
}

// Update progress every 2 seconds
setInterval(simulateProgressUpdates, 2000);

// ========================================
// GLITCH EFFECT (Random)
// ========================================

function addGlitchEffect() {
    const glitchElements = ['.logo-text', '.section-title'];

    glitchElements.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(element => {
            if (Math.random() < 0.001) { // 0.1% chance per frame
                element.style.animation = 'glitch 0.3s';
                setTimeout(() => {
                    element.style.animation = '';
                }, 300);
            }
        });
    });
}

setInterval(addGlitchEffect, 100);

// ========================================
// BOARD CARD INTERACTIONS
// ========================================

function initBoardCards() {
    const cards = document.querySelectorAll('.board-card');

    cards.forEach(card => {
        card.addEventListener('click', function() {
            // Add click effect
            this.style.transform = 'scale(0.98)';
            setTimeout(() => {
                this.style.transform = '';
            }, 100);

            // Log action (you can replace this with actual functionality)
            const cardId = this.querySelector('.card-id')?.textContent || 'Unknown';
            console.log(`Card clicked: ${cardId}`);
        });
    });
}

// ========================================
// ADD TASK BUTTON
// ========================================

function initAddTaskButton() {
    const addButton = document.querySelector('.btn-add-task');

    if (addButton) {
        addButton.addEventListener('click', function() {
            // Add click effect
            this.style.transform = 'scale(0.95)';
            setTimeout(() => {
                this.style.transform = '';
            }, 100);

            // Show alert (you can replace this with actual functionality)
            showNotification('NEW TASK PROTOCOL INITIATED');
        });
    }
}

// ========================================
// NOTIFICATION SYSTEM
// ========================================

function showNotification(message) {
    // Create notification element
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 100px;
        right: 2rem;
        background: rgba(0, 255, 65, 0.1);
        border: 2px solid var(--neon-green-bright);
        padding: 1rem 2rem;
        font-family: var(--font-mono);
        font-size: 0.9rem;
        letter-spacing: 2px;
        color: var(--neon-white);
        z-index: 10000;
        box-shadow: 0 0 20px rgba(0, 255, 65, 0.5);
        animation: slideIn 0.3s ease-out;
    `;
    notification.textContent = `[SYSTEM] ${message}`;

    document.body.appendChild(notification);

    // Remove after 3 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-in';
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 3000);
}

// Add notification animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }

    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// ========================================
// TYPING EFFECT FOR LOG ENTRIES
// ========================================

function addTypingEffect() {
    const logEntries = document.querySelectorAll('.log-entry');

    logEntries.forEach((entry, index) => {
        entry.style.opacity = '0';
        entry.style.transform = 'translateX(-20px)';

        setTimeout(() => {
            entry.style.transition = 'all 0.3s ease-out';
            entry.style.opacity = '1';
            entry.style.transform = 'translateX(0)';
        }, index * 100);
    });
}

// ========================================
// RANDOM SYSTEM EVENTS
// ========================================

function generateSystemEvent() {
    const events = [
        'PROCESS #X7429 INITIALIZED',
        'MEMORY OPTIMIZATION COMPLETE',
        'SECURITY SCAN PASSED',
        'DATABASE SYNC IN PROGRESS',
        'NETWORK LATENCY: 12ms',
        'CPU USAGE: 34%',
        'SYSTEM PERFORMANCE: OPTIMAL'
    ];

    if (Math.random() < 0.1) { // 10% chance every interval
        const randomEvent = events[Math.floor(Math.random() * events.length)];
        showNotification(randomEvent);
    }
}

// Generate random events every 15 seconds
setInterval(generateSystemEvent, 15000);

// ========================================
// MATRIX RAIN EFFECT (Optional Enhancement)
// ========================================

function createMatrixRain() {
    const canvas = document.createElement('canvas');
    canvas.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 0;
        opacity: 0.05;
    `;
    document.body.prepend(canvas);

    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const chars = '01アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン';
    const fontSize = 14;
    const columns = canvas.width / fontSize;
    const drops = Array(Math.floor(columns)).fill(1);

    function draw() {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = '#00ff41';
        ctx.font = `${fontSize}px monospace`;

        for (let i = 0; i < drops.length; i++) {
            const text = chars[Math.floor(Math.random() * chars.length)];
            ctx.fillText(text, i * fontSize, drops[i] * fontSize);

            if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
                drops[i] = 0;
            }
            drops[i]++;
        }
    }

    setInterval(draw, 50);

    window.addEventListener('resize', () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    });
}

// ========================================
// INITIALIZATION
// ========================================

document.addEventListener('DOMContentLoaded', function() {
    console.log('[NEXUS PROTOCOL] System initialized');

    // Initialize stats counters
    initStatsCounters();

    // Animate progress bars
    animateProgressBars();

    // Initialize board cards
    initBoardCards();

    // Initialize add task button
    initAddTaskButton();

    // Add typing effect to logs
    addTypingEffect();

    // Create Matrix rain effect (optional - comment out if too distracting)
    createMatrixRain();

    // Show welcome notification
    setTimeout(() => {
        showNotification('SYSTEM ONLINE - ALL PROTOCOLS ACTIVE');
    }, 500);
});

// ========================================
// KEYBOARD SHORTCUTS
// ========================================

document.addEventListener('keydown', function(e) {
    // Ctrl/Cmd + K for quick command
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        showNotification('COMMAND PROTOCOL ACTIVATED');
    }

    // Ctrl/Cmd + N for new task
    if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        showNotification('NEW TASK PROTOCOL INITIATED');
    }
});

// ========================================
// PERFORMANCE MONITORING
// ========================================

console.log('%c[NEXUS PROTOCOL]', 'color: #00ff41; font-weight: bold; font-size: 16px;');
console.log('%cSystem Status: ONLINE', 'color: #00ff41; font-family: monospace;');
console.log('%cSecurity Level: MAXIMUM', 'color: #00ff41; font-family: monospace;');
console.log('%cNeural Interface: ACTIVE', 'color: #00ff41; font-family: monospace;');
