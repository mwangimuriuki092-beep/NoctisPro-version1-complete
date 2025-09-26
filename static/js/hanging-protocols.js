/**
 * Hanging Protocols System
 * Automatic layout of multiple studies/series for clinical workflow
 */

class HangingProtocols {
    constructor() {
        this.protocols = this.getStandardProtocols();
        this.customProtocols = [];
        this.currentProtocol = null;
        this.viewports = [];
        this.layoutContainer = null;
        
        this.init();
    }
    
    init() {
        this.createLayoutContainer();
        this.setupProtocolUI();
        this.loadCustomProtocols();
        console.log('🖼️ Hanging Protocols initialized');
    }
    
    getStandardProtocols() {
        return {
            // Standard layouts
            'single': {
                name: 'Single View',
                layout: { rows: 1, cols: 1 },
                modalities: ['ALL'],
                description: 'Single large viewport'
            },
            
            'dual_horizontal': {
                name: 'Dual Horizontal',
                layout: { rows: 1, cols: 2 },
                modalities: ['ALL'],
                description: 'Two viewports side by side'
            },
            
            'dual_vertical': {
                name: 'Dual Vertical', 
                layout: { rows: 2, cols: 1 },
                modalities: ['ALL'],
                description: 'Two viewports stacked'
            },
            
            'quad': {
                name: 'Quad View',
                layout: { rows: 2, cols: 2 },
                modalities: ['ALL'],
                description: 'Four equal viewports'
            },
            
            // CT-specific protocols
            'ct_chest': {
                name: 'CT Chest Protocol',
                layout: { rows: 2, cols: 2 },
                modalities: ['CT'],
                series_rules: [
                    { position: 0, series_type: 'axial', window: 'lung' },
                    { position: 1, series_type: 'axial', window: 'mediastinum' },
                    { position: 2, series_type: 'coronal', window: 'lung' },
                    { position: 3, series_type: 'sagittal', window: 'soft_tissue' }
                ],
                description: 'Optimized for chest CT reading'
            },
            
            'ct_abdomen': {
                name: 'CT Abdomen Protocol',
                layout: { rows: 2, cols: 3 },
                modalities: ['CT'],
                series_rules: [
                    { position: 0, series_type: 'pre_contrast', window: 'soft_tissue' },
                    { position: 1, series_type: 'arterial', window: 'soft_tissue' },
                    { position: 2, series_type: 'portal', window: 'soft_tissue' },
                    { position: 3, series_type: 'delayed', window: 'soft_tissue' },
                    { position: 4, series_type: 'coronal', window: 'soft_tissue' },
                    { position: 5, series_type: 'sagittal', window: 'soft_tissue' }
                ],
                description: 'Multi-phase abdominal CT protocol'
            },
            
            'ct_brain': {
                name: 'CT Brain Protocol',
                layout: { rows: 2, cols: 2 },
                modalities: ['CT'],
                series_rules: [
                    { position: 0, series_type: 'axial', window: 'brain' },
                    { position: 1, series_type: 'axial', window: 'bone' },
                    { position: 2, series_type: 'coronal', window: 'brain' },
                    { position: 3, series_type: 'sagittal', window: 'brain' }
                ],
                description: 'Brain CT with multiple windows'
            },
            
            // MRI protocols
            'mri_brain': {
                name: 'MRI Brain Protocol',
                layout: { rows: 2, cols: 3 },
                modalities: ['MR'],
                series_rules: [
                    { position: 0, series_type: 't1_axial', window: 'mri_t1' },
                    { position: 1, series_type: 't2_axial', window: 'mri_t2' },
                    { position: 2, series_type: 'flair_axial', window: 'mri_flair' },
                    { position: 3, series_type: 't1_sagittal', window: 'mri_t1' },
                    { position: 4, series_type: 't2_coronal', window: 'mri_t2' },
                    { position: 5, series_type: 'dwi', window: 'mri_dwi' }
                ],
                description: 'Comprehensive brain MRI protocol'
            },
            
            // X-ray protocols
            'chest_xray': {
                name: 'Chest X-ray Protocol',
                layout: { rows: 1, cols: 2 },
                modalities: ['CR', 'DX'],
                series_rules: [
                    { position: 0, series_type: 'pa', window: 'xray_chest' },
                    { position: 1, series_type: 'lateral', window: 'xray_chest' }
                ],
                description: 'PA and lateral chest X-rays'
            },
            
            // Comparison protocols
            'comparison_dual': {
                name: 'Current vs Prior',
                layout: { rows: 1, cols: 2 },
                modalities: ['ALL'],
                comparison_mode: true,
                description: 'Compare current study with prior'
            },
            
            'comparison_quad': {
                name: 'Multi-timepoint Comparison',
                layout: { rows: 2, cols: 2 },
                modalities: ['ALL'],
                comparison_mode: true,
                description: 'Compare multiple timepoints'
            }
        };
    }
    
    createLayoutContainer() {
        // Find or create the main layout container
        this.layoutContainer = document.querySelector('.viewer-main, .main-viewer, .center-area');
        
        if (!this.layoutContainer) {
            console.error('Layout container not found');
            return;
        }
        
        // Add hanging protocol controls
        this.addProtocolControls();
    }
    
    addProtocolControls() {
        const controlsHTML = `
            <div class="hanging-protocol-controls" style="display: none;">
                <div class="protocol-selector">
                    <select id="protocol-select">
                        <option value="">Select Hanging Protocol</option>
                    </select>
                    <button class="btn btn-sm" onclick="applySelectedProtocol()">Apply</button>
                    <button class="btn btn-sm" onclick="showProtocolManager()">Manage</button>
                </div>
                <div class="layout-info" id="layout-info">
                    <span>Layout: Single View</span>
                </div>
            </div>
        `;
        
        const styleHTML = `
            <style>
                .hanging-protocol-controls {
                    background: #2a2a2a;
                    border-bottom: 1px solid #333;
                    padding: 8px 15px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                
                .protocol-selector {
                    display: flex;
                    gap: 10px;
                    align-items: center;
                }
                
                .protocol-selector select {
                    background: #333;
                    border: 1px solid #555;
                    color: #fff;
                    padding: 4px 8px;
                    border-radius: 3px;
                }
                
                .layout-info {
                    color: #ccc;
                    font-size: 12px;
                }
                
                .viewport-grid {
                    display: grid;
                    gap: 2px;
                    height: calc(100% - 40px);
                    background: #111;
                    padding: 2px;
                }
                
                .viewport {
                    background: #000;
                    border: 1px solid #333;
                    position: relative;
                    overflow: hidden;
                }
                
                .viewport.active {
                    border-color: #00d4ff;
                    box-shadow: 0 0 10px rgba(0, 212, 255, 0.3);
                }
                
                .viewport-canvas {
                    width: 100%;
                    height: 100%;
                    background: #000;
                }
                
                .viewport-info {
                    position: absolute;
                    top: 5px;
                    left: 5px;
                    background: rgba(0, 0, 0, 0.7);
                    color: #00ff00;
                    padding: 2px 6px;
                    font-size: 10px;
                    border-radius: 3px;
                }
                
                .viewport-tools {
                    position: absolute;
                    top: 5px;
                    right: 5px;
                    display: flex;
                    gap: 2px;
                }
                
                .viewport-tool {
                    background: rgba(0, 0, 0, 0.7);
                    border: none;
                    color: #fff;
                    width: 20px;
                    height: 20px;
                    font-size: 10px;
                    cursor: pointer;
                    border-radius: 2px;
                }
            </style>
        `;
        
        document.head.insertAdjacentHTML('beforeend', styleHTML);
        this.layoutContainer.insertAdjacentHTML('afterbegin', controlsHTML);
        
        this.populateProtocolSelector();
    }
    
    populateProtocolSelector() {
        const select = document.getElementById('protocol-select');
        if (!select) return;
        
        // Add standard protocols
        Object.entries(this.protocols).forEach(([key, protocol]) => {
            const option = document.createElement('option');
            option.value = key;
            option.textContent = protocol.name;
            option.title = protocol.description;
            select.appendChild(option);
        });
        
        // Add custom protocols
        this.customProtocols.forEach((protocol, index) => {
            const option = document.createElement('option');
            option.value = `custom_${index}`;
            option.textContent = `${protocol.name} (Custom)`;
            option.title = protocol.description;
            select.appendChild(option);
        });
    }
    
    applyProtocol(protocolKey, studyData = null) {
        const protocol = this.protocols[protocolKey] || 
                         this.customProtocols[parseInt(protocolKey.replace('custom_', ''))];
        
        if (!protocol) {
            console.error('Protocol not found:', protocolKey);
            return;
        }
        
        this.currentProtocol = protocol;
        
        console.log(`🖼️ Applying hanging protocol: ${protocol.name}`);
        
        // Create viewport layout
        this.createViewportLayout(protocol.layout);
        
        // Load content into viewports
        if (studyData) {
            this.loadContentIntoViewports(protocol, studyData);
        }
        
        // Update UI
        this.updateLayoutInfo(protocol);
        
        // Show protocol controls
        document.querySelector('.hanging-protocol-controls').style.display = 'flex';
    }
    
    createViewportLayout(layout) {
        // Clear existing layout
        const existingGrid = document.querySelector('.viewport-grid');
        if (existingGrid) {
            existingGrid.remove();
        }
        
        // Create new grid
        const grid = document.createElement('div');
        grid.className = 'viewport-grid';
        grid.style.gridTemplateRows = `repeat(${layout.rows}, 1fr)`;
        grid.style.gridTemplateColumns = `repeat(${layout.cols}, 1fr)`;
        
        // Create viewports
        this.viewports = [];
        const totalViewports = layout.rows * layout.cols;
        
        for (let i = 0; i < totalViewports; i++) {
            const viewport = this.createViewport(i);
            grid.appendChild(viewport.element);
            this.viewports.push(viewport);
        }
        
        this.layoutContainer.appendChild(grid);
    }
    
    createViewport(index) {
        const viewportElement = document.createElement('div');
        viewportElement.className = 'viewport';
        viewportElement.dataset.viewportIndex = index;
        
        // Create canvas for this viewport
        const canvas = document.createElement('canvas');
        canvas.className = 'viewport-canvas';
        canvas.id = `viewport-canvas-${index}`;
        
        // Create viewport info
        const info = document.createElement('div');
        info.className = 'viewport-info';
        info.textContent = `Viewport ${index + 1}`;
        
        // Create viewport tools
        const tools = document.createElement('div');
        tools.className = 'viewport-tools';
        tools.innerHTML = `
            <button class="viewport-tool" title="Sync" onclick="syncViewport(${index})">⇄</button>
            <button class="viewport-tool" title="Maximize" onclick="maximizeViewport(${index})">⛶</button>
            <button class="viewport-tool" title="Close" onclick="closeViewport(${index})">×</button>
        `;
        
        viewportElement.appendChild(canvas);
        viewportElement.appendChild(info);
        viewportElement.appendChild(tools);
        
        // Setup viewport interaction
        this.setupViewportInteraction(viewportElement, index);
        
        return {
            element: viewportElement,
            canvas: canvas,
            info: info,
            index: index,
            studyId: null,
            seriesId: null,
            imageId: null
        };
    }
    
    setupViewportInteraction(element, index) {
        element.addEventListener('click', () => {
            this.setActiveViewport(index);
        });
        
        // Add canvas interaction for this viewport
        const canvas = element.querySelector('canvas');
        if (canvas) {
            this.setupCanvasInteraction(canvas, index);
        }
    }
    
    setupCanvasInteraction(canvas, viewportIndex) {
        let isDragging = false;
        let lastX, lastY;
        let viewport = { scale: 1, offsetX: 0, offsetY: 0 };
        
        canvas.addEventListener('mousedown', (e) => {
            isDragging = true;
            lastX = e.clientX;
            lastY = e.clientY;
            this.setActiveViewport(viewportIndex);
        });
        
        canvas.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            
            const deltaX = e.clientX - lastX;
            const deltaY = e.clientY - lastY;
            
            if (e.shiftKey) {
                // Window/Level
                this.adjustViewportWindowLevel(viewportIndex, deltaX, deltaY);
            } else {
                // Pan
                viewport.offsetX += deltaX;
                viewport.offsetY += deltaY;
                this.updateViewportTransform(viewportIndex, viewport);
            }
            
            lastX = e.clientX;
            lastY = e.clientY;
        });
        
        canvas.addEventListener('mouseup', () => {
            isDragging = false;
        });
        
        canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            const factor = e.deltaY > 0 ? 0.9 : 1.1;
            viewport.scale *= factor;
            viewport.scale = Math.max(0.1, Math.min(10, viewport.scale));
            this.updateViewportTransform(viewportIndex, viewport);
        });
        
        // Store viewport state
        this.viewports[viewportIndex].viewport = viewport;
    }
    
    setActiveViewport(index) {
        // Remove active class from all viewports
        document.querySelectorAll('.viewport').forEach(vp => vp.classList.remove('active'));
        
        // Set active viewport
        const viewport = document.querySelector(`[data-viewport-index="${index}"]`);
        if (viewport) {
            viewport.classList.add('active');
        }
        
        console.log(`📍 Active viewport: ${index + 1}`);
    }
    
    loadContentIntoViewports(protocol, studyData) {
        if (!protocol.series_rules) {
            // Simple layout - just load first series into first viewport
            if (studyData.series && studyData.series.length > 0) {
                this.loadSeriesIntoViewport(0, studyData.series[0]);
            }
            return;
        }
        
        // Apply series rules
        protocol.series_rules.forEach((rule, index) => {
            if (index < this.viewports.length) {
                const series = this.findSeriesByRule(studyData.series, rule);
                if (series) {
                    this.loadSeriesIntoViewport(index, series, rule.window);
                }
            }
        });
    }
    
    findSeriesByRule(seriesList, rule) {
        // Simple series matching based on series description
        return seriesList.find(series => {
            const description = (series.series_description || '').toLowerCase();
            
            switch (rule.series_type) {
                case 'axial':
                    return description.includes('axial') || description.includes('ax');
                case 'coronal':
                    return description.includes('coronal') || description.includes('cor');
                case 'sagittal':
                    return description.includes('sagittal') || description.includes('sag');
                case 'pre_contrast':
                    return description.includes('pre') || description.includes('non');
                case 'arterial':
                    return description.includes('arterial') || description.includes('art');
                case 'portal':
                    return description.includes('portal') || description.includes('venous');
                case 'delayed':
                    return description.includes('delayed') || description.includes('late');
                case 't1_axial':
                    return description.includes('t1') && description.includes('ax');
                case 't2_axial':
                    return description.includes('t2') && description.includes('ax');
                case 'flair_axial':
                    return description.includes('flair') && description.includes('ax');
                case 'dwi':
                    return description.includes('dwi') || description.includes('diffusion');
                case 'pa':
                    return description.includes('pa') || description.includes('posterior');
                case 'lateral':
                    return description.includes('lat') || description.includes('lateral');
                default:
                    return true;
            }
        }) || seriesList[0]; // Fallback to first series
    }
    
    async loadSeriesIntoViewport(viewportIndex, series, windowPreset = null) {
        const viewport = this.viewports[viewportIndex];
        if (!viewport) return;
        
        console.log(`📺 Loading series ${series.id} into viewport ${viewportIndex + 1}`);
        
        try {
            // Load first image of series
            const response = await fetch(`/dicom-viewer/series/${series.id}/images/`, {
                method: 'GET',
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                    'Accept': 'application/json',
                    'X-CSRFToken': this.getCSRFToken()
                },
                credentials: 'same-origin'
            });
            
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            
            const seriesData = await response.json();
            
            if (seriesData.images && seriesData.images.length > 0) {
                await this.loadImageIntoViewport(viewportIndex, seriesData.images[0].id, windowPreset);
                
                // Update viewport info
                viewport.info.textContent = `${series.series_description || 'Series'} (${seriesData.images.length} images)`;
                viewport.seriesId = series.id;
            }
            
        } catch (error) {
            console.error(`Failed to load series into viewport ${viewportIndex}:`, error);
            this.showViewportError(viewportIndex, 'Failed to load series');
        }
    }
    
    async loadImageIntoViewport(viewportIndex, imageId, windowPreset = null) {
        const viewport = this.viewports[viewportIndex];
        if (!viewport) return;
        
        try {
            const response = await fetch(`/dicom-viewer/api/image/${imageId}/display/`, {
                method: 'GET',
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                    'Accept': 'application/json',
                    'X-CSRFToken': this.getCSRFToken()
                },
                credentials: 'same-origin'
            });
            
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            
            const imageData = await response.json();
            
            if (imageData.success && imageData.image_data) {
                await this.displayImageInViewport(viewportIndex, imageData, windowPreset);
                viewport.imageId = imageId;
            }
            
        } catch (error) {
            console.error(`Failed to load image into viewport ${viewportIndex}:`, error);
            this.showViewportError(viewportIndex, 'Failed to load image');
        }
    }
    
    displayImageInViewport(viewportIndex, imageData, windowPreset = null) {
        return new Promise((resolve, reject) => {
            const viewport = this.viewports[viewportIndex];
            if (!viewport) {
                reject(new Error('Viewport not found'));
                return;
            }
            
            const canvas = viewport.canvas;
            const ctx = canvas.getContext('2d');
            
            // Set canvas size
            const rect = canvas.getBoundingClientRect();
            canvas.width = rect.width;
            canvas.height = rect.height;
            
            const img = new Image();
            img.onload = () => {
                // Clear canvas
                ctx.fillStyle = '#000';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                
                // Apply window preset if specified
                if (windowPreset && window.windowLevelPresets) {
                    const preset = window.windowLevelPresets.presets[windowPreset];
                    if (preset) {
                        ctx.filter = `contrast(${preset.width/256}) brightness(${1 + (preset.center-127)/127})`;
                    }
                } else {
                    // Use standard medical imaging filter
                    ctx.filter = 'contrast(1.9) brightness(2.2) saturate(0.9)';
                }
                
                // Calculate image fit
                const scale = Math.min(canvas.width / img.width, canvas.height / img.height) * 0.95;
                const x = (canvas.width - img.width * scale) / 2;
                const y = (canvas.height - img.height * scale) / 2;
                
                // Draw image
                ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
                ctx.filter = 'none';
                
                resolve();
            };
            
            img.onerror = () => reject(new Error('Failed to load image'));
            img.src = imageData.image_data;
        });
    }
    
    showViewportError(viewportIndex, message) {
        const viewport = this.viewports[viewportIndex];
        if (!viewport) return;
        
        const ctx = viewport.canvas.getContext('2d');
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, viewport.canvas.width, viewport.canvas.height);
        
        ctx.fillStyle = '#ff4444';
        ctx.font = '14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(message, viewport.canvas.width / 2, viewport.canvas.height / 2);
    }
    
    updateViewportTransform(viewportIndex, viewport) {
        // Update viewport transform (zoom/pan)
        const canvas = this.viewports[viewportIndex].canvas;
        const ctx = canvas.getContext('2d');
        
        // This would redraw the image with new transform
        // For now, just log the change
        console.log(`🔄 Viewport ${viewportIndex + 1} transform updated:`, viewport);
    }
    
    adjustViewportWindowLevel(viewportIndex, deltaX, deltaY) {
        // Adjust window/level for specific viewport
        console.log(`🎚️ Viewport ${viewportIndex + 1} window/level adjusted`);
    }
    
    updateLayoutInfo(protocol) {
        const layoutInfo = document.getElementById('layout-info');
        if (layoutInfo) {
            layoutInfo.textContent = `Layout: ${protocol.name} (${protocol.layout.rows}×${protocol.layout.cols})`;
        }
    }
    
    // Auto-detect best protocol for study
    autoSelectProtocol(studyData) {
        if (!studyData || !studyData.series) return 'single';
        
        const modality = studyData.modality || studyData.series[0]?.modality || 'CT';
        const seriesCount = studyData.series.length;
        
        // Auto-select based on modality and series count
        if (modality === 'CT') {
            const descriptions = studyData.series.map(s => (s.series_description || '').toLowerCase());
            
            if (descriptions.some(d => d.includes('chest'))) {
                return 'ct_chest';
            } else if (descriptions.some(d => d.includes('abdomen') || d.includes('pelvis'))) {
                return 'ct_abdomen';
            } else if (descriptions.some(d => d.includes('brain') || d.includes('head'))) {
                return 'ct_brain';
            }
        } else if (modality === 'MR') {
            return 'mri_brain';
        } else if (modality === 'CR' || modality === 'DX') {
            return seriesCount >= 2 ? 'chest_xray' : 'single';
        }
        
        // Default based on series count
        if (seriesCount >= 4) return 'quad';
        if (seriesCount >= 2) return 'dual_horizontal';
        return 'single';
    }
    
    loadCustomProtocols() {
        try {
            const saved = localStorage.getItem('hanging_protocols_custom');
            if (saved) {
                this.customProtocols = JSON.parse(saved);
            }
        } catch (error) {
            console.warn('Failed to load custom protocols:', error);
        }
    }
    
    saveCustomProtocols() {
        try {
            localStorage.setItem('hanging_protocols_custom', JSON.stringify(this.customProtocols));
        } catch (error) {
            console.warn('Failed to save custom protocols:', error);
        }
    }
    
    getCSRFToken() {
        const metaToken = document.querySelector('meta[name="csrf-token"]');
        if (metaToken) return metaToken.getAttribute('content');
        
        const cookieToken = document.cookie.split(';')
            .find(row => row.startsWith('csrftoken='));
        if (cookieToken) return cookieToken.split('=')[1];
        
        return '';
    }
}

// Global functions
window.applySelectedProtocol = function() {
    const select = document.getElementById('protocol-select');
    const protocolKey = select.value;
    
    if (protocolKey && window.hangingProtocols) {
        const studyData = window.dicomCanvasFix?.currentStudy;
        window.hangingProtocols.applyProtocol(protocolKey, studyData);
    }
};

window.showProtocolManager = function() {
    console.log('🛠️ Opening protocol manager...');
    // Implement protocol manager dialog
};

window.syncViewport = function(index) {
    console.log(`⇄ Syncing viewport ${index + 1}`);
    // Implement viewport synchronization
};

window.maximizeViewport = function(index) {
    console.log(`⛶ Maximizing viewport ${index + 1}`);
    // Implement viewport maximization
};

window.closeViewport = function(index) {
    console.log(`× Closing viewport ${index + 1}`);
    // Implement viewport closing
};

// Initialize hanging protocols
window.hangingProtocols = new HangingProtocols();

// Auto-apply protocol when study loads
document.addEventListener('studyLoaded', (event) => {
    if (window.hangingProtocols && event.detail) {
        const bestProtocol = window.hangingProtocols.autoSelectProtocol(event.detail);
        window.hangingProtocols.applyProtocol(bestProtocol, event.detail);
    }
});

console.log('🖼️ Hanging Protocols System loaded');