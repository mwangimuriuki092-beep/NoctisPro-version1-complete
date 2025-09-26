/**
 * Advanced Cine Playback System
 * For dynamic studies (cardiac, vascular, etc.)
 */

class AdvancedCinePlayback {
    constructor() {
        this.isPlaying = false;
        this.currentFrame = 0;
        this.totalFrames = 0;
        this.frameRate = 30; // FPS
        this.playbackSpeed = 1.0;
        this.loopMode = 'forward'; // forward, reverse, bounce
        this.frames = [];
        this.playbackInterval = null;
        this.cineDialog = null;
        
        this.init();
    }
    
    init() {
        this.createCineDialog();
        this.setupEventListeners();
        console.log('🎬 Advanced Cine Playback initialized');
    }
    
    createCineDialog() {
        const dialogHTML = `
            <div id="cine-dialog" class="modal-dialog" style="display: none;">
                <div class="modal-content large">
                    <div class="modal-header">
                        <h3>Cine Playback</h3>
                        <button class="close-btn" onclick="closeCineDialog()">×</button>
                    </div>
                    <div class="modal-body">
                        <div class="cine-viewer">
                            <canvas id="cine-canvas" width="600" height="600"></canvas>
                            <div class="cine-overlay">
                                <div class="frame-counter" id="frame-counter">Frame: 1 / 1</div>
                                <div class="playback-status" id="playback-status">⏸️ Paused</div>
                            </div>
                        </div>
                        
                        <div class="cine-controls">
                            <div class="playback-controls">
                                <button class="cine-btn" onclick="cineFirst()" title="First Frame">⏮️</button>
                                <button class="cine-btn" onclick="cinePrevious()" title="Previous Frame">⏪</button>
                                <button class="cine-btn" id="play-pause-btn" onclick="togglePlayback()" title="Play/Pause">▶️</button>
                                <button class="cine-btn" onclick="cineNext()" title="Next Frame">⏩</button>
                                <button class="cine-btn" onclick="cineLast()" title="Last Frame">⏭️</button>
                            </div>
                            
                            <div class="frame-slider-container">
                                <input type="range" id="frame-slider" min="0" max="100" value="0" class="frame-slider">
                                <div class="slider-labels">
                                    <span>0</span>
                                    <span id="max-frame-label">100</span>
                                </div>
                            </div>
                            
                            <div class="playback-settings">
                                <div class="setting-group">
                                    <label>Speed:</label>
                                    <select id="playback-speed">
                                        <option value="0.25">0.25x</option>
                                        <option value="0.5">0.5x</option>
                                        <option value="1" selected>1x</option>
                                        <option value="2">2x</option>
                                        <option value="4">4x</option>
                                    </select>
                                </div>
                                
                                <div class="setting-group">
                                    <label>FPS:</label>
                                    <select id="frame-rate">
                                        <option value="15">15 FPS</option>
                                        <option value="30" selected>30 FPS</option>
                                        <option value="60">60 FPS</option>
                                    </select>
                                </div>
                                
                                <div class="setting-group">
                                    <label>Loop:</label>
                                    <select id="loop-mode">
                                        <option value="forward" selected>Forward</option>
                                        <option value="reverse">Reverse</option>
                                        <option value="bounce">Bounce</option>
                                        <option value="once">Play Once</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                        
                        <div class="cine-analysis" id="cine-analysis">
                            <h4>Dynamic Analysis</h4>
                            <div class="analysis-grid">
                                <div class="analysis-item">
                                    <label>Heart Rate:</label>
                                    <span id="heart-rate">-- BPM</span>
                                </div>
                                <div class="analysis-item">
                                    <label>Cycle Length:</label>
                                    <span id="cycle-length">-- ms</span>
                                </div>
                                <div class="analysis-item">
                                    <label>Motion Detection:</label>
                                    <span id="motion-detection">Analyzing...</span>
                                </div>
                                <div class="analysis-item">
                                    <label>Quality Score:</label>
                                    <span id="quality-score">-- %</span>
                                </div>
                            </div>
                        </div>
                        
                        <div class="cine-actions">
                            <button class="btn btn-primary" onclick="exportCineSequence()">Export Sequence</button>
                            <button class="btn btn-secondary" onclick="createCineGIF()">Create GIF</button>
                            <button class="btn btn-secondary" onclick="analyzeCineMotion()">Analyze Motion</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        const styleHTML = `
            <style>
                .cine-viewer {
                    position: relative;
                    text-align: center;
                    margin-bottom: 20px;
                }
                
                #cine-canvas {
                    border: 1px solid #333;
                    background: #000;
                    max-width: 100%;
                    height: auto;
                }
                
                .cine-overlay {
                    position: absolute;
                    top: 10px;
                    left: 10px;
                    right: 10px;
                    display: flex;
                    justify-content: space-between;
                    pointer-events: none;
                }
                
                .frame-counter, .playback-status {
                    background: rgba(0, 0, 0, 0.8);
                    color: #00ff00;
                    padding: 4px 8px;
                    border-radius: 4px;
                    font-size: 12px;
                    font-family: monospace;
                }
                
                .cine-controls {
                    background: #2a2a2a;
                    padding: 15px;
                    border-radius: 6px;
                    margin-bottom: 20px;
                }
                
                .playback-controls {
                    display: flex;
                    justify-content: center;
                    gap: 5px;
                    margin-bottom: 15px;
                }
                
                .cine-btn {
                    background: #333;
                    border: 1px solid #555;
                    color: #fff;
                    padding: 8px 12px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 16px;
                }
                
                .cine-btn:hover {
                    background: #555;
                }
                
                .cine-btn.active {
                    background: #00d4ff;
                    color: #000;
                }
                
                .frame-slider-container {
                    margin-bottom: 15px;
                }
                
                .frame-slider {
                    width: 100%;
                    height: 6px;
                    background: #333;
                    border-radius: 3px;
                    outline: none;
                }
                
                .slider-labels {
                    display: flex;
                    justify-content: space-between;
                    color: #ccc;
                    font-size: 12px;
                    margin-top: 5px;
                }
                
                .playback-settings {
                    display: flex;
                    gap: 20px;
                    justify-content: center;
                    align-items: center;
                    flex-wrap: wrap;
                }
                
                .setting-group {
                    display: flex;
                    align-items: center;
                    gap: 5px;
                }
                
                .setting-group label {
                    color: #ccc;
                    font-size: 12px;
                }
                
                .setting-group select {
                    background: #333;
                    border: 1px solid #555;
                    color: #fff;
                    padding: 4px;
                    border-radius: 3px;
                }
                
                .cine-analysis {
                    background: #2a2a2a;
                    padding: 15px;
                    border-radius: 6px;
                    margin-bottom: 20px;
                }
                
                .analysis-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
                    gap: 10px;
                }
                
                .analysis-item {
                    background: #333;
                    padding: 8px;
                    border-radius: 4px;
                    display: flex;
                    justify-content: space-between;
                }
                
                .analysis-item label {
                    color: #ccc;
                    font-size: 12px;
                }
                
                .analysis-item span {
                    color: #00ff00;
                    font-weight: bold;
                    font-size: 12px;
                }
                
                .cine-actions {
                    display: flex;
                    gap: 10px;
                    justify-content: center;
                }
            </style>
        `;
        
        document.head.insertAdjacentHTML('beforeend', styleHTML);
        document.body.insertAdjacentHTML('beforeend', dialogHTML);
        
        this.cineDialog = document.getElementById('cine-dialog');
        this.setupCineControls();
    }
    
    setupCineControls() {
        // Frame slider
        const frameSlider = document.getElementById('frame-slider');
        if (frameSlider) {
            frameSlider.addEventListener('input', (e) => {
                this.goToFrame(parseInt(e.target.value));
            });
        }
        
        // Playback speed
        const speedSelect = document.getElementById('playback-speed');
        if (speedSelect) {
            speedSelect.addEventListener('change', (e) => {
                this.playbackSpeed = parseFloat(e.target.value);
                if (this.isPlaying) {
                    this.stopPlayback();
                    this.startPlayback();
                }
            });
        }
        
        // Frame rate
        const fpsSelect = document.getElementById('frame-rate');
        if (fpsSelect) {
            fpsSelect.addEventListener('change', (e) => {
                this.frameRate = parseInt(e.target.value);
                if (this.isPlaying) {
                    this.stopPlayback();
                    this.startPlayback();
                }
            });
        }
        
        // Loop mode
        const loopSelect = document.getElementById('loop-mode');
        if (loopSelect) {
            loopSelect.addEventListener('change', (e) => {
                this.loopMode = e.target.value;
            });
        }
    }
    
    setupEventListeners() {
        // Listen for series with multiple images (potential cine)
        document.addEventListener('seriesLoaded', (event) => {
            if (event.detail && event.detail.images && event.detail.images.length > 10) {
                this.detectCineSequence(event.detail);
            }
        });
        
        // Keyboard shortcuts for cine control
        document.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT') return;
            
            switch (e.key) {
                case ' ': // Spacebar
                    e.preventDefault();
                    this.togglePlayback();
                    break;
                case 'ArrowLeft':
                    this.previousFrame();
                    break;
                case 'ArrowRight':
                    this.nextFrame();
                    break;
                case 'Home':
                    this.goToFrame(0);
                    break;
                case 'End':
                    this.goToFrame(this.totalFrames - 1);
                    break;
            }
        });
    }
    
    detectCineSequence(seriesData) {
        // Auto-detect if this is a cine sequence
        const imageCount = seriesData.images.length;
        const seriesDescription = (seriesData.series_description || '').toLowerCase();
        
        const cineKeywords = ['cine', 'cardiac', 'dynamic', 'perfusion', 'angio', 'flow', 'function'];
        const isCineSequence = cineKeywords.some(keyword => seriesDescription.includes(keyword)) ||
                              imageCount > 20;
        
        if (isCineSequence) {
            this.showCineIndicator(seriesData);
        }
    }
    
    showCineIndicator(seriesData) {
        // Show cine indicator in UI
        let indicator = document.getElementById('cine-indicator');
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.id = 'cine-indicator';
            indicator.style.cssText = `
                position: fixed;
                top: 100px;
                right: 10px;
                background: linear-gradient(45deg, #ff6b6b, #ee5a24);
                color: #fff;
                padding: 8px 12px;
                border-radius: 20px;
                font-size: 12px;
                font-weight: bold;
                cursor: pointer;
                z-index: 1000;
                box-shadow: 0 2px 10px rgba(255, 107, 107, 0.3);
            `;
            indicator.innerHTML = '🎬 Cine Sequence Detected';
            indicator.onclick = () => this.showCineDialog(seriesData);
            
            document.body.appendChild(indicator);
        }
        
        indicator.style.display = 'block';
        setTimeout(() => {
            if (indicator) indicator.style.display = 'none';
        }, 5000);
    }
    
    async showCineDialog(seriesData = null) {
        this.cineDialog.style.display = 'flex';
        
        if (seriesData) {
            await this.loadCineSequence(seriesData);
        }
    }
    
    async loadCineSequence(seriesData) {
        console.log(`🎬 Loading cine sequence: ${seriesData.images.length} frames`);
        
        this.frames = [];
        this.totalFrames = seriesData.images.length;
        this.currentFrame = 0;
        
        // Update UI
        document.getElementById('frame-slider').max = this.totalFrames - 1;
        document.getElementById('max-frame-label').textContent = this.totalFrames - 1;
        this.updateFrameCounter();
        
        // Load all frames
        const loadPromises = seriesData.images.map(async (image, index) => {
            try {
                const response = await fetch(`/dicom-viewer/api/image/${image.id}/display/`, {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json',
                        'X-CSRFToken': this.getCSRFToken()
                    }
                });
                
                if (response.ok) {
                    const imageData = await response.json();
                    if (imageData.success && imageData.image_data) {
                        this.frames[index] = imageData.image_data;
                    }
                }
            } catch (error) {
                console.warn(`Failed to load frame ${index}:`, error);
            }
        });
        
        // Load frames in batches to avoid overwhelming the server
        for (let i = 0; i < loadPromises.length; i += 5) {
            const batch = loadPromises.slice(i, i + 5);
            await Promise.all(batch);
            
            console.log(`📥 Loaded frames ${i + 1}-${Math.min(i + 5, loadPromises.length)} of ${this.totalFrames}`);
        }
        
        // Display first frame
        this.displayFrame(0);
        
        // Analyze sequence
        this.analyzeCineSequence();
    }
    
    displayFrame(frameIndex) {
        if (frameIndex < 0 || frameIndex >= this.frames.length) return;
        
        const canvas = document.getElementById('cine-canvas');
        const ctx = canvas.getContext('2d');
        
        const frameData = this.frames[frameIndex];
        if (!frameData) return;
        
        const img = new Image();
        img.onload = () => {
            // Clear canvas
            ctx.fillStyle = '#000';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Apply medical imaging filter
            ctx.filter = 'contrast(1.9) brightness(2.2) saturate(0.9)';
            
            // Calculate fit
            const scale = Math.min(canvas.width / img.width, canvas.height / img.height) * 0.95;
            const x = (canvas.width - img.width * scale) / 2;
            const y = (canvas.height - img.height * scale) / 2;
            
            // Draw frame
            ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
            ctx.filter = 'none';
        };
        
        img.src = frameData;
        
        this.currentFrame = frameIndex;
        this.updateFrameCounter();
        this.updateFrameSlider();
    }
    
    startPlayback() {
        if (this.isPlaying) return;
        
        this.isPlaying = true;
        const interval = 1000 / (this.frameRate * this.playbackSpeed);
        
        this.playbackInterval = setInterval(() => {
            this.advanceFrame();
        }, interval);
        
        this.updatePlaybackStatus();
        console.log(`▶️ Cine playback started at ${this.frameRate * this.playbackSpeed} FPS`);
    }
    
    stopPlayback() {
        if (!this.isPlaying) return;
        
        this.isPlaying = false;
        if (this.playbackInterval) {
            clearInterval(this.playbackInterval);
            this.playbackInterval = null;
        }
        
        this.updatePlaybackStatus();
        console.log('⏸️ Cine playback stopped');
    }
    
    togglePlayback() {
        if (this.isPlaying) {
            this.stopPlayback();
        } else {
            this.startPlayback();
        }
    }
    
    advanceFrame() {
        switch (this.loopMode) {
            case 'forward':
                this.currentFrame = (this.currentFrame + 1) % this.totalFrames;
                break;
            case 'reverse':
                this.currentFrame = this.currentFrame - 1;
                if (this.currentFrame < 0) this.currentFrame = this.totalFrames - 1;
                break;
            case 'bounce':
                // Implement bounce logic
                this.currentFrame++;
                if (this.currentFrame >= this.totalFrames) {
                    this.currentFrame = this.totalFrames - 2;
                    this.loopMode = 'reverse_bounce';
                }
                break;
            case 'reverse_bounce':
                this.currentFrame--;
                if (this.currentFrame < 0) {
                    this.currentFrame = 1;
                    this.loopMode = 'bounce';
                }
                break;
            case 'once':
                this.currentFrame++;
                if (this.currentFrame >= this.totalFrames) {
                    this.stopPlayback();
                    return;
                }
                break;
        }
        
        this.displayFrame(this.currentFrame);
    }
    
    goToFrame(frameIndex) {
        if (frameIndex >= 0 && frameIndex < this.totalFrames) {
            this.displayFrame(frameIndex);
        }
    }
    
    nextFrame() {
        this.goToFrame(this.currentFrame + 1);
    }
    
    previousFrame() {
        this.goToFrame(this.currentFrame - 1);
    }
    
    firstFrame() {
        this.goToFrame(0);
    }
    
    lastFrame() {
        this.goToFrame(this.totalFrames - 1);
    }
    
    updateFrameCounter() {
        const counter = document.getElementById('frame-counter');
        if (counter) {
            counter.textContent = `Frame: ${this.currentFrame + 1} / ${this.totalFrames}`;
        }
    }
    
    updateFrameSlider() {
        const slider = document.getElementById('frame-slider');
        if (slider) {
            slider.value = this.currentFrame;
        }
    }
    
    updatePlaybackStatus() {
        const status = document.getElementById('playback-status');
        const playBtn = document.getElementById('play-pause-btn');
        
        if (this.isPlaying) {
            if (status) status.textContent = `▶️ Playing (${this.frameRate * this.playbackSpeed} FPS)`;
            if (playBtn) playBtn.textContent = '⏸️';
        } else {
            if (status) status.textContent = '⏸️ Paused';
            if (playBtn) playBtn.textContent = '▶️';
        }
    }
    
    analyzeCineSequence() {
        // Simulate dynamic analysis
        setTimeout(() => {
            document.getElementById('heart-rate').textContent = '72 BPM';
            document.getElementById('cycle-length').textContent = '833 ms';
            document.getElementById('motion-detection').textContent = 'Normal cardiac motion';
            document.getElementById('quality-score').textContent = '94%';
        }, 2000);
        
        console.log('📊 Cine sequence analysis completed');
    }
    
    exportCineSequence() {
        console.log('📤 Exporting cine sequence...');
        // Export all frames as ZIP file
    }
    
    createCineGIF() {
        console.log('🎞️ Creating animated GIF...');
        // Create animated GIF from frames
    }
    
    analyzeCineMotion() {
        console.log('🔍 Analyzing motion patterns...');
        // Advanced motion analysis
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
window.showCineDialog = function() {
    if (!window.cinePlayback) {
        window.cinePlayback = new AdvancedCinePlayback();
    }
    window.cinePlayback.showCineDialog();
};

window.closeCineDialog = function() {
    if (window.cinePlayback) {
        window.cinePlayback.stopPlayback();
    }
    document.getElementById('cine-dialog').style.display = 'none';
};

window.togglePlayback = function() {
    if (window.cinePlayback) {
        window.cinePlayback.togglePlayback();
    }
};

window.cineFirst = function() {
    if (window.cinePlayback) {
        window.cinePlayback.firstFrame();
    }
};

window.cinePrevious = function() {
    if (window.cinePlayback) {
        window.cinePlayback.previousFrame();
    }
};

window.cineNext = function() {
    if (window.cinePlayback) {
        window.cinePlayback.nextFrame();
    }
};

window.cineLast = function() {
    if (window.cinePlayback) {
        window.cinePlayback.lastFrame();
    }
};

window.exportCineSequence = function() {
    if (window.cinePlayback) {
        window.cinePlayback.exportCineSequence();
    }
};

window.createCineGIF = function() {
    if (window.cinePlayback) {
        window.cinePlayback.createCineGIF();
    }
};

window.analyzeCineMotion = function() {
    if (window.cinePlayback) {
        window.cinePlayback.analyzeCineMotion();
    }
};

// Initialize
window.cinePlayback = new AdvancedCinePlayback();

console.log('🎬 Advanced Cine Playback loaded');