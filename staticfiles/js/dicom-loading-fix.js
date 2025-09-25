/**
 * DICOM Loading Fix - Enhanced error handling and image loading
 * Fixes network errors, image visibility, and provides better user feedback
 */

class DicomLoadingFix {
    constructor() {
        this.loadingQueue = new Map();
        this.failedLoads = new Set();
        this.retryAttempts = new Map();
        this.maxRetries = 3;
        this.init();
    }

    init() {
        // Override global functions with enhanced versions
        this.setupEnhancedLoading();
        this.setupErrorRecovery();
        this.setupNetworkMonitoring();
        console.log('DICOM Loading Fix initialized');
    }

    setupEnhancedLoading() {
        // Enhanced image loading with better error handling
        window.enhancedLoadImage = async (imageId, imageUrl) => {
            try {
                if (this.loadingQueue.has(imageId)) {
                    return await this.loadingQueue.get(imageId);
                }

                const loadPromise = this.loadImageWithRetry(imageId, imageUrl);
                this.loadingQueue.set(imageId, loadPromise);
                
                const result = await loadPromise;
                this.loadingQueue.delete(imageId);
                return result;
                
            } catch (error) {
                this.loadingQueue.delete(imageId);
                this.handleLoadError(imageId, error);
                throw error;
            }
        };

        // Enhanced study loading
        window.enhancedLoadStudy = async (studyId) => {
            try {
                this.showLoadingIndicator(`Loading study ${studyId}...`);
                
                const response = await this.fetchWithRetry(`/dicom-viewer/api/study/${studyId}/data/`);
                const studyData = await response.json();
                
                this.hideLoadingIndicator();
                this.showSuccessMessage(`Study loaded: ${studyData.patient_name || 'Unknown Patient'}`);
                
                return studyData;
                
            } catch (error) {
                this.hideLoadingIndicator();
                this.showErrorMessage(`Failed to load study: ${error.message}`);
                throw error;
            }
        };
    }

    async loadImageWithRetry(imageId, imageUrl, retryCount = 0) {
        try {
            const img = await this.createImageElement(imageUrl);
            this.retryAttempts.delete(imageId);
            this.failedLoads.delete(imageId);
            return img;
            
        } catch (error) {
            if (retryCount < this.maxRetries) {
                console.warn(`Image load failed, retrying ${retryCount + 1}/${this.maxRetries}:`, error.message);
                
                // Progressive backoff delay
                const delay = Math.min(1000 * Math.pow(2, retryCount), 5000);
                await this.delay(delay);
                
                this.retryAttempts.set(imageId, retryCount + 1);
                return await this.loadImageWithRetry(imageId, imageUrl, retryCount + 1);
            } else {
                this.failedLoads.add(imageId);
                throw new Error(`Failed to load image after ${this.maxRetries} attempts: ${error.message}`);
            }
        }
    }

    createImageElement(imageUrl) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            let timeoutId;
            
            img.onload = () => {
                clearTimeout(timeoutId);
                resolve(img);
            };
            
            img.onerror = () => {
                clearTimeout(timeoutId);
                reject(new Error(`Failed to load image: ${imageUrl}`));
            };
            
            // Set timeout for image loading
            timeoutId = setTimeout(() => {
                img.src = ''; // Cancel loading
                reject(new Error('Image load timeout'));
            }, 15000);
            
            // Configure image loading
            img.crossOrigin = 'anonymous';
            img.src = imageUrl;
        });
    }

    async fetchWithRetry(url, options = {}, retryCount = 0) {
        const defaultOptions = {
            method: 'GET',
            headers: {
                'X-Requested-With': 'XMLHttpRequest',
                'Accept': 'application/json',
                'X-CSRFToken': this.getCSRFToken(),
                ...options.headers
            },
            credentials: 'same-origin',
            ...options
        };

        try {
            const response = await fetch(url, defaultOptions);
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
            }
            
            return response;
            
        } catch (error) {
            if (retryCount < this.maxRetries && this.isRetryableError(error)) {
                console.warn(`Fetch failed, retrying ${retryCount + 1}/${this.maxRetries}:`, error.message);
                
                const delay = Math.min(1000 * Math.pow(2, retryCount), 5000);
                await this.delay(delay);
                
                return await this.fetchWithRetry(url, options, retryCount + 1);
            } else {
                throw error;
            }
        }
    }

    isRetryableError(error) {
        // Retry on network errors, timeouts, and 5xx server errors
        return error.message.includes('NetworkError') ||
               error.message.includes('timeout') ||
               error.message.includes('500') ||
               error.message.includes('502') ||
               error.message.includes('503') ||
               error.message.includes('504');
    }

    setupErrorRecovery() {
        // Global error handler for unhandled promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            if (event.reason && event.reason.message && 
                event.reason.message.includes('Failed to load image')) {
                console.warn('Unhandled image load error:', event.reason);
                this.showErrorMessage('Image loading failed. Retrying...');
                event.preventDefault();
            }
        });

        // Catch and handle fetch errors
        const originalFetch = window.fetch;
        window.fetch = async (...args) => {
            try {
                return await originalFetch(...args);
            } catch (error) {
                if (error.message.includes('NetworkError')) {
                    console.warn('Network error detected, attempting recovery:', error);
                    this.showErrorMessage('Network connection issue. Retrying...');
                }
                throw error;
            }
        };
    }

    setupNetworkMonitoring() {
        // Monitor network connectivity
        if (navigator.onLine !== undefined) {
            window.addEventListener('online', () => {
                this.showSuccessMessage('Network connection restored');
                this.retryFailedLoads();
            });

            window.addEventListener('offline', () => {
                this.showErrorMessage('Network connection lost');
            });
        }
    }

    async retryFailedLoads() {
        if (this.failedLoads.size > 0) {
            this.showLoadingIndicator('Retrying failed image loads...');
            
            const retryPromises = Array.from(this.failedLoads).map(async (imageId) => {
                try {
                    // Attempt to reload the image
                    const imageUrl = this.getImageUrl(imageId);
                    if (imageUrl) {
                        await this.loadImageWithRetry(imageId, imageUrl);
                        this.failedLoads.delete(imageId);
                    }
                } catch (error) {
                    console.warn(`Retry failed for image ${imageId}:`, error);
                }
            });
            
            await Promise.allSettled(retryPromises);
            this.hideLoadingIndicator();
        }
    }

    getImageUrl(imageId) {
        // Try to find the image URL from various sources
        return `/dicom-viewer/image/${imageId}/`;
    }

    handleLoadError(imageId, error) {
        console.error(`Failed to load image ${imageId}:`, error);
        
        // Display placeholder or error image
        this.displayErrorPlaceholder(imageId, error.message);
        
        // Track error for analytics
        if (window.gtag) {
            window.gtag('event', 'image_load_error', {
                'image_id': imageId,
                'error_message': error.message
            });
        }
    }

    displayErrorPlaceholder(imageId, errorMessage) {
        const canvas = document.getElementById('dicom-canvas') || 
                      document.querySelector('canvas[id*="dicom"]') ||
                      document.querySelector('.dicom-canvas');
                      
        if (canvas) {
            const ctx = canvas.getContext('2d');
            
            // Clear canvas
            ctx.fillStyle = '#1a1a1a';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Draw error message
            ctx.fillStyle = '#ff6b6b';
            ctx.font = '16px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('Image Load Error', canvas.width / 2, canvas.height / 2 - 20);
            
            ctx.fillStyle = '#888';
            ctx.font = '12px Arial';
            ctx.fillText(errorMessage, canvas.width / 2, canvas.height / 2 + 10);
            
            // Draw retry button area
            ctx.strokeStyle = '#00d4ff';
            ctx.strokeRect(canvas.width / 2 - 50, canvas.height / 2 + 30, 100, 30);
            ctx.fillStyle = '#00d4ff';
            ctx.fillText('Click to Retry', canvas.width / 2, canvas.height / 2 + 50);
        }
    }

    showLoadingIndicator(message = 'Loading...') {
        let indicator = document.getElementById('dicom-loading-indicator');
        
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.id = 'dicom-loading-indicator';
            indicator.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: rgba(0, 212, 255, 0.9);
                color: white;
                padding: 12px 20px;
                border-radius: 6px;
                font-size: 14px;
                z-index: 10000;
                display: flex;
                align-items: center;
                gap: 10px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            `;
            document.body.appendChild(indicator);
        }
        
        indicator.innerHTML = `
            <div style="width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.3); border-top: 2px solid white; border-radius: 50%; animation: spin 1s linear infinite;"></div>
            ${message}
        `;
        indicator.style.display = 'flex';
        
        // Add CSS animation if not exists
        if (!document.getElementById('dicom-loading-styles')) {
            const style = document.createElement('style');
            style.id = 'dicom-loading-styles';
            style.textContent = `
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `;
            document.head.appendChild(style);
        }
    }

    hideLoadingIndicator() {
        const indicator = document.getElementById('dicom-loading-indicator');
        if (indicator) {
            indicator.style.display = 'none';
        }
    }

    showSuccessMessage(message) {
        this.showToast(message, 'success');
    }

    showErrorMessage(message) {
        this.showToast(message, 'error');
    }

    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed;
            top: 70px;
            right: 20px;
            padding: 12px 20px;
            border-radius: 6px;
            font-size: 14px;
            z-index: 10001;
            max-width: 300px;
            word-wrap: break-word;
            opacity: 0;
            transform: translateX(100%);
            transition: all 0.3s ease;
        `;
        
        const colors = {
            success: 'background: #4caf50; color: white;',
            error: 'background: #f44336; color: white;',
            info: 'background: #2196f3; color: white;',
            warning: 'background: #ff9800; color: white;'
        };
        
        toast.style.cssText += colors[type] || colors.info;
        toast.textContent = message;
        
        document.body.appendChild(toast);
        
        // Animate in
        setTimeout(() => {
            toast.style.opacity = '1';
            toast.style.transform = 'translateX(0)';
        }, 100);
        
        // Remove after delay
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, 3000);
    }

    getCSRFToken() {
        // Try multiple ways to get CSRF token
        const metaToken = document.querySelector('meta[name="csrf-token"]');
        if (metaToken) return metaToken.getAttribute('content');
        
        const cookieToken = document.cookie.split(';')
            .find(row => row.startsWith('csrftoken='));
        if (cookieToken) return cookieToken.split('=')[1];
        
        const inputToken = document.querySelector('input[name="csrfmiddlewaretoken"]');
        if (inputToken) return inputToken.value;
        
        return '';
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Public API methods
    clearCache() {
        this.loadingQueue.clear();
        this.failedLoads.clear();
        this.retryAttempts.clear();
    }

    getStats() {
        return {
            queueSize: this.loadingQueue.size,
            failedLoads: this.failedLoads.size,
            retryAttempts: this.retryAttempts.size
        };
    }
}

// Initialize the loading fix
const dicomLoadingFix = new DicomLoadingFix();

// Export for global access
window.DicomLoadingFix = DicomLoadingFix;
window.dicomLoadingFix = dicomLoadingFix;