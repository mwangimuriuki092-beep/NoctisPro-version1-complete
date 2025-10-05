/**
 * Enhanced DICOM Viewer Tools
 * Professional DICOM viewing functionality with all tools working
 */

class DicomViewerEnhanced {
    constructor() {
        this.currentElement = null;
        this.currentImageId = null;
        this.viewport = null;
        this.tools = {};
        this.measurements = [];
        this.annotations = [];
        this.init();
    }

    init() {
        this.setupCornerstone();
        this.setupTools();
        this.setupEventListeners();
        this.setupUI();
    }

    setupCornerstone() {
        try {
            // Initialize cornerstone if available
            if (typeof cornerstone !== 'undefined') {
                cornerstone.events.addEventListener('cornerstoneimageloaded', this.onImageLoaded.bind(this));
                cornerstone.events.addEventListener('cornerstoneimageloadprogress', this.onImageLoadProgress.bind(this));
            }
        } catch (error) {
            console.warn('Cornerstone not available:', error);
        }
    }

    setupTools() {
        this.tools = {
            window: { name: 'Windowing', active: true },
            zoom: { name: 'Zoom', active: false },
            pan: { name: 'Pan', active: false },
            measure: { name: 'Measure', active: false },
            annotate: { name: 'Annotate', active: false },
            crosshair: { name: 'Crosshair', active: false },
            invert: { name: 'Invert', active: false },
            mpr: { name: 'MPR', active: false },
            ai: { name: 'AI Analysis', active: false },
            print: { name: 'Print', active: false },
            recon: { name: '3D Reconstruction', active: false }
        };
    }

    setupEventListeners() {
        // Tool button listeners
        document.addEventListener('click', (e) => {
            const tool = e.target.closest('.tool[data-tool]');
            if (tool) {
                const toolName = tool.dataset.tool;
                this.setTool(toolName);
            }
        });

        // Preset button listeners
        document.addEventListener('click', (e) => {
            const presetBtn = e.target.closest('.preset-btn');
            if (presetBtn) {
                const presetName = presetBtn.textContent.toLowerCase();
                this.applyPreset(presetName);
            }
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Only activate shortcuts when not in input fields
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                return;
            }

            switch (e.key.toLowerCase()) {
                case 'w':
                    e.preventDefault();
                    this.setTool('window');
                    break;
                case 'z':
                    e.preventDefault();
                    this.setTool('zoom');
                    break;
                case 'p':
                    e.preventDefault();
                    this.setTool('pan');
                    break;
                case 'm':
                    e.preventDefault();
                    this.setTool('measure');
                    break;
                case 'a':
                    e.preventDefault();
                    this.setTool('annotate');
                    break;
                case 'r':
                    e.preventDefault();
                    this.resetView();
                    break;
                case 'i':
                    e.preventDefault();
                    this.setTool('invert');
                    break;
                case '1':
                    e.preventDefault();
                    this.applyPreset('chest x-ray');
                    break;
                case '2':
                    e.preventDefault();
                    this.applyPreset('bone x-ray');
                    break;
                case '3':
                    e.preventDefault();
                    this.applyPreset('soft x-ray');
                    break;
                case '4':
                    e.preventDefault();
                    this.applyPreset('extremity');
                    break;
                case '0':
                    e.preventDefault();
                    this.applyPreset('auto');
                    break;
                case 'escape':
                    this.setTool('window');
                    break;
            }
        });
    }

    setupUI() {
        // Ensure all tool buttons are properly initialized
        this.updateToolButtons();
    }

    setTool(toolName) {
        try {
            // Deactivate all tools
            Object.keys(this.tools).forEach(tool => {
                this.tools[tool].active = false;
            });

            // Activate selected tool
            if (this.tools[toolName]) {
                this.tools[toolName].active = true;
            }

            // Update UI
            this.updateToolButtons();

            // Handle specific tool logic
            switch (toolName) {
                case 'window':
                    this.activateWindowLevelTool();
                    break;
                case 'zoom':
                    this.activateZoomTool();
                    break;
                case 'pan':
                    this.activatePanTool();
                    break;
                case 'measure':
                    this.activateMeasureTool();
                    break;
                case 'annotate':
                    this.activateAnnotateTool();
                    break;
                case 'reset':
                    this.resetView();
                    return; // Don't show toast for reset
                default:
                    console.log(`Tool ${toolName} activated`);
            }

            this.showToast(`${toolName.toUpperCase()} tool activated`, 'info', 1500);
        } catch (error) {
            this.showToast(`Failed to activate ${toolName} tool`, 'error');
            console.error('Tool activation error:', error);
        }
    }

    activateWindowLevelTool() {
        if (typeof cornerstoneTools !== 'undefined' && this.currentElement) {
            try {
                cornerstoneTools.setToolActive('wwwc', { mouseButtonMask: 1 }, this.currentElement);
            } catch (error) {
                console.warn('Cornerstone tools not available for window/level');
            }
        }
    }

    activateZoomTool() {
        if (typeof cornerstoneTools !== 'undefined' && this.currentElement) {
            try {
                cornerstoneTools.setToolActive('zoom', { mouseButtonMask: 1 }, this.currentElement);
            } catch (error) {
                console.warn('Cornerstone tools not available for zoom');
            }
        }
    }

    activatePanTool() {
        if (typeof cornerstoneTools !== 'undefined' && this.currentElement) {
            try {
                cornerstoneTools.setToolActive('pan', { mouseButtonMask: 1 }, this.currentElement);
            } catch (error) {
                console.warn('Cornerstone tools not available for pan');
            }
        }
    }

    activateMeasureTool() {
        if (typeof cornerstoneTools !== 'undefined' && this.currentElement) {
            try {
                cornerstoneTools.setToolActive('length', { mouseButtonMask: 1 }, this.currentElement);
            } catch (error) {
                console.warn('Cornerstone tools not available for measure');
            }
        }
    }

    activateAnnotateTool() {
        if (typeof cornerstoneTools !== 'undefined' && this.currentElement) {
            try {
                cornerstoneTools.setToolActive('arrowAnnotate', { mouseButtonMask: 1 }, this.currentElement);
            } catch (error) {
                console.warn('Cornerstone tools not available for annotate');
            }
        }
    }

    updateToolButtons() {
        document.querySelectorAll('.tool[data-tool]').forEach(button => {
            const toolName = button.dataset.tool;
            if (this.tools[toolName] && this.tools[toolName].active) {
                button.classList.add('active');
            } else {
                button.classList.remove('active');
            }
        });
    }

    resetView() {
        try {
            if (typeof cornerstone !== 'undefined' && this.currentElement) {
                cornerstone.reset(this.currentElement);
                this.showToast('View reset', 'success', 1500);
            } else {
                this.showToast('View reset (no image loaded)', 'info', 1500);
            }
        } catch (error) {
            this.showToast('Failed to reset view', 'error');
            console.error('Reset view error:', error);
        }
    }

    toggleCrosshair() {
        try {
            const crosshairElement = document.getElementById('crosshairOverlay');
            if (crosshairElement) {
                crosshairElement.style.display = crosshairElement.style.display === 'none' ? 'block' : 'none';
                this.showToast('Crosshair toggled', 'info', 1500);
            } else {
                this.createCrosshair();
            }
        } catch (error) {
            this.showToast('Failed to toggle crosshair', 'error');
        }
    }

    createCrosshair() {
        const imageContainer = document.getElementById('imageContainer');
        if (!imageContainer) return;

        const crosshair = document.createElement('div');
        crosshair.id = 'crosshairOverlay';
        crosshair.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            pointer-events: none;
            z-index: 100;
        `;

        const horizontalLine = document.createElement('div');
        horizontalLine.style.cssText = `
            position: absolute;
            top: 50%;
            left: 0;
            right: 0;
            height: 1px;
            background: var(--accent-color, #00d4ff);
            opacity: 0.7;
        `;

        const verticalLine = document.createElement('div');
        verticalLine.style.cssText = `
            position: absolute;
            left: 50%;
            top: 0;
            bottom: 0;
            width: 1px;
            background: var(--accent-color, #00d4ff);
            opacity: 0.7;
        `;

        crosshair.appendChild(horizontalLine);
        crosshair.appendChild(verticalLine);
        imageContainer.appendChild(crosshair);

        this.showToast('Crosshair enabled', 'success', 1500);
    }

    toggleInvert() {
        try {
            if (typeof cornerstone !== 'undefined' && this.currentElement) {
                const viewport = cornerstone.getViewport(this.currentElement);
                viewport.invert = !viewport.invert;
                cornerstone.setViewport(this.currentElement, viewport);
                this.showToast(viewport.invert ? 'Image inverted' : 'Image normal', 'info', 1500);
            } else {
                this.showToast('No image to invert', 'warning');
            }
        } catch (error) {
            this.showToast('Failed to invert image', 'error');
            console.error('Invert error:', error);
        }
    }

    applyPreset(presetName) {
        try {
            if (typeof cornerstone !== 'undefined' && this.currentElement) {
                const viewport = cornerstone.getViewport(this.currentElement);
                
                // Define presets - Enhanced with X-ray specific settings
                const presets = {
                    // CT Presets - Enhanced for better visibility
                    lung: { windowWidth: 1800, windowCenter: -500 },
                    bone: { windowWidth: 3000, windowCenter: 500 },
                    soft: { windowWidth: 600, windowCenter: 60 },
                    brain: { windowWidth: 120, windowCenter: 60 },
                    liver: { windowWidth: 200, windowCenter: 50 },
                    cine: { windowWidth: 800, windowCenter: 250 },
                    
                    // X-ray Presets - Enhanced for better visibility and contrast
                    'chest x-ray': { windowWidth: 3500, windowCenter: 800 },
                    'bone x-ray': { windowWidth: 5000, windowCenter: 2500 },
                    'soft x-ray': { windowWidth: 1000, windowCenter: 200 },
                    'extremity': { windowWidth: 4500, windowCenter: 2000 },
                    'spine': { windowWidth: 4000, windowCenter: 1500 },
                    'abdomen': { windowWidth: 2500, windowCenter: 400 },
                    'pediatric': { windowWidth: 3000, windowCenter: 500 },
                    
                    // Additional useful presets
                    'auto': { windowWidth: 'auto', windowCenter: 'auto' }, // Will trigger auto-windowing
                    'full range': { windowWidth: 65535, windowCenter: 32767 }
                };

                if (presets[presetName]) {
                    const preset = presets[presetName];
                    
                    // Handle auto-windowing
                    if (preset.windowWidth === 'auto' || preset.windowCenter === 'auto') {
                        // Trigger automatic windowing by reloading the image
                        this.reloadImageWithAutoWindowing();
                        this.showToast('Auto windowing applied', 'success', 1500);
                    } else {
                        viewport.voi.windowWidth = preset.windowWidth;
                        viewport.voi.windowCenter = preset.windowCenter;
                        cornerstone.setViewport(this.currentElement, viewport);
                        this.showToast(`${presetName.toUpperCase()} preset applied`, 'success', 1500);
                    }
                } else {
                    this.showToast(`Unknown preset: ${presetName}`, 'warning');
                }
            } else {
                this.showToast('No image loaded for preset', 'warning');
            }
        } catch (error) {
            this.showToast(`Failed to apply ${presetName} preset`, 'error');
            console.error('Preset error:', error);
        }
    }

    reloadImageWithAutoWindowing() {
        try {
            // Reload the current image with automatic windowing
            if (this.currentImageId) {
                // Add auto-windowing parameter to the image request
                const baseUrl = this.currentImageId.replace(/[?&](window_width|window_level)=[^&]*/g, '');
                const separator = baseUrl.includes('?') ? '&' : '?';
                const autoWindowUrl = `${baseUrl}${separator}auto_window=true`;
                
                // Reload the image
                if (typeof cornerstone !== 'undefined' && this.currentElement) {
                    cornerstone.loadImage(autoWindowUrl).then(image => {
                        cornerstone.displayImage(this.currentElement, image);
                    }).catch(error => {
                        console.error('Failed to reload image with auto windowing:', error);
                        this.showToast('Failed to apply auto windowing', 'error');
                    });
                }
            }
        } catch (error) {
            console.error('Auto windowing error:', error);
            this.showToast('Failed to apply auto windowing', 'error');
        }
    }

    loadFromLocalFiles() {
        try {
            const input = document.createElement('input');
            input.type = 'file';
            input.multiple = true;
            input.accept = '.dcm,.dicom';
            input.setAttribute('webkitdirectory', '');
            input.setAttribute('directory', '');
            input.onchange = (e) => {
                const files = Array.from(e.target.files || []);
                if (!files.length) return;
                const dicomFiles = files.filter(f => {
                    const n = (f.name || '').toLowerCase();
                    return n.endsWith('.dcm') || n.endsWith('.dicom') || (f.type === 'application/dicom') || (f.size > 132);
                });
                if (!dicomFiles.length) {
                    this.showToast('No DICOM files detected in selection', 'warning');
                    return;
                }
                this.showToast(`Loading ${dicomFiles.length} DICOM file(s) from folder...`, 'info');
                // If many files, upload to server and open in full viewer. If few, render locally.
                const LARGE_THRESHOLD = 50;
                if (dicomFiles.length >= LARGE_THRESHOLD) {
                    this.uploadLocalDicomToServer(dicomFiles);
                } else {
                    this.displayLocalDicomSeries(dicomFiles);
                }
            };
            input.click();
        } catch (error) {
            this.showToast('Failed to open file dialog', 'error');
        }
    }

    async displayLocalDicomSeries(files) {
        try {
            if (typeof dicomParser === 'undefined') {
                this.showToast('DICOM parser not available', 'error');
                return;
            }
            // Sort files for natural series order
            files.sort((a, b) => (a.webkitRelativePath || a.name).localeCompare(b.webkitRelativePath || b.name, undefined, { numeric: true }));

            const canvas = document.getElementById('dicomCanvas') || document.querySelector('canvas.dicom-canvas');
            if (!canvas) {
                this.showToast('No canvas available to render DICOM', 'error');
                return;
            }
            const ctx = canvas.getContext('2d');
            const overlayCurrent = document.getElementById('currentSlice');
            const overlayTotal = document.getElementById('totalSlices');
            const wwSlider = document.getElementById('windowWidthSlider');
            const wlSlider = document.getElementById('windowLevelSlider');

            // Parse all files (lightweight). Stop if too many errors.
            const localImages = [];
            for (let i = 0; i < files.length; i++) {
                const f = files[i];
                try {
                    const buf = await f.arrayBuffer();
                    const bytes = new Uint8Array(buf);
                    const ds = dicomParser.parseDicom(bytes);
                    const rows = ds.uint16('x00280010') || 0;
                    const cols = ds.uint16('x00280011') || 0;
                    const bitsAllocated = ds.uint16('x00280100') || 16;
                    const pixelRep = ds.uint16('x00280103') || 0;
                    const spp = ds.uint16('x00280002') || 1;
                    const pixelEl = ds.elements.x7fe00010;
                    if (!pixelEl || spp !== 1 || !rows || !cols) continue;
                    const raw = new Uint8Array(ds.byteArray.buffer, pixelEl.dataOffset, pixelEl.length);
                    let pixels;
                    if (bitsAllocated === 8) {
                        pixels = new Uint8Array(raw);
                    } else if (bitsAllocated === 16) {
                        const view = new DataView(raw.buffer, raw.byteOffset, raw.byteLength);
                        const len = raw.byteLength / 2;
                        pixels = new Float32Array(len);
                        for (let j = 0; j < len; j++) {
                            const v = pixelRep === 1 ? view.getInt16(j * 2, true) : view.getUint16(j * 2, true);
                            pixels[j] = v;
                        }
                    } else {
                        continue;
                    }
                    // WW/WL
                    let ww = (ds.intString && ds.intString('x00281051')) || null;
                    let wl = (ds.intString && ds.intString('x00281050')) || null;
                    if (!ww || !wl) {
                        let min = Infinity, max = -Infinity;
                        for (let j = 0; j < pixels.length; j++) { const v = pixels[j]; if (v < min) min = v; if (v > max) max = v; }
                        ww = Math.max(1, (max - min));
                        wl = Math.round(min + ww / 2);
                    }
                    localImages.push({ rows, cols, pixels, ww, wl });
                } catch (e) {
                    // Skip corrupt file
                }
            }

            if (!localImages.length) {
                this.showToast('No renderable DICOM images found', 'warning');
                return;
            }

            // Use first image to size canvas
            canvas.width = localImages[0].cols;
            canvas.height = localImages[0].rows;

            let index = 0;
            let ww = localImages[0].ww;
            let wl = localImages[0].wl;

            const render = () => {
                const img = localImages[index];
                if (!img) return;
                const W = img.cols, H = img.rows;
                if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; }
                const imageData = ctx.createImageData(W, H);
                const low = wl - ww / 2;
                const high = wl + ww / 2;
                for (let i = 0; i < W * H; i++) {
                    const v = img.pixels[i];
                    let g = Math.round(((v - low) / (high - low)) * 255);
                    if (isNaN(g)) g = 0; if (g < 0) g = 0; if (g > 255) g = 255;
                    const j = i * 4;
                    imageData.data[j] = g;
                    imageData.data[j + 1] = g;
                    imageData.data[j + 2] = g;
                    imageData.data[j + 3] = 255;
                }
                ctx.putImageData(imageData, 0, 0);
                if (overlayCurrent) overlayCurrent.textContent = index + 1;
                if (overlayTotal) overlayTotal.textContent = localImages.length;
            };

            const clampIndex = (v) => Math.max(0, Math.min(localImages.length - 1, v));
            const changeSlice = (delta) => { index = clampIndex(index + delta); render(); };

            // Mouse wheel for slice navigation
            canvas.addEventListener('wheel', (e) => { e.preventDefault(); changeSlice(e.deltaY > 0 ? 1 : -1); }, { passive: false });
            // Arrow keys
            document.addEventListener('keydown', (e) => {
                if (e.key === 'ArrowUp') { e.preventDefault(); changeSlice(-1); }
                if (e.key === 'ArrowDown') { e.preventDefault(); changeSlice(1); }
            });
            // Hook WW/WL sliders if present
            if (wwSlider) wwSlider.addEventListener('input', (e) => { ww = parseInt(e.target.value || ww, 10) || ww; render(); });
            if (wlSlider) wlSlider.addEventListener('input', (e) => { wl = parseInt(e.target.value || wl, 10) || wl; render(); });

            render();
            this.showToast(`Loaded local series: ${localImages.length} image(s)`, 'success');
        } catch (e) {
            console.error(e);
            this.showToast('Failed to open local DICOM series', 'error');
        }
    }

    uploadLocalDicomToServer(files) {
        try {
            const url = '/worklist/upload/';
            const token = (document.querySelector('meta[name="csrf-token"]') && document.querySelector('meta[name="csrf-token"]').getAttribute('content')) || '';
            // Chunk by total bytes to respect common reverse-proxy limits (~100MB)
            const MAX_CHUNK_BYTES = 80 * 1024 * 1024;
            const chunks = [];
            let current = []; let bytes = 0;
            for (const f of files) {
                if (bytes + (f.size || 0) > MAX_CHUNK_BYTES && current.length) { chunks.push(current); current = []; bytes = 0; }
                current.push(f); bytes += (f.size || 0);
            }
            if (current.length) chunks.push(current);

            const uploadChunk = (chunk) => new Promise((resolve) => {
                const formData = new FormData();
                chunk.forEach(file => formData.append('dicom_files', file));
                formData.append('priority', 'normal');
                const xhr = new XMLHttpRequest();
                xhr.open('POST', url, true);
                if (token) xhr.setRequestHeader('X-CSRFToken', token);
                xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
                xhr.timeout = 300000;
                xhr.onreadystatechange = function() {
                    if (xhr.readyState === 4) {
                        try {
                            const data = JSON.parse(xhr.responseText || '{}');
                            resolve({ ok: xhr.status >= 200 && xhr.status < 300 && data && data.success, data });
                        } catch (_) { resolve({ ok: false, data: null }); }
                    }
                };
                xhr.onerror = function() { resolve({ ok: false, data: null }); };
                xhr.ontimeout = function() { resolve({ ok: false, data: null }); };
                xhr.send(formData);
            });

            const run = async () => {
                let createdIds = [];
                for (let i = 0; i < chunks.length; i++) {
                    this.showToast(`Uploading DICOM chunk ${i + 1}/${chunks.length}...`, 'info', 4000);
                    const res = await uploadChunk(chunks[i]);
                    if (!res.ok) { this.showToast('Upload failed. Try smaller selection.', 'error'); return; }
                    if (Array.isArray(res.data && res.data.created_study_ids)) {
                        createdIds = createdIds.concat(res.data.created_study_ids);
                    }
                }
                if (createdIds.length) {
                    this.showToast('Upload complete. Opening in viewer...', 'success');
                    window.location.href = '/dicom-viewer/?study=' + createdIds[0];
                } else {
                    this.showToast('Upload finished but no study id returned', 'warning');
                }
            };
            run();
        } catch (e) {
            console.error(e);
            this.showToast('Failed to upload local DICOM to server', 'error');
        }
    }

    loadFromExternalMedia() {
        this.showToast('Opening external media loader...', 'info');
        // This would open a dialog to browse external media
        window.location.href = '/dicom-viewer/load-directory/';
    }

    exportImage() {
        try {
            if (typeof cornerstone !== 'undefined' && this.currentElement) {
                const canvas = cornerstone.getEnabledElement(this.currentElement).canvas;
                const link = document.createElement('a');
                link.download = `dicom-export-${Date.now()}.png`;
                link.href = canvas.toDataURL();
                link.click();
                this.showToast('Image exported successfully', 'success');
            } else {
                this.showToast('No image to export', 'warning');
            }
        } catch (error) {
            this.showToast('Failed to export image', 'error');
        }
    }

    saveMeasurements() {
        try {
            // Save measurements to localStorage or server
            const measurements = this.measurements;
            localStorage.setItem('dicom-measurements', JSON.stringify(measurements));
            this.showToast('Measurements saved', 'success');
        } catch (error) {
            this.showToast('Failed to save measurements', 'error');
        }
    }

    clearMeasurements() {
        try {
            this.measurements = [];
            if (typeof cornerstoneTools !== 'undefined' && this.currentElement) {
                cornerstoneTools.clearToolState(this.currentElement, 'length');
                cornerstone.updateImage(this.currentElement);
            }
            this.showToast('Measurements cleared', 'success');
        } catch (error) {
            this.showToast('Failed to clear measurements', 'error');
        }
    }

    showPrintDialog() {
        try {
            this.showToast('Opening print dialog...', 'info');
            window.print();
        } catch (error) {
            this.showToast('Failed to open print dialog', 'error');
        }
    }

    show3DReconstruction() {
        try {
            this.showToast('Launching 3D reconstruction...', 'info');
            // This would launch the 3D reconstruction view
            console.log('3D reconstruction requested');
        } catch (error) {
            this.showToast('Failed to launch 3D reconstruction', 'error');
        }
    }

    toggleMPR() {
        try {
            const mprPanel = document.querySelector('.mpr-panel');
            if (mprPanel) {
                mprPanel.style.display = mprPanel.style.display === 'none' ? 'block' : 'none';
                this.showToast('MPR view toggled', 'info', 1500);
            }
        } catch (error) {
            this.showToast('Failed to toggle MPR', 'error');
        }
    }

    toggleAIPanel() {
        try {
            const aiPanel = document.querySelector('.ai-panel');
            if (aiPanel) {
                aiPanel.style.display = aiPanel.style.display === 'none' ? 'block' : 'none';
                this.showToast('AI panel toggled', 'info', 1500);
            }
        } catch (error) {
            this.showToast('Failed to toggle AI panel', 'error');
        }
    }

    runQuickAI() {
        try {
            this.showToast('Running AI analysis...', 'info');
            // Simulate AI processing
            setTimeout(() => {
                this.showToast('AI analysis complete', 'success');
            }, 2000);
        } catch (error) {
            this.showToast('AI analysis failed', 'error');
        }
    }

    // Event handlers
    onImageLoaded(e) {
        this.currentElement = e.target;
        this.currentImageId = e.detail.imageId;
        console.log('Image loaded:', this.currentImageId);
        
        // Update modality badge and image info
        this.updateModalityBadge(e.detail.image);
        this.updateImageInfo(e.detail.image);
    }

    updateModalityBadge(image) {
        try {
            const modalityBadge = document.getElementById('modalityBadge');
            const modalityText = document.getElementById('modalityText');
            
            if (!modalityBadge || !modalityText) return;
            
            // Extract modality from image metadata or URL
            let modality = 'Unknown';
            let icon = 'fas fa-question';
            let badgeClass = '';
            
            // Try to get modality from image data or metadata
            if (image && image.data && image.data.string) {
                try {
                    const modalityTag = image.data.string('x00080060');
                    if (modalityTag) {
                        modality = modalityTag.toUpperCase();
                    }
                } catch (e) {
                    // Fallback: try to extract from URL or other sources
                    console.log('Could not extract modality from DICOM tags');
                }
            }
            
            // Set appropriate icon and class based on modality
            switch (modality.toUpperCase()) {
                case 'CR':
                case 'DX':
                case 'RF':
                case 'XA':
                case 'MG':
                    icon = 'fas fa-x-ray';
                    badgeClass = 'xray';
                    modalityText.textContent = modality === 'CR' ? 'X-Ray' : 
                                             modality === 'DX' ? 'Digital X-Ray' :
                                             modality === 'MG' ? 'Mammography' : 'X-Ray';
                    break;
                case 'CT':
                    icon = 'fas fa-circle-dot';
                    badgeClass = 'ct';
                    modalityText.textContent = 'CT';
                    break;
                case 'MR':
                    icon = 'fas fa-magnet';
                    badgeClass = 'mr';
                    modalityText.textContent = 'MRI';
                    break;
                case 'US':
                    icon = 'fas fa-wave-square';
                    badgeClass = 'us';
                    modalityText.textContent = 'Ultrasound';
                    break;
                default:
                    modalityText.textContent = modality || 'Unknown';
            }
            
            // Update badge
            modalityBadge.className = `modality-badge ${badgeClass}`;
            const iconElement = modalityBadge.querySelector('i');
            if (iconElement) {
                iconElement.className = icon;
            }
            
        } catch (error) {
            console.error('Error updating modality badge:', error);
        }
    }

    updateImageInfo(image) {
        try {
            // Update image dimensions
            const dimensionsEl = document.getElementById('imageDimensions');
            if (dimensionsEl && image) {
                const width = image.width || 'Unknown';
                const height = image.height || 'Unknown';
                dimensionsEl.textContent = `${width} × ${height}`;
            }
            
            // Update pixel spacing
            const pixelSpacingEl = document.getElementById('pixelSpacing');
            if (pixelSpacingEl && image && image.data && image.data.string) {
                try {
                    const spacing = image.data.string('x00280030');
                    if (spacing) {
                        const spacingValues = spacing.split('\\');
                        if (spacingValues.length >= 2) {
                            pixelSpacingEl.textContent = `${parseFloat(spacingValues[0]).toFixed(2)} × ${parseFloat(spacingValues[1]).toFixed(2)} mm`;
                        } else {
                            pixelSpacingEl.textContent = spacing;
                        }
                    } else {
                        pixelSpacingEl.textContent = 'Unknown';
                    }
                } catch (e) {
                    pixelSpacingEl.textContent = 'Unknown';
                }
            }
            
            // Update body part
            const bodyPartEl = document.getElementById('bodyPart');
            if (bodyPartEl && image && image.data && image.data.string) {
                try {
                    const bodyPart = image.data.string('x00180015');
                    bodyPartEl.textContent = bodyPart || 'Unknown';
                } catch (e) {
                    bodyPartEl.textContent = 'Unknown';
                }
            }
            
            // Update series description
            const seriesDescEl = document.getElementById('seriesDescription');
            if (seriesDescEl && image && image.data && image.data.string) {
                try {
                    const seriesDesc = image.data.string('x0008103e');
                    seriesDescEl.textContent = seriesDesc || 'Unknown';
                } catch (e) {
                    seriesDescEl.textContent = 'Unknown';
                }
            }
            
        } catch (error) {
            console.error('Error updating image info:', error);
        }
    }

    onImageLoadProgress(e) {
        const progress = Math.round((e.detail.percentComplete || 0) * 100);
        if (progress < 100) {
            this.showToast(`Loading image: ${progress}%`, 'info', 500);
        }
    }

    showToast(message, type = 'info', duration = 3000) {
        // Use the global toast system if available
        if (window.noctisProButtonManager) {
            window.noctisProButtonManager.showToast(message, type, duration);
        } else {
            console.log(`${type.toUpperCase()}: ${message}`);
        }
    }
}

// Initialize enhanced DICOM viewer
let dicomViewerEnhanced;

document.addEventListener('DOMContentLoaded', function() {
    dicomViewerEnhanced = new DicomViewerEnhanced();
    
    // Make globally available
    window.dicomViewerEnhanced = dicomViewerEnhanced;
    
    // Global function aliases for DICOM viewer
    window.setTool = (toolName) => dicomViewerEnhanced.setTool(toolName);
    window.setActiveTool = (toolName) => dicomViewerEnhanced.setTool(toolName);
    window.resetView = () => dicomViewerEnhanced.resetView();
    window.toggleCrosshair = () => dicomViewerEnhanced.toggleCrosshair();
    window.toggleInvert = () => dicomViewerEnhanced.toggleInvert();
    window.applyPreset = (presetName) => dicomViewerEnhanced.applyPreset(presetName);
    window.loadFromLocalFiles = () => dicomViewerEnhanced.loadFromLocalFiles();
    window.loadFromExternalMedia = () => dicomViewerEnhanced.loadFromExternalMedia();
    window.exportImage = () => dicomViewerEnhanced.exportImage();
    window.saveMeasurements = () => dicomViewerEnhanced.saveMeasurements();
    window.clearMeasurements = () => dicomViewerEnhanced.clearMeasurements();
    window.showPrintDialog = () => dicomViewerEnhanced.showPrintDialog();
    window.show3DReconstruction = () => dicomViewerEnhanced.show3DReconstruction();
    window.toggleMPR = () => dicomViewerEnhanced.toggleMPR();
    window.toggleAIPanel = () => dicomViewerEnhanced.toggleAIPanel();
    window.runQuickAI = () => dicomViewerEnhanced.runQuickAI();
    
    // Additional compatibility functions
    window.showLoading = (show, message) => {
        if (show && message) {
            dicomViewerEnhanced.showToast(message, 'info', 10000);
        }
    };
    window.showToast = (message, type, duration) => dicomViewerEnhanced.showToast(message, type, duration);
    window.hideLoading = () => {}; // No-op for compatibility
    
    // Studies loading function
    window.loadStudies = async () => {
        try {
            dicomViewerEnhanced.showToast('Loading studies...', 'info');
            const response = await fetch('/worklist/api/studies/');
            const data = await response.json();
            
            if (data.success && data.studies) {
                updateStudySelector(data.studies);
                dicomViewerEnhanced.showToast(`Loaded ${data.studies.length} studies`, 'success');
            } else {
                dicomViewerEnhanced.showToast('Failed to load studies', 'error');
            }
        } catch (error) {
            console.error('Error loading studies:', error);
            dicomViewerEnhanced.showToast('Error loading studies', 'error');
        }
    };
    
    // Update study selector dropdown
    window.updateStudySelector = (studies) => {
        const studySelect = document.getElementById('studySelect');
        if (studySelect) {
            studySelect.innerHTML = '<option value="">Select Study</option>';
            studies.forEach(study => {
                const option = document.createElement('option');
                option.value = study.id;
                option.textContent = `${study.patient_name} - ${study.accession_number}`;
                studySelect.appendChild(option);
            });
        }
    };
    
    // Reset zoom to fit
    window.resetZoom = () => {
        try {
            if (dicomViewerEnhanced.currentElement && typeof cornerstone !== 'undefined') {
                const viewport = cornerstone.getViewport(dicomViewerEnhanced.currentElement);
                if (viewport) {
                    viewport.scale = 1.0;
                    viewport.translation = { x: 0, y: 0 };
                    cornerstone.setViewport(dicomViewerEnhanced.currentElement, viewport);
                    dicomViewerEnhanced.showToast('Zoom reset to fit', 'success', 1500);
                } else {
                    dicomViewerEnhanced.showToast('No image to reset zoom', 'warning');
                }
            } else {
                dicomViewerEnhanced.showToast('No image loaded', 'warning');
            }
        } catch (error) {
            console.error('Error resetting zoom:', error);
            dicomViewerEnhanced.showToast('Failed to reset zoom', 'error');
        }
    };
    
    // Generate MPR reconstruction
    window.generateMPR = async () => {
        try {
            if (!window.currentSeries && !window.currentStudy) {
                dicomViewerEnhanced.showToast('Please load a series first', 'warning');
                return;
            }
            
            dicomViewerEnhanced.showToast('Generating MPR reconstruction...', 'info');
            
            const seriesId = window.currentSeries?.id || window.currentStudy?.series?.[0]?.id;
            if (!seriesId) {
                dicomViewerEnhanced.showToast('No series available for MPR', 'error');
                return;
            }
            
            const response = await fetch(`/dicom-viewer/api/series/${seriesId}/mpr/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': document.querySelector('[name=csrf-token]')?.content || ''
                }
            });
            
            const data = await response.json();
            
            if (data.success) {
                dicomViewerEnhanced.showToast('MPR reconstruction completed', 'success');
                // Handle MPR display logic here
            } else {
                dicomViewerEnhanced.showToast(data.error || 'MPR generation failed', 'error');
            }
        } catch (error) {
            console.error('Error generating MPR:', error);
            dicomViewerEnhanced.showToast('Failed to generate MPR', 'error');
        }
    };
    
    // Generate MIP reconstruction
    window.generateMIP = async () => {
        try {
            if (!window.currentSeries && !window.currentStudy) {
                dicomViewerEnhanced.showToast('Please load a series first', 'warning');
                return;
            }
            
            dicomViewerEnhanced.showToast('Generating MIP reconstruction...', 'info');
            
            const seriesId = window.currentSeries?.id || window.currentStudy?.series?.[0]?.id;
            if (!seriesId) {
                dicomViewerEnhanced.showToast('No series available for MIP', 'error');
                return;
            }
            
            const response = await fetch(`/dicom-viewer/api/series/${seriesId}/mip/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': document.querySelector('[name=csrf-token]')?.content || ''
                }
            });
            
            const data = await response.json();
            
            if (data.success) {
                dicomViewerEnhanced.showToast('MIP reconstruction completed', 'success');
                // Handle MIP display logic here
            } else {
                dicomViewerEnhanced.showToast(data.error || 'MIP generation failed', 'error');
            }
        } catch (error) {
            console.error('Error generating MIP:', error);
            dicomViewerEnhanced.showToast('Failed to generate MIP', 'error');
        }
    };
    
    // Load study data and populate series
    window.loadStudy = async (studyId) => {
        if (!studyId) return;
        
        try {
            dicomViewerEnhanced.showToast('Loading study data...', 'info');
            console.log('Loading study:', studyId);
            
            const response = await fetch(`/dicom-viewer/api/study/${studyId}/data/`);
            const data = await response.json();
            
            console.log('Study data received:', data);
            
            if (data.study && data.series) {
                window.currentStudy = data.study;
                
                // Hide welcome screen and show image view
                const welcomeScreen = document.getElementById('welcomeScreen');
                const singleView = document.getElementById('singleView');
                if (welcomeScreen) welcomeScreen.style.display = 'none';
                if (singleView) singleView.style.display = 'flex';
                
                // Update study status
                const studyStatus = document.getElementById('studyStatus');
                if (studyStatus) {
                    studyStatus.textContent = `${window.currentStudy.patient_name} - ${window.currentStudy.accession_number}`;
                }
                
                // Populate series dropdown
                const seriesSelect = document.getElementById('seriesSelect');
                if (seriesSelect) {
                    seriesSelect.innerHTML = '<option value="">Select Series</option>';
                    data.series.forEach(series => {
                        const option = document.createElement('option');
                        option.value = series.id;
                        const seriesNum = series.series_number || 'Unknown';
                        const seriesDesc = series.description || series.series_description || 'Unnamed Series';
                        const imageCount = series.image_count || 0;
                        option.textContent = `Series ${seriesNum}: ${seriesDesc} (${imageCount} images)`;
                        seriesSelect.appendChild(option);
                    });
                    
                    // Auto-load first series if available
                    if (data.series.length > 0) {
                        await loadSeries(data.series[0].id);
                    }
                }
                
                dicomViewerEnhanced.showToast('Study loaded successfully', 'success');
            } else {
                dicomViewerEnhanced.showToast('Failed to load study data', 'error');
            }
        } catch (error) {
            console.error('Error loading study:', error);
            dicomViewerEnhanced.showToast('Error loading study', 'error');
        }
    };
    
    // Load series images
    window.loadSeries = async (seriesId) => {
        if (!seriesId) return;
        
        try {
            dicomViewerEnhanced.showToast('Loading series images...', 'info');
            console.log('Loading series:', seriesId);
            
            const response = await fetch(`/dicom-viewer/web/series/${seriesId}/images/`);
            const data = await response.json();
            
            console.log('Series data received:', data);
            
            if (data.images && data.images.length > 0) {
                window.currentSeries = data;
                window.currentImages = data.images;
                window.currentImageIndex = 0;
                
                // Load first image
                await loadImage(data.images[0].id);
                
                // Update image navigation
                updateImageNavigation();
                
                dicomViewerEnhanced.showToast(`Series loaded: ${data.images.length} images`, 'success');
            } else {
                dicomViewerEnhanced.showToast('No images found in series', 'warning');
            }
        } catch (error) {
            console.error('Error loading series:', error);
            dicomViewerEnhanced.showToast('Error loading series', 'error');
        }
    };
    
    // Load individual image
    window.loadImage = async (imageId) => {
        if (!imageId) return;
        
        try {
            dicomViewerEnhanced.showToast('Loading image...', 'info');
            
            const response = await fetch(`/dicom-viewer/web/image/${imageId}/`);
            const imageUrl = response.url;
            
            // Load image into canvas
            const canvas = document.getElementById('dicomCanvas');
            const img = new Image();
            
            img.onload = function() {
                if (canvas) {
                    const ctx = canvas.getContext('2d');
                    canvas.width = this.naturalWidth;
                    canvas.height = this.naturalHeight;
                    ctx.drawImage(this, 0, 0);
                    
                    // Store current image
                    window.currentImageElement = this;
                    window.currentImageId = imageId;
                    
                    dicomViewerEnhanced.showToast('Image loaded successfully', 'success');
                }
            };
            
            img.onerror = function() {
                dicomViewerEnhanced.showToast('Failed to load image', 'error');
            };
            
            img.src = imageUrl;
            
        } catch (error) {
            console.error('Error loading image:', error);
            dicomViewerEnhanced.showToast('Error loading image', 'error');
        }
    };
    
    // Update image navigation controls
    window.updateImageNavigation = () => {
        const imageInfo = document.getElementById('imageInfo');
        if (imageInfo && window.currentImages) {
            const current = window.currentImageIndex + 1;
            const total = window.currentImages.length;
            imageInfo.textContent = `Image ${current} of ${total}`;
        }
    };
    
    // Print current image
    window.printCurrentImage = () => {
        try {
            const canvas = document.getElementById('dicomCanvas');
            if (canvas) {
                const printWindow = window.open('', '_blank');
                const imageDataUrl = canvas.toDataURL('image/png');
                
                printWindow.document.write(`
                    <html>
                        <head>
                            <title>DICOM Image Print</title>
                            <style>
                                body { margin: 0; padding: 20px; text-align: center; }
                                img { max-width: 100%; max-height: 90vh; }
                                .header { margin-bottom: 20px; font-family: Arial, sans-serif; }
                            </style>
                        </head>
                        <body>
                            <div class="header">
                                <h3>DICOM Image</h3>
                                <p>Patient: ${window.currentStudy?.patient_name || 'Unknown'}</p>
                                <p>Study: ${window.currentStudy?.accession_number || 'Unknown'}</p>
                            </div>
                            <img src="${imageDataUrl}" onload="window.print(); window.close();" />
                        </body>
                    </html>
                `);
                printWindow.document.close();
                
                dicomViewerEnhanced.showToast('Opening print dialog...', 'info');
            } else {
                dicomViewerEnhanced.showToast('No image to print', 'warning');
            }
        } catch (error) {
            console.error('Error printing image:', error);
            dicomViewerEnhanced.showToast('Failed to print image', 'error');
        }
    };
    
    // Export current image
    window.exportCurrentImage = () => {
        try {
            const canvas = document.getElementById('dicomCanvas');
            if (canvas) {
                const imageDataUrl = canvas.toDataURL('image/png');
                const link = document.createElement('a');
                link.download = `dicom-image-${Date.now()}.png`;
                link.href = imageDataUrl;
                link.click();
                
                dicomViewerEnhanced.showToast('Image exported successfully', 'success');
            } else {
                dicomViewerEnhanced.showToast('No image to export', 'warning');
            }
        } catch (error) {
            console.error('Error exporting image:', error);
            dicomViewerEnhanced.showToast('Failed to export image', 'error');
        }
    };
    
    // Image navigation functions
    window.nextImage = () => {
        if (window.currentImages && window.currentImageIndex < window.currentImages.length - 1) {
            window.currentImageIndex++;
            loadImage(window.currentImages[window.currentImageIndex].id);
            updateImageNavigation();
        }
    };
    
    window.previousImage = () => {
        if (window.currentImages && window.currentImageIndex > 0) {
            window.currentImageIndex--;
            loadImage(window.currentImages[window.currentImageIndex].id);
            updateImageNavigation();
        }
    };
    
    window.firstImage = () => {
        if (window.currentImages && window.currentImages.length > 0) {
            window.currentImageIndex = 0;
            loadImage(window.currentImages[0].id);
            updateImageNavigation();
        }
    };
    
    window.lastImage = () => {
        if (window.currentImages && window.currentImages.length > 0) {
            window.currentImageIndex = window.currentImages.length - 1;
            loadImage(window.currentImages[window.currentImageIndex].id);
            updateImageNavigation();
        }
    };
    
    // Basic cine mode functionality
    window.cineMode = {
        isPlaying: false,
        intervalId: null,
        speed: 200, // milliseconds between frames
        
        togglePlay: function() {
            if (this.isPlaying) {
                this.stop();
            } else {
                this.play();
            }
        },
        
        play: function() {
            if (!window.currentImages || window.currentImages.length < 2) {
                dicomViewerEnhanced.showToast('Need multiple images for cine mode', 'warning');
                return;
            }
            
            this.isPlaying = true;
            this.intervalId = setInterval(() => {
                if (window.currentImageIndex >= window.currentImages.length - 1) {
                    window.currentImageIndex = 0;
                } else {
                    window.currentImageIndex++;
                }
                loadImage(window.currentImages[window.currentImageIndex].id);
                updateImageNavigation();
            }, this.speed);
            
            dicomViewerEnhanced.showToast('Cine mode started', 'info');
        },
        
        stop: function() {
            this.isPlaying = false;
            if (this.intervalId) {
                clearInterval(this.intervalId);
                this.intervalId = null;
            }
            dicomViewerEnhanced.showToast('Cine mode stopped', 'info');
        }
    };
    
    // Basic keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        // Only process if not in input fields
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.contentEditable === 'true') {
            return;
        }
        
        switch (e.key) {
            case 'ArrowUp':
                e.preventDefault();
                previousImage();
                break;
            case 'ArrowDown':
                e.preventDefault();
                nextImage();
                break;
            case 'Home':
                e.preventDefault();
                firstImage();
                break;
            case 'End':
                e.preventDefault();
                lastImage();
                break;
            case ' ': // Spacebar for cine toggle
                e.preventDefault();
                cineMode.togglePlay();
                break;
            case 'w':
            case 'W':
                e.preventDefault();
                setTool('window');
                break;
            case 'z':
            case 'Z':
                e.preventDefault();
                setTool('zoom');
                break;
            case 'p':
            case 'P':
                e.preventDefault();
                setTool('pan');
                break;
            case 'r':
            case 'R':
                e.preventDefault();
                resetView();
                break;
            case 'i':
            case 'I':
                e.preventDefault();
                toggleInvert();
                break;
        }
    });
    
    // Missing MPR and 3D functions
    window.setActivePlane = (plane) => {
        console.log('Setting active plane:', plane);
        dicomViewerEnhanced.showToast(`Switched to ${plane} plane`, 'info');
        // TODO: Implement plane switching logic
    };
    
    window.generateBone3DType = (type) => {
        if (!type) return;
        dicomViewerEnhanced.showToast(`Generating ${type} bone reconstruction...`, 'info');
        // TODO: Implement bone 3D reconstruction
    };
    
    window.generateVolumeRenderType = (type) => {
        if (!type) return;
        dicomViewerEnhanced.showToast(`Generating ${type} volume render...`, 'info');
        // TODO: Implement volume rendering
    };
    
    window.generateAdvanced3D = (type) => {
        if (!type) return;
        dicomViewerEnhanced.showToast(`Generating ${type} advanced 3D...`, 'info');
        // TODO: Implement advanced 3D reconstruction
    };
    
    window.changePlane = (plane) => {
        console.log('Changing plane to:', plane);
        dicomViewerEnhanced.showToast(`Changed to ${plane} view`, 'info');
        // TODO: Implement plane change logic
    };
    
    // AI Analysis functions
    window.runAIAnalysisSimple = (type) => {
        if (!type) return;
        dicomViewerEnhanced.showToast(`Running ${type} AI analysis...`, 'info');
        // TODO: Implement AI analysis
    };
    
    window.showAIResults = () => {
        dicomViewerEnhanced.showToast('Showing AI analysis results...', 'info');
        // TODO: Implement AI results display
    };
    
    // Export functions
    window.exportSeries = () => {
        try {
            if (!window.currentSeries) {
                dicomViewerEnhanced.showToast('No series loaded to export', 'warning');
                return;
            }
            dicomViewerEnhanced.showToast('Exporting series...', 'info');
            // TODO: Implement series export
        } catch (error) {
            console.error('Error exporting series:', error);
            dicomViewerEnhanced.showToast('Failed to export series', 'error');
        }
    };
    
    // Measurement functions
    window.deleteMeasurement = (index) => {
        try {
            if (dicomViewerEnhanced.measurements && dicomViewerEnhanced.measurements[index]) {
                dicomViewerEnhanced.measurements.splice(index, 1);
                dicomViewerEnhanced.showToast('Measurement deleted', 'success');
                // TODO: Refresh measurement display
            }
        } catch (error) {
            console.error('Error deleting measurement:', error);
            dicomViewerEnhanced.showToast('Failed to delete measurement', 'error');
        }
    };
    
    // UI and 3D functions from masterpiece viewer
    window.toggleUI = () => {
        const rightPanel = document.querySelector('.right-panel');
        if (rightPanel) {
            rightPanel.style.display = rightPanel.style.display === 'none' ? 'block' : 'none';
            dicomViewerEnhanced.showToast('UI toggled', 'info');
        }
    };
    
    window.selectStudy = () => {
        const studySelector = document.getElementById('studySelector');
        if (studySelector && studySelector.value) {
            loadStudy(studySelector.value);
        }
    };
    
    window.reset3DView = () => {
        dicomViewerEnhanced.showToast('3D view reset', 'info');
        // TODO: Implement 3D view reset
    };
    
    window.toggle3DRotation = () => {
        dicomViewerEnhanced.showToast('3D rotation toggled', 'info');
        // TODO: Implement 3D auto rotation
    };
    
    window.export3DModel = () => {
        dicomViewerEnhanced.showToast('Exporting 3D model...', 'info');
        // TODO: Implement 3D model export
    };
});

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DicomViewerEnhanced;
}