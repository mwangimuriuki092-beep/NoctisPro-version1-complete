/**
 * Professional DICOM Viewer Keyboard Shortcuts
 * Medical-grade keyboard navigation for radiologists
 * Safe enhancement - doesn't modify existing functionality
 */

class DicomKeyboardShortcuts {
    constructor() {
        this.shortcuts = {
            // Image navigation
            'ArrowUp': () => this.previousImage(),
            'ArrowDown': () => this.nextImage(),
            'PageUp': () => this.jumpImages(-10),
            'PageDown': () => this.jumpImages(10),
            'Home': () => this.firstImage(),
            'End': () => this.lastImage(),
            
            // Tool shortcuts
            'w': () => this.setTool('window'),
            'z': () => this.setTool('zoom'),
            'p': () => this.setTool('pan'),
            'm': () => this.setTool('measure'),
            'a': () => this.setTool('annotate'),
            'c': () => this.setTool('crosshair'),
            'r': () => this.resetView(),
            'i': () => this.toggleInvert(),
            
            // Window/Level presets
            '1': () => this.applyPreset('lung'),
            '2': () => this.applyPreset('bone'),
            '3': () => this.applyPreset('soft'),
            '4': () => this.applyPreset('brain'),
            '5': () => this.applyPreset('liver'),
            
            // View controls
            '+': () => this.zoomIn(),
            '-': () => this.zoomOut(),
            '0': () => this.resetZoom(),
            'f': () => this.toggleFullscreen(),
            
            // Measurements
            'Delete': () => this.deleteLastMeasurement(),
            'Escape': () => this.cancelCurrentAction(),
            
            // Advanced
            'F1': () => this.showHelp(),
            'F11': () => this.toggleFullscreen(),
            ' ': () => this.playPause() // Spacebar for cine
        };
        
        this.isEnabled = true;
        this.helpVisible = false;
        
        this.init();
    }
    
    init() {
        document.addEventListener('keydown', (e) => this.handleKeydown(e));
        this.createHelpOverlay();
        this.showWelcomeMessage();
    }
    
    handleKeydown(e) {
        if (!this.isEnabled) return;
        
        // Don't interfere with input fields
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) {
            return;
        }
        
        const key = e.key;
        const shortcut = this.shortcuts[key];
        
        if (shortcut) {
            e.preventDefault();
            e.stopPropagation();
            
            try {
                shortcut();
                this.showShortcutFeedback(key);
            } catch (error) {
                console.warn('Keyboard shortcut error:', error);
            }
        }
    }
    
    // Image Navigation
    previousImage() {
        if (typeof changeSlice === 'function') {
            changeSlice(-1);
        } else if (window.currentImageIndex !== undefined) {
            if (window.currentImageIndex > 0) {
                window.currentImageIndex--;
                this.updateImageDisplay();
            }
        }
    }
    
    nextImage() {
        if (typeof changeSlice === 'function') {
            changeSlice(1);
        } else if (window.currentImageIndex !== undefined && window.images) {
            if (window.currentImageIndex < window.images.length - 1) {
                window.currentImageIndex++;
                this.updateImageDisplay();
            }
        }
    }
    
    jumpImages(count) {
        if (typeof changeSlice === 'function') {
            changeSlice(count);
        }
    }
    
    firstImage() {
        if (typeof changeSlice === 'function') {
            if (window.images && window.images.length > 0) {
                window.currentImageIndex = 0;
                this.updateImageDisplay();
            }
        }
    }
    
    lastImage() {
        if (typeof changeSlice === 'function') {
            if (window.images && window.images.length > 0) {
                window.currentImageIndex = window.images.length - 1;
                this.updateImageDisplay();
            }
        }
    }
    
    // Tool Functions
    setTool(toolName) {
        if (typeof setTool === 'function') {
            setTool(toolName);
        } else if (typeof window.setTool === 'function') {
            window.setTool(toolName);
        }
    }
    
    resetView() {
        if (typeof resetView === 'function') {
            resetView();
        } else if (typeof window.resetView === 'function') {
            window.resetView();
        }
    }
    
    toggleInvert() {
        if (typeof toggleInvert === 'function') {
            toggleInvert();
        } else if (typeof window.toggleInvert === 'function') {
            window.toggleInvert();
        }
    }
    
    applyPreset(presetName) {
        if (typeof applyPreset === 'function') {
            applyPreset(presetName);
        } else if (typeof window.applyPreset === 'function') {
            window.applyPreset(presetName);
        }
    }
    
    // Zoom Functions
    zoomIn() {
        if (typeof setZoom === 'function' && window.zoomFactor) {
            setZoom(window.zoomFactor * 1.2);
        }
    }
    
    zoomOut() {
        if (typeof setZoom === 'function' && window.zoomFactor) {
            setZoom(window.zoomFactor * 0.8);
        }
    }
    
    resetZoom() {
        if (typeof setZoom === 'function') {
            setZoom(1.0);
        }
    }
    
    toggleFullscreen() {
        if (document.fullscreenElement) {
            document.exitFullscreen();
        } else {
            const viewer = document.getElementById('dicomViewer') || document.body;
            viewer.requestFullscreen();
        }
    }
    
    // Measurement Functions
    deleteLastMeasurement() {
        if (window.measurements && window.measurements.length > 0) {
            window.measurements.pop();
            if (typeof updateMeasurementDisplay === 'function') {
                updateMeasurementDisplay();
            }
        }
    }
    
    cancelCurrentAction() {
        // Cancel any current drawing/measurement
        if (window.activeTool) {
            this.setTool('window'); // Return to default tool
        }
    }
    
    playPause() {
        // For cine mode
        if (typeof toggleCine === 'function') {
            toggleCine();
        }
    }
    
    // Helper Functions
    updateImageDisplay() {
        if (typeof updateImageDisplay === 'function') {
            updateImageDisplay();
        } else if (typeof render === 'function') {
            render();
        }
    }
    
    showShortcutFeedback(key) {
        const feedback = document.createElement('div');
        feedback.className = 'shortcut-feedback';
        feedback.textContent = `Key: ${key}`;
        feedback.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: rgba(0, 212, 255, 0.9);
            color: white;
            padding: 8px 12px;
            border-radius: 4px;
            font-size: 12px;
            z-index: 10000;
            pointer-events: none;
            animation: shortcutFade 1.5s ease-out forwards;
        `;
        
        document.body.appendChild(feedback);
        
        setTimeout(() => {
            if (feedback.parentNode) {
                feedback.parentNode.removeChild(feedback);
            }
        }, 1500);
    }
    
    showWelcomeMessage() {
        const welcome = document.createElement('div');
        welcome.className = 'keyboard-welcome';
        welcome.innerHTML = `
            <div style="background: rgba(0, 0, 0, 0.8); color: white; padding: 15px; border-radius: 8px; position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); z-index: 10000; text-align: center; max-width: 400px;">
                <h4 style="color: #00d4ff; margin-bottom: 10px;">⌨️ Keyboard Shortcuts Enabled</h4>
                <p style="margin-bottom: 10px; font-size: 14px;">Professional keyboard navigation is now active</p>
                <div style="font-size: 12px; color: #ccc;">
                    Press <strong>F1</strong> for help • <strong>W</strong> = Window • <strong>Z</strong> = Zoom<br>
                    <strong>↑↓</strong> = Navigate • <strong>1-5</strong> = Presets • <strong>R</strong> = Reset
                </div>
                <button onclick="this.parentElement.parentElement.remove()" style="margin-top: 10px; padding: 5px 15px; background: #00d4ff; color: black; border: none; border-radius: 4px; cursor: pointer;">Got it!</button>
            </div>
        `;
        
        document.body.appendChild(welcome);
        
        // Auto-remove after 8 seconds
        setTimeout(() => {
            if (welcome.parentNode) {
                welcome.parentNode.removeChild(welcome);
            }
        }, 8000);
    }
    
    createHelpOverlay() {
        const helpOverlay = document.createElement('div');
        helpOverlay.id = 'keyboard-help-overlay';
        helpOverlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.9);
            z-index: 10000;
            display: none;
            overflow-y: auto;
        `;
        
        helpOverlay.innerHTML = `
            <div style="max-width: 800px; margin: 50px auto; padding: 20px; color: white;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px;">
                    <h2 style="color: #00d4ff;">⌨️ DICOM Viewer Keyboard Shortcuts</h2>
                    <button onclick="document.getElementById('keyboard-help-overlay').style.display='none'" 
                            style="background: #ff4444; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;">Close</button>
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px;">
                    <div>
                        <h3 style="color: #00d4ff; margin-bottom: 15px;">🖼️ Image Navigation</h3>
                        <div style="font-family: monospace; line-height: 1.8;">
                            <div><strong>↑ / ↓</strong> - Previous/Next image</div>
                            <div><strong>Page Up/Down</strong> - Jump 10 images</div>
                            <div><strong>Home / End</strong> - First/Last image</div>
                            <div><strong>Space</strong> - Play/Pause cine</div>
                        </div>
                        
                        <h3 style="color: #00d4ff; margin: 25px 0 15px;">🔧 Tools</h3>
                        <div style="font-family: monospace; line-height: 1.8;">
                            <div><strong>W</strong> - Window/Level</div>
                            <div><strong>Z</strong> - Zoom</div>
                            <div><strong>P</strong> - Pan</div>
                            <div><strong>M</strong> - Measure</div>
                            <div><strong>A</strong> - Annotate</div>
                            <div><strong>C</strong> - Crosshair</div>
                            <div><strong>R</strong> - Reset view</div>
                            <div><strong>I</strong> - Invert</div>
                        </div>
                    </div>
                    
                    <div>
                        <h3 style="color: #00d4ff; margin-bottom: 15px;">🎛️ Window Presets</h3>
                        <div style="font-family: monospace; line-height: 1.8;">
                            <div><strong>1</strong> - Lung window</div>
                            <div><strong>2</strong> - Bone window</div>
                            <div><strong>3</strong> - Soft tissue</div>
                            <div><strong>4</strong> - Brain window</div>
                            <div><strong>5</strong> - Liver window</div>
                        </div>
                        
                        <h3 style="color: #00d4ff; margin: 25px 0 15px;">🔍 View Controls</h3>
                        <div style="font-family: monospace; line-height: 1.8;">
                            <div><strong>+ / -</strong> - Zoom in/out</div>
                            <div><strong>0</strong> - Reset zoom</div>
                            <div><strong>F / F11</strong> - Fullscreen</div>
                            <div><strong>Delete</strong> - Delete last measurement</div>
                            <div><strong>Escape</strong> - Cancel action</div>
                            <div><strong>F1</strong> - Show this help</div>
                        </div>
                    </div>
                </div>
                
                <div style="margin-top: 30px; padding: 20px; background: rgba(0, 212, 255, 0.1); border-radius: 8px;">
                    <h4 style="color: #00d4ff; margin-bottom: 10px;">💡 Pro Tips</h4>
                    <ul style="line-height: 1.6;">
                        <li>Keyboard shortcuts work when the viewer has focus</li>
                        <li>Shortcuts are disabled when typing in input fields</li>
                        <li>Use number keys 1-5 for quick window preset changes</li>
                        <li>Arrow keys provide precise image navigation</li>
                        <li>Press F1 anytime to see this help again</li>
                    </ul>
                </div>
            </div>
        `;
        
        document.body.appendChild(helpOverlay);
    }
    
    showHelp() {
        const helpOverlay = document.getElementById('keyboard-help-overlay');
        if (helpOverlay) {
            helpOverlay.style.display = 'block';
            this.helpVisible = true;
        }
    }
    
    enable() {
        this.isEnabled = true;
    }
    
    disable() {
        this.isEnabled = false;
    }
}

// Add CSS for animations
const style = document.createElement('style');
style.textContent = `
    @keyframes shortcutFade {
        0% { opacity: 1; transform: translateY(0); }
        100% { opacity: 0; transform: translateY(-20px); }
    }
    
    .shortcut-feedback {
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        font-weight: 600;
        text-shadow: 0 1px 2px rgba(0,0,0,0.5);
    }
`;
document.head.appendChild(style);

// Initialize keyboard shortcuts when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Only initialize if we're in the DICOM viewer
    if (document.getElementById('dicomViewer') || 
        document.querySelector('.dicom-viewer') || 
        window.location.pathname.includes('dicom-viewer')) {
        
        window.dicomKeyboardShortcuts = new DicomKeyboardShortcuts();
        console.log('🎹 Professional DICOM keyboard shortcuts activated');
    }
});

// Export for global access
window.DicomKeyboardShortcuts = DicomKeyboardShortcuts;