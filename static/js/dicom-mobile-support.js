/**
 * Mobile & Touch Support for DICOM Viewer
 * Professional mobile medical imaging interface
 */

class DicomMobileSupport {
    constructor(viewer) {
        this.viewer = viewer;
        this.version = '1.0.0';
        this.isTouch = 'ontouchstart' in window;
        this.isMobile = this.detectMobile();
        this.gestureState = {
            isActive: false,
            startDistance: 0,
            startScale: 1,
            lastTouchTime: 0,
            touchCount: 0
        };
        
        this.init();
        console.log('📱 Mobile DICOM Support initialized');
    }
    
    detectMobile() {
        const userAgent = navigator.userAgent.toLowerCase();
        const mobileKeywords = ['mobile', 'android', 'iphone', 'ipad', 'tablet'];
        
        return mobileKeywords.some(keyword => userAgent.includes(keyword)) ||
               window.innerWidth <= 768 ||
               (window.orientation !== undefined);
    }
    
    init() {
        this.setupTouchEvents();
        this.setupMobileUI();
        this.setupResponsiveLayout();
        this.setupVibrationFeedback();
        
        if (this.isMobile) {
            this.optimizeForMobile();
        }
    }
    
    // ============================================================================
    // TOUCH GESTURE HANDLING
    // ============================================================================
    
    setupTouchEvents() {
        const canvas = document.getElementById('dicomCanvas');
        if (!canvas) return;
        
        // Prevent default touch behaviors
        canvas.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
        canvas.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
        canvas.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: false });
        canvas.addEventListener('touchcancel', this.handleTouchEnd.bind(this), { passive: false });
        
        // Prevent context menu on long press
        canvas.addEventListener('contextmenu', (e) => e.preventDefault());
        
        // Handle device orientation changes
        window.addEventListener('orientationchange', this.handleOrientationChange.bind(this));
        window.addEventListener('resize', this.handleResize.bind(this));
    }
    
    handleTouchStart(e) {
        e.preventDefault();
        
        const touches = e.touches;
        this.gestureState.touchCount = touches.length;
        this.gestureState.isActive = true;
        this.gestureState.lastTouchTime = Date.now();
        
        if (touches.length === 1) {
            // Single touch - pan or measurement
            this.startSingleTouch(touches[0]);
        } else if (touches.length === 2) {
            // Two finger - zoom/rotate
            this.startTwoFingerGesture(touches);
        }
        
        // Provide haptic feedback
        this.vibrate(10);
    }
    
    handleTouchMove(e) {
        e.preventDefault();
        
        if (!this.gestureState.isActive) return;
        
        const touches = e.touches;
        
        if (touches.length === 1 && this.gestureState.touchCount === 1) {
            this.handleSingleTouchMove(touches[0]);
        } else if (touches.length === 2) {
            this.handleTwoFingerMove(touches);
        }
    }
    
    handleTouchEnd(e) {
        e.preventDefault();
        
        const currentTime = Date.now();
        const touchDuration = currentTime - this.gestureState.lastTouchTime;
        
        // Handle tap gestures
        if (touchDuration < 200 && e.changedTouches.length === 1) {
            this.handleTap(e.changedTouches[0], touchDuration);
        }
        
        this.gestureState.isActive = false;
        this.gestureState.touchCount = 0;
    }
    
    startSingleTouch(touch) {
        this.gestureState.lastTouch = {
            x: touch.clientX,
            y: touch.clientY,
            startTime: Date.now()
        };
    }
    
    handleSingleTouchMove(touch) {
        if (!this.gestureState.lastTouch) return;
        
        const deltaX = touch.clientX - this.gestureState.lastTouch.x;
        const deltaY = touch.clientY - this.gestureState.lastTouch.y;
        
        // Pan the image
        if (this.viewer && this.viewer.setPan) {
            const currentTranslation = this.viewer.viewport.translation;
            this.viewer.setPan(
                currentTranslation.x + deltaX,
                currentTranslation.y + deltaY
            );
        }
        
        this.gestureState.lastTouch.x = touch.clientX;
        this.gestureState.lastTouch.y = touch.clientY;
    }
    
    startTwoFingerGesture(touches) {
        const touch1 = touches[0];
        const touch2 = touches[1];
        
        // Calculate initial distance for zoom
        const deltaX = touch2.clientX - touch1.clientX;
        const deltaY = touch2.clientY - touch1.clientY;
        this.gestureState.startDistance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        
        // Store initial scale
        this.gestureState.startScale = this.viewer ? this.viewer.viewport.scale : 1;
        
        // Calculate center point
        this.gestureState.centerPoint = {
            x: (touch1.clientX + touch2.clientX) / 2,
            y: (touch1.clientY + touch2.clientY) / 2
        };
    }
    
    handleTwoFingerMove(touches) {
        if (touches.length !== 2) return;
        
        const touch1 = touches[0];
        const touch2 = touches[1];
        
        // Calculate current distance
        const deltaX = touch2.clientX - touch1.clientX;
        const deltaY = touch2.clientY - touch1.clientY;
        const currentDistance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        
        // Calculate scale factor
        const scaleFactor = currentDistance / this.gestureState.startDistance;
        const newScale = this.gestureState.startScale * scaleFactor;
        
        // Apply zoom with constraints
        if (this.viewer && this.viewer.setZoom) {
            const constrainedScale = Math.max(0.1, Math.min(10.0, newScale));
            this.viewer.setZoom(constrainedScale);
        }
        
        // Provide subtle haptic feedback for zoom
        if (Math.abs(scaleFactor - 1) > 0.1) {
            this.vibrate(5);
        }
    }
    
    handleTap(touch, duration) {
        const canvas = document.getElementById('dicomCanvas');
        if (!canvas) return;
        
        const rect = canvas.getBoundingClientRect();
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;
        
        if (duration < 100) {
            // Quick tap - reset view or toggle UI
            this.handleQuickTap(x, y);
        } else {
            // Long tap - show context menu or measurement
            this.handleLongTap(x, y);
        }
    }
    
    handleQuickTap(x, y) {
        // Double tap to fit image
        const currentTime = Date.now();
        if (this.lastTapTime && currentTime - this.lastTapTime < 300) {
            if (this.viewer && this.viewer.fitToWindow) {
                this.viewer.fitToWindow();
                this.vibrate(20);
            }
        }
        this.lastTapTime = currentTime;
    }
    
    handleLongTap(x, y) {
        // Show mobile context menu
        this.showMobileContextMenu(x, y);
        this.vibrate(30);
    }
    
    // ============================================================================
    // MOBILE UI OPTIMIZATIONS
    // ============================================================================
    
    setupMobileUI() {
        if (!this.isMobile) return;
        
        // Add mobile-specific CSS classes
        document.body.classList.add('mobile-dicom-viewer');
        
        // Create mobile toolbar
        this.createMobileToolbar();
        
        // Optimize button sizes for touch
        this.optimizeButtonSizes();
        
        // Add swipe navigation
        this.setupSwipeNavigation();
    }
    
    createMobileToolbar() {
        const toolbar = document.createElement('div');
        toolbar.className = 'mobile-dicom-toolbar';
        toolbar.innerHTML = `
            <div class="mobile-toolbar-section">
                <button class="mobile-tool-btn" data-action="zoom-in">
                    <span class="icon">🔍+</span>
                    <span class="label">Zoom In</span>
                </button>
                <button class="mobile-tool-btn" data-action="zoom-out">
                    <span class="icon">🔍-</span>
                    <span class="label">Zoom Out</span>
                </button>
                <button class="mobile-tool-btn" data-action="reset">
                    <span class="icon">🔄</span>
                    <span class="label">Reset</span>
                </button>
                <button class="mobile-tool-btn" data-action="fit">
                    <span class="icon">📐</span>
                    <span class="label">Fit</span>
                </button>
            </div>
            <div class="mobile-toolbar-section">
                <button class="mobile-tool-btn" data-action="measure">
                    <span class="icon">📏</span>
                    <span class="label">Measure</span>
                </button>
                <button class="mobile-tool-btn" data-action="window">
                    <span class="icon">🎛️</span>
                    <span class="label">Window</span>
                </button>
                <button class="mobile-tool-btn" data-action="invert">
                    <span class="icon">🔄</span>
                    <span class="label">Invert</span>
                </button>
                <button class="mobile-tool-btn" data-action="more">
                    <span class="icon">⋯</span>
                    <span class="label">More</span>
                </button>
            </div>
        `;
        
        // Add event listeners
        toolbar.addEventListener('click', this.handleToolbarClick.bind(this));
        
        // Insert toolbar
        const container = document.querySelector('.dicom-viewer-container') || document.body;
        container.appendChild(toolbar);
        
        // Add CSS styles
        this.addMobileStyles();
    }
    
    addMobileStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .mobile-dicom-viewer {
                touch-action: none;
                -webkit-user-select: none;
                user-select: none;
            }
            
            .mobile-dicom-toolbar {
                position: fixed;
                bottom: 20px;
                left: 50%;
                transform: translateX(-50%);
                background: rgba(0, 0, 0, 0.8);
                border-radius: 15px;
                padding: 10px;
                display: flex;
                gap: 10px;
                z-index: 1000;
                backdrop-filter: blur(10px);
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
            }
            
            .mobile-toolbar-section {
                display: flex;
                gap: 5px;
            }
            
            .mobile-tool-btn {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                width: 60px;
                height: 60px;
                background: rgba(255, 255, 255, 0.1);
                border: none;
                border-radius: 10px;
                color: white;
                font-size: 12px;
                cursor: pointer;
                transition: all 0.2s ease;
                min-height: 44px; /* iOS touch target minimum */
            }
            
            .mobile-tool-btn:hover,
            .mobile-tool-btn:active {
                background: rgba(255, 255, 255, 0.2);
                transform: scale(0.95);
            }
            
            .mobile-tool-btn .icon {
                font-size: 20px;
                margin-bottom: 2px;
            }
            
            .mobile-tool-btn .label {
                font-size: 10px;
                font-weight: 500;
            }
            
            .mobile-context-menu {
                position: fixed;
                background: rgba(0, 0, 0, 0.9);
                border-radius: 10px;
                padding: 10px;
                z-index: 1001;
                backdrop-filter: blur(10px);
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
            }
            
            .mobile-context-menu button {
                display: block;
                width: 100%;
                padding: 12px 20px;
                background: none;
                border: none;
                color: white;
                text-align: left;
                border-radius: 5px;
                margin-bottom: 5px;
                min-height: 44px;
            }
            
            .mobile-context-menu button:hover {
                background: rgba(255, 255, 255, 0.1);
            }
            
            @media (max-width: 768px) {
                .dicom-viewer-controls {
                    display: none !important;
                }
                
                #dicomCanvas {
                    width: 100% !important;
                    height: calc(100vh - 120px) !important;
                }
            }
        `;
        
        document.head.appendChild(style);
    }
    
    handleToolbarClick(e) {
        const button = e.target.closest('.mobile-tool-btn');
        if (!button) return;
        
        const action = button.dataset.action;
        this.executeToolbarAction(action);
        this.vibrate(10);
    }
    
    executeToolbarAction(action) {
        if (!this.viewer) return;
        
        switch (action) {
            case 'zoom-in':
                this.viewer.setZoom(this.viewer.viewport.scale * 1.2);
                break;
            case 'zoom-out':
                this.viewer.setZoom(this.viewer.viewport.scale * 0.8);
                break;
            case 'reset':
                this.viewer.resetView();
                break;
            case 'fit':
                this.viewer.fitToWindow();
                break;
            case 'measure':
                this.startMobileMeasurement();
                break;
            case 'window':
                this.showWindowingControls();
                break;
            case 'invert':
                this.viewer.toggleInvert();
                break;
            case 'more':
                this.showMoreOptions();
                break;
        }
    }
    
    // ============================================================================
    // SWIPE NAVIGATION
    // ============================================================================
    
    setupSwipeNavigation() {
        let startX = 0;
        let startY = 0;
        let isSwipe = false;
        
        const canvas = document.getElementById('dicomCanvas');
        if (!canvas) return;
        
        canvas.addEventListener('touchstart', (e) => {
            if (e.touches.length === 1) {
                startX = e.touches[0].clientX;
                startY = e.touches[0].clientY;
                isSwipe = true;
            }
        });
        
        canvas.addEventListener('touchmove', (e) => {
            if (!isSwipe || e.touches.length !== 1) return;
            
            const deltaX = Math.abs(e.touches[0].clientX - startX);
            const deltaY = Math.abs(e.touches[0].clientY - startY);
            
            // If moving more than 20px, it's not a swipe
            if (deltaX > 20 || deltaY > 20) {
                isSwipe = false;
            }
        });
        
        canvas.addEventListener('touchend', (e) => {
            if (!isSwipe || !e.changedTouches.length) return;
            
            const endX = e.changedTouches[0].clientX;
            const endY = e.changedTouches[0].clientY;
            const deltaX = endX - startX;
            const deltaY = endY - startY;
            
            const minSwipeDistance = 50;
            
            if (Math.abs(deltaX) > minSwipeDistance && Math.abs(deltaX) > Math.abs(deltaY)) {
                // Horizontal swipe
                if (deltaX > 0) {
                    this.handleSwipeRight();
                } else {
                    this.handleSwipeLeft();
                }
            } else if (Math.abs(deltaY) > minSwipeDistance) {
                // Vertical swipe
                if (deltaY > 0) {
                    this.handleSwipeDown();
                } else {
                    this.handleSwipeUp();
                }
            }
            
            isSwipe = false;
        });
    }
    
    handleSwipeLeft() {
        // Next image
        if (this.viewer && this.viewer.nextImage) {
            this.viewer.nextImage();
            this.vibrate(15);
        }
    }
    
    handleSwipeRight() {
        // Previous image
        if (this.viewer && this.viewer.previousImage) {
            this.viewer.previousImage();
            this.vibrate(15);
        }
    }
    
    handleSwipeUp() {
        // Show/hide UI
        this.toggleMobileUI();
    }
    
    handleSwipeDown() {
        // Show image info
        this.showImageInfo();
    }
    
    // ============================================================================
    // MOBILE-SPECIFIC FEATURES
    // ============================================================================
    
    showMobileContextMenu(x, y) {
        // Remove existing menu
        const existingMenu = document.querySelector('.mobile-context-menu');
        if (existingMenu) {
            existingMenu.remove();
        }
        
        const menu = document.createElement('div');
        menu.className = 'mobile-context-menu';
        menu.style.left = `${x}px`;
        menu.style.top = `${y}px`;
        
        menu.innerHTML = `
            <button data-action="measure-length">📏 Measure Length</button>
            <button data-action="measure-area">📐 Measure Area</button>
            <button data-action="measure-angle">📐 Measure Angle</button>
            <button data-action="add-annotation">📝 Add Annotation</button>
            <button data-action="window-level">🎛️ Window/Level</button>
            <button data-action="zoom-region">🔍 Zoom Region</button>
            <button data-action="export">📤 Export</button>
            <button data-action="close">❌ Close</button>
        `;
        
        menu.addEventListener('click', (e) => {
            const button = e.target;
            const action = button.dataset.action;
            
            if (action === 'close') {
                menu.remove();
            } else {
                this.executeMobileAction(action, x, y);
                menu.remove();
            }
        });
        
        document.body.appendChild(menu);
        
        // Auto-close after 5 seconds
        setTimeout(() => {
            if (menu.parentNode) {
                menu.remove();
            }
        }, 5000);
    }
    
    executeMobileAction(action, x, y) {
        switch (action) {
            case 'measure-length':
                this.startMobileMeasurement('length');
                break;
            case 'measure-area':
                this.startMobileMeasurement('area');
                break;
            case 'measure-angle':
                this.startMobileMeasurement('angle');
                break;
            case 'add-annotation':
                this.showAnnotationDialog(x, y);
                break;
            case 'window-level':
                this.showWindowingControls();
                break;
            case 'zoom-region':
                this.startRegionZoom(x, y);
                break;
            case 'export':
                this.showExportOptions();
                break;
        }
    }
    
    startMobileMeasurement(type) {
        if (this.viewer && this.viewer.startMeasurement) {
            this.viewer.startMeasurement(type);
            this.showMeasurementInstructions(type);
        }
    }
    
    showMeasurementInstructions(type) {
        const instructions = {
            length: 'Tap two points to measure distance',
            area: 'Tap multiple points to measure area',
            angle: 'Tap three points to measure angle'
        };
        
        this.showToast(instructions[type] || 'Start measuring', 3000);
    }
    
    showToast(message, duration = 2000) {
        const toast = document.createElement('div');
        toast.className = 'mobile-toast';
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            top: 50px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 12px 20px;
            border-radius: 25px;
            z-index: 1002;
            font-size: 14px;
            backdrop-filter: blur(10px);
        `;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            if (toast.parentNode) {
                toast.remove();
            }
        }, duration);
    }
    
    // ============================================================================
    // RESPONSIVE LAYOUT
    // ============================================================================
    
    setupResponsiveLayout() {
        this.handleResize();
        window.addEventListener('resize', this.handleResize.bind(this));
    }
    
    handleResize() {
        const canvas = document.getElementById('dicomCanvas');
        if (!canvas) return;
        
        if (this.isMobile) {
            // Adjust canvas size for mobile
            const container = canvas.parentElement;
            if (container) {
                canvas.width = container.clientWidth;
                canvas.height = window.innerHeight - 120; // Account for toolbar
            }
        }
        
        // Re-render if viewer is available
        if (this.viewer && this.viewer.renderer && this.viewer.currentImage) {
            this.viewer.renderer.handleResize();
        }
    }
    
    handleOrientationChange() {
        // Wait for orientation change to complete
        setTimeout(() => {
            this.handleResize();
            if (this.viewer && this.viewer.fitToWindow) {
                this.viewer.fitToWindow();
            }
        }, 100);
    }
    
    optimizeForMobile() {
        // Reduce cache size for mobile devices
        if (this.viewer && this.viewer.cache) {
            this.viewer.cache.maxSize = 20;
            this.viewer.cache.maxMemory = 100 * 1024 * 1024; // 100MB
        }
        
        // Optimize rendering for mobile
        const canvas = document.getElementById('dicomCanvas');
        if (canvas) {
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'medium'; // Balance quality vs performance
            }
        }
        
        // Add mobile-specific meta tags
        this.addMobileMetaTags();
    }
    
    addMobileMetaTags() {
        const viewport = document.querySelector('meta[name="viewport"]');
        if (!viewport) {
            const meta = document.createElement('meta');
            meta.name = 'viewport';
            meta.content = 'width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes';
            document.head.appendChild(meta);
        }
        
        // Prevent zoom on double tap (iOS Safari)
        const touchAction = document.createElement('meta');
        touchAction.name = 'touch-action';
        touchAction.content = 'manipulation';
        document.head.appendChild(touchAction);
    }
    
    // ============================================================================
    // HAPTIC FEEDBACK
    // ============================================================================
    
    setupVibrationFeedback() {
        this.vibrationSupported = 'vibrate' in navigator;
    }
    
    vibrate(duration) {
        if (this.vibrationSupported && this.isMobile) {
            navigator.vibrate(duration);
        }
    }
    
    // ============================================================================
    // UTILITY METHODS
    // ============================================================================
    
    toggleMobileUI() {
        const toolbar = document.querySelector('.mobile-dicom-toolbar');
        if (toolbar) {
            toolbar.style.display = toolbar.style.display === 'none' ? 'flex' : 'none';
        }
    }
    
    showImageInfo() {
        if (this.viewer && this.viewer.currentImage) {
            const info = `
                Image: ${this.viewer.currentImageIndex + 1}/${this.viewer.currentImages?.length || 1}
                Dimensions: ${this.viewer.currentImage.width || 'N/A'} × ${this.viewer.currentImage.height || 'N/A'}
                Zoom: ${Math.round(this.viewer.viewport.scale * 100)}%
            `;
            this.showToast(info, 4000);
        }
    }
    
    optimizeButtonSizes() {
        // Ensure all interactive elements meet touch target size requirements
        const style = document.createElement('style');
        style.textContent = `
            @media (max-width: 768px) {
                button, .btn, .tool-button {
                    min-width: 44px !important;
                    min-height: 44px !important;
                    padding: 10px !important;
                }
            }
        `;
        document.head.appendChild(style);
    }
}

// Auto-initialize if DICOM viewer is available
document.addEventListener('DOMContentLoaded', function() {
    if (window.professionalViewer) {
        window.dicomMobileSupport = new DicomMobileSupport(window.professionalViewer);
    } else {
        // Wait for viewer to initialize
        const checkViewer = setInterval(() => {
            if (window.professionalViewer) {
                window.dicomMobileSupport = new DicomMobileSupport(window.professionalViewer);
                clearInterval(checkViewer);
            }
        }, 100);
        
        // Stop checking after 10 seconds
        setTimeout(() => clearInterval(checkViewer), 10000);
    }
});

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DicomMobileSupport;
}

console.log('📱 Mobile DICOM Support loaded successfully');