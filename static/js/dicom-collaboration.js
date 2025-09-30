/**
 * Real-time DICOM Collaboration System
 * Multi-user medical image review and annotation
 */

class DicomCollaboration {
    constructor(viewer, options = {}) {
        this.viewer = viewer;
        this.version = '1.0.0';
        this.options = {
            websocketUrl: options.websocketUrl || `ws://${window.location.host}/ws/dicom-collaboration/`,
            userId: options.userId || null,
            userName: options.userName || 'Anonymous',
            sessionId: options.sessionId || this.generateSessionId(),
            ...options
        };
        
        this.websocket = null;
        this.isConnected = false;
        this.participants = new Map();
        this.sharedAnnotations = new Map();
        this.cursors = new Map();
        this.chatMessages = [];
        
        this.init();
        console.log('🤝 DICOM Collaboration System initialized');
    }
    
    generateSessionId() {
        return 'session_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
    }
    
    async init() {
        try {
            await this.connectWebSocket();
            this.setupCollaborationUI();
            this.setupEventListeners();
            this.setupCursorTracking();
            
        } catch (error) {
            console.error('Failed to initialize collaboration:', error);
            this.showNotification('Collaboration features unavailable', 'warning');
        }
    }
    
    // ============================================================================
    // WEBSOCKET CONNECTION
    // ============================================================================
    
    async connectWebSocket() {
        return new Promise((resolve, reject) => {
            try {
                this.websocket = new WebSocket(this.options.websocketUrl);
                
                this.websocket.onopen = () => {
                    console.log('🔗 Collaboration WebSocket connected');
                    this.isConnected = true;
                    this.sendMessage('join_session', {
                        sessionId: this.options.sessionId,
                        userId: this.options.userId,
                        userName: this.options.userName
                    });
                    resolve();
                };
                
                this.websocket.onmessage = (event) => {
                    this.handleMessage(JSON.parse(event.data));
                };
                
                this.websocket.onclose = () => {
                    console.log('🔌 Collaboration WebSocket disconnected');
                    this.isConnected = false;
                    this.handleDisconnection();
                };
                
                this.websocket.onerror = (error) => {
                    console.error('WebSocket error:', error);
                    reject(error);
                };
                
            } catch (error) {
                reject(error);
            }
        });
    }
    
    sendMessage(type, data) {
        if (this.isConnected && this.websocket) {
            this.websocket.send(JSON.stringify({
                type: type,
                data: data,
                timestamp: Date.now(),
                userId: this.options.userId,
                sessionId: this.options.sessionId
            }));
        }
    }
    
    handleMessage(message) {
        const { type, data, userId, timestamp } = message;
        
        switch (type) {
            case 'participant_joined':
                this.handleParticipantJoined(data);
                break;
            case 'participant_left':
                this.handleParticipantLeft(data);
                break;
            case 'cursor_moved':
                this.handleCursorMoved(data, userId);
                break;
            case 'annotation_added':
                this.handleAnnotationAdded(data, userId);
                break;
            case 'annotation_updated':
                this.handleAnnotationUpdated(data, userId);
                break;
            case 'annotation_deleted':
                this.handleAnnotationDeleted(data, userId);
                break;
            case 'viewport_changed':
                this.handleViewportChanged(data, userId);
                break;
            case 'chat_message':
                this.handleChatMessage(data, userId, timestamp);
                break;
            case 'pointer_highlight':
                this.handlePointerHighlight(data, userId);
                break;
            case 'session_sync':
                this.handleSessionSync(data);
                break;
        }
    }
    
    handleDisconnection() {
        this.showNotification('Collaboration disconnected. Attempting to reconnect...', 'warning');
        
        // Attempt to reconnect
        setTimeout(() => {
            if (!this.isConnected) {
                this.connectWebSocket().catch(error => {
                    console.error('Reconnection failed:', error);
                });
            }
        }, 3000);
    }
    
    // ============================================================================
    // PARTICIPANT MANAGEMENT
    // ============================================================================
    
    handleParticipantJoined(data) {
        const { userId, userName, userInfo } = data;
        this.participants.set(userId, {
            id: userId,
            name: userName,
            joinedAt: Date.now(),
            isActive: true,
            cursor: { x: 0, y: 0, visible: false },
            color: this.generateUserColor(userId),
            ...userInfo
        });
        
        this.updateParticipantsList();
        this.showNotification(`${userName} joined the session`, 'info');
        console.log(`👤 ${userName} joined collaboration session`);
    }
    
    handleParticipantLeft(data) {
        const { userId, userName } = data;
        this.participants.delete(userId);
        this.cursors.delete(userId);
        
        this.updateParticipantsList();
        this.showNotification(`${userName} left the session`, 'info');
        console.log(`👋 ${userName} left collaboration session`);
    }
    
    generateUserColor(userId) {
        // Generate consistent color for user based on their ID
        const colors = [
            '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', 
            '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F'
        ];
        
        const hash = userId.split('').reduce((a, b) => {
            a = ((a << 5) - a) + b.charCodeAt(0);
            return a & a;
        }, 0);
        
        return colors[Math.abs(hash) % colors.length];
    }
    
    updateParticipantsList() {
        const participantsList = document.getElementById('collaborationParticipants');
        if (!participantsList) return;
        
        participantsList.innerHTML = '';
        
        this.participants.forEach(participant => {
            const participantElement = document.createElement('div');
            participantElement.className = 'collaboration-participant';
            participantElement.innerHTML = `
                <div class="participant-avatar" style="background-color: ${participant.color}">
                    ${participant.name.charAt(0).toUpperCase()}
                </div>
                <div class="participant-info">
                    <div class="participant-name">${participant.name}</div>
                    <div class="participant-status">
                        <span class="status-indicator ${participant.isActive ? 'active' : 'inactive'}"></span>
                        ${participant.isActive ? 'Active' : 'Away'}
                    </div>
                </div>
            `;
            
            participantsList.appendChild(participantElement);
        });
    }
    
    // ============================================================================
    // CURSOR TRACKING
    // ============================================================================
    
    setupCursorTracking() {
        const canvas = document.getElementById('dicomCanvas');
        if (!canvas) return;
        
        canvas.addEventListener('mousemove', (e) => {
            const rect = canvas.getBoundingClientRect();
            const x = (e.clientX - rect.left) / rect.width;
            const y = (e.clientY - rect.top) / rect.height;
            
            this.sendMessage('cursor_moved', { x, y, visible: true });
        });
        
        canvas.addEventListener('mouseleave', () => {
            this.sendMessage('cursor_moved', { visible: false });
        });
    }
    
    handleCursorMoved(data, userId) {
        if (userId === this.options.userId) return; // Don't show own cursor
        
        const participant = this.participants.get(userId);
        if (!participant) return;
        
        // Update cursor position
        this.cursors.set(userId, {
            x: data.x,
            y: data.y,
            visible: data.visible,
            color: participant.color,
            name: participant.name
        });
        
        this.renderCursors();
    }
    
    renderCursors() {
        // Remove existing cursors
        document.querySelectorAll('.collaboration-cursor').forEach(cursor => {
            cursor.remove();
        });
        
        const canvas = document.getElementById('dicomCanvas');
        if (!canvas) return;
        
        const rect = canvas.getBoundingClientRect();
        
        this.cursors.forEach((cursor, userId) => {
            if (!cursor.visible) return;
            
            const cursorElement = document.createElement('div');
            cursorElement.className = 'collaboration-cursor';
            cursorElement.style.cssText = `
                position: fixed;
                left: ${rect.left + cursor.x * rect.width}px;
                top: ${rect.top + cursor.y * rect.height}px;
                width: 20px;
                height: 20px;
                pointer-events: none;
                z-index: 10000;
                transition: all 0.1s ease;
            `;
            
            cursorElement.innerHTML = `
                <svg width="20" height="20" viewBox="0 0 20 20">
                    <path d="M0,0 L0,16 L6,12 L9,18 L12,16 L9,10 L16,10 Z" 
                          fill="${cursor.color}" stroke="white" stroke-width="1"/>
                </svg>
                <div class="cursor-label" style="
                    position: absolute;
                    left: 22px;
                    top: 0px;
                    background: ${cursor.color};
                    color: white;
                    padding: 2px 6px;
                    border-radius: 3px;
                    font-size: 11px;
                    white-space: nowrap;
                ">${cursor.name}</div>
            `;
            
            document.body.appendChild(cursorElement);
        });
    }
    
    // ============================================================================
    // SHARED ANNOTATIONS
    // ============================================================================
    
    shareAnnotation(annotation) {
        const sharedAnnotation = {
            id: this.generateAnnotationId(),
            type: annotation.type,
            points: annotation.points,
            text: annotation.text,
            measurements: annotation.measurements,
            style: annotation.style,
            createdBy: this.options.userId,
            createdAt: Date.now(),
            imageId: this.viewer.currentImageId
        };
        
        this.sendMessage('annotation_added', sharedAnnotation);
        this.sharedAnnotations.set(sharedAnnotation.id, sharedAnnotation);
        this.renderSharedAnnotations();
    }
    
    handleAnnotationAdded(data, userId) {
        if (userId === this.options.userId) return; // Don't duplicate own annotations
        
        this.sharedAnnotations.set(data.id, data);
        this.renderSharedAnnotations();
        
        const participant = this.participants.get(userId);
        if (participant) {
            this.showNotification(`${participant.name} added an annotation`, 'info');
        }
    }
    
    handleAnnotationUpdated(data, userId) {
        if (this.sharedAnnotations.has(data.id)) {
            this.sharedAnnotations.set(data.id, { ...this.sharedAnnotations.get(data.id), ...data });
            this.renderSharedAnnotations();
        }
    }
    
    handleAnnotationDeleted(data, userId) {
        this.sharedAnnotations.delete(data.id);
        this.renderSharedAnnotations();
    }
    
    renderSharedAnnotations() {
        if (!this.viewer || !this.viewer.currentImageId) return;
        
        // Clear existing shared annotations
        document.querySelectorAll('.shared-annotation').forEach(annotation => {
            annotation.remove();
        });
        
        // Render annotations for current image
        this.sharedAnnotations.forEach(annotation => {
            if (annotation.imageId === this.viewer.currentImageId) {
                this.renderSingleAnnotation(annotation);
            }
        });
    }
    
    renderSingleAnnotation(annotation) {
        const canvas = document.getElementById('dicomCanvas');
        if (!canvas) return;
        
        const rect = canvas.getBoundingClientRect();
        const participant = this.participants.get(annotation.createdBy);
        const color = participant ? participant.color : '#FF6B6B';
        
        const annotationElement = document.createElement('div');
        annotationElement.className = 'shared-annotation';
        annotationElement.dataset.annotationId = annotation.id;
        
        if (annotation.type === 'measurement' && annotation.points.length >= 2) {
            // Render measurement line
            const start = annotation.points[0];
            const end = annotation.points[1];
            
            const startX = rect.left + start.x * rect.width;
            const startY = rect.top + start.y * rect.height;
            const endX = rect.left + end.x * rect.width;
            const endY = rect.top + end.y * rect.height;
            
            annotationElement.innerHTML = `
                <svg style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 9999;">
                    <line x1="${startX}" y1="${startY}" x2="${endX}" y2="${endY}" 
                          stroke="${color}" stroke-width="2" stroke-dasharray="5,5"/>
                    <circle cx="${startX}" cy="${startY}" r="4" fill="${color}"/>
                    <circle cx="${endX}" cy="${endY}" r="4" fill="${color}"/>
                </svg>
            `;
            
            // Add measurement text
            if (annotation.measurements && annotation.measurements.length) {
                const midX = (startX + endX) / 2;
                const midY = (startY + endY) / 2;
                
                const textElement = document.createElement('div');
                textElement.style.cssText = `
                    position: fixed;
                    left: ${midX}px;
                    top: ${midY - 20}px;
                    background: ${color};
                    color: white;
                    padding: 2px 6px;
                    border-radius: 3px;
                    font-size: 12px;
                    pointer-events: none;
                    z-index: 10000;
                    transform: translateX(-50%);
                `;
                textElement.textContent = `${annotation.measurements.value}${annotation.measurements.unit}`;
                document.body.appendChild(textElement);
            }
        }
        
        document.body.appendChild(annotationElement);
    }
    
    generateAnnotationId() {
        return 'annotation_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
    }
    
    // ============================================================================
    // VIEWPORT SYNCHRONIZATION
    // ============================================================================
    
    syncViewport() {
        if (!this.viewer) return;
        
        const viewportData = {
            scale: this.viewer.viewport.scale,
            translation: this.viewer.viewport.translation,
            windowWidth: this.viewer.viewport.windowWidth,
            windowCenter: this.viewer.viewport.windowCenter,
            imageId: this.viewer.currentImageId,
            imageIndex: this.viewer.currentImageIndex
        };
        
        this.sendMessage('viewport_changed', viewportData);
    }
    
    handleViewportChanged(data, userId) {
        if (userId === this.options.userId) return;
        
        const participant = this.participants.get(userId);
        if (!participant) return;
        
        // Show viewport sync notification
        this.showViewportSyncOption(participant.name, data);
    }
    
    showViewportSyncOption(userName, viewportData) {
        const notification = document.createElement('div');
        notification.className = 'viewport-sync-notification';
        notification.innerHTML = `
            <div class="sync-message">
                ${userName} changed the view. 
                <button onclick="window.dicomCollaboration.applySyncedViewport(${JSON.stringify(viewportData).replace(/"/g, '&quot;')})">
                    Sync View
                </button>
                <button onclick="this.parentElement.parentElement.remove()">Dismiss</button>
            </div>
        `;
        
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: rgba(0, 0, 0, 0.9);
            color: white;
            padding: 15px;
            border-radius: 8px;
            z-index: 10001;
            max-width: 300px;
        `;
        
        document.body.appendChild(notification);
        
        // Auto-remove after 10 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 10000);
    }
    
    applySyncedViewport(viewportData) {
        if (!this.viewer) return;
        
        // Apply viewport settings
        if (viewportData.scale) {
            this.viewer.setZoom(viewportData.scale);
        }
        
        if (viewportData.translation) {
            this.viewer.setPan(viewportData.translation.x, viewportData.translation.y);
        }
        
        if (viewportData.windowWidth && viewportData.windowCenter) {
            this.viewer.applyWindowLevel(viewportData.windowWidth, viewportData.windowCenter);
        }
        
        // Switch to same image if different
        if (viewportData.imageId && viewportData.imageId !== this.viewer.currentImageId) {
            if (viewportData.imageIndex !== undefined) {
                this.viewer.goToImage(viewportData.imageIndex);
            }
        }
        
        // Remove notification
        document.querySelectorAll('.viewport-sync-notification').forEach(n => n.remove());
    }
    
    // ============================================================================
    // CHAT SYSTEM
    // ============================================================================
    
    sendChatMessage(message) {
        if (!message.trim()) return;
        
        const chatData = {
            message: message.trim(),
            userName: this.options.userName,
            timestamp: Date.now()
        };
        
        this.sendMessage('chat_message', chatData);
    }
    
    handleChatMessage(data, userId, timestamp) {
        const participant = this.participants.get(userId);
        const messageData = {
            id: `msg_${timestamp}_${userId}`,
            userId: userId,
            userName: data.userName || (participant ? participant.name : 'Unknown'),
            message: data.message,
            timestamp: timestamp,
            color: participant ? participant.color : '#666666'
        };
        
        this.chatMessages.push(messageData);
        this.renderChatMessage(messageData);
        
        // Limit chat history
        if (this.chatMessages.length > 100) {
            this.chatMessages.shift();
        }
    }
    
    renderChatMessage(messageData) {
        const chatContainer = document.getElementById('collaborationChat');
        if (!chatContainer) return;
        
        const messageElement = document.createElement('div');
        messageElement.className = 'chat-message';
        messageElement.innerHTML = `
            <div class="message-header">
                <span class="message-author" style="color: ${messageData.color}">
                    ${messageData.userName}
                </span>
                <span class="message-time">
                    ${new Date(messageData.timestamp).toLocaleTimeString()}
                </span>
            </div>
            <div class="message-content">${this.escapeHtml(messageData.message)}</div>
        `;
        
        chatContainer.appendChild(messageElement);
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }
    
    // ============================================================================
    // POINTER HIGHLIGHTING
    // ============================================================================
    
    highlightPoint(x, y, duration = 2000) {
        const highlightData = {
            x: x,
            y: y,
            duration: duration,
            userName: this.options.userName
        };
        
        this.sendMessage('pointer_highlight', highlightData);
    }
    
    handlePointerHighlight(data, userId) {
        const participant = this.participants.get(userId);
        if (!participant) return;
        
        const canvas = document.getElementById('dicomCanvas');
        if (!canvas) return;
        
        const rect = canvas.getBoundingClientRect();
        const x = rect.left + data.x * rect.width;
        const y = rect.top + data.y * rect.height;
        
        // Create highlight effect
        const highlight = document.createElement('div');
        highlight.className = 'collaboration-highlight';
        highlight.style.cssText = `
            position: fixed;
            left: ${x}px;
            top: ${y}px;
            width: 40px;
            height: 40px;
            border: 3px solid ${participant.color};
            border-radius: 50%;
            pointer-events: none;
            z-index: 10000;
            transform: translate(-50%, -50%);
            animation: highlightPulse 0.6s ease-out;
        `;
        
        // Add CSS animation
        if (!document.getElementById('collaborationHighlightStyles')) {
            const style = document.createElement('style');
            style.id = 'collaborationHighlightStyles';
            style.textContent = `
                @keyframes highlightPulse {
                    0% { transform: translate(-50%, -50%) scale(0.5); opacity: 1; }
                    50% { transform: translate(-50%, -50%) scale(1.2); opacity: 0.8; }
                    100% { transform: translate(-50%, -50%) scale(2); opacity: 0; }
                }
            `;
            document.head.appendChild(style);
        }
        
        document.body.appendChild(highlight);
        
        // Remove after animation
        setTimeout(() => {
            if (highlight.parentNode) {
                highlight.remove();
            }
        }, 600);
        
        // Show notification
        this.showNotification(`${data.userName} highlighted a point`, 'info');
    }
    
    // ============================================================================
    // UI SETUP
    // ============================================================================
    
    setupCollaborationUI() {
        this.createCollaborationPanel();
        this.addCollaborationStyles();
    }
    
    createCollaborationPanel() {
        const panel = document.createElement('div');
        panel.id = 'collaborationPanel';
        panel.className = 'collaboration-panel';
        panel.innerHTML = `
            <div class="collaboration-header">
                <h3>🤝 Collaboration</h3>
                <button class="panel-toggle" onclick="this.parentElement.parentElement.classList.toggle('collapsed')">−</button>
            </div>
            
            <div class="collaboration-content">
                <div class="participants-section">
                    <h4>Participants (${this.participants.size})</h4>
                    <div id="collaborationParticipants" class="participants-list"></div>
                </div>
                
                <div class="chat-section">
                    <h4>Chat</h4>
                    <div id="collaborationChat" class="chat-messages"></div>
                    <div class="chat-input">
                        <input type="text" id="chatInput" placeholder="Type a message..." 
                               onkeypress="if(event.key==='Enter') window.dicomCollaboration.sendChatFromInput()">
                        <button onclick="window.dicomCollaboration.sendChatFromInput()">Send</button>
                    </div>
                </div>
                
                <div class="collaboration-actions">
                    <button onclick="window.dicomCollaboration.syncViewport()">📍 Share View</button>
                    <button onclick="window.dicomCollaboration.toggleCursorSharing()">👆 Toggle Cursor</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(panel);
        
        // Make panel draggable
        this.makeDraggable(panel);
    }
    
    sendChatFromInput() {
        const input = document.getElementById('chatInput');
        if (input && input.value.trim()) {
            this.sendChatMessage(input.value);
            input.value = '';
        }
    }
    
    addCollaborationStyles() {
        const style = document.createElement('style');
        style.id = 'collaborationStyles';
        style.textContent = `
            .collaboration-panel {
                position: fixed;
                top: 20px;
                right: 20px;
                width: 300px;
                background: rgba(0, 0, 0, 0.9);
                color: white;
                border-radius: 10px;
                padding: 15px;
                z-index: 10000;
                backdrop-filter: blur(10px);
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
                max-height: 80vh;
                overflow-y: auto;
            }
            
            .collaboration-panel.collapsed .collaboration-content {
                display: none;
            }
            
            .collaboration-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 15px;
                border-bottom: 1px solid rgba(255, 255, 255, 0.2);
                padding-bottom: 10px;
            }
            
            .collaboration-header h3 {
                margin: 0;
                font-size: 16px;
            }
            
            .panel-toggle {
                background: none;
                border: none;
                color: white;
                font-size: 20px;
                cursor: pointer;
                padding: 0;
                width: 24px;
                height: 24px;
            }
            
            .participants-section, .chat-section {
                margin-bottom: 15px;
            }
            
            .participants-section h4, .chat-section h4 {
                margin: 0 0 10px 0;
                font-size: 14px;
                color: #ccc;
            }
            
            .collaboration-participant {
                display: flex;
                align-items: center;
                gap: 10px;
                padding: 5px 0;
            }
            
            .participant-avatar {
                width: 32px;
                height: 32px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: bold;
                font-size: 14px;
            }
            
            .participant-info {
                flex: 1;
            }
            
            .participant-name {
                font-size: 13px;
                font-weight: 500;
            }
            
            .participant-status {
                font-size: 11px;
                color: #aaa;
                display: flex;
                align-items: center;
                gap: 5px;
            }
            
            .status-indicator {
                width: 8px;
                height: 8px;
                border-radius: 50%;
                background: #666;
            }
            
            .status-indicator.active {
                background: #4CAF50;
            }
            
            .chat-messages {
                height: 150px;
                overflow-y: auto;
                border: 1px solid rgba(255, 255, 255, 0.2);
                border-radius: 5px;
                padding: 10px;
                margin-bottom: 10px;
                background: rgba(255, 255, 255, 0.05);
            }
            
            .chat-message {
                margin-bottom: 10px;
                font-size: 12px;
            }
            
            .message-header {
                display: flex;
                justify-content: space-between;
                margin-bottom: 2px;
            }
            
            .message-author {
                font-weight: bold;
            }
            
            .message-time {
                color: #aaa;
                font-size: 10px;
            }
            
            .message-content {
                color: #eee;
            }
            
            .chat-input {
                display: flex;
                gap: 5px;
            }
            
            .chat-input input {
                flex: 1;
                padding: 8px;
                border: 1px solid rgba(255, 255, 255, 0.2);
                border-radius: 4px;
                background: rgba(255, 255, 255, 0.1);
                color: white;
                font-size: 12px;
            }
            
            .chat-input input::placeholder {
                color: #aaa;
            }
            
            .chat-input button {
                padding: 8px 12px;
                background: #007bff;
                border: none;
                border-radius: 4px;
                color: white;
                font-size: 12px;
                cursor: pointer;
            }
            
            .collaboration-actions {
                display: flex;
                gap: 5px;
                flex-wrap: wrap;
            }
            
            .collaboration-actions button {
                padding: 8px 12px;
                background: rgba(255, 255, 255, 0.1);
                border: 1px solid rgba(255, 255, 255, 0.2);
                border-radius: 4px;
                color: white;
                font-size: 11px;
                cursor: pointer;
                flex: 1;
            }
            
            .collaboration-actions button:hover {
                background: rgba(255, 255, 255, 0.2);
            }
        `;
        
        document.head.appendChild(style);
    }
    
    // ============================================================================
    // UTILITY METHODS
    // ============================================================================
    
    makeDraggable(element) {
        let isDragging = false;
        let startX, startY, startLeft, startTop;
        
        const header = element.querySelector('.collaboration-header');
        if (!header) return;
        
        header.style.cursor = 'move';
        
        header.addEventListener('mousedown', (e) => {
            if (e.target.classList.contains('panel-toggle')) return;
            
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            startLeft = element.offsetLeft;
            startTop = element.offsetTop;
            
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        });
        
        function handleMouseMove(e) {
            if (!isDragging) return;
            
            const deltaX = e.clientX - startX;
            const deltaY = e.clientY - startY;
            
            element.style.left = `${startLeft + deltaX}px`;
            element.style.top = `${startTop + deltaY}px`;
            element.style.right = 'auto';
        }
        
        function handleMouseUp() {
            isDragging = false;
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        }
    }
    
    setupEventListeners() {
        // Listen for viewer events to sync with other participants
        if (this.viewer) {
            // Override viewer methods to broadcast changes
            const originalSetZoom = this.viewer.setZoom.bind(this.viewer);
            this.viewer.setZoom = (scale) => {
                originalSetZoom(scale);
                this.syncViewport();
            };
            
            const originalSetPan = this.viewer.setPan.bind(this.viewer);
            this.viewer.setPan = (x, y) => {
                originalSetPan(x, y);
                this.syncViewport();
            };
        }
    }
    
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `collaboration-notification notification-${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: ${type === 'error' ? '#ff4444' : type === 'warning' ? '#ffaa00' : '#007bff'};
            color: white;
            padding: 10px 20px;
            border-radius: 5px;
            z-index: 10002;
            font-size: 14px;
            animation: slideInDown 0.3s ease;
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.animation = 'slideOutUp 0.3s ease';
                setTimeout(() => notification.remove(), 300);
            }
        }, 3000);
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    handleSessionSync(data) {
        // Handle full session synchronization
        if (data.participants) {
            this.participants.clear();
            data.participants.forEach(participant => {
                this.participants.set(participant.id, participant);
            });
            this.updateParticipantsList();
        }
        
        if (data.annotations) {
            this.sharedAnnotations.clear();
            data.annotations.forEach(annotation => {
                this.sharedAnnotations.set(annotation.id, annotation);
            });
            this.renderSharedAnnotations();
        }
    }
    
    disconnect() {
        if (this.websocket) {
            this.websocket.close();
        }
        
        // Clean up UI
        const panel = document.getElementById('collaborationPanel');
        if (panel) panel.remove();
        
        document.querySelectorAll('.collaboration-cursor').forEach(cursor => cursor.remove());
        document.querySelectorAll('.shared-annotation').forEach(annotation => annotation.remove());
    }
}

// Export for global access
if (typeof window !== 'undefined') {
    window.DicomCollaboration = DicomCollaboration;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = DicomCollaboration;
}

console.log('🤝 DICOM Collaboration System loaded successfully');