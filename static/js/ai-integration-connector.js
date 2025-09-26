/**
 * AI Integration Connector
 * Connects AI analysis to the real DICOM viewer
 */

class AIIntegrationConnector {
    constructor() {
        this.currentStudyId = null;
        this.analysisResults = {};
        this.aiDialog = null;
        this.init();
    }
    
    init() {
        this.createAIDialog();
        this.setupEventListeners();
        console.log('🤖 AI Integration Connector initialized');
    }
    
    createAIDialog() {
        const dialogHTML = `
            <div id="ai-dialog" class="modal-dialog" style="display: none;">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>AI Analysis Results</h3>
                        <button class="close-btn" onclick="closeAIDialog()">×</button>
                    </div>
                    <div class="modal-body">
                        <div id="ai-status" class="ai-status">
                            <div class="loading">🤖 Running AI analysis...</div>
                        </div>
                        <div id="ai-results" class="ai-results" style="display: none;">
                            <div class="ai-section">
                                <h4>Quality Assessment</h4>
                                <div id="quality-results"></div>
                            </div>
                            <div class="ai-section">
                                <h4>Findings</h4>
                                <div id="findings-results"></div>
                            </div>
                            <div class="ai-section">
                                <h4>Measurements</h4>
                                <div id="measurements-results"></div>
                            </div>
                        </div>
                        <div class="ai-actions">
                            <button class="btn btn-primary" onclick="exportAIReport()">Export Report</button>
                            <button class="btn btn-secondary" onclick="rerunAIAnalysis()">Re-analyze</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        const styleHTML = `
            <style>
                .ai-status {
                    text-align: center;
                    padding: 40px;
                    color: #00d4ff;
                }
                
                .ai-results {
                    display: grid;
                    gap: 20px;
                }
                
                .ai-section {
                    background: #2a2a2a;
                    padding: 15px;
                    border-radius: 6px;
                    border-left: 4px solid #00d4ff;
                }
                
                .ai-section h4 {
                    margin: 0 0 10px 0;
                    color: #00d4ff;
                }
                
                .ai-actions {
                    display: flex;
                    gap: 10px;
                    justify-content: center;
                    margin-top: 20px;
                }
                
                .finding-item {
                    background: #333;
                    padding: 8px;
                    margin: 5px 0;
                    border-radius: 4px;
                    border-left: 3px solid #00ff88;
                }
                
                .confidence-score {
                    float: right;
                    color: #00ff88;
                    font-weight: bold;
                }
            </style>
        `;
        
        document.head.insertAdjacentHTML('beforeend', styleHTML);
        document.body.insertAdjacentHTML('beforeend', dialogHTML);
        
        this.aiDialog = document.getElementById('ai-dialog');
    }
    
    setupEventListeners() {
        // Listen for study changes to trigger AI analysis
        document.addEventListener('studyLoaded', (event) => {
            if (event.detail && event.detail.id) {
                this.currentStudyId = event.detail.id;
                this.checkAIAnalysis(event.detail.id);
            }
        });
    }
    
    async checkAIAnalysis(studyId) {
        try {
            // Check if AI analysis exists for this study
            const response = await fetch(`/ai/api/study/${studyId}/analysis/`, {
                method: 'GET',
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                    'Accept': 'application/json',
                    'X-CSRFToken': this.getCSRFToken()
                },
                credentials: 'same-origin'
            });
            
            if (response.ok) {
                const analysisData = await response.json();
                this.analysisResults[studyId] = analysisData;
                
                // Show AI indicator if analysis is available
                this.showAIIndicator(analysisData);
            }
        } catch (error) {
            console.log('No AI analysis available for this study');
        }
    }
    
    showAIIndicator(analysisData) {
        // Add AI indicator to the UI
        let indicator = document.getElementById('ai-indicator');
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.id = 'ai-indicator';
            indicator.style.cssText = `
                position: fixed;
                top: 70px;
                right: 10px;
                background: linear-gradient(45deg, #00d4ff, #0099cc);
                color: #000;
                padding: 8px 12px;
                border-radius: 20px;
                font-size: 12px;
                font-weight: bold;
                cursor: pointer;
                z-index: 1000;
                box-shadow: 0 2px 10px rgba(0, 212, 255, 0.3);
            `;
            indicator.innerHTML = '🤖 AI Analysis Available';
            indicator.onclick = () => this.showAIResults();
            
            document.body.appendChild(indicator);
        }
        
        indicator.style.display = 'block';
    }
    
    showAIResults() {
        if (!this.currentStudyId || !this.analysisResults[this.currentStudyId]) {
            this.runAIAnalysis();
            return;
        }
        
        const results = this.analysisResults[this.currentStudyId];
        this.displayAIResults(results);
        this.aiDialog.style.display = 'flex';
    }
    
    async runAIAnalysis() {
        if (!this.currentStudyId) {
            console.warn('No study selected for AI analysis');
            return;
        }
        
        this.aiDialog.style.display = 'flex';
        document.getElementById('ai-status').style.display = 'block';
        document.getElementById('ai-results').style.display = 'none';
        
        try {
            console.log(`🤖 Running AI analysis for study ${this.currentStudyId}...`);
            
            const response = await fetch(`/ai/api/analyze/study/${this.currentStudyId}/`, {
                method: 'POST',
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                    'Accept': 'application/json',
                    'X-CSRFToken': this.getCSRFToken(),
                    'Content-Type': 'application/json'
                },
                credentials: 'same-origin',
                body: JSON.stringify({
                    analysis_types: ['quality_assessment', 'pathology_detection', 'report_generation']
                })
            });
            
            if (response.ok) {
                const results = await response.json();
                this.analysisResults[this.currentStudyId] = results;
                this.displayAIResults(results);
            } else {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
        } catch (error) {
            console.error('AI analysis failed:', error);
            this.showAIError(error.message);
        }
    }
    
    displayAIResults(results) {
        document.getElementById('ai-status').style.display = 'none';
        document.getElementById('ai-results').style.display = 'block';
        
        // Display quality assessment
        const qualityDiv = document.getElementById('quality-results');
        if (results.quality_assessment) {
            qualityDiv.innerHTML = `
                <div class="finding-item">
                    Image Quality Score: <span class="confidence-score">${(results.quality_assessment.score * 100).toFixed(1)}%</span>
                </div>
                <div class="finding-item">
                    Technical Adequacy: <span class="confidence-score">${results.quality_assessment.adequacy || 'Good'}</span>
                </div>
            `;
        }
        
        // Display findings
        const findingsDiv = document.getElementById('findings-results');
        if (results.findings && results.findings.length > 0) {
            findingsDiv.innerHTML = results.findings.map(finding => `
                <div class="finding-item">
                    ${finding.description}
                    <span class="confidence-score">${(finding.confidence * 100).toFixed(1)}%</span>
                </div>
            `).join('');
        } else {
            findingsDiv.innerHTML = '<div class="finding-item">No significant findings detected</div>';
        }
        
        // Display measurements
        const measurementsDiv = document.getElementById('measurements-results');
        if (results.measurements) {
            measurementsDiv.innerHTML = Object.entries(results.measurements).map(([key, value]) => `
                <div class="finding-item">
                    ${key}: <span class="confidence-score">${value}</span>
                </div>
            `).join('');
        } else {
            measurementsDiv.innerHTML = '<div class="finding-item">No automated measurements available</div>';
        }
    }
    
    showAIError(message) {
        document.getElementById('ai-status').innerHTML = `
            <div style="color: #ff4444;">
                ❌ AI Analysis Failed: ${message}
            </div>
        `;
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

// Global functions
window.showAIDialog = function() {
    if (!window.aiConnector) {
        window.aiConnector = new AIIntegrationConnector();
    }
    window.aiConnector.showAIResults();
};

window.closeAIDialog = function() {
    const dialog = document.getElementById('ai-dialog');
    if (dialog) {
        dialog.style.display = 'none';
    }
};

window.runAIAnalysis = function() {
    if (!window.aiConnector) {
        window.aiConnector = new AIIntegrationConnector();
    }
    window.aiConnector.runAIAnalysis();
};

window.exportAIReport = function() {
    console.log('📤 Exporting AI report...');
    // Implement AI report export
};

window.rerunAIAnalysis = function() {
    if (window.aiConnector) {
        window.aiConnector.runAIAnalysis();
    }
};

// Initialize AI connector
window.aiConnector = new AIIntegrationConnector();

console.log('🤖 AI Integration Connector loaded');