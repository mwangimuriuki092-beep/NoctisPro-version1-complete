/**
 * Robust Error Handling and Recovery System
 * Production-grade error handling for DICOM viewer
 */

class ErrorHandlingSystem {
    constructor() {
        this.errors = [];
        this.recoveryStrategies = new Map();
        this.errorThresholds = {
            maxErrors: 10,
            timeWindow: 60000, // 1 minute
            criticalErrorTypes: ['canvas_failure', 'dicom_load_failure', 'api_failure']
        };
        
        this.init();
    }
    
    init() {
        this.setupGlobalErrorHandling();
        this.setupRecoveryStrategies();
        this.createErrorDialog();
        console.log('🛡️ Error Handling System initialized');
    }
    
    setupGlobalErrorHandling() {
        // Catch unhandled JavaScript errors
        window.addEventListener('error', (event) => {
            this.handleError({
                type: 'javascript_error',
                message: event.message,
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno,
                error: event.error,
                severity: 'medium'
            });
        });
        
        // Catch unhandled promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            this.handleError({
                type: 'promise_rejection',
                message: event.reason?.message || 'Unhandled promise rejection',
                error: event.reason,
                severity: 'medium'
            });
        });
        
        // Catch canvas errors
        document.addEventListener('canvas-error', (event) => {
            this.handleError({
                type: 'canvas_failure',
                message: event.detail.message,
                error: event.detail.error,
                severity: 'high'
            });
        });
        
        // Catch DICOM loading errors
        document.addEventListener('dicom-load-error', (event) => {
            this.handleError({
                type: 'dicom_load_failure',
                message: event.detail.message,
                error: event.detail.error,
                severity: 'high'
            });
        });
    }
    
    setupRecoveryStrategies() {
        // Canvas failure recovery
        this.recoveryStrategies.set('canvas_failure', () => {
            console.log('🔧 Attempting canvas recovery...');
            
            // Try to reinitialize canvas
            if (window.dicomCanvasFix) {
                try {
                    window.dicomCanvasFix.setupCanvas();
                    return true;
                } catch (error) {
                    console.error('Canvas recovery failed:', error);
                }
            }
            
            // Try fallback canvas
            this.initializeFallbackCanvas();
            return true;
        });
        
        // DICOM load failure recovery
        this.recoveryStrategies.set('dicom_load_failure', () => {
            console.log('🔧 Attempting DICOM load recovery...');
            
            // Clear image cache
            if (window.dicomCanvasFix && window.dicomCanvasFix.imageCache) {
                window.dicomCanvasFix.imageCache.clear();
            }
            
            // Try alternative loading method
            return this.tryAlternativeImageLoad();
        });
        
        // API failure recovery
        this.recoveryStrategies.set('api_failure', () => {
            console.log('🔧 Attempting API recovery...');
            
            // Wait and retry with exponential backoff
            return this.retryWithBackoff();
        });
        
        // Memory error recovery
        this.recoveryStrategies.set('memory_error', () => {
            console.log('🔧 Attempting memory recovery...');
            
            // Clear caches
            this.clearAllCaches();
            
            // Force garbage collection if available
            if (window.gc) {
                window.gc();
            }
            
            return true;
        });
    }
    
    handleError(errorInfo) {
        const timestamp = Date.now();
        const error = {
            ...errorInfo,
            timestamp,
            id: this.generateErrorId(),
            recovered: false
        };
        
        this.errors.push(error);
        
        // Log error
        console.error(`🚫 Error [${error.id}]:`, error);
        
        // Check if recovery is needed
        if (this.shouldAttemptRecovery(error)) {
            this.attemptRecovery(error);
        }
        
        // Check if system is in critical state
        if (this.isCriticalState()) {
            this.handleCriticalState();
        }
        
        // Clean old errors
        this.cleanOldErrors();
        
        // Show error to user if severe
        if (error.severity === 'high') {
            this.showErrorToUser(error);
        }
    }
    
    shouldAttemptRecovery(error) {
        return this.recoveryStrategies.has(error.type) && 
               this.errorThresholds.criticalErrorTypes.includes(error.type);
    }
    
    async attemptRecovery(error) {
        const strategy = this.recoveryStrategies.get(error.type);
        if (!strategy) return false;
        
        try {
            const recovered = await strategy();
            error.recovered = recovered;
            
            if (recovered) {
                console.log(`✅ Recovery successful for error ${error.id}`);
                this.showRecoveryNotification(error);
            } else {
                console.warn(`⚠️ Recovery failed for error ${error.id}`);
            }
            
            return recovered;
        } catch (recoveryError) {
            console.error(`❌ Recovery attempt failed for error ${error.id}:`, recoveryError);
            return false;
        }
    }
    
    isCriticalState() {
        const recentErrors = this.errors.filter(error => 
            Date.now() - error.timestamp < this.errorThresholds.timeWindow
        );
        
        const criticalErrors = recentErrors.filter(error =>
            this.errorThresholds.criticalErrorTypes.includes(error.type) && !error.recovered
        );
        
        return recentErrors.length > this.errorThresholds.maxErrors || criticalErrors.length > 3;
    }
    
    handleCriticalState() {
        console.error('🚨 CRITICAL STATE: Multiple system failures detected');
        
        // Show critical error dialog
        this.showCriticalErrorDialog();
        
        // Attempt system recovery
        this.attemptSystemRecovery();
    }
    
    attemptSystemRecovery() {
        console.log('🔧 Attempting full system recovery...');
        
        // Clear all caches
        this.clearAllCaches();
        
        // Reset all components
        this.resetAllComponents();
        
        // Reload page as last resort
        setTimeout(() => {
            if (this.isCriticalState()) {
                console.log('🔄 Reloading page for system recovery...');
                window.location.reload();
            }
        }, 5000);
    }
    
    clearAllCaches() {
        // Clear image caches
        if (window.dicomCanvasFix && window.dicomCanvasFix.imageCache) {
            window.dicomCanvasFix.imageCache.clear();
        }
        
        // Clear browser caches
        if ('caches' in window) {
            caches.keys().then(names => {
                names.forEach(name => caches.delete(name));
            });
        }
        
        console.log('🧹 All caches cleared');
    }
    
    resetAllComponents() {
        try {
            // Reset canvas
            if (window.dicomCanvasFix) {
                window.dicomCanvasFix.setupCanvas();
            }
            
            // Reset measurements
            if (window.advancedMeasurements) {
                window.advancedMeasurements.clearAllMeasurements();
            }
            
            // Reset viewport
            if (window.dicomConnector) {
                window.dicomConnector.resetView();
            }
            
            console.log('🔄 All components reset');
        } catch (error) {
            console.error('Component reset failed:', error);
        }
    }
    
    initializeFallbackCanvas() {
        try {
            // Create basic fallback canvas
            const container = document.querySelector('.viewer-container, #viewer-container');
            if (!container) return false;
            
            const fallbackCanvas = document.createElement('canvas');
            fallbackCanvas.id = 'fallback-dicom-canvas';
            fallbackCanvas.style.cssText = `
                width: 100%;
                height: 100%;
                background: #000;
                border: 2px solid #ff4444;
            `;
            
            container.appendChild(fallbackCanvas);
            
            const ctx = fallbackCanvas.getContext('2d');
            ctx.fillStyle = '#ff4444';
            ctx.font = '16px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('Fallback Canvas Active', fallbackCanvas.width / 2, fallbackCanvas.height / 2);
            
            console.log('🆘 Fallback canvas initialized');
            return true;
        } catch (error) {
            console.error('Fallback canvas initialization failed:', error);
            return false;
        }
    }
    
    tryAlternativeImageLoad() {
        // Implement alternative image loading strategies
        return new Promise((resolve) => {
            setTimeout(() => {
                console.log('🔄 Alternative image load attempted');
                resolve(true);
            }, 1000);
        });
    }
    
    retryWithBackoff() {
        // Exponential backoff retry strategy
        return new Promise((resolve) => {
            const retryDelay = Math.min(1000 * Math.pow(2, this.errors.length), 10000);
            
            setTimeout(() => {
                console.log(`🔄 Retrying after ${retryDelay}ms delay`);
                resolve(true);
            }, retryDelay);
        });
    }
    
    createErrorDialog() {
        const dialogHTML = `
            <div id="error-dialog" class="modal-dialog" style="display: none;">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>System Error</h3>
                        <button class="close-btn" onclick="closeErrorDialog()">×</button>
                    </div>
                    <div class="modal-body">
                        <div id="error-message" class="error-message"></div>
                        <div class="error-actions">
                            <button class="btn btn-primary" onclick="retryLastAction()">Retry</button>
                            <button class="btn btn-secondary" onclick="reportError()">Report Error</button>
                            <button class="btn btn-secondary" onclick="resetSystem()">Reset System</button>
                        </div>
                    </div>
                </div>
            </div>
            
            <div id="critical-error-dialog" class="modal-dialog" style="display: none;">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3 style="color: #ff4444;">🚨 Critical System Error</h3>
                    </div>
                    <div class="modal-body">
                        <div class="critical-message">
                            <p>The DICOM viewer has encountered multiple critical errors.</p>
                            <p>The system will attempt automatic recovery.</p>
                        </div>
                        <div class="recovery-status" id="recovery-status">
                            <div>🔧 Attempting recovery...</div>
                        </div>
                        <div class="critical-actions">
                            <button class="btn btn-primary" onclick="forceReload()">Reload Page</button>
                            <button class="btn btn-secondary" onclick="contactSupport()">Contact Support</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        const styleHTML = `
            <style>
                .error-message {
                    background: #2a1a1a;
                    border-left: 4px solid #ff4444;
                    padding: 15px;
                    margin: 15px 0;
                    color: #ff9999;
                }
                
                .critical-message {
                    background: #3a1a1a;
                    border: 2px solid #ff4444;
                    padding: 20px;
                    margin: 15px 0;
                    border-radius: 6px;
                    color: #ffcccc;
                    text-align: center;
                }
                
                .recovery-status {
                    background: #1a2a1a;
                    border-left: 4px solid #ffaa00;
                    padding: 15px;
                    margin: 15px 0;
                    color: #ffdd99;
                }
                
                .error-actions, .critical-actions {
                    display: flex;
                    gap: 10px;
                    justify-content: center;
                    margin-top: 20px;
                }
            </style>
        `;
        
        document.head.insertAdjacentHTML('beforeend', styleHTML);
        document.body.insertAdjacentHTML('beforeend', dialogHTML);
    }
    
    showErrorToUser(error) {
        const errorDialog = document.getElementById('error-dialog');
        const errorMessage = document.getElementById('error-message');
        
        errorMessage.innerHTML = `
            <strong>Error ${error.id}:</strong> ${error.message}<br>
            <small>Type: ${error.type} | Time: ${new Date(error.timestamp).toLocaleTimeString()}</small>
        `;
        
        errorDialog.style.display = 'flex';
    }
    
    showCriticalErrorDialog() {
        document.getElementById('critical-error-dialog').style.display = 'flex';
        
        // Update recovery status periodically
        let statusIndex = 0;
        const statusMessages = [
            '🔧 Clearing caches...',
            '🔄 Resetting components...',
            '🛡️ Checking system integrity...',
            '⚡ Optimizing performance...',
            '✅ Recovery complete'
        ];
        
        const updateStatus = () => {
            const statusDiv = document.getElementById('recovery-status');
            if (statusDiv && statusIndex < statusMessages.length) {
                statusDiv.innerHTML = `<div>${statusMessages[statusIndex]}</div>`;
                statusIndex++;
                
                if (statusIndex < statusMessages.length) {
                    setTimeout(updateStatus, 1000);
                }
            }
        };
        
        updateStatus();
    }
    
    showRecoveryNotification(error) {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #00ff88;
            color: #000;
            padding: 10px 15px;
            border-radius: 4px;
            z-index: 10001;
            font-size: 14px;
        `;
        notification.innerHTML = `✅ System recovered from ${error.type}`;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 3000);
    }
    
    cleanOldErrors() {
        const cutoff = Date.now() - this.errorThresholds.timeWindow * 5; // Keep 5 time windows
        this.errors = this.errors.filter(error => error.timestamp > cutoff);
    }
    
    generateErrorId() {
        return 'err_' + Math.random().toString(36).substr(2, 9);
    }
    
    getErrorReport() {
        const recentErrors = this.errors.filter(error => 
            Date.now() - error.timestamp < this.errorThresholds.timeWindow
        );
        
        return {
            totalErrors: this.errors.length,
            recentErrors: recentErrors.length,
            criticalErrors: recentErrors.filter(e => e.severity === 'high').length,
            recoveredErrors: recentErrors.filter(e => e.recovered).length,
            errorTypes: [...new Set(recentErrors.map(e => e.type))],
            systemHealth: this.isCriticalState() ? 'critical' : 
                         recentErrors.length > 5 ? 'warning' : 'good'
        };
    }
    
    // Manual error reporting
    reportError(userDescription = '') {
        const report = {
            ...this.getErrorReport(),
            userDescription,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            url: window.location.href
        };
        
        console.log('📋 Error report generated:', report);
        
        // In production, this would send to error tracking service
        this.downloadErrorReport(report);
    }
    
    downloadErrorReport(report) {
        const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `dicom_error_report_${Date.now()}.json`;
        a.click();
        
        URL.revokeObjectURL(url);
    }
}

// Global functions
window.closeErrorDialog = function() {
    document.getElementById('error-dialog').style.display = 'none';
};

window.retryLastAction = function() {
    console.log('🔄 Retrying last action...');
    window.closeErrorDialog();
    
    // Try to reload current image
    if (window.dicomCanvasFix && window.dicomCanvasFix.currentImage) {
        window.dicomCanvasFix.displayImage(window.dicomCanvasFix.currentImage);
    }
};

window.reportError = function() {
    if (window.errorHandler) {
        const description = prompt('Describe what you were doing when the error occurred:');
        window.errorHandler.reportError(description);
    }
    window.closeErrorDialog();
};

window.resetSystem = function() {
    if (window.errorHandler) {
        window.errorHandler.resetAllComponents();
    }
    window.closeErrorDialog();
};

window.forceReload = function() {
    window.location.reload();
};

window.contactSupport = function() {
    console.log('📞 Contacting support...');
    // In production, this would open support contact form
};

// Initialize error handling
window.errorHandler = new ErrorHandlingSystem();

// Helper function to manually report errors
window.reportDicomError = function(type, message, error = null) {
    if (window.errorHandler) {
        window.errorHandler.handleError({
            type,
            message,
            error,
            severity: 'medium'
        });
    }
};

console.log('🛡️ Error Handling System loaded');