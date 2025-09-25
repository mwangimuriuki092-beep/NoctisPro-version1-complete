/**
 * High-Quality Medical Image Renderer
 * Professional-grade image rendering for DICOM medical images
 * Optimized for DX, CR, MG, CT, MR, US, and other modalities
 */

class HighQualityImageRenderer {
    constructor() {
        this.dpr = window.devicePixelRatio || 1;
        this.canvas = null;
        this.ctx = null;
        this.imageCache = new Map();
        this.renderingOptions = {
            antialiasing: true,
            sharpening: true,
            contrastEnhancement: true,
            noiseReduction: true
        };
    }

    /**
     * Initialize canvas with high-quality settings
     */
    initializeCanvas(canvasElement) {
        this.canvas = canvasElement;
        this.ctx = this.canvas.getContext('2d');
        
        // Enable high-quality rendering
        this.ctx.imageSmoothingEnabled = true;
        this.ctx.imageSmoothingQuality = 'high';
        
        return this;
    }

    /**
     * Render medical image with modality-specific optimizations
     */
    renderMedicalImage(imageElement, modality = '', options = {}) {
        if (!this.canvas || !this.ctx || !imageElement.complete) {
            return false;
        }

        const mergedOptions = { ...this.renderingOptions, ...options };
        
        // Get display dimensions
        const rect = this.canvas.getBoundingClientRect();
        const displayWidth = rect.width;
        const displayHeight = rect.height;
        
        // Set canvas size for high-DPI displays with better scaling
        const scaledWidth = displayWidth * this.dpr;
        const scaledHeight = displayHeight * this.dpr;
        
        // Only resize if dimensions changed to prevent flickering
        if (this.canvas.width !== scaledWidth || this.canvas.height !== scaledHeight) {
            this.canvas.width = scaledWidth;
            this.canvas.height = scaledHeight;
        }
        
        // Scale canvas back down using CSS
        this.canvas.style.width = displayWidth + 'px';
        this.canvas.style.height = displayHeight + 'px';
        
        // Scale drawing context for high-DPI
        this.ctx.scale(this.dpr, this.dpr);
        
        // Apply modality-specific rendering settings
        this.applyModalitySettings(modality, mergedOptions);
        
        // Calculate aspect-preserving dimensions with proper scaling
        const imgAspect = imageElement.naturalWidth / imageElement.naturalHeight;
        const canvasAspect = displayWidth / displayHeight;
        
        let drawWidth, drawHeight, drawX, drawY;
        const fitScale = 0.80; // Scale factor to ensure image fits with margins
        
        if (imgAspect > canvasAspect) {
            drawWidth = displayWidth * fitScale;
            drawHeight = drawWidth / imgAspect;
            drawX = (displayWidth - drawWidth) / 2;
            drawY = (displayHeight - drawHeight) / 2;
        } else {
            drawHeight = displayHeight * fitScale;
            drawWidth = drawHeight * imgAspect;
            drawX = (displayWidth - drawWidth) / 2;
            drawY = (displayHeight - drawHeight) / 2;
        }
        
        // Clear canvas
        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(0, 0, displayWidth, displayHeight);
        
        // Apply transforms if available - FIXED ZOOM/PAN HANDLING
        if (typeof zoomFactor !== 'undefined' && typeof panX !== 'undefined' && typeof panY !== 'undefined') {
            this.ctx.save();
            
            // Clamp zoom factor to more conservative range to prevent excessive zoom
            const clampedZoom = Math.max(0.2, Math.min(1.5, zoomFactor));
            
            // Apply transforms with better centering
            this.ctx.translate(displayWidth / 2 + panX, displayHeight / 2 + panY);
            this.ctx.scale(clampedZoom, clampedZoom);
            this.ctx.translate(-displayWidth / 2, -displayHeight / 2);
            
            // Adjust draw coordinates for zoom - keep original positioning
            drawX = drawX;
            drawY = drawY;
            drawWidth = drawWidth;
            drawHeight = drawHeight;
        }
        
        // Render image with high quality
        this.ctx.drawImage(imageElement, drawX, drawY, drawWidth, drawHeight);
        
        if (typeof zoomFactor !== 'undefined') {
            this.ctx.restore();
        }
        
        // Skip post-processing to prevent white image issue
        // Post-processing disabled to maintain medical image integrity
        
        return true;
    }

    /**
     * Apply modality-specific rendering settings
     */
    applyModalitySettings(modality, options) {
        const upperModality = modality.toUpperCase();
        
        // Configure rendering based on modality
        switch (upperModality) {
            case 'DX':
            case 'CR':
            case 'MG':
                // Digital Radiography, Computed Radiography, Mammography - Match reference image
                this.ctx.filter = 'contrast(1.15) brightness(0.92) saturate(0.85)';
                break;
            case 'CT':
                // Computed Tomography - Match reference characteristics
                this.ctx.filter = 'contrast(1.12) brightness(0.94)';
                break;
            case 'MR':
            case 'MRI':
                // Magnetic Resonance - Match reference imaging
                this.ctx.filter = 'contrast(1.10) brightness(0.93) saturate(0.95)';
                break;
            case 'US':
                // Ultrasound - Match reference brightness
                this.ctx.filter = 'contrast(1.08) brightness(0.95)';
                break;
            case 'XA':
            case 'RF':
                // X-Ray Angiography, Radiofluoroscopy - Match reference medical display
                this.ctx.filter = 'contrast(1.16) brightness(0.91)';
                break;
            default:
                // Default medical imaging - Match reference image
                this.ctx.filter = 'contrast(1.12) brightness(0.93)';
        }
    }

    /**
     * Apply post-processing effects for enhanced image quality
     */
    applyPostProcessing(modality, options) {
        if (!options.contrastEnhancement && !options.sharpening) return;
        
        try {
            const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
            const data = imageData.data;
            
            if (options.contrastEnhancement) {
                // Apply histogram equalization-like enhancement
                this.enhanceContrast(data, modality);
            }
            
            if (options.sharpening) {
                // Apply unsharp mask
                this.applySharpeningFilter(data, imageData.width, imageData.height);
            }
            
            this.ctx.putImageData(imageData, 0, 0);
        } catch (error) {
            console.warn('Post-processing failed:', error);
        }
    }

    /**
     * Enhance contrast using adaptive histogram equalization
     */
    enhanceContrast(data, modality) {
        const histogram = new Array(256).fill(0);
        const pixelCount = data.length / 4;
        
        // Build histogram
        for (let i = 0; i < data.length; i += 4) {
            const gray = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
            histogram[gray]++;
        }
        
        // Calculate cumulative distribution
        const cdf = new Array(256);
        cdf[0] = histogram[0];
        for (let i = 1; i < 256; i++) {
            cdf[i] = cdf[i - 1] + histogram[i];
        }
        
        // Normalize CDF
        const cdfMin = cdf.find(val => val > 0);
        const factor = 255 / (pixelCount - cdfMin);
        
        // Apply enhancement with modality-specific strength
        let strength = 0.3; // Default
        switch (modality.toUpperCase()) {
            case 'DX':
            case 'CR':
            case 'MG':
                strength = 0.4; // Stronger for radiography
                break;
            case 'CT':
                strength = 0.25; // Moderate for CT
                break;
            case 'MR':
            case 'MRI':
                strength = 0.35; // Good for MR
                break;
            case 'US':
                strength = 0.5; // Strong for ultrasound
                break;
        }
        
        for (let i = 0; i < data.length; i += 4) {
            const gray = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
            const enhanced = Math.round((cdf[gray] - cdfMin) * factor);
            const blended = Math.round(gray * (1 - strength) + enhanced * strength);
            
            data[i] = data[i + 1] = data[i + 2] = Math.max(0, Math.min(255, blended));
        }
    }

    /**
     * Apply sharpening filter using unsharp mask
     */
    applySharpeningFilter(data, width, height) {
        const kernel = [
            0, -1, 0,
            -1, 5, -1,
            0, -1, 0
        ];
        
        const output = new Uint8ClampedArray(data.length);
        
        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                const idx = (y * width + x) * 4;
                
                let r = 0, g = 0, b = 0;
                
                for (let ky = -1; ky <= 1; ky++) {
                    for (let kx = -1; kx <= 1; kx++) {
                        const kidx = ((y + ky) * width + (x + kx)) * 4;
                        const weight = kernel[(ky + 1) * 3 + (kx + 1)];
                        
                        r += data[kidx] * weight;
                        g += data[kidx + 1] * weight;
                        b += data[kidx + 2] * weight;
                    }
                }
                
                output[idx] = Math.max(0, Math.min(255, r));
                output[idx + 1] = Math.max(0, Math.min(255, g));
                output[idx + 2] = Math.max(0, Math.min(255, b));
                output[idx + 3] = data[idx + 3]; // Alpha
            }
        }
        
        // Copy processed data back
        for (let i = 0; i < data.length; i++) {
            data[i] = output[i];
        }
    }

    /**
     * Set rendering quality options
     */
    setQualityOptions(options) {
        this.renderingOptions = { ...this.renderingOptions, ...options };
        return this;
    }

    /**
     * Clear canvas
     */
    clear() {
        if (this.ctx) {
            this.ctx.fillStyle = '#000000';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        }
        return this;
    }
}

// Global instance for use in DICOM viewer
window.HighQualityRenderer = new HighQualityImageRenderer();

// Enhanced render function for medical images
window.renderImageToCanvas = function(imgElement, canvas, modality = '') {
    if (!window.HighQualityRenderer.canvas) {
        window.HighQualityRenderer.initializeCanvas(canvas);
    }
    
    return window.HighQualityRenderer.renderMedicalImage(imgElement, modality, {
        antialiasing: true,
        sharpening: false, // Disabled to prevent white image issue
        contrastEnhancement: false, // Disabled to prevent white image issue
        noiseReduction: false // Keep false to preserve medical data integrity
    });
};

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        const canvas = document.getElementById('dicomCanvas');
        if (canvas) {
            window.HighQualityRenderer.initializeCanvas(canvas);
        }
    });
} else {
    const canvas = document.getElementById('dicomCanvas');
    if (canvas) {
        window.HighQualityRenderer.initializeCanvas(canvas);
    }
}