/**
 * DICOM Transform Controls - Zoom, Rotate, and Flip functionality
 * Professional medical image manipulation controls
 */

class DicomTransformControls {
    constructor() {
        this.zoom = 1.0;
        this.rotation = 0; // degrees
        this.panX = 0;
        this.panY = 0;
        this.flipH = false; // horizontal flip
        this.flipV = false; // vertical flip
        this.isDragging = false;
        this.lastMousePos = { x: 0, y: 0 };
        this.canvas = null;
        this.ctx = null;
        this.currentImage = null;
        this.imageInfo = null;
        
        this.init();
    }

    init() {
        this.setupCanvas();
        this.setupEventListeners();
        this.createTransformControls();
        this.setupGlobalFunctions();
        console.log('DICOM Transform Controls initialized');
    }

    setupCanvas() {
        // Find the DICOM canvas
        this.canvas = document.getElementById('dicom-canvas') || 
                     document.querySelector('canvas[id*="dicom"]') ||
                     document.querySelector('.dicom-canvas') ||
                     document.getElementById('dicomCanvas');
        
        if (this.canvas) {
            this.ctx = this.canvas.getContext('2d');
        }
    }

    setupEventListeners() {
        if (!this.canvas) return;

        // Mouse wheel for zoom
        this.canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            
            if (e.ctrlKey || e.metaKey) {
                // Zoom with Ctrl+wheel
                const rect = this.canvas.getBoundingClientRect();
                const mouseX = e.clientX - rect.left;
                const mouseY = e.clientY - rect.top;
                
                const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
                this.zoomAtPoint(mouseX, mouseY, zoomFactor);
            } else {
                // Pan with regular wheel
                if (e.shiftKey) {
                    this.panX += e.deltaY > 0 ? -20 : 20;
                } else {
                    this.panY += e.deltaY > 0 ? -20 : 20;
                }
                this.redraw();
            }
        });

        // Mouse drag for panning
        this.canvas.addEventListener('mousedown', (e) => {
            if (window.activeTool === 'pan' || e.button === 1) { // middle mouse button
                this.isDragging = true;
                const rect = this.canvas.getBoundingClientRect();
                this.lastMousePos = {
                    x: e.clientX - rect.left,
                    y: e.clientY - rect.top
                };
                this.canvas.style.cursor = 'grabbing';
                e.preventDefault();
            }
        });

        this.canvas.addEventListener('mousemove', (e) => {
            if (this.isDragging) {
                const rect = this.canvas.getBoundingClientRect();
                const currentPos = {
                    x: e.clientX - rect.left,
                    y: e.clientY - rect.top
                };
                
                this.panX += currentPos.x - this.lastMousePos.x;
                this.panY += currentPos.y - this.lastMousePos.y;
                
                this.lastMousePos = currentPos;
                this.redraw();
            }
        });

        this.canvas.addEventListener('mouseup', () => {
            this.isDragging = false;
            this.canvas.style.cursor = 'default';
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            
            switch(e.key) {
                case '+':
                case '=':
                    this.zoomIn();
                    e.preventDefault();
                    break;
                case '-':
                    this.zoomOut();
                    e.preventDefault();
                    break;
                case '0':
                    this.resetTransform();
                    e.preventDefault();
                    break;
                case 'r':
                case 'R':
                    if (e.shiftKey) {
                        this.rotateLeft();
                    } else {
                        this.rotateRight();
                    }
                    e.preventDefault();
                    break;
                case 'h':
                case 'H':
                    this.flipHorizontal();
                    e.preventDefault();
                    break;
                case 'v':
                case 'V':
                    this.flipVertical();
                    e.preventDefault();
                    break;
            }
        });
    }

    createTransformControls() {
        // Create control panel if it doesn't exist
        let controlPanel = document.getElementById('dicom-transform-controls');
        
        if (!controlPanel) {
            controlPanel = document.createElement('div');
            controlPanel.id = 'dicom-transform-controls';
            controlPanel.className = 'transform-controls';
            controlPanel.innerHTML = `
                <div class="transform-section">
                    <h6><i class="fas fa-search"></i> Zoom</h6>
                    <div class="control-group">
                        <button class="transform-btn" id="zoom-out" title="Zoom Out (-)">
                            <i class="fas fa-search-minus"></i>
                        </button>
                        <span class="zoom-level" id="zoom-level">100%</span>
                        <button class="transform-btn" id="zoom-in" title="Zoom In (+)">
                            <i class="fas fa-search-plus"></i>
                        </button>
                        <button class="transform-btn" id="zoom-fit" title="Fit to Window">
                            <i class="fas fa-expand-arrows-alt"></i>
                        </button>
                        <button class="transform-btn" id="zoom-actual" title="Actual Size (1:1)">
                            <i class="fas fa-compress-arrows-alt"></i>
                        </button>
                    </div>
                </div>

                <div class="transform-section">
                    <h6><i class="fas fa-sync-alt"></i> Rotate</h6>
                    <div class="control-group">
                        <button class="transform-btn" id="rotate-left" title="Rotate Left (Shift+R)">
                            <i class="fas fa-undo"></i>
                        </button>
                        <span class="rotation-angle" id="rotation-angle">0°</span>
                        <button class="transform-btn" id="rotate-right" title="Rotate Right (R)">
                            <i class="fas fa-redo"></i>
                        </button>
                        <button class="transform-btn" id="rotate-reset" title="Reset Rotation">
                            <i class="fas fa-compass"></i>
                        </button>
                    </div>
                </div>

                <div class="transform-section">
                    <h6><i class="fas fa-arrows-alt-h"></i> Flip</h6>
                    <div class="control-group">
                        <button class="transform-btn" id="flip-horizontal" title="Flip Horizontal (H)">
                            <i class="fas fa-arrows-alt-h"></i>
                        </button>
                        <button class="transform-btn" id="flip-vertical" title="Flip Vertical (V)">
                            <i class="fas fa-arrows-alt-v"></i>
                        </button>
                    </div>
                </div>

                <div class="transform-section">
                    <h6><i class="fas fa-undo-alt"></i> Reset</h6>
                    <div class="control-group">
                        <button class="transform-btn reset-all" id="reset-all" title="Reset All (0)">
                            <i class="fas fa-undo-alt"></i> Reset All
                        </button>
                    </div>
                </div>
            `;

            // Add styles
            const style = document.createElement('style');
            style.textContent = `
                .transform-controls {
                    position: fixed;
                    top: 80px;
                    left: 20px;
                    background: rgba(42, 42, 42, 0.95);
                    border: 1px solid #555;
                    border-radius: 8px;
                    padding: 15px;
                    color: white;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
                    font-size: 12px;
                    z-index: 1000;
                    backdrop-filter: blur(10px);
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
                    min-width: 200px;
                }

                .transform-section {
                    margin-bottom: 15px;
                }

                .transform-section:last-child {
                    margin-bottom: 0;
                }

                .transform-section h6 {
                    margin: 0 0 8px 0;
                    color: #00d4ff;
                    font-size: 11px;
                    font-weight: 600;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }

                .control-group {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    flex-wrap: wrap;
                }

                .transform-btn {
                    background: linear-gradient(135deg, #404040, #2a2a2a);
                    border: 1px solid #555;
                    color: #e0e0e0;
                    padding: 8px 12px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 12px;
                    transition: all 0.2s ease;
                    display: flex;
                    align-items: center;
                    gap: 4px;
                }

                .transform-btn:hover {
                    background: linear-gradient(135deg, #555, #404040);
                    border-color: #00d4ff;
                    color: white;
                    transform: translateY(-1px);
                }

                .transform-btn:active {
                    transform: translateY(0);
                    box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.3);
                }

                .transform-btn.active {
                    background: linear-gradient(135deg, #00d4ff, #0099cc);
                    border-color: #00d4ff;
                    color: white;
                }

                .transform-btn.reset-all {
                    background: linear-gradient(135deg, #ff6b6b, #ee5a52);
                    border-color: #ff6b6b;
                }

                .transform-btn.reset-all:hover {
                    background: linear-gradient(135deg, #ff5252, #f44336);
                }

                .zoom-level, .rotation-angle {
                    background: #1a1a1a;
                    padding: 4px 8px;
                    border-radius: 3px;
                    font-family: 'Courier New', monospace;
                    font-size: 11px;
                    color: #00d4ff;
                    border: 1px solid #333;
                    min-width: 45px;
                    text-align: center;
                }
            `;
            document.head.appendChild(style);

            // Insert into page
            const viewerContainer = document.querySelector('.viewer-container') ||
                                   document.querySelector('.dicom-viewer') ||
                                   document.body;
            viewerContainer.appendChild(controlPanel);
        }

        // Setup button event listeners
        this.setupControlEvents();
    }

    setupControlEvents() {
        // Zoom controls
        document.getElementById('zoom-in')?.addEventListener('click', () => this.zoomIn());
        document.getElementById('zoom-out')?.addEventListener('click', () => this.zoomOut());
        document.getElementById('zoom-fit')?.addEventListener('click', () => this.fitToWindow());
        document.getElementById('zoom-actual')?.addEventListener('click', () => this.actualSize());

        // Rotation controls
        document.getElementById('rotate-left')?.addEventListener('click', () => this.rotateLeft());
        document.getElementById('rotate-right')?.addEventListener('click', () => this.rotateRight());
        document.getElementById('rotate-reset')?.addEventListener('click', () => this.resetRotation());

        // Flip controls
        document.getElementById('flip-horizontal')?.addEventListener('click', () => this.flipHorizontal());
        document.getElementById('flip-vertical')?.addEventListener('click', () => this.flipVertical());

        // Reset all
        document.getElementById('reset-all')?.addEventListener('click', () => this.resetTransform());
    }

    setupGlobalFunctions() {
        // Export functions globally for compatibility
        window.dicomZoom = (factor) => this.setZoom(factor);
        window.dicomRotate = (angle) => this.setRotation(angle);
        window.dicomFlipH = () => this.flipHorizontal();
        window.dicomFlipV = () => this.flipVertical();
        window.dicomReset = () => this.resetTransform();
        
        // Update global variables
        window.zoom = this.zoom;
        window.rotation = this.rotation;
        window.flipH = this.flipH;
        window.flipV = this.flipV;
    }

    // Zoom functions
    zoomIn() {
        this.setZoom(this.zoom * 1.25);
    }

    zoomOut() {
        this.setZoom(this.zoom * 0.8);
    }

    setZoom(newZoom) {
        this.zoom = Math.max(0.1, Math.min(10, newZoom));
        window.zoom = this.zoom;
        this.updateZoomDisplay();
        this.redraw();
    }

    zoomAtPoint(x, y, factor) {
        const oldZoom = this.zoom;
        const newZoom = Math.max(0.1, Math.min(10, oldZoom * factor));
        
        if (newZoom !== oldZoom) {
            // Adjust pan to zoom towards the point
            const centerX = this.canvas.width / 2;
            const centerY = this.canvas.height / 2;
            
            this.panX = (this.panX - x + centerX) * (newZoom / oldZoom) + x - centerX;
            this.panY = (this.panY - y + centerY) * (newZoom / oldZoom) + y - centerY;
            
            this.zoom = newZoom;
            window.zoom = this.zoom;
            this.updateZoomDisplay();
            this.redraw();
        }
    }

    fitToWindow() {
        if (!this.currentImage || !this.canvas) return;
        
        const canvasAspect = this.canvas.width / this.canvas.height;
        const imageAspect = this.currentImage.width / this.currentImage.height;
        
        if (imageAspect > canvasAspect) {
            this.zoom = (this.canvas.width * 0.9) / this.currentImage.width;
        } else {
            this.zoom = (this.canvas.height * 0.9) / this.currentImage.height;
        }
        
        this.panX = 0;
        this.panY = 0;
        window.zoom = this.zoom;
        this.updateZoomDisplay();
        this.redraw();
    }

    actualSize() {
        this.zoom = 1.0;
        this.panX = 0;
        this.panY = 0;
        window.zoom = this.zoom;
        this.updateZoomDisplay();
        this.redraw();
    }

    // Rotation functions
    rotateRight() {
        this.setRotation(this.rotation + 90);
    }

    rotateLeft() {
        this.setRotation(this.rotation - 90);
    }

    setRotation(angle) {
        this.rotation = ((angle % 360) + 360) % 360; // Keep between 0-359
        window.rotation = this.rotation;
        this.updateRotationDisplay();
        this.redraw();
    }

    resetRotation() {
        this.setRotation(0);
    }

    // Flip functions
    flipHorizontal() {
        this.flipH = !this.flipH;
        window.flipH = this.flipH;
        this.updateFlipButtons();
        this.redraw();
    }

    flipVertical() {
        this.flipV = !this.flipV;
        window.flipV = this.flipV;
        this.updateFlipButtons();
        this.redraw();
    }

    // Reset function
    resetTransform() {
        this.zoom = 1.0;
        this.rotation = 0;
        this.panX = 0;
        this.panY = 0;
        this.flipH = false;
        this.flipV = false;
        
        // Update globals
        window.zoom = this.zoom;
        window.rotation = this.rotation;
        window.panX = this.panX;
        window.panY = this.panY;
        window.flipH = this.flipH;
        window.flipV = this.flipV;
        
        this.updateAllDisplays();
        this.redraw();
    }

    // Display update functions
    updateZoomDisplay() {
        const zoomElement = document.getElementById('zoom-level');
        if (zoomElement) {
            zoomElement.textContent = Math.round(this.zoom * 100) + '%';
        }
    }

    updateRotationDisplay() {
        const rotationElement = document.getElementById('rotation-angle');
        if (rotationElement) {
            rotationElement.textContent = this.rotation + '°';
        }
    }

    updateFlipButtons() {
        const flipHBtn = document.getElementById('flip-horizontal');
        const flipVBtn = document.getElementById('flip-vertical');
        
        if (flipHBtn) {
            flipHBtn.classList.toggle('active', this.flipH);
        }
        if (flipVBtn) {
            flipVBtn.classList.toggle('active', this.flipV);
        }
    }

    updateAllDisplays() {
        this.updateZoomDisplay();
        this.updateRotationDisplay();
        this.updateFlipButtons();
    }

    // Set current image
    setImage(image) {
        this.currentImage = image;
        if (image) {
            this.fitToWindow();
        }
    }

    // Main redraw function
    redraw() {
        if (!this.canvas || !this.ctx || !this.currentImage) return;

        // Clear canvas
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Save context
        this.ctx.save();

        // Move to center
        this.ctx.translate(this.canvas.width / 2, this.canvas.height / 2);

        // Apply transformations
        this.ctx.scale(this.zoom, this.zoom);
        this.ctx.translate(this.panX / this.zoom, this.panY / this.zoom);
        this.ctx.rotate(this.rotation * Math.PI / 180);
        this.ctx.scale(this.flipH ? -1 : 1, this.flipV ? -1 : 1);

        // Draw image centered
        this.ctx.drawImage(
            this.currentImage,
            -this.currentImage.width / 2,
            -this.currentImage.height / 2
        );

        // Restore context
        this.ctx.restore();

        // Trigger redraw event for other components
        document.dispatchEvent(new CustomEvent('dicomImageRedrawn', {
            detail: {
                zoom: this.zoom,
                rotation: this.rotation,
                panX: this.panX,
                panY: this.panY,
                flipH: this.flipH,
                flipV: this.flipV
            }
        }));
    }

    // Get current transform state
    getTransform() {
        return {
            zoom: this.zoom,
            rotation: this.rotation,
            panX: this.panX,
            panY: this.panY,
            flipH: this.flipH,
            flipV: this.flipV
        };
    }

    // Apply transform state
    applyTransform(transform) {
        this.zoom = transform.zoom || 1.0;
        this.rotation = transform.rotation || 0;
        this.panX = transform.panX || 0;
        this.panY = transform.panY || 0;
        this.flipH = transform.flipH || false;
        this.flipV = transform.flipV || false;
        
        this.updateAllDisplays();
        this.redraw();
    }
}

// Initialize transform controls when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    if (document.querySelector('canvas[id*="dicom"]') || 
        document.getElementById('dicom-canvas') ||
        document.querySelector('.dicom-canvas')) {
        
        window.dicomTransformControls = new DicomTransformControls();
        console.log('DICOM Transform Controls loaded successfully');
    }
});

// Export for global access
window.DicomTransformControls = DicomTransformControls;