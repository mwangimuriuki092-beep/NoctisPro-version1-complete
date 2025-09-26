/**
 * User Preferences System
 * Customizable display settings and workflow preferences
 */

class UserPreferences {
    constructor() {
        this.preferences = this.getDefaultPreferences();
        this.init();
    }
    
    init() {
        this.loadPreferences();
        this.createPreferencesDialog();
        this.applyPreferences();
        console.log('👤 User Preferences initialized');
    }
    
    getDefaultPreferences() {
        return {
            // Display preferences
            display: {
                defaultBrightness: 2.1,
                defaultContrast: 1.9,
                defaultSaturation: 0.9,
                defaultGamma: 0.9,
                autoFitImages: true,
                showImageInfo: true,
                showCrosshair: false,
                darkMode: true
            },
            
            // Interaction preferences
            interaction: {
                mouseWheelZoom: true,
                rightClickPan: true,
                doubleClickReset: true,
                touchGestures: true,
                keyboardShortcuts: true,
                invertScrollDirection: false
            },
            
            // Workflow preferences
            workflow: {
                autoLoadNextImage: false,
                autoRunAI: false,
                showMeasurements: true,
                showAnnotations: true,
                autoSaveMeasurements: true,
                confirmBeforeDelete: true
            },
            
            // Performance preferences
            performance: {
                enableImageCaching: true,
                maxCacheSize: 100,
                enableGPUAcceleration: true,
                enableMultiThreading: true,
                imageQuality: 'high'
            }
        };
    }
    
    createPreferencesDialog() {
        const dialogHTML = `
            <div id="preferences-dialog" class="modal-dialog" style="display: none;">
                <div class="modal-content large">
                    <div class="modal-header">
                        <h3>User Preferences</h3>
                        <button class="close-btn" onclick="closePreferencesDialog()">×</button>
                    </div>
                    <div class="modal-body">
                        <div class="preferences-tabs">
                            <button class="tab-btn active" onclick="showPreferencesTab('display')">Display</button>
                            <button class="tab-btn" onclick="showPreferencesTab('interaction')">Interaction</button>
                            <button class="tab-btn" onclick="showPreferencesTab('workflow')">Workflow</button>
                            <button class="tab-btn" onclick="showPreferencesTab('performance')">Performance</button>
                        </div>
                        
                        <div class="preferences-content">
                            <!-- Display preferences -->
                            <div id="display-prefs" class="prefs-tab active">
                                <h4>Display Settings</h4>
                                <div class="pref-group">
                                    <label>Default Brightness: <input type="range" id="pref-brightness" min="0.5" max="3" step="0.1" value="2.1"></label>
                                    <label>Default Contrast: <input type="range" id="pref-contrast" min="0.5" max="3" step="0.1" value="1.9"></label>
                                    <label>Default Saturation: <input type="range" id="pref-saturation" min="0" max="2" step="0.1" value="0.9"></label>
                                    <label>Default Gamma: <input type="range" id="pref-gamma" min="0.5" max="2" step="0.1" value="0.9"></label>
                                </div>
                                <div class="pref-group">
                                    <label><input type="checkbox" id="pref-auto-fit" checked> Auto-fit images to window</label>
                                    <label><input type="checkbox" id="pref-show-info" checked> Show image information</label>
                                    <label><input type="checkbox" id="pref-show-crosshair"> Show crosshair</label>
                                    <label><input type="checkbox" id="pref-dark-mode" checked> Dark mode interface</label>
                                </div>
                            </div>
                            
                            <!-- Interaction preferences -->
                            <div id="interaction-prefs" class="prefs-tab">
                                <h4>Interaction Settings</h4>
                                <div class="pref-group">
                                    <label><input type="checkbox" id="pref-wheel-zoom" checked> Mouse wheel zoom</label>
                                    <label><input type="checkbox" id="pref-right-pan" checked> Right-click pan</label>
                                    <label><input type="checkbox" id="pref-double-reset" checked> Double-click reset</label>
                                    <label><input type="checkbox" id="pref-touch-gestures" checked> Touch gestures</label>
                                    <label><input type="checkbox" id="pref-keyboard" checked> Keyboard shortcuts</label>
                                    <label><input type="checkbox" id="pref-invert-scroll"> Invert scroll direction</label>
                                </div>
                            </div>
                            
                            <!-- Workflow preferences -->
                            <div id="workflow-prefs" class="prefs-tab">
                                <h4>Workflow Settings</h4>
                                <div class="pref-group">
                                    <label><input type="checkbox" id="pref-auto-next"> Auto-load next image</label>
                                    <label><input type="checkbox" id="pref-auto-ai"> Auto-run AI analysis</label>
                                    <label><input type="checkbox" id="pref-show-measurements" checked> Show measurements</label>
                                    <label><input type="checkbox" id="pref-show-annotations" checked> Show annotations</label>
                                    <label><input type="checkbox" id="pref-auto-save" checked> Auto-save measurements</label>
                                    <label><input type="checkbox" id="pref-confirm-delete" checked> Confirm before delete</label>
                                </div>
                            </div>
                            
                            <!-- Performance preferences -->
                            <div id="performance-prefs" class="prefs-tab">
                                <h4>Performance Settings</h4>
                                <div class="pref-group">
                                    <label><input type="checkbox" id="pref-image-cache" checked> Enable image caching</label>
                                    <label>Max cache size: <input type="number" id="pref-cache-size" value="100" min="10" max="1000"> images</label>
                                    <label><input type="checkbox" id="pref-gpu-accel" checked> Enable GPU acceleration</label>
                                    <label><input type="checkbox" id="pref-multi-thread" checked> Enable multi-threading</label>
                                    <label>Image quality: 
                                        <select id="pref-image-quality">
                                            <option value="high" selected>High</option>
                                            <option value="medium">Medium</option>
                                            <option value="low">Low (faster)</option>
                                        </select>
                                    </label>
                                </div>
                            </div>
                        </div>
                        
                        <div class="preferences-actions">
                            <button class="btn btn-primary" onclick="savePreferences()">Save</button>
                            <button class="btn btn-secondary" onclick="resetPreferences()">Reset to Defaults</button>
                            <button class="btn btn-secondary" onclick="exportPreferences()">Export Settings</button>
                            <button class="btn btn-secondary" onclick="importPreferences()">Import Settings</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        const styleHTML = `
            <style>
                .modal-content.large {
                    max-width: 800px;
                    width: 90vw;
                }
                
                .preferences-tabs {
                    display: flex;
                    border-bottom: 1px solid #333;
                    margin-bottom: 20px;
                }
                
                .tab-btn {
                    padding: 10px 20px;
                    background: none;
                    border: none;
                    color: #ccc;
                    cursor: pointer;
                    border-bottom: 2px solid transparent;
                }
                
                .tab-btn.active {
                    color: #00d4ff;
                    border-bottom-color: #00d4ff;
                }
                
                .prefs-tab {
                    display: none;
                }
                
                .prefs-tab.active {
                    display: block;
                }
                
                .pref-group {
                    margin: 15px 0;
                    display: grid;
                    gap: 10px;
                }
                
                .pref-group label {
                    color: #ccc;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }
                
                .pref-group input[type="range"] {
                    flex: 1;
                    max-width: 200px;
                }
                
                .pref-group input[type="number"] {
                    width: 80px;
                    background: #333;
                    border: 1px solid #555;
                    color: #fff;
                    padding: 4px;
                }
                
                .pref-group select {
                    background: #333;
                    border: 1px solid #555;
                    color: #fff;
                    padding: 4px;
                }
                
                .preferences-actions {
                    display: flex;
                    gap: 10px;
                    justify-content: center;
                    margin-top: 20px;
                }
            </style>
        `;
        
        document.head.insertAdjacentHTML('beforeend', styleHTML);
        document.body.insertAdjacentHTML('beforeend', dialogHTML);
        
        this.populatePreferencesForm();
    }
    
    populatePreferencesForm() {
        // Populate form with current preferences
        document.getElementById('pref-brightness').value = this.preferences.display.defaultBrightness;
        document.getElementById('pref-contrast').value = this.preferences.display.defaultContrast;
        document.getElementById('pref-saturation').value = this.preferences.display.defaultSaturation;
        document.getElementById('pref-gamma').value = this.preferences.display.defaultGamma;
        
        document.getElementById('pref-auto-fit').checked = this.preferences.display.autoFitImages;
        document.getElementById('pref-show-info').checked = this.preferences.display.showImageInfo;
        document.getElementById('pref-show-crosshair').checked = this.preferences.display.showCrosshair;
        document.getElementById('pref-dark-mode').checked = this.preferences.display.darkMode;
        
        document.getElementById('pref-wheel-zoom').checked = this.preferences.interaction.mouseWheelZoom;
        document.getElementById('pref-right-pan').checked = this.preferences.interaction.rightClickPan;
        document.getElementById('pref-double-reset').checked = this.preferences.interaction.doubleClickReset;
        document.getElementById('pref-touch-gestures').checked = this.preferences.interaction.touchGestures;
        document.getElementById('pref-keyboard').checked = this.preferences.interaction.keyboardShortcuts;
        document.getElementById('pref-invert-scroll').checked = this.preferences.interaction.invertScrollDirection;
        
        document.getElementById('pref-auto-next').checked = this.preferences.workflow.autoLoadNextImage;
        document.getElementById('pref-auto-ai').checked = this.preferences.workflow.autoRunAI;
        document.getElementById('pref-show-measurements').checked = this.preferences.workflow.showMeasurements;
        document.getElementById('pref-show-annotations').checked = this.preferences.workflow.showAnnotations;
        document.getElementById('pref-auto-save').checked = this.preferences.workflow.autoSaveMeasurements;
        document.getElementById('pref-confirm-delete').checked = this.preferences.workflow.confirmBeforeDelete;
        
        document.getElementById('pref-image-cache').checked = this.preferences.performance.enableImageCaching;
        document.getElementById('pref-cache-size').value = this.preferences.performance.maxCacheSize;
        document.getElementById('pref-gpu-accel').checked = this.preferences.performance.enableGPUAcceleration;
        document.getElementById('pref-multi-thread').checked = this.preferences.performance.enableMultiThreading;
        document.getElementById('pref-image-quality').value = this.preferences.performance.imageQuality;
    }
    
    savePreferences() {
        // Collect preferences from form
        this.preferences.display.defaultBrightness = parseFloat(document.getElementById('pref-brightness').value);
        this.preferences.display.defaultContrast = parseFloat(document.getElementById('pref-contrast').value);
        this.preferences.display.defaultSaturation = parseFloat(document.getElementById('pref-saturation').value);
        this.preferences.display.defaultGamma = parseFloat(document.getElementById('pref-gamma').value);
        
        this.preferences.display.autoFitImages = document.getElementById('pref-auto-fit').checked;
        this.preferences.display.showImageInfo = document.getElementById('pref-show-info').checked;
        this.preferences.display.showCrosshair = document.getElementById('pref-show-crosshair').checked;
        this.preferences.display.darkMode = document.getElementById('pref-dark-mode').checked;
        
        this.preferences.interaction.mouseWheelZoom = document.getElementById('pref-wheel-zoom').checked;
        this.preferences.interaction.rightClickPan = document.getElementById('pref-right-pan').checked;
        this.preferences.interaction.doubleClickReset = document.getElementById('pref-double-reset').checked;
        this.preferences.interaction.touchGestures = document.getElementById('pref-touch-gestures').checked;
        this.preferences.interaction.keyboardShortcuts = document.getElementById('pref-keyboard').checked;
        this.preferences.interaction.invertScrollDirection = document.getElementById('pref-invert-scroll').checked;
        
        this.preferences.workflow.autoLoadNextImage = document.getElementById('pref-auto-next').checked;
        this.preferences.workflow.autoRunAI = document.getElementById('pref-auto-ai').checked;
        this.preferences.workflow.showMeasurements = document.getElementById('pref-show-measurements').checked;
        this.preferences.workflow.showAnnotations = document.getElementById('pref-show-annotations').checked;
        this.preferences.workflow.autoSaveMeasurements = document.getElementById('pref-auto-save').checked;
        this.preferences.workflow.confirmBeforeDelete = document.getElementById('pref-confirm-delete').checked;
        
        this.preferences.performance.enableImageCaching = document.getElementById('pref-image-cache').checked;
        this.preferences.performance.maxCacheSize = parseInt(document.getElementById('pref-cache-size').value);
        this.preferences.performance.enableGPUAcceleration = document.getElementById('pref-gpu-accel').checked;
        this.preferences.performance.enableMultiThreading = document.getElementById('pref-multi-thread').checked;
        this.preferences.performance.imageQuality = document.getElementById('pref-image-quality').value;
        
        // Save to localStorage
        this.saveToStorage();
        
        // Apply preferences
        this.applyPreferences();
        
        // Close dialog
        this.closePreferencesDialog();
        
        console.log('💾 Preferences saved');
    }
    
    applyPreferences() {
        // Apply display preferences
        this.applyDisplayPreferences();
        
        // Apply interaction preferences
        this.applyInteractionPreferences();
        
        // Apply workflow preferences
        this.applyWorkflowPreferences();
        
        // Apply performance preferences
        this.applyPerformancePreferences();
    }
    
    applyDisplayPreferences() {
        const display = this.preferences.display;
        
        // Update canvas filter defaults
        if (window.dicomCanvasFix) {
            window.dicomCanvasFix.defaultFilter = 
                `contrast(${display.defaultContrast}) brightness(${display.defaultBrightness}) saturate(${display.defaultSaturation}) gamma(${display.defaultGamma})`;
        }
        
        // Apply dark mode
        if (display.darkMode) {
            document.body.classList.add('dark-mode');
        } else {
            document.body.classList.remove('dark-mode');
        }
        
        // Show/hide image info
        const infoElements = document.querySelectorAll('.image-info, .dicom-info');
        infoElements.forEach(el => {
            el.style.display = display.showImageInfo ? 'block' : 'none';
        });
    }
    
    applyInteractionPreferences() {
        const interaction = this.preferences.interaction;
        
        // Configure canvas interactions
        if (window.dicomConnector) {
            window.dicomConnector.preferences = interaction;
        }
    }
    
    applyWorkflowPreferences() {
        const workflow = this.preferences.workflow;
        
        // Configure workflow settings
        if (window.advancedMeasurements) {
            window.advancedMeasurements.autoSave = workflow.autoSaveMeasurements;
        }
        
        if (window.aiConnector) {
            window.aiConnector.autoRun = workflow.autoRunAI;
        }
    }
    
    applyPerformancePreferences() {
        const performance = this.preferences.performance;
        
        // Configure performance settings
        if (window.dicomCanvasFix) {
            window.dicomCanvasFix.enableCaching = performance.enableImageCaching;
            window.dicomCanvasFix.maxCacheSize = performance.maxCacheSize;
        }
    }
    
    loadPreferences() {
        try {
            const saved = localStorage.getItem('dicom_user_preferences');
            if (saved) {
                const savedPrefs = JSON.parse(saved);
                this.preferences = { ...this.preferences, ...savedPrefs };
            }
        } catch (error) {
            console.warn('Failed to load preferences:', error);
        }
    }
    
    saveToStorage() {
        try {
            localStorage.setItem('dicom_user_preferences', JSON.stringify(this.preferences));
        } catch (error) {
            console.warn('Failed to save preferences:', error);
        }
    }
    
    resetPreferences() {
        this.preferences = this.getDefaultPreferences();
        this.populatePreferencesForm();
        this.applyPreferences();
        console.log('🔄 Preferences reset to defaults');
    }
    
    exportPreferences() {
        const data = {
            preferences: this.preferences,
            exported: new Date().toISOString(),
            version: '1.0'
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `dicom_preferences_${Date.now()}.json`;
        a.click();
        
        URL.revokeObjectURL(url);
        console.log('📤 Preferences exported');
    }
    
    importPreferences() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    if (data.preferences) {
                        this.preferences = { ...this.getDefaultPreferences(), ...data.preferences };
                        this.populatePreferencesForm();
                        this.applyPreferences();
                        this.saveToStorage();
                        console.log('📥 Preferences imported');
                    }
                } catch (error) {
                    console.error('Failed to import preferences:', error);
                }
            };
            reader.readAsText(file);
        };
        
        input.click();
    }
    
    showPreferencesDialog() {
        document.getElementById('preferences-dialog').style.display = 'flex';
    }
    
    closePreferencesDialog() {
        document.getElementById('preferences-dialog').style.display = 'none';
    }
}

// Global functions
window.showPreferencesDialog = function() {
    if (!window.userPreferences) {
        window.userPreferences = new UserPreferences();
    }
    window.userPreferences.showPreferencesDialog();
};

window.closePreferencesDialog = function() {
    if (window.userPreferences) {
        window.userPreferences.closePreferencesDialog();
    }
};

window.showPreferencesTab = function(tabName) {
    // Hide all tabs
    document.querySelectorAll('.prefs-tab').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    
    // Show selected tab
    document.getElementById(`${tabName}-prefs`).classList.add('active');
    event.target.classList.add('active');
};

window.savePreferences = function() {
    if (window.userPreferences) {
        window.userPreferences.savePreferences();
    }
};

window.resetPreferences = function() {
    if (window.userPreferences) {
        window.userPreferences.resetPreferences();
    }
};

window.exportPreferences = function() {
    if (window.userPreferences) {
        window.userPreferences.exportPreferences();
    }
};

window.importPreferences = function() {
    if (window.userPreferences) {
        window.userPreferences.importPreferences();
    }
};

// Initialize
window.userPreferences = new UserPreferences();

console.log('👤 User Preferences System loaded');