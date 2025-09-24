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
            `;
            
            viewerContainer.appendChild(this.canvas);
            this.ctx = this.canvas.getContext('2d');
            this.setupEventListeners();
            console.log('DICOM canvas created and initialized');
        }
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
            
            const response = await fetch(`/dicom-viewer/api/study/${studyId}/data/`);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
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
            
            const response = await fetch(`/dicom-viewer/series/${seriesId}/images/`);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
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
            
            const response = await fetch(`/dicom-viewer/image/${imageId}/`);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const imageData = await response.json();
            
            // Load the actual image data
            if (imageData.image_url) {
                await this.loadImageFromUrl(imageData.image_url, imageId);
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

    async loadImageFromUrl(imageUrl, imageId) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            
            img.onload = () => {
                this.imageCache.set(imageId, img);
                this.displayImage(img);
                resolve();
            };
            
            img.onerror = () => {
                reject(new Error('Failed to load image from URL'));
            };
            
            img.src = imageUrl;
        });
    }

    loadImageFromPixelData(pixelData, metadata, imageId) {
        try {
            // Create ImageData from pixel data
            const width = metadata.width || 512;
            const height = metadata.height || 512;
            
            // Convert pixel data to ImageData
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            
            const imageData = ctx.createImageData(width, height);
            
            // Handle different pixel data formats
            if (typeof pixelData === 'string') {
                // Base64 encoded data
                const binaryString = atob(pixelData);
                for (let i = 0; i < binaryString.length; i++) {
                    const pixelIndex = i * 4;
                    const value = binaryString.charCodeAt(i);
                    imageData.data[pixelIndex] = value;     // R
                    imageData.data[pixelIndex + 1] = value; // G
                    imageData.data[pixelIndex + 2] = value; // B
                    imageData.data[pixelIndex + 3] = 255;   // A
                }
            } else if (Array.isArray(pixelData)) {
                // Array of pixel values
                for (let i = 0; i < pixelData.length; i++) {
                    const pixelIndex = i * 4;
                    const value = pixelData[i];
                    imageData.data[pixelIndex] = value;     // R
                    imageData.data[pixelIndex + 1] = value; // G
                    imageData.data[pixelIndex + 2] = value; // B
                    imageData.data[pixelIndex + 3] = 255;   // A
                }
            }
            
            ctx.putImageData(imageData, 0, 0);
            
            // Convert canvas to image
            const img = new Image();
            img.onload = () => {
                this.imageCache.set(imageId, img);
                this.displayImage(img);
            };
            img.src = canvas.toDataURL();
            
        } catch (error) {
            console.error('Failed to process pixel data:', error);
            this.displayError('Failed to process image data');
        }
    }

    displayImage(image) {
        if (!this.canvas || !this.ctx) {
            console.error('Canvas not available');
            return;
        }

        // Clear canvas
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        if (image instanceof HTMLImageElement) {
            // Calculate scaling to fit image in canvas while maintaining aspect ratio
            const canvasAspect = this.canvas.width / this.canvas.height;
            const imageAspect = image.width / image.height;
            
            let drawWidth, drawHeight, drawX, drawY;
            
            if (imageAspect > canvasAspect) {
                // Image is wider than canvas
                drawWidth = this.canvas.width;
                drawHeight = drawWidth / imageAspect;
                drawX = 0;
                drawY = (this.canvas.height - drawHeight) / 2;
            } else {
                // Image is taller than canvas
                drawHeight = this.canvas.height;
                drawWidth = drawHeight * imageAspect;
                drawX = (this.canvas.width - drawWidth) / 2;
                drawY = 0;
            }
            
            // Draw image
            this.ctx.drawImage(image, drawX, drawY, drawWidth, drawHeight);
            
            console.log('Image displayed successfully');
        }
    }

    displayCachedImage(imageId) {
        const cachedImage = this.imageCache.get(imageId);
        if (cachedImage) {
            this.displayImage(cachedImage);
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

    resizeCanvas() {
        if (!this.canvas) return;
        
        const container = this.canvas.parentElement;
        if (container) {
            const rect = container.getBoundingClientRect();
            this.canvas.width = rect.width;
            this.canvas.height = rect.height;
            
            // Redisplay current image if available
            if (this.currentImage) {
                const cachedImage = this.imageCache.get(this.currentImage.id);
                if (cachedImage) {
                    this.displayImage(cachedImage);
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