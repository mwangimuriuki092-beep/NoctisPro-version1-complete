/**
 * DICOM Viewer Canvas Fix
 * Fixes image display issues in the DICOM viewer canvas
 */

class DicomCanvasFix {
    constructor() {
        this.currentStudy = null;
        this.currentSeries = null;
        this.currentImage = null;
        this.canvas = null;
        this.ctx = null;
        this.imageCache = new Map();
        this.init();
    }

    init() {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setupCanvas());
        } else {
            this.setupCanvas();
        }
    }

    setupCanvas() {
        // Find the main DICOM canvas
        this.canvas = document.getElementById('dicom-canvas') || 
                     document.querySelector('canvas[id*="dicom"]') ||
                     document.querySelector('.dicom-canvas') ||
                     document.querySelector('#viewer-canvas');

        if (this.canvas) {
            this.ctx = this.canvas.getContext('2d');
            this.setupEventListeners();
            console.log('DICOM canvas initialized successfully');
        } else {
            // Create canvas if it doesn't exist
            this.createCanvas();
        }
    }

    createCanvas() {
        const viewerContainer = document.getElementById('viewer-container') ||
                               document.querySelector('.viewer-container') ||
                               document.querySelector('.dicom-viewer');

        if (viewerContainer) {
            this.canvas = document.createElement('canvas');
            this.canvas.id = 'dicom-canvas';
            this.canvas.className = 'dicom-canvas';
            this.canvas.style.cssText = `
                width: 100%;
                height: 100%;
                background: #000;
                cursor: crosshair;
                image-rendering: pixelated;
                image-rendering: -moz-crisp-edges;
                image-rendering: crisp-edges;
                image-rendering: -webkit-optimize-contrast;
            `;
            
            viewerContainer.appendChild(this.canvas);
            this.ctx = this.canvas.getContext('2d');
            
            // Set high-resolution canvas for medical images
            this.setupHighResolutionCanvas();
            this.setupEventListeners();
            console.log('DICOM canvas created and initialized with high resolution');
        }
    }

    setupHighResolutionCanvas() {
        if (!this.canvas) return;
        
        // Get device pixel ratio for high-DPI displays
        const dpr = window.devicePixelRatio || 1;
        const rect = this.canvas.getBoundingClientRect();
        
        // Detect modality for resolution optimization
        const modality = this.detectModality();
        
        // Modality-specific resolution multipliers - FIXED for proper scaling
        let resolutionMultiplier = 1.0; // Default - standard scaling
        if (['DX', 'CR', 'DR', 'XA', 'RF'].includes(modality)) {
            resolutionMultiplier = 1.0; // X-ray images - standard resolution, no extra scaling
        } else if (['CT'].includes(modality)) {
            resolutionMultiplier = 1.0; // CT - standard resolution
        } else if (['MR', 'MRI'].includes(modality)) {
            resolutionMultiplier = 1.0; // MRI - standard resolution
        } else if (['US'].includes(modality)) {
            resolutionMultiplier = 1.0; // Ultrasound - standard resolution
        }
        
        this.canvas.width = rect.width * dpr * resolutionMultiplier;
        this.canvas.height = rect.height * dpr * resolutionMultiplier;
        
        // Scale canvas back down using CSS
        this.canvas.style.width = rect.width + 'px';
        this.canvas.style.height = rect.height + 'px';
        
        // Scale the drawing context to match
        this.ctx.scale(dpr * resolutionMultiplier, dpr * resolutionMultiplier);
        
        // Set canvas modality attribute for future reference
        this.canvas.dataset.modality = modality;
        
        console.log(`High-resolution canvas setup for ${modality}: ${this.canvas.width}x${this.canvas.height} (${resolutionMultiplier}x DPR: ${dpr})`);
    }

    setupEventListeners() {
        // Listen for study/image load events
        document.addEventListener('studyLoaded', (event) => {
            this.currentStudy = event.detail;
            this.loadStudyImages();
        });

        document.addEventListener('imageSelected', (event) => {
            this.displayImage(event.detail);
        });

        // Listen for view button clicks
        document.addEventListener('click', (event) => {
            if (event.target.classList.contains('view-btn') || 
                event.target.closest('.view-btn')) {
                event.preventDefault();
                const studyId = event.target.dataset.studyId || 
                               event.target.closest('[data-study-id]')?.dataset.studyId;
                if (studyId) {
                    this.loadStudy(studyId);
                }
            }
        });

        // Canvas resize handling
        window.addEventListener('resize', () => this.resizeCanvas());
        
        // Initial resize
        this.resizeCanvas();
    }

    async loadStudy(studyId) {
        try {
            console.log(`Loading study ${studyId}...`);
            
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
                const errorText = await response.text();
                throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
            }
            
            const studyData = await response.json();
            this.currentStudy = studyData;
            
            // Load first series and first image
            if (studyData.series && studyData.series.length > 0) {
                const firstSeries = studyData.series[0];
                await this.loadSeries(firstSeries.id);
            }
            
            // Dispatch event for other components
            document.dispatchEvent(new CustomEvent('studyLoaded', {
                detail: studyData
            }));
            
        } catch (error) {
            console.error('Failed to load study:', error);
            this.displayError(`Failed to load study: ${error.message}`);
        }
    }

    async loadSeries(seriesId) {
        try {
            console.log(`Loading series ${seriesId}...`);
            
            const response = await fetch(`/dicom-viewer/series/${seriesId}/images/`, {
                method: 'GET',
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                    'Accept': 'application/json',
                    'X-CSRFToken': this.getCSRFToken()
                },
                credentials: 'same-origin'
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
            }
            
            const seriesData = await response.json();
            this.currentSeries = seriesData;
            
            // Load first image
            if (seriesData.images && seriesData.images.length > 0) {
                await this.loadImage(seriesData.images[0].id);
            }
            
        } catch (error) {
            console.error('Failed to load series:', error);
            this.displayError(`Failed to load series: ${error.message}`);
        }
    }

    async loadImage(imageId) {
        try {
            console.log(`Loading image ${imageId}...`);
            
            // Check cache first
            if (this.imageCache.has(imageId)) {
                this.displayCachedImage(imageId);
                return;
            }
            
            const response = await fetch(`/dicom-viewer/image/${imageId}/`, {
                method: 'GET',
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                    'Accept': 'application/json',
                    'X-CSRFToken': this.getCSRFToken()
                },
                credentials: 'same-origin'
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
            }
            
            const imageData = await response.json();
            
            // Load the actual image data
            if (imageData.image_url) {
                await this.loadImageFromUrl(imageData.image_url, imageId, imageData);
            } else if (imageData.pixel_data) {
                this.loadImageFromPixelData(imageData.pixel_data, imageData, imageId);
            } else {
                throw new Error('No image data available');
            }
            
            this.currentImage = imageData;
            
        } catch (error) {
            console.error('Failed to load image:', error);
            this.displayError(`Failed to load image: ${error.message}`);
        }
    }

    async loadImageFromUrl(imageUrl, imageId, metadata = null, retryCount = 0) {
        const maxRetries = 3;
        
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            
            img.onload = () => {
                this.imageCache.set(imageId, img);
                this.displayImage(img, metadata);
                resolve();
            };
            
            img.onerror = async () => {
                if (retryCount < maxRetries) {
                    console.warn(`Image load failed, retrying... (${retryCount + 1}/${maxRetries})`);
                    // Wait a bit before retrying
                    await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
                    try {
                        await this.loadImageFromUrl(imageUrl, imageId, metadata, retryCount + 1);
                        resolve();
                    } catch (error) {
                        reject(error);
                    }
                } else {
                    reject(new Error(`Failed to load image from URL after ${maxRetries} retries: ${imageUrl}`));
                }
            };
            
            // Add timeout to prevent hanging requests
            setTimeout(() => {
                if (!img.complete) {
                    img.src = ''; // Cancel the request
                    reject(new Error('Image load timeout'));
                }
            }, 10000); // 10 second timeout
            
            img.src = imageUrl;
        });
    }

    loadImageFromPixelData(pixelData, metadata, imageId) {
        try {
            // Create ImageData from pixel data
            const width = metadata.width || metadata.columns || 512;
            const height = metadata.height || metadata.rows || 512;
            
            // Convert pixel data to ImageData
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            
            const imageData = ctx.createImageData(width, height);
            let processedPixels = [];
            
            // Handle different pixel data formats
            if (typeof pixelData === 'string') {
                // Base64 encoded data
                const binaryString = atob(pixelData);
                for (let i = 0; i < binaryString.length; i++) {
                    processedPixels.push(binaryString.charCodeAt(i));
                }
            } else if (Array.isArray(pixelData)) {
                processedPixels = pixelData;
            }
            
            // Apply window/level for better visibility if metadata available
            let windowCenter = metadata.window_center || metadata.windowLevel || 127;
            let windowWidth = metadata.window_width || metadata.windowWidth || 256;
            
            // Normalize pixel values for better visibility
            const minValue = Math.min(...processedPixels);
            const maxValue = Math.max(...processedPixels);
            const range = maxValue - minValue;
            
            for (let i = 0; i < processedPixels.length; i++) {
                const pixelIndex = i * 4;
                
                // Normalize and apply windowing
                let value = processedPixels[i];
                
                // Window/Level transformation
                if (range > 0) {
                    value = ((value - windowCenter + windowWidth / 2) / windowWidth) * 255;
                    value = Math.max(0, Math.min(255, value));
                } else {
                    // Fallback normalization
                    value = ((value - minValue) / (range || 1)) * 255;
                }
                
                imageData.data[pixelIndex] = value;     // R
                imageData.data[pixelIndex + 1] = value; // G
                imageData.data[pixelIndex + 2] = value; // B
                imageData.data[pixelIndex + 3] = 255;   // A
            }
            
            ctx.putImageData(imageData, 0, 0);
            
            // Convert canvas to image
            const img = new Image();
            img.onload = () => {
                this.imageCache.set(imageId, img);
                this.displayImage(img, metadata);
            };
            img.src = canvas.toDataURL();
            
        } catch (error) {
            console.error('Failed to process pixel data:', error);
            this.displayError('Failed to process image data');
        }
    }

    displayImage(image, metadata = null) {
        if (!this.canvas || !this.ctx) {
            console.error('Canvas not available');
            return;
        }

        if (image instanceof HTMLImageElement) {
            // Store current image
            this.currentImage = image;
            
            try {
                // Detect modality from various sources (with fallback)
                const modality = this.detectModality(metadata);
                
                // Use modality-specific display
                this.modalitySpecificDisplayImage(image, modality);
            } catch (error) {
                console.warn('Modality-specific display failed, using basic display:', error);
                // Fallback to basic display if modality-specific fails
                this.basicDisplayImage(image);
            }
        }
    }

    detectModality(metadata = null) {
        try {
            // Try to detect modality from metadata
            if (metadata && metadata.modality) {
                return metadata.modality.toUpperCase();
            }

            // Try to detect from current study/series info
            if (this.currentStudy && this.currentStudy.modality) {
                return this.currentStudy.modality.toUpperCase();
            }

            if (this.currentSeries && this.currentSeries.modality) {
                return this.currentSeries.modality.toUpperCase();
            }

            // Try to detect from canvas data attributes
            if (this.canvas && this.canvas.dataset.modality) {
                return this.canvas.dataset.modality.toUpperCase();
            }

            // Try to detect from page elements (safely)
            try {
                const modalityElement = document.querySelector('[data-modality]') || 
                                       document.querySelector('.modality') ||
                                       document.querySelector('#modality');
                
                if (modalityElement) {
                    const modality = modalityElement.dataset.modality || 
                                    modalityElement.textContent || 
                                    modalityElement.value;
                    if (modality && typeof modality === 'string') {
                        return modality.toUpperCase();
                    }
                }
            } catch (domError) {
                console.warn('DOM query for modality failed:', domError);
            }

            // Default to CT if unknown (safe fallback)
            return 'CT';
        } catch (error) {
            console.warn('Modality detection failed, defaulting to CT:', error);
            return 'CT';
        }
    }

    modalitySpecificDisplayImage(image, modality = 'CT') {
        // Clear canvas with black background
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Calculate image dimensions and positioning
        const canvasAspect = this.canvas.width / this.canvas.height;
        const imageAspect = image.width / image.height;
        
        let drawWidth, drawHeight, drawX, drawY;
        
        // Modality-specific scale factors - FIXED for proper fit
        let scaleFactor = 0.85; // Default - better fit with margins
        if (['DX', 'CR', 'DR', 'XA', 'RF'].includes(modality)) {
            scaleFactor = 0.80; // X-ray images - reduced from 0.98 to fit properly
        } else if (['CT', 'MR', 'MRI'].includes(modality)) {
            scaleFactor = 0.85; // CT/MR - reduced for better fit
        }
        
        if (imageAspect > canvasAspect) {
            // Image is wider than canvas
            drawWidth = this.canvas.width * scaleFactor;
            drawHeight = drawWidth / imageAspect;
        } else {
            // Image is taller than canvas
            drawHeight = this.canvas.height * scaleFactor;
            drawWidth = drawHeight * imageAspect;
        }
        
        // Center the image
        drawX = (this.canvas.width - drawWidth) / 2;
        drawY = (this.canvas.height - drawHeight) / 2;
        
        // Apply modality-specific rendering settings
        this.applyModalityRenderingSettings(modality);
        
        // Draw image with modality-appropriate quality
        this.ctx.drawImage(image, drawX, drawY, drawWidth, drawHeight);
        
        // Reset filter for overlay elements
        this.ctx.filter = 'none';
        
        // Store image info for zoom/pan operations
        this.imageInfo = {
            x: drawX,
            y: drawY,
            width: drawWidth,
            height: drawHeight,
            originalWidth: image.width,
            originalHeight: image.height,
            scaleFactor: Math.min(drawWidth / image.width, drawHeight / image.height),
            modality: modality
        };
        
        console.log(`Image displayed successfully with ${modality}-specific rendering`);
    }

    applyModalityRenderingSettings(modality) {
        try {
            // Reset to defaults first
            this.ctx.globalAlpha = 1.0;
            this.ctx.filter = 'none';
            this.ctx.imageSmoothingEnabled = true;
            this.ctx.imageSmoothingQuality = 'high';

            if (['DX', 'CR', 'DR', 'XA', 'RF'].includes(modality)) {
                // X-ray modalities: Match reference image exactly
                this.ctx.imageSmoothingEnabled = false; // Critical for X-ray detail
                this.ctx.filter = 'contrast(1.15) brightness(0.92) saturate(0.85)';
                console.log(`Applied reference-matched X-ray settings for ${modality}`);
                
            } else if (['CT'].includes(modality)) {
                // CT: Match reference medical imaging characteristics
                this.ctx.imageSmoothingEnabled = false; // Preserve CT detail
                this.ctx.filter = 'contrast(1.12) brightness(0.94) saturate(0.90)';
                console.log(`Applied reference-matched CT settings for ${modality}`);
                
            } else if (['MR', 'MRI'].includes(modality)) {
                // MRI: Match reference medical imaging display
                this.ctx.imageSmoothingEnabled = true;
                this.ctx.imageSmoothingQuality = 'high';
                this.ctx.filter = 'contrast(1.10) brightness(0.93) saturate(0.95)';
                console.log(`Applied reference-matched MRI settings for ${modality}`);
                
            } else if (['US'].includes(modality)) {
                // Ultrasound: Match reference brightness characteristics
                this.ctx.imageSmoothingEnabled = true;
                this.ctx.imageSmoothingQuality = 'high';
                this.ctx.filter = 'contrast(1.08) brightness(0.95) saturate(0.88)';
                console.log(`Applied reference-matched Ultrasound settings for ${modality}`);
                
            } else if (['NM', 'PT'].includes(modality)) {
                // Nuclear Medicine/PET: Match reference with slight enhancement
                this.ctx.imageSmoothingEnabled = true;
                this.ctx.imageSmoothingQuality = 'high';
                this.ctx.filter = 'contrast(1.18) brightness(0.91) saturate(1.05)';
                console.log(`Applied reference-matched Nuclear Medicine settings for ${modality}`);
                
            } else {
                // Default/Unknown: Match reference image characteristics
                this.ctx.imageSmoothingEnabled = false;
                this.ctx.filter = 'contrast(1.12) brightness(0.93) saturate(0.90)';
                console.log(`Applied reference-matched default settings for ${modality}`);
            }
        } catch (error) {
            console.warn('Failed to apply modality rendering settings, using defaults:', error);
            // Safe fallback
            this.ctx.globalAlpha = 1.0;
            this.ctx.filter = 'none';
            this.ctx.imageSmoothingEnabled = false;
        }
    }

    // Keep the old method for backwards compatibility - SAFE VERSION
    basicDisplayImage(image) {
        try {
            // Clear canvas with black background
            this.ctx.fillStyle = '#000';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

            // Calculate image dimensions and positioning
            const canvasAspect = this.canvas.width / this.canvas.height;
            const imageAspect = image.width / image.height;
            
            let drawWidth, drawHeight, drawX, drawY;
            const scaleFactor = 0.80; // Reduced from 0.9 for better fit
            
            if (imageAspect > canvasAspect) {
                drawWidth = this.canvas.width * scaleFactor;
                drawHeight = drawWidth / imageAspect;
            } else {
                drawHeight = this.canvas.height * scaleFactor;
                drawWidth = drawHeight * imageAspect;
            }
            
            drawX = (this.canvas.width - drawWidth) / 2;
            drawY = (this.canvas.height - drawHeight) / 2;
            
            // Safe rendering settings - Match reference image exactly
            this.ctx.globalAlpha = 1.0;
            this.ctx.imageSmoothingEnabled = false;
            this.ctx.filter = 'contrast(1.12) brightness(0.93)';
            
            // Draw image
            this.ctx.drawImage(image, drawX, drawY, drawWidth, drawHeight);
            
            // Reset filter
            this.ctx.filter = 'none';
            
            // Store image info
            this.imageInfo = {
                x: drawX,
                y: drawY,
                width: drawWidth,
                height: drawHeight,
                originalWidth: image.width,
                originalHeight: image.height,
                scaleFactor: Math.min(drawWidth / image.width, drawHeight / image.height)
            };
            
            console.log('Image displayed successfully with safe basic rendering');
        } catch (error) {
            console.error('Basic image display failed:', error);
            // Ultra-safe fallback - just draw the image as-is
            try {
                this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
                this.ctx.drawImage(image, 0, 0, this.canvas.width, this.canvas.height);
            } catch (fallbackError) {
                console.error('Even fallback display failed:', fallbackError);
            }
        }
    }

    displayCachedImage(imageId, metadata = null) {
        const cachedImage = this.imageCache.get(imageId);
        if (cachedImage) {
            this.displayImage(cachedImage, metadata);
        }
    }

    displayError(message) {
        if (!this.canvas || !this.ctx) return;
        
        // Clear canvas
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Display error message
        this.ctx.fillStyle = '#ff4444';
        this.ctx.font = '16px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(message, this.canvas.width / 2, this.canvas.height / 2);
        
        console.error('DICOM Viewer Error:', message);
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

    resizeCanvas() {
        if (!this.canvas) return;
        
        const container = this.canvas.parentElement;
        if (container) {
            // Update high-resolution canvas setup on resize
            this.setupHighResolutionCanvas();
            
            // Redisplay current image if available
            if (this.currentImage) {
                const cachedImage = this.imageCache.get(this.currentImage.id);
                if (cachedImage) {
                    this.displayImage(cachedImage, this.currentImage);
                }
            }
        }
    }
}

// Initialize the canvas fix when script loads
const dicomCanvasFix = new DicomCanvasFix();

// Export for global access
window.DicomCanvasFix = DicomCanvasFix;
window.dicomCanvasFix = dicomCanvasFix;