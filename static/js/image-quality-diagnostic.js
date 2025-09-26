/**
 * Image Quality Diagnostic
 * Real-time verification that DICOM images display with good quality
 */

class ImageQualityDiagnostic {
    constructor() {
        this.qualityMetrics = {
            brightness: 0,
            contrast: 0,
            sharpness: 0,
            visibility: 0
        };
        
        this.init();
    }
    
    init() {
        this.createQualityIndicator();
        this.setupQualityMonitoring();
        console.log('🔍 Image Quality Diagnostic initialized');
    }
    
    createQualityIndicator() {
        const indicatorHTML = `
            <div id="quality-indicator" class="quality-indicator" style="display: none;">
                <div class="quality-header">📊 Image Quality</div>
                <div class="quality-metrics">
                    <div class="quality-metric">
                        <span>Brightness:</span>
                        <div class="quality-bar">
                            <div class="quality-fill" id="brightness-fill"></div>
                        </div>
                        <span id="brightness-value">-</span>
                    </div>
                    <div class="quality-metric">
                        <span>Contrast:</span>
                        <div class="quality-bar">
                            <div class="quality-fill" id="contrast-fill"></div>
                        </div>
                        <span id="contrast-value">-</span>
                    </div>
                    <div class="quality-metric">
                        <span>Sharpness:</span>
                        <div class="quality-bar">
                            <div class="quality-fill" id="sharpness-fill"></div>
                        </div>
                        <span id="sharpness-value">-</span>
                    </div>
                    <div class="quality-score">
                        Quality Score: <span id="overall-quality">-</span>
                    </div>
                </div>
                <button class="quality-toggle" onclick="toggleQualityIndicator()">Hide</button>
            </div>
        `;
        
        const styleHTML = `
            <style>
                .quality-indicator {
                    position: fixed;
                    top: 130px;
                    right: 10px;
                    background: rgba(0, 0, 0, 0.9);
                    border: 1px solid #333;
                    border-radius: 6px;
                    padding: 10px;
                    z-index: 1000;
                    width: 200px;
                    font-size: 11px;
                    color: #fff;
                }
                
                .quality-header {
                    text-align: center;
                    color: #00d4ff;
                    font-weight: bold;
                    margin-bottom: 8px;
                }
                
                .quality-metric {
                    display: flex;
                    align-items: center;
                    gap: 5px;
                    margin: 4px 0;
                }
                
                .quality-metric span:first-child {
                    width: 60px;
                    font-size: 10px;
                }
                
                .quality-metric span:last-child {
                    width: 30px;
                    text-align: right;
                    font-weight: bold;
                }
                
                .quality-bar {
                    flex: 1;
                    height: 8px;
                    background: #333;
                    border-radius: 4px;
                    overflow: hidden;
                }
                
                .quality-fill {
                    height: 100%;
                    background: linear-gradient(90deg, #ff4444, #ffaa00, #00ff88);
                    width: 0%;
                    transition: width 0.3s ease;
                }
                
                .quality-score {
                    text-align: center;
                    margin-top: 8px;
                    padding-top: 8px;
                    border-top: 1px solid #333;
                    color: #00ff88;
                    font-weight: bold;
                }
                
                .quality-toggle {
                    width: 100%;
                    background: #333;
                    border: 1px solid #555;
                    color: #fff;
                    padding: 4px;
                    border-radius: 3px;
                    cursor: pointer;
                    margin-top: 8px;
                    font-size: 10px;
                }
            </style>
        `;
        
        document.head.insertAdjacentHTML('beforeend', styleHTML);
        document.body.insertAdjacentHTML('beforeend', indicatorHTML);
    }
    
    setupQualityMonitoring() {
        // Monitor image quality when images are loaded
        document.addEventListener('studyLoaded', () => {
            setTimeout(() => this.analyzeCurrentImage(), 500);
        });
        
        document.addEventListener('imageLoaded', () => {
            setTimeout(() => this.analyzeCurrentImage(), 500);
        });
        
        // Monitor quality periodically
        setInterval(() => {
            this.analyzeCurrentImage();
        }, 5000);
    }
    
    analyzeCurrentImage() {
        const canvas = document.querySelector('#dicom-canvas, .dicom-canvas, #viewer-canvas');
        if (!canvas) return;
        
        try {
            const ctx = canvas.getContext('2d');
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            
            // Calculate quality metrics
            const metrics = this.calculateQualityMetrics(imageData);
            this.updateQualityDisplay(metrics);
            
        } catch (error) {
            console.warn('Quality analysis failed:', error);
        }
    }
    
    calculateQualityMetrics(imageData) {
        const data = imageData.data;
        const pixels = data.length / 4;
        
        let totalBrightness = 0;
        let minBrightness = 255;
        let maxBrightness = 0;
        let edgeStrength = 0;
        
        // Analyze pixels
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            
            // Calculate brightness (luminance)
            const brightness = 0.299 * r + 0.587 * g + 0.114 * b;
            totalBrightness += brightness;
            
            minBrightness = Math.min(minBrightness, brightness);
            maxBrightness = Math.max(maxBrightness, brightness);
        }
        
        const avgBrightness = totalBrightness / pixels;
        const brightnessRange = maxBrightness - minBrightness;
        
        // Calculate sharpness (simplified edge detection)
        const width = imageData.width;
        const height = imageData.height;
        
        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                const idx = (y * width + x) * 4;
                const current = data[idx];
                const right = data[idx + 4];
                const bottom = data[(y + 1) * width * 4 + x * 4];
                
                const gradX = Math.abs(right - current);
                const gradY = Math.abs(bottom - current);
                edgeStrength += Math.sqrt(gradX * gradX + gradY * gradY);
            }
        }
        
        const avgEdgeStrength = edgeStrength / (width * height);
        
        // Calculate quality scores (0-100)
        const brightnessScore = Math.min(100, (avgBrightness / 255) * 100);
        const contrastScore = Math.min(100, (brightnessRange / 255) * 100);
        const sharpnessScore = Math.min(100, (avgEdgeStrength / 50) * 100);
        
        // Overall visibility score
        const visibilityScore = (brightnessScore + contrastScore + sharpnessScore) / 3;
        
        return {
            brightness: Math.round(brightnessScore),
            contrast: Math.round(contrastScore),
            sharpness: Math.round(sharpnessScore),
            visibility: Math.round(visibilityScore)
        };
    }
    
    updateQualityDisplay(metrics) {
        this.qualityMetrics = metrics;
        
        // Update progress bars
        document.getElementById('brightness-fill').style.width = `${metrics.brightness}%`;
        document.getElementById('contrast-fill').style.width = `${metrics.contrast}%`;
        document.getElementById('sharpness-fill').style.width = `${metrics.sharpness}%`;
        
        // Update values
        document.getElementById('brightness-value').textContent = `${metrics.brightness}%`;
        document.getElementById('contrast-value').textContent = `${metrics.contrast}%`;
        document.getElementById('sharpness-value').textContent = `${metrics.sharpness}%`;
        document.getElementById('overall-quality').textContent = `${metrics.visibility}%`;
        
        // Color code the overall quality
        const qualityElement = document.getElementById('overall-quality');
        if (metrics.visibility >= 80) {
            qualityElement.style.color = '#00ff88'; // Excellent
        } else if (metrics.visibility >= 60) {
            qualityElement.style.color = '#ffaa00'; // Good
        } else {
            qualityElement.style.color = '#ff4444'; // Poor
        }
        
        // Show indicator if quality is analyzed
        document.getElementById('quality-indicator').style.display = 'block';
        
        // Log quality assessment
        if (metrics.visibility < 60) {
            console.warn(`⚠️ Image quality may be poor: ${metrics.visibility}% visibility`);
            this.suggestQualityImprovements(metrics);
        } else {
            console.log(`✅ Image quality good: ${metrics.visibility}% visibility`);
        }
    }
    
    suggestQualityImprovements(metrics) {
        const suggestions = [];
        
        if (metrics.brightness < 50) {
            suggestions.push('Increase brightness');
        }
        if (metrics.contrast < 50) {
            suggestions.push('Increase contrast');
        }
        if (metrics.sharpness < 40) {
            suggestions.push('Check image resolution');
        }
        
        if (suggestions.length > 0) {
            console.log('💡 Quality improvement suggestions:', suggestions);
        }
    }
    
    showQualityIndicator() {
        document.getElementById('quality-indicator').style.display = 'block';
    }
    
    hideQualityIndicator() {
        document.getElementById('quality-indicator').style.display = 'none';
    }
    
    getQualityReport() {
        return {
            metrics: this.qualityMetrics,
            timestamp: new Date().toISOString(),
            assessment: this.qualityMetrics.visibility >= 80 ? 'Excellent' :
                       this.qualityMetrics.visibility >= 60 ? 'Good' : 'Poor',
            recommendations: this.getQualityRecommendations()
        };
    }
    
    getQualityRecommendations() {
        const recommendations = [];
        
        if (this.qualityMetrics.brightness < 60) {
            recommendations.push('Consider increasing brightness for better visibility');
        }
        if (this.qualityMetrics.contrast < 60) {
            recommendations.push('Consider increasing contrast for better tissue differentiation');
        }
        if (this.qualityMetrics.sharpness < 50) {
            recommendations.push('Check image resolution and display settings');
        }
        
        return recommendations;
    }
}

// Global functions
window.toggleQualityIndicator = function() {
    const indicator = document.getElementById('quality-indicator');
    if (indicator) {
        const isVisible = indicator.style.display !== 'none';
        indicator.style.display = isVisible ? 'none' : 'block';
        
        const toggle = indicator.querySelector('.quality-toggle');
        if (toggle) {
            toggle.textContent = isVisible ? 'Show' : 'Hide';
        }
    }
};

window.showImageQuality = function() {
    if (!window.imageQualityDiagnostic) {
        window.imageQualityDiagnostic = new ImageQualityDiagnostic();
    }
    window.imageQualityDiagnostic.showQualityIndicator();
};

window.getImageQualityReport = function() {
    if (window.imageQualityDiagnostic) {
        return window.imageQualityDiagnostic.getQualityReport();
    }
    return null;
};

// Add quality toggle to toolbar
document.addEventListener('DOMContentLoaded', () => {
    const toolbar = document.querySelector('.toolbar, .dicom-toolbar');
    if (toolbar) {
        const qualityBtn = document.createElement('button');
        qualityBtn.className = 'tool-btn quality-btn';
        qualityBtn.innerHTML = '<i class="fas fa-chart-line"></i><span>Quality</span>';
        qualityBtn.title = 'Image Quality Monitor (Q)';
        qualityBtn.onclick = () => window.toggleQualityIndicator();
        
        toolbar.appendChild(qualityBtn);
    }
});

// Keyboard shortcut for quality indicator
document.addEventListener('keydown', (e) => {
    if (e.key === 'q' || e.key === 'Q') {
        if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
            window.toggleQualityIndicator();
        }
    }
});

// Initialize
window.imageQualityDiagnostic = new ImageQualityDiagnostic();

console.log('🔍 Image Quality Diagnostic loaded');