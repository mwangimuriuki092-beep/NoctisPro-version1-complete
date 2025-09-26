/**
 * World-Class DICOM Viewer Integration
 * Integrates world-class canvas performance with existing DICOM viewer functionality
 */

class DicomViewerWorldClassIntegration {
    constructor() {
        this.worldClassCanvas = null;
        this.legacyCanvas = null;
        this.performanceMode = 'auto'; // auto, world-class, legacy
        this.currentStudy = null;
        this.currentSeries = null;
        this.currentImage = null;
        
        // Performance benchmarks for world-class status
        this.worldClassBenchmarks = {
            maxRenderTime: 16.67, // 60 FPS target
            minFrameRate: 30,
            maxMemoryUsage: 512, // MB
            maxLoadTime: 100, // ms
            minCacheHitRatio: 0.85
        };
        
        this.performanceHistory = {
            renderTimes: [],
            loadTimes: [],
            frameRates: [],
            memoryUsage: []
        };
        
        this.init();
    }
    
    init() {
        console.log('🌟 Initializing World-Class DICOM Viewer Integration...');
        
        this.detectCapabilities();
        this.initializeCanvas();
        this.setupPerformanceMonitoring();
        this.setupEventIntegration();
        this.setupUI();
        
        console.log('✅ World-Class DICOM Viewer Integration ready');
    }
    
    detectCapabilities() {
        const capabilities = {
            webgl: this.detectWebGL(),
            webgl2: this.detectWebGL2(),
            offscreenCanvas: typeof OffscreenCanvas !== 'undefined',
            webWorkers: typeof Worker !== 'undefined',
            performanceAPI: 'performance' in window && 'mark' in performance,
            memoryAPI: 'memory' in performance,
            highDPI: window.devicePixelRatio > 1,
            touchSupport: 'ontouchstart' in window,
            pointerEvents: 'PointerEvent' in window
        };
        
        // Determine optimal performance mode
        const score = Object.values(capabilities).filter(Boolean).length;
        
        if (score >= 7) {
            this.performanceMode = 'world-class';
            console.log('🚀 World-class performance mode enabled');
        } else if (score >= 4) {
            this.performanceMode = 'enhanced';
            console.log('⚡ Enhanced performance mode enabled');
        } else {
            this.performanceMode = 'legacy';
            console.log('📱 Legacy compatibility mode enabled');
        }
        
        this.capabilities = capabilities;
        return capabilities;
    }
    
    detectWebGL() {
        try {
            const canvas = document.createElement('canvas');
            return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
        } catch (e) {
            return false;
        }
    }
    
    detectWebGL2() {
        try {
            const canvas = document.createElement('canvas');
            return !!canvas.getContext('webgl2');
        } catch (e) {
            return false;
        }
    }
    
    initializeCanvas() {
        if (this.performanceMode === 'world-class' || this.performanceMode === 'enhanced') {
            this.initWorldClassCanvas();
        } else {
            this.initLegacyCanvas();
        }
        
        // Always keep legacy canvas as fallback
        this.initLegacyCanvas();
    }
    
    initWorldClassCanvas() {
        try {
            const config = {
                enableGPUAcceleration: this.capabilities.webgl,
                enableWebGL: this.capabilities.webgl,
                enableOffscreenCanvas: this.capabilities.offscreenCanvas,
                enableMultiThreading: this.capabilities.webWorkers,
                enableMedicalGradeRendering: true,
                enableDICOMCompliance: true,
                enableAIEnhancement: true,
                enableRealTimeProcessing: true,
                maxCacheSize: 2048
            };
            
            this.worldClassCanvas = new WorldClassDicomCanvas(config);
            
            // Set up event forwarding
            this.setupWorldClassEventForwarding();
            
            console.log('✅ World-class canvas initialized');
            
        } catch (error) {
            console.warn('⚠️ World-class canvas initialization failed, falling back to legacy:', error);
            this.performanceMode = 'legacy';
            this.worldClassCanvas = null;
        }
    }
    
    initLegacyCanvas() {
        // Initialize existing canvas system as fallback
        if (typeof DicomCanvasFix !== 'undefined') {
            this.legacyCanvas = new DicomCanvasFix();
            console.log('✅ Legacy canvas initialized as fallback');
        }
    }
    
    setupWorldClassEventForwarding() {
        if (!this.worldClassCanvas) return;
        
        // Forward events to maintain compatibility
        this.worldClassCanvas.on('imageLoaded', (data) => {
            this.emit('studyLoaded', data);
        });
        
        this.worldClassCanvas.on('renderComplete', (data) => {
            this.updatePerformanceMetrics(data);
        });
        
        this.worldClassCanvas.on('renderError', (error) => {
            console.warn('World-class render error, falling back to legacy:', error);
            this.fallbackToLegacy();
        });
    }
    
    setupPerformanceMonitoring() {
        // Real-time performance monitoring
        setInterval(() => {
            this.monitorPerformance();
        }, 1000);
        
        // Adaptive performance adjustment
        setInterval(() => {
            this.adaptivePerformanceAdjustment();
        }, 5000);
    }
    
    monitorPerformance() {
        let metrics = null;
        
        if (this.worldClassCanvas) {
            metrics = this.worldClassCanvas.getPerformanceMetrics();
        } else if (this.legacyCanvas) {
            metrics = this.getLegacyPerformanceMetrics();
        }
        
        if (metrics) {
            this.updatePerformanceHistory(metrics);
            this.evaluateWorldClassStatus(metrics);
        }
    }
    
    getLegacyPerformanceMetrics() {
        // Simulate performance metrics for legacy canvas
        return {
            avgRenderTime: 20, // Assume higher render time for legacy
            avgFrameRate: 30,
            interactions: this.legacyCanvas?.performanceMetrics?.interactions || 0,
            cacheSize: this.legacyCanvas?.imageCache?.size || 0,
            cacheHitRatio: 0.7 // Assume lower cache hit ratio
        };
    }
    
    updatePerformanceHistory(metrics) {
        if (metrics.avgRenderTime) {
            this.performanceHistory.renderTimes.push(metrics.avgRenderTime);
            if (this.performanceHistory.renderTimes.length > 100) {
                this.performanceHistory.renderTimes.shift();
            }
        }
        
        if (metrics.avgFrameRate) {
            this.performanceHistory.frameRates.push(metrics.avgFrameRate);
            if (this.performanceHistory.frameRates.length > 100) {
                this.performanceHistory.frameRates.shift();
            }
        }
        
        // Store memory usage if available
        if (performance.memory) {
            const memoryMB = performance.memory.usedJSHeapSize / (1024 * 1024);
            this.performanceHistory.memoryUsage.push(memoryMB);
            if (this.performanceHistory.memoryUsage.length > 100) {
                this.performanceHistory.memoryUsage.shift();
            }
        }
    }
    
    evaluateWorldClassStatus(metrics) {
        const benchmarks = this.worldClassBenchmarks;
        const status = {
            renderTime: metrics.avgRenderTime <= benchmarks.maxRenderTime,
            frameRate: metrics.avgFrameRate >= benchmarks.minFrameRate,
            memoryUsage: true, // Will be calculated if memory API available
            cacheEfficiency: metrics.cacheHitRatio >= benchmarks.minCacheHitRatio
        };
        
        // Check memory usage if available
        if (performance.memory) {
            const memoryMB = performance.memory.usedJSHeapSize / (1024 * 1024);
            status.memoryUsage = memoryMB <= benchmarks.maxMemoryUsage;
        }
        
        const worldClassScore = Object.values(status).filter(Boolean).length / Object.keys(status).length;
        
        // Update UI with world-class status
        this.updateWorldClassStatusUI(worldClassScore, status);
        
        // Log world-class achievement
        if (worldClassScore >= 0.8) {
            console.log('🌟 WORLD-CLASS PERFORMANCE ACHIEVED!', {
                score: `${Math.round(worldClassScore * 100)}%`,
                metrics: {
                    renderTime: `${metrics.avgRenderTime?.toFixed(2)}ms`,
                    frameRate: `${metrics.avgFrameRate?.toFixed(1)}fps`,
                    cacheHitRatio: `${(metrics.cacheHitRatio * 100)?.toFixed(1)}%`
                }
            });
        }
    }
    
    adaptivePerformanceAdjustment() {
        if (!this.worldClassCanvas) return;
        
        const avgRenderTime = this.getAverageRenderTime();
        const avgFrameRate = this.getAverageFrameRate();
        
        // Adjust quality based on performance
        if (avgRenderTime > 20 || avgFrameRate < 25) {
            // Reduce quality for better performance
            this.worldClassCanvas.config.enableAIEnhancement = false;
            this.worldClassCanvas.config.enableAntiAliasing = false;
            console.log('📉 Performance adjustment: Reduced quality for better frame rate');
        } else if (avgRenderTime < 10 && avgFrameRate > 45) {
            // Increase quality when performance allows
            this.worldClassCanvas.config.enableAIEnhancement = true;
            this.worldClassCanvas.config.enableAntiAliasing = true;
            console.log('📈 Performance adjustment: Increased quality');
        }
    }
    
    getAverageRenderTime() {
        const times = this.performanceHistory.renderTimes;
        if (times.length === 0) return 0;
        return times.reduce((a, b) => a + b) / times.length;
    }
    
    getAverageFrameRate() {
        const rates = this.performanceHistory.frameRates;
        if (rates.length === 0) return 0;
        return rates.reduce((a, b) => a + b) / rates.length;
    }
    
    setupEventIntegration() {
        // Integrate with existing DICOM viewer events
        document.addEventListener('studyLoaded', (event) => {
            this.handleStudyLoaded(event.detail);
        });
        
        document.addEventListener('imageSelected', (event) => {
            this.handleImageSelected(event.detail);
        });
        
        // Handle view button clicks
        document.addEventListener('click', (event) => {
            if (event.target.classList.contains('view-btn') || 
                event.target.closest('.view-btn')) {
                event.preventDefault();
                const studyId = event.target.dataset.studyId || 
                               event.target.closest('[data-study-id]')?.dataset.studyId;
                if (studyId) {
                    this.loadStudy(studyId);
                }
            }
        });
    }
    
    setupUI() {
        this.createPerformanceIndicator();
        this.createWorldClassBadge();
        this.setupToolbarIntegration();
    }
    
    createPerformanceIndicator() {
        // Create performance indicator in the UI
        const indicator = document.createElement('div');
        indicator.id = 'world-class-performance-indicator';
        indicator.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 8px 12px;
            border-radius: 6px;
            font-family: monospace;
            font-size: 12px;
            z-index: 10000;
            display: none;
        `;
        
        document.body.appendChild(indicator);
        this.performanceIndicator = indicator;
    }
    
    createWorldClassBadge() {
        // Create world-class achievement badge
        const badge = document.createElement('div');
        badge.id = 'world-class-badge';
        badge.innerHTML = '🌟 WORLD-CLASS PACS';
        badge.style.cssText = `
            position: fixed;
            top: 50px;
            right: 10px;
            background: linear-gradient(45deg, #FFD700, #FFA500);
            color: #000;
            padding: 6px 10px;
            border-radius: 20px;
            font-weight: bold;
            font-size: 11px;
            z-index: 10000;
            display: none;
            box-shadow: 0 2px 10px rgba(255, 215, 0, 0.5);
            animation: worldClassPulse 2s infinite;
        `;
        
        // Add CSS animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes worldClassPulse {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.05); }
            }
        `;
        document.head.appendChild(style);
        
        document.body.appendChild(badge);
        this.worldClassBadge = badge;
    }
    
    setupToolbarIntegration() {
        // Add world-class toggle to toolbar
        const toolbar = document.querySelector('.dicom-toolbar') || 
                       document.querySelector('.viewer-toolbar') ||
                       document.querySelector('#toolbar');
        
        if (toolbar) {
            const toggle = document.createElement('button');
            toggle.innerHTML = '🌟 World-Class';
            toggle.className = 'btn btn-sm btn-outline-primary world-class-toggle';
            toggle.title = 'Toggle World-Class Performance Mode';
            toggle.onclick = () => this.togglePerformanceMode();
            
            toolbar.appendChild(toggle);
            this.worldClassToggle = toggle;
        }
    }
    
    togglePerformanceMode() {
        if (this.performanceMode === 'world-class') {
            this.performanceMode = 'legacy';
            this.worldClassToggle.innerHTML = '📱 Legacy';
            this.worldClassToggle.classList.remove('btn-outline-primary');
            this.worldClassToggle.classList.add('btn-outline-secondary');
        } else {
            this.performanceMode = 'world-class';
            this.worldClassToggle.innerHTML = '🌟 World-Class';
            this.worldClassToggle.classList.remove('btn-outline-secondary');
            this.worldClassToggle.classList.add('btn-outline-primary');
            
            if (!this.worldClassCanvas) {
                this.initWorldClassCanvas();
            }
        }
        
        console.log(`Performance mode switched to: ${this.performanceMode}`);
    }
    
    updateWorldClassStatusUI(score, status) {
        // Update performance indicator
        if (this.performanceIndicator) {
            const avgRenderTime = this.getAverageRenderTime();
            const avgFrameRate = this.getAverageFrameRate();
            
            this.performanceIndicator.innerHTML = `
                FPS: ${avgFrameRate.toFixed(1)} | 
                Render: ${avgRenderTime.toFixed(1)}ms | 
                Score: ${Math.round(score * 100)}%
            `;
            
            // Color based on performance
            if (score >= 0.8) {
                this.performanceIndicator.style.background = 'rgba(0, 255, 0, 0.8)';
                this.performanceIndicator.style.color = '#000';
            } else if (score >= 0.6) {
                this.performanceIndicator.style.background = 'rgba(255, 255, 0, 0.8)';
                this.performanceIndicator.style.color = '#000';
            } else {
                this.performanceIndicator.style.background = 'rgba(255, 0, 0, 0.8)';
                this.performanceIndicator.style.color = '#fff';
            }
            
            this.performanceIndicator.style.display = 'block';
        }
        
        // Show/hide world-class badge
        if (this.worldClassBadge) {
            this.worldClassBadge.style.display = score >= 0.8 ? 'block' : 'none';
        }
    }
    
    // Image loading and display methods
    async loadStudy(studyId) {
        const startTime = performance.now();
        
        try {
            console.log(`🔄 Loading study ${studyId} with world-class performance...`);
            
            // Use world-class canvas if available
            if (this.worldClassCanvas && this.performanceMode === 'world-class') {
                await this.loadStudyWorldClass(studyId);
            } else {
                await this.loadStudyLegacy(studyId);
            }
            
            const loadTime = performance.now() - startTime;
            this.performanceHistory.loadTimes.push(loadTime);
            
            console.log(`✅ Study loaded in ${loadTime.toFixed(2)}ms`);
            
        } catch (error) {
            console.error('Failed to load study:', error);
            // Fallback to legacy if world-class fails
            if (this.performanceMode === 'world-class') {
                console.log('🔄 Falling back to legacy canvas...');
                await this.loadStudyLegacy(studyId);
            }
        }
    }
    
    async loadStudyWorldClass(studyId) {
        // Load study data
        const response = await fetch(`/dicom-viewer/api/study/${studyId}/data/`, {
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
        
        const studyData = await response.json();
        this.currentStudy = studyData;
        
        // Load first series and image with world-class canvas
        if (studyData.series && studyData.series.length > 0) {
            const firstSeries = studyData.series[0];
            await this.loadSeriesWorldClass(firstSeries.id);
        }
        
        // Dispatch event
        document.dispatchEvent(new CustomEvent('studyLoaded', {
            detail: studyData
        }));
    }
    
    async loadSeriesWorldClass(seriesId) {
        const response = await fetch(`/dicom-viewer/series/${seriesId}/images/`, {
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
        
        const seriesData = await response.json();
        this.currentSeries = seriesData;
        
        // Load first image with world-class rendering
        if (seriesData.images && seriesData.images.length > 0) {
            await this.loadImageWorldClass(seriesData.images[0].id);
        }
    }
    
    async loadImageWorldClass(imageId) {
        const response = await fetch(`/dicom-viewer/image/${imageId}/`, {
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
        
        const imageData = await response.json();
        
        // Load image with world-class canvas
        if (imageData.image_url) {
            await this.worldClassCanvas.loadImage(imageData.image_url, {
                id: imageId,
                metadata: imageData
            });
        }
        
        this.currentImage = imageData;
    }
    
    async loadStudyLegacy(studyId) {
        // Fallback to legacy canvas loading
        if (this.legacyCanvas && this.legacyCanvas.loadStudy) {
            await this.legacyCanvas.loadStudy(studyId);
        }
    }
    
    fallbackToLegacy() {
        console.log('🔄 Falling back to legacy canvas due to error');
        this.performanceMode = 'legacy';
        
        if (this.worldClassToggle) {
            this.worldClassToggle.innerHTML = '📱 Legacy (Auto)';
            this.worldClassToggle.classList.remove('btn-outline-primary');
            this.worldClassToggle.classList.add('btn-outline-warning');
        }
        
        // Hide world-class indicators
        if (this.worldClassBadge) {
            this.worldClassBadge.style.display = 'none';
        }
    }
    
    handleStudyLoaded(studyData) {
        this.currentStudy = studyData;
    }
    
    handleImageSelected(imageData) {
        this.currentImage = imageData;
    }
    
    getCSRFToken() {
        // Try multiple ways to get CSRF token
        const metaToken = document.querySelector('meta[name="csrf-token"]');
        if (metaToken) return metaToken.getAttribute('content');
        
        const cookieToken = document.cookie.split(';')
            .find(row => row.startsWith('csrftoken='));
        if (cookieToken) return cookieToken.split('=')[1];
        
        const inputToken = document.querySelector('input[name="csrfmiddlewaretoken"]');
        if (inputToken) return inputToken.value;
        
        return '';
    }
    
    // Event system
    emit(event, data) {
        document.dispatchEvent(new CustomEvent(event, { detail: data }));
    }
    
    // Public API methods
    getPerformanceReport() {
        const avgRenderTime = this.getAverageRenderTime();
        const avgFrameRate = this.getAverageFrameRate();
        const avgMemoryUsage = this.performanceHistory.memoryUsage.length > 0 ?
            this.performanceHistory.memoryUsage.reduce((a, b) => a + b) / this.performanceHistory.memoryUsage.length : 0;
        
        return {
            mode: this.performanceMode,
            capabilities: this.capabilities,
            performance: {
                avgRenderTime,
                avgFrameRate,
                avgMemoryUsage,
                totalInteractions: this.worldClassCanvas?.performanceMetrics?.interactions || 0
            },
            worldClassStatus: {
                renderTime: avgRenderTime <= this.worldClassBenchmarks.maxRenderTime,
                frameRate: avgFrameRate >= this.worldClassBenchmarks.minFrameRate,
                memoryUsage: avgMemoryUsage <= this.worldClassBenchmarks.maxMemoryUsage
            },
            benchmark: this.worldClassBenchmarks
        };
    }
    
    enablePerformanceDebug() {
        // Show performance indicators
        if (this.performanceIndicator) {
            this.performanceIndicator.style.display = 'block';
        }
        
        // Log performance data
        setInterval(() => {
            console.log('🔍 Performance Debug:', this.getPerformanceReport());
        }, 5000);
    }
    
    disablePerformanceDebug() {
        // Hide performance indicators
        if (this.performanceIndicator) {
            this.performanceIndicator.style.display = 'none';
        }
    }
}

// Initialize the world-class integration
let worldClassDicomViewer = null;

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        worldClassDicomViewer = new DicomViewerWorldClassIntegration();
    });
} else {
    worldClassDicomViewer = new DicomViewerWorldClassIntegration();
}

// Export for global access
window.DicomViewerWorldClassIntegration = DicomViewerWorldClassIntegration;
window.worldClassDicomViewer = worldClassDicomViewer;

// Console commands for debugging
window.enableDicomPerformanceDebug = () => worldClassDicomViewer?.enablePerformanceDebug();
window.disableDicomPerformanceDebug = () => worldClassDicomViewer?.disablePerformanceDebug();
window.getDicomPerformanceReport = () => worldClassDicomViewer?.getPerformanceReport();

console.log('🌟 World-Class DICOM Viewer Integration loaded and ready!');