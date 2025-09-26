/**
 * MPR Frontend Connector
 * Connects the advanced MPR engine to the frontend display
 */

class MPRFrontendConnector {
    constructor() {
        this.currentSeriesId = null;
        this.mprData = {
            axial: null,
            sagittal: null,
            coronal: null
        };
        this.mprDialog = null;
        this.init();
    }
    
    init() {
        this.createMPRDialog();
        this.setupEventListeners();
        console.log('🧊 MPR Frontend Connector initialized');
    }
    
    createMPRDialog() {
        // Create MPR dialog HTML
        const dialogHTML = `
            <div id="mpr-dialog" class="modal-dialog" style="display: none;">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>Multi-Planar Reconstruction (MPR)</h3>
                        <button class="close-btn" onclick="closeMPRDialog()">×</button>
                    </div>
                    <div class="modal-body">
                        <div class="mpr-container">
                            <div class="mpr-view">
                                <h4>Axial</h4>
                                <canvas id="mpr-axial" width="256" height="256"></canvas>
                                <div class="mpr-controls">
                                    <input type="range" id="axial-slider" min="0" max="100" value="50">
                                    <span id="axial-info">Slice: 50/100</span>
                                </div>
                            </div>
                            <div class="mpr-view">
                                <h4>Sagittal</h4>
                                <canvas id="mpr-sagittal" width="256" height="256"></canvas>
                                <div class="mpr-controls">
                                    <input type="range" id="sagittal-slider" min="0" max="100" value="50">
                                    <span id="sagittal-info">Slice: 50/100</span>
                                </div>
                            </div>
                            <div class="mpr-view">
                                <h4>Coronal</h4>
                                <canvas id="mpr-coronal" width="256" height="256"></canvas>
                                <div class="mpr-controls">
                                    <input type="range" id="coronal-slider" min="0" max="100" value="50">
                                    <span id="coronal-info">Slice: 50/100</span>
                                </div>
                            </div>
                        </div>
                        <div class="mpr-actions">
                            <button class="btn btn-primary" onclick="exportMPR()">Export</button>
                            <button class="btn btn-secondary" onclick="resetMPR()">Reset</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Add CSS for MPR dialog
        const styleHTML = `
            <style>
                .modal-dialog {
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
                
                .modal-content {
                    background: #1a1a1a;
                    border-radius: 8px;
                    max-width: 90vw;
                    max-height: 90vh;
                    overflow: auto;
                    border: 1px solid #333;
                }
                
                .modal-header {
                    padding: 20px;
                    border-bottom: 1px solid #333;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                
                .modal-header h3 {
                    margin: 0;
                    color: #00d4ff;
                }
                
                .close-btn {
                    background: none;
                    border: none;
                    color: #fff;
                    font-size: 24px;
                    cursor: pointer;
                    padding: 0;
                    width: 30px;
                    height: 30px;
                }
                
                .modal-body {
                    padding: 20px;
                }
                
                .mpr-container {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 20px;
                    margin-bottom: 20px;
                }
                
                .mpr-view {
                    text-align: center;
                }
                
                .mpr-view h4 {
                    margin: 0 0 10px 0;
                    color: #fff;
                }
                
                .mpr-view canvas {
                    border: 1px solid #333;
                    background: #000;
                    width: 100%;
                    max-width: 256px;
                }
                
                .mpr-controls {
                    margin-top: 10px;
                    display: flex;
                    flex-direction: column;
                    gap: 5px;
                }
                
                .mpr-controls input[type="range"] {
                    width: 100%;
                }
                
                .mpr-controls span {
                    color: #ccc;
                    font-size: 12px;
                }
                
                .mpr-actions {
                    display: flex;
                    gap: 10px;
                    justify-content: center;
                }
                
                .btn {
                    padding: 8px 16px;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 14px;
                }
                
                .btn-primary {
                    background: #00d4ff;
                    color: #000;
                }
                
                .btn-secondary {
                    background: #333;
                    color: #fff;
                }
            </style>
        `;
        
        // Add to document
        document.head.insertAdjacentHTML('beforeend', styleHTML);
        document.body.insertAdjacentHTML('beforeend', dialogHTML);
        
        this.mprDialog = document.getElementById('mpr-dialog');
    }
    
    setupEventListeners() {
        // MPR slider events
        ['axial', 'sagittal', 'coronal'].forEach(plane => {
            const slider = document.getElementById(`${plane}-slider`);
            if (slider) {
                slider.addEventListener('input', (e) => {
                    this.updateMPRSlice(plane, parseInt(e.target.value));
                });
            }
        });
    }
    
    async showMPR(seriesId) {
        if (!seriesId && window.dicomConnector) {
            // Try to get current series ID from the connector or canvas
            const canvas = window.dicomConnector.getCanvas();
            if (canvas && canvas.currentSeries) {
                seriesId = canvas.currentSeries.id;
            } else {
                console.warn('No series ID available for MPR');
                return;
            }
        }
        
        this.currentSeriesId = seriesId;
        this.mprDialog.style.display = 'flex';
        
        console.log(`🧊 Loading MPR for series ${seriesId}...`);
        
        try {
            // Load MPR data from backend
            const response = await fetch(`/dicom-viewer/api/series/${seriesId}/mpr/`, {
                method: 'GET',
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                    'Accept': 'application/json',
                    'X-CSRFToken': this.getCSRFToken()
                },
                credentials: 'same-origin'
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const mprData = await response.json();
            this.displayMPRData(mprData);
            
        } catch (error) {
            console.error('Failed to load MPR data:', error);
            this.showMPRError(error.message);
        }
    }
    
    displayMPRData(data) {
        console.log('📊 Displaying MPR data:', data);
        
        // Update sliders with actual slice counts
        if (data.slice_counts) {
            ['axial', 'sagittal', 'coronal'].forEach(plane => {
                const slider = document.getElementById(`${plane}-slider`);
                const info = document.getElementById(`${plane}-info`);
                
                if (slider && data.slice_counts[plane]) {
                    slider.max = data.slice_counts[plane] - 1;
                    slider.value = Math.floor(data.slice_counts[plane] / 2);
                    
                    if (info) {
                        info.textContent = `Slice: ${slider.value}/${data.slice_counts[plane] - 1}`;
                    }
                }
            });
        }
        
        // Display initial slices
        if (data.preview_images) {
            ['axial', 'sagittal', 'coronal'].forEach(plane => {
                if (data.preview_images[plane]) {
                    this.displayMPRSlice(plane, data.preview_images[plane]);
                }
            });
        }
        
        this.mprData = data;
    }
    
    displayMPRSlice(plane, imageData) {
        const canvas = document.getElementById(`mpr-${plane}`);
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        
        if (typeof imageData === 'string' && imageData.startsWith('data:image/')) {
            // Base64 image data
            const img = new Image();
            img.onload = () => {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                
                // Apply medical imaging filters
                ctx.filter = 'contrast(1.9) brightness(2.2) saturate(0.9)';
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                ctx.filter = 'none';
            };
            img.src = imageData;
        } else {
            // Clear canvas if no valid image data
            ctx.fillStyle = '#000';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Show placeholder text
            ctx.fillStyle = '#666';
            ctx.font = '12px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('Loading...', canvas.width / 2, canvas.height / 2);
        }
    }
    
    async updateMPRSlice(plane, sliceIndex) {
        if (!this.currentSeriesId) return;
        
        const info = document.getElementById(`${plane}-info`);
        const slider = document.getElementById(`${plane}-slider`);
        
        if (info) {
            info.textContent = `Slice: ${sliceIndex}/${slider.max}`;
        }
        
        try {
            // Request specific slice from backend
            const response = await fetch(`/dicom-viewer/api/mpr-slice/${this.currentSeriesId}/${plane}/${sliceIndex}/`, {
                method: 'GET',
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                    'Accept': 'application/json',
                    'X-CSRFToken': this.getCSRFToken()
                },
                credentials: 'same-origin'
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.image) {
                    this.displayMPRSlice(plane, data.image);
                }
            }
        } catch (error) {
            console.warn(`Failed to load ${plane} slice ${sliceIndex}:`, error);
        }
    }
    
    showMPRError(message) {
        ['axial', 'sagittal', 'coronal'].forEach(plane => {
            const canvas = document.getElementById(`mpr-${plane}`);
            if (canvas) {
                const ctx = canvas.getContext('2d');
                ctx.fillStyle = '#000';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                
                ctx.fillStyle = '#ff4444';
                ctx.font = '12px Arial';
                ctx.textAlign = 'center';
                ctx.fillText('Error loading MPR', canvas.width / 2, canvas.height / 2);
            }
        });
    }
    
    getCSRFToken() {
        const metaToken = document.querySelector('meta[name="csrf-token"]');
        if (metaToken) return metaToken.getAttribute('content');
        
        const cookieToken = document.cookie.split(';')
            .find(row => row.startsWith('csrftoken='));
        if (cookieToken) return cookieToken.split('=')[1];
        
        const inputToken = document.querySelector('input[name="csrfmiddlewaretoken"]');
        if (inputToken) return inputToken.value;
        
        return '';
    }
}

// Global functions for the dialog
window.showMPRDialog = function(seriesId) {
    if (!window.mprConnector) {
        window.mprConnector = new MPRFrontendConnector();
    }
    window.mprConnector.showMPR(seriesId);
};

window.closeMPRDialog = function() {
    const dialog = document.getElementById('mpr-dialog');
    if (dialog) {
        dialog.style.display = 'none';
    }
};

window.exportMPR = function() {
    console.log('📤 Exporting MPR images...');
    // Implement MPR export functionality
};

window.resetMPR = function() {
    console.log('🔄 Resetting MPR views...');
    if (window.mprConnector && window.mprConnector.currentSeriesId) {
        window.mprConnector.showMPR(window.mprConnector.currentSeriesId);
    }
};

// Initialize MPR connector
window.mprConnector = new MPRFrontendConnector();

console.log('🧊 MPR Frontend Connector loaded');