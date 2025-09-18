/**
 * NoctisPro WebSocket Client for HTTPS/WSS Support
 * Handles chat and notifications with automatic reconnection
 */

class NoctisWebSocketClient {
    constructor() {
        this.chatSocket = null;
        this.notificationSocket = null;
        this.reconnectInterval = 3000; // 3 seconds
        this.maxReconnectAttempts = 10;
        this.reconnectAttempts = 0;
        this.isConnected = false;
        this.userId = null;
        this.roomId = null;
        
        // Get protocol based on current page
        this.wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        this.wsHost = window.location.host;
        
        this.bindEvents();
    }
    
    /**
     * Initialize chat WebSocket connection
     */
    initChatSocket(roomId) {
        this.roomId = roomId;
        const wsUrl = `${this.wsProtocol}//${this.wsHost}/ws/chat/${roomId}/`;
        
        console.log(`Connecting to chat WebSocket: ${wsUrl}`);
        
        this.chatSocket = new WebSocket(wsUrl);
        
        this.chatSocket.onopen = (event) => {
            console.log('Chat WebSocket connected');
            this.isConnected = true;
            this.reconnectAttempts = 0;
            this.updateConnectionStatus(true);
        };
        
        this.chatSocket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            this.handleChatMessage(data);
        };
        
        this.chatSocket.onclose = (event) => {
            console.log('Chat WebSocket disconnected:', event.code);
            this.isConnected = false;
            this.updateConnectionStatus(false);
            this.attemptReconnect('chat');
        };
        
        this.chatSocket.onerror = (error) => {
            console.error('Chat WebSocket error:', error);
            this.updateConnectionStatus(false);
        };
    }
    
    /**
     * Initialize notifications WebSocket connection
     */
    initNotificationSocket(userId) {
        this.userId = userId;
        const wsUrl = `${this.wsProtocol}//${this.wsHost}/ws/notifications/${userId}/`;
        
        console.log(`Connecting to notifications WebSocket: ${wsUrl}`);
        
        this.notificationSocket = new WebSocket(wsUrl);
        
        this.notificationSocket.onopen = (event) => {
            console.log('Notifications WebSocket connected');
        };
        
        this.notificationSocket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            this.handleNotification(data);
        };
        
        this.notificationSocket.onclose = (event) => {
            console.log('Notifications WebSocket disconnected:', event.code);
            this.attemptReconnect('notifications');
        };
        
        this.notificationSocket.onerror = (error) => {
            console.error('Notifications WebSocket error:', error);
        };
    }
    
    /**
     * Send chat message
     */
    sendChatMessage(message, replyToId = null) {
        if (this.chatSocket && this.chatSocket.readyState === WebSocket.OPEN) {
            const data = {
                type: 'message',
                message: message,
                reply_to: replyToId
            };
            this.chatSocket.send(JSON.stringify(data));
        } else {
            console.error('Chat WebSocket is not connected');
            this.showConnectionError();
        }
    }
    
    /**
     * Send typing indicator
     */
    sendTypingIndicator(isTyping) {
        if (this.chatSocket && this.chatSocket.readyState === WebSocket.OPEN) {
            const data = {
                type: 'typing',
                is_typing: isTyping
            };
            this.chatSocket.send(JSON.stringify(data));
        }
    }
    
    /**
     * Send message reaction
     */
    sendMessageReaction(messageId, emoji, action = 'add') {
        if (this.chatSocket && this.chatSocket.readyState === WebSocket.OPEN) {
            const data = {
                type: 'reaction',
                message_id: messageId,
                emoji: emoji,
                action: action
            };
            this.chatSocket.send(JSON.stringify(data));
        }
    }
    
    /**
     * Mark messages as read
     */
    markMessagesAsRead() {
        if (this.chatSocket && this.chatSocket.readyState === WebSocket.OPEN) {
            const data = {
                type: 'mark_read'
            };
            this.chatSocket.send(JSON.stringify(data));
        }
    }
    
    /**
     * Handle incoming chat messages
     */
    handleChatMessage(data) {
        switch (data.type) {
            case 'connection_status':
                this.handleConnectionStatus(data);
                break;
            case 'chat_message':
                this.displayChatMessage(data);
                break;
            case 'typing_indicator':
                this.displayTypingIndicator(data);
                break;
            case 'message_reaction':
                this.updateMessageReaction(data);
                break;
            case 'message_edited':
                this.updateEditedMessage(data);
                break;
            case 'message_deleted':
                this.updateDeletedMessage(data);
                break;
            case 'user_joined':
            case 'user_left':
                this.updateUserStatus(data);
                break;
            default:
                console.log('Unknown message type:', data.type);
        }
    }
    
    /**
     * Handle incoming notifications
     */
    handleNotification(data) {
        this.displayNotification(data);
    }
    
    /**
     * Display chat message in UI
     */
    displayChatMessage(data) {
        const messagesContainer = document.getElementById('messages-container');
        if (!messagesContainer) return;
        
        const messageElement = document.createElement('div');
        messageElement.className = 'message';
        messageElement.setAttribute('data-message-id', data.message_id);
        
        const timestamp = new Date(data.timestamp).toLocaleTimeString();
        
        messageElement.innerHTML = `
            <div class="message-header">
                <strong>${data.username}</strong>
                <span class="message-time">${timestamp}</span>
            </div>
            <div class="message-content">${this.escapeHtml(data.message)}</div>
            <div class="message-reactions" data-message-id="${data.message_id}"></div>
        `;
        
        messagesContainer.appendChild(messageElement);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        
        // Play notification sound
        this.playNotificationSound();
    }
    
    /**
     * Display typing indicator
     */
    displayTypingIndicator(data) {
        const typingContainer = document.getElementById('typing-indicators');
        if (!typingContainer) return;
        
        const indicatorId = `typing-${data.user_id}`;
        let indicator = document.getElementById(indicatorId);
        
        if (data.is_typing) {
            if (!indicator) {
                indicator = document.createElement('div');
                indicator.id = indicatorId;
                indicator.className = 'typing-indicator';
                indicator.textContent = `${data.username} is typing...`;
                typingContainer.appendChild(indicator);
            }
        } else {
            if (indicator) {
                indicator.remove();
            }
        }
    }
    
    /**
     * Display notification
     */
    displayNotification(data) {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${data.type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <strong>${data.type.toUpperCase()}</strong>
                <p>${this.escapeHtml(data.message)}</p>
            </div>
            <button class="notification-close" onclick="this.parentElement.remove()">×</button>
        `;
        
        // Add to notifications container
        const container = document.getElementById('notifications-container') || this.createNotificationsContainer();
        container.appendChild(notification);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 5000);
        
        // Play notification sound
        this.playNotificationSound();
        
        // Show browser notification if permission granted
        this.showBrowserNotification(data);
    }
    
    /**
     * Create notifications container if it doesn't exist
     */
    createNotificationsContainer() {
        let container = document.getElementById('notifications-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'notifications-container';
            container.className = 'notifications-container';
            container.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 9999;
                max-width: 350px;
            `;
            document.body.appendChild(container);
        }
        return container;
    }
    
    /**
     * Show browser notification
     */
    showBrowserNotification(data) {
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(`NoctisPro - ${data.type}`, {
                body: data.message,
                icon: '/static/img/logo.png'
            });
        }
    }
    
    /**
     * Play notification sound
     */
    playNotificationSound() {
        try {
            const audio = new Audio('/static/sounds/notification.mp3');
            audio.volume = 0.3;
            audio.play().catch(() => {
                // Ignore audio play errors (browser restrictions)
            });
        } catch (e) {
            // Ignore if audio file not found
        }
    }
    
    /**
     * Attempt to reconnect WebSocket
     */
    attemptReconnect(socketType) {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error(`Max reconnection attempts reached for ${socketType}`);
            this.showReconnectionError();
            return;
        }
        
        this.reconnectAttempts++;
        console.log(`Attempting to reconnect ${socketType} (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
        
        setTimeout(() => {
            if (socketType === 'chat' && this.roomId) {
                this.initChatSocket(this.roomId);
            } else if (socketType === 'notifications' && this.userId) {
                this.initNotificationSocket(this.userId);
            }
        }, this.reconnectInterval);
    }
    
    /**
     * Update connection status indicator
     */
    updateConnectionStatus(isConnected) {
        const statusIndicator = document.getElementById('connection-status');
        if (statusIndicator) {
            statusIndicator.className = isConnected ? 'connected' : 'disconnected';
            statusIndicator.textContent = isConnected ? 'Connected' : 'Disconnected';
        }
    }
    
    /**
     * Show connection error message
     */
    showConnectionError() {
        this.displayNotification({
            type: 'error',
            message: 'WebSocket connection lost. Attempting to reconnect...'
        });
    }
    
    /**
     * Show reconnection error message
     */
    showReconnectionError() {
        this.displayNotification({
            type: 'error',
            message: 'Unable to reconnect. Please refresh the page.'
        });
    }
    
    /**
     * Handle connection status updates
     */
    handleConnectionStatus(data) {
        console.log('Connection status:', data);
        this.updateConnectionStatus(data.status === 'connected');
    }
    
    /**
     * Bind UI events
     */
    bindEvents() {
        // Request notification permission on page load
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }
        
        // Handle page visibility changes
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                // Page became visible, mark messages as read
                this.markMessagesAsRead();
            }
        });
        
        // Handle page unload
        window.addEventListener('beforeunload', () => {
            if (this.chatSocket) {
                this.chatSocket.close();
            }
            if (this.notificationSocket) {
                this.notificationSocket.close();
            }
        });
    }
    
    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    /**
     * Close WebSocket connections
     */
    disconnect() {
        if (this.chatSocket) {
            this.chatSocket.close();
        }
        if (this.notificationSocket) {
            this.notificationSocket.close();
        }
    }
}

// Global WebSocket client instance
window.noctisWS = new NoctisWebSocketClient();

// Auto-initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    // Initialize chat socket if on chat page
    const chatRoomId = document.body.getAttribute('data-chat-room-id');
    if (chatRoomId) {
        window.noctisWS.initChatSocket(chatRoomId);
    }
    
    // Initialize notification socket if user is logged in
    const userId = document.body.getAttribute('data-user-id');
    if (userId) {
        window.noctisWS.initNotificationSocket(userId);
    }
});