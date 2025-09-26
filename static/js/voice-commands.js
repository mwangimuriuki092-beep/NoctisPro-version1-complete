/**
 * Voice Commands System
 * Hands-free operation for DICOM viewer during procedures
 */

class VoiceCommands {
    constructor() {
        this.recognition = null;
        this.isListening = false;
        this.isEnabled = false;
        this.commands = this.getVoiceCommands();
        this.confidence = 0.7; // Minimum confidence threshold
        
        this.init();
    }
    
    init() {
        this.setupSpeechRecognition();
        this.createVoiceUI();
        console.log('🎤 Voice Commands initialized');
    }
    
    setupSpeechRecognition() {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            console.warn('⚠️ Speech recognition not supported in this browser');
            return;
        }
        
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        this.recognition = new SpeechRecognition();
        
        // Configure recognition
        this.recognition.continuous = true;
        this.recognition.interimResults = false;
        this.recognition.lang = 'en-US';
        this.recognition.maxAlternatives = 3;
        
        // Event handlers
        this.recognition.onstart = () => {
            this.isListening = true;
            this.updateVoiceStatus('🎤 Listening...');
            console.log('🎤 Voice recognition started');
        };
        
        this.recognition.onend = () => {
            this.isListening = false;
            if (this.isEnabled) {
                // Restart if still enabled
                setTimeout(() => {
                    if (this.isEnabled) {
                        this.startListening();
                    }
                }, 1000);
            } else {
                this.updateVoiceStatus('🔇 Voice commands disabled');
            }
        };
        
        this.recognition.onresult = (event) => {
            this.handleSpeechResult(event);
        };
        
        this.recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            this.updateVoiceStatus(`❌ Error: ${event.error}`);
        };
    }
    
    getVoiceCommands() {
        return {
            // Navigation commands
            'next image': () => this.executeCommand('nextImage'),
            'previous image': () => this.executeCommand('previousImage'),
            'first image': () => this.executeCommand('firstImage'),
            'last image': () => this.executeCommand('lastImage'),
            
            // Zoom commands
            'zoom in': () => this.executeCommand('zoomIn'),
            'zoom out': () => this.executeCommand('zoomOut'),
            'fit to window': () => this.executeCommand('fitToWindow'),
            'reset view': () => this.executeCommand('resetView'),
            'actual size': () => this.executeCommand('actualSize'),
            
            // Window/Level commands
            'lung window': () => this.executeCommand('applyPreset', 'ct_lung'),
            'bone window': () => this.executeCommand('applyPreset', 'ct_bone'),
            'soft tissue window': () => this.executeCommand('applyPreset', 'ct_soft_tissue'),
            'brain window': () => this.executeCommand('applyPreset', 'ct_brain'),
            'liver window': () => this.executeCommand('applyPreset', 'ct_liver'),
            
            // Tool commands
            'measure distance': () => this.executeCommand('setTool', 'measure'),
            'measure angle': () => this.executeCommand('setTool', 'angle'),
            'measure area': () => this.executeCommand('setTool', 'area'),
            'hounsfield units': () => this.executeCommand('setTool', 'hounsfield'),
            'window level': () => this.executeCommand('setTool', 'windowing'),
            'zoom tool': () => this.executeCommand('setTool', 'zoom'),
            'pan tool': () => this.executeCommand('setTool', 'pan'),
            
            // Image manipulation
            'invert image': () => this.executeCommand('invertImage'),
            'rotate image': () => this.executeCommand('rotateImage'),
            'flip image': () => this.executeCommand('flipImage'),
            
            // Advanced features
            'show mpr': () => this.executeCommand('showMPR'),
            'show 3d': () => this.executeCommand('show3D'),
            'run ai analysis': () => this.executeCommand('runAI'),
            'start cine': () => this.executeCommand('startCine'),
            'stop cine': () => this.executeCommand('stopCine'),
            
            // Comparison
            'compare studies': () => this.executeCommand('showComparison'),
            'show prior': () => this.executeCommand('showPrior'),
            
            // Export/Print
            'print image': () => this.executeCommand('printImage'),
            'export image': () => this.executeCommand('exportImage'),
            
            // System commands
            'clear measurements': () => this.executeCommand('clearMeasurements'),
            'save measurements': () => this.executeCommand('saveMeasurements'),
            'show preferences': () => this.executeCommand('showPreferences'),
            
            // Emergency commands
            'emergency stop': () => this.executeCommand('emergencyStop'),
            'reset system': () => this.executeCommand('resetSystem')
        };
    }
    
    createVoiceUI() {
        const voiceHTML = `
            <div id="voice-control-panel" class="voice-panel" style="display: none;">
                <div class="voice-header">
                    <h4>🎤 Voice Commands</h4>
                    <button class="voice-toggle" id="voice-toggle" onclick="toggleVoiceCommands()">Enable</button>
                </div>
                <div class="voice-status" id="voice-status">Voice commands disabled</div>
                <div class="voice-commands-list">
                    <div class="command-category">
                        <strong>Navigation:</strong> "next image", "previous image", "first image", "last image"
                    </div>
                    <div class="command-category">
                        <strong>Zoom:</strong> "zoom in", "zoom out", "fit to window", "reset view"
                    </div>
                    <div class="command-category">
                        <strong>Windows:</strong> "lung window", "bone window", "soft tissue window", "brain window"
                    </div>
                    <div class="command-category">
                        <strong>Tools:</strong> "measure distance", "measure angle", "hounsfield units"
                    </div>
                    <div class="command-category">
                        <strong>Advanced:</strong> "show mpr", "run ai analysis", "compare studies"
                    </div>
                    <div class="command-category">
                        <strong>Emergency:</strong> "emergency stop", "reset system"
                    </div>
                </div>
                <div class="voice-confidence">
                    <label>Confidence Threshold: 
                        <input type="range" id="confidence-slider" min="0.3" max="0.9" step="0.1" value="0.7">
                        <span id="confidence-value">70%</span>
                    </label>
                </div>
            </div>
        `;
        
        const styleHTML = `
            <style>
                .voice-panel {
                    position: fixed;
                    bottom: 20px;
                    left: 20px;
                    background: rgba(0, 0, 0, 0.9);
                    border: 1px solid #333;
                    border-radius: 8px;
                    padding: 15px;
                    max-width: 300px;
                    z-index: 1000;
                    color: #fff;
                }
                
                .voice-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 10px;
                }
                
                .voice-header h4 {
                    margin: 0;
                    color: #00d4ff;
                }
                
                .voice-toggle {
                    background: #333;
                    border: 1px solid #555;
                    color: #fff;
                    padding: 4px 8px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 12px;
                }
                
                .voice-toggle.active {
                    background: #00d4ff;
                    color: #000;
                }
                
                .voice-status {
                    background: #2a2a2a;
                    padding: 8px;
                    border-radius: 4px;
                    text-align: center;
                    margin-bottom: 10px;
                    font-size: 12px;
                }
                
                .voice-status.listening {
                    background: #2a4a2a;
                    color: #00ff88;
                    animation: voicePulse 1.5s infinite;
                }
                
                @keyframes voicePulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.6; }
                }
                
                .voice-commands-list {
                    max-height: 200px;
                    overflow-y: auto;
                    margin-bottom: 10px;
                }
                
                .command-category {
                    margin-bottom: 8px;
                    font-size: 11px;
                    line-height: 1.3;
                }
                
                .command-category strong {
                    color: #00d4ff;
                }
                
                .voice-confidence {
                    font-size: 12px;
                }
                
                .voice-confidence label {
                    display: flex;
                    align-items: center;
                    gap: 5px;
                    color: #ccc;
                }
                
                .voice-confidence input {
                    flex: 1;
                }
                
                .voice-confidence span {
                    color: #00ff88;
                    font-weight: bold;
                }
            </style>
        `;
        
        document.head.insertAdjacentHTML('beforeend', styleHTML);
        document.body.insertAdjacentHTML('beforeend', voiceHTML);
        
        this.setupVoiceUI();
    }
    
    setupVoiceUI() {
        // Confidence slider
        const confidenceSlider = document.getElementById('confidence-slider');
        const confidenceValue = document.getElementById('confidence-value');
        
        if (confidenceSlider && confidenceValue) {
            confidenceSlider.addEventListener('input', (e) => {
                this.confidence = parseFloat(e.target.value);
                confidenceValue.textContent = `${Math.round(this.confidence * 100)}%`;
            });
        }
        
        // Add voice toggle to main toolbar
        this.addVoiceToggleToToolbar();
    }
    
    addVoiceToggleToToolbar() {
        const toolbar = document.querySelector('.toolbar, .dicom-toolbar');
        if (toolbar) {
            const voiceBtn = document.createElement('button');
            voiceBtn.className = 'tool-btn voice-control-btn';
            voiceBtn.innerHTML = '<i class="fas fa-microphone"></i><span>Voice</span>';
            voiceBtn.title = 'Voice Commands (V)';
            voiceBtn.onclick = () => this.toggleVoicePanel();
            
            toolbar.appendChild(voiceBtn);
        }
    }
    
    toggleVoicePanel() {
        const panel = document.getElementById('voice-control-panel');
        if (panel) {
            panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
        }
    }
    
    enableVoiceCommands() {
        if (!this.recognition) {
            alert('Speech recognition not supported in this browser');
            return;
        }
        
        this.isEnabled = true;
        this.startListening();
        
        const toggle = document.getElementById('voice-toggle');
        if (toggle) {
            toggle.textContent = 'Disable';
            toggle.classList.add('active');
        }
        
        console.log('🎤 Voice commands enabled');
    }
    
    disableVoiceCommands() {
        this.isEnabled = false;
        this.stopListening();
        
        const toggle = document.getElementById('voice-toggle');
        if (toggle) {
            toggle.textContent = 'Enable';
            toggle.classList.remove('active');
        }
        
        this.updateVoiceStatus('🔇 Voice commands disabled');
        console.log('🔇 Voice commands disabled');
    }
    
    startListening() {
        if (this.recognition && !this.isListening) {
            try {
                this.recognition.start();
            } catch (error) {
                console.error('Failed to start voice recognition:', error);
            }
        }
    }
    
    stopListening() {
        if (this.recognition && this.isListening) {
            try {
                this.recognition.stop();
            } catch (error) {
                console.error('Failed to stop voice recognition:', error);
            }
        }
    }
    
    handleSpeechResult(event) {
        const results = event.results;
        const lastResult = results[results.length - 1];
        
        if (lastResult.isFinal) {
            const transcript = lastResult[0].transcript.toLowerCase().trim();
            const confidence = lastResult[0].confidence;
            
            console.log(`🎤 Voice input: "${transcript}" (confidence: ${(confidence * 100).toFixed(1)}%)`);
            
            if (confidence >= this.confidence) {
                this.processVoiceCommand(transcript);
            } else {
                console.log(`⚠️ Low confidence, ignoring command`);
                this.updateVoiceStatus(`⚠️ Low confidence: ${transcript}`);
            }
        }
    }
    
    processVoiceCommand(transcript) {
        // Find matching command
        const matchedCommand = this.findMatchingCommand(transcript);
        
        if (matchedCommand) {
            this.updateVoiceStatus(`✅ Executing: ${matchedCommand.phrase}`);
            
            try {
                matchedCommand.action();
                console.log(`✅ Voice command executed: ${matchedCommand.phrase}`);
            } catch (error) {
                console.error('Voice command execution failed:', error);
                this.updateVoiceStatus(`❌ Command failed: ${matchedCommand.phrase}`);
            }
        } else {
            console.log(`❓ Unknown voice command: ${transcript}`);
            this.updateVoiceStatus(`❓ Unknown command: ${transcript}`);
        }
    }
    
    findMatchingCommand(transcript) {
        // Direct match first
        if (this.commands[transcript]) {
            return { phrase: transcript, action: this.commands[transcript] };
        }
        
        // Fuzzy matching
        for (const [phrase, action] of Object.entries(this.commands)) {
            if (this.isCommandMatch(transcript, phrase)) {
                return { phrase, action };
            }
        }
        
        return null;
    }
    
    isCommandMatch(transcript, command) {
        // Simple fuzzy matching
        const transcriptWords = transcript.split(' ');
        const commandWords = command.split(' ');
        
        // Check if all command words are in transcript
        return commandWords.every(word => 
            transcriptWords.some(tWord => 
                tWord.includes(word) || word.includes(tWord)
            )
        );
    }
    
    executeCommand(action, parameter = null) {
        switch (action) {
            case 'nextImage':
                this.navigateImage(1);
                break;
            case 'previousImage':
                this.navigateImage(-1);
                break;
            case 'firstImage':
                this.navigateImage('first');
                break;
            case 'lastImage':
                this.navigateImage('last');
                break;
            case 'zoomIn':
                if (window.dicomConnector) window.dicomConnector.zoomIn();
                break;
            case 'zoomOut':
                if (window.dicomConnector) window.dicomConnector.zoomOut();
                break;
            case 'fitToWindow':
                if (window.dicomConnector) window.dicomConnector.fitToWindow();
                break;
            case 'resetView':
                if (window.dicomConnector) window.dicomConnector.resetView();
                break;
            case 'actualSize':
                if (window.workingDicomCanvas) window.workingDicomCanvas.viewport.scale = 1.0;
                break;
            case 'applyPreset':
                if (window.applyPreset) window.applyPreset(parameter);
                break;
            case 'setTool':
                if (window.dicomConnector) window.dicomConnector.setTool(parameter);
                break;
            case 'invertImage':
                if (window.dicomConnector) window.dicomConnector.invertImage();
                break;
            case 'rotateImage':
                if (window.dicomConnector) window.dicomConnector.rotateImage();
                break;
            case 'flipImage':
                if (window.dicomConnector) window.dicomConnector.flipImage();
                break;
            case 'showMPR':
                if (window.showMPRDialog) window.showMPRDialog();
                break;
            case 'show3D':
                if (window.dicomConnector) window.dicomConnector.show3D();
                break;
            case 'runAI':
                if (window.runAIAnalysis) window.runAIAnalysis();
                break;
            case 'startCine':
                if (window.showCineDialog) window.showCineDialog();
                break;
            case 'stopCine':
                if (window.cinePlayback) window.cinePlayback.stopPlayback();
                break;
            case 'showComparison':
                if (window.showComparisonDialog) window.showComparisonDialog();
                break;
            case 'printImage':
                if (window.showPrintDialog) window.showPrintDialog();
                break;
            case 'exportImage':
                if (window.showExportDialog) window.showExportDialog();
                break;
            case 'clearMeasurements':
                if (window.advancedMeasurements) window.advancedMeasurements.clearAllMeasurements();
                break;
            case 'showPreferences':
                if (window.showPreferencesDialog) window.showPreferencesDialog();
                break;
            case 'emergencyStop':
                this.emergencyStop();
                break;
            case 'resetSystem':
                if (window.errorHandler) window.errorHandler.resetAllComponents();
                break;
        }
    }
    
    navigateImage(direction) {
        // Navigate through series images
        if (window.dicomCanvasFix && window.dicomCanvasFix.currentSeries) {
            const series = window.dicomCanvasFix.currentSeries;
            const images = series.images || [];
            
            if (images.length === 0) return;
            
            let currentIndex = 0;
            if (window.dicomCanvasFix.currentImage) {
                currentIndex = images.findIndex(img => img.id === window.dicomCanvasFix.currentImage.id);
            }
            
            let newIndex;
            switch (direction) {
                case 1: // next
                    newIndex = (currentIndex + 1) % images.length;
                    break;
                case -1: // previous
                    newIndex = currentIndex - 1;
                    if (newIndex < 0) newIndex = images.length - 1;
                    break;
                case 'first':
                    newIndex = 0;
                    break;
                case 'last':
                    newIndex = images.length - 1;
                    break;
                default:
                    return;
            }
            
            if (window.dicomCanvasFix.loadImage) {
                window.dicomCanvasFix.loadImage(images[newIndex].id);
            }
        }
    }
    
    emergencyStop() {
        // Emergency stop all operations
        this.disableVoiceCommands();
        
        if (window.cinePlayback) {
            window.cinePlayback.stopPlayback();
        }
        
        // Close all dialogs
        document.querySelectorAll('.modal-dialog').forEach(dialog => {
            dialog.style.display = 'none';
        });
        
        // Reset to windowing tool
        if (window.dicomConnector) {
            window.dicomConnector.setTool('windowing');
        }
        
        console.log('🚨 EMERGENCY STOP executed');
        this.updateVoiceStatus('🚨 Emergency stop executed');
    }
    
    updateVoiceStatus(message) {
        const status = document.getElementById('voice-status');
        if (status) {
            status.textContent = message;
            status.className = 'voice-status';
            
            if (message.includes('Listening')) {
                status.classList.add('listening');
            }
        }
        
        // Auto-clear status after 3 seconds
        setTimeout(() => {
            if (status && status.textContent === message) {
                status.textContent = this.isEnabled ? '🎤 Voice commands enabled' : '🔇 Voice commands disabled';
                status.className = 'voice-status';
            }
        }, 3000);
    }
}

// Global functions
window.toggleVoiceCommands = function() {
    if (!window.voiceCommands) {
        window.voiceCommands = new VoiceCommands();
    }
    
    if (window.voiceCommands.isEnabled) {
        window.voiceCommands.disableVoiceCommands();
    } else {
        window.voiceCommands.enableVoiceCommands();
    }
};

window.showVoicePanel = function() {
    const panel = document.getElementById('voice-control-panel');
    if (panel) {
        panel.style.display = 'block';
    }
};

window.hideVoicePanel = function() {
    const panel = document.getElementById('voice-control-panel');
    if (panel) {
        panel.style.display = 'none';
    }
};

// Keyboard shortcut to toggle voice commands
document.addEventListener('keydown', (e) => {
    if (e.key === 'v' && e.ctrlKey) {
        e.preventDefault();
        window.toggleVoiceCommands();
    }
});

// Initialize
window.voiceCommands = new VoiceCommands();

console.log('🎤 Voice Commands System loaded');