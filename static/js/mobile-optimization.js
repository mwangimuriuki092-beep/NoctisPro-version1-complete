/**
 * Mobile Optimization System
 * Touch-optimized controls for tablets and mobile devices
 */

class MobileOptimization {
    constructor() {
        this.isMobile = this.detectMobile();
        this.isTablet = this.detectTablet();
        this.touchState = {
            touches: [],
            lastDistance: 0,
            lastCenter: { x: 0, y: 0 },
            gestureStarted: false
        };
        
        this.mobileUI = null;
        this.orientationLocked = false;
        
        this.init();
    }
    
    init() {
        if (this.isMobile || this.isTablet) {
            this.optimizeForMobile();
            this.createMobileUI();
            this.setupTouchGestures();
            this.setupOrientationHandling();
            console.log(`📱 Mobile optimization enabled (${this.isTablet ? 'Tablet' : 'Mobile'})`);
        }
    }
    
    detectMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }
    
    detectTablet() {
        return /iPad|Android.*(?!Mobile)/i.test(navigator.userAgent) || 
               (window.screen.width >= 768 && this.isMobile);
    }
    
    optimizeForMobile() {
        // Add mobile-specific CSS
        const mobileCSS = `
            <style>
                @media (max-width: 768px), (hover: none) {
                    /* Mobile-specific optimizations */
                    .toolbar {
                        width: 100%;
                        height: 60px;
                        flex-direction: row;
                        justify-content: space-around;
                        padding: 5px;
                        order: 2;
                    }
                    
                    .viewer-container {
                        flex-direction: column;
                    }
                    
                    .center-area {
                        order: 1;
                        height: calc(100vh - 120px);
                    }
                    
                    .tool-btn {
                        width: 45px;
                        height: 45px;
                        font-size: 10px;
                        margin: 2px;
                    }
                    
                    .tool-btn i {
                        font-size: 16px;
                    }
                    
                    /* Touch-friendly sizing */
                    button, .btn {
                        min-height: 44px;
                        min-width: 44px;
                    }
                    
                    /* Hide desktop-only elements */
                    .desktop-only {
                        display: none !important;
                    }
                    
                    /* Mobile-specific canvas */
                    #dicom-canvas, .dicom-canvas {
                        touch-action: none;
                        user-select: none;
                    }
                }
                
                @media (orientation: landscape) and (max-height: 500px) {
                    /* Landscape mobile optimization */
                    .toolbar {
                        height: 50px;
                    }
                    
                    .center-area {
                        height: calc(100vh - 50px);
                    }
                    
                    .tool-btn {
                        width: 40px;
                        height: 40px;
                    }
                }
            </style>
        `;
        
        document.head.insertAdjacentHTML('beforeend', mobileCSS);
    }
    
    createMobileUI() {
        const mobileUIHTML = `
            <div id="mobile-ui" class="mobile-ui">
                <div class="mobile-toolbar">
                    <div class="mobile-tool-group">
                        <button class="mobile-tool-btn" data-tool="zoom" title="Zoom">🔍</button>
                        <button class="mobile-tool-btn" data-tool="pan" title="Pan">✋</button>
                        <button class="mobile-tool-btn" data-tool="windowing" title="Window/Level">🎚️</button>
                    </div>
                    
                    <div class="mobile-tool-group">
                        <button class="mobile-tool-btn" data-tool="measure" title="Measure">📏</button>
                        <button class="mobile-tool-btn" data-tool="angle" title="Angle">📐</button>
                        <button class="mobile-tool-btn" data-tool="annotate" title="Annotate">📝</button>
                    </div>
                    
                    <div class="mobile-tool-group">
                        <button class="mobile-tool-btn" data-tool="invert" title="Invert">🔄</button>
                        <button class="mobile-tool-btn" data-tool="reset" title="Reset">🏠</button>
                        <button class="mobile-tool-btn" onclick="showMobileMenu()" title="More">⋯</button>
                    </div>
                </div>
                
                <div class="mobile-gestures-hint" id="gestures-hint" style="display: none;">
                    <div class="hint-content">
                        <div>📱 Touch Gestures:</div>
                        <div>• Pinch to zoom</div>
                        <div>• Two-finger pan</div>
                        <div>• Long press for context menu</div>
                        <div>• Swipe for next/previous image</div>
                    </div>
                </div>
                
                <div class="mobile-context-menu" id="mobile-context-menu" style="display: none;">
                    <button onclick="showWindowLevelPresets()">Window/Level Presets</button>
                    <button onclick="showMPRDialog()">MPR Reconstruction</button>
                    <button onclick="runAIAnalysis()">AI Analysis</button>
                    <button onclick="showPrintDialog()">Print/Export</button>
                    <button onclick="showPreferencesDialog()">Preferences</button>
                    <button onclick="hideMobileContextMenu()">Cancel</button>
                </div>
            </div>
        `;
        
        const mobileStyleHTML = `
            <style>
                .mobile-ui {
                    position: fixed;
                    bottom: 0;
                    left: 0;
                    right: 0;
                    z-index: 1000;
                    display: none;
                }
                
                @media (max-width: 768px), (hover: none) {
                    .mobile-ui {
                        display: block;
                    }
                }
                
                .mobile-toolbar {
                    background: rgba(0, 0, 0, 0.9);
                    backdrop-filter: blur(10px);
                    border-top: 1px solid #333;
                    padding: 10px;
                    display: flex;
                    justify-content: space-around;
                    align-items: center;
                }
                
                .mobile-tool-group {
                    display: flex;
                    gap: 5px;
                }
                
                .mobile-tool-btn {
                    width: 50px;
                    height: 50px;
                    background: #333;
                    border: 1px solid #555;
                    border-radius: 8px;
                    color: #fff;
                    font-size: 20px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.2s;
                }
                
                .mobile-tool-btn:hover, .mobile-tool-btn.active {
                    background: #00d4ff;
                    color: #000;
                    transform: scale(1.1);
                }
                
                .mobile-gestures-hint {
                    position: fixed;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    background: rgba(0, 0, 0, 0.9);
                    border: 1px solid #333;
                    border-radius: 8px;
                    padding: 20px;
                    z-index: 10001;
                }
                
                .hint-content {
                    color: #fff;
                    text-align: center;
                    font-size: 14px;
                    line-height: 1.5;
                }
                
                .mobile-context-menu {
                    position: fixed;
                    bottom: 80px;
                    left: 50%;
                    transform: translateX(-50%);
                    background: rgba(0, 0, 0, 0.95);
                    border: 1px solid #333;
                    border-radius: 8px;
                    padding: 10px;
                    z-index: 10001;
                    display: flex;
                    flex-direction: column;
                    gap: 5px;
                    min-width: 200px;
                }
                
                .mobile-context-menu button {
                    background: #333;
                    border: 1px solid #555;
                    color: #fff;
                    padding: 12px;
                    border-radius: 4px;
                    cursor: pointer;
                    text-align: left;
                }
                
                .mobile-context-menu button:hover {
                    background: #555;
                }
            </style>
        `;
        
        document.head.insertAdjacentHTML('beforeend', mobileStyleHTML);
        document.body.insertAdjacentHTML('beforeend', mobileUIHTML);
        
        this.mobileUI = document.getElementById('mobile-ui');
        this.setupMobileToolbar();
    }
    
    setupMobileToolbar() {
        // Connect mobile toolbar buttons
        const mobileToolBtns = document.querySelectorAll('.mobile-tool-btn[data-tool]');
        
        mobileToolBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                
                // Remove active class from all buttons
                mobileToolBtns.forEach(b => b.classList.remove('active'));
                
                // Add active class to clicked button
                btn.classList.add('active');
                
                // Execute tool
                const tool = btn.dataset.tool;
                if (window.dicomConnector) {
                    window.dicomConnector.setTool(tool);
                }
            });
        });
    }
    
    setupTouchGestures() {
        const canvas = document.querySelector('#dicom-canvas, .dicom-canvas');
        if (!canvas) return;
        
        // Enhanced touch event handling
        canvas.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
        canvas.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
        canvas.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: false });
        
        // Long press for context menu
        let longPressTimer;
        canvas.addEventListener('touchstart', (e) => {
            longPressTimer = setTimeout(() => {
                this.showMobileContextMenu(e.touches[0]);
            }, 800);
        });
        
        canvas.addEventListener('touchend', () => {
            clearTimeout(longPressTimer);
        });
        
        canvas.addEventListener('touchmove', () => {
            clearTimeout(longPressTimer);
        });
        
        console.log('👆 Touch gestures configured');
    }
    
    handleTouchStart(e) {
        e.preventDefault();
        
        this.touchState.touches = Array.from(e.touches).map(touch => ({
            id: touch.identifier,
            x: touch.clientX,
            y: touch.clientY
        }));
        
        if (e.touches.length === 2) {
            // Two-finger gesture
            const distance = this.calculateDistance(e.touches[0], e.touches[1]);
            const center = this.calculateCenter(e.touches[0], e.touches[1]);
            
            this.touchState.lastDistance = distance;
            this.touchState.lastCenter = center;
            this.touchState.gestureStarted = true;
        }
    }
    
    handleTouchMove(e) {
        e.preventDefault();
        
        if (e.touches.length === 1) {
            // Single finger - pan
            const touch = e.touches[0];
            const lastTouch = this.touchState.touches.find(t => t.id === touch.identifier);
            
            if (lastTouch) {
                const deltaX = touch.clientX - lastTouch.x;
                const deltaY = touch.clientY - lastTouch.y;
                
                if (window.dicomConnector) {
                    window.dicomConnector.pan(deltaX, deltaY);
                }
                
                // Update last position
                lastTouch.x = touch.clientX;
                lastTouch.y = touch.clientY;
            }
        } else if (e.touches.length === 2 && this.touchState.gestureStarted) {
            // Two fingers - pinch zoom
            const distance = this.calculateDistance(e.touches[0], e.touches[1]);
            const center = this.calculateCenter(e.touches[0], e.touches[1]);
            
            if (this.touchState.lastDistance > 0) {
                const scale = distance / this.touchState.lastDistance;
                
                if (window.dicomConnector) {
                    window.dicomConnector.zoomAtPoint(center.x, center.y, scale);
                }
            }
            
            this.touchState.lastDistance = distance;
            this.touchState.lastCenter = center;
        }
    }
    
    handleTouchEnd(e) {
        e.preventDefault();
        
        this.touchState.touches = Array.from(e.touches).map(touch => ({
            id: touch.identifier,
            x: touch.clientX,
            y: touch.clientY
        }));
        
        if (e.touches.length < 2) {
            this.touchState.gestureStarted = false;
            this.touchState.lastDistance = 0;
        }
    }
    
    calculateDistance(touch1, touch2) {
        const dx = touch2.clientX - touch1.clientX;
        const dy = touch2.clientY - touch1.clientY;
        return Math.sqrt(dx * dx + dy * dy);
    }
    
    calculateCenter(touch1, touch2) {
        return {
            x: (touch1.clientX + touch2.clientX) / 2,
            y: (touch1.clientY + touch2.clientY) / 2
        };
    }
    
    setupOrientationHandling() {
        // Handle orientation changes
        window.addEventListener('orientationchange', () => {
            setTimeout(() => {
                this.handleOrientationChange();
            }, 100);
        });
        
        // Screen orientation API
        if (screen.orientation) {
            screen.orientation.addEventListener('change', () => {
                this.handleOrientationChange();
            });
        }
    }
    
    handleOrientationChange() {
        console.log('📱 Orientation changed');
        
        // Resize canvas
        if (window.dicomCanvasFix && window.dicomCanvasFix.resizeCanvas) {
            window.dicomCanvasFix.resizeCanvas();
        }
        
        // Adjust UI layout
        this.adjustUIForOrientation();
        
        // Show orientation hint
        this.showOrientationHint();
    }
    
    adjustUIForOrientation() {
        const isLandscape = window.innerWidth > window.innerHeight;
        
        if (isLandscape) {
            // Landscape optimizations
            document.body.classList.add('landscape-mode');
            document.body.classList.remove('portrait-mode');
        } else {
            // Portrait optimizations
            document.body.classList.add('portrait-mode');
            document.body.classList.remove('landscape-mode');
        }
    }
    
    showOrientationHint() {
        const hint = document.createElement('div');
        hint.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0, 0, 0, 0.9);
            color: #fff;
            padding: 20px;
            border-radius: 8px;
            text-align: center;
            z-index: 10002;
        `;
        hint.innerHTML = `
            <div style="font-size: 24px; margin-bottom: 10px;">📱</div>
            <div>Screen orientation changed</div>
            <div style="font-size: 12px; margin-top: 10px;">Layout optimized for ${window.innerWidth > window.innerHeight ? 'landscape' : 'portrait'} viewing</div>
        `;
        
        document.body.appendChild(hint);
        
        setTimeout(() => {
            document.body.removeChild(hint);
        }, 2000);
    }
    
    showMobileContextMenu(touch) {
        const menu = document.getElementById('mobile-context-menu');
        if (menu) {
            menu.style.display = 'flex';
            
            // Position near touch point
            const rect = document.body.getBoundingClientRect();
            const x = Math.min(touch.clientX, rect.width - 200);
            const y = Math.max(touch.clientY - 200, 20);
            
            menu.style.left = x + 'px';
            menu.style.bottom = (rect.height - y) + 'px';
            menu.style.transform = 'none';
        }
        
        // Vibrate if supported
        if (navigator.vibrate) {
            navigator.vibrate(50);
        }
    }
    
    hideMobileContextMenu() {
        const menu = document.getElementById('mobile-context-menu');
        if (menu) {
            menu.style.display = 'none';
        }
    }
    
    showGesturesHint() {
        const hint = document.getElementById('gestures-hint');
        if (hint) {
            hint.style.display = 'block';
            
            setTimeout(() => {
                hint.style.display = 'none';
            }, 5000);
        }
    }
    
    enableFullscreen() {
        const element = document.documentElement;
        
        if (element.requestFullscreen) {
            element.requestFullscreen();
        } else if (element.webkitRequestFullscreen) {
            element.webkitRequestFullscreen();
        } else if (element.msRequestFullscreen) {
            element.msRequestFullscreen();
        }
        
        console.log('📱 Fullscreen enabled');
    }
    
    lockOrientation(orientation = 'landscape') {
        if (screen.orientation && screen.orientation.lock) {
            screen.orientation.lock(orientation)
                .then(() => {
                    this.orientationLocked = true;
                    console.log(`📱 Orientation locked to ${orientation}`);
                })
                .catch(error => {
                    console.warn('Failed to lock orientation:', error);
                });
        }
    }
    
    unlockOrientation() {
        if (screen.orientation && screen.orientation.unlock) {
            screen.orientation.unlock();
            this.orientationLocked = false;
            console.log('📱 Orientation unlocked');
        }
    }
    
    optimizePerformanceForMobile() {
        // Reduce performance settings for mobile
        if (window.userPreferences) {
            window.userPreferences.preferences.performance.enableGPUAcceleration = false;
            window.userPreferences.preferences.performance.imageQuality = 'medium';
            window.userPreferences.preferences.performance.maxCacheSize = 20;
        }
        
        // Reduce canvas resolution for better performance
        const canvas = document.querySelector('#dicom-canvas, .dicom-canvas');
        if (canvas && this.isMobile && !this.isTablet) {
            const maxSize = 1024;
            if (canvas.width > maxSize || canvas.height > maxSize) {
                const scale = maxSize / Math.max(canvas.width, canvas.height);
                canvas.width *= scale;
                canvas.height *= scale;
            }
        }
        
        console.log('⚡ Performance optimized for mobile');
    }
    
    // Swipe gesture detection
    setupSwipeGestures() {
        let startX, startY, startTime;
        
        const canvas = document.querySelector('#dicom-canvas, .dicom-canvas');
        if (!canvas) return;
        
        canvas.addEventListener('touchstart', (e) => {
            if (e.touches.length === 1) {
                startX = e.touches[0].clientX;
                startY = e.touches[0].clientY;
                startTime = Date.now();
            }
        });
        
        canvas.addEventListener('touchend', (e) => {
            if (e.changedTouches.length === 1) {
                const endX = e.changedTouches[0].clientX;
                const endY = e.changedTouches[0].clientY;
                const endTime = Date.now();
                
                const deltaX = endX - startX;
                const deltaY = endY - startY;
                const deltaTime = endTime - startTime;
                
                // Check for swipe gesture
                if (deltaTime < 500 && Math.abs(deltaX) > 50 && Math.abs(deltaY) < 100) {
                    if (deltaX > 0) {
                        this.handleSwipe('right');
                    } else {
                        this.handleSwipe('left');
                    }
                }
            }
        });
    }
    
    handleSwipe(direction) {
        console.log(`👆 Swipe ${direction} detected`);
        
        // Navigate images with swipe
        if (direction === 'left') {
            // Next image
            this.navigateImage(1);
        } else if (direction === 'right') {
            // Previous image
            this.navigateImage(-1);
        }
    }
    
    navigateImage(direction) {
        // Same navigation logic as voice commands
        if (window.voiceCommands) {
            window.voiceCommands.navigateImage(direction);
        }
    }
}

// Global functions
window.showMobileMenu = function() {
    const menu = document.getElementById('mobile-context-menu');
    if (menu) {
        menu.style.display = menu.style.display === 'none' ? 'flex' : 'none';
    }
};

window.hideMobileContextMenu = function() {
    if (window.mobileOptimization) {
        window.mobileOptimization.hideMobileContextMenu();
    }
};

window.showMobileGesturesHint = function() {
    if (window.mobileOptimization) {
        window.mobileOptimization.showGesturesHint();
    }
};

window.enableMobileFullscreen = function() {
    if (window.mobileOptimization) {
        window.mobileOptimization.enableFullscreen();
    }
};

window.lockMobileOrientation = function(orientation) {
    if (window.mobileOptimization) {
        window.mobileOptimization.lockOrientation(orientation);
    }
};

// Initialize mobile optimization
window.mobileOptimization = new MobileOptimization();

// Auto-show gestures hint on first mobile use
if (window.mobileOptimization.isMobile) {
    setTimeout(() => {
        window.mobileOptimization.showGesturesHint();
    }, 3000);
}

console.log('📱 Mobile Optimization loaded');