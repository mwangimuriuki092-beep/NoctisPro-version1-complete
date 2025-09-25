/**
 * HTML-Style Canvas Renderer for DICOM Images
 * Matches the rendering approach from the provided HTML file
 * Direct pixel manipulation with window/level application
 */

class HtmlStyleCanvasRenderer {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.currentImageData = null;
        this.windowWidth = 400;
        this.windowLevel = 40;
        this.zoom = 1.0;
        this.panX = 0;
        this.panY = 0;
        this.inverted = false;
        this.rotation = 0;
        this.flipH = false;
        this.flipV = false;
        this.measurements = [];
        this.annotations = [];
    }

    /**
     * Initialize canvas with the HTML file's approach
     */
    initializeCanvas(canvasElement) {
        this.canvas = canvasElement;
        this.ctx = this.canvas.getContext('2d');
        
        // Set canvas size to match container
        this.resizeCanvas();
        
        console.log('HTML-style canvas renderer initialized');
        return this;
    }

    /**
     * Resize canvas to match container - HTML file approach
     */
    resizeCanvas() {
        if (!this.canvas) return;
        
        const container = this.canvas.parentElement;
        if (container) {
            this.canvas.width = container.clientWidth;
            this.canvas.height = container.clientHeight;
            
            // Redraw current image if available
            if (this.currentImageData) {
                this.redrawCurrentImage();
            }
        }
    }

    /**
     * Render DICOM image using the HTML file's direct pixel manipulation approach
     */
    renderDicomImage(imageData) {
        if (!imageData || !imageData.pixel_data || !this.canvas || !this.ctx) {
            console.error('Invalid image data or canvas not initialized');
            return false;
        }

        // Store current image data
        this.currentImageData = imageData;

        // Extract image dimensions
        const width = imageData.columns || imageData.width || 512;
        const height = imageData.rows || imageData.height || 512;
        const pixelData = imageData.pixel_data;

        // Update window/level from DICOM data if available
        if (imageData.window_width) this.windowWidth = imageData.window_width;
        if (imageData.window_center) this.windowLevel = imageData.window_center;

        // Create ImageData from pixel array - SAME AS HTML FILE
        const pixels = new Uint8ClampedArray(pixelData.length * 4);
        
        for (let i = 0; i < pixelData.length; i++) {
            let value = pixelData[i];
            
            // Apply window/level - SAME AS HTML FILE
            value = this.applyWindowing(value, this.windowWidth, this.windowLevel);
            
            // Apply inversion if needed - SAME AS HTML FILE
            if (this.inverted) {
                value = 255 - value;
            }
            
            pixels[i * 4] = value;     // R
            pixels[i * 4 + 1] = value; // G  
            pixels[i * 4 + 2] = value; // B
            pixels[i * 4 + 3] = 255;   // A
        }
        
        const imgData = new ImageData(pixels, width, height);
        
        // Clear and draw - SAME AS HTML FILE METHOD
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Enhanced rendering with transformations (matching HTML file)
        if (this.zoom !== 1.0 || this.panX !== 0 || this.panY !== 0 || this.rotation !== 0 || this.flipH || this.flipV) {
            this.ctx.save();
            this.ctx.translate(this.canvas.width / 2, this.canvas.height / 2);
            this.ctx.scale(this.zoom, this.zoom);
            this.ctx.translate(this.panX, this.panY);
            
            if (this.rotation !== 0) {
                this.ctx.rotate(this.rotation * Math.PI / 180);
            }
            if (this.flipH || this.flipV) {
                this.ctx.scale(this.flipH ? -1 : 1, this.flipV ? -1 : 1);
            }
            
            this.ctx.translate(-width / 2, -height / 2);
            this.ctx.putImageData(imgData, 0, 0);
            this.ctx.restore();
        } else {
            // Simple rendering - center the image on canvas
            const x = (this.canvas.width - width) / 2;
            const y = (this.canvas.height - height) / 2;
            this.ctx.putImageData(imgData, x, y);
        }
        
        // Draw overlays (measurements, annotations, etc.)
        this.drawOverlays();
        
        console.log('DICOM image rendered using HTML-style approach');
        return true;
    }

    /**
     * Apply windowing - EXACT SAME AS HTML FILE
     */
    applyWindowing(pixelValue, ww, wl) {
        const minVal = wl - ww / 2;
        const maxVal = wl + ww / 2;
        
        if (pixelValue <= minVal) return 0;
        if (pixelValue >= maxVal) return 255;
        
        return Math.round(((pixelValue - minVal) / ww) * 255);
    }

    /**
     * Update window width - HTML file approach
     */
    updateWindowWidth(value) {
        this.windowWidth = parseInt(value);
        this.redrawCurrentImage();
    }

    /**
     * Update window level - HTML file approach
     */
    updateWindowLevel(value) {
        this.windowLevel = parseInt(value);
        this.redrawCurrentImage();
    }

    /**
     * Update zoom - HTML file approach
     */
    updateZoom(value) {
        this.zoom = parseFloat(value) / 100;
        this.redrawCurrentImage();
    }

    /**
     * Toggle invert - HTML file approach
     */
    toggleInvert() {
        this.inverted = !this.inverted;
        this.redrawCurrentImage();
    }

    /**
     * Reset view - HTML file approach
     */
    resetView() {
        this.zoom = 1.0;
        this.panX = 0;
        this.panY = 0;
        this.rotation = 0;
        this.flipH = false;
        this.flipV = false;
        this.redrawCurrentImage();
    }

    /**
     * Apply window/level preset - HTML file approach
     */
    applyPreset(preset) {
        const windowPresets = {
            lung: { ww: 1500, wl: -600 },
            bone: { ww: 2000, wl: 300 },
            soft: { ww: 400, wl: 40 },
            brain: { ww: 100, wl: 50 }
        };

        if (windowPresets[preset]) {
            this.windowWidth = windowPresets[preset].ww;
            this.windowLevel = windowPresets[preset].wl;
            this.redrawCurrentImage();
        }
    }

    /**
     * Redraw current image - HTML file approach
     */
    redrawCurrentImage() {
        if (this.currentImageData) {
            this.renderDicomImage(this.currentImageData);
        }
    }

    /**
     * Draw overlays (measurements, annotations, etc.) - HTML file approach
     */
    drawOverlays() {
        // Draw measurements
        this.drawMeasurements();
        
        // Draw annotations
        this.drawAnnotations();
        
        // Draw crosshair if enabled
        if (this.crosshair) {
            this.drawCrosshair();
        }
    }

    /**
     * Draw measurements - HTML file approach
     */
    drawMeasurements() {
        if (!this.measurements || this.measurements.length === 0) return;
        
        this.ctx.strokeStyle = '#ff0000';
        this.ctx.lineWidth = 2;
        this.ctx.fillStyle = '#ff0000';
        this.ctx.font = '14px Arial';
        this.ctx.textAlign = 'center';
        
        this.measurements.forEach((measurement) => {
            if (measurement.type === 'distance') {
                // Draw measurement line
                this.ctx.beginPath();
                this.ctx.moveTo(measurement.startX, measurement.startY);
                this.ctx.lineTo(measurement.endX, measurement.endY);
                this.ctx.stroke();
                
                // Draw measurement points
                this.ctx.fillStyle = '#ff0000';
                this.ctx.beginPath();
                this.ctx.arc(measurement.startX, measurement.startY, 4, 0, 2 * Math.PI);
                this.ctx.fill();
                this.ctx.beginPath();
                this.ctx.arc(measurement.endX, measurement.endY, 4, 0, 2 * Math.PI);
                this.ctx.fill();
                
                // Draw distance text
                const distance = this.calculateDistance(measurement);
                const midX = (measurement.startX + measurement.endX) / 2;
                const midY = (measurement.startY + measurement.endY) / 2;
                
                // Text background
                this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
                this.ctx.fillRect(midX - 30, midY - 20, 60, 16);
                
                // Text
                this.ctx.fillStyle = '#ffff00';
                this.ctx.fillText(distance.text, midX, midY - 8);
            }
        });
    }

    /**
     * Draw annotations - HTML file approach
     */
    drawAnnotations() {
        this.annotations.forEach(annotation => {
            this.ctx.fillStyle = annotation.color || '#ffff00';
            this.ctx.font = '14px Arial';
            this.ctx.fillText(annotation.text, annotation.x, annotation.y);
        });
    }

    /**
     * Draw crosshair - HTML file approach
     */
    drawCrosshair() {
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        
        this.ctx.strokeStyle = '#00ffff';
        this.ctx.lineWidth = 1;
        this.ctx.setLineDash([3, 3]);
        
        this.ctx.beginPath();
        this.ctx.moveTo(0, centerY);
        this.ctx.lineTo(this.canvas.width, centerY);
        this.ctx.moveTo(centerX, 0);
        this.ctx.lineTo(centerX, this.canvas.height);
        this.ctx.stroke();
        
        this.ctx.setLineDash([]);
    }

    /**
     * Calculate distance for measurements - HTML file approach
     */
    calculateDistance(measurement) {
        const deltaX = measurement.endX - measurement.startX;
        const deltaY = measurement.endY - measurement.startY;
        const pixelDistance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        
        // For now, return pixel distance (could be enhanced with pixel spacing)
        return {
            pixels: Math.round(pixelDistance),
            text: `${Math.round(pixelDistance)} px`
        };
    }

    /**
     * Add measurement
     */
    addMeasurement(measurement) {
        this.measurements.push(measurement);
        this.redrawCurrentImage();
    }

    /**
     * Add annotation
     */
    addAnnotation(annotation) {
        this.annotations.push(annotation);
        this.redrawCurrentImage();
    }

    /**
     * Clear all measurements
     */
    clearMeasurements() {
        this.measurements = [];
        this.redrawCurrentImage();
    }

    /**
     * Clear all annotations
     */
    clearAnnotations() {
        this.annotations = [];
        this.redrawCurrentImage();
    }

    /**
     * Handle mouse events for pan operation
     */
    handlePan(deltaX, deltaY) {
        this.panX += deltaX / this.zoom;
        this.panY += deltaY / this.zoom;
        this.redrawCurrentImage();
    }

    /**
     * Handle mouse events for window/level adjustment
     */
    handleWindowLevel(deltaX, deltaY) {
        this.windowWidth = Math.max(1, this.windowWidth + deltaX * 2);
        this.windowLevel = Math.max(-1000, Math.min(1000, this.windowLevel + deltaY * 2));
        this.redrawCurrentImage();
    }

    /**
     * Handle zoom changes
     */
    handleZoom(zoomDelta) {
        const newZoom = this.zoom * zoomDelta;
        this.zoom = Math.max(0.1, Math.min(5.0, newZoom));
        this.redrawCurrentImage();
    }

    /**
     * Get current rendering state
     */
    getState() {
        return {
            windowWidth: this.windowWidth,
            windowLevel: this.windowLevel,
            zoom: this.zoom,
            panX: this.panX,
            panY: this.panY,
            inverted: this.inverted,
            rotation: this.rotation,
            flipH: this.flipH,
            flipV: this.flipV
        };
    }

    /**
     * Set rendering state
     */
    setState(state) {
        if (state.windowWidth !== undefined) this.windowWidth = state.windowWidth;
        if (state.windowLevel !== undefined) this.windowLevel = state.windowLevel;
        if (state.zoom !== undefined) this.zoom = state.zoom;
        if (state.panX !== undefined) this.panX = state.panX;
        if (state.panY !== undefined) this.panY = state.panY;
        if (state.inverted !== undefined) this.inverted = state.inverted;
        if (state.rotation !== undefined) this.rotation = state.rotation;
        if (state.flipH !== undefined) this.flipH = state.flipH;
        if (state.flipV !== undefined) this.flipV = state.flipV;
        
        this.redrawCurrentImage();
    }
}

// Global instance for use throughout the application
window.HtmlStyleCanvasRenderer = new HtmlStyleCanvasRenderer();

// Enhanced integration functions
window.initializeHtmlStyleRenderer = function(canvasElement) {
    return window.HtmlStyleCanvasRenderer.initializeCanvas(canvasElement);
};

window.renderDicomWithHtmlStyle = function(imageData) {
    return window.HtmlStyleCanvasRenderer.renderDicomImage(imageData);
};

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        const canvas = document.getElementById('dicomCanvas') || 
                      document.querySelector('canvas[id*="dicom"]') ||
                      document.querySelector('.dicom-canvas');
        if (canvas) {
            window.HtmlStyleCanvasRenderer.initializeCanvas(canvas);
            console.log('HTML-style canvas renderer auto-initialized');
        }
    });
} else {
    const canvas = document.getElementById('dicomCanvas') || 
                  document.querySelector('canvas[id*="dicom"]') ||
                  document.querySelector('.dicom-canvas');
    if (canvas) {
        window.HtmlStyleCanvasRenderer.initializeCanvas(canvas);
        console.log('HTML-style canvas renderer initialized immediately');
    }
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = HtmlStyleCanvasRenderer;
}