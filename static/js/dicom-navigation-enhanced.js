/**
 * Enhanced DICOM Navigation System
 * Advanced navigation with thumbnail navigator and series management
 */

class EnhancedNavigationSystem {
    constructor() {
        this.thumbnailCache = new Map();
        this.seriesCache = new Map();
        this.currentStudy = null;
        this.currentSeries = null;
        this.currentImageIndex = 0;
        this.thumbnailSize = 120;
        this.preloadDistance = 5; // Number of images to preload ahead/behind
        this.init();
    }

    init() {
        this.createNavigationUI();
        this.setupEventListeners();
        this.createThumbnailNavigator();
        console.log('Enhanced Navigation System initialized');
    }

    createNavigationUI() {
        this.createStudyNavigator();
        this.createSeriesNavigator();
        this.createImageNavigator();
    }

    createStudyNavigator() {
        const rightPanel = document.querySelector('.right-panel');
        if (!rightPanel) return;

        const studyPanel = document.createElement('div');
        studyPanel.className = 'panel study-navigator-panel';
        studyPanel.innerHTML = `
            <h3><i class="fas fa-folder-open"></i> Study Navigator</h3>
            
            <div class="study-controls">
                <div class="study-selector">
                    <select id="studySelector" class="select-control">
                        <option value="">Select Study...</option>
                    </select>
                    <button class="btn btn-sm" onclick="enhancedNavigation.refreshStudies()">
                        <i class="fas fa-sync-alt"></i>
                    </button>
                </div>
                
                <div class="study-info" id="studyInfo">
                    <div class="info-row">
                        <span class="label">Patient:</span>
                        <span class="value" id="patientName">-</span>
                    </div>
                    <div class="info-row">
                        <span class="label">Study Date:</span>
                        <span class="value" id="studyDate">-</span>
                    </div>
                    <div class="info-row">
                        <span class="label">Modality:</span>
                        <span class="value" id="studyModality">-</span>
                    </div>
                    <div class="info-row">
                        <span class="label">Series:</span>
                        <span class="value" id="seriesCount">-</span>
                    </div>
                </div>
            </div>
        `;

        // Insert at the beginning of the right panel
        rightPanel.insertBefore(studyPanel, rightPanel.firstChild);
    }

    createSeriesNavigator() {
        const rightPanel = document.querySelector('.right-panel');
        if (!rightPanel) return;

        const seriesPanel = document.createElement('div');
        seriesPanel.className = 'panel series-navigator-panel';
        seriesPanel.innerHTML = `
            <h3><i class="fas fa-images"></i> Series Navigator</h3>
            
            <div class="series-controls">
                <div class="series-navigation">
                    <button class="btn btn-sm" onclick="enhancedNavigation.previousSeries()" id="prevSeriesBtn">
                        <i class="fas fa-chevron-left"></i> Prev
                    </button>
                    <span class="series-indicator" id="seriesIndicator">1 / 1</span>
                    <button class="btn btn-sm" onclick="enhancedNavigation.nextSeries()" id="nextSeriesBtn">
                        Next <i class="fas fa-chevron-right"></i>
                    </button>
                </div>
                
                <div class="series-info" id="seriesInfo">
                    <div class="info-row">
                        <span class="label">Description:</span>
                        <span class="value" id="seriesDescription">-</span>
                    </div>
                    <div class="info-row">
                        <span class="label">Images:</span>
                        <span class="value" id="imageCount">-</span>
                    </div>
                    <div class="info-row">
                        <span class="label">Thickness:</span>
                        <span class="value" id="sliceThickness">-</span>
                    </div>
                </div>
            </div>
            
            <div class="series-list" id="seriesList">
                <!-- Series thumbnails will be populated here -->
            </div>
        `;

        // Find study navigator and insert after it
        const studyPanel = document.querySelector('.study-navigator-panel');
        if (studyPanel && studyPanel.nextSibling) {
            rightPanel.insertBefore(seriesPanel, studyPanel.nextSibling);
        } else {
            rightPanel.appendChild(seriesPanel);
        }
    }

    createImageNavigator() {
        const rightPanel = document.querySelector('.right-panel');
        if (!rightPanel) return;

        const imagePanel = document.createElement('div');
        imagePanel.className = 'panel image-navigator-panel';
        imagePanel.innerHTML = `
            <h3><i class="fas fa-image"></i> Image Navigator</h3>
            
            <div class="image-controls">
                <div class="image-navigation">
                    <button class="btn btn-sm" onclick="enhancedNavigation.firstImage()" title="First Image">
                        <i class="fas fa-fast-backward"></i>
                    </button>
                    <button class="btn btn-sm" onclick="enhancedNavigation.previousImage()" title="Previous Image">
                        <i class="fas fa-step-backward"></i>
                    </button>
                    <span class="image-indicator" id="imageIndicator">1 / 1</span>
                    <button class="btn btn-sm" onclick="enhancedNavigation.nextImage()" title="Next Image">
                        <i class="fas fa-step-forward"></i>
                    </button>
                    <button class="btn btn-sm" onclick="enhancedNavigation.lastImage()" title="Last Image">
                        <i class="fas fa-fast-forward"></i>
                    </button>
                </div>
                
                <div class="image-slider-container">
                    <input type="range" id="imageSlider" class="image-slider" min="0" max="0" value="0">
                </div>
                
                <div class="image-info" id="imageInfo">
                    <div class="info-row">
                        <span class="label">Position:</span>
                        <span class="value" id="imagePosition">-</span>
                    </div>
                    <div class="info-row">
                        <span class="label">Size:</span>
                        <span class="value" id="imageSize">-</span>
                    </div>
                </div>
            </div>
        `;

        // Find series navigator and insert after it
        const seriesPanel = document.querySelector('.series-navigator-panel');
        if (seriesPanel && seriesPanel.nextSibling) {
            rightPanel.insertBefore(imagePanel, seriesPanel.nextSibling);
        } else {
            rightPanel.appendChild(imagePanel);
        }
    }

    createThumbnailNavigator() {
        // Create thumbnail navigator panel
        const thumbnailPanel = document.createElement('div');
        thumbnailPanel.className = 'panel thumbnail-navigator-panel';
        thumbnailPanel.innerHTML = `
            <h3>
                <i class="fas fa-th"></i> Thumbnail Navigator
                <div class="thumbnail-controls">
                    <button class="btn btn-xs" onclick="enhancedNavigation.toggleThumbnailSize()" title="Toggle Size">
                        <i class="fas fa-expand-arrows-alt"></i>
                    </button>
                    <button class="btn btn-xs" onclick="enhancedNavigation.toggleThumbnailLayout()" title="Toggle Layout">
                        <i class="fas fa-grip-horizontal"></i>
                    </button>
                </div>
            </h3>
            
            <div class="thumbnail-container" id="thumbnailContainer">
                <div class="thumbnail-grid" id="thumbnailGrid">
                    <!-- Thumbnails will be populated here -->
                </div>
                
                <div class="thumbnail-loading" id="thumbnailLoading" style="display: none;">
                    <i class="fas fa-spinner fa-spin"></i>
                    <span>Loading thumbnails...</span>
                </div>
            </div>
            
            <div class="thumbnail-status" id="thumbnailStatus">
                <span>No images loaded</span>
            </div>
        `;

        // Add to right panel
        const rightPanel = document.querySelector('.right-panel');
        if (rightPanel) {
            rightPanel.appendChild(thumbnailPanel);
        }
    }

    setupEventListeners() {
        // Study selector
        const studySelector = document.getElementById('studySelector');
        if (studySelector) {
            studySelector.addEventListener('change', (e) => {
                if (e.target.value) {
                    this.loadStudy(e.target.value);
                }
            });
        }

        // Image slider
        const imageSlider = document.getElementById('imageSlider');
        if (imageSlider) {
            imageSlider.addEventListener('input', (e) => {
                this.goToImage(parseInt(e.target.value));
            });
        }

        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (this.isInputActive()) return;

            switch (e.key) {
                case 'ArrowUp':
                    e.preventDefault();
                    this.previousImage();
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    this.nextImage();
                    break;
                case 'ArrowLeft':
                    e.preventDefault();
                    this.previousSeries();
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    this.nextSeries();
                    break;
                case 'Home':
                    e.preventDefault();
                    this.firstImage();
                    break;
                case 'End':
                    e.preventDefault();
                    this.lastImage();
                    break;
            }
        });

        // Mouse wheel navigation
        const viewport = document.getElementById('dicomCanvas');
        if (viewport) {
            viewport.addEventListener('wheel', (e) => {
                if (!e.ctrlKey && !e.shiftKey) {
                    e.preventDefault();
                    if (e.deltaY > 0) {
                        this.nextImage();
                    } else {
                        this.previousImage();
                    }
                }
            });
        }

        // Listen for image load events
        document.addEventListener('imageLoaded', (e) => {
            this.updateNavigationInfo(e.detail);
        });

        // Listen for series load events
        document.addEventListener('seriesLoaded', (e) => {
            this.handleSeriesLoaded(e.detail);
        });
    }

    // Study Management
    async refreshStudies() {
        try {
            const response = await fetch('/dicom-viewer/api/studies/', {
                method: 'GET',
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            this.updateStudySelector(data.studies || []);

        } catch (error) {
            console.error('Failed to refresh studies:', error);
            if (window.showToast) {
                window.showToast('Failed to load studies', 'error');
            }
        }
    }

    updateStudySelector(studies) {
        const selector = document.getElementById('studySelector');
        if (!selector) return;

        selector.innerHTML = '<option value="">Select Study...</option>';

        studies.forEach(study => {
            const option = document.createElement('option');
            option.value = study.id;
            option.textContent = `${study.patient_name} - ${study.modality} (${study.study_date})`;
            selector.appendChild(option);
        });

        if (window.showToast) {
            window.showToast(`Loaded ${studies.length} studies`, 'success');
        }
    }

    async loadStudy(studyId) {
        try {
            const response = await fetch(`/dicom-viewer/api/study/${studyId}/`, {
                method: 'GET',
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const studyData = await response.json();
            this.currentStudy = studyData;
            
            this.updateStudyInfo(studyData);
            
            if (studyData.series && studyData.series.length > 0) {
                this.updateSeriesList(studyData.series);
                await this.loadSeries(studyData.series[0].id, 0);
            }

        } catch (error) {
            console.error('Failed to load study:', error);
            if (window.showToast) {
                window.showToast('Failed to load study', 'error');
            }
        }
    }

    updateStudyInfo(studyData) {
        document.getElementById('patientName').textContent = studyData.patient_name || '-';
        document.getElementById('studyDate').textContent = studyData.study_date || '-';
        document.getElementById('studyModality').textContent = studyData.modality || '-';
        document.getElementById('seriesCount').textContent = studyData.series?.length || '-';
    }

    // Series Management
    updateSeriesList(seriesList) {
        const container = document.getElementById('seriesList');
        if (!container) return;

        container.innerHTML = '';

        seriesList.forEach((series, index) => {
            const seriesItem = document.createElement('div');
            seriesItem.className = 'series-item';
            seriesItem.innerHTML = `
                <div class="series-thumbnail" id="seriesThumb_${series.id}">
                    <div class="thumbnail-placeholder">
                        <i class="fas fa-image"></i>
                    </div>
                </div>
                <div class="series-details">
                    <div class="series-title">${series.description || `Series ${index + 1}`}</div>
                    <div class="series-meta">
                        <span>${series.image_count || 0} images</span>
                        <span>${series.modality || ''}</span>
                    </div>
                </div>
            `;
            
            seriesItem.addEventListener('click', () => {
                this.loadSeries(series.id, index);
            });

            container.appendChild(seriesItem);

            // Generate series thumbnail
            this.generateSeriesThumbnail(series);
        });

        this.updateSeriesIndicator(0, seriesList.length);
    }

    async generateSeriesThumbnail(series) {
        try {
            // Get first image of series for thumbnail
            const response = await fetch(`/dicom-viewer/api/series/${series.id}/images/`, {
                method: 'GET',
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) return;

            const data = await response.json();
            if (data.images && data.images.length > 0) {
                const firstImage = data.images[0];
                await this.createThumbnailForSeries(series.id, firstImage);
            }

        } catch (error) {
            console.error('Failed to generate series thumbnail:', error);
        }
    }

    async createThumbnailForSeries(seriesId, imageData) {
        const thumbnailContainer = document.getElementById(`seriesThumb_${seriesId}`);
        if (!thumbnailContainer) return;

        try {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                canvas.width = 60;
                canvas.height = 60;
                
                // Draw scaled image
                const scale = Math.min(canvas.width / img.width, canvas.height / img.height);
                const scaledWidth = img.width * scale;
                const scaledHeight = img.height * scale;
                const x = (canvas.width - scaledWidth) / 2;
                const y = (canvas.height - scaledHeight) / 2;
                
                ctx.fillStyle = '#000';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, x, y, scaledWidth, scaledHeight);
                
                thumbnailContainer.innerHTML = '';
                thumbnailContainer.appendChild(canvas);
            };

            img.src = imageData.image_url || imageData.url;

        } catch (error) {
            console.error('Failed to create series thumbnail:', error);
        }
    }

    async loadSeries(seriesId, seriesIndex) {
        try {
            const response = await fetch(`/dicom-viewer/api/series/${seriesId}/images/`, {
                method: 'GET',
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const seriesData = await response.json();
            this.currentSeries = seriesData;
            this.currentImageIndex = 0;

            this.updateSeriesInfo(seriesData);
            this.updateSeriesIndicator(seriesIndex, this.currentStudy?.series?.length || 1);
            
            if (seriesData.images && seriesData.images.length > 0) {
                await this.loadImageList(seriesData.images);
                await this.generateThumbnails(seriesData.images);
                await this.displayImage(0);
            }

            // Mark active series
            document.querySelectorAll('.series-item').forEach((item, index) => {
                item.classList.toggle('active', index === seriesIndex);
            });

        } catch (error) {
            console.error('Failed to load series:', error);
            if (window.showToast) {
                window.showToast('Failed to load series', 'error');
            }
        }
    }

    updateSeriesInfo(seriesData) {
        document.getElementById('seriesDescription').textContent = seriesData.description || '-';
        document.getElementById('imageCount').textContent = seriesData.images?.length || '-';
        document.getElementById('sliceThickness').textContent = seriesData.slice_thickness || '-';
    }

    updateSeriesIndicator(current, total) {
        const indicator = document.getElementById('seriesIndicator');
        if (indicator) {
            indicator.textContent = `${current + 1} / ${total}`;
        }

        // Update navigation buttons
        const prevBtn = document.getElementById('prevSeriesBtn');
        const nextBtn = document.getElementById('nextSeriesBtn');
        
        if (prevBtn) prevBtn.disabled = current === 0;
        if (nextBtn) nextBtn.disabled = current === total - 1;
    }

    // Image Management
    async loadImageList(images) {
        this.images = images;
        this.updateImageSlider(images.length);
        this.updateImageIndicator(0, images.length);
    }

    updateImageSlider(imageCount) {
        const slider = document.getElementById('imageSlider');
        if (slider) {
            slider.max = Math.max(0, imageCount - 1);
            slider.value = 0;
        }
    }

    updateImageIndicator(current, total) {
        const indicator = document.getElementById('imageIndicator');
        if (indicator) {
            indicator.textContent = `${current + 1} / ${total}`;
        }
    }

    async displayImage(index) {
        if (!this.images || index < 0 || index >= this.images.length) return;

        this.currentImageIndex = index;
        const imageData = this.images[index];

        try {
            // Load and display the image
            await this.loadAndDisplayImage(imageData);
            
            // Update UI
            this.updateImageIndicator(index + 1, this.images.length);
            document.getElementById('imageSlider').value = index;
            this.updateImageInfo(imageData);
            
            // Update thumbnail selection
            this.updateThumbnailSelection(index);
            
            // Preload nearby images
            this.preloadNearbyImages(index);

        } catch (error) {
            console.error('Failed to display image:', error);
            if (window.showToast) {
                window.showToast('Failed to display image', 'error');
            }
        }
    }

    async loadAndDisplayImage(imageData) {
        // This would integrate with the existing image loading system
        if (window.dicomCanvasFix && typeof window.dicomCanvasFix.loadImage === 'function') {
            await window.dicomCanvasFix.loadImage(imageData.id);
        }
        
        // Dispatch event for other components
        document.dispatchEvent(new CustomEvent('imageLoaded', {
            detail: imageData
        }));
    }

    updateImageInfo(imageData) {
        document.getElementById('imagePosition').textContent = 
            imageData.position || `${this.currentImageIndex + 1}`;
        document.getElementById('imageSize').textContent = 
            imageData.dimensions ? `${imageData.dimensions.width}×${imageData.dimensions.height}` : '-';
    }

    // Thumbnail Management
    async generateThumbnails(images) {
        const container = document.getElementById('thumbnailGrid');
        if (!container) return;

        this.showThumbnailLoading(true);
        container.innerHTML = '';

        // Generate thumbnails in batches to avoid overwhelming the browser
        const batchSize = 10;
        for (let i = 0; i < images.length; i += batchSize) {
            const batch = images.slice(i, i + batchSize);
            await this.generateThumbnailBatch(batch, i);
            
            // Update status
            const progress = Math.min(100, Math.round(((i + batchSize) / images.length) * 100));
            this.updateThumbnailStatus(`Loading thumbnails... ${progress}%`);
            
            // Small delay to prevent UI blocking
            await new Promise(resolve => setTimeout(resolve, 10));
        }

        this.showThumbnailLoading(false);
        this.updateThumbnailStatus(`${images.length} thumbnails loaded`);
    }

    async generateThumbnailBatch(images, startIndex) {
        const container = document.getElementById('thumbnailGrid');
        if (!container) return;

        const promises = images.map((imageData, batchIndex) => {
            const globalIndex = startIndex + batchIndex;
            return this.createThumbnail(imageData, globalIndex);
        });

        const thumbnails = await Promise.allSettled(promises);
        
        thumbnails.forEach((result, batchIndex) => {
            if (result.status === 'fulfilled' && result.value) {
                container.appendChild(result.value);
            } else {
                // Create placeholder for failed thumbnails
                const globalIndex = startIndex + batchIndex;
                const placeholder = this.createThumbnailPlaceholder(globalIndex);
                container.appendChild(placeholder);
            }
        });
    }

    async createThumbnail(imageData, index) {
        return new Promise((resolve) => {
            const thumbnailDiv = document.createElement('div');
            thumbnailDiv.className = 'thumbnail-item';
            thumbnailDiv.dataset.index = index;
            
            const img = new Image();
            img.crossOrigin = 'anonymous';
            
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                canvas.width = this.thumbnailSize;
                canvas.height = this.thumbnailSize;
                
                // Calculate scaling to fit thumbnail while maintaining aspect ratio
                const scale = Math.min(canvas.width / img.width, canvas.height / img.height);
                const scaledWidth = img.width * scale;
                const scaledHeight = img.height * scale;
                const x = (canvas.width - scaledWidth) / 2;
                const y = (canvas.height - scaledHeight) / 2;
                
                // Draw black background
                ctx.fillStyle = '#000';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                
                // Draw scaled image
                ctx.drawImage(img, x, y, scaledWidth, scaledHeight);
                
                // Add image number overlay
                ctx.fillStyle = 'rgba(0, 212, 255, 0.8)';
                ctx.fillRect(0, canvas.height - 20, 30, 20);
                ctx.fillStyle = '#fff';
                ctx.font = '12px Arial';
                ctx.fillText(index + 1, 5, canvas.height - 6);
                
                thumbnailDiv.appendChild(canvas);
                
                // Add click handler
                thumbnailDiv.addEventListener('click', () => {
                    this.goToImage(index);
                });
                
                // Cache thumbnail
                this.thumbnailCache.set(imageData.id, canvas);
                
                resolve(thumbnailDiv);
            };
            
            img.onerror = () => {
                resolve(this.createThumbnailPlaceholder(index));
            };
            
            // Set timeout for thumbnail loading
            setTimeout(() => {
                if (!img.complete) {
                    img.src = '';
                    resolve(this.createThumbnailPlaceholder(index));
                }
            }, 5000);
            
            img.src = imageData.thumbnail_url || imageData.image_url || imageData.url;
        });
    }

    createThumbnailPlaceholder(index) {
        const thumbnailDiv = document.createElement('div');
        thumbnailDiv.className = 'thumbnail-item placeholder';
        thumbnailDiv.dataset.index = index;
        
        thumbnailDiv.innerHTML = `
            <div class="thumbnail-placeholder">
                <i class="fas fa-image"></i>
                <div class="thumbnail-number">${index + 1}</div>
            </div>
        `;
        
        thumbnailDiv.addEventListener('click', () => {
            this.goToImage(index);
        });
        
        return thumbnailDiv;
    }

    updateThumbnailSelection(index) {
        // Remove previous selection
        document.querySelectorAll('.thumbnail-item').forEach(item => {
            item.classList.remove('selected');
        });
        
        // Add selection to current thumbnail
        const currentThumbnail = document.querySelector(`.thumbnail-item[data-index="${index}"]`);
        if (currentThumbnail) {
            currentThumbnail.classList.add('selected');
            
            // Scroll thumbnail into view
            currentThumbnail.scrollIntoView({
                behavior: 'smooth',
                block: 'nearest',
                inline: 'center'
            });
        }
    }

    showThumbnailLoading(show) {
        const loading = document.getElementById('thumbnailLoading');
        if (loading) {
            loading.style.display = show ? 'flex' : 'none';
        }
    }

    updateThumbnailStatus(message) {
        const status = document.getElementById('thumbnailStatus');
        if (status) {
            status.textContent = message;
        }
    }

    // Navigation Methods
    previousSeries() {
        if (!this.currentStudy || !this.currentStudy.series) return;
        
        const currentIndex = this.getCurrentSeriesIndex();
        if (currentIndex > 0) {
            const newIndex = currentIndex - 1;
            this.loadSeries(this.currentStudy.series[newIndex].id, newIndex);
        }
    }

    nextSeries() {
        if (!this.currentStudy || !this.currentStudy.series) return;
        
        const currentIndex = this.getCurrentSeriesIndex();
        if (currentIndex < this.currentStudy.series.length - 1) {
            const newIndex = currentIndex + 1;
            this.loadSeries(this.currentStudy.series[newIndex].id, newIndex);
        }
    }

    getCurrentSeriesIndex() {
        if (!this.currentStudy || !this.currentSeries) return 0;
        
        return this.currentStudy.series.findIndex(s => s.id === this.currentSeries.id) || 0;
    }

    previousImage() {
        if (this.currentImageIndex > 0) {
            this.displayImage(this.currentImageIndex - 1);
        }
    }

    nextImage() {
        if (this.images && this.currentImageIndex < this.images.length - 1) {
            this.displayImage(this.currentImageIndex + 1);
        }
    }

    firstImage() {
        this.displayImage(0);
    }

    lastImage() {
        if (this.images) {
            this.displayImage(this.images.length - 1);
        }
    }

    goToImage(index) {
        this.displayImage(index);
    }

    // Preloading
    async preloadNearbyImages(currentIndex) {
        if (!this.images) return;

        const preloadPromises = [];
        
        // Preload images before and after current
        for (let i = 1; i <= this.preloadDistance; i++) {
            const prevIndex = currentIndex - i;
            const nextIndex = currentIndex + i;
            
            if (prevIndex >= 0) {
                preloadPromises.push(this.preloadImage(this.images[prevIndex]));
            }
            
            if (nextIndex < this.images.length) {
                preloadPromises.push(this.preloadImage(this.images[nextIndex]));
            }
        }

        // Execute preloading in background
        Promise.allSettled(preloadPromises).then(() => {
            console.log('Preloading completed for nearby images');
        });
    }

    async preloadImage(imageData) {
        try {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            
            return new Promise((resolve, reject) => {
                img.onload = () => resolve(img);
                img.onerror = () => reject(new Error('Failed to preload image'));
                img.src = imageData.image_url || imageData.url;
            });
            
        } catch (error) {
            console.warn('Failed to preload image:', imageData.id, error);
        }
    }

    // UI Controls
    toggleThumbnailSize() {
        this.thumbnailSize = this.thumbnailSize === 120 ? 80 : 120;
        
        // Update CSS custom property
        document.documentElement.style.setProperty('--thumbnail-size', this.thumbnailSize + 'px');
        
        // Regenerate thumbnails with new size
        if (this.images) {
            this.generateThumbnails(this.images);
        }
    }

    toggleThumbnailLayout() {
        const container = document.getElementById('thumbnailContainer');
        if (container) {
            container.classList.toggle('horizontal-layout');
        }
    }

    // Event Handlers
    handleSeriesLoaded(seriesData) {
        this.currentSeries = seriesData;
        // Additional handling as needed
    }

    updateNavigationInfo(imageData) {
        // Update navigation info when image loads
        this.updateImageInfo(imageData);
    }

    isInputActive() {
        const activeElement = document.activeElement;
        const inputTypes = ['input', 'textarea', 'select'];
        return inputTypes.includes(activeElement.tagName.toLowerCase()) ||
               activeElement.contentEditable === 'true';
    }
}

// Add CSS for navigation system
const navigationCSS = `
<style>
:root {
    --thumbnail-size: 120px;
}

.study-navigator-panel,
.series-navigator-panel,
.image-navigator-panel,
.thumbnail-navigator-panel {
    margin-bottom: 15px;
}

.study-controls,
.series-controls,
.image-controls {
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.study-selector {
    display: flex;
    gap: 5px;
}

.study-selector select {
    flex: 1;
}

.info-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 2px 0;
    font-size: 12px;
}

.info-row .label {
    color: #ccc;
    font-weight: 500;
}

.info-row .value {
    color: #00d4ff;
}

.series-navigation,
.image-navigation {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
}

.series-indicator,
.image-indicator {
    font-size: 12px;
    color: #00d4ff;
    font-weight: bold;
    min-width: 60px;
    text-align: center;
}

.image-slider-container {
    margin: 10px 0;
}

.image-slider {
    width: 100%;
    -webkit-appearance: none;
    appearance: none;
    height: 4px;
    background: #333;
    border-radius: 2px;
    outline: none;
}

.image-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 16px;
    height: 16px;
    background: #00d4ff;
    border-radius: 50%;
    cursor: pointer;
}

.image-slider::-moz-range-thumb {
    width: 16px;
    height: 16px;
    background: #00d4ff;
    border-radius: 50%;
    cursor: pointer;
    border: none;
}

.series-list {
    max-height: 200px;
    overflow-y: auto;
    border: 1px solid #404040;
    border-radius: 4px;
    background: #1a1a1a;
}

.series-item {
    display: flex;
    align-items: center;
    padding: 8px;
    border-bottom: 1px solid #333;
    cursor: pointer;
    transition: background-color 0.2s;
}

.series-item:hover {
    background: #333;
}

.series-item.active {
    background: #004466;
    border-left: 3px solid #00d4ff;
}

.series-item:last-child {
    border-bottom: none;
}

.series-thumbnail {
    width: 60px;
    height: 60px;
    margin-right: 10px;
    border: 1px solid #404040;
    border-radius: 3px;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #000;
}

.series-thumbnail canvas {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.series-details {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.series-title {
    font-size: 13px;
    font-weight: 500;
    color: #fff;
}

.series-meta {
    font-size: 11px;
    color: #ccc;
    display: flex;
    gap: 10px;
}

.thumbnail-navigator-panel h3 {
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.thumbnail-controls {
    display: flex;
    gap: 5px;
}

.btn-xs {
    padding: 2px 6px;
    font-size: 10px;
    background: #333;
    border: 1px solid #404040;
    color: white;
    border-radius: 2px;
    cursor: pointer;
}

.btn-xs:hover {
    background: #404040;
}

.thumbnail-container {
    border: 1px solid #404040;
    border-radius: 4px;
    background: #1a1a1a;
    max-height: 300px;
    overflow: auto;
    position: relative;
}

.thumbnail-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(var(--thumbnail-size), 1fr));
    gap: 4px;
    padding: 8px;
}

.thumbnail-container.horizontal-layout .thumbnail-grid {
    display: flex;
    flex-wrap: nowrap;
    overflow-x: auto;
    overflow-y: hidden;
    padding: 8px;
}

.thumbnail-item {
    width: var(--thumbnail-size);
    height: var(--thumbnail-size);
    border: 2px solid transparent;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.2s;
    overflow: hidden;
    position: relative;
    flex-shrink: 0;
}

.thumbnail-item:hover {
    border-color: #00d4ff;
    transform: scale(1.05);
}

.thumbnail-item.selected {
    border-color: #00d4ff;
    box-shadow: 0 0 10px rgba(0, 212, 255, 0.5);
}

.thumbnail-item canvas {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.thumbnail-placeholder {
    width: 100%;
    height: 100%;
    background: #333;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: #666;
    font-size: 24px;
}

.thumbnail-number {
    font-size: 12px;
    margin-top: 5px;
}

.thumbnail-loading {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    color: #00d4ff;
    background: rgba(0, 0, 0, 0.8);
    padding: 20px;
    border-radius: 4px;
}

.thumbnail-status {
    padding: 8px;
    text-align: center;
    font-size: 11px;
    color: #ccc;
    border-top: 1px solid #333;
    background: #222;
}

.btn-sm {
    padding: 4px 8px;
    font-size: 11px;
    background: #333;
    border: 1px solid #404040;
    color: white;
    border-radius: 3px;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 4px;
}

.btn-sm:hover {
    background: #404040;
}

.btn-sm:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.btn-sm:disabled:hover {
    background: #333;
}

/* Scrollbar styling */
.thumbnail-container::-webkit-scrollbar,
.series-list::-webkit-scrollbar {
    width: 8px;
    height: 8px;
}

.thumbnail-container::-webkit-scrollbar-track,
.series-list::-webkit-scrollbar-track {
    background: #222;
}

.thumbnail-container::-webkit-scrollbar-thumb,
.series-list::-webkit-scrollbar-thumb {
    background: #555;
    border-radius: 4px;
}

.thumbnail-container::-webkit-scrollbar-thumb:hover,
.series-list::-webkit-scrollbar-thumb:hover {
    background: #666;
}
</style>
`;

document.head.insertAdjacentHTML('beforeend', navigationCSS);

// Initialize enhanced navigation system
const enhancedNavigation = new EnhancedNavigationSystem();

// Export for global access
window.enhancedNavigation = enhancedNavigation;
window.EnhancedNavigationSystem = EnhancedNavigationSystem;

console.log('Enhanced DICOM Navigation System loaded successfully');