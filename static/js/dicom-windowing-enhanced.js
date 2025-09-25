/**
 * Enhanced DICOM Windowing System
 * Advanced window/level presets and auto-windowing for medical imaging
 */

class EnhancedWindowingSystem {
    constructor() {
        this.currentWindowWidth = 400;
        this.currentWindowLevel = 40;
        this.imageStats = null;
        this.autoWindowingEnabled = true;
        this.customPresets = this.loadCustomPresets();
        this.init();
    }

    init() {
        this.createWindowingUI();
        this.setupEventListeners();
        console.log('Enhanced Windowing System initialized');
    }

    // Comprehensive medical window/level presets
    getWindowPresets() {
        return {
            // Basic presets
            'lung': { ww: 1500, wl: -600, description: 'Lung Window' },
            'bone': { ww: 2000, wl: 300, description: 'Bone Window' },
            'soft': { ww: 400, wl: 40, description: 'Soft Tissue' },
            'brain': { ww: 100, wl: 50, description: 'Brain Window' },
            
            // Advanced organ-specific presets
            'liver': { ww: 150, wl: 60, description: 'Liver Window' },
            'kidney': { ww: 350, wl: 50, description: 'Kidney Window' },
            'heart': { ww: 350, wl: 40, description: 'Cardiac Window' },
            'spine': { ww: 400, wl: 50, description: 'Spine Window' },
            'pelvis': { ww: 400, wl: 40, description: 'Pelvis Window' },
            'chest': { ww: 350, wl: 40, description: 'Chest Window' },
            
            // Specialized presets
            'mediastinum': { ww: 350, wl: 50, description: 'Mediastinum' },
            'abdomen': { ww: 350, wl: 40, description: 'Abdomen Window' },
            'angio': { ww: 600, wl: 100, description: 'Angiography' },
            'pe': { ww: 700, wl: 100, description: 'Pulmonary Embolism' },
            'stroke': { ww: 40, wl: 40, description: 'Stroke Window' },
            
            // Contrast-enhanced presets
            'contrast_soft': { ww: 300, wl: 60, description: 'Contrast Soft Tissue' },
            'contrast_liver': { ww: 200, wl: 80, description: 'Contrast Liver' },
            'contrast_kidney': { ww: 300, wl: 80, description: 'Contrast Kidney' },
            
            // Pediatric presets
            'pediatric_chest': { ww: 300, wl: 30, description: 'Pediatric Chest' },
            'pediatric_abdomen': { ww: 300, wl: 30, description: 'Pediatric Abdomen' },
            'pediatric_brain': { ww: 80, wl: 40, description: 'Pediatric Brain' },
            
            // Emergency presets
            'trauma': { ww: 400, wl: 40, description: 'Trauma Window' },
            'emergency_chest': { ww: 350, wl: 40, description: 'Emergency Chest' },
            'emergency_brain': { ww: 80, wl: 40, description: 'Emergency Brain' },
            
            // Full range
            'full': { ww: 2000, wl: 0, description: 'Full Range' }
        };
    }

    setupEventListeners() {
        // Listen for image load events to calculate auto-windowing
        document.addEventListener('imageLoaded', (e) => {
            if (e.detail && e.detail.imageData) {
                this.calculateImageStatistics(e.detail.imageData);
                if (this.autoWindowingEnabled) {
                    this.applyAutoWindowing();
                }
            }
        });

        // Listen for modality changes
        document.addEventListener('modalityChanged', (e) => {
            if (e.detail && e.detail.modality) {
                this.applyModalitySpecificWindowing(e.detail.modality);
            }
        });
    }

    createWindowingUI() {
        // Enhanced preset grid
        const presetContainer = document.querySelector('.preset-grid');
        if (presetContainer) {
            this.updatePresetGrid(presetContainer);
        }

        // Add auto-windowing controls
        this.addAutoWindowingControls();
        
        // Add histogram display
        this.addHistogramDisplay();
        
        // Add custom preset management
        this.addCustomPresetControls();
    }

    updatePresetGrid(container) {
        const presets = this.getWindowPresets();
        const categories = {
            'Basic': ['lung', 'bone', 'soft', 'brain'],
            'Organs': ['liver', 'kidney', 'heart', 'spine', 'chest'],
            'Specialized': ['mediastinum', 'abdomen', 'angio', 'pe', 'stroke'],
            'Contrast': ['contrast_soft', 'contrast_liver', 'contrast_kidney'],
            'Emergency': ['trauma', 'emergency_chest', 'emergency_brain']
        };

        container.innerHTML = '';

        // Add auto-windowing button
        const autoBtn = document.createElement('button');
        autoBtn.className = 'preset-btn auto-window';
        autoBtn.innerHTML = '<i class="fas fa-magic"></i> Auto';
        autoBtn.title = 'Auto Window/Level';
        autoBtn.onclick = () => this.applyAutoWindowing();
        container.appendChild(autoBtn);

        // Add category tabs
        const tabContainer = document.createElement('div');
        tabContainer.className = 'preset-tabs';
        
        Object.keys(categories).forEach((category, index) => {
            const tab = document.createElement('button');
            tab.className = `preset-tab ${index === 0 ? 'active' : ''}`;
            tab.textContent = category;
            tab.onclick = () => this.showPresetCategory(category, categories);
            tabContainer.appendChild(tab);
        });
        
        container.appendChild(tabContainer);

        // Add preset buttons for first category
        const presetButtonsContainer = document.createElement('div');
        presetButtonsContainer.className = 'preset-buttons';
        container.appendChild(presetButtonsContainer);
        
        this.showPresetCategory('Basic', categories);
    }

    showPresetCategory(category, categories) {
        const container = document.querySelector('.preset-buttons');
        const presets = this.getWindowPresets();
        
        if (!container) return;
        
        // Update active tab
        document.querySelectorAll('.preset-tab').forEach(tab => {
            tab.classList.toggle('active', tab.textContent === category);
        });
        
        // Clear and populate preset buttons
        container.innerHTML = '';
        
        categories[category].forEach(presetKey => {
            const preset = presets[presetKey];
            if (preset) {
                const btn = document.createElement('button');
                btn.className = 'preset-btn';
                btn.innerHTML = `
                    <div class="preset-name">${presetKey.replace('_', ' ').toUpperCase()}</div>
                    <div class="preset-values">W:${preset.ww} L:${preset.wl}</div>
                `;
                btn.title = preset.description;
                btn.onclick = () => this.applyPreset(presetKey);
                container.appendChild(btn);
            }
        });
    }

    addAutoWindowingControls() {
        const controlsPanel = document.querySelector('.right-panel');
        if (!controlsPanel) return;

        const autoWindowingSection = document.createElement('div');
        autoWindowingSection.className = 'panel auto-windowing-panel';
        autoWindowingSection.innerHTML = `
            <h3><i class="fas fa-magic"></i> Auto Windowing</h3>
            <div class="auto-windowing-controls">
                <label class="checkbox-label">
                    <input type="checkbox" id="autoWindowingEnabled" ${this.autoWindowingEnabled ? 'checked' : ''}>
                    <span>Enable Auto Windowing</span>
                </label>
                <div class="auto-windowing-methods">
                    <label class="radio-label">
                        <input type="radio" name="autoMethod" value="percentile" checked>
                        <span>Percentile (2%-98%)</span>
                    </label>
                    <label class="radio-label">
                        <input type="radio" name="autoMethod" value="histogram">
                        <span>Histogram Peak</span>
                    </label>
                    <label class="radio-label">
                        <input type="radio" name="autoMethod" value="otsu">
                        <span>Otsu Method</span>
                    </label>
                </div>
                <button class="btn btn-primary" onclick="enhancedWindowing.applyAutoWindowing()">
                    <i class="fas fa-magic"></i> Apply Auto Window
                </button>
            </div>
        `;

        // Insert after window/level controls
        const windowControls = controlsPanel.querySelector('.control');
        if (windowControls && windowControls.parentNode) {
            windowControls.parentNode.insertBefore(autoWindowingSection, windowControls.nextSibling);
        }

        // Setup event listeners
        document.getElementById('autoWindowingEnabled').addEventListener('change', (e) => {
            this.autoWindowingEnabled = e.target.checked;
        });
    }

    addHistogramDisplay() {
        const controlsPanel = document.querySelector('.right-panel');
        if (!controlsPanel) return;

        const histogramSection = document.createElement('div');
        histogramSection.className = 'panel histogram-panel';
        histogramSection.innerHTML = `
            <h3><i class="fas fa-chart-bar"></i> Image Histogram</h3>
            <div class="histogram-container">
                <canvas id="histogramCanvas" width="280" height="150"></canvas>
                <div class="histogram-stats" id="histogramStats">
                    <div>Min: <span id="minValue">-</span></div>
                    <div>Max: <span id="maxValue">-</span></div>
                    <div>Mean: <span id="meanValue">-</span></div>
                    <div>Std: <span id="stdValue">-</span></div>
                </div>
            </div>
        `;

        controlsPanel.appendChild(histogramSection);
    }

    addCustomPresetControls() {
        const presetContainer = document.querySelector('.preset-grid');
        if (!presetContainer) return;

        const customSection = document.createElement('div');
        customSection.className = 'custom-presets-section';
        customSection.innerHTML = `
            <div class="custom-preset-controls">
                <button class="btn btn-sm" onclick="enhancedWindowing.saveCustomPreset()">
                    <i class="fas fa-save"></i> Save Preset
                </button>
                <button class="btn btn-sm" onclick="enhancedWindowing.manageCustomPresets()">
                    <i class="fas fa-cog"></i> Manage
                </button>
            </div>
            <div class="custom-presets" id="customPresets"></div>
        `;

        presetContainer.appendChild(customSection);
        this.updateCustomPresets();
    }

    // Auto-windowing algorithms
    calculateImageStatistics(imageData) {
        if (!imageData || !imageData.data) return;

        const pixels = [];
        const data = imageData.data;
        
        // Convert RGBA to grayscale and collect pixel values
        for (let i = 0; i < data.length; i += 4) {
            const gray = (data[i] + data[i + 1] + data[i + 2]) / 3;
            pixels.push(gray);
        }

        // Calculate statistics
        pixels.sort((a, b) => a - b);
        
        const min = pixels[0];
        const max = pixels[pixels.length - 1];
        const mean = pixels.reduce((sum, val) => sum + val, 0) / pixels.length;
        const variance = pixels.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / pixels.length;
        const std = Math.sqrt(variance);

        // Calculate percentiles
        const p2 = pixels[Math.floor(pixels.length * 0.02)];
        const p98 = pixels[Math.floor(pixels.length * 0.98)];
        const p5 = pixels[Math.floor(pixels.length * 0.05)];
        const p95 = pixels[Math.floor(pixels.length * 0.95)];

        this.imageStats = {
            min, max, mean, std,
            percentiles: { p2, p5, p95, p98 },
            histogram: this.calculateHistogram(pixels)
        };

        this.updateHistogramDisplay();
    }

    calculateHistogram(pixels, bins = 256) {
        const min = Math.min(...pixels);
        const max = Math.max(...pixels);
        const binSize = (max - min) / bins;
        const histogram = new Array(bins).fill(0);

        pixels.forEach(pixel => {
            const bin = Math.min(Math.floor((pixel - min) / binSize), bins - 1);
            histogram[bin]++;
        });

        return { bins: histogram, min, max, binSize };
    }

    updateHistogramDisplay() {
        if (!this.imageStats) return;

        const canvas = document.getElementById('histogramCanvas');
        const statsDiv = document.getElementById('histogramStats');
        
        if (canvas) {
            this.drawHistogram(canvas, this.imageStats.histogram);
        }

        if (statsDiv) {
            document.getElementById('minValue').textContent = Math.round(this.imageStats.min);
            document.getElementById('maxValue').textContent = Math.round(this.imageStats.max);
            document.getElementById('meanValue').textContent = Math.round(this.imageStats.mean);
            document.getElementById('stdValue').textContent = Math.round(this.imageStats.std);
        }
    }

    drawHistogram(canvas, histogram) {
        const ctx = canvas.getContext('2d');
        const { bins, min, max } = histogram;
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        const maxCount = Math.max(...bins);
        const barWidth = canvas.width / bins.length;
        
        // Draw histogram bars
        ctx.fillStyle = '#00d4ff';
        bins.forEach((count, i) => {
            const barHeight = (count / maxCount) * (canvas.height - 20);
            ctx.fillRect(i * barWidth, canvas.height - barHeight, barWidth - 1, barHeight);
        });

        // Draw current window/level indicators
        ctx.strokeStyle = '#ff4444';
        ctx.lineWidth = 2;
        
        const windowMin = this.currentWindowLevel - this.currentWindowWidth / 2;
        const windowMax = this.currentWindowLevel + this.currentWindowWidth / 2;
        
        const minPos = ((windowMin - min) / (max - min)) * canvas.width;
        const maxPos = ((windowMax - min) / (max - min)) * canvas.width;
        
        ctx.beginPath();
        ctx.moveTo(minPos, 0);
        ctx.lineTo(minPos, canvas.height);
        ctx.moveTo(maxPos, 0);
        ctx.lineTo(maxPos, canvas.height);
        ctx.stroke();
    }

    // Auto-windowing methods
    applyAutoWindowing(method = null) {
        if (!this.imageStats) {
            if (window.showToast) {
                window.showToast('No image statistics available', 'warning');
            }
            return;
        }

        if (!method) {
            const checkedMethod = document.querySelector('input[name="autoMethod"]:checked');
            method = checkedMethod ? checkedMethod.value : 'percentile';
        }

        let windowWidth, windowLevel;

        switch (method) {
            case 'percentile':
                windowWidth = this.imageStats.percentiles.p98 - this.imageStats.percentiles.p2;
                windowLevel = (this.imageStats.percentiles.p98 + this.imageStats.percentiles.p2) / 2;
                break;
                
            case 'histogram':
                windowWidth = this.imageStats.percentiles.p95 - this.imageStats.percentiles.p5;
                windowLevel = this.imageStats.mean;
                break;
                
            case 'otsu':
                const threshold = this.calculateOtsuThreshold();
                windowWidth = this.imageStats.std * 4;
                windowLevel = threshold;
                break;
                
            default:
                windowWidth = this.imageStats.std * 6;
                windowLevel = this.imageStats.mean;
        }

        this.applyWindowing(windowWidth, windowLevel);
        
        if (window.showToast) {
            window.showToast(`Auto windowing applied (${method})`, 'success');
        }
    }

    calculateOtsuThreshold() {
        if (!this.imageStats || !this.imageStats.histogram) return this.imageStats.mean;

        const { bins } = this.imageStats.histogram;
        const total = bins.reduce((sum, count) => sum + count, 0);
        
        let sum = 0;
        bins.forEach((count, i) => {
            sum += i * count;
        });

        let sumB = 0;
        let wB = 0;
        let maximum = 0;
        let threshold = 0;

        for (let i = 0; i < bins.length; i++) {
            wB += bins[i];
            if (wB === 0) continue;

            const wF = total - wB;
            if (wF === 0) break;

            sumB += i * bins[i];
            const mB = sumB / wB;
            const mF = (sum - sumB) / wF;

            const between = wB * wF * Math.pow(mB - mF, 2);

            if (between > maximum) {
                maximum = between;
                threshold = i;
            }
        }

        return threshold;
    }

    // Modality-specific windowing
    applyModalitySpecificWindowing(modality) {
        const modalityPresets = {
            'CT': 'soft',
            'MR': 'brain',
            'MRI': 'brain',
            'DX': 'bone',
            'CR': 'bone',
            'DR': 'bone',
            'XA': 'angio',
            'RF': 'angio',
            'US': 'soft',
            'NM': 'full',
            'PT': 'full'
        };

        const preset = modalityPresets[modality.toUpperCase()];
        if (preset) {
            this.applyPreset(preset);
            if (window.showToast) {
                window.showToast(`Applied ${modality} windowing`, 'info');
            }
        }
    }

    // Windowing application
    applyPreset(presetName) {
        const presets = { ...this.getWindowPresets(), ...this.customPresets };
        const preset = presets[presetName];
        
        if (preset) {
            this.applyWindowing(preset.ww, preset.wl);
            if (window.showToast) {
                window.showToast(`Applied ${preset.description || presetName} preset`, 'success');
            }
        }
    }

    applyWindowing(windowWidth, windowLevel) {
        this.currentWindowWidth = windowWidth;
        this.currentWindowLevel = windowLevel;

        // Update UI controls
        const wwSlider = document.getElementById('windowWidth');
        const wlSlider = document.getElementById('windowLevel');
        const wwValue = document.getElementById('wwValue');
        const wlValue = document.getElementById('wlValue');

        if (wwSlider) wwSlider.value = windowWidth;
        if (wlSlider) wlSlider.value = windowLevel;
        if (wwValue) wwValue.textContent = Math.round(windowWidth);
        if (wlValue) wlValue.textContent = Math.round(windowLevel);

        // Update global variables
        if (typeof window.windowWidth !== 'undefined') {
            window.windowWidth = windowWidth;
            window.windowLevel = windowLevel;
        }

        // Apply to image display
        if (typeof window.updateImageDisplay === 'function') {
            window.updateImageDisplay();
        } else if (typeof window.redrawCurrentImage === 'function') {
            window.redrawCurrentImage();
        }

        // Update histogram display
        this.updateHistogramDisplay();
    }

    // Custom preset management
    saveCustomPreset() {
        const name = prompt('Enter preset name:');
        if (!name) return;

        const preset = {
            ww: this.currentWindowWidth,
            wl: this.currentWindowLevel,
            description: `Custom: ${name}`,
            created: new Date().toISOString()
        };

        this.customPresets[name] = preset;
        this.saveCustomPresets();
        this.updateCustomPresets();

        if (window.showToast) {
            window.showToast(`Custom preset "${name}" saved`, 'success');
        }
    }

    manageCustomPresets() {
        // Create modal for managing custom presets
        const modal = document.createElement('div');
        modal.className = 'modal custom-presets-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Manage Custom Presets</h3>
                    <button class="modal-close" onclick="this.closest('.modal').remove()">×</button>
                </div>
                <div class="modal-body">
                    <div class="custom-presets-list" id="customPresetsList"></div>
                </div>
                <div class="modal-footer">
                    <button class="btn" onclick="this.closest('.modal').remove()">Close</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        this.updateCustomPresetsList();
    }

    updateCustomPresetsList() {
        const list = document.getElementById('customPresetsList');
        if (!list) return;

        list.innerHTML = '';

        Object.keys(this.customPresets).forEach(name => {
            const preset = this.customPresets[name];
            const item = document.createElement('div');
            item.className = 'custom-preset-item';
            item.innerHTML = `
                <div class="preset-info">
                    <div class="preset-name">${name}</div>
                    <div class="preset-values">W: ${preset.ww}, L: ${preset.wl}</div>
                </div>
                <div class="preset-actions">
                    <button class="btn btn-sm" onclick="enhancedWindowing.applyPreset('${name}')">Apply</button>
                    <button class="btn btn-sm btn-danger" onclick="enhancedWindowing.deleteCustomPreset('${name}')">Delete</button>
                </div>
            `;
            list.appendChild(item);
        });
    }

    deleteCustomPreset(name) {
        if (confirm(`Delete preset "${name}"?`)) {
            delete this.customPresets[name];
            this.saveCustomPresets();
            this.updateCustomPresets();
            this.updateCustomPresetsList();
        }
    }

    updateCustomPresets() {
        const container = document.getElementById('customPresets');
        if (!container) return;

        container.innerHTML = '';

        Object.keys(this.customPresets).forEach(name => {
            const preset = this.customPresets[name];
            const btn = document.createElement('button');
            btn.className = 'preset-btn custom-preset';
            btn.innerHTML = `
                <div class="preset-name">${name}</div>
                <div class="preset-values">W:${preset.ww} L:${preset.wl}</div>
            `;
            btn.onclick = () => this.applyPreset(name);
            container.appendChild(btn);
        });
    }

    // Storage methods
    saveCustomPresets() {
        try {
            localStorage.setItem('dicom_custom_presets', JSON.stringify(this.customPresets));
        } catch (error) {
            console.error('Failed to save custom presets:', error);
        }
    }

    loadCustomPresets() {
        try {
            const saved = localStorage.getItem('dicom_custom_presets');
            return saved ? JSON.parse(saved) : {};
        } catch (error) {
            console.error('Failed to load custom presets:', error);
            return {};
        }
    }

    // Export/Import presets
    exportPresets() {
        const data = {
            customPresets: this.customPresets,
            exportDate: new Date().toISOString(),
            version: '1.0'
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `dicom_presets_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    importPresets(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                if (data.customPresets) {
                    Object.assign(this.customPresets, data.customPresets);
                    this.saveCustomPresets();
                    this.updateCustomPresets();
                    if (window.showToast) {
                        window.showToast('Presets imported successfully', 'success');
                    }
                }
            } catch (error) {
                if (window.showToast) {
                    window.showToast('Failed to import presets', 'error');
                }
            }
        };
        reader.readAsText(file);
    }
}

// Initialize enhanced windowing system
const enhancedWindowing = new EnhancedWindowingSystem();

// Export for global access
window.enhancedWindowing = enhancedWindowing;
window.EnhancedWindowingSystem = EnhancedWindowingSystem;

console.log('Enhanced DICOM Windowing System loaded successfully');