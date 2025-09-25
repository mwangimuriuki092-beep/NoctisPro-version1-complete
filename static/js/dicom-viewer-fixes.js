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
    
    window.generateMPR = window.generateMPR || async function() {
        if (!window.currentSeries && !window.currentStudy) {
            showToast('Please load a series first', 'warning');
            return;
        }
        
        const seriesId = window.currentSeries?.id || window.currentStudy?.series?.[0]?.id;
        if (!seriesId) {
            showToast('No series available for MPR reconstruction', 'error');
            return;
        }
        
        try {
            showLoading('Generating MPR views...');
            
            const response = await fetch(`/dicom-viewer/api/series/${seriesId}/mpr/`, {
                method: 'GET',
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                    'Accept': 'application/json',
                    'X-CSRFToken': window.dicomCanvasFix ? window.dicomCanvasFix.getCSRFToken() : ''
                },
                credentials: 'same-origin'
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            if (data.success) {
                showToast(`MPR reconstruction completed - ${data.axial_count + data.sagittal_count + data.coronal_count} views generated`, 'success');
                
                // Display MPR results
                if (data.mpr_views) {
                    displayMPRResults(data.mpr_views);
                }
            } else {
                throw new Error(data.error || 'MPR reconstruction failed');
            }
            
        } catch (error) {
            console.error('MPR reconstruction error:', error);
            showToast(`MPR reconstruction failed: ${error.message}`, 'error');
        } finally {
            showLoading(false);
        }
    };
    
    window.generateMIP = window.generateMIP || async function() {
        if (!window.currentSeries && !window.currentStudy) {
            showToast('Please load a series first', 'warning');
            return;
        }
        
        const seriesId = window.currentSeries?.id || window.currentStudy?.series?.[0]?.id;
        if (!seriesId) {
            showToast('No series available for MIP reconstruction', 'error');
            return;
        }
        
        try {
            showLoading('Generating MIP views...');
            
            const response = await fetch(`/dicom-viewer/api/series/${seriesId}/mip/`, {
                method: 'GET',
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                    'Accept': 'application/json',
                    'X-CSRFToken': window.dicomCanvasFix ? window.dicomCanvasFix.getCSRFToken() : ''
                },
                credentials: 'same-origin'
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            if (data.success) {
                showToast('MIP reconstruction completed successfully', 'success');
                
                // Display MIP results
                if (data.mip_views) {
                    displayMIPResults(data.mip_views);
                }
            } else {
                throw new Error(data.error || 'MIP reconstruction failed');
            }
            
        } catch (error) {
            console.error('MIP reconstruction error:', error);
            showToast(`MIP reconstruction failed: ${error.message}`, 'error');
        } finally {
            showLoading(false);
        }
    };
    
    window.generateBone3D = window.generateBone3D || async function(threshold = 300) {
        if (!window.currentSeries && !window.currentStudy) {
            showToast('Please load a series first', 'warning');
            return;
        }
        
        const seriesId = window.currentSeries?.id || window.currentStudy?.series?.[0]?.id;
        if (!seriesId) {
            showToast('No series available for bone reconstruction', 'error');
            return;
        }
        
        try {
            showLoading('Generating 3D bone reconstruction...');
            
            const response = await fetch(`/dicom-viewer/api/series/${seriesId}/bone/?threshold=${threshold}&mesh=true`, {
                method: 'GET',
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                    'Accept': 'application/json',
                    'X-CSRFToken': window.dicomCanvasFix ? window.dicomCanvasFix.getCSRFToken() : ''
                },
                credentials: 'same-origin'
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            if (data.success) {
                showToast(`3D bone reconstruction completed - ${data.bone_views ? Object.keys(data.bone_views).length : 0} views generated`, 'success');
                
                // Display bone reconstruction results
                if (data.bone_views) {
                    displayBone3DResults(data.bone_views);
                }
            } else {
                throw new Error(data.error || '3D bone reconstruction failed');
            }
            
        } catch (error) {
            console.error('Bone 3D reconstruction error:', error);
            showToast(`3D bone reconstruction failed: ${error.message}`, 'error');
        } finally {
            showLoading(false);
        }
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
                // Zoom - MUCH MORE GENTLE for medical imaging
                const zoomDelta = e.deltaY > 0 ? 0.98 : 1.02; // Very gentle zoom steps
                if (typeof window.zoom !== 'undefined') {
                    window.zoom *= zoomDelta;
                    window.zoom = Math.max(0.25, Math.min(3.0, window.zoom)); // Optimized zoom range: 25% to 300%
                } else if (typeof window.zoomFactor !== 'undefined') {
                    window.zoomFactor *= zoomDelta;
                    window.zoomFactor = Math.max(0.25, Math.min(3.0, window.zoomFactor));
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
    const zoomDelta = isShiftKey ? 0.9 : 1.1; // Gentle zoom steps for click
    
    if (typeof window.zoom !== 'undefined') {
        window.zoom *= zoomDelta;
        window.zoom = Math.max(0.25, Math.min(3.0, window.zoom)); // Optimized zoom range
    } else if (typeof window.zoomFactor !== 'undefined') {
        window.zoomFactor *= zoomDelta;
        window.zoomFactor = Math.max(0.25, Math.min(3.0, window.zoomFactor));
    }
    
    // Zoom towards cursor position - reduced sensitivity
    const canvas = document.getElementById('dicomCanvas');
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    
    if (typeof window.panX !== 'undefined') {
        window.panX += (centerX - x) * 0.05; // Reduced from 0.1 to 0.05
        window.panY += (centerY - y) * 0.05;
    }
    
    if (typeof redrawCurrentImage === 'function') {
        redrawCurrentImage();
    } else if (typeof updateImageDisplay === 'function') {
        updateImageDisplay();
    }
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
window.zoom = 0.8; // Optimized initial zoom for medical imaging
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

// 3D Reconstruction display functions
window.displayMPRResults = function(mprViews) {
    // Try to find MPR display containers
    const mprContainer = document.getElementById('mprView') || 
                        document.querySelector('.mpr-container') ||
                        document.querySelector('.mpr-views');
    
    if (mprContainer) {
        // Show MPR container
        mprContainer.style.display = 'grid';
        
        // Hide single view if exists
        const singleView = document.getElementById('singleView');
        if (singleView) singleView.style.display = 'none';
        
        // Update MPR images
        if (mprViews.axial) {
            const axialImg = document.getElementById('mprAxial') || document.querySelector('.mpr-axial img');
            if (axialImg) axialImg.src = mprViews.axial;
        }
        if (mprViews.sagittal) {
            const sagittalImg = document.getElementById('mprSagittal') || document.querySelector('.mpr-sagittal img');
            if (sagittalImg) sagittalImg.src = mprViews.sagittal;
        }
        if (mprViews.coronal) {
            const coronalImg = document.getElementById('mprCoronal') || document.querySelector('.mpr-coronal img');
            if (coronalImg) coronalImg.src = mprViews.coronal;
        }
    } else {
        // Create a simple popup to display results
        showReconstructionPopup('MPR Reconstruction', mprViews);
    }
};

window.displayMIPResults = function(mipViews) {
    // Similar to MPR but for MIP results
    const mprContainer = document.getElementById('mprView') || 
                        document.querySelector('.mpr-container');
    
    if (mprContainer) {
        mprContainer.style.display = 'grid';
        
        // Update with MIP images
        if (mipViews.axial) {
            const axialImg = document.getElementById('mprAxial');
            if (axialImg) axialImg.src = mipViews.axial;
        }
        if (mipViews.sagittal) {
            const sagittalImg = document.getElementById('mprSagittal');
            if (sagittalImg) sagittalImg.src = mipViews.sagittal;
        }
        if (mipViews.coronal) {
            const coronalImg = document.getElementById('mprCoronal');
            if (coronalImg) coronalImg.src = mipViews.coronal;
        }
    } else {
        showReconstructionPopup('MIP Reconstruction', mipViews);
    }
};

window.displayBone3DResults = function(boneViews) {
    // Display bone reconstruction results
    const mprContainer = document.getElementById('mprView') || 
                        document.querySelector('.mpr-container');
    
    if (mprContainer) {
        mprContainer.style.display = 'grid';
        
        // Update with bone 3D images
        if (boneViews.axial) {
            const axialImg = document.getElementById('mprAxial');
            if (axialImg) axialImg.src = boneViews.axial;
        }
        if (boneViews.sagittal) {
            const sagittalImg = document.getElementById('mprSagittal');
            if (sagittalImg) sagittalImg.src = boneViews.sagittal;
        }
        if (boneViews.coronal) {
            const coronalImg = document.getElementById('mprCoronal');
            if (coronalImg) coronalImg.src = boneViews.coronal;
        }
    } else {
        showReconstructionPopup('3D Bone Reconstruction', boneViews);
    }
};

window.showReconstructionPopup = function(title, views) {
    // Create popup for displaying reconstruction results
    const popup = document.createElement('div');
    popup.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.9);
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
    `;
    
    const content = document.createElement('div');
    content.style.cssText = `
        background: #2a2a2a;
        border-radius: 8px;
        padding: 20px;
        max-width: 90%;
        max-height: 90%;
        overflow: auto;
        color: white;
    `;
    
    let html = `<h3 style="color: #00d4ff; margin-bottom: 20px;">${title}</h3>`;
    html += '<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px;">';
    
    Object.entries(views).forEach(([view, url]) => {
        html += `
            <div style="text-align: center;">
                <h4 style="color: #ccc; margin-bottom: 10px;">${view.charAt(0).toUpperCase() + view.slice(1)}</h4>
                <img src="${url}" style="max-width: 100%; max-height: 300px; border: 1px solid #555; border-radius: 4px;" />
            </div>
        `;
    });
    
    html += '</div>';
    html += '<button onclick="this.closest(\'.reconstruction-popup\').remove()" style="margin-top: 20px; padding: 10px 20px; background: #00d4ff; color: black; border: none; border-radius: 4px; cursor: pointer;">Close</button>';
    
    content.innerHTML = html;
    popup.appendChild(content);
    popup.className = 'reconstruction-popup';
    document.body.appendChild(popup);
    
    // Close on click outside
    popup.addEventListener('click', (e) => {
        if (e.target === popup) {
            popup.remove();
        }
    });
};

// Default tool
window.activeTool = 'windowing';

// Reset zoom function - FIXED for proper fit
window.resetZoom = function() {
    window.zoom = 0.8; // Reset to optimized zoom level for medical imaging
    window.panX = 0;
    window.panY = 0;
    
    // Redraw current image if available
    if (window.currentImageElement) {
        window.renderImageToCanvas(window.currentImageElement);
    }
    
    console.log('Zoom reset to proper fit level (0.8x)');
};

console.log('DICOM Viewer fixes loaded successfully');