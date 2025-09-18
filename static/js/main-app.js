// Trading Dashboard JavaScript - Red, Black, Silver Theme
class TradingDashboard {
    constructor() {
        this.quotes = [
            { id: 1, quote: "The stock market is filled with individuals who know the price of everything, but the value of nothing.", author: "Philip Fisher", category: "Investment Philosophy" },
            { id: 2, quote: "Cut your losses short and let your winners run.", author: "David Ricardo", category: "Risk Management" },
            { id: 3, quote: "In the short run, the market is a voting machine but in the long run, it is a weighing machine.", author: "Benjamin Graham", category: "Market Wisdom" },
            { id: 4, quote: "Buy the rumor, sell the news.", author: "Wall Street Wisdom", category: "Market Timing" },
            { id: 5, quote: "Risk comes from not knowing what you're doing.", author: "Warren Buffett", category: "Investment Philosophy" },
            { id: 6, quote: "The four most dangerous words in investing are: 'This time it's different.'", author: "Sir John Templeton", category: "Market History" },
            { id: 7, quote: "Time in the market beats timing the market.", author: "Ken Fisher", category: "Long-term Investing" },
            { id: 8, quote: "Never invest in a business you cannot understand.", author: "Warren Buffett", category: "Due Diligence" },
            { id: 9, quote: "The market can remain irrational longer than you can remain solvent.", author: "John Maynard Keynes", category: "Market Psychology" },
            { id: 10, quote: "Bulls make money, bears make money, but pigs get slaughtered.", author: "Wall Street Proverb", category: "Greed Control" }
        ];
        this.currentQuoteIndex = 0;
        this.quoteInterval = null;
        this.isMobileMenuOpen = false;
        this.init();
    }

    init() {
        this.initializeClock();
        this.initializeMobileMenu();
        this.initializeQuotes();
        this.initializeFeatureCards();
        this.initializeContactButton();
        this.initializeSidebarLinks();
        this.initializeKeyboardNavigation();
        // Start auto-rotating quotes
        this.startQuoteRotation();
        console.log('🚀 SageForge Trading Dashboard initialized');
    }



    // Live Clock Functionality
    initializeClock() {
        const clockElement = document.getElementById('live-clock');
        const updateClock = () => {
            const now = new Date();
            const timeString = now.toLocaleTimeString('en-US', {
                hour12: true,
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                timeZone: 'Asia/Kolkata'
            });
            if (clockElement) {
                clockElement.textContent = timeString;
            }
        };
        // Update immediately and then every second
        updateClock();
        setInterval(updateClock, 1000);
    }

    // Mobile Menu Functionality
    initializeMobileMenu() {
        const mobileMenuBtn = document.getElementById('mobile-menu-btn');
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('mobile-menu-overlay');

        const toggleMenu = () => {
            this.isMobileMenuOpen = !this.isMobileMenuOpen;
            sidebar.classList.toggle('active', this.isMobileMenuOpen);
            overlay.classList.toggle('active', this.isMobileMenuOpen);
            
            // Toggle ARIA attributes
            mobileMenuBtn.setAttribute('aria-expanded', this.isMobileMenuOpen);
            sidebar.setAttribute('aria-hidden', !this.isMobileMenuOpen);
            
            // Update menu icon
            const icon = mobileMenuBtn.querySelector('.material-icons');
            if (icon) {
                icon.textContent = this.isMobileMenuOpen ? 'close' : 'menu';
            }
            console.log(`Mobile menu ${this.isMobileMenuOpen ? 'opened' : 'closed'}`);
        };

        const closeMenu = () => {
            if (this.isMobileMenuOpen) {
                this.isMobileMenuOpen = false;
                sidebar.classList.remove('active');
                overlay.classList.remove('active');
                mobileMenuBtn.setAttribute('aria-expanded', 'false');
                sidebar.setAttribute('aria-hidden', 'true');
                const icon = mobileMenuBtn.querySelector('.material-icons');
                if (icon) {
                    icon.textContent = 'menu';
                }
                console.log('Mobile menu closed');
            }
        };

        // Mobile menu button click
        if (mobileMenuBtn) {
            mobileMenuBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                toggleMenu();
            });
        }

        // Overlay click to close
        if (overlay) {
            overlay.addEventListener('click', closeMenu);
        }

        // Close menu on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isMobileMenuOpen) {
                closeMenu();
            }
        });

        // Close menu on window resize if mobile menu is open
        window.addEventListener('resize', () => {
            if (window.innerWidth > 991 && this.isMobileMenuOpen) {
                closeMenu();
            }
        });

        // Initialize menu state
        if (mobileMenuBtn) {
            mobileMenuBtn.setAttribute('aria-expanded', 'false');
        }
        if (sidebar) {
            sidebar.setAttribute('aria-hidden', 'true');
        }
    }

    // Sidebar Links Functionality
    initializeSidebarLinks() {
        const sidebarLinks = document.querySelectorAll('.sidebar-link');
        sidebarLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                const linkText = link.querySelector('.sidebar-text');
                const linkTitle = link.getAttribute('title') || (linkText ? linkText.textContent : 'Link');

                // Check if this is the sentiment analysis link
                if (link.dataset.path === 'sentiment' || linkTitle.includes('Sentimental')) {
                    e.preventDefault();
                    this.navigateToSentiment();
                    return;
                }

                // Show notification for other sidebar link clicks
                this.showNotification(`Opening ${linkTitle}...`, 'info');

                // Add visual feedback
                link.style.transform = 'scale(0.98)';
                setTimeout(() => {
                    link.style.transform = '';
                }, 150);

                console.log(`Sidebar link clicked: ${linkTitle}`);

                // Close mobile menu after clicking a link
                if (this.isMobileMenuOpen && window.innerWidth <= 991) {
                    setTimeout(() => {
                        const sidebar = document.getElementById('sidebar');
                        const overlay = document.getElementById('mobile-menu-overlay');
                        const mobileMenuBtn = document.getElementById('mobile-menu-btn');
                        if (sidebar && overlay && mobileMenuBtn) {
                            sidebar.classList.remove('active');
                            overlay.classList.remove('active');
                            mobileMenuBtn.setAttribute('aria-expanded', 'false');
                            const icon = mobileMenuBtn.querySelector('.material-icons');
                            if (icon) {
                                icon.textContent = 'menu';
                            }
                        }
                        this.isMobileMenuOpen = false;
                    }, 100);
                }
            });
        });
    }

    // Quote System
    initializeQuotes() {
        this.createQuoteIndicators();
        this.displayQuote(this.currentQuoteIndex);
        this.initializeQuoteNavigation();
    }

    createQuoteIndicators() {
        const indicatorsContainer = document.getElementById('quote-indicators');
        if (!indicatorsContainer) return;

        indicatorsContainer.innerHTML = '';
        this.quotes.forEach((_, index) => {
            const indicator = document.createElement('div');
            indicator.className = `quote-indicator ${index === 0 ? 'active' : ''}`;
            indicator.addEventListener('click', () => {
                this.showQuote(index);
                this.resetQuoteRotation();
            });
            indicatorsContainer.appendChild(indicator);
        });
    }

    displayQuote(index) {
        const quoteElement = document.getElementById('current-quote');
        if (!quoteElement) return;

        const quote = this.quotes[index];
        if (!quote) return;

        // Add fade out class
        quoteElement.classList.add('fade-out');

        setTimeout(() => {
            quoteElement.innerHTML = `
                <div class="quote-text">"${quote.quote}"</div>
                <div class="quote-author">— ${quote.author}</div>
                <div class="quote-category">${quote.category}</div>
            `;
            // Remove fade out class
            quoteElement.classList.remove('fade-out');
            this.updateQuoteIndicators(index);
        }, 200);
    }

    updateQuoteIndicators(activeIndex) {
        const indicators = document.querySelectorAll('.quote-indicator');
        indicators.forEach((indicator, index) => {
            indicator.classList.toggle('active', index === activeIndex);
        });
    }

    showQuote(index) {
        this.currentQuoteIndex = index;
        this.displayQuote(index);
    }

    nextQuote() {
        this.currentQuoteIndex = (this.currentQuoteIndex + 1) % this.quotes.length;
        this.displayQuote(this.currentQuoteIndex);
    }

    previousQuote() {
        this.currentQuoteIndex = this.currentQuoteIndex === 0 ? this.quotes.length - 1 : this.currentQuoteIndex - 1;
        this.displayQuote(this.currentQuoteIndex);
    }

    initializeQuoteNavigation() {
        const prevBtn = document.getElementById('prev-quote');
        const nextBtn = document.getElementById('next-quote');

        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                this.previousQuote();
                this.resetQuoteRotation();
                this.showNotification('Previous quote', 'info');
            });
        }

        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                this.nextQuote();
                this.resetQuoteRotation();
                this.showNotification('Next quote', 'info');
            });
        }
    }

    startQuoteRotation() {
        // Only start rotation if quotes panel exists
        if (document.getElementById('current-quote')) {
            this.quoteInterval = setInterval(() => {
                this.nextQuote();
            }, 8000); // Rotate every 8 seconds
        }
    }

    resetQuoteRotation() {
        if (this.quoteInterval) {
            clearInterval(this.quoteInterval);
        }
        this.startQuoteRotation();
    }

    // Feature Cards
    initializeFeatureCards() {
        const featureCards = document.querySelectorAll('.feature-card');
        featureCards.forEach(card => {
            card.addEventListener('click', () => {
                const path = card.dataset.path;
                const title = card.querySelector('.feature-title').textContent;

                // Check if this is the sentiment analysis card
                if (path === 'sentiment') {
                    this.navigateToSentiment();
                    return;
                }

                // Show "coming soon" for other features
                this.showNotification(`${title} feature coming soon!`, 'info');

                // Add click animation
                card.style.transform = 'scale(0.98)';
                setTimeout(() => {
                    card.style.transform = '';
                }, 150);

                console.log(`Feature clicked: ${title} (${path})`);
            });

            // Add keyboard support
            card.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    card.click();
                }
            });

            // Make cards focusable
            card.setAttribute('tabindex', '0');
            card.setAttribute('role', 'button');
        });
    }

    // Contact Button
    initializeContactButton() {
        const contactBtn = document.querySelector('.contact-btn');
        if (contactBtn) {
            contactBtn.addEventListener('click', () => {
                this.showNotification('Contact form will open here!', 'info');
                // Add click animation
                contactBtn.style.transform = 'scale(0.95)';
                setTimeout(() => {
                    contactBtn.style.transform = '';
                }, 150);
                console.log('Contact button clicked');
            });
        }
    }

    // Notification System
    showNotification(message, type = 'info') {
        const toast = document.getElementById('notification-toast');
        const messageElement = document.getElementById('notification-message');
        const iconElement = toast ? toast.querySelector('.notification-icon') : null;

        if (!toast || !messageElement || !iconElement) {
            console.log(`Notification: ${message}`);
            return;
        }

        // Set message
        messageElement.textContent = message;

        // Set icon based on type
        const icons = {
            'info': 'info',
            'success': 'check_circle',
            'warning': 'warning',
            'error': 'error'
        };
        iconElement.textContent = icons[type] || 'info';

        // Show toast
        toast.classList.add('show');

        // Auto-hide after 3 seconds
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);

        console.log(`Notification shown: ${message} (${type})`);
    }

    // Keyboard Navigation
    initializeKeyboardNavigation() {
        document.addEventListener('keydown', (e) => {
            // Quote navigation with arrow keys (when focused on quotes panel)
            if (document.activeElement && document.activeElement.closest('.quotes-panel')) {
                if (e.key === 'ArrowLeft') {
                    e.preventDefault();
                    this.previousQuote();
                    this.resetQuoteRotation();
                } else if (e.key === 'ArrowRight') {
                    e.preventDefault();
                    this.nextQuote();
                    this.resetQuoteRotation();
                }
            }

            // Global shortcuts
            if (e.ctrlKey || e.metaKey) {
                switch (e.key) {
                    case '/':
                        e.preventDefault();
                        this.focusFirstFeatureCard();
                        break;
                    case 'm':
                        e.preventDefault();
                        if (window.innerWidth <= 991) {
                            const mobileMenuBtn = document.getElementById('mobile-menu-btn');
                            if (mobileMenuBtn) {
                                mobileMenuBtn.click();
                            }
                        }
                        break;
                }
            }
        });
    }

    focusFirstFeatureCard() {
        const firstCard = document.querySelector('.feature-card');
        if (firstCard) {
            firstCard.focus();
        }
    }

    // Utility Methods
    debounce(func, wait) {
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

    // Cleanup method
    destroy() {
        if (this.quoteInterval) {
            clearInterval(this.quoteInterval);
        }
    }
}

// Performance optimization: Lazy loading and smooth scrolling
document.addEventListener('DOMContentLoaded', () => {
    // Initialize the dashboard
    window.tradingDashboard = new TradingDashboard();

    // Add smooth scrolling to all internal links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });

    // Add loading states for external links
    document.querySelectorAll('a[href^="http"]').forEach(link => {
        link.addEventListener('click', function(e) {
            const linkText = this.querySelector('.sidebar-text');
            if (linkText) {
                const originalText = linkText.textContent;
                linkText.textContent = 'Opening...';
                setTimeout(() => {
                    linkText.textContent = originalText;
                }, 2000);
            }

            // Show notification for external links
            if (window.tradingDashboard) {
                const title = this.getAttribute('title') || 'External Link';
                window.tradingDashboard.showNotification(`Opening ${title}...`, 'info');
            }
        });
    });

    // Debug: Log when DOM is ready
    console.log('DOM Content Loaded - Dashboard initializing...');
});

// Handle page visibility changes (pause/resume quote rotation)
document.addEventListener('visibilitychange', () => {
    if (window.tradingDashboard) {
        if (document.hidden) {
            // Page is hidden, pause quote rotation
            if (window.tradingDashboard.quoteInterval) {
                clearInterval(window.tradingDashboard.quoteInterval);
            }
            console.log('Page hidden - pausing quote rotation');
        } else {
            // Page is visible, resume quote rotation
            window.tradingDashboard.startQuoteRotation();
            console.log('Page visible - resuming quote rotation');
        }
    }
});

// Handle window resize for responsive behavior
window.addEventListener('resize', () => {
    if (window.tradingDashboard) {
        console.log('Window resized:', window.innerWidth, 'x', window.innerHeight);
    }
});

// Error handling
window.addEventListener('error', (e) => {
    console.error('Application error:', e.error);
    if (window.tradingDashboard) {
        window.tradingDashboard.showNotification('An error occurred', 'error');
    }
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (window.tradingDashboard) {
        window.tradingDashboard.destroy();
    }
});

// Export for potential module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TradingDashboard;
}

// Debug: Add global access to dashboard instance
window.debugDashboard = () => {
    if (window.tradingDashboard) {
        console.log('Dashboard instance:', window.tradingDashboard);
        console.log('Current quote index:', window.tradingDashboard.currentQuoteIndex);
        console.log('Mobile menu open:', window.tradingDashboard.isMobileMenuOpen);
    }
};