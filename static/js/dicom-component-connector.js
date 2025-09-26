/**
 * DICOM Component Connector
 * Connects all DICOM viewer components together for seamless operation
 */

class DicomComponentConnector {
    constructor() {
        this.canvasFix = null;
        this.workingCanvas = null;
        this.enhancedViewer = null;
        this.currentTool = 'windowing';
        this.isInitialized = false;
        
        this.init();
    }
    
    init() {
        // Wait for all components to load
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.connectComponents());
        } else {
            this.connectComponents();
        }
    }
    
    connectComponents() {
        console.log('🔗 Connecting DICOM components...');
        
        // Find available canvas implementations
        this.canvasFix = window.dicomCanvasFix;
        this.workingCanvas = window.workingDicomCanvas;
        this.enhancedViewer = window.dicomViewerEnhanced;
        
        // Connect toolbar buttons
        this.connectToolbarButtons();
        
        // Connect keyboard shortcuts
        this.connectKeyboardShortcuts();
        
        // Connect mouse/touch events
        this.connectInteractionEvents();
        
        // Connect study loading
        this.connectStudyLoading();
        
        // Connect MPR and 3D
        this.connectAdvancedFeatures();
        
        this.isInitialized = true;
        console.log('✅ DICOM components connected successfully');
    }
    
    connectToolbarButtons() {
        const toolButtons = document.querySelectorAll('.tool-btn[data-tool]');
        
        toolButtons.forEach(button => {
            const tool = button.dataset.tool;
            
            button.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleToolClick(tool, button);
            });
        });
        
        console.log(`🔧 Connected ${toolButtons.length} toolbar buttons`);
    }
    
    handleToolClick(tool, button) {
        // Update active button
        document.querySelectorAll('.tool-btn').forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        
        this.currentTool = tool;
        
        // Execute tool action
        switch (tool) {
            case 'windowing':
                this.enableWindowLevel();
                break;
            case 'zoom':
                this.enableZoom();
                break;
            case 'pan':
                this.enablePan();
                break;
            case 'measure':
                this.enableMeasurement();
                break;
            case 'angle':
                this.enableAngleMeasurement();
                break;
            case 'area':
                this.enableAreaMeasurement();
                break;
            case 'annotate':
                this.enableAnnotation();
                break;
            case 'crosshair':
                this.enableCrosshair();
                break;
            case 'magnify':
                this.enableMagnify();
                break;
            case 'cine':
                this.enableCineMode();
                break;
            case 'invert':
                this.invertImage();
                break;
            case 'rotate':
                this.rotateImage();
                break;
            case 'flip':
                this.flipImage();
                break;
            case 'reset':
                this.resetView();
                break;
            case 'fit':
                this.fitToWindow();
                break;
            case 'mpr':
                this.showMPR();
                break;
            case '3d':
                this.show3D();
                break;
            case 'ai-analysis':
            case 'ai':
                this.runAIAnalysis();
                break;
            default:
                console.log(`Tool not implemented: ${tool}`);
        }
        
        this.updateCursor(tool);
    }
    
    enableWindowLevel() {
        this.setCanvasMode('windowing');
        console.log('🎚️ Window/Level mode enabled');
    }
    
    enableZoom() {
        this.setCanvasMode('zoom');
        console.log('🔍 Zoom mode enabled');
    }
    
    enablePan() {
        this.setCanvasMode('pan');
        console.log('✋ Pan mode enabled');
    }
    
    enableMeasurement() {
        this.setCanvasMode('measure');
        console.log('📏 Measurement mode enabled');
    }
    
    enableAngleMeasurement() {
        this.setCanvasMode('angle');
        console.log('📐 Angle measurement enabled');
    }
    
    enableAreaMeasurement() {
        this.setCanvasMode('area');
        console.log('📊 Area measurement enabled');
    }
    
    enableAnnotation() {
        this.setCanvasMode('annotate');
        console.log('📝 Annotation mode enabled');
    }
    
    enableCrosshair() {
        this.setCanvasMode('crosshair');
        console.log('✛ Crosshair mode enabled');
    }
    
    enableMagnify() {
        this.setCanvasMode('magnify');
        console.log('🔍 Magnifying glass enabled');
    }
    
    enableCineMode() {
        this.setCanvasMode('cine');
        console.log('🎬 Cine mode enabled');
    }
    
    invertImage() {
        if (this.canvasFix && this.canvasFix.currentImage) {
            // Use canvas fix invert if available
            this.canvasFix.viewport = this.canvasFix.viewport || {};
            this.canvasFix.viewport.invert = !this.canvasFix.viewport.invert;
            this.canvasFix.displayImage(this.canvasFix.currentImage);
        } else if (this.workingCanvas) {
            this.workingCanvas.invert();
        }
        console.log('🔄 Image inverted');
    }
    
    rotateImage() {
        if (this.workingCanvas) {
            this.workingCanvas.viewport.rotation = (this.workingCanvas.viewport.rotation || 0) + 90;
            this.workingCanvas.render();
        }
        console.log('↻ Image rotated 90°');
    }
    
    flipImage() {
        if (this.canvasFix && this.canvasFix.currentImage) {
            this.canvasFix.viewport = this.canvasFix.viewport || {};
            this.canvasFix.viewport.flipHorizontal = !this.canvasFix.viewport.flipHorizontal;
            this.canvasFix.displayImage(this.canvasFix.currentImage);
        }
        console.log('↔ Image flipped');
    }
    
    resetView() {
        if (this.canvasFix && this.canvasFix.resetZoomToFit) {
            this.canvasFix.resetZoomToFit();
        } else if (this.workingCanvas && this.workingCanvas.resetViewport) {
            this.workingCanvas.resetViewport();
        }
        console.log('🔄 View reset');
    }
    
    fitToWindow() {
        if (this.workingCanvas && this.workingCanvas.fitToWindow) {
            this.workingCanvas.fitToWindow();
        } else if (this.canvasFix && this.canvasFix.resetZoomToFit) {
            this.canvasFix.resetZoomToFit();
        }
        console.log('📐 Fit to window');
    }
    
    showMPR() {
        // Get current series ID from canvas or study
        let seriesId = null;
        
        if (this.canvasFix && this.canvasFix.currentSeries) {
            seriesId = this.canvasFix.currentSeries.id;
        } else if (this.canvasFix && this.canvasFix.currentStudy && this.canvasFix.currentStudy.series) {
            seriesId = this.canvasFix.currentStudy.series[0].id;
        }
        
        if (seriesId && window.showMPRDialog) {
            window.showMPRDialog(seriesId);
        } else if (window.toggleMPRView) {
            window.toggleMPRView();
        } else {
            console.log('🧊 MPR reconstruction - series ID needed');
        }
    }
    
    show3D() {
        // Connect to existing 3D functionality
        if (window.generate3DReconstruction) {
            window.generate3DReconstruction();
        } else if (window.show3DDialog) {
            window.show3DDialog();
        } else {
            console.log('🎮 3D reconstruction...');
        }
    }
    
    runAIAnalysis() {
        // Connect to AI functionality
        if (window.showAIDialog) {
            window.showAIDialog();
        } else if (window.runAIAnalysis) {
            window.runAIAnalysis();
        } else {
            console.log('🤖 AI analysis...');
        }
    }
    
    setCanvasMode(mode) {
        // Set mode on available canvas implementations
        if (this.canvasFix) {
            this.canvasFix.currentMode = mode;
        }
        if (this.workingCanvas) {
            this.workingCanvas.currentMode = mode;
        }
        if (this.enhancedViewer) {
            this.enhancedViewer.setTool(mode);
        }
    }
    
    updateCursor(tool) {
        const canvas = document.querySelector('#dicom-canvas, .dicom-canvas, #viewer-canvas');
        if (!canvas) return;
        
        const cursors = {
            'windowing': 'crosshair',
            'zoom': 'zoom-in',
            'pan': 'move',
            'measure': 'crosshair',
            'angle': 'crosshair',
            'area': 'crosshair',
            'annotate': 'text',
            'crosshair': 'crosshair',
            'magnify': 'zoom-in',
            'cine': 'pointer'
        };
        
        canvas.style.cursor = cursors[tool] || 'default';
    }
    
    connectKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                return; // Don't interfere with input fields
            }
            
            const key = e.key.toLowerCase();
            
            switch (key) {
                case 'w':
                    this.clickToolButton('windowing');
                    break;
                case 'z':
                    this.clickToolButton('zoom');
                    break;
                case 'p':
                    this.clickToolButton('pan');
                    break;
                case 'm':
                    this.clickToolButton('measure');
                    break;
                case 'a':
                    this.clickToolButton('annotate');
                    break;
                case 'i':
                    this.clickToolButton('invert');
                    break;
                case 'r':
                    if (e.ctrlKey || e.metaKey) {
                        e.preventDefault();
                        this.resetView();
                    } else {
                        this.clickToolButton('rotate');
                    }
                    break;
                case 'f':
                    this.fitToWindow();
                    break;
                case '+':
                case '=':
                    e.preventDefault();
                    this.zoomIn();
                    break;
                case '-':
                    e.preventDefault();
                    this.zoomOut();
                    break;
                case 'escape':
                    this.clickToolButton('windowing'); // Default tool
                    break;
            }
        });
        
        console.log('⌨️ Keyboard shortcuts connected');
    }
    
    clickToolButton(tool) {
        const button = document.querySelector(`.tool-btn[data-tool="${tool}"]`);
        if (button) {
            button.click();
        }
    }
    
    zoomIn() {
        if (this.workingCanvas && this.workingCanvas.zoom) {
            this.workingCanvas.zoom(1.2);
        } else if (this.canvasFix && this.canvasFix.currentImage) {
            // Implement zoom for canvas fix
            console.log('🔍 Zoom in');
        }
    }
    
    zoomOut() {
        if (this.workingCanvas && this.workingCanvas.zoom) {
            this.workingCanvas.zoom(0.8);
        } else if (this.canvasFix && this.canvasFix.currentImage) {
            // Implement zoom for canvas fix
            console.log('🔍 Zoom out');
        }
    }
    
    connectInteractionEvents() {
        const canvas = document.querySelector('#dicom-canvas, .dicom-canvas, #viewer-canvas');
        if (!canvas) return;
        
        // Enhanced mouse/touch handling based on current tool
        canvas.addEventListener('mousedown', (e) => this.handleCanvasMouseDown(e));
        canvas.addEventListener('mousemove', (e) => this.handleCanvasMouseMove(e));
        canvas.addEventListener('mouseup', (e) => this.handleCanvasMouseUp(e));
        canvas.addEventListener('wheel', (e) => this.handleCanvasWheel(e));
        
        console.log('👆 Canvas interaction events connected');
    }
    
    handleCanvasMouseDown(e) {
        const rect = e.target.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        switch (this.currentTool) {
            case 'measure':
                this.startMeasurement(x, y);
                break;
            case 'angle':
                this.startAngleMeasurement(x, y);
                break;
            case 'area':
                this.startAreaMeasurement(x, y);
                break;
            case 'annotate':
                this.addAnnotation(x, y);
                break;
            default:
                // Let default canvas handling take over
                break;
        }
    }
    
    handleCanvasMouseMove(e) {
        if (this.currentTool === 'windowing' && e.buttons === 1) {
            // Handle window/level adjustment
            this.adjustWindowLevel(e.movementX, e.movementY);
        }
    }
    
    handleCanvasMouseUp(e) {
        // Handle tool-specific mouse up events
    }
    
    handleCanvasWheel(e) {
        e.preventDefault();
        
        if (this.currentTool === 'zoom' || e.ctrlKey) {
            const factor = e.deltaY > 0 ? 0.9 : 1.1;
            this.zoomAtPoint(e.offsetX, e.offsetY, factor);
        }
    }
    
    adjustWindowLevel(deltaX, deltaY) {
        if (this.workingCanvas) {
            const newCenter = this.workingCanvas.viewport.windowCenter + deltaX;
            const newWidth = Math.max(1, this.workingCanvas.viewport.windowWidth + deltaY);
            this.workingCanvas.setWindowLevel(newCenter, newWidth);
        }
    }
    
    zoomAtPoint(x, y, factor) {
        if (this.workingCanvas && this.workingCanvas.zoom) {
            this.workingCanvas.zoom(factor, x, y);
        }
    }
    
    startMeasurement(x, y) {
        console.log(`📏 Starting measurement at (${x}, ${y})`);
        // Implement measurement start
    }
    
    startAngleMeasurement(x, y) {
        console.log(`📐 Starting angle measurement at (${x}, ${y})`);
        // Implement angle measurement start
    }
    
    startAreaMeasurement(x, y) {
        console.log(`📊 Starting area measurement at (${x}, ${y})`);
        // Implement area measurement start
    }
    
    addAnnotation(x, y) {
        console.log(`📝 Adding annotation at (${x}, ${y})`);
        // Implement annotation
    }
    
    connectStudyLoading() {
        // Connect study loading events
        document.addEventListener('click', (e) => {
            const viewBtn = e.target.closest('.view-btn');
            if (viewBtn) {
                e.preventDefault();
                const studyId = viewBtn.dataset.studyId || 
                               viewBtn.closest('[data-study-id]')?.dataset.studyId;
                
                if (studyId) {
                    this.loadStudy(studyId);
                }
            }
        });
        
        console.log('📚 Study loading events connected');
    }
    
    loadStudy(studyId) {
        console.log(`🔄 Loading study ${studyId}...`);
        
        // Use available canvas implementation
        if (this.workingCanvas && this.workingCanvas.loadStudy) {
            this.workingCanvas.loadStudy(studyId);
        } else if (this.canvasFix && this.canvasFix.loadStudy) {
            this.canvasFix.loadStudy(studyId);
        } else {
            console.warn('No canvas implementation available for study loading');
        }
    }
    
    connectAdvancedFeatures() {
        // Connect MPR buttons
        const mprButtons = document.querySelectorAll('[data-action="mpr"], .mpr-btn');
        mprButtons.forEach(btn => {
            btn.addEventListener('click', () => this.showMPR());
        });
        
        // Connect 3D buttons
        const threeDButtons = document.querySelectorAll('[data-action="3d"], .three-d-btn');
        threeDButtons.forEach(btn => {
            btn.addEventListener('click', () => this.show3D());
        });
        
        // Connect AI buttons
        const aiButtons = document.querySelectorAll('[data-action="ai"], .ai-btn');
        aiButtons.forEach(btn => {
            btn.addEventListener('click', () => this.runAIAnalysis());
        });
        
        console.log('🚀 Advanced features connected');
    }
    
    // Public API
    getCurrentTool() {
        return this.currentTool;
    }
    
    setTool(tool) {
        const button = document.querySelector(`.tool-btn[data-tool="${tool}"]`);
        if (button) {
            button.click();
        }
    }
    
    getCanvas() {
        return this.canvasFix || this.workingCanvas;
    }
    
    isReady() {
        return this.isInitialized;
    }
}

// Initialize the connector
const dicomConnector = new DicomComponentConnector();

// Global access
window.dicomConnector = dicomConnector;
window.DicomComponentConnector = DicomComponentConnector;

console.log('🔗 DICOM Component Connector loaded');