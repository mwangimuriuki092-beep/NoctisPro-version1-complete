/**
 * Session Timeout Management for NoctisPro PACS
 * Handles automatic logout after inactivity
 */

class SessionTimeoutManager {
    constructor(timeoutMinutes = 30, warningMinutes = 5) {
        this.timeoutDuration = timeoutMinutes * 60 * 1000; // Convert to milliseconds
        this.warningDuration = warningMinutes * 60 * 1000;
        this.warningTimer = null;
        this.logoutTimer = null;
        this.warningShown = false;
        this.isActive = true;
        
        this.init();
    }
    
    init() {
        // Events that indicate user activity
        this.activityEvents = [
            'mousedown', 'mousemove', 'keypress', 'scroll', 
            'touchstart', 'click', 'focus'
        ];
        
        // Bind activity listeners
        this.activityEvents.forEach(event => {
            document.addEventListener(event, this.resetTimeout.bind(this), true);
        });
        
        // Add window close/unload handler to logout
        window.addEventListener('beforeunload', this.handleWindowClose.bind(this));
        window.addEventListener('unload', this.handleWindowClose.bind(this));
        
        // Add visibility change handler for tab switching
        document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
        
        // Start the timeout
        this.resetTimeout();
        
        // Check session status periodically
        this.startSessionCheck();
    }
    
    resetTimeout() {
        if (!this.isActive) return;
        
        // Clear existing timers
        if (this.warningTimer) clearTimeout(this.warningTimer);
        if (this.logoutTimer) clearTimeout(this.logoutTimer);
        
        // Hide warning if shown
        this.hideWarning();
        this.warningShown = false;
        
        // Set warning timer
        this.warningTimer = setTimeout(() => {
            this.showWarning();
        }, this.timeoutDuration - this.warningDuration);
        
        // Set logout timer
        this.logoutTimer = setTimeout(() => {
            this.performLogout();
        }, this.timeoutDuration);
    }
    
    showWarning() {
        if (this.warningShown) return;
        this.warningShown = true;
        
        // Create warning modal
        const modal = document.createElement('div');
        modal.id = 'sessionWarningModal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.7);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 99999;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        `;
        
        const warningBox = document.createElement('div');
        warningBox.style.cssText = `
            background: var(--card-bg, #252525);
            border: 1px solid var(--border-color, #404040);
            border-radius: 12px;
            padding: 30px;
            max-width: 400px;
            text-align: center;
            color: var(--text-primary, #ffffff);
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
        `;
        
        const remainingMinutes = Math.ceil(this.warningDuration / 60000);
        
        warningBox.innerHTML = `
            <div style="font-size: 48px; color: var(--warning-color, #ffaa00); margin-bottom: 20px;">
                <i class="fas fa-clock"></i>
            </div>
            <h3 style="margin: 0 0 15px 0; color: var(--warning-color, #ffaa00);">
                Session Expiring Soon
            </h3>
            <p style="margin: 0 0 20px 0; color: var(--text-secondary, #b3b3b3);">
                Your session will expire in <strong>${remainingMinutes} minutes</strong> due to inactivity.
            </p>
            <p style="margin: 0 0 25px 0; font-size: 14px; color: var(--text-muted, #666666);">
                Any unsaved work may be lost.
            </p>
            <div style="display: flex; gap: 15px; justify-content: center;">
                <button id="extendSessionBtn" style="
                    padding: 12px 24px;
                    background: var(--accent-color, #00d4ff);
                    color: white;
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                    font-weight: bold;
                ">
                    <i class="fas fa-clock"></i> Extend Session
                </button>
                <button id="logoutNowBtn" style="
                    padding: 12px 24px;
                    background: var(--danger-color, #ff4444);
                    color: white;
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                ">
                    <i class="fas fa-sign-out-alt"></i> Logout Now
                </button>
            </div>
            <div id="countdownDisplay" style="
                margin-top: 20px;
                font-size: 18px;
                font-weight: bold;
                color: var(--warning-color, #ffaa00);
            "></div>
        `;
        
        modal.appendChild(warningBox);
        document.body.appendChild(modal);
        
        // Add event listeners
        document.getElementById('extendSessionBtn').addEventListener('click', () => {
            this.extendSession();
        });
        
        document.getElementById('logoutNowBtn').addEventListener('click', () => {
            this.performLogout();
        });
        
        // Start countdown
        this.startCountdown();
    }
    
    startCountdown() {
        const countdownDisplay = document.getElementById('countdownDisplay');
        if (!countdownDisplay) return;
        
        const updateCountdown = () => {
            const remaining = Math.max(0, Math.ceil(this.warningDuration / 1000));
            const minutes = Math.floor(remaining / 60);
            const seconds = remaining % 60;
            
            countdownDisplay.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
            
            if (remaining > 0) {
                setTimeout(updateCountdown, 1000);
                this.warningDuration -= 1000;
            }
        };
        
        updateCountdown();
    }
    
    hideWarning() {
        const modal = document.getElementById('sessionWarningModal');
        if (modal && modal.parentNode) {
            modal.parentNode.removeChild(modal);
        }
    }
    
    extendSession() {
        // Make AJAX request to extend session
        fetch('/accounts/extend-session/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': this.getCookie('csrftoken')
            },
            credentials: 'same-origin'
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                this.hideWarning();
                this.resetTimeout();
                this.showToast('Session extended successfully', 'success');
            } else {
                this.showToast('Failed to extend session', 'error');
                this.performLogout();
            }
        })
        .catch(error => {
            console.error('Session extension error:', error);
            this.performLogout();
        });
    }
    
    performLogout() {
        this.isActive = false;
        
        // Clear timers
        if (this.warningTimer) clearTimeout(this.warningTimer);
        if (this.logoutTimer) clearTimeout(this.logoutTimer);
        
        // Show logout message
        this.showLogoutMessage();
        
        // Redirect to login after a short delay
        setTimeout(() => {
            window.location.href = '/login/?timeout=1';
        }, 3000);
    }
    
    showLogoutMessage() {
        // Remove warning modal if present
        this.hideWarning();
        
        // Create logout message
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.9);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 99999;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        `;
        
        const messageBox = document.createElement('div');
        messageBox.style.cssText = `
            background: var(--card-bg, #252525);
            border: 1px solid var(--border-color, #404040);
            border-radius: 12px;
            padding: 40px;
            text-align: center;
            color: var(--text-primary, #ffffff);
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
        `;
        
        messageBox.innerHTML = `
            <div style="font-size: 64px; color: var(--danger-color, #ff4444); margin-bottom: 20px;">
                <i class="fas fa-sign-out-alt"></i>
            </div>
            <h2 style="margin: 0 0 15px 0; color: var(--danger-color, #ff4444);">
                Session Expired
            </h2>
            <p style="margin: 0 0 20px 0; color: var(--text-secondary, #b3b3b3);">
                You have been logged out due to inactivity.
            </p>
            <p style="margin: 0; font-size: 14px; color: var(--text-muted, #666666);">
                Redirecting to login page...
            </p>
            <div style="margin-top: 20px;">
                <div class="spinner" style="
                    border: 2px solid var(--border-color, #404040);
                    border-top: 2px solid var(--accent-color, #00d4ff);
                    border-radius: 50%;
                    width: 30px;
                    height: 30px;
                    animation: spin 1s linear infinite;
                    margin: 0 auto;
                "></div>
            </div>
        `;
        
        modal.appendChild(messageBox);
        document.body.appendChild(modal);
        
        // Add spinner animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        `;
        document.head.appendChild(style);
    }
    
    startSessionCheck() {
        // Check session status every 5 minutes
        setInterval(() => {
            if (!this.isActive) return;
            
            fetch('/accounts/session-status/', {
                method: 'GET',
                credentials: 'same-origin'
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                return response.json();
            })
            .then(data => {
                if (!data.valid) {
                    this.performLogout();
                }
            })
            .catch(error => {
                console.warn('Session check failed:', error);
                // Only log out on authentication-related errors (401, 403)
                // Don't log out on network errors or server issues
                if (error.message.includes('401') || error.message.includes('403')) {
                    this.performLogout();
                }
            });
        }, 5 * 60 * 1000); // 5 minutes
    }
    
    getCookie(name) {
        let cookieValue = null;
        if (document.cookie && document.cookie !== '') {
            const cookies = document.cookie.split(';');
            for (let i = 0; i < cookies.length; i++) {
                const cookie = cookies[i].trim();
                if (cookie.substring(0, name.length + 1) === (name + '=')) {
                    cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                    break;
                }
            }
        }
        return cookieValue;
    }
    
    showToast(message, type = 'info') {
        if (window.showToast) {
            window.showToast(message, type);
        } else {
            console.log(`${type.toUpperCase()}: ${message}`);
        }
    }
    
    handleWindowClose(event) {
        // Log out user when window closes
        if (this.isActive) {
            // Use sendBeacon for reliable logout on page unload
            const logoutUrl = '/accounts/logout/';
            const csrfToken = this.getCookie('csrftoken');
            
            // Use navigator.sendBeacon for reliable async request
            if (navigator.sendBeacon) {
                const formData = new FormData();
                formData.append('csrfmiddlewaretoken', csrfToken);
                navigator.sendBeacon(logoutUrl, formData);
            } else {
                // Fallback to synchronous XMLHttpRequest
                const xhr = new XMLHttpRequest();
                xhr.open('POST', logoutUrl, false); // Synchronous
                xhr.setRequestHeader('X-CSRFToken', csrfToken);
                xhr.send();
            }
        }
    }
    
    handleVisibilityChange() {
        // Pause/resume timeout based on visibility
        if (document.hidden) {
            // Tab is hidden - we could pause the timeout or leave it running
            console.log('Tab hidden - timeout continues');
        } else {
            // Tab is visible - reset activity
            this.resetTimeout();
        }
    }
    
    destroy() {
        this.isActive = false;
        
        // Remove event listeners
        this.activityEvents.forEach(event => {
            document.removeEventListener(event, this.resetTimeout.bind(this), true);
        });
        
        window.removeEventListener('beforeunload', this.handleWindowClose.bind(this));
        window.removeEventListener('unload', this.handleWindowClose.bind(this));
        document.removeEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
        
        // Clear timers
        if (this.warningTimer) clearTimeout(this.warningTimer);
        if (this.logoutTimer) clearTimeout(this.logoutTimer);
        
        // Remove modals
        this.hideWarning();
    }
}

// Initialize session timeout when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Only initialize on authenticated pages (not login page)
    if (!window.location.pathname.includes('/login/')) {
        window.sessionTimeout = new SessionTimeoutManager(30, 5); // 30 min timeout, 5 min warning
    }
});