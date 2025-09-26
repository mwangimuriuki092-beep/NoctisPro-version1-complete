/**
 * Medical Window/Level Presets System
 * Professional presets for different anatomies and modalities
 */

class WindowLevelPresets {
    constructor() {
        this.presets = this.getStandardPresets();
        this.currentPreset = null;
        this.customPresets = [];
        
        this.init();
    }
    
    init() {
        this.createPresetsUI();
        this.loadCustomPresets();
        console.log('🎚️ Window/Level Presets initialized');
    }
    
    getStandardPresets() {
        return {
            // CT Presets
            'ct_soft_tissue': { name: 'CT Soft Tissue', center: 40, width: 400, modality: 'CT' },
            'ct_lung': { name: 'CT Lung', center: -600, width: 1600, modality: 'CT' },
            'ct_bone': { name: 'CT Bone', center: 400, width: 1800, modality: 'CT' },
            'ct_brain': { name: 'CT Brain', center: 40, width: 80, modality: 'CT' },
            'ct_liver': { name: 'CT Liver', center: 60, width: 160, modality: 'CT' },
            'ct_mediastinum': { name: 'CT Mediastinum', center: 50, width: 350, modality: 'CT' },
            'ct_abdomen': { name: 'CT Abdomen', center: 60, width: 400, modality: 'CT' },
            'ct_spine': { name: 'CT Spine', center: 50, width: 250, modality: 'CT' },
            'ct_angio': { name: 'CT Angio', center: 300, width: 600, modality: 'CT' },
            
            // MRI Presets
            'mri_t1': { name: 'MRI T1', center: 500, width: 1000, modality: 'MR' },
            'mri_t2': { name: 'MRI T2', center: 1000, width: 2000, modality: 'MR' },
            'mri_flair': { name: 'MRI FLAIR', center: 800, width: 1600, modality: 'MR' },
            'mri_dwi': { name: 'MRI DWI', center: 500, width: 1000, modality: 'MR' },
            
            // X-ray Presets
            'xray_chest': { name: 'Chest X-ray', center: 2048, width: 4096, modality: 'CR' },
            'xray_bone': { name: 'Bone X-ray', center: 1500, width: 3000, modality: 'CR' },
            'xray_soft': { name: 'Soft Tissue X-ray', center: 1000, width: 2000, modality: 'CR' },
            
            // Mammography Presets
            'mammo_standard': { name: 'Mammography', center: 2000, width: 4000, modality: 'MG' },
            
            // Ultrasound Presets
            'us_standard': { name: 'Ultrasound', center: 128, width: 256, modality: 'US' },
            
            // Nuclear Medicine Presets
            'nm_standard': { name: 'Nuclear Medicine', center: 128, width: 256, modality: 'NM' },
            'pet_standard': { name: 'PET Scan', center: 1000, width: 2000, modality: 'PT' }
        };
    }
    
    createPresetsUI() {
        // Create presets dropdown
        const presetsHTML = `
            <div id="window-level-presets" class="presets-container" style="display: none;">
                <div class="presets-header">
                    <h4>Window/Level Presets</h4>
                    <button class="close-presets" onclick="closePresets()">×</button>
                </div>
                <div class="presets-grid" id="presets-grid">
                    <!-- Presets will be populated here -->
                </div>
                <div class="presets-custom">
                    <h5>Custom Preset</h5>
                    <div class="custom-controls">
                        <label>Center: <input type="number" id="custom-center" value="40"></label>
                        <label>Width: <input type="number" id="custom-width" value="400"></label>
                        <button onclick="applyCustomPreset()">Apply</button>
                        <button onclick="saveCustomPreset()">Save</button>
                    </div>
                </div>
            </div>
        `;
        
        const styleHTML = `
            <style>
                .presets-container {
                    position: fixed;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    background: #1a1a1a;
                    border: 1px solid #333;
                    border-radius: 8px;
                    padding: 20px;
                    z-index: 10000;
                    max-width: 600px;
                    max-height: 70vh;
                    overflow-y: auto;
                }
                
                .presets-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 15px;
                    color: #00d4ff;
                }
                
                .close-presets {
                    background: none;
                    border: none;
                    color: #fff;
                    font-size: 20px;
                    cursor: pointer;
                }
                
                .presets-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
                    gap: 10px;
                    margin-bottom: 20px;
                }
                
                .preset-btn {
                    padding: 8px 12px;
                    background: #333;
                    color: #fff;
                    border: 1px solid #555;
                    border-radius: 4px;
                    cursor: pointer;
                    text-align: center;
                    font-size: 12px;
                    transition: all 0.2s;
                }
                
                .preset-btn:hover {
                    background: #555;
                    border-color: #00d4ff;
                }
                
                .preset-btn.active {
                    background: #00d4ff;
                    color: #000;
                }
                
                .presets-custom {
                    border-top: 1px solid #333;
                    padding-top: 15px;
                }
                
                .presets-custom h5 {
                    margin: 0 0 10px 0;
                    color: #fff;
                }
                
                .custom-controls {
                    display: flex;
                    gap: 10px;
                    align-items: center;
                    flex-wrap: wrap;
                }
                
                .custom-controls label {
                    color: #ccc;
                    font-size: 12px;
                }
                
                .custom-controls input {
                    background: #333;
                    border: 1px solid #555;
                    color: #fff;
                    padding: 4px;
                    width: 80px;
                    margin-left: 5px;
                }
                
                .custom-controls button {
                    padding: 4px 8px;
                    background: #333;
                    color: #fff;
                    border: 1px solid #555;
                    border-radius: 3px;
                    cursor: pointer;
                    font-size: 11px;
                }
            </style>
        `;
        
        document.head.insertAdjacentHTML('beforeend', styleHTML);
        document.body.insertAdjacentHTML('beforeend', presetsHTML);
        
        this.populatePresets();
    }
    
    populatePresets() {
        const grid = document.getElementById('presets-grid');
        if (!grid) return;
        
        // Get current modality
        const currentModality = this.getCurrentModality();
        
        // Filter presets by modality
        const relevantPresets = Object.entries(this.presets).filter(([key, preset]) => 
            preset.modality === currentModality || preset.modality === 'ALL'
        );
        
        grid.innerHTML = relevantPresets.map(([key, preset]) => `
            <button class="preset-btn" data-preset="${key}" onclick="applyPreset('${key}')">
                ${preset.name}<br>
                <small>${preset.center}/${preset.width}</small>
            </button>
        `).join('');
        
        // Add custom presets
        this.customPresets.forEach((preset, index) => {
            grid.insertAdjacentHTML('beforeend', `
                <button class="preset-btn custom-preset" data-preset="custom_${index}" onclick="applyCustomPresetByIndex(${index})">
                    ${preset.name}<br>
                    <small>${preset.center}/${preset.width}</small>
                </button>
            `);
        });
    }
    
    showPresets() {
        this.populatePresets(); // Refresh for current modality
        document.getElementById('window-level-presets').style.display = 'block';
    }
    
    hidePresets() {
        document.getElementById('window-level-presets').style.display = 'none';
    }
    
    applyPreset(presetKey) {
        const preset = this.presets[presetKey];
        if (!preset) return;
        
        this.currentPreset = preset;
        
        // Apply to canvas
        if (window.dicomCanvasFix) {
            window.dicomCanvasFix.viewport = window.dicomCanvasFix.viewport || {};
            window.dicomCanvasFix.viewport.windowCenter = preset.center;
            window.dicomCanvasFix.viewport.windowWidth = preset.width;
            
            // Redisplay image with new window/level
            if (window.dicomCanvasFix.currentImage) {
                window.dicomCanvasFix.displayImage(window.dicomCanvasFix.currentImage);
            }
        }
        
        // Update UI
        document.querySelectorAll('.preset-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelector(`[data-preset="${presetKey}"]`)?.classList.add('active');
        
        console.log(`🎚️ Applied preset: ${preset.name} (${preset.center}/${preset.width})`);
        this.hidePresets();
    }
    
    applyCustomPreset() {
        const center = parseFloat(document.getElementById('custom-center').value);
        const width = parseFloat(document.getElementById('custom-width').value);
        
        if (isNaN(center) || isNaN(width)) return;
        
        // Apply to canvas
        if (window.dicomCanvasFix) {
            window.dicomCanvasFix.viewport = window.dicomCanvasFix.viewport || {};
            window.dicomCanvasFix.viewport.windowCenter = center;
            window.dicomCanvasFix.viewport.windowWidth = width;
            
            if (window.dicomCanvasFix.currentImage) {
                window.dicomCanvasFix.displayImage(window.dicomCanvasFix.currentImage);
            }
        }
        
        console.log(`🎚️ Applied custom preset: ${center}/${width}`);
    }
    
    saveCustomPreset() {
        const center = parseFloat(document.getElementById('custom-center').value);
        const width = parseFloat(document.getElementById('custom-width').value);
        const name = prompt('Enter preset name:');
        
        if (!name || isNaN(center) || isNaN(width)) return;
        
        const customPreset = {
            name,
            center,
            width,
            modality: this.getCurrentModality(),
            created: new Date().toISOString()
        };
        
        this.customPresets.push(customPreset);
        this.saveCustomPresetsToStorage();
        this.populatePresets();
        
        console.log(`💾 Custom preset saved: ${name}`);
    }
    
    loadCustomPresets() {
        try {
            const saved = localStorage.getItem('dicom_custom_presets');
            if (saved) {
                this.customPresets = JSON.parse(saved);
            }
        } catch (error) {
            console.warn('Failed to load custom presets:', error);
        }
    }
    
    saveCustomPresetsToStorage() {
        try {
            localStorage.setItem('dicom_custom_presets', JSON.stringify(this.customPresets));
        } catch (error) {
            console.warn('Failed to save custom presets:', error);
        }
    }
    
    getCurrentModality() {
        if (window.dicomCanvasFix && window.dicomCanvasFix.canvas) {
            return window.dicomCanvasFix.canvas.dataset.modality || 'CT';
        }
        return 'CT';
    }
    
    // Auto-detect best preset for current image
    autoSelectPreset() {
        const modality = this.getCurrentModality();
        
        // Default presets by modality
        const defaults = {
            'CT': 'ct_soft_tissue',
            'MR': 'mri_t1',
            'CR': 'xray_chest',
            'DX': 'xray_chest',
            'MG': 'mammo_standard',
            'US': 'us_standard',
            'NM': 'nm_standard',
            'PT': 'pet_standard'
        };
        
        const defaultPreset = defaults[modality] || 'ct_soft_tissue';
        this.applyPreset(defaultPreset);
    }
}

// Global functions
window.showWindowLevelPresets = function() {
    if (!window.windowLevelPresets) {
        window.windowLevelPresets = new WindowLevelPresets();
    }
    window.windowLevelPresets.showPresets();
};

window.closePresets = function() {
    if (window.windowLevelPresets) {
        window.windowLevelPresets.hidePresets();
    }
};

window.applyPreset = function(presetKey) {
    if (window.windowLevelPresets) {
        window.windowLevelPresets.applyPreset(presetKey);
    }
};

window.applyCustomPreset = function() {
    if (window.windowLevelPresets) {
        window.windowLevelPresets.applyCustomPreset();
    }
};

window.saveCustomPreset = function() {
    if (window.windowLevelPresets) {
        window.windowLevelPresets.saveCustomPreset();
    }
};

window.applyCustomPresetByIndex = function(index) {
    if (window.windowLevelPresets && window.windowLevelPresets.customPresets[index]) {
        const preset = window.windowLevelPresets.customPresets[index];
        window.windowLevelPresets.applyPreset(`custom_${index}`);
    }
};

// Initialize
window.windowLevelPresets = new WindowLevelPresets();

console.log('🎚️ Window/Level Presets System loaded');