/**
 * DICOM Viewer Improvements Integration
 * Ensures all improvements work together seamlessly
 */

class DicomViewerImprovements {
    constructor() {
        this.initialized = false;
        this.init();
    }

    init() {
        // Wait for DOM and other scripts to load
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.initializeImprovements());
        } else {
            this.initializeImprovements();
        }
    }

    initializeImprovements() {
        if (this.initialized) return;
        
        console.log('Initializing DICOM Viewer Improvements...');
        
        // Add quick action buttons for common X-ray enhancements
        this.addQuickActionButtons();
        
        // Setup automatic enhancement detection
        this.setupAutoEnhancement();
        
        // Add keyboard shortcuts for improvements
        this.setupKeyboardShortcuts();
        
        // Fix common display issues
        this.applyDisplayFixes();
        
        this.initialized = true;
        console.log('DICOM Viewer Improvements initialized successfully');
    }

    addQuickActionButtons() {
        // Create floating action buttons for quick access
        const quickActions = document.createElement('div');
        quickActions.className = 'quick-xray-actions';
        quickActions.innerHTML = `
            <button class="btn" onclick="dicomViewerImprovements.enhanceCurrentImage()" title="Enhance X-Ray">
                <i class="fas fa-magic"></i>
            </button>
            <button class="btn" onclick="dicomViewerImprovements.fitImageProperly()" title="Fit Image">
                <i class="fas fa-expand-arrows-alt"></i>
            </button>
            <button class="btn" onclick="dicomViewerImprovements.resetEnhancements()" title="Reset">
                <i class="fas fa-undo"></i>
            </button>
        `;
        
        document.body.appendChild(quickActions);
    }

    setupAutoEnhancement() {
        // Auto-detect and enhance X-ray images
        document.addEventListener('cornerstoneimageloaded', (e) => {
            setTimeout(() => {
                this.autoEnhanceIfNeeded(e);
            }, 200);
        });

        // Listen for study loads
        document.addEventListener('studyLoaded', (e) => {
            setTimeout(() => {
                this.autoEnhanceIfNeeded(e);
            }, 300);
        });
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Only process if not in input fields
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                return;
            }

            switch (e.key.toLowerCase()) {
                case 'e':
                    e.preventDefault();
                    this.enhanceCurrentImage();
                    break;
                case 'f':
                    e.preventDefault();
                    this.fitImageProperly();
                    break;
                case 'x':
                    e.preventDefault();
                    this.applyXRayPreset();
                    break;
                case 'shift+r':
                    e.preventDefault();
                    this.resetEnhancements();
                    break;
            }
        });
    }

    applyDisplayFixes() {
        // Fix canvas rendering issues
        const style = document.createElement('style');
        style.textContent = `
            /* Improved canvas rendering */
            #dicom-canvas, .dicom-canvas, canvas[id*="dicom"] {
                image-rendering: -moz-crisp-edges;
                image-rendering: -webkit-optimize-contrast;
                image-rendering: crisp-edges;
                image-rendering: pixelated;
                background: #000000 !important;
            }
            
            /* Better image container styling */
            .image-container, #imageContainer {
                background: #000000 !important;
                overflow: hidden;
            }
            
            /* Ensure proper canvas sizing */
            .viewer-container canvas {
                max-width: 100% !important;
                max-height: 100% !important;
                object-fit: contain;
            }
        `;
        document.head.appendChild(style);
    }

    autoEnhanceIfNeeded(event) {
        try {
            // Check if this looks like an X-ray image
            if (this.detectXRayImage(event)) {
                console.log('X-ray image detected, applying automatic enhancements');
                
                // Apply enhancements with a slight delay to ensure image is rendered
                setTimeout(() => {
                    this.enhanceCurrentImage();
                    this.fitImageProperly();
                }, 100);
            }
        } catch (error) {
            console.warn('Auto-enhancement failed:', error);
        }
    }

    detectXRayImage(event) {
        // Try multiple detection methods
        const detectionMethods = [
            () => this.detectFromMetadata(event),
            () => this.detectFromURL(event),
            () => this.detectFromContext()
        ];

        return detectionMethods.some(method => {
            try {
                return method();
            } catch (error) {
                return false;
            }
        });
    }

    detectFromMetadata(event) {
        if (!event?.detail?.image?.data) return false;
        
        try {
            const modality = event.detail.image.data.string('x00080060');
            const xrayModalities = ['DX', 'CR', 'DR', 'XA', 'RF', 'MG'];
            return xrayModalities.includes(modality?.toUpperCase());
        } catch (error) {
            return false;
        }
    }

    detectFromURL(event) {
        const imageId = event?.detail?.imageId || window.location.href;
        const xrayKeywords = ['xray', 'x-ray', 'dx', 'cr', 'dr', 'chest', 'bone', 'extremity'];
        return xrayKeywords.some(keyword => 
            imageId.toLowerCase().includes(keyword)
        );
    }

    detectFromContext() {
        // Check page elements for X-ray indicators
        const indicators = document.querySelectorAll('[data-modality], .modality, #modality');
        return Array.from(indicators).some(el => {
            const text = (el.dataset.modality || el.textContent || el.value || '').toLowerCase();
            return ['dx', 'cr', 'dr', 'xray', 'x-ray'].some(keyword => text.includes(keyword));
        });
    }

    enhanceCurrentImage() {
        try {
            // Use X-ray enhancement if available
            if (window.xrayEnhancement && typeof window.xrayEnhancement.applyEnhancement === 'function') {
                window.xrayEnhancement.applyEnhancement();
                return;
            }

            // Fallback to manual enhancement
            this.applyManualEnhancement();
            
            this.showToast('Image enhanced for better visibility', 'success');
        } catch (error) {
            console.error('Enhancement failed:', error);
            this.showToast('Enhancement failed', 'error');
        }
    }

    applyManualEnhancement() {
        // Apply CSS-based enhancement
        const imageContainers = document.querySelectorAll(
            '#imageContainer, .image-container, .dicom-viewer, .viewer-container, #dicom-canvas, .dicom-canvas'
        );
        
        const enhancementFilter = 'contrast(1.9) brightness(2.3) saturate(0.75)';
        
        imageContainers.forEach(container => {
            container.style.filter = enhancementFilter;
            container.style.webkitFilter = enhancementFilter;
            container.classList.add('xray-enhanced');
        });

        // Apply to canvas context if available
        const canvas = document.querySelector('#dicom-canvas, .dicom-canvas, canvas[id*="dicom"]');
        if (canvas) {
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.filter = enhancementFilter;
                ctx.imageSmoothingEnabled = false;
            }
        }
    }

    fitImageProperly() {
        try {
            // Multiple approaches to fix image fitting
            
            // 1. Use existing reset functions
            if (window.resetView && typeof window.resetView === 'function') {
                window.resetView();
            }
            
            // 2. Use canvas fix if available
            if (window.dicomCanvasFix && typeof window.dicomCanvasFix.resetZoomToFit === 'function') {
                window.dicomCanvasFix.resetZoomToFit();
            }
            
            // 3. Trigger resize to recalculate dimensions
            setTimeout(() => {
                window.dispatchEvent(new Event('resize'));
            }, 100);
            
            // 4. Reset cornerstone viewport if available
            if (typeof cornerstone !== 'undefined') {
                const enabledElements = cornerstone.getEnabledElements();
                enabledElements.forEach(enabledElement => {
                    try {
                        const viewport = cornerstone.getViewport(enabledElement.element);
                        if (viewport) {
                            viewport.scale = 1.0;
                            viewport.translation = { x: 0, y: 0 };
                            cornerstone.setViewport(enabledElement.element, viewport);
                        }
                    } catch (error) {
                        console.warn('Failed to reset cornerstone viewport:', error);
                    }
                });
            }
            
            this.showToast('Image fitted to canvas', 'success');
        } catch (error) {
            console.error('Image fitting failed:', error);
            this.showToast('Image fitting failed', 'error');
        }
    }

    applyXRayPreset() {
        try {
            // Apply chest X-ray preset as default
            if (window.applyPreset && typeof window.applyPreset === 'function') {
                window.applyPreset('chest x-ray');
            } else if (window.xrayEnhancement && typeof window.xrayEnhancement.applyXRayPreset === 'function') {
                window.xrayEnhancement.applyXRayPreset('chest');
            } else {
                // Manual preset application
                this.applyManualXRayPreset();
            }
            
            this.showToast('X-ray preset applied', 'success');
        } catch (error) {
            console.error('X-ray preset failed:', error);
            this.showToast('Preset application failed', 'error');
        }
    }

    applyManualXRayPreset() {
        // Apply manual windowing for X-ray
        if (typeof cornerstone !== 'undefined') {
            const enabledElements = cornerstone.getEnabledElements();
            enabledElements.forEach(enabledElement => {
                try {
                    const viewport = cornerstone.getViewport(enabledElement.element);
                    if (viewport && viewport.voi) {
                        viewport.voi.windowWidth = 3500;
                        viewport.voi.windowCenter = 800;
                        cornerstone.setViewport(enabledElement.element, viewport);
                    }
                } catch (error) {
                    console.warn('Failed to apply manual X-ray preset:', error);
                }
            });
        }
    }

    resetEnhancements() {
        try {
            // Reset all enhancements
            if (window.xrayEnhancement && typeof window.xrayEnhancement.resetEnhancement === 'function') {
                window.xrayEnhancement.resetEnhancement();
            }

            // Reset CSS filters
            const imageContainers = document.querySelectorAll(
                '#imageContainer, .image-container, .dicom-viewer, .viewer-container, #dicom-canvas, .dicom-canvas'
            );
            imageContainers.forEach(container => {
                container.style.filter = 'none';
                container.style.webkitFilter = 'none';
                container.classList.remove('xray-enhanced');
            });

            // Reset canvas
            const canvas = document.querySelector('#dicom-canvas, .dicom-canvas, canvas[id*="dicom"]');
            if (canvas) {
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.filter = 'none';
                }
            }

            // Reset cornerstone
            if (typeof cornerstone !== 'undefined') {
                const enabledElements = cornerstone.getEnabledElements();
                enabledElements.forEach(enabledElement => {
                    try {
                        cornerstone.reset(enabledElement.element);
                    } catch (error) {
                        console.warn('Failed to reset cornerstone element:', error);
                    }
                });
            }

            this.showToast('Enhancements reset', 'info');
        } catch (error) {
            console.error('Reset failed:', error);
            this.showToast('Reset failed', 'error');
        }
    }

    showToast(message, type = 'info') {
        if (window.noctisProButtonManager && typeof window.noctisProButtonManager.showToast === 'function') {
            window.noctisProButtonManager.showToast(message, type, 2000);
        } else if (window.showToast && typeof window.showToast === 'function') {
            window.showToast(message, type, 2000);
        } else {
            console.log(`${type.toUpperCase()}: ${message}`);
        }
    }
}

// Initialize improvements
const dicomViewerImprovements = new DicomViewerImprovements();

// Export for global access
window.dicomViewerImprovements = dicomViewerImprovements;
window.DicomViewerImprovements = DicomViewerImprovements;

console.log('DICOM Viewer Improvements integration loaded successfully');