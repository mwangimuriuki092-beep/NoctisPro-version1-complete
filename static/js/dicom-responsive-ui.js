/**
 * DICOM Viewer Responsive UI System
 * Enhanced mobile compatibility and responsive design
 */

class ResponsiveUISystem {
    constructor() {
        this.isMobile = false;
        this.isTablet = false;
        this.touchDevice = false;
        this.currentBreakpoint = 'desktop';
        this.sidebarCollapsed = false;
        this.panelStates = new Map();
        this.init();
    }

    init() {
        this.detectDevice();
        this.setupBreakpoints();
        this.createResponsiveControls();
        this.setupEventListeners();
        this.adaptUIForDevice();
        this.setupTouchGestures();
        console.log('Responsive UI System initialized');
    }

    detectDevice() {
        // Detect device type
        const userAgent = navigator.userAgent.toLowerCase();
        this.isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/.test(userAgent);
        this.isTablet = /ipad|android(?!.*mobile)|tablet/.test(userAgent);
        this.touchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

        // Set CSS classes for device-specific styling
        document.body.classList.toggle('mobile-device', this.isMobile);
        document.body.classList.toggle('tablet-device', this.isTablet);
        document.body.classList.toggle('touch-device', this.touchDevice);
        
        console.log(`Device detected: Mobile: ${this.isMobile}, Tablet: ${this.isTablet}, Touch: ${this.touchDevice}`);
    }

    setupBreakpoints() {
        this.breakpoints = {
            mobile: 768,
            tablet: 1024,
            desktop: 1200
        };

        this.updateBreakpoint();
    }

    updateBreakpoint() {
        const width = window.innerWidth;
        let newBreakpoint = 'desktop';

        if (width <= this.breakpoints.mobile) {
            newBreakpoint = 'mobile';
        } else if (width <= this.breakpoints.tablet) {
            newBreakpoint = 'tablet';
        }

        if (newBreakpoint !== this.currentBreakpoint) {
            this.currentBreakpoint = newBreakpoint;
            this.onBreakpointChange();
        }
    }

    onBreakpointChange() {
        document.body.className = document.body.className.replace(/breakpoint-\w+/g, '');
        document.body.classList.add(`breakpoint-${this.currentBreakpoint}`);
        
        this.adaptLayoutForBreakpoint();
        
        if (window.showToast) {
            window.showToast(`Layout adapted for ${this.currentBreakpoint}`, 'info');
        }
    }

    createResponsiveControls() {
        // Create mobile navigation toggle
        this.createMobileNavToggle();
        
        // Create panel collapse controls
        this.createPanelControls();
        
        // Create viewport size indicator
        this.createViewportIndicator();
        
        // Create touch-friendly controls
        this.createTouchControls();
    }

    createMobileNavToggle() {
        const header = document.querySelector('.top-navbar') || document.querySelector('.viewer-container');
        if (!header) return;

        const mobileToggle = document.createElement('button');
        mobileToggle.className = 'mobile-nav-toggle';
        mobileToggle.innerHTML = '<i class="fas fa-bars"></i>';
        mobileToggle.title = 'Toggle Navigation';
        mobileToggle.onclick = () => this.toggleMobileNav();

        header.appendChild(mobileToggle);
    }

    createPanelControls() {
        const panels = document.querySelectorAll('.panel');
        panels.forEach(panel => {
            const header = panel.querySelector('h3');
            if (header) {
                const collapseBtn = document.createElement('button');
                collapseBtn.className = 'panel-collapse-btn';
                collapseBtn.innerHTML = '<i class="fas fa-chevron-up"></i>';
                collapseBtn.onclick = (e) => {
                    e.stopPropagation();
                    this.togglePanel(panel);
                };
                
                header.style.display = 'flex';
                header.style.justifyContent = 'space-between';
                header.style.alignItems = 'center';
                header.appendChild(collapseBtn);
            }
        });
    }

    createViewportIndicator() {
        if (this.currentBreakpoint === 'desktop') return;

        const indicator = document.createElement('div');
        indicator.className = 'viewport-indicator';
        indicator.innerHTML = `
            <div class="viewport-info">
                <span class="viewport-size">${window.innerWidth}×${window.innerHeight}</span>
                <span class="viewport-breakpoint">${this.currentBreakpoint}</span>
            </div>
        `;
        
        document.body.appendChild(indicator);
        
        // Auto-hide after 3 seconds
        setTimeout(() => {
            if (indicator.parentNode) {
                indicator.remove();
            }
        }, 3000);
    }

    createTouchControls() {
        if (!this.touchDevice) return;

        // Create touch-friendly toolbar
        this.createTouchToolbar();
        
        // Create gesture indicators
        this.createGestureIndicators();
        
        // Create touch-friendly measurement tools
        this.enhanceMeasurementToolsForTouch();
    }

    createTouchToolbar() {
        const existingToolbar = document.querySelector('.toolbar');
        if (!existingToolbar) return;

        existingToolbar.classList.add('touch-toolbar');
        
        // Make tool buttons larger for touch
        const toolButtons = existingToolbar.querySelectorAll('.tool');
        toolButtons.forEach(btn => {
            btn.classList.add('touch-tool');
        });

        // Add swipe indicator
        const swipeIndicator = document.createElement('div');
        swipeIndicator.className = 'swipe-indicator';
        swipeIndicator.innerHTML = '<i class="fas fa-arrows-alt-h"></i> Swipe for more tools';
        existingToolbar.appendChild(swipeIndicator);
    }

    createGestureIndicators() {
        const gestureHelp = document.createElement('div');
        gestureHelp.className = 'gesture-help';
        gestureHelp.innerHTML = `
            <div class="gesture-help-content">
                <h4>Touch Gestures</h4>
                <div class="gesture-list">
                    <div class="gesture-item">
                        <i class="fas fa-hand-pointer"></i>
                        <span>Tap to select</span>
                    </div>
                    <div class="gesture-item">
                        <i class="fas fa-arrows-alt"></i>
                        <span>Drag to pan</span>
                    </div>
                    <div class="gesture-item">
                        <i class="fas fa-search-plus"></i>
                        <span>Pinch to zoom</span>
                    </div>
                    <div class="gesture-item">
                        <i class="fas fa-hand-paper"></i>
                        <span>Two-finger drag for window/level</span>
                    </div>
                </div>
                <button class="btn btn-sm" onclick="this.closest('.gesture-help').remove()">Got it</button>
            </div>
        `;

        document.body.appendChild(gestureHelp);
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            if (gestureHelp.parentNode) {
                gestureHelp.remove();
            }
        }, 5000);
    }

    enhanceMeasurementToolsForTouch() {
        // Make measurement handles larger for touch
        const style = document.createElement('style');
        style.textContent = `
            .touch-device .measurement-line::before,
            .touch-device .measurement-line::after {
                width: 12px;
                height: 12px;
                border-radius: 50%;
                background: #00d4ff;
                border: 2px solid white;
            }
            
            .touch-device .measurement-point {
                width: 16px;
                height: 16px;
                border: 3px solid white;
            }
        `;
        document.head.appendChild(style);
    }

    setupEventListeners() {
        // Window resize
        window.addEventListener('resize', () => {
            this.handleResize();
        });

        // Orientation change
        window.addEventListener('orientationchange', () => {
            setTimeout(() => this.handleOrientationChange(), 100);
        });

        // Touch events for gestures
        if (this.touchDevice) {
            this.setupTouchEventListeners();
        }

        // Keyboard shortcuts for responsive features
        document.addEventListener('keydown', (e) => {
            if (e.key === 'F11') {
                e.preventDefault();
                this.toggleFullscreen();
            }
            
            if (e.ctrlKey && e.key === 'm') {
                e.preventDefault();
                this.toggleMobileNav();
            }
        });
    }

    setupTouchEventListeners() {
        const viewport = document.getElementById('dicomCanvas') || document.querySelector('.main-viewport');
        if (!viewport) return;

        let touchState = {
            touches: [],
            lastDistance: 0,
            lastCenter: { x: 0, y: 0 },
            isGesture: false
        };

        viewport.addEventListener('touchstart', (e) => {
            this.handleTouchStart(e, touchState);
        });

        viewport.addEventListener('touchmove', (e) => {
            this.handleTouchMove(e, touchState);
        });

        viewport.addEventListener('touchend', (e) => {
            this.handleTouchEnd(e, touchState);
        });

        // Prevent default touch behaviors
        viewport.addEventListener('touchstart', (e) => e.preventDefault());
        viewport.addEventListener('touchmove', (e) => e.preventDefault());
    }

    setupTouchGestures() {
        if (!this.touchDevice) return;

        const viewport = document.getElementById('dicomCanvas');
        if (!viewport) return;

        // Hammer.js integration if available
        if (typeof Hammer !== 'undefined') {
            const hammer = new Hammer(viewport);
            
            // Enable pinch and rotate
            hammer.get('pinch').set({ enable: true });
            hammer.get('rotate').set({ enable: true });
            
            // Pan gesture
            hammer.on('pan', (e) => {
                this.handlePanGesture(e);
            });
            
            // Pinch gesture for zoom
            hammer.on('pinch', (e) => {
                this.handlePinchGesture(e);
            });
            
            // Double tap for reset
            hammer.on('doubletap', (e) => {
                this.handleDoubleTap(e);
            });
            
            // Two-finger pan for windowing
            hammer.on('pan', (e) => {
                if (e.pointers.length === 2) {
                    this.handleWindowingGesture(e);
                }
            });
        }
    }

    // Touch Event Handlers
    handleTouchStart(e, touchState) {
        touchState.touches = Array.from(e.touches);
        
        if (touchState.touches.length === 2) {
            const touch1 = touchState.touches[0];
            const touch2 = touchState.touches[1];
            
            touchState.lastDistance = this.getDistance(touch1, touch2);
            touchState.lastCenter = this.getCenter(touch1, touch2);
            touchState.isGesture = true;
        }
    }

    handleTouchMove(e, touchState) {
        if (touchState.isGesture && e.touches.length === 2) {
            const touch1 = e.touches[0];
            const touch2 = e.touches[1];
            
            const distance = this.getDistance(touch1, touch2);
            const center = this.getCenter(touch1, touch2);
            
            // Zoom gesture
            if (touchState.lastDistance > 0) {
                const scale = distance / touchState.lastDistance;
                this.handleTouchZoom(scale, center);
            }
            
            // Pan gesture
            const deltaX = center.x - touchState.lastCenter.x;
            const deltaY = center.y - touchState.lastCenter.y;
            
            if (Math.abs(deltaX) > 2 || Math.abs(deltaY) > 2) {
                this.handleTouchPan(deltaX, deltaY);
            }
            
            touchState.lastDistance = distance;
            touchState.lastCenter = center;
        }
    }

    handleTouchEnd(e, touchState) {
        if (e.touches.length < 2) {
            touchState.isGesture = false;
            touchState.lastDistance = 0;
        }
    }

    handleTouchZoom(scale, center) {
        if (typeof window.setZoom === 'function' && window.zoomFactor !== undefined) {
            const newZoom = window.zoomFactor * scale;
            window.setZoom(Math.max(0.25, Math.min(3.0, newZoom)));
        }
    }

    handleTouchPan(deltaX, deltaY) {
        if (window.panX !== undefined && window.panY !== undefined) {
            window.panX += deltaX;
            window.panY += deltaY;
            
            if (typeof window.applyTransform === 'function') {
                window.applyTransform();
            }
        }
    }

    // Gesture Handlers (for Hammer.js)
    handlePanGesture(e) {
        if (e.pointers.length === 1) {
            // Single finger pan
            this.handleTouchPan(e.deltaX, e.deltaY);
        }
    }

    handlePinchGesture(e) {
        // Pinch zoom
        this.handleTouchZoom(e.scale, { x: e.center.x, y: e.center.y });
    }

    handleDoubleTap(e) {
        // Reset zoom and pan
        if (typeof window.resetView === 'function') {
            window.resetView();
        }
    }

    handleWindowingGesture(e) {
        // Two-finger pan for window/level adjustment
        if (window.windowWidth !== undefined && window.windowLevel !== undefined) {
            window.windowWidth += e.deltaX * 2;
            window.windowLevel += e.deltaY * 2;
            
            if (typeof window.updateImageDisplay === 'function') {
                window.updateImageDisplay();
            }
        }
    }

    // Layout Adaptation
    adaptLayoutForBreakpoint() {
        switch (this.currentBreakpoint) {
            case 'mobile':
                this.adaptForMobile();
                break;
            case 'tablet':
                this.adaptForTablet();
                break;
            case 'desktop':
                this.adaptForDesktop();
                break;
        }
    }

    adaptForMobile() {
        // Collapse sidebar by default
        this.collapseSidebar(true);
        
        // Stack panels vertically
        this.stackPanelsVertically();
        
        // Simplify toolbar
        this.simplifyToolbar();
        
        // Adjust font sizes
        this.adjustFontSizes('mobile');
        
        // Hide non-essential UI elements
        this.hideNonEssentialElements();
    }

    adaptForTablet() {
        // Partially collapse sidebar
        this.collapseSidebar(false);
        
        // Adjust panel layout
        this.adjustPanelLayout('tablet');
        
        // Adjust font sizes
        this.adjustFontSizes('tablet');
        
        // Show essential UI elements
        this.showEssentialElements();
    }

    adaptForDesktop() {
        // Expand sidebar
        this.collapseSidebar(false);
        
        // Full panel layout
        this.adjustPanelLayout('desktop');
        
        // Normal font sizes
        this.adjustFontSizes('desktop');
        
        // Show all UI elements
        this.showAllElements();
    }

    adaptUIForDevice() {
        if (this.isMobile) {
            this.adaptForMobileDevice();
        } else if (this.isTablet) {
            this.adaptForTabletDevice();
        }
        
        if (this.touchDevice) {
            this.adaptForTouchDevice();
        }
    }

    adaptForMobileDevice() {
        // Mobile-specific adaptations
        document.body.classList.add('mobile-optimized');
        
        // Larger touch targets
        const style = document.createElement('style');
        style.textContent = `
            .mobile-optimized .btn {
                min-height: 44px;
                min-width: 44px;
                padding: 10px 16px;
            }
            
            .mobile-optimized .tool {
                min-height: 50px;
                min-width: 50px;
            }
            
            .mobile-optimized input[type="range"] {
                height: 8px;
            }
            
            .mobile-optimized input[type="range"]::-webkit-slider-thumb {
                width: 20px;
                height: 20px;
            }
        `;
        document.head.appendChild(style);
    }

    adaptForTabletDevice() {
        document.body.classList.add('tablet-optimized');
        
        // Tablet-specific optimizations
        const style = document.createElement('style');
        style.textContent = `
            .tablet-optimized .panel {
                margin-bottom: 10px;
            }
            
            .tablet-optimized .btn {
                min-height: 40px;
                padding: 8px 14px;
            }
        `;
        document.head.appendChild(style);
    }

    adaptForTouchDevice() {
        document.body.classList.add('touch-optimized');
        
        // Touch-specific optimizations
        const style = document.createElement('style');
        style.textContent = `
            .touch-optimized {
                -webkit-touch-callout: none;
                -webkit-user-select: none;
                -khtml-user-select: none;
                -moz-user-select: none;
                -ms-user-select: none;
                user-select: none;
            }
            
            .touch-optimized .selectable {
                -webkit-user-select: text;
                -moz-user-select: text;
                -ms-user-select: text;
                user-select: text;
            }
        `;
        document.head.appendChild(style);
    }

    // UI Control Methods
    toggleMobileNav() {
        const sidebar = document.querySelector('.right-panel');
        const toggle = document.querySelector('.mobile-nav-toggle i');
        
        if (sidebar) {
            this.sidebarCollapsed = !this.sidebarCollapsed;
            sidebar.classList.toggle('collapsed', this.sidebarCollapsed);
            
            if (toggle) {
                toggle.className = this.sidebarCollapsed ? 'fas fa-times' : 'fas fa-bars';
            }
        }
    }

    collapseSidebar(collapse) {
        const sidebar = document.querySelector('.right-panel');
        if (sidebar) {
            this.sidebarCollapsed = collapse;
            sidebar.classList.toggle('collapsed', collapse);
        }
    }

    togglePanel(panel) {
        const content = panel.querySelector('.panel-content') || 
                       panel.children[1]; // Assume second child is content
        const btn = panel.querySelector('.panel-collapse-btn i');
        
        if (content && btn) {
            const isCollapsed = content.style.display === 'none';
            content.style.display = isCollapsed ? 'block' : 'none';
            btn.className = isCollapsed ? 'fas fa-chevron-up' : 'fas fa-chevron-down';
            
            this.panelStates.set(panel.id || panel.className, !isCollapsed);
        }
    }

    stackPanelsVertically() {
        const panels = document.querySelectorAll('.panel');
        panels.forEach(panel => {
            panel.style.width = '100%';
            panel.style.marginBottom = '10px';
        });
    }

    adjustPanelLayout(breakpoint) {
        const panels = document.querySelectorAll('.panel');
        
        switch (breakpoint) {
            case 'tablet':
                panels.forEach(panel => {
                    panel.style.width = '';
                    panel.style.marginBottom = '15px';
                });
                break;
            case 'desktop':
                panels.forEach(panel => {
                    panel.style.width = '';
                    panel.style.marginBottom = '';
                });
                break;
        }
    }

    simplifyToolbar() {
        const toolbar = document.querySelector('.toolbar');
        if (!toolbar) return;
        
        // Hide less essential tools on mobile
        const nonEssentialTools = toolbar.querySelectorAll('[data-tool="annotate"], [data-tool="3d"], [data-tool="mpr"]');
        nonEssentialTools.forEach(tool => {
            tool.style.display = 'none';
        });
    }

    adjustFontSizes(breakpoint) {
        const root = document.documentElement;
        
        switch (breakpoint) {
            case 'mobile':
                root.style.setProperty('--base-font-size', '14px');
                root.style.setProperty('--small-font-size', '12px');
                root.style.setProperty('--large-font-size', '16px');
                break;
            case 'tablet':
                root.style.setProperty('--base-font-size', '15px');
                root.style.setProperty('--small-font-size', '13px');
                root.style.setProperty('--large-font-size', '17px');
                break;
            case 'desktop':
                root.style.setProperty('--base-font-size', '16px');
                root.style.setProperty('--small-font-size', '14px');
                root.style.setProperty('--large-font-size', '18px');
                break;
        }
    }

    hideNonEssentialElements() {
        const nonEssential = document.querySelectorAll('.non-essential, .desktop-only');
        nonEssential.forEach(el => el.style.display = 'none');
    }

    showEssentialElements() {
        const essential = document.querySelectorAll('.essential, .tablet-show');
        essential.forEach(el => el.style.display = '');
    }

    showAllElements() {
        const hidden = document.querySelectorAll('[style*="display: none"]');
        hidden.forEach(el => {
            if (!el.classList.contains('always-hidden')) {
                el.style.display = '';
            }
        });
    }

    // Event Handlers
    handleResize() {
        this.updateBreakpoint();
        this.updateViewportInfo();
        
        // Debounced resize handling
        clearTimeout(this.resizeTimeout);
        this.resizeTimeout = setTimeout(() => {
            this.onResizeComplete();
        }, 250);
    }

    handleOrientationChange() {
        this.detectDevice();
        this.updateBreakpoint();
        this.adaptUIForDevice();
        
        if (window.showToast) {
            window.showToast('Layout adapted for orientation change', 'info');
        }
    }

    onResizeComplete() {
        // Update canvas sizes
        if (window.enhanced3D && typeof window.enhanced3D.handleResize === 'function') {
            window.enhanced3D.handleResize();
        }
        
        // Update other components that need resize handling
        this.updateComponentSizes();
    }

    updateViewportInfo() {
        const indicator = document.querySelector('.viewport-indicator');
        if (indicator) {
            const sizeSpan = indicator.querySelector('.viewport-size');
            const breakpointSpan = indicator.querySelector('.viewport-breakpoint');
            
            if (sizeSpan) sizeSpan.textContent = `${window.innerWidth}×${window.innerHeight}`;
            if (breakpointSpan) breakpointSpan.textContent = this.currentBreakpoint;
        }
    }

    updateComponentSizes() {
        // Update thumbnail sizes
        if (window.enhancedNavigation) {
            const container = document.getElementById('thumbnailContainer');
            if (container) {
                container.style.height = this.currentBreakpoint === 'mobile' ? '150px' : '300px';
            }
        }
        
        // Update 3D viewport
        const viewport3D = document.getElementById('viewport3DContainer');
        if (viewport3D) {
            viewport3D.style.height = this.currentBreakpoint === 'mobile' ? '200px' : '300px';
        }
    }

    toggleFullscreen() {
        if (document.fullscreenElement) {
            document.exitFullscreen();
        } else {
            document.documentElement.requestFullscreen().catch(err => {
                console.warn('Fullscreen not supported:', err);
            });
        }
    }

    // Utility Methods
    getDistance(touch1, touch2) {
        const dx = touch2.clientX - touch1.clientX;
        const dy = touch2.clientY - touch1.clientY;
        return Math.sqrt(dx * dx + dy * dy);
    }

    getCenter(touch1, touch2) {
        return {
            x: (touch1.clientX + touch2.clientX) / 2,
            y: (touch1.clientY + touch2.clientY) / 2
        };
    }

    // Public API
    getCurrentBreakpoint() {
        return this.currentBreakpoint;
    }

    isMobileLayout() {
        return this.currentBreakpoint === 'mobile';
    }

    isTabletLayout() {
        return this.currentBreakpoint === 'tablet';
    }

    isDesktopLayout() {
        return this.currentBreakpoint === 'desktop';
    }

    isTouchDevice() {
        return this.touchDevice;
    }
}

// Add responsive CSS
const responsiveCSS = `
<style>
/* Base responsive styles */
:root {
    --base-font-size: 16px;
    --small-font-size: 14px;
    --large-font-size: 18px;
}

/* Mobile Navigation Toggle */
.mobile-nav-toggle {
    display: none;
    background: #333;
    border: 1px solid #404040;
    color: white;
    padding: 8px 12px;
    border-radius: 4px;
    cursor: pointer;
    position: fixed;
    top: 10px;
    right: 10px;
    z-index: 1000;
}

.mobile-nav-toggle:hover {
    background: #404040;
}

/* Panel Controls */
.panel-collapse-btn {
    background: none;
    border: none;
    color: #ccc;
    cursor: pointer;
    padding: 4px;
    border-radius: 2px;
}

.panel-collapse-btn:hover {
    background: #333;
    color: white;
}

/* Viewport Indicator */
.viewport-indicator {
    position: fixed;
    top: 50px;
    right: 10px;
    background: rgba(0, 0, 0, 0.8);
    color: white;
    padding: 8px 12px;
    border-radius: 4px;
    font-size: 12px;
    z-index: 1000;
    border: 1px solid #00d4ff;
}

.viewport-info {
    display: flex;
    flex-direction: column;
    gap: 4px;
    align-items: center;
}

.viewport-breakpoint {
    color: #00d4ff;
    font-weight: bold;
}

/* Touch Toolbar */
.touch-toolbar {
    padding: 10px;
}

.touch-tool {
    min-height: 50px;
    min-width: 50px;
    margin: 2px;
}

.swipe-indicator {
    text-align: center;
    font-size: 12px;
    color: #666;
    padding: 5px;
    border-top: 1px solid #333;
}

/* Gesture Help */
.gesture-help {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
}

.gesture-help-content {
    background: #2a2a2a;
    padding: 20px;
    border-radius: 8px;
    border: 1px solid #404040;
    max-width: 300px;
    color: white;
}

.gesture-help h4 {
    color: #00d4ff;
    margin: 0 0 15px 0;
    text-align: center;
}

.gesture-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-bottom: 20px;
}

.gesture-item {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 14px;
}

.gesture-item i {
    width: 20px;
    text-align: center;
    color: #00d4ff;
}

/* Responsive Breakpoints */
@media (max-width: 768px) {
    .breakpoint-mobile .mobile-nav-toggle {
        display: block;
    }
    
    .breakpoint-mobile .viewer-container {
        grid-template-columns: 1fr;
        grid-template-rows: 60px 1fr 40px;
    }
    
    .breakpoint-mobile .right-panel {
        position: fixed;
        top: 60px;
        right: -300px;
        width: 280px;
        height: calc(100vh - 100px);
        background: var(--secondary-bg);
        border-left: 1px solid var(--border-color);
        overflow-y: auto;
        transition: right 0.3s ease;
        z-index: 999;
    }
    
    .breakpoint-mobile .right-panel.collapsed {
        right: 0;
    }
    
    .breakpoint-mobile .main-viewport {
        grid-column: 1;
    }
    
    .breakpoint-mobile .toolbar {
        flex-wrap: wrap;
        padding: 5px;
    }
    
    .breakpoint-mobile .tool {
        min-width: 40px;
        min-height: 40px;
        margin: 2px;
    }
    
    .breakpoint-mobile .panel {
        margin-bottom: 10px;
    }
    
    .breakpoint-mobile .panel h3 {
        font-size: 14px;
        padding: 8px 12px;
    }
    
    .breakpoint-mobile .btn {
        min-height: 44px;
        padding: 8px 12px;
    }
    
    .breakpoint-mobile input[type="range"] {
        height: 8px;
    }
    
    .breakpoint-mobile input[type="range"]::-webkit-slider-thumb {
        width: 20px;
        height: 20px;
    }
    
    .breakpoint-mobile .thumbnail-grid {
        grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
    }
    
    .breakpoint-mobile .export-modal-content {
        width: 95%;
        height: 95%;
    }
    
    .breakpoint-mobile .shortcuts-modal {
        width: 95%;
        height: 95%;
    }
}

@media (min-width: 769px) and (max-width: 1024px) {
    .breakpoint-tablet .viewer-container {
        grid-template-columns: 60px 1fr 280px;
    }
    
    .breakpoint-tablet .toolbar .tool span {
        display: none;
    }
    
    .breakpoint-tablet .panel {
        margin-bottom: 12px;
    }
    
    .breakpoint-tablet .thumbnail-grid {
        grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
    }
}

/* Touch Device Styles */
.touch-device {
    -webkit-touch-callout: none;
    -webkit-user-select: none;
    -khtml-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
    user-select: none;
}

.touch-device .selectable {
    -webkit-user-select: text;
    -moz-user-select: text;
    -ms-user-select: text;
    user-select: text;
}

.touch-device .btn {
    min-height: 44px;
    min-width: 44px;
}

.touch-device .tool {
    min-height: 50px;
    min-width: 50px;
}

.touch-device input[type="range"] {
    height: 8px;
}

.touch-device input[type="range"]::-webkit-slider-thumb {
    width: 20px;
    height: 20px;
}

.touch-device input[type="range"]::-moz-range-thumb {
    width: 20px;
    height: 20px;
}

.touch-device .measurement-point {
    width: 16px;
    height: 16px;
    border: 3px solid white;
}

/* High DPI Displays */
@media (-webkit-min-device-pixel-ratio: 2), (min-resolution: 192dpi) {
    .viewer-container {
        image-rendering: -webkit-optimize-contrast;
        image-rendering: crisp-edges;
    }
}

/* Print Styles */
@media print {
    .toolbar,
    .right-panel,
    .mobile-nav-toggle,
    .gesture-help,
    .viewport-indicator {
        display: none !important;
    }
    
    .viewer-container {
        grid-template-columns: 1fr;
        grid-template-rows: 1fr;
    }
    
    .main-viewport {
        grid-column: 1;
        grid-row: 1;
    }
}

/* Accessibility */
@media (prefers-reduced-motion: reduce) {
    * {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
    }
}

@media (prefers-high-contrast: high) {
    :root {
        --primary-bg: #000000;
        --secondary-bg: #000000;
        --text-primary: #ffffff;
        --accent-color: #ffff00;
    }
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
    :root {
        --primary-bg: #0a0a0a;
        --secondary-bg: #1a1a1a;
        --card-bg: #252525;
    }
}
</style>
`;

document.head.insertAdjacentHTML('beforeend', responsiveCSS);

// Initialize responsive UI system
const responsiveUI = new ResponsiveUISystem();

// Export for global access
window.responsiveUI = responsiveUI;
window.ResponsiveUISystem = ResponsiveUISystem;

console.log('DICOM Responsive UI System loaded successfully');