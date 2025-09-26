/**
 * Working DICOM Canvas - Actually displays and manipulates DICOM images
 * No bullshit, just working image display and manipulation
 */

class WorkingDicomCanvas {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.currentImage = null;
        this.currentImageData = null;
        this.viewport = {
            scale: 1.0,
            offsetX: 0,
            offsetY: 0,
            windowCenter: 127,
            windowWidth: 256,
            invert: false
        };
        
        this.isDragging = false;
        this.lastMouseX = 0;
        this.lastMouseY = 0;
        
        this.performanceStats = {
            renderTime: 0,
            loadTime: 0,
            lastRender: 0
        };
        
        this.init();
    }
    
    init() {
        console.log('🎯 Initializing Working DICOM Canvas...');
        this.setupCanvas();
        this.setupEvents();
        console.log('✅ Working DICOM Canvas ready');
    }
    
    setupCanvas() {
        // Find existing canvas or create one
        this.canvas = document.getElementById('dicom-canvas') ||
                     document.querySelector('.dicom-canvas') ||
                     document.querySelector('#viewer-canvas') ||
                     this.createCanvas();
        
        if (!this.canvas) {
            console.error('❌ Failed to create canvas');
            return;
        }
        
        this.ctx = this.canvas.getContext('2d');
        this.resizeCanvas();
        
        // Set canvas properties for medical imaging
        this.ctx.imageSmoothingEnabled = false; // Preserve pixel accuracy
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        console.log(`📐 Canvas initialized: ${this.canvas.width}x${this.canvas.height}`);
    }
    
    createCanvas() {
        const container = document.getElementById('viewer-container') ||
                         document.querySelector('.viewer-container') ||
                         document.querySelector('.dicom-viewer') ||
                         document.body;
        
        const canvas = document.createElement('canvas');
        canvas.id = 'working-dicom-canvas';
        canvas.className = 'working-dicom-canvas';
        canvas.style.cssText = `
            width: 100%;
            height: 100%;
            background: #000;
            cursor: crosshair;
            image-rendering: pixelated;
            image-rendering: -moz-crisp-edges;
            image-rendering: crisp-edges;
        `;
        
        container.appendChild(canvas);
        return canvas;
    }
    
    resizeCanvas() {
        if (!this.canvas) return;
        
        const rect = this.canvas.getBoundingClientRect();
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;
        
        if (this.currentImageData) {
            this.render();
        }
    }
    
    setupEvents() {
        if (!this.canvas) return;
        
        // Mouse events for pan and zoom
        this.canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
        this.canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
        this.canvas.addEventListener('mouseup', this.onMouseUp.bind(this));
        this.canvas.addEventListener('wheel', this.onWheel.bind(this));
        
        // Touch events for mobile
        this.canvas.addEventListener('touchstart', this.onTouchStart.bind(this));
        this.canvas.addEventListener('touchmove', this.onTouchMove.bind(this));
        this.canvas.addEventListener('touchend', this.onTouchEnd.bind(this));
        
        // Keyboard shortcuts
        document.addEventListener('keydown', this.onKeyDown.bind(this));
        
        // Window resize
        window.addEventListener('resize', this.resizeCanvas.bind(this));
        
        // Study loading events
        document.addEventListener('click', this.onViewButtonClick.bind(this));
        
        console.log('📡 Event listeners attached');
    }
    
    async loadStudy(studyId) {
        const startTime = performance.now();
        
        try {
            console.log(`🔄 Loading study ${studyId}...`);
            
            const response = await fetch(`/dicom-viewer/api/study/${studyId}/data/`, {
                method: 'GET',
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                    'Accept': 'application/json',
                    'X-CSRFToken': this.getCSRFToken()
                },
                credentials: 'same-origin'
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const studyData = await response.json();
            
            // Load first image from first series
            if (studyData.series && studyData.series.length > 0 &&
                studyData.series[0].images && studyData.series[0].images.length > 0) {
                
                const firstImage = studyData.series[0].images[0];
                await this.loadImage(firstImage.id);
            }
            
            this.performanceStats.loadTime = performance.now() - startTime;
            console.log(`✅ Study loaded in ${this.performanceStats.loadTime.toFixed(2)}ms`);
            
        } catch (error) {
            console.error('❌ Failed to load study:', error);
            this.showError(`Failed to load study: ${error.message}`);
        }
    }
    
    async loadImage(imageId) {
        const startTime = performance.now();
        
        try {
            console.log(`🔄 Loading image ${imageId}...`);
            
            const response = await fetch(`/dicom-viewer/api/image/${imageId}/display/`, {
                method: 'GET',
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                    'Accept': 'application/json',
                    'X-CSRFToken': this.getCSRFToken()
                },
                credentials: 'same-origin'
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const imageData = await response.json();
            
            if (!imageData.success || !imageData.image_data) {
                throw new Error('No image data received');
            }
            
            // Load the base64 image
            await this.displayImageData(imageData);
            
            const loadTime = performance.now() - startTime;
            console.log(`✅ Image loaded in ${loadTime.toFixed(2)}ms`);
            
        } catch (error) {
            console.error('❌ Failed to load image:', error);
            this.showError(`Failed to load image: ${error.message}`);
        }
    }
    
    async displayImageData(imageData) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            
            img.onload = () => {
                this.currentImage = img;
                this.currentImageData = imageData;
                
                // Set initial window/level if available
                if (imageData.window_center && imageData.window_width) {
                    this.viewport.windowCenter = Array.isArray(imageData.window_center) ? 
                        imageData.window_center[0] : imageData.window_center;
                    this.viewport.windowWidth = Array.isArray(imageData.window_width) ? 
                        imageData.window_width[0] : imageData.window_width;
                }
                
                // Reset viewport
                this.resetViewport();
                
                // Render the image
                this.render();
                
                console.log(`📷 Image displayed: ${img.width}x${img.height}`);
                resolve();
            };
            
            img.onerror = () => {
                reject(new Error('Failed to load image data'));
            };
            
            img.src = imageData.image_data;
        });
    }
    
    render() {
        if (!this.canvas || !this.ctx || !this.currentImage) return;
        
        const startTime = performance.now();
        
        // Clear canvas
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Calculate image position and size
        const { x, y, width, height } = this.calculateImageTransform();
        
        // Save context
        this.ctx.save();
        
        // Apply transformations
        this.ctx.translate(this.viewport.offsetX, this.viewport.offsetY);
        
        // Apply window/level and inversion
        this.applyImageFilters();
        
        // Draw the image
        this.ctx.drawImage(this.currentImage, x, y, width, height);
        
        // Restore context
        this.ctx.restore();
        
        // Draw overlays
        this.drawOverlays();
        
        this.performanceStats.renderTime = performance.now() - startTime;
        this.performanceStats.lastRender = performance.now();
    }
    
    calculateImageTransform() {
        if (!this.currentImage) return { x: 0, y: 0, width: 0, height: 0 };
        
        const canvasAspect = this.canvas.width / this.canvas.height;
        const imageAspect = this.currentImage.width / this.currentImage.height;
        
        let width, height;
        
        // Calculate scale to fit image properly within canvas (not zoomed in)
        if (imageAspect > canvasAspect) {
            // Image is wider than canvas - fit to width
            width = this.canvas.width * 0.95 * this.viewport.scale; // 95% of canvas width
            height = width / imageAspect;
        } else {
            // Image is taller than canvas - fit to height  
            height = this.canvas.height * 0.95 * this.viewport.scale; // 95% of canvas height
            width = height * imageAspect;
        }
        
        const x = (this.canvas.width - width) / 2;
        const y = (this.canvas.height - height) / 2;
        
        return { x, y, width, height };
    }
    
    applyImageFilters() {
        // Improved brightness and contrast for medical imaging
        // Make images much brighter and higher contrast by default
        
        // Base brightness boost for medical images (they're often too dark)
        let baseBrightness = 1.8; // 80% brighter by default
        let baseContrast = 1.6;   // 60% more contrast by default
        
        // Additional adjustments based on window/level if available
        if (this.currentImageData && this.currentImageData.window_center && this.currentImageData.window_width) {
            // Use DICOM window/level values for proper medical display
            const windowCenter = this.viewport.windowCenter;
            const windowWidth = this.viewport.windowWidth;
            
            // Convert window/level to brightness/contrast adjustments
            const brightnessAdjust = (windowCenter - 128) / 128 * 0.5;
            const contrastAdjust = Math.max(0.5, Math.min(3.0, windowWidth / 200));
            
            baseBrightness += brightnessAdjust;
            baseContrast = contrastAdjust;
        }
        
        // Ensure values are within reasonable bounds
        baseBrightness = Math.max(0.5, Math.min(3.0, baseBrightness));
        baseContrast = Math.max(0.5, Math.min(3.0, baseContrast));
        
        let filter = `contrast(${baseContrast}) brightness(${baseBrightness}) saturate(0.9)`;
        
        if (this.viewport.invert) {
            filter += ' invert(1)';
        }
        
        this.ctx.filter = filter;
    }
    
    drawOverlays() {
        if (!this.currentImageData) return;
        
        // Reset filter for overlays
        this.ctx.filter = 'none';
        
        // Draw image info
        this.ctx.fillStyle = '#00ff00';
        this.ctx.font = '14px monospace';
        this.ctx.textAlign = 'left';
        
        const info = [
            `Scale: ${(this.viewport.scale * 100).toFixed(0)}%`,
            `WW/WL: ${this.viewport.windowWidth.toFixed(0)}/${this.viewport.windowCenter.toFixed(0)}`,
            `Size: ${this.currentImageData.width}x${this.currentImageData.height}`,
            `Render: ${this.performanceStats.renderTime.toFixed(1)}ms`
        ];
        
        info.forEach((text, index) => {
            this.ctx.fillText(text, 10, 20 + index * 18);
        });
        
        // Draw crosshair at center
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        
        this.ctx.strokeStyle = '#00ff00';
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.moveTo(centerX - 10, centerY);
        this.ctx.lineTo(centerX + 10, centerY);
        this.ctx.moveTo(centerX, centerY - 10);
        this.ctx.lineTo(centerX, centerY + 10);
        this.ctx.stroke();
    }
    
    showError(message) {
        if (!this.canvas || !this.ctx) return;
        
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.ctx.fillStyle = '#ff0000';
        this.ctx.font = '16px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(message, this.canvas.width / 2, this.canvas.height / 2);
        
        console.error('🚫 DICOM Canvas Error:', message);
    }
    
    // Event handlers
    onViewButtonClick(event) {
        const viewBtn = event.target.closest('.view-btn');
        if (!viewBtn) return;
        
        event.preventDefault();
        const studyId = viewBtn.dataset.studyId || 
                       viewBtn.closest('[data-study-id]')?.dataset.studyId;
        
        if (studyId) {
            this.loadStudy(studyId);
        }
    }
    
    onMouseDown(event) {
        this.isDragging = true;
        this.lastMouseX = event.clientX;
        this.lastMouseY = event.clientY;
        this.canvas.style.cursor = 'grabbing';
    }
    
    onMouseMove(event) {
        if (!this.isDragging) return;
        
        const deltaX = event.clientX - this.lastMouseX;
        const deltaY = event.clientY - this.lastMouseY;
        
        if (event.shiftKey) {
            // Window/Level adjustment
            this.viewport.windowCenter += deltaX;
            this.viewport.windowWidth += deltaY;
            this.viewport.windowWidth = Math.max(1, this.viewport.windowWidth);
        } else {
            // Pan
            this.viewport.offsetX += deltaX;
            this.viewport.offsetY += deltaY;
        }
        
        this.lastMouseX = event.clientX;
        this.lastMouseY = event.clientY;
        
        this.render();
    }
    
    onMouseUp(event) {
        this.isDragging = false;
        this.canvas.style.cursor = 'crosshair';
    }
    
    onWheel(event) {
        event.preventDefault();
        
        const scaleFactor = event.deltaY > 0 ? 0.9 : 1.1;
        const newScale = this.viewport.scale * scaleFactor;
        
        // Limit zoom range
        this.viewport.scale = Math.max(0.1, Math.min(10, newScale));
        
        this.render();
    }
    
    onTouchStart(event) {
        event.preventDefault();
        if (event.touches.length === 1) {
            const touch = event.touches[0];
            this.lastMouseX = touch.clientX;
            this.lastMouseY = touch.clientY;
            this.isDragging = true;
        }
    }
    
    onTouchMove(event) {
        event.preventDefault();
        if (event.touches.length === 1 && this.isDragging) {
            const touch = event.touches[0];
            const deltaX = touch.clientX - this.lastMouseX;
            const deltaY = touch.clientY - this.lastMouseY;
            
            this.viewport.offsetX += deltaX;
            this.viewport.offsetY += deltaY;
            
            this.lastMouseX = touch.clientX;
            this.lastMouseY = touch.clientY;
            
            this.render();
        }
    }
    
    onTouchEnd(event) {
        event.preventDefault();
        this.isDragging = false;
    }
    
    onKeyDown(event) {
        switch (event.key) {
            case 'r':
            case 'R':
                this.resetViewport();
                break;
            case 'i':
            case 'I':
                this.viewport.invert = !this.viewport.invert;
                this.render();
                break;
            case '+':
            case '=':
                this.viewport.scale *= 1.2;
                this.render();
                break;
            case '-':
                this.viewport.scale *= 0.8;
                this.render();
                break;
            case 'f':
            case 'F':
                this.fitToWindow();
                break;
        }
    }
    
    // Utility methods
    resetViewport() {
        this.viewport.scale = 1.0;
        this.viewport.offsetX = 0;
        this.viewport.offsetY = 0;
        this.render();
    }
    
    fitToWindow() {
        if (!this.currentImage) return;
        
        const canvasAspect = this.canvas.width / this.canvas.height;
        const imageAspect = this.currentImage.width / this.currentImage.height;
        
        if (imageAspect > canvasAspect) {
            this.viewport.scale = this.canvas.width / this.currentImage.width;
        } else {
            this.viewport.scale = this.canvas.height / this.currentImage.height;
        }
        
        this.viewport.offsetX = 0;
        this.viewport.offsetY = 0;
        this.render();
    }
    
    setWindowLevel(center, width) {
        this.viewport.windowCenter = center;
        this.viewport.windowWidth = width;
        this.render();
    }
    
    zoom(factor) {
        this.viewport.scale *= factor;
        this.viewport.scale = Math.max(0.1, Math.min(10, this.viewport.scale));
        this.render();
    }
    
    pan(deltaX, deltaY) {
        this.viewport.offsetX += deltaX;
        this.viewport.offsetY += deltaY;
        this.render();
    }
    
    invert() {
        this.viewport.invert = !this.viewport.invert;
        this.render();
    }
    
    getCSRFToken() {
        const metaToken = document.querySelector('meta[name="csrf-token"]');
        if (metaToken) return metaToken.getAttribute('content');
        
        const cookieToken = document.cookie.split(';')
            .find(row => row.startsWith('csrftoken='));
        if (cookieToken) return cookieToken.split('=')[1];
        
        const inputToken = document.querySelector('input[name="csrfmiddlewaretoken"]');
        if (inputToken) return inputToken.value;
        
        return '';
    }
    
    getPerformanceStats() {
        return {
            ...this.performanceStats,
            fps: this.performanceStats.renderTime > 0 ? 1000 / this.performanceStats.renderTime : 0,
            hasImage: !!this.currentImage,
            viewport: { ...this.viewport }
        };
    }
}

// Initialize the working canvas
let workingDicomCanvas = null;

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        workingDicomCanvas = new WorkingDicomCanvas();
    });
} else {
    workingDicomCanvas = new WorkingDicomCanvas();
}

// Global access
window.WorkingDicomCanvas = WorkingDicomCanvas;
window.workingDicomCanvas = workingDicomCanvas;

// Debug functions
window.loadTestStudy = (studyId) => workingDicomCanvas?.loadStudy(studyId);
window.getDicomStats = () => workingDicomCanvas?.getPerformanceStats();

console.log('🎯 Working DICOM Canvas loaded - This one actually works!');