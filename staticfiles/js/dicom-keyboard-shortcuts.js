/**
 * DICOM Viewer Keyboard Shortcuts System
 * Comprehensive keyboard navigation and tool shortcuts for medical imaging
 */

class DicomKeyboardShortcuts {
    constructor() {
        this.shortcuts = this.getShortcutDefinitions();
        this.isEnabled = true;
        this.helpVisible = false;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.createHelpOverlay();
        this.showInitialHelp();
        console.log('DICOM Keyboard Shortcuts initialized');
    }

    getShortcutDefinitions() {
        return {
            // Navigation shortcuts
            'ArrowUp': { 
                action: 'previousImage', 
                description: 'Previous image',
                category: 'Navigation'
            },
            'ArrowDown': { 
                action: 'nextImage', 
                description: 'Next image',
                category: 'Navigation'
            },
            'ArrowLeft': { 
                action: 'previousSeries', 
                description: 'Previous series',
                category: 'Navigation'
            },
            'ArrowRight': { 
                action: 'nextSeries', 
                description: 'Next series',
                category: 'Navigation'
            },
            'Home': { 
                action: 'firstImage', 
                description: 'First image',
                category: 'Navigation'
            },
            'End': { 
                action: 'lastImage', 
                description: 'Last image',
                category: 'Navigation'
            },
            'PageUp': { 
                action: 'previousImageFast', 
                description: 'Previous image (fast)',
                category: 'Navigation'
            },
            'PageDown': { 
                action: 'nextImageFast', 
                description: 'Next image (fast)',
                category: 'Navigation'
            },

            // Tool shortcuts
            '1': { 
                action: 'setTool', 
                param: 'windowing', 
                description: 'Window/Level tool',
                category: 'Tools'
            },
            '2': { 
                action: 'setTool', 
                param: 'zoom', 
                description: 'Zoom tool',
                category: 'Tools'
            },
            '3': { 
                action: 'setTool', 
                param: 'pan', 
                description: 'Pan tool',
                category: 'Tools'
            },
            '4': { 
                action: 'setTool', 
                param: 'length', 
                description: 'Length measurement',
                category: 'Tools'
            },
            '5': { 
                action: 'setTool', 
                param: 'angle', 
                description: 'Angle measurement',
                category: 'Tools'
            },
            '6': { 
                action: 'setTool', 
                param: 'area', 
                description: 'Area measurement',
                category: 'Tools'
            },
            '7': { 
                action: 'setTool', 
                param: 'ellipse', 
                description: 'Ellipse ROI',
                category: 'Tools'
            },
            '8': { 
                action: 'setTool', 
                param: 'rectangle', 
                description: 'Rectangle ROI',
                category: 'Tools'
            },
            '9': { 
                action: 'setTool', 
                param: 'annotate', 
                description: 'Annotation tool',
                category: 'Tools'
            },

            // Zoom shortcuts
            'Equal': { 
                action: 'zoomIn', 
                description: 'Zoom in',
                category: 'Zoom'
            },
            'Minus': { 
                action: 'zoomOut', 
                description: 'Zoom out',
                category: 'Zoom'
            },
            '0': { 
                action: 'resetZoom', 
                description: 'Reset zoom (fit to window)',
                category: 'Zoom'
            },
            'Digit0': { 
                action: 'resetZoom', 
                description: 'Reset zoom (fit to window)',
                category: 'Zoom'
            },

            // Window/Level presets
            'q': { 
                action: 'applyPreset', 
                param: 'lung', 
                description: 'Lung window',
                category: 'Window/Level'
            },
            'w': { 
                action: 'applyPreset', 
                param: 'bone', 
                description: 'Bone window',
                category: 'Window/Level'
            },
            'e': { 
                action: 'applyPreset', 
                param: 'soft', 
                description: 'Soft tissue window',
                category: 'Window/Level'
            },
            'r': { 
                action: 'applyPreset', 
                param: 'brain', 
                description: 'Brain window',
                category: 'Window/Level'
            },
            't': { 
                action: 'applyPreset', 
                param: 'liver', 
                description: 'Liver window',
                category: 'Window/Level'
            },
            'y': { 
                action: 'applyPreset', 
                param: 'heart', 
                description: 'Heart window',
                category: 'Window/Level'
            },
            'u': { 
                action: 'applyPreset', 
                param: 'angio', 
                description: 'Angiography window',
                category: 'Window/Level'
            },

            // View controls
            'i': { 
                action: 'toggleInvert', 
                description: 'Invert image',
                category: 'View'
            },
            'c': { 
                action: 'toggleCrosshair', 
                description: 'Toggle crosshair',
                category: 'View'
            },
            'f': { 
                action: 'toggleFullscreen', 
                description: 'Toggle fullscreen',
                category: 'View'
            },
            'g': { 
                action: 'toggleGrid', 
                description: 'Toggle reference grid',
                category: 'View'
            },
            'o': { 
                action: 'toggleOverlays', 
                description: 'Toggle overlays',
                category: 'View'
            },

            // Cine controls
            'Space': { 
                action: 'toggleCine', 
                description: 'Play/Pause cine',
                category: 'Cine'
            },
            'BracketLeft': { 
                action: 'decreaseCineSpeed', 
                description: 'Decrease cine speed',
                category: 'Cine'
            },
            'BracketRight': { 
                action: 'increaseCineSpeed', 
                description: 'Increase cine speed',
                category: 'Cine'
            },

            // Measurement shortcuts
            'Delete': { 
                action: 'deleteLastMeasurement', 
                description: 'Delete last measurement',
                category: 'Measurements'
            },
            'Backspace': { 
                action: 'deleteLastMeasurement', 
                description: 'Delete last measurement',
                category: 'Measurements'
            },

            // Application shortcuts (with modifiers)
            'ctrl+z': { 
                action: 'undo', 
                description: 'Undo last action',
                category: 'Edit'
            },
            'ctrl+y': { 
                action: 'redo', 
                description: 'Redo last action',
                category: 'Edit'
            },
            'ctrl+s': { 
                action: 'saveStudy', 
                description: 'Save study/measurements',
                category: 'File'
            },
            'ctrl+e': { 
                action: 'exportImage', 
                description: 'Export current image',
                category: 'File'
            },
            'ctrl+p': { 
                action: 'print', 
                description: 'Print image',
                category: 'File'
            },
            'ctrl+a': { 
                action: 'autoWindowing', 
                description: 'Auto window/level',
                category: 'Window/Level'
            },
            'ctrl+r': { 
                action: 'resetView', 
                description: 'Reset all view settings',
                category: 'View'
            },
            'ctrl+m': { 
                action: 'toggleMPR', 
                description: 'Toggle MPR view',
                category: 'View'
            },

            // Help
            'F1': { 
                action: 'toggleHelp', 
                description: 'Toggle keyboard shortcuts help',
                category: 'Help'
            },
            'h': { 
                action: 'toggleHelp', 
                description: 'Toggle keyboard shortcuts help',
                category: 'Help'
            },
            '?': { 
                action: 'toggleHelp', 
                description: 'Toggle keyboard shortcuts help',
                category: 'Help'
            },

            // Advanced shortcuts
            'shift+r': { 
                action: 'rotate90', 
                description: 'Rotate image 90°',
                category: 'Transform'
            },
            'shift+f': { 
                action: 'flipHorizontal', 
                description: 'Flip horizontal',
                category: 'Transform'
            },
            'shift+v': { 
                action: 'flipVertical', 
                description: 'Flip vertical',
                category: 'Transform'
            },
            'alt+1': { 
                action: 'setLayout', 
                param: 'single', 
                description: 'Single image layout',
                category: 'Layout'
            },
            'alt+2': { 
                action: 'setLayout', 
                param: 'dual', 
                description: 'Dual image layout',
                category: 'Layout'
            },
            'alt+4': { 
                action: 'setLayout', 
                param: 'quad', 
                description: 'Quad image layout',
                category: 'Layout'
            }
        };
    }

    setupEventListeners() {
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
        document.addEventListener('keyup', (e) => this.handleKeyUp(e));
        
        // Prevent default browser shortcuts that might interfere
        document.addEventListener('keydown', (e) => {
            if (this.shouldPreventDefault(e)) {
                e.preventDefault();
            }
        });
    }

    shouldPreventDefault(event) {
        const key = this.getKeyString(event);
        
        // Prevent default for our shortcuts
        if (this.shortcuts[key]) {
            return true;
        }
        
        // Prevent some common browser shortcuts
        const preventKeys = [
            'ctrl+s', 'ctrl+p', 'ctrl+r', 'ctrl+f', 'ctrl+h',
            'F1', 'F5', 'F11', 'F12'
        ];
        
        return preventKeys.includes(key);
    }

    handleKeyDown(event) {
        if (!this.isEnabled) return;
        
        // Don't handle shortcuts when typing in input fields
        if (this.isInputActive()) return;
        
        const key = this.getKeyString(event);
        const shortcut = this.shortcuts[key];
        
        if (shortcut) {
            event.preventDefault();
            this.executeShortcut(shortcut, event);
        }
    }

    handleKeyUp(event) {
        // Handle any key-up specific logic here
    }

    getKeyString(event) {
        const parts = [];
        
        if (event.ctrlKey) parts.push('ctrl');
        if (event.altKey) parts.push('alt');
        if (event.shiftKey) parts.push('shift');
        if (event.metaKey) parts.push('meta');
        
        // Use event.code for special keys, event.key for regular keys
        let key = event.code || event.key;
        
        // Normalize some keys
        if (key === 'NumpadAdd') key = 'Equal';
        if (key === 'NumpadSubtract') key = 'Minus';
        if (key.startsWith('Numpad')) key = key.replace('Numpad', 'Digit');
        
        parts.push(key);
        
        return parts.join('+');
    }

    isInputActive() {
        const activeElement = document.activeElement;
        const inputTypes = ['input', 'textarea', 'select'];
        const editableTypes = ['text', 'password', 'email', 'search', 'url', 'tel'];
        
        if (inputTypes.includes(activeElement.tagName.toLowerCase())) {
            if (activeElement.tagName.toLowerCase() === 'input') {
                return editableTypes.includes(activeElement.type.toLowerCase());
            }
            return true;
        }
        
        return activeElement.contentEditable === 'true';
    }

    executeShortcut(shortcut, event) {
        try {
            switch (shortcut.action) {
                // Navigation
                case 'previousImage':
                    this.previousImage();
                    break;
                case 'nextImage':
                    this.nextImage();
                    break;
                case 'previousSeries':
                    this.previousSeries();
                    break;
                case 'nextSeries':
                    this.nextSeries();
                    break;
                case 'firstImage':
                    this.firstImage();
                    break;
                case 'lastImage':
                    this.lastImage();
                    break;
                case 'previousImageFast':
                    this.previousImage(10);
                    break;
                case 'nextImageFast':
                    this.nextImage(10);
                    break;

                // Tools
                case 'setTool':
                    this.setTool(shortcut.param);
                    break;

                // Zoom
                case 'zoomIn':
                    this.zoomIn();
                    break;
                case 'zoomOut':
                    this.zoomOut();
                    break;
                case 'resetZoom':
                    this.resetZoom();
                    break;

                // Window/Level
                case 'applyPreset':
                    this.applyPreset(shortcut.param);
                    break;
                case 'autoWindowing':
                    this.autoWindowing();
                    break;

                // View controls
                case 'toggleInvert':
                    this.toggleInvert();
                    break;
                case 'toggleCrosshair':
                    this.toggleCrosshair();
                    break;
                case 'toggleFullscreen':
                    this.toggleFullscreen();
                    break;
                case 'toggleGrid':
                    this.toggleGrid();
                    break;
                case 'toggleOverlays':
                    this.toggleOverlays();
                    break;

                // Cine
                case 'toggleCine':
                    this.toggleCine();
                    break;
                case 'increaseCineSpeed':
                    this.adjustCineSpeed(1);
                    break;
                case 'decreaseCineSpeed':
                    this.adjustCineSpeed(-1);
                    break;

                // Measurements
                case 'deleteLastMeasurement':
                    this.deleteLastMeasurement();
                    break;

                // Edit
                case 'undo':
                    this.undo();
                    break;
                case 'redo':
                    this.redo();
                    break;

                // File
                case 'saveStudy':
                    this.saveStudy();
                    break;
                case 'exportImage':
                    this.exportImage();
                    break;
                case 'print':
                    this.print();
                    break;

                // View
                case 'resetView':
                    this.resetView();
                    break;
                case 'toggleMPR':
                    this.toggleMPR();
                    break;

                // Transform
                case 'rotate90':
                    this.rotate90();
                    break;
                case 'flipHorizontal':
                    this.flipHorizontal();
                    break;
                case 'flipVertical':
                    this.flipVertical();
                    break;

                // Layout
                case 'setLayout':
                    this.setLayout(shortcut.param);
                    break;

                // Help
                case 'toggleHelp':
                    this.toggleHelp();
                    break;

                default:
                    console.warn('Unknown shortcut action:', shortcut.action);
            }

            // Show feedback for the executed shortcut
            this.showShortcutFeedback(shortcut);

        } catch (error) {
            console.error('Error executing shortcut:', error);
        }
    }

    // Shortcut implementations
    previousImage(step = 1) {
        if (typeof window.previousImage === 'function') {
            for (let i = 0; i < step; i++) {
                window.previousImage();
            }
        } else if (window.currentImageIndex !== undefined) {
            window.currentImageIndex = Math.max(0, window.currentImageIndex - step);
            if (typeof window.updateImageDisplay === 'function') {
                window.updateImageDisplay();
            }
        }
    }

    nextImage(step = 1) {
        if (typeof window.nextImage === 'function') {
            for (let i = 0; i < step; i++) {
                window.nextImage();
            }
        } else if (window.currentImageIndex !== undefined && window.images) {
            window.currentImageIndex = Math.min(window.images.length - 1, window.currentImageIndex + step);
            if (typeof window.updateImageDisplay === 'function') {
                window.updateImageDisplay();
            }
        }
    }

    previousSeries() {
        // Implementation for previous series navigation
        if (typeof window.previousSeries === 'function') {
            window.previousSeries();
        }
    }

    nextSeries() {
        // Implementation for next series navigation
        if (typeof window.nextSeries === 'function') {
            window.nextSeries();
        }
    }

    firstImage() {
        if (window.images && window.images.length > 0) {
            window.currentImageIndex = 0;
            if (typeof window.updateImageDisplay === 'function') {
                window.updateImageDisplay();
            }
        }
    }

    lastImage() {
        if (window.images && window.images.length > 0) {
            window.currentImageIndex = window.images.length - 1;
            if (typeof window.updateImageDisplay === 'function') {
                window.updateImageDisplay();
            }
        }
    }

    setTool(tool) {
        if (typeof window.setActiveTool === 'function') {
            window.setActiveTool(tool);
        } else if (typeof window.setTool === 'function') {
            window.setTool(tool);
        } else if (window.enhancedMeasurements && typeof window.enhancedMeasurements.setTool === 'function') {
            window.enhancedMeasurements.setTool(tool);
        }
    }

    zoomIn() {
        const zoomDelta = 1.2;
        if (typeof window.setZoom === 'function' && window.zoomFactor !== undefined) {
            window.setZoom(window.zoomFactor * zoomDelta);
        } else if (window.zoom !== undefined) {
            window.zoom *= zoomDelta;
            if (typeof window.updateImageDisplay === 'function') {
                window.updateImageDisplay();
            }
        }
    }

    zoomOut() {
        const zoomDelta = 0.8;
        if (typeof window.setZoom === 'function' && window.zoomFactor !== undefined) {
            window.setZoom(window.zoomFactor * zoomDelta);
        } else if (window.zoom !== undefined) {
            window.zoom *= zoomDelta;
            if (typeof window.updateImageDisplay === 'function') {
                window.updateImageDisplay();
            }
        }
    }

    resetZoom() {
        if (typeof window.resetView === 'function') {
            window.resetView();
        } else if (typeof window.setZoom === 'function') {
            window.setZoom(0.8);
        }
    }

    applyPreset(preset) {
        if (window.enhancedWindowing && typeof window.enhancedWindowing.applyPreset === 'function') {
            window.enhancedWindowing.applyPreset(preset);
        } else if (typeof window.applyPreset === 'function') {
            window.applyPreset(preset);
        }
    }

    autoWindowing() {
        if (window.enhancedWindowing && typeof window.enhancedWindowing.applyAutoWindowing === 'function') {
            window.enhancedWindowing.applyAutoWindowing();
        }
    }

    toggleInvert() {
        if (typeof window.toggleInvert === 'function') {
            window.toggleInvert();
        } else {
            // Basic invert implementation
            const canvas = document.getElementById('dicomCanvas');
            if (canvas) {
                canvas.style.filter = canvas.style.filter.includes('invert') ? 
                    canvas.style.filter.replace('invert(1)', '') : 
                    canvas.style.filter + ' invert(1)';
            }
        }
    }

    toggleCrosshair() {
        if (typeof window.toggleCrosshair === 'function') {
            window.toggleCrosshair();
        }
    }

    toggleFullscreen() {
        if (document.fullscreenElement) {
            document.exitFullscreen();
        } else {
            document.documentElement.requestFullscreen();
        }
    }

    toggleGrid() {
        // Implementation for reference grid toggle
        const grid = document.getElementById('referenceGrid');
        if (grid) {
            grid.style.display = grid.style.display === 'none' ? 'block' : 'none';
        }
    }

    toggleOverlays() {
        const overlays = document.querySelectorAll('.measurement-overlay, .annotation-overlay');
        overlays.forEach(overlay => {
            overlay.style.display = overlay.style.display === 'none' ? 'block' : 'none';
        });
    }

    toggleCine() {
        if (window.cinePlayer && typeof window.cinePlayer.toggle === 'function') {
            window.cinePlayer.toggle();
        }
    }

    adjustCineSpeed(delta) {
        if (window.cinePlayer && typeof window.cinePlayer.adjustSpeed === 'function') {
            window.cinePlayer.adjustSpeed(delta);
        }
    }

    deleteLastMeasurement() {
        if (window.enhancedMeasurements && window.enhancedMeasurements.measurements.length > 0) {
            const lastIndex = window.enhancedMeasurements.measurements.length - 1;
            window.enhancedMeasurements.deleteMeasurement(lastIndex);
        }
    }

    undo() {
        if (typeof window.undo === 'function') {
            window.undo();
        }
    }

    redo() {
        if (typeof window.redo === 'function') {
            window.redo();
        }
    }

    saveStudy() {
        if (typeof window.saveMeasurements === 'function') {
            window.saveMeasurements();
        }
    }

    exportImage() {
        if (typeof window.exportImage === 'function') {
            window.exportImage();
        }
    }

    print() {
        if (typeof window.showPrintDialog === 'function') {
            window.showPrintDialog();
        } else {
            window.print();
        }
    }

    resetView() {
        if (typeof window.resetView === 'function') {
            window.resetView();
        }
    }

    toggleMPR() {
        if (typeof window.toggleMPR === 'function') {
            window.toggleMPR();
        }
    }

    rotate90() {
        // Implementation for 90-degree rotation
        const canvas = document.getElementById('dicomCanvas');
        if (canvas) {
            const currentRotation = canvas.dataset.rotation || 0;
            const newRotation = (parseInt(currentRotation) + 90) % 360;
            canvas.style.transform = `rotate(${newRotation}deg)`;
            canvas.dataset.rotation = newRotation;
        }
    }

    flipHorizontal() {
        const canvas = document.getElementById('dicomCanvas');
        if (canvas) {
            const currentFlip = canvas.dataset.flipX || 1;
            const newFlip = currentFlip * -1;
            canvas.style.transform = `scaleX(${newFlip})`;
            canvas.dataset.flipX = newFlip;
        }
    }

    flipVertical() {
        const canvas = document.getElementById('dicomCanvas');
        if (canvas) {
            const currentFlip = canvas.dataset.flipY || 1;
            const newFlip = currentFlip * -1;
            canvas.style.transform = `scaleY(${newFlip})`;
            canvas.dataset.flipY = newFlip;
        }
    }

    setLayout(layout) {
        if (typeof window.setViewportLayout === 'function') {
            window.setViewportLayout(layout);
        }
    }

    // Help system
    createHelpOverlay() {
        const helpOverlay = document.createElement('div');
        helpOverlay.id = 'keyboardShortcutsHelp';
        helpOverlay.className = 'keyboard-shortcuts-help';
        helpOverlay.style.display = 'none';
        
        helpOverlay.innerHTML = `
            <div class="shortcuts-modal">
                <div class="shortcuts-header">
                    <h2><i class="fas fa-keyboard"></i> Keyboard Shortcuts</h2>
                    <button class="shortcuts-close" onclick="keyboardShortcuts.toggleHelp()">×</button>
                </div>
                <div class="shortcuts-content">
                    <div class="shortcuts-search">
                        <input type="text" placeholder="Search shortcuts..." id="shortcutsSearch">
                    </div>
                    <div class="shortcuts-categories" id="shortcutsCategories"></div>
                </div>
                <div class="shortcuts-footer">
                    <label class="shortcuts-toggle">
                        <input type="checkbox" id="shortcutsEnabled" checked>
                        Enable keyboard shortcuts
                    </label>
                    <button class="btn" onclick="keyboardShortcuts.toggleHelp()">Close</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(helpOverlay);
        this.populateHelpContent();
        this.setupHelpEventListeners();
    }

    populateHelpContent() {
        const categoriesContainer = document.getElementById('shortcutsCategories');
        if (!categoriesContainer) return;

        const categories = {};
        
        // Group shortcuts by category
        Object.keys(this.shortcuts).forEach(key => {
            const shortcut = this.shortcuts[key];
            if (!categories[shortcut.category]) {
                categories[shortcut.category] = [];
            }
            categories[shortcut.category].push({ key, ...shortcut });
        });

        // Create category sections
        Object.keys(categories).sort().forEach(category => {
            const section = document.createElement('div');
            section.className = 'shortcuts-category';
            
            const header = document.createElement('h3');
            header.textContent = category;
            section.appendChild(header);
            
            const list = document.createElement('div');
            list.className = 'shortcuts-list';
            
            categories[category].forEach(shortcut => {
                const item = document.createElement('div');
                item.className = 'shortcut-item';
                
                const keyDisplay = this.formatKeyDisplay(shortcut.key);
                
                item.innerHTML = `
                    <div class="shortcut-key">${keyDisplay}</div>
                    <div class="shortcut-description">${shortcut.description}</div>
                `;
                
                list.appendChild(item);
            });
            
            section.appendChild(list);
            categoriesContainer.appendChild(section);
        });
    }

    formatKeyDisplay(key) {
        return key
            .split('+')
            .map(part => {
                const keyMap = {
                    'ctrl': 'Ctrl',
                    'alt': 'Alt',
                    'shift': 'Shift',
                    'meta': 'Cmd',
                    'ArrowUp': '↑',
                    'ArrowDown': '↓',
                    'ArrowLeft': '←',
                    'ArrowRight': '→',
                    'Space': 'Space',
                    'Enter': 'Enter',
                    'Escape': 'Esc',
                    'BracketLeft': '[',
                    'BracketRight': ']',
                    'Equal': '+',
                    'Minus': '-'
                };
                return keyMap[part] || part.toUpperCase();
            })
            .join(' + ');
    }

    setupHelpEventListeners() {
        // Search functionality
        const searchInput = document.getElementById('shortcutsSearch');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.filterShortcuts(e.target.value);
            });
        }

        // Enable/disable toggle
        const enableToggle = document.getElementById('shortcutsEnabled');
        if (enableToggle) {
            enableToggle.addEventListener('change', (e) => {
                this.isEnabled = e.target.checked;
                if (window.showToast) {
                    window.showToast(
                        `Keyboard shortcuts ${this.isEnabled ? 'enabled' : 'disabled'}`,
                        'info'
                    );
                }
            });
        }
    }

    filterShortcuts(searchTerm) {
        const items = document.querySelectorAll('.shortcut-item');
        const categories = document.querySelectorAll('.shortcuts-category');
        
        if (!searchTerm) {
            items.forEach(item => item.style.display = 'flex');
            categories.forEach(category => category.style.display = 'block');
            return;
        }

        const term = searchTerm.toLowerCase();
        
        categories.forEach(category => {
            let hasVisibleItems = false;
            const categoryItems = category.querySelectorAll('.shortcut-item');
            
            categoryItems.forEach(item => {
                const key = item.querySelector('.shortcut-key').textContent.toLowerCase();
                const description = item.querySelector('.shortcut-description').textContent.toLowerCase();
                
                if (key.includes(term) || description.includes(term)) {
                    item.style.display = 'flex';
                    hasVisibleItems = true;
                } else {
                    item.style.display = 'none';
                }
            });
            
            category.style.display = hasVisibleItems ? 'block' : 'none';
        });
    }

    toggleHelp() {
        const helpOverlay = document.getElementById('keyboardShortcutsHelp');
        if (helpOverlay) {
            this.helpVisible = !this.helpVisible;
            helpOverlay.style.display = this.helpVisible ? 'flex' : 'none';
            
            if (this.helpVisible) {
                document.getElementById('shortcutsSearch')?.focus();
            }
        }
    }

    showInitialHelp() {
        // Show help hint on first visit
        if (!localStorage.getItem('dicom_shortcuts_seen')) {
            setTimeout(() => {
                if (window.showToast) {
                    window.showToast('Press H or F1 for keyboard shortcuts help', 'info');
                }
                localStorage.setItem('dicom_shortcuts_seen', 'true');
            }, 2000);
        }
    }

    showShortcutFeedback(shortcut) {
        // Show brief feedback for executed shortcut
        const feedback = document.createElement('div');
        feedback.className = 'shortcut-feedback';
        feedback.textContent = shortcut.description;
        
        feedback.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: rgba(0, 212, 255, 0.9);
            color: white;
            padding: 8px 16px;
            border-radius: 4px;
            font-size: 14px;
            z-index: 10000;
            animation: fadeInOut 2s ease-in-out;
        `;
        
        document.body.appendChild(feedback);
        
        setTimeout(() => {
            if (feedback.parentNode) {
                feedback.parentNode.removeChild(feedback);
            }
        }, 2000);
    }

    // Public methods
    enable() {
        this.isEnabled = true;
    }

    disable() {
        this.isEnabled = false;
    }

    addCustomShortcut(key, action, description, category = 'Custom') {
        this.shortcuts[key] = {
            action,
            description,
            category
        };
        this.populateHelpContent();
    }

    removeShortcut(key) {
        delete this.shortcuts[key];
        this.populateHelpContent();
    }
}

// Add CSS for keyboard shortcuts
const shortcutsCSS = `
<style>
.keyboard-shortcuts-help {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
}

.shortcuts-modal {
    background: #2a2a2a;
    border-radius: 8px;
    width: 90%;
    max-width: 800px;
    max-height: 90%;
    display: flex;
    flex-direction: column;
    color: white;
}

.shortcuts-header {
    padding: 20px;
    border-bottom: 1px solid #404040;
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.shortcuts-header h2 {
    margin: 0;
    color: #00d4ff;
}

.shortcuts-close {
    background: none;
    border: none;
    color: white;
    font-size: 24px;
    cursor: pointer;
    padding: 0;
    width: 30px;
    height: 30px;
}

.shortcuts-content {
    flex: 1;
    overflow: auto;
    padding: 20px;
}

.shortcuts-search input {
    width: 100%;
    padding: 10px;
    border: 1px solid #404040;
    border-radius: 4px;
    background: #1a1a1a;
    color: white;
    margin-bottom: 20px;
}

.shortcuts-category {
    margin-bottom: 30px;
}

.shortcuts-category h3 {
    color: #00d4ff;
    margin: 0 0 15px 0;
    font-size: 16px;
    border-bottom: 1px solid #404040;
    padding-bottom: 5px;
}

.shortcuts-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.shortcut-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 12px;
    background: #333;
    border-radius: 4px;
}

.shortcut-key {
    font-family: monospace;
    background: #1a1a1a;
    padding: 4px 8px;
    border-radius: 3px;
    font-size: 12px;
    min-width: 100px;
    text-align: center;
}

.shortcut-description {
    flex: 1;
    margin-left: 15px;
    font-size: 14px;
}

.shortcuts-footer {
    padding: 20px;
    border-top: 1px solid #404040;
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.shortcuts-toggle {
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
}

.preset-tabs {
    display: flex;
    gap: 5px;
    margin-bottom: 15px;
    flex-wrap: wrap;
}

.preset-tab {
    padding: 8px 12px;
    background: #333;
    border: none;
    color: white;
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
}

.preset-tab.active {
    background: #00d4ff;
    color: black;
}

.preset-buttons {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
    gap: 8px;
}

.preset-btn {
    padding: 8px;
    background: #333;
    border: 1px solid #404040;
    color: white;
    border-radius: 4px;
    cursor: pointer;
    font-size: 11px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
}

.preset-btn:hover {
    background: #404040;
}

.preset-btn.auto-window {
    background: #00d4ff;
    color: black;
}

.preset-name {
    font-weight: bold;
}

.preset-values {
    font-size: 10px;
    color: #ccc;
}

@keyframes fadeInOut {
    0% { opacity: 0; transform: translateY(-10px); }
    20% { opacity: 1; transform: translateY(0); }
    80% { opacity: 1; transform: translateY(0); }
    100% { opacity: 0; transform: translateY(-10px); }
}

.shortcut-feedback {
    animation: fadeInOut 2s ease-in-out;
}
</style>
`;

document.head.insertAdjacentHTML('beforeend', shortcutsCSS);

// Initialize keyboard shortcuts system
const keyboardShortcuts = new DicomKeyboardShortcuts();

// Export for global access
window.keyboardShortcuts = keyboardShortcuts;
window.DicomKeyboardShortcuts = DicomKeyboardShortcuts;

console.log('DICOM Keyboard Shortcuts System loaded successfully');