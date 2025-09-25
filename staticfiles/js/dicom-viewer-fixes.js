/**
 * DICOM Viewer Fixes and Enhancements
 * Fixes non-working buttons and integrates measurement system
 */

// Initialize fixes when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    initializeDicomViewerFixes();
});

function initializeDicomViewerFixes() {
    // Fix tool button event handlers
    setupToolButtonHandlers();
    
    // Fix missing functions
    setupMissingFunctions();
    
    // Initialize measurement system integration
    integrateMeasurementSystem();
    
    // Fix canvas event handlers
    fixCanvasEventHandlers();
}

function setupToolButtonHandlers() {
    // Add event listeners to all tool buttons
    document.querySelectorAll('.tool-btn').forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            const tool = this.getAttribute('data-tool');
            if (tool) {
                setActiveTool(tool);
            }
        });
    });
    
    // Add event listeners to preset buttons
    document.querySelectorAll('.preset-btn').forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            const preset = this.textContent.toLowerCase().trim();
            applyPreset(preset);
        });
    });
    
    // Add event listeners to reconstruction buttons
    document.querySelectorAll('.recon-btn').forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            const action = this.querySelector('span')?.textContent?.toLowerCase();
            if (action === 'mpr') {
                generateMPR();
            } else if (action === 'mip') {
                generateMIP();
            }
        });
    });
}

function setupMissingFunctions() {
    // Define missing functions that buttons reference
    
    window.loadFromLocalFiles = function() {
        const input = document.createElement('input');
        input.type = 'file';
        input.multiple = true;
        input.accept = '.dcm,.dicom';
        input.onchange = function(e) {
            const files = Array.from(e.target.files);
            if (files.length > 0) {
                showToast(`Selected ${files.length} DICOM files. Upload functionality would be implemented here.`, 'info');
            }
        };
        input.click();
    };
    
    window.loadStudies = window.loadStudies || async function() {
        try {
            showLoading(true);
            const response = await fetch('/worklist/api/studies/');
            const data = await response.json();
            
            if (data.success) {
                updateStudySelector(data.studies);
                showToast(`Loaded ${data.studies.length} studies`, 'success');
            } else {
                showToast('Failed to load studies', 'error');
            }
        } catch (error) {
            console.error('Error loading studies:', error);
            showToast('Error loading studies', 'error');
        } finally {
            showLoading(false);
        }
    };
    
    window.generateMPR = window.generateMPR || function() {
        if (!currentSeries) {
            showToast('Please load a series first', 'warning');
            return;
        }
        showToast('MPR reconstruction would be implemented here', 'info');
    };
    
    window.generateMIP = window.generateMIP || function() {
        if (!currentSeries) {
            showToast('Please load a series first', 'warning');
            return;
        }
        showToast('MIP reconstruction would be implemented here', 'info');
    };
    
    window.reset3DView = window.reset3DView || function() {
        showToast('3D view reset would be implemented here', 'info');
    };
    
    window.toggle3DRotation = window.toggle3DRotation || function() {
        showToast('3D rotation toggle would be implemented here', 'info');
    };
    
    window.export3DModel = window.export3DModel || function() {
        showToast('3D model export would be implemented here', 'info');
    };
    
    window.fetchReferences = window.fetchReferences || function() {
        const query = document.getElementById('refQuery')?.value;
        if (query) {
            showToast(`Searching references for: ${query}`, 'info');
            // Reference search would be implemented here
        }
    };
    
    // Add nextImage and previousImage functions if they don't exist
    window.nextImage = window.nextImage || function() {
        if (typeof changeSlice === 'function') {
            changeSlice(1);
        } else if (window.currentImageIndex !== undefined && window.images) {
            if (window.currentImageIndex < window.images.length - 1) {
                window.currentImageIndex++;
                if (typeof updateImageDisplay === 'function') {
                    updateImageDisplay();
                }
            }
        }
    };
    
    window.previousImage = window.previousImage || function() {
        if (typeof changeSlice === 'function') {
            changeSlice(-1);
        } else if (window.currentImageIndex !== undefined) {
            if (window.currentImageIndex > 0) {
                window.currentImageIndex--;
                if (typeof updateImageDisplay === 'function') {
                    updateImageDisplay();
                }
            }
        }
    };
}

function integrateMeasurementSystem() {
    // Override existing measurement functions to use new system
    window.clearAllMeasurements = function() {
        if (window.measurementSystem) {
            window.measurementSystem.clearAll();
        }
    };
    
    // Update measurement list when measurements change
    if (window.measurementSystem) {
        const originalUpdateList = window.measurementSystem.updateMeasurementsList;
        window.measurementSystem.updateMeasurementsList = function() {
            originalUpdateList.call(this);
            // Additional UI updates can be added here
        };
    }
}

function fixCanvasEventHandlers() {
    const canvas = document.getElementById('dicomCanvas');
    if (!canvas) return;
    
    // Ensure proper event handling for measurements
    let isDrawing = false;
    let startPoint = null;
    
    canvas.addEventListener('mousedown', function(e) {
        if (!window.measurementSystem) return;
        
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        // Let measurement system handle measurement tools
        if (['length', 'area', 'angle', 'ellipse', 'rectangle'].includes(activeTool)) {
            // Measurement system will handle this
            return;
        }
        
        // Handle other tools
        handleCanvasMouseDown(e, x, y);
    });
    
    canvas.addEventListener('mousemove', function(e) {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        // Update cursor position display
        updateCursorPosition(x, y);
        
        // Handle tool-specific mouse move
        handleCanvasMouseMove(e, x, y);
    });
    
    canvas.addEventListener('mouseup', function(e) {
        handleCanvasMouseUp(e);
    });
    
    // Mouse wheel for scrolling through images
    canvas.addEventListener('wheel', function(e) {
        e.preventDefault();
        
        if (e.ctrlKey) {
            // Zoom
            const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
            if (typeof window.zoom !== 'undefined') {
                window.zoom *= zoomFactor;
                window.zoom = Math.max(0.1, Math.min(10, window.zoom));
            }
            if (typeof redrawCurrentImage === 'function') {
                redrawCurrentImage();
            } else if (typeof updateImageDisplay === 'function') {
                updateImageDisplay();
            }
        } else {
            // Scroll through images - use the functions we defined
            if (e.deltaY > 0) {
                if (typeof window.nextImage === 'function') {
                    window.nextImage();
                }
            } else {
                if (typeof window.previousImage === 'function') {
                    window.previousImage();
                }
            }
        }
    });
}

function handleCanvasMouseDown(e, x, y) {
    const canvas = document.getElementById('dicomCanvas');
    
    switch (activeTool) {
        case 'windowing':
            startWindowingDrag(x, y);
            break;
        case 'pan':
            startPanDrag(x, y);
            break;
        case 'zoom':
            handleZoomClick(x, y, e.shiftKey);
            break;
    }
}

function handleCanvasMouseMove(e, x, y) {
    switch (activeTool) {
        case 'windowing':
            updateWindowing(x, y);
            break;
        case 'pan':
            updatePanning(x, y);
            break;
    }
}

function handleCanvasMouseUp(e) {
    // Reset drag states
    isDragging = false;
    startDragPoint = null;
}

function startWindowingDrag(x, y) {
    isDragging = true;
    startDragPoint = { x, y };
    startWindowLevel = windowLevel;
    startWindowWidth = windowWidth;
}

function updateWindowing(x, y) {
    if (!isDragging || !startDragPoint) return;
    
    const deltaX = x - startDragPoint.x;
    const deltaY = y - startDragPoint.y;
    
    windowLevel = startWindowLevel + deltaX * 2;
    windowWidth = Math.max(1, startWindowWidth + deltaY * 2);
    
    updateWindowLevelDisplay();
    redrawCurrentImage();
}

function startPanDrag(x, y) {
    isDragging = true;
    startDragPoint = { x, y };
    startPanX = panX;
    startPanY = panY;
}

function updatePanning(x, y) {
    if (!isDragging || !startDragPoint) return;
    
    panX = startPanX + (x - startDragPoint.x);
    panY = startPanY + (y - startDragPoint.y);
    
    redrawCurrentImage();
}

function handleZoomClick(x, y, isShiftKey) {
    const zoomFactor = isShiftKey ? 0.8 : 1.25;
    zoom *= zoomFactor;
    zoom = Math.max(0.1, Math.min(10, zoom));
    
    // Zoom towards cursor position
    const canvas = document.getElementById('dicomCanvas');
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    
    panX += (centerX - x) * 0.1;
    panY += (centerY - y) * 0.1;
    
    redrawCurrentImage();
}

function updateCursorPosition(x, y) {
    // Update cursor position display if element exists
    const posDisplay = document.getElementById('cursorPosition');
    if (posDisplay) {
        posDisplay.textContent = `${Math.round(x)}, ${Math.round(y)}`;
    }
}

function updateWindowLevelDisplay() {
    // Update window/level display
    const wlDisplay = document.getElementById('windowLevelDisplay');
    if (wlDisplay) {
        wlDisplay.textContent = `W: ${Math.round(windowWidth)} L: ${Math.round(windowLevel)}`;
    }
}

function updateStudySelector(studies) {
    const selector = document.getElementById('studySelector');
    if (!selector) return;
    
    selector.innerHTML = '<option value="">Select a Study</option>';
    
    studies.forEach(study => {
        const option = document.createElement('option');
        option.value = study.id;
        option.textContent = `${study.patient_name} - ${study.modality} (${study.study_date})`;
        selector.appendChild(option);
    });
}

function applyPreset(preset) {
    const presets = {
        'lung': { windowWidth: 1500, windowLevel: -600 },
        'bone': { windowWidth: 2000, windowLevel: 300 },
        'soft': { windowWidth: 400, windowLevel: 40 },
        'brain': { windowWidth: 100, windowLevel: 50 },
        'abdomen': { windowWidth: 350, windowLevel: 40 },
        'mediastinum': { windowWidth: 350, windowLevel: 50 }
    };
    
    if (presets[preset]) {
        // Update global window/level variables
        if (typeof window.windowWidth !== 'undefined') {
            window.windowWidth = presets[preset].windowWidth;
            window.windowLevel = presets[preset].windowLevel;
        } else {
            windowWidth = presets[preset].windowWidth;
            windowLevel = presets[preset].windowLevel;
        }
        
        // Update UI sliders if they exist
        const wwSlider = document.getElementById('windowWidth');
        const wlSlider = document.getElementById('windowLevel');
        const wwValue = document.getElementById('wwValue');
        const wlValue = document.getElementById('wlValue');
        
        if (wwSlider) wwSlider.value = presets[preset].windowWidth;
        if (wlSlider) wlSlider.value = presets[preset].windowLevel;
        if (wwValue) wwValue.textContent = presets[preset].windowWidth;
        if (wlValue) wlValue.textContent = presets[preset].windowLevel;
        
        // Update display functions
        updateWindowLevelDisplay();
        
        // Refresh image with new settings
        if (typeof updateImageDisplay === 'function') {
            updateImageDisplay();
        } else if (typeof redrawCurrentImage === 'function') {
            redrawCurrentImage();
        }
        
        showToast(`Applied ${preset} preset (W:${presets[preset].windowWidth} L:${presets[preset].windowLevel})`, 'success');
    }
}

// Tool instructions
function showToolInstructions(tool) {
    const instructions = {
        'length': 'Click and drag to measure distance',
        'area': 'Click points to define area, double-click to close',
        'angle': 'Click three points to measure angle',
        'ellipse': 'Click and drag to create elliptical ROI',
        'rectangle': 'Click and drag to create rectangular ROI',
        'windowing': 'Drag to adjust window/level',
        'pan': 'Drag to pan the image',
        'zoom': 'Click to zoom in, Shift+click to zoom out'
    };
    
    if (instructions[tool]) {
        showToast(instructions[tool], 'info');
    }
}

// Global variables that might be missing
window.isDragging = false;
window.startDragPoint = null;
window.startWindowLevel = 0;
window.startWindowWidth = 0;
window.startPanX = 0;
window.startPanY = 0;
window.zoom = 1.0;
window.panX = 0;
window.panY = 0;
window.windowWidth = 256;
window.windowLevel = 127;
window.currentImageIndex = 0;
window.images = [];

// Ensure these functions exist globally
window.setActiveTool = window.setActiveTool || function(tool) {
    window.activeTool = tool;
    
    // Update measurement system if available
    if (window.measurementSystem) {
        window.measurementSystem.setActiveTool(tool);
    }
    
    // Update UI
    document.querySelectorAll('.tool-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelector(`[data-tool="${tool}"]`)?.classList.add('active');
    
    // Update cursor
    const canvas = document.getElementById('dicomCanvas');
    if (canvas) {
        switch(tool) {
            case 'zoom':
                canvas.style.cursor = 'zoom-in';
                break;
            case 'pan':
                canvas.style.cursor = 'move';
                break;
            case 'length':
            case 'area':
            case 'angle':
            case 'ellipse':
            case 'rectangle':
                canvas.style.cursor = 'crosshair';
                break;
            case 'windowing':
                canvas.style.cursor = 'ns-resize';
                break;
            default:
                canvas.style.cursor = 'default';
        }
    }
    
    // Show tool-specific instructions
    showToolInstructions(tool);
};

// Additional utility functions that might be missing
window.updateImageDisplay = window.updateImageDisplay || function() {
    if (typeof redrawCurrentImage === 'function') {
        redrawCurrentImage();
    } else if (window.dicomCanvasFix && typeof window.dicomCanvasFix.displayImage === 'function') {
        // Use canvas fix to redraw
        const currentImage = window.dicomCanvasFix.currentImage;
        if (currentImage) {
            window.dicomCanvasFix.displayImage(currentImage);
        }
    }
};

window.redrawCurrentImage = window.redrawCurrentImage || function() {
    if (typeof updateImageDisplay === 'function') {
        updateImageDisplay();
    }
};

window.changeSlice = window.changeSlice || function(direction) {
    if (window.images && window.images.length > 0) {
        window.currentImageIndex = Math.max(0, Math.min(window.images.length - 1, window.currentImageIndex + direction));
        updateImageDisplay();
    }
};

window.showToast = window.showToast || function(message, type = 'info') {
    if (window.dicomLoadingFix && typeof window.dicomLoadingFix.showToast === 'function') {
        window.dicomLoadingFix.showToast(message, type);
    } else {
        console.log(`[${type.toUpperCase()}] ${message}`);
    }
};

window.showLoading = window.showLoading || function(show, message = 'Loading...') {
    if (window.dicomLoadingFix) {
        if (show) {
            window.dicomLoadingFix.showLoadingIndicator(message);
        } else {
            window.dicomLoadingFix.hideLoadingIndicator();
        }
    }
};

// Default tool
window.activeTool = 'windowing';

console.log('DICOM Viewer fixes loaded successfully');