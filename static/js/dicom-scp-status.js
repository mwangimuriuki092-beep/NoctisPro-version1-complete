/**
 * DICOM SCP Status Widget
 * Shows real-time status of the Rust DICOM SCP server
 */

class DicomScpStatus {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.statusCheckInterval = null;
        this.init();
    }

    init() {
        this.createWidget();
        this.checkStatus();
        // Check status every 30 seconds
        this.statusCheckInterval = setInterval(() => this.checkStatus(), 30000);
    }

    createWidget() {
        if (!this.container) return;
        
        this.container.innerHTML = `
            <div class="dicom-scp-widget">
                <div class="widget-header">
                    <i class="fas fa-hospital"></i>
                    <span>DICOM SCP Server</span>
                </div>
                <div class="widget-body">
                    <div class="status-indicator">
                        <div class="status-dot" id="scp-status-dot"></div>
                        <span id="scp-status-text">Checking...</span>
                    </div>
                    <div class="scp-details">
                        <div class="detail-item">
                            <span class="label">Host:</span>
                            <span class="value" id="scp-host">-</span>
                        </div>
                        <div class="detail-item">
                            <span class="label">Port:</span>
                            <span class="value" id="scp-port">-</span>
                        </div>
                        <div class="detail-item">
                            <span class="label">AE Title:</span>
                            <span class="value" id="scp-ae-title">-</span>
                        </div>
                    </div>
                    <button class="btn btn-sm btn-test" onclick="dicomScpStatusWidget.testConnection()">
                        <i class="fas fa-vial"></i> Test Connection
                    </button>
                </div>
            </div>
        `;
    }

    checkStatus() {
        fetch('/dicom/api/system/status/')
            .then(response => response.json())
            .then(data => {
                if (data.status === 'success' && data.stats.scp_server) {
                    this.updateStatus(data.stats.scp_server);
                } else {
                    this.updateStatus({ connected: false });
                }
            })
            .catch(error => {
                console.error('Error checking DICOM SCP status:', error);
                this.updateStatus({ connected: false, message: 'Error checking status' });
            });
    }

    updateStatus(serverInfo) {
        const statusDot = document.getElementById('scp-status-dot');
        const statusText = document.getElementById('scp-status-text');
        const hostElem = document.getElementById('scp-host');
        const portElem = document.getElementById('scp-port');
        const aeTitleElem = document.getElementById('scp-ae-title');

        if (!statusDot || !statusText) return;

        if (serverInfo.connected) {
            statusDot.className = 'status-dot status-connected';
            statusText.textContent = 'Connected';
            statusText.className = 'text-success';
        } else {
            statusDot.className = 'status-dot status-disconnected';
            statusText.textContent = serverInfo.message || 'Disconnected';
            statusText.className = 'text-danger';
        }

        if (hostElem && serverInfo.host) {
            hostElem.textContent = serverInfo.host;
        }
        if (portElem && serverInfo.port) {
            portElem.textContent = serverInfo.port;
        }
        if (aeTitleElem) {
            aeTitleElem.textContent = 'RUST_SCP';
        }
    }

    testConnection() {
        const statusText = document.getElementById('scp-status-text');
        const originalText = statusText.textContent;
        statusText.textContent = 'Testing...';

        fetch('/dicom/api/scp/test/', {
            method: 'POST',
            headers: {
                'X-CSRFToken': this.getCookie('csrftoken'),
                'Content-Type': 'application/json'
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                this.showNotification('success', 'Connection Test Successful', data.message);
                this.checkStatus();
            } else {
                this.showNotification('error', 'Connection Test Failed', data.message);
                statusText.textContent = originalText;
            }
        })
        .catch(error => {
            this.showNotification('error', 'Test Error', error.toString());
            statusText.textContent = originalText;
        });
    }

    showNotification(type, title, message) {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `scp-notification scp-notification-${type}`;
        notification.innerHTML = `
            <strong>${title}</strong><br>
            ${message}
        `;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            background: ${type === 'success' ? '#28a745' : '#dc3545'};
            color: white;
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.3);
            z-index: 9999;
            animation: slideIn 0.3s ease-out;
        `;

        document.body.appendChild(notification);

        // Remove after 5 seconds
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease-out';
            setTimeout(() => notification.remove(), 300);
        }, 5000);
    }

    getCookie(name) {
        let cookieValue = null;
        if (document.cookie && document.cookie !== '') {
            const cookies = document.cookie.split(';');
            for (let i = 0; i < cookies.length; i++) {
                const cookie = cookies[i].trim();
                if (cookie.substring(0, name.length + 1) === (name + '=')) {
                    cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                    break;
                }
            }
        }
        return cookieValue;
    }

    destroy() {
        if (this.statusCheckInterval) {
            clearInterval(this.statusCheckInterval);
        }
    }
}

// Global instance
let dicomScpStatusWidget = null;

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    const container = document.getElementById('dicom-scp-status-widget');
    if (container) {
        dicomScpStatusWidget = new DicomScpStatus('dicom-scp-status-widget');
    }
});

// Add CSS styles
const style = document.createElement('style');
style.textContent = `
.dicom-scp-widget {
    background: rgba(37, 37, 37, 0.95);
    border: 1px solid #404040;
    border-radius: 8px;
    padding: 15px;
    color: #ffffff;
}

.dicom-scp-widget .widget-header {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 15px;
    font-weight: bold;
    color: #00d4ff;
}

.dicom-scp-widget .status-indicator {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 15px;
}

.dicom-scp-widget .status-dot {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    animation: pulse 2s infinite;
}

.dicom-scp-widget .status-dot.status-connected {
    background: #00ff88;
    box-shadow: 0 0 10px rgba(0, 255, 136, 0.5);
}

.dicom-scp-widget .status-dot.status-disconnected {
    background: #ff4444;
    box-shadow: 0 0 10px rgba(255, 68, 68, 0.5);
    animation: none;
}

.dicom-scp-widget .scp-details {
    margin-bottom: 15px;
    font-size: 12px;
}

.dicom-scp-widget .detail-item {
    display: flex;
    justify-content: space-between;
    padding: 5px 0;
    border-bottom: 1px solid #404040;
}

.dicom-scp-widget .detail-item:last-child {
    border-bottom: none;
}

.dicom-scp-widget .detail-item .label {
    color: #b3b3b3;
}

.dicom-scp-widget .detail-item .value {
    color: #ffffff;
    font-family: monospace;
}

.dicom-scp-widget .btn-test {
    width: 100%;
    background: #00d4ff;
    color: #0a0a0a;
    border: none;
    padding: 8px;
    border-radius: 4px;
    cursor: pointer;
    font-weight: bold;
    transition: all 0.2s;
}

.dicom-scp-widget .btn-test:hover {
    background: #00b8d4;
    transform: translateY(-2px);
}

@keyframes pulse {
    0%, 100% {
        opacity: 1;
    }
    50% {
        opacity: 0.5;
    }
}

@keyframes slideIn {
    from {
        transform: translateX(100%);
        opacity: 0;
    }
    to {
        transform: translateX(0);
        opacity: 1;
    }
}

@keyframes slideOut {
    from {
        transform: translateX(0);
        opacity: 1;
    }
    to {
        transform: translateX(100%);
        opacity: 0;
    }
}
`;
document.head.appendChild(style);