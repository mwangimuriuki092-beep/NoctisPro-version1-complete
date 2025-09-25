/**
 * DICOM Cine Mode System
 * Advanced cine/animation mode for dynamic series playback
 */

class DicomCineMode {
    constructor() {
        this.isPlaying = false;
        this.currentFrame = 0;
        this.frameCount = 0;
        this.playbackSpeed = 10; // FPS
        this.playbackDirection = 1; // 1 for forward, -1 for reverse
        this.loopMode = 'loop'; // 'loop', 'bounce', 'once'
        this.animationId = null;
        this.lastFrameTime = 0;
        this.images = [];
        this.preloadedImages = new Map();
        this.init();
    }

    init() {
        this.createCineUI();
        this.setupEventListeners();
        this.setupKeyboardShortcuts();
        console.log('DICOM Cine Mode initialized');
    }

    createCineUI() {
        const rightPanel = document.querySelector('.right-panel');
        if (!rightPanel) return;

        const cinePanel = document.createElement('div');
        cinePanel.className = 'panel cine-mode-panel';
        cinePanel.innerHTML = `
            <h3><i class="fas fa-play-circle"></i> Cine Mode</h3>
            
            <div class="cine-controls">
                <!-- Playback Controls -->
                <div class="playback-controls">
                    <button class="btn cine-btn" id="cineFirstBtn" onclick="cineMode.goToFirst()" title="First Frame">
                        <i class="fas fa-fast-backward"></i>
                    </button>
                    <button class="btn cine-btn" id="cinePrevBtn" onclick="cineMode.previousFrame()" title="Previous Frame">
                        <i class="fas fa-step-backward"></i>
                    </button>
                    <button class="btn cine-btn primary" id="cinePlayBtn" onclick="cineMode.togglePlay()" title="Play/Pause">
                        <i class="fas fa-play" id="cinePlayIcon"></i>
                    </button>
                    <button class="btn cine-btn" id="cineNextBtn" onclick="cineMode.nextFrame()" title="Next Frame">
                        <i class="fas fa-step-forward"></i>
                    </button>
                    <button class="btn cine-btn" id="cineLastBtn" onclick="cineMode.goToLast()" title="Last Frame">
                        <i class="fas fa-fast-forward"></i>
                    </button>
                </div>

                <!-- Progress Bar -->
                <div class="cine-progress-container">
                    <div class="cine-progress-bar" id="cineProgressBar">
                        <div class="cine-progress-fill" id="cineProgressFill"></div>
                        <div class="cine-progress-handle" id="cineProgressHandle"></div>
                    </div>
                    <div class="cine-frame-info">
                        <span id="cineCurrentFrame">1</span> / <span id="cineTotalFrames">1</span>
                    </div>
                </div>

                <!-- Speed Control -->
                <div class="cine-speed-control">
                    <label>Speed:</label>
                    <div class="speed-buttons">
                        <button class="btn btn-xs" onclick="cineMode.setSpeed(1)" title="1 FPS">1x</button>
                        <button class="btn btn-xs" onclick="cineMode.setSpeed(5)" title="5 FPS">5x</button>
                        <button class="btn btn-xs active" onclick="cineMode.setSpeed(10)" title="10 FPS">10x</button>
                        <button class="btn btn-xs" onclick="cineMode.setSpeed(15)" title="15 FPS">15x</button>
                        <button class="btn btn-xs" onclick="cineMode.setSpeed(30)" title="30 FPS">30x</button>
                    </div>
                    <div class="speed-slider-container">
                        <input type="range" id="cineSpeedSlider" class="speed-slider" 
                               min="1" max="60" value="10" step="1">
                        <span id="cineSpeedValue">10 FPS</span>
                    </div>
                </div>

                <!-- Playback Options -->
                <div class="cine-options">
                    <div class="option-group">
                        <label>Loop Mode:</label>
                        <select id="cineLoopMode" class="select-control">
                            <option value="loop" selected>Loop</option>
                            <option value="bounce">Bounce</option>
                            <option value="once">Play Once</option>
                        </select>
                    </div>

                    <div class="option-group">
                        <label>Direction:</label>
                        <div class="direction-buttons">
                            <button class="btn btn-sm active" id="cineForwardBtn" onclick="cineMode.setDirection(1)">
                                <i class="fas fa-arrow-right"></i> Forward
                            </button>
                            <button class="btn btn-sm" id="cineReverseBtn" onclick="cineMode.setDirection(-1)">
                                <i class="fas fa-arrow-left"></i> Reverse
                            </button>
                        </div>
                    </div>

                    <div class="option-group">
                        <div class="checkbox-group">
                            <label class="checkbox-label">
                                <input type="checkbox" id="cineAutoPlay" checked>
                                <span>Auto-play on series load</span>
                            </label>
                            <label class="checkbox-label">
                                <input type="checkbox" id="cinePreload" checked>
                                <span>Preload images for smooth playback</span>
                            </label>
                            <label class="checkbox-label">
                                <input type="checkbox" id="cineShowTimestamp">
                                <span>Show frame timestamp</span>
                            </label>
                        </div>
                    </div>
                </div>

                <!-- Frame Analysis -->
                <div class="cine-analysis" id="cineAnalysis" style="display: none;">
                    <h4>Frame Analysis</h4>
                    <div class="analysis-controls">
                        <button class="btn btn-sm" onclick="cineMode.markKeyFrame()">
                            <i class="fas fa-bookmark"></i> Mark Key Frame
                        </button>
                        <button class="btn btn-sm" onclick="cineMode.compareFrames()">
                            <i class="fas fa-columns"></i> Compare Frames
                        </button>
                        <button class="btn btn-sm" onclick="cineMode.exportSequence()">
                            <i class="fas fa-film"></i> Export Sequence
                        </button>
                    </div>
                    <div class="key-frames-list" id="keyFramesList">
                        <!-- Key frames will be listed here -->
                    </div>
                </div>
            </div>

            <!-- Advanced Controls (Collapsible) -->
            <div class="advanced-cine-controls">
                <button class="btn-toggle" onclick="cineMode.toggleAdvanced()">
                    <i class="fas fa-cog"></i> Advanced Controls
                </button>
                <div class="advanced-panel" id="advancedCinePanel" style="display: none;">
                    <div class="option-group">
                        <label>Frame Skip:</label>
                        <input type="number" id="cineFrameSkip" min="1" max="10" value="1" class="number-input">
                        <small>Skip frames for faster playback</small>
                    </div>
                    <div class="option-group">
                        <label>Interpolation:</label>
                        <select id="cineInterpolation" class="select-control">
                            <option value="none">None</option>
                            <option value="linear">Linear</option>
                            <option value="cubic">Cubic</option>
                        </select>
                    </div>
                    <div class="option-group">
                        <label>ROI Tracking:</label>
                        <button class="btn btn-sm" onclick="cineMode.enableROITracking()">
                            <i class="fas fa-crosshairs"></i> Enable Tracking
                        </button>
                    </div>
                </div>
            </div>
        `;

        rightPanel.appendChild(cinePanel);
        this.setupProgressBarInteraction();
    }

    setupEventListeners() {
        // Speed slider
        const speedSlider = document.getElementById('cineSpeedSlider');
        if (speedSlider) {
            speedSlider.addEventListener('input', (e) => {
                this.setSpeed(parseInt(e.target.value));
            });
        }

        // Loop mode
        const loopMode = document.getElementById('cineLoopMode');
        if (loopMode) {
            loopMode.addEventListener('change', (e) => {
                this.loopMode = e.target.value;
            });
        }

        // Frame skip
        const frameSkip = document.getElementById('cineFrameSkip');
        if (frameSkip) {
            frameSkip.addEventListener('change', (e) => {
                this.frameSkip = parseInt(e.target.value);
            });
        }

        // Listen for series load events
        document.addEventListener('seriesLoaded', (e) => {
            this.handleSeriesLoaded(e.detail);
        });

        // Listen for image list changes
        document.addEventListener('imageListChanged', (e) => {
            this.handleImageListChanged(e.detail);
        });
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            if (this.isInputActive()) return;

            switch (e.key) {
                case ' ':
                case 'Space':
                    e.preventDefault();
                    this.togglePlay();
                    break;
                case '[':
                    e.preventDefault();
                    this.decreaseSpeed();
                    break;
                case ']':
                    e.preventDefault();
                    this.increaseSpeed();
                    break;
                case 'r':
                    if (e.ctrlKey) {
                        e.preventDefault();
                        this.toggleDirection();
                    }
                    break;
            }
        });
    }

    setupProgressBarInteraction() {
        const progressBar = document.getElementById('cineProgressBar');
        const progressHandle = document.getElementById('cineProgressHandle');
        
        if (!progressBar || !progressHandle) return;

        let isDragging = false;

        progressBar.addEventListener('mousedown', (e) => {
            isDragging = true;
            this.updateProgressFromMouse(e);
        });

        document.addEventListener('mousemove', (e) => {
            if (isDragging) {
                this.updateProgressFromMouse(e);
            }
        });

        document.addEventListener('mouseup', () => {
            isDragging = false;
        });

        progressHandle.addEventListener('mousedown', (e) => {
            e.stopPropagation();
            isDragging = true;
        });
    }

    updateProgressFromMouse(e) {
        const progressBar = document.getElementById('cineProgressBar');
        if (!progressBar) return;

        const rect = progressBar.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const percentage = Math.max(0, Math.min(1, x / rect.width));
        const frame = Math.round(percentage * (this.frameCount - 1));
        
        this.goToFrame(frame);
    }

    // Series and Image Management
    handleSeriesLoaded(seriesData) {
        if (seriesData.images && seriesData.images.length > 1) {
            this.loadImageSequence(seriesData.images);
            
            // Auto-play if enabled
            if (document.getElementById('cineAutoPlay')?.checked) {
                setTimeout(() => this.play(), 1000);
            }
        }
    }

    handleImageListChanged(imageList) {
        this.loadImageSequence(imageList);
    }

    async loadImageSequence(images) {
        this.images = images;
        this.frameCount = images.length;
        this.currentFrame = 0;

        this.updateUI();
        
        // Preload images if enabled
        if (document.getElementById('cinePreload')?.checked) {
            await this.preloadImages();
        }

        if (window.showToast) {
            window.showToast(`Cine sequence loaded: ${this.frameCount} frames`, 'success');
        }
    }

    async preloadImages() {
        const batchSize = 5;
        let loaded = 0;

        for (let i = 0; i < this.images.length; i += batchSize) {
            const batch = this.images.slice(i, i + batchSize);
            const promises = batch.map(imageData => this.preloadImage(imageData));
            
            await Promise.allSettled(promises);
            loaded += batch.length;
            
            // Update progress
            const progress = Math.round((loaded / this.images.length) * 100);
            console.log(`Preloaded ${progress}% of images`);
        }
    }

    async preloadImage(imageData) {
        if (this.preloadedImages.has(imageData.id)) {
            return this.preloadedImages.get(imageData.id);
        }

        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            
            img.onload = () => {
                this.preloadedImages.set(imageData.id, img);
                resolve(img);
            };
            
            img.onerror = () => {
                reject(new Error('Failed to preload image'));
            };
            
            img.src = imageData.image_url || imageData.url;
        });
    }

    // Playback Control
    play() {
        if (this.frameCount <= 1) return;
        
        this.isPlaying = true;
        this.lastFrameTime = performance.now();
        this.updatePlayButton();
        this.animate();
    }

    pause() {
        this.isPlaying = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        this.updatePlayButton();
    }

    togglePlay() {
        if (this.isPlaying) {
            this.pause();
        } else {
            this.play();
        }
    }

    animate() {
        if (!this.isPlaying) return;

        const currentTime = performance.now();
        const deltaTime = currentTime - this.lastFrameTime;
        const frameInterval = 1000 / this.playbackSpeed;

        if (deltaTime >= frameInterval) {
            this.advanceFrame();
            this.lastFrameTime = currentTime;
        }

        this.animationId = requestAnimationFrame(() => this.animate());
    }

    advanceFrame() {
        const frameSkip = parseInt(document.getElementById('cineFrameSkip')?.value) || 1;
        let nextFrame = this.currentFrame + (this.playbackDirection * frameSkip);

        switch (this.loopMode) {
            case 'loop':
                if (nextFrame >= this.frameCount) {
                    nextFrame = 0;
                } else if (nextFrame < 0) {
                    nextFrame = this.frameCount - 1;
                }
                break;

            case 'bounce':
                if (nextFrame >= this.frameCount || nextFrame < 0) {
                    this.playbackDirection *= -1;
                    nextFrame = this.currentFrame + (this.playbackDirection * frameSkip);
                    this.updateDirectionButtons();
                }
                break;

            case 'once':
                if (nextFrame >= this.frameCount || nextFrame < 0) {
                    this.pause();
                    return;
                }
                break;
        }

        this.goToFrame(nextFrame);
    }

    // Frame Navigation
    goToFrame(frame) {
        if (frame < 0 || frame >= this.frameCount || !this.images[frame]) return;

        this.currentFrame = frame;
        this.displayFrame(this.images[frame]);
        this.updateProgress();
        this.updateFrameInfo();
    }

    goToFirst() {
        this.goToFrame(0);
    }

    goToLast() {
        this.goToFrame(this.frameCount - 1);
    }

    nextFrame() {
        const nextFrame = (this.currentFrame + 1) % this.frameCount;
        this.goToFrame(nextFrame);
    }

    previousFrame() {
        const prevFrame = this.currentFrame === 0 ? this.frameCount - 1 : this.currentFrame - 1;
        this.goToFrame(prevFrame);
    }

    async displayFrame(imageData) {
        try {
            // Use preloaded image if available
            if (this.preloadedImages.has(imageData.id)) {
                const img = this.preloadedImages.get(imageData.id);
                this.renderImageToCanvas(img);
            } else {
                // Load image on demand
                await this.loadAndDisplayImage(imageData);
            }

            // Show timestamp if enabled
            if (document.getElementById('cineShowTimestamp')?.checked) {
                this.showFrameTimestamp(imageData);
            }

            // Dispatch event for other components
            document.dispatchEvent(new CustomEvent('cineFrameChanged', {
                detail: {
                    frame: this.currentFrame,
                    imageData: imageData,
                    totalFrames: this.frameCount
                }
            }));

        } catch (error) {
            console.error('Failed to display frame:', error);
        }
    }

    async loadAndDisplayImage(imageData) {
        // Integrate with existing image loading system
        if (window.enhancedNavigation && typeof window.enhancedNavigation.displayImage === 'function') {
            await window.enhancedNavigation.displayImage(this.currentFrame);
        } else if (window.dicomCanvasFix && typeof window.dicomCanvasFix.loadImage === 'function') {
            await window.dicomCanvasFix.loadImage(imageData.id);
        }
    }

    renderImageToCanvas(img) {
        const canvas = document.getElementById('dicomCanvas');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        
        // Clear canvas
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Calculate scaling to fit canvas
        const scale = Math.min(canvas.width / img.width, canvas.height / img.height);
        const scaledWidth = img.width * scale;
        const scaledHeight = img.height * scale;
        const x = (canvas.width - scaledWidth) / 2;
        const y = (canvas.height - scaledHeight) / 2;
        
        // Draw image
        ctx.drawImage(img, x, y, scaledWidth, scaledHeight);
    }

    showFrameTimestamp(imageData) {
        // Add timestamp overlay
        const canvas = document.getElementById('dicomCanvas');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const timestamp = imageData.timestamp || imageData.acquisition_time || new Date().toLocaleTimeString();
        
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(10, 10, 150, 25);
        
        ctx.fillStyle = '#00d4ff';
        ctx.font = '12px Arial';
        ctx.fillText(`Frame ${this.currentFrame + 1}: ${timestamp}`, 15, 27);
    }

    // Speed Control
    setSpeed(fps) {
        this.playbackSpeed = Math.max(1, Math.min(60, fps));
        
        // Update UI
        document.getElementById('cineSpeedSlider').value = this.playbackSpeed;
        document.getElementById('cineSpeedValue').textContent = `${this.playbackSpeed} FPS`;
        
        // Update speed buttons
        document.querySelectorAll('.speed-buttons .btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Highlight matching speed button
        const speedButtons = document.querySelectorAll('.speed-buttons .btn');
        speedButtons.forEach(btn => {
            const speed = parseInt(btn.getAttribute('onclick').match(/\d+/)[0]);
            if (speed === this.playbackSpeed) {
                btn.classList.add('active');
            }
        });
    }

    increaseSpeed() {
        this.setSpeed(Math.min(60, this.playbackSpeed + 5));
    }

    decreaseSpeed() {
        this.setSpeed(Math.max(1, this.playbackSpeed - 5));
    }

    // Direction Control
    setDirection(direction) {
        this.playbackDirection = direction;
        this.updateDirectionButtons();
    }

    toggleDirection() {
        this.setDirection(this.playbackDirection * -1);
    }

    updateDirectionButtons() {
        const forwardBtn = document.getElementById('cineForwardBtn');
        const reverseBtn = document.getElementById('cineReverseBtn');
        
        if (forwardBtn && reverseBtn) {
            forwardBtn.classList.toggle('active', this.playbackDirection === 1);
            reverseBtn.classList.toggle('active', this.playbackDirection === -1);
        }
    }

    // UI Updates
    updateUI() {
        this.updateFrameInfo();
        this.updateProgress();
        this.updatePlayButton();
    }

    updateFrameInfo() {
        document.getElementById('cineCurrentFrame').textContent = this.currentFrame + 1;
        document.getElementById('cineTotalFrames').textContent = this.frameCount;
    }

    updateProgress() {
        const progress = this.frameCount > 1 ? this.currentFrame / (this.frameCount - 1) : 0;
        const progressFill = document.getElementById('cineProgressFill');
        const progressHandle = document.getElementById('cineProgressHandle');
        
        if (progressFill) {
            progressFill.style.width = `${progress * 100}%`;
        }
        
        if (progressHandle) {
            progressHandle.style.left = `${progress * 100}%`;
        }
    }

    updatePlayButton() {
        const playIcon = document.getElementById('cinePlayIcon');
        if (playIcon) {
            playIcon.className = this.isPlaying ? 'fas fa-pause' : 'fas fa-play';
        }
    }

    // Advanced Features
    toggleAdvanced() {
        const panel = document.getElementById('advancedCinePanel');
        if (panel) {
            const isVisible = panel.style.display !== 'none';
            panel.style.display = isVisible ? 'none' : 'block';
        }
    }

    markKeyFrame() {
        const keyFrame = {
            frame: this.currentFrame,
            timestamp: new Date().toISOString(),
            imageData: this.images[this.currentFrame]
        };
        
        // Store key frame (you could save this to local storage or server)
        const keyFrames = JSON.parse(localStorage.getItem('cine_key_frames') || '[]');
        keyFrames.push(keyFrame);
        localStorage.setItem('cine_key_frames', JSON.stringify(keyFrames));
        
        this.updateKeyFramesList();
        
        if (window.showToast) {
            window.showToast(`Key frame marked: Frame ${this.currentFrame + 1}`, 'success');
        }
    }

    updateKeyFramesList() {
        const keyFrames = JSON.parse(localStorage.getItem('cine_key_frames') || '[]');
        const list = document.getElementById('keyFramesList');
        
        if (list) {
            list.innerHTML = '';
            keyFrames.forEach((keyFrame, index) => {
                const item = document.createElement('div');
                item.className = 'key-frame-item';
                item.innerHTML = `
                    <span>Frame ${keyFrame.frame + 1}</span>
                    <button class="btn btn-xs" onclick="cineMode.goToFrame(${keyFrame.frame})">Go</button>
                    <button class="btn btn-xs" onclick="cineMode.removeKeyFrame(${index})">×</button>
                `;
                list.appendChild(item);
            });
        }
    }

    removeKeyFrame(index) {
        const keyFrames = JSON.parse(localStorage.getItem('cine_key_frames') || '[]');
        keyFrames.splice(index, 1);
        localStorage.setItem('cine_key_frames', JSON.stringify(keyFrames));
        this.updateKeyFramesList();
    }

    compareFrames() {
        // This would open a comparison view
        if (window.showToast) {
            window.showToast('Frame comparison feature would be implemented here', 'info');
        }
    }

    async exportSequence() {
        if (!this.images || this.images.length === 0) {
            if (window.showToast) {
                window.showToast('No sequence to export', 'warning');
            }
            return;
        }

        // This would export the cine sequence as a video or image series
        if (window.enhancedExport && typeof window.enhancedExport.showDialog === 'function') {
            window.enhancedExport.showDialog();
        } else if (window.showToast) {
            window.showToast('Sequence export feature available in Export dialog', 'info');
        }
    }

    enableROITracking() {
        // This would enable region of interest tracking across frames
        if (window.showToast) {
            window.showToast('ROI tracking feature would be implemented here', 'info');
        }
    }

    // Utility Methods
    isInputActive() {
        const activeElement = document.activeElement;
        const inputTypes = ['input', 'textarea', 'select'];
        return inputTypes.includes(activeElement.tagName.toLowerCase()) ||
               activeElement.contentEditable === 'true';
    }

    // Public API
    getCurrentFrame() {
        return this.currentFrame;
    }

    getTotalFrames() {
        return this.frameCount;
    }

    isPlayingCine() {
        return this.isPlaying;
    }

    getPlaybackSpeed() {
        return this.playbackSpeed;
    }

    setFrameSkip(skip) {
        this.frameSkip = Math.max(1, Math.min(10, skip));
        document.getElementById('cineFrameSkip').value = this.frameSkip;
    }
}

// Add CSS for cine mode
const cineCSS = `
<style>
.cine-mode-panel {
    border: 1px solid #404040;
    border-radius: 4px;
    margin-bottom: 15px;
}

.cine-controls {
    display: flex;
    flex-direction: column;
    gap: 15px;
}

.playback-controls {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
}

.cine-btn {
    padding: 8px 12px;
    background: #333;
    border: 1px solid #404040;
    color: white;
    border-radius: 4px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 40px;
}

.cine-btn:hover {
    background: #404040;
}

.cine-btn.primary {
    background: #00d4ff;
    color: #000;
    font-weight: bold;
}

.cine-btn.primary:hover {
    background: #0099cc;
}

.cine-progress-container {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.cine-progress-bar {
    height: 8px;
    background: #333;
    border-radius: 4px;
    position: relative;
    cursor: pointer;
}

.cine-progress-fill {
    height: 100%;
    background: #00d4ff;
    border-radius: 4px;
    transition: width 0.1s ease;
}

.cine-progress-handle {
    position: absolute;
    top: -4px;
    width: 16px;
    height: 16px;
    background: #00d4ff;
    border-radius: 50%;
    cursor: pointer;
    transform: translateX(-50%);
    border: 2px solid #fff;
}

.cine-frame-info {
    text-align: center;
    font-size: 12px;
    color: #00d4ff;
    font-weight: bold;
}

.cine-speed-control {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.cine-speed-control label {
    font-size: 12px;
    color: #ccc;
}

.speed-buttons {
    display: flex;
    gap: 4px;
}

.speed-buttons .btn {
    padding: 4px 8px;
    font-size: 10px;
}

.speed-buttons .btn.active {
    background: #00d4ff;
    color: #000;
}

.speed-slider-container {
    display: flex;
    align-items: center;
    gap: 10px;
}

.speed-slider {
    flex: 1;
    -webkit-appearance: none;
    appearance: none;
    height: 4px;
    background: #333;
    border-radius: 2px;
    outline: none;
}

.speed-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 12px;
    height: 12px;
    background: #00d4ff;
    border-radius: 50%;
    cursor: pointer;
}

.speed-slider::-moz-range-thumb {
    width: 12px;
    height: 12px;
    background: #00d4ff;
    border-radius: 50%;
    cursor: pointer;
    border: none;
}

#cineSpeedValue {
    font-size: 11px;
    color: #00d4ff;
    min-width: 50px;
    text-align: right;
}

.cine-options {
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.direction-buttons {
    display: flex;
    gap: 5px;
}

.direction-buttons .btn {
    flex: 1;
    font-size: 11px;
    padding: 6px 8px;
}

.direction-buttons .btn.active {
    background: #00d4ff;
    color: #000;
}

.cine-analysis {
    border-top: 1px solid #404040;
    padding-top: 15px;
    margin-top: 15px;
}

.cine-analysis h4 {
    color: #00d4ff;
    margin: 0 0 10px 0;
    font-size: 14px;
}

.analysis-controls {
    display: flex;
    gap: 5px;
    margin-bottom: 10px;
    flex-wrap: wrap;
}

.analysis-controls .btn {
    font-size: 10px;
    padding: 4px 8px;
}

.key-frames-list {
    max-height: 100px;
    overflow-y: auto;
    border: 1px solid #333;
    border-radius: 3px;
    background: #1a1a1a;
}

.key-frame-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 5px 8px;
    border-bottom: 1px solid #333;
    font-size: 11px;
}

.key-frame-item:last-child {
    border-bottom: none;
}

.key-frame-item .btn {
    padding: 2px 6px;
    font-size: 9px;
}

.advanced-cine-controls {
    border-top: 1px solid #404040;
    padding-top: 15px;
    margin-top: 15px;
}

.advanced-panel {
    background: #1a1a1a;
    padding: 15px;
    border-radius: 4px;
    border: 1px solid #333;
    margin-top: 10px;
}

.number-input {
    width: 60px;
    padding: 4px;
    background: #333;
    border: 1px solid #404040;
    color: white;
    border-radius: 3px;
    text-align: center;
}

.option-group {
    margin-bottom: 10px;
}

.option-group label {
    font-size: 12px;
    color: #ccc;
    display: block;
    margin-bottom: 5px;
}

.option-group small {
    font-size: 10px;
    color: #666;
    margin-left: 10px;
}

.checkbox-group {
    display: flex;
    flex-direction: column;
    gap: 5px;
}

.checkbox-label {
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    font-size: 11px;
}

.btn-toggle {
    width: 100%;
    padding: 8px;
    background: #333;
    border: 1px solid #404040;
    color: white;
    border-radius: 4px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
}

.btn-toggle:hover {
    background: #404040;
}

/* Responsive adjustments */
@media (max-width: 768px) {
    .playback-controls {
        flex-wrap: wrap;
        gap: 5px;
    }
    
    .cine-btn {
        min-width: 35px;
        padding: 6px 8px;
    }
    
    .speed-buttons {
        flex-wrap: wrap;
    }
    
    .direction-buttons {
        flex-direction: column;
    }
}
</style>
`;

document.head.insertAdjacentHTML('beforeend', cineCSS);

// Initialize cine mode
const cineMode = new DicomCineMode();

// Export for global access
window.cineMode = cineMode;
window.DicomCineMode = DicomCineMode;

console.log('DICOM Cine Mode System loaded successfully');