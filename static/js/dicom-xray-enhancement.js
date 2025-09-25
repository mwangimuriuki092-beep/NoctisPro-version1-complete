/**
 * DICOM X-Ray Enhancement
 * Specialized enhancement for X-ray images with improved brightness, contrast, and fitting
 */

class DicomXRayEnhancement {
    constructor() {
        this.isEnabled = true;
        this.enhancementLevel = 'high'; // low, medium, high, maximum
        this.autoDetectXRay = true;
        this.init();
    }

    init() {
        this.setupEnhancementUI();
        this.setupEventListeners();
        console.log('DICOM X-Ray Enhancement initialized');
    }

    setupEnhancementUI() {
        // Add X-ray enhancement controls to the UI
        const rightPanel = document.querySelector('.right-panel');
        if (rightPanel) {
            const enhancementPanel = document.createElement('div');
            enhancementPanel.className = 'panel xray-enhancement-panel';
            enhancementPanel.innerHTML = `
                <h3><i class="fas fa-x-ray"></i> X-Ray Enhancement</h3>
                <div class="enhancement-controls">
                    <label class="checkbox-label">
                        <input type="checkbox" id="xrayEnhancementEnabled" ${this.isEnabled ? 'checked' : ''}>
                        <span>Enable X-Ray Enhancement</span>
                    </label>
                    
                    <div class="enhancement-level">
                        <label>Enhancement Level:</label>
                        <select id="enhancementLevel">
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high" selected>High</option>
                            <option value="maximum">Maximum</option>
                        </select>
                    </div>
                    
                    <div class="enhancement-buttons">
                        <button class="btn btn-primary btn-sm" onclick="xrayEnhancement.applyEnhancement()">
                            <i class="fas fa-magic"></i> Enhance Now
                        </button>
                        <button class="btn btn-secondary btn-sm" onclick="xrayEnhancement.resetEnhancement()">
                            <i class="fas fa-undo"></i> Reset
                        </button>
                    </div>
                    
                    <div class="xray-presets">
                        <h4>X-Ray Quick Presets</h4>
                        <div class="preset-buttons-xray">
                            <button class="btn btn-sm" onclick="xrayEnhancement.applyXRayPreset('chest')">Chest</button>
                            <button class="btn btn-sm" onclick="xrayEnhancement.applyXRayPreset('bone')">Bone</button>
                            <button class="btn btn-sm" onclick="xrayEnhancement.applyXRayPreset('soft')">Soft Tissue</button>
                            <button class="btn btn-sm" onclick="xrayEnhancement.applyXRayPreset('extremity')">Extremity</button>
                        </div>
                    </div>
                </div>
            `;
            rightPanel.appendChild(enhancementPanel);
        }
    }

    setupEventListeners() {
        // Listen for image load events
        document.addEventListener('cornerstoneimageloaded', (e) => {
            if (this.isEnabled && this.autoDetectXRay) {
                this.detectAndEnhanceXRay(e);
            }
        });

        // Listen for modality changes
        document.addEventListener('modalityChanged', (e) => {
            if (this.isEnabled && this.isXRayModality(e.detail.modality)) {
                this.applyEnhancement();
            }
        });

        // UI event listeners
        document.addEventListener('change', (e) => {
            if (e.target.id === 'xrayEnhancementEnabled') {
                this.isEnabled = e.target.checked;
                if (this.isEnabled) {
                    this.applyEnhancement();
                } else {
                    this.resetEnhancement();
                }
            } else if (e.target.id === 'enhancementLevel') {
                this.enhancementLevel = e.target.value;
                if (this.isEnabled) {
                    this.applyEnhancement();
                }
            }
        });
    }

    isXRayModality(modality) {
        const xrayModalities = ['DX', 'CR', 'DR', 'XA', 'RF', 'MG'];
        return xrayModalities.includes(modality?.toUpperCase());
    }

    detectAndEnhanceXRay(event) {
        try {
            const image = event.detail?.image;
            if (!image) return;

            // Try to detect X-ray from metadata
            let isXRay = false;
            if (image.data && image.data.string) {
                const modality = image.data.string('x00080060');
                isXRay = this.isXRayModality(modality);
            }

            // Fallback detection methods
            if (!isXRay) {
                // Check URL for X-ray indicators
                const imageId = event.detail?.imageId || '';
                const xrayIndicators = ['xray', 'x-ray', 'dx', 'cr', 'dr', 'chest', 'bone'];
                isXRay = xrayIndicators.some(indicator => 
                    imageId.toLowerCase().includes(indicator)
                );
            }

            if (isXRay) {
                console.log('X-ray image detected, applying enhancement');
                setTimeout(() => this.applyEnhancement(), 100);
            }
        } catch (error) {
            console.warn('X-ray detection failed:', error);
        }
    }

    applyEnhancement() {
        if (!this.isEnabled) return;

        try {
            // Apply to canvas if available
            this.enhanceCanvas();
            
            // Apply to cornerstone viewport if available
            this.enhanceCornerstone();
            
            // Apply CSS-based enhancement as fallback
            this.enhanceCSSFilters();

            this.showToast(`X-Ray enhancement applied (${this.enhancementLevel})`, 'success');
        } catch (error) {
            console.error('Enhancement application failed:', error);
            this.showToast('Enhancement failed', 'error');
        }
    }

    enhanceCanvas() {
        const canvas = document.querySelector('#dicom-canvas, .dicom-canvas, canvas[id*="dicom"]');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Get enhancement parameters based on level
        const params = this.getEnhancementParameters();
        
        // Apply canvas filters
        ctx.filter = `contrast(${params.contrast}) brightness(${params.brightness}) saturate(${params.saturation}) gamma(${params.gamma})`;
        
        // Redraw if we have access to the current image
        if (window.dicomCanvasFix && window.dicomCanvasFix.currentImage) {
            window.dicomCanvasFix.displayImage(window.dicomCanvasFix.currentImage);
        }

        console.log(`Canvas enhancement applied: ${ctx.filter}`);
    }

    enhanceCornerstone() {
        if (typeof cornerstone === 'undefined') return;

        try {
            const enabledElements = cornerstone.getEnabledElements();
            enabledElements.forEach(enabledElement => {
                const element = enabledElement.element;
                const viewport = cornerstone.getViewport(element);
                
                if (viewport) {
                    // Enhance viewport properties
                    const params = this.getEnhancementParameters();
                    
                    // Adjust window/level for better X-ray visibility
                    if (viewport.voi) {
                        viewport.voi.windowWidth *= params.windowWidthMultiplier;
                        viewport.voi.windowCenter *= params.windowCenterMultiplier;
                    }
                    
                    cornerstone.setViewport(element, viewport);
                }
            });
        } catch (error) {
            console.warn('Cornerstone enhancement failed:', error);
        }
    }

    enhanceCSSFilters() {
        // Apply CSS filters to image containers as fallback
        const imageContainers = document.querySelectorAll(
            '#imageContainer, .image-container, .dicom-viewer, .viewer-container'
        );
        
        const params = this.getEnhancementParameters();
        const filter = `contrast(${params.contrast}) brightness(${params.brightness}) saturate(${params.saturation})`;
        
        imageContainers.forEach(container => {
            container.style.filter = filter;
            container.style.webkitFilter = filter; // Safari support
        });
    }

    getEnhancementParameters() {
        const levels = {
            low: {
                contrast: 1.3,
                brightness: 1.7,
                saturation: 0.85,
                gamma: 0.9,
                windowWidthMultiplier: 1.2,
                windowCenterMultiplier: 1.1
            },
            medium: {
                contrast: 1.6,
                brightness: 2.0,
                saturation: 0.80,
                gamma: 0.85,
                windowWidthMultiplier: 1.4,
                windowCenterMultiplier: 1.2
            },
            high: {
                contrast: 1.9,
                brightness: 2.3,
                saturation: 0.75,
                gamma: 0.8,
                windowWidthMultiplier: 1.6,
                windowCenterMultiplier: 1.3
            },
            maximum: {
                contrast: 2.2,
                brightness: 2.6,
                saturation: 0.70,
                gamma: 0.75,
                windowWidthMultiplier: 1.8,
                windowCenterMultiplier: 1.4
            }
        };

        return levels[this.enhancementLevel] || levels.high;
    }

    applyXRayPreset(presetType) {
        const presets = {
            chest: {
                windowWidth: 3500,
                windowCenter: 800,
                contrast: 1.8,
                brightness: 2.2
            },
            bone: {
                windowWidth: 5000,
                windowCenter: 2500,
                contrast: 2.0,
                brightness: 2.4
            },
            soft: {
                windowWidth: 1000,
                windowCenter: 200,
                contrast: 1.6,
                brightness: 2.0
            },
            extremity: {
                windowWidth: 4500,
                windowCenter: 2000,
                contrast: 1.9,
                brightness: 2.3
            }
        };

        const preset = presets[presetType];
        if (!preset) return;

        // Apply window/level
        if (typeof window.applyPreset === 'function') {
            window.applyPreset(`${presetType} x-ray`);
        } else if (typeof cornerstone !== 'undefined') {
            const enabledElements = cornerstone.getEnabledElements();
            enabledElements.forEach(enabledElement => {
                const element = enabledElement.element;
                const viewport = cornerstone.getViewport(element);
                
                if (viewport && viewport.voi) {
                    viewport.voi.windowWidth = preset.windowWidth;
                    viewport.voi.windowCenter = preset.windowCenter;
                    cornerstone.setViewport(element, viewport);
                }
            });
        }

        // Apply visual enhancement
        this.enhancementLevel = 'high';
        this.applyEnhancement();

        this.showToast(`Applied ${presetType} X-ray preset`, 'success');
    }

    resetEnhancement() {
        try {
            // Reset canvas filters
            const canvas = document.querySelector('#dicom-canvas, .dicom-canvas, canvas[id*="dicom"]');
            if (canvas) {
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.filter = 'none';
                }
            }

            // Reset CSS filters
            const imageContainers = document.querySelectorAll(
                '#imageContainer, .image-container, .dicom-viewer, .viewer-container'
            );
            imageContainers.forEach(container => {
                container.style.filter = 'none';
                container.style.webkitFilter = 'none';
            });

            // Reset cornerstone viewport
            if (typeof cornerstone !== 'undefined') {
                const enabledElements = cornerstone.getEnabledElements();
                enabledElements.forEach(enabledElement => {
                    cornerstone.reset(enabledElement.element);
                });
            }

            this.showToast('Enhancement reset', 'info');
        } catch (error) {
            console.error('Reset failed:', error);
            this.showToast('Reset failed', 'error');
        }
    }

    // Automatic image fitting improvement
    improveImageFitting() {
        try {
            // Reset any zoom/pan to ensure proper fitting
            if (typeof window.resetView === 'function') {
                window.resetView();
            }

            // Force canvas resize and redraw
            if (window.dicomCanvasFix && typeof window.dicomCanvasFix.resetZoomToFit === 'function') {
                window.dicomCanvasFix.resetZoomToFit();
            }

            // Trigger window resize to recalculate canvas dimensions
            window.dispatchEvent(new Event('resize'));

            this.showToast('Image fitting improved', 'success');
        } catch (error) {
            console.error('Image fitting improvement failed:', error);
        }
    }

    showToast(message, type = 'info') {
        if (window.noctisProButtonManager && typeof window.noctisProButtonManager.showToast === 'function') {
            window.noctisProButtonManager.showToast(message, type, 2000);
        } else {
            console.log(`${type.toUpperCase()}: ${message}`);
        }
    }
}

// Initialize X-ray enhancement
const xrayEnhancement = new DicomXRayEnhancement();

// Export for global access
window.xrayEnhancement = xrayEnhancement;
window.DicomXRayEnhancement = DicomXRayEnhancement;

// Add global function for easy access
window.enhanceXRay = () => xrayEnhancement.applyEnhancement();
window.resetXRayEnhancement = () => xrayEnhancement.resetEnhancement();
window.improveImageFitting = () => xrayEnhancement.improveImageFitting();

console.log('DICOM X-Ray Enhancement loaded successfully');