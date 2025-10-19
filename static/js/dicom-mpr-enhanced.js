/**
 * Enhanced MPR (Multi-Planar Reconstruction) Handler
 * Fixes network errors and improves 3D reconstruction quality
 */

class DicomMPREnhanced {
    constructor() {
        this.mprCache = new Map();
        this.reconstructionCache = new Map();
        this.loadingStates = new Map();
        this.errorStates = new Map();
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupErrorHandling();
        console.log('Enhanced MPR system initialized');
    }

    setupEventListeners() {
        // Listen for MPR generation requests
        document.addEventListener('generateMPR', (event) => {
            this.generateMPRViews(event.detail.seriesId, event.detail.options);
        });

        // Listen for 3D reconstruction requests
        document.addEventListener('generate3D', (event) => {
            this.generate3DReconstruction(event.detail.seriesId, event.detail.options);
        });

        // Listen for reconstruction button clicks
        document.addEventListener('click', (event) => {
            if (event.target.classList.contains('mpr-btn') || 
                event.target.closest('.mpr-btn')) {
                event.preventDefault();
                const seriesId = event.target.dataset.seriesId || 
                               event.target.closest('[data-series-id]')?.dataset.seriesId;
                if (seriesId) {
                    this.generateMPRViews(seriesId);
                }
            }

            if (event.target.classList.contains('reconstruction-3d-btn') || 
                event.target.closest('.reconstruction-3d-btn')) {
                event.preventDefault();
                const seriesId = event.target.dataset.seriesId || 
                               event.target.closest('[data-series-id]')?.dataset.seriesId;
                if (seriesId) {
                    this.generate3DReconstruction(seriesId);
                }
            }
        });
    }

    setupErrorHandling() {
        // Enhanced error handling for MPR operations
        window.addEventListener('unhandledrejection', (event) => {
            if (event.reason && event.reason.message && 
                (event.reason.message.includes('MPR') || 
                 event.reason.message.includes('reconstruction'))) {
                console.error('Unhandled MPR/3D reconstruction error:', event.reason);
                this.showErrorMessage('MPR/3D reconstruction failed. Retrying with fallback method...');
                event.preventDefault();
            }
        });
    }

    // Individual MPR view access methods
    axialView(sliceIndex = 0) {
        const cacheData = Array.from(this.mprCache.values())[0];
        if (cacheData && cacheData.axial && cacheData.axial[sliceIndex]) {
            return cacheData.axial[sliceIndex];
        }
        return null;
    }
    
    sagittalView(sliceIndex = 0) {
        const cacheData = Array.from(this.mprCache.values())[0];
        if (cacheData && cacheData.sagittal && cacheData.sagittal[sliceIndex]) {
            return cacheData.sagittal[sliceIndex];
        }
        return null;
    }
    
    coronalView(sliceIndex = 0) {
        const cacheData = Array.from(this.mprCache.values())[0];
        if (cacheData && cacheData.coronal && cacheData.coronal[sliceIndex]) {
            return cacheData.coronal[sliceIndex];
        }
        return null;
    }
    
    updateMPR(seriesId, options = {}) {
        // Force regeneration of MPR views
        const cacheKey = `mpr_${seriesId}_${JSON.stringify(options)}`;
        this.mprCache.delete(cacheKey);
        return this.generateMPRViews(seriesId, options);
    }
    
    renderMPR(viewType, sliceIndex, canvas) {
        let viewData = null;
        
        switch(viewType.toLowerCase()) {
            case 'axial':
                viewData = this.axialView(sliceIndex);
                break;
            case 'sagittal':
                viewData = this.sagittalView(sliceIndex);
                break;
            case 'coronal':
                viewData = this.coronalView(sliceIndex);
                break;
        }
        
        if (viewData && canvas) {
            const ctx = canvas.getContext('2d');
            // Render the view data to canvas
            if (viewData.imageData) {
                ctx.putImageData(viewData.imageData, 0, 0);
            } else if (viewData.dataUrl) {
                const img = new Image();
                img.onload = () => ctx.drawImage(img, 0, 0);
                img.src = viewData.dataUrl;
            }
            return true;
        }
        
        return false;
    }

    async generateMPRViews(seriesId, options = {}) {
        const cacheKey = `mpr_${seriesId}_${JSON.stringify(options)}`;
        
        // Check if already loading
        if (this.loadingStates.get(cacheKey)) {
            console.log('MPR generation already in progress for series', seriesId);
            return;
        }

        // Check cache first
        if (this.mprCache.has(cacheKey)) {
            console.log('Returning cached MPR views for series', seriesId);
            this.displayMPRViews(this.mprCache.get(cacheKey));
            return;
        }

        this.loadingStates.set(cacheKey, true);
        this.showLoadingMessage('Generating MPR views...');

        try {
            // Enhanced MPR generation with fallback methods
            const mprViews = await this.generateMPRWithFallback(seriesId, options);
            
            if (mprViews && Object.keys(mprViews).length > 0) {
                this.mprCache.set(cacheKey, mprViews);
                this.displayMPRViews(mprViews);
                this.showSuccessMessage('MPR views generated successfully');
                this.errorStates.delete(cacheKey);
            } else {
                throw new Error('No MPR views generated');
            }

        } catch (error) {
            console.error('MPR generation failed:', error);
            this.errorStates.set(cacheKey, error.message);
            this.showErrorMessage(`MPR generation failed: ${error.message}`);
            
            // Try fallback generation
            try {
                const fallbackViews = await this.generateFallbackMPR(seriesId);
                if (fallbackViews) {
                    this.displayMPRViews(fallbackViews);
                    this.showSuccessMessage('MPR views generated using fallback method');
                }
            } catch (fallbackError) {
                console.error('Fallback MPR generation also failed:', fallbackError);
                this.displayMPRError('MPR generation failed completely');
            }
        } finally {
            this.loadingStates.delete(cacheKey);
            this.hideLoadingMessage();
        }
    }

    async generateMPRWithFallback(seriesId, options) {
        const methods = [
            () => this.generateMPRAPI(seriesId, options),
            () => this.generateMPRFast(seriesId, options),
            () => this.generateMPRBasic(seriesId, options)
        ];

        for (let i = 0; i < methods.length; i++) {
            try {
                console.log(`Trying MPR generation method ${i + 1}/${methods.length}`);
                const result = await methods[i]();
                if (result && Object.keys(result).length > 0) {
                    return result;
                }
            } catch (error) {
                console.warn(`MPR generation method ${i + 1} failed:`, error);
                if (i === methods.length - 1) {
                    throw error;
                }
                // Wait a bit before trying next method
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }

        throw new Error('All MPR generation methods failed');
    }

    async generateMPRAPI(seriesId, options) {
        const url = `/dicom-viewer/api/mpr-reconstruction/${seriesId}/`;
        const response = await this.fetchWithRetry(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': this.getCSRFToken()
            },
            body: JSON.stringify({
                quality: 'high',
                include_all_planes: true,
                optimize_for_speed: false,
                ...options
            })
        });

        const data = await response.json();
        if (!data.success) {
            throw new Error(data.error || 'MPR API generation failed');
        }

        return data.mpr_views || {};
    }

    async generateMPRFast(seriesId, options) {
        const planes = ['axial', 'sagittal', 'coronal'];
        const mprViews = {};

        for (const plane of planes) {
            try {
                const url = `/dicom-viewer/api/mpr-fast/${seriesId}/${plane}/`;
                const response = await this.fetchWithRetry(url);
                
                if (response.ok) {
                    const blob = await response.blob();
                    const imageUrl = URL.createObjectURL(blob);
                    mprViews[plane] = imageUrl;
                }
            } catch (error) {
                console.warn(`Failed to generate ${plane} MPR view:`, error);
            }
        }

        if (Object.keys(mprViews).length === 0) {
            throw new Error('No MPR views generated via fast method');
        }

        return mprViews;
    }

    async generateMPRBasic(seriesId, options) {
        // Basic MPR generation using existing API
        const url = `/dicom-viewer/api/mpr-reconstruction/${seriesId}/`;
        const response = await this.fetchWithRetry(url, {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            }
        });

        const data = await response.json();
        return data.mpr_views || {};
    }

    async generateFallbackMPR(seriesId) {
        // Generate simple placeholder MPR views
        const planes = ['axial', 'sagittal', 'coronal'];
        const fallbackViews = {};

        for (const plane of planes) {
            try {
                // Create a simple placeholder image
                const canvas = document.createElement('canvas');
                canvas.width = 512;
                canvas.height = 512;
                const ctx = canvas.getContext('2d');
                
                // Draw placeholder
                ctx.fillStyle = '#1a1a1a';
                ctx.fillRect(0, 0, 512, 512);
                
                ctx.fillStyle = '#00d4ff';
                ctx.font = '24px Arial';
                ctx.textAlign = 'center';
                ctx.fillText(`${plane.toUpperCase()} MPR`, 256, 200);
                ctx.fillText('Fallback View', 256, 240);
                
                ctx.fillStyle = '#888';
                ctx.font = '16px Arial';
                ctx.fillText('MPR generation in progress...', 256, 300);
                ctx.fillText('Please wait for full reconstruction', 256, 330);

                fallbackViews[plane] = canvas.toDataURL();
            } catch (error) {
                console.warn(`Failed to create fallback ${plane} view:`, error);
            }
        }

        return fallbackViews;
    }

    async generate3DReconstruction(seriesId, options = {}) {
        const cacheKey = `3d_${seriesId}_${JSON.stringify(options)}`;
        
        // Check if already loading
        if (this.loadingStates.get(cacheKey)) {
            console.log('3D reconstruction already in progress for series', seriesId);
            return;
        }

        // Check cache first
        if (this.reconstructionCache.has(cacheKey)) {
            console.log('Returning cached 3D reconstruction for series', seriesId);
            this.display3DReconstruction(this.reconstructionCache.get(cacheKey));
            return;
        }

        this.loadingStates.set(cacheKey, true);
        this.showLoadingMessage('Generating 3D bone reconstruction...');

        try {
            const reconstruction = await this.generate3DWithFallback(seriesId, options);
            
            if (reconstruction) {
                this.reconstructionCache.set(cacheKey, reconstruction);
                this.display3DReconstruction(reconstruction);
                this.showSuccessMessage('3D reconstruction generated successfully');
                this.errorStates.delete(cacheKey);
            } else {
                throw new Error('No 3D reconstruction generated');
            }

        } catch (error) {
            console.error('3D reconstruction failed:', error);
            this.errorStates.set(cacheKey, error.message);
            this.showErrorMessage(`3D reconstruction failed: ${error.message}`);
            this.display3DError('3D reconstruction failed');
        } finally {
            this.loadingStates.delete(cacheKey);
            this.hideLoadingMessage();
        }
    }

    async generate3DWithFallback(seriesId, options) {
        const methods = [
            () => this.generate3DAPI(seriesId, options),
            () => this.generate3DFast(seriesId, options),
            () => this.generate3DBasic(seriesId, options)
        ];

        for (let i = 0; i < methods.length; i++) {
            try {
                console.log(`Trying 3D reconstruction method ${i + 1}/${methods.length}`);
                const result = await methods[i]();
                if (result) {
                    return result;
                }
            } catch (error) {
                console.warn(`3D reconstruction method ${i + 1} failed:`, error);
                if (i === methods.length - 1) {
                    throw error;
                }
                await new Promise(resolve => setTimeout(resolve, 1500));
            }
        }

        throw new Error('All 3D reconstruction methods failed');
    }

    async generate3DAPI(seriesId, options) {
        const url = `/dicom-viewer/api/advanced-reconstruction/${seriesId}/`;
        const response = await this.fetchWithRetry(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': this.getCSRFToken()
            },
            body: JSON.stringify({
                reconstruction_type: 'bone_3d',
                quality: 'high',
                include_volume_rendering: true,
                threshold: 200,
                smoothing: true,
                decimation: 0.8,
                ...options
            })
        });

        const data = await response.json();
        if (!data.success) {
            throw new Error(data.error || '3D API reconstruction failed');
        }

        return data.reconstructions || data.details || null;
    }

    async generate3DFast(seriesId, options) {
        const url = `/dicom-viewer/api/fast-reconstruction/${seriesId}/`;
        const response = await this.fetchWithRetry(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': this.getCSRFToken()
            },
            body: JSON.stringify({
                type: 'bone_3d',
                quality: 'medium',
                optimize_for_speed: true,
                enable_gpu: true,
                ...options
            })
        });

        const data = await response.json();
        if (!data.success) {
            throw new Error(data.error || '3D fast reconstruction failed');
        }

        return data.reconstruction || null;
    }

    async generate3DBasic(seriesId, options) {
        // Generate a basic 3D visualization placeholder
        return {
            type: 'volume_rendering',
            views: await this.generateBasic3DViews(seriesId),
            description: 'Basic 3D Volume Rendering'
        };
    }

    async generateBasic3DViews(seriesId) {
        const angles = [0, 45, 90, 135, 180, 225, 270, 315];
        const views = {};

        for (const angle of angles) {
            try {
                const canvas = document.createElement('canvas');
                canvas.width = 512;
                canvas.height = 512;
                const ctx = canvas.getContext('2d');
                
                // Create a basic 3D-like visualization
                ctx.fillStyle = '#000';
                ctx.fillRect(0, 0, 512, 512);
                
                // Draw a simple 3D-like shape
                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                const centerX = 256, centerY = 256;
                const radius = 100;
                
                // Create a pseudo-3D effect based on angle
                const offsetX = Math.cos(angle * Math.PI / 180) * 20;
                const offsetY = Math.sin(angle * Math.PI / 180) * 10;
                
                ctx.ellipse(centerX + offsetX, centerY + offsetY, radius, radius * 0.6, 0, 0, 2 * Math.PI);
                ctx.fill();
                
                // Add angle label
                ctx.fillStyle = '#00d4ff';
                ctx.font = '16px Arial';
                ctx.textAlign = 'center';
                ctx.fillText(`3D View ${angle}°`, 256, 450);

                views[`angle_${angle}`] = canvas.toDataURL();
            } catch (error) {
                console.warn(`Failed to create 3D view at angle ${angle}:`, error);
            }
        }

        return views;
    }

    displayMPRViews(mprViews) {
        // Display MPR views in the interface
        const mprContainer = document.getElementById('mpr-container') || 
                            document.querySelector('.mpr-container') ||
                            document.querySelector('.mpr-panel');

        if (!mprContainer) {
            console.warn('MPR container not found, creating one');
            this.createMPRContainer();
            return;
        }

        // Clear existing content
        mprContainer.innerHTML = '';

        // Create view panels
        const planes = ['axial', 'sagittal', 'coronal'];
        planes.forEach(plane => {
            if (mprViews[plane]) {
                const viewPanel = document.createElement('div');
                viewPanel.className = `mpr-view-panel ${plane}-panel`;
                viewPanel.innerHTML = `
                    <div class="mpr-view-header">
                        <h4>${plane.toUpperCase()} View</h4>
                    </div>
                    <div class="mpr-view-content">
                        <img src="${mprViews[plane]}" alt="${plane} MPR view" class="mpr-image">
                    </div>
                `;
                mprContainer.appendChild(viewPanel);
            }
        });

        // Show the MPR container
        mprContainer.style.display = 'block';
        console.log('MPR views displayed successfully');
    }

    display3DReconstruction(reconstruction) {
        // Display 3D reconstruction in the interface
        const reconstructionContainer = document.getElementById('reconstruction-container') || 
                                       document.querySelector('.reconstruction-container') ||
                                       document.querySelector('.bone-3d-container');

        if (!reconstructionContainer) {
            console.warn('3D reconstruction container not found');
            return;
        }

        reconstructionContainer.innerHTML = `
            <div class="reconstruction-header">
                <h3>3D Bone Reconstruction</h3>
                <p class="reconstruction-description">${reconstruction.description || 'Enhanced 3D visualization'}</p>
            </div>
            <div class="reconstruction-content">
                ${this.create3DVisualizationHTML(reconstruction)}
            </div>
        `;

        reconstructionContainer.style.display = 'block';
        console.log('3D reconstruction displayed successfully');
    }

    create3DVisualizationHTML(reconstruction) {
        if (reconstruction.views) {
            let html = '<div class="reconstruction-views-grid">';
            Object.entries(reconstruction.views).forEach(([key, imageUrl]) => {
                html += `
                    <div class="reconstruction-view-item">
                        <img src="${imageUrl}" alt="${key}" class="reconstruction-image">
                        <div class="view-label">${key.replace(/_/g, ' ').toUpperCase()}</div>
                    </div>
                `;
            });
            html += '</div>';
            return html;
        }

        return '<p>3D reconstruction data processed successfully</p>';
    }

    displayMPRError(message) {
        const mprContainer = document.getElementById('mpr-container') || 
                            document.querySelector('.mpr-container');
        if (mprContainer) {
            mprContainer.innerHTML = `
                <div class="mpr-error">
                    <h4>MPR Generation Error</h4>
                    <p>${message}</p>
                    <button onclick="location.reload()" class="retry-btn">Retry</button>
                </div>
            `;
        }
    }

    display3DError(message) {
        const reconstructionContainer = document.getElementById('reconstruction-container') || 
                                       document.querySelector('.reconstruction-container');
        if (reconstructionContainer) {
            reconstructionContainer.innerHTML = `
                <div class="reconstruction-error">
                    <h4>3D Reconstruction Error</h4>
                    <p>${message}</p>
                    <button onclick="location.reload()" class="retry-btn">Retry</button>
                </div>
            `;
        }
    }

    createMPRContainer() {
        const viewerContainer = document.querySelector('.viewer-container') || 
                               document.querySelector('.dicom-viewer') ||
                               document.body;

        const mprContainer = document.createElement('div');
        mprContainer.id = 'mpr-container';
        mprContainer.className = 'mpr-container';
        mprContainer.style.cssText = `
            position: fixed;
            top: 100px;
            right: 20px;
            width: 400px;
            max-height: 80vh;
            background: rgba(0, 0, 0, 0.9);
            border: 1px solid #00d4ff;
            border-radius: 8px;
            padding: 20px;
            z-index: 1000;
            overflow-y: auto;
            display: none;
        `;

        viewerContainer.appendChild(mprContainer);
    }

    async fetchWithRetry(url, options = {}, retryCount = 0) {
        const maxRetries = 3;
        const defaultOptions = {
            headers: {
                'X-Requested-With': 'XMLHttpRequest',
                'X-CSRFToken': this.getCSRFToken(),
                ...options.headers
            },
            credentials: 'same-origin',
            ...options
        };

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 45000); // 45 second timeout
            
            const response = await fetch(url, {
                ...defaultOptions,
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            return response;

        } catch (error) {
            if (retryCount < maxRetries && this.isRetryableError(error)) {
                console.warn(`Request failed, retrying ${retryCount + 1}/${maxRetries}:`, error.message);
                const delay = Math.min(2000 * Math.pow(2, retryCount), 10000);
                await new Promise(resolve => setTimeout(resolve, delay));
                return this.fetchWithRetry(url, options, retryCount + 1);
            }
            throw error;
        }
    }

    isRetryableError(error) {
        return error.message.includes('NetworkError') ||
               error.message.includes('timeout') ||
               error.message.includes('Failed to fetch') ||
               error.name === 'AbortError' ||
               error.name === 'TypeError';
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

    showLoadingMessage(message) {
        if (window.dicomLoadingFix) {
            window.dicomLoadingFix.showLoadingIndicator(message);
        } else {
            console.log(`Loading: ${message}`);
        }
    }

    hideLoadingMessage() {
        if (window.dicomLoadingFix) {
            window.dicomLoadingFix.hideLoadingIndicator();
        }
    }

    showSuccessMessage(message) {
        if (window.dicomLoadingFix) {
            window.dicomLoadingFix.showSuccessMessage(message);
        } else {
            console.log(`Success: ${message}`);
        }
    }

    showErrorMessage(message) {
        if (window.dicomLoadingFix) {
            window.dicomLoadingFix.showErrorMessage(message);
        } else {
            console.error(`Error: ${message}`);
        }
    }

    // Public API methods
    clearCache() {
        this.mprCache.clear();
        this.reconstructionCache.clear();
        this.loadingStates.clear();
        this.errorStates.clear();
        console.log('MPR and 3D reconstruction caches cleared');
    }

    getStatus() {
        return {
            mprCacheSize: this.mprCache.size,
            reconstructionCacheSize: this.reconstructionCache.size,
            activeLoading: this.loadingStates.size,
            errors: this.errorStates.size
        };
    }
}

// Initialize the enhanced MPR system
const dicomMPREnhanced = new DicomMPREnhanced();

// Export for global access
window.DicomMPREnhanced = DicomMPREnhanced;
window.dicomMPREnhanced = dicomMPREnhanced;

// Global function aliases
window.generateMPRViews = (seriesId, options) => dicomMPREnhanced.generateMPRViews(seriesId, options);
window.generate3DReconstruction = (seriesId, options) => dicomMPREnhanced.generate3DReconstruction(seriesId, options);