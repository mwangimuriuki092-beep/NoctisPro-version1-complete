/**
 * NoctisPro PACS - Core JavaScript
 * Main application JavaScript with utilities and common functions
 */

(function() {
    'use strict';
    
    // Namespace
    window.NoctisPro = window.NoctisPro || {};
    
    /**
     * CSRF Token Management
     */
    NoctisPro.getCookie = function(name) {
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
    };
    
    NoctisPro.csrftoken = NoctisPro.getCookie('csrftoken');
    
    /**
     * AJAX Utilities
     */
    NoctisPro.ajax = {
        get: function(url, data) {
            return $.ajax({
                url: url,
                type: 'GET',
                data: data,
                dataType: 'json'
            });
        },
        
        post: function(url, data) {
            return $.ajax({
                url: url,
                type: 'POST',
                data: JSON.stringify(data),
                contentType: 'application/json',
                dataType: 'json',
                headers: {
                    'X-CSRFToken': NoctisPro.csrftoken
                }
            });
        },
        
        put: function(url, data) {
            return $.ajax({
                url: url,
                type: 'PUT',
                data: JSON.stringify(data),
                contentType: 'application/json',
                dataType: 'json',
                headers: {
                    'X-CSRFToken': NoctisPro.csrftoken
                }
            });
        },
        
        delete: function(url) {
            return $.ajax({
                url: url,
                type: 'DELETE',
                headers: {
                    'X-CSRFToken': NoctisPro.csrftoken
                }
            });
        }
    };
    
    /**
     * Notification System
     */
    NoctisPro.notifications = {
        unreadCount: 0,
        
        init: function() {
            this.poll();
            setInterval(() => this.poll(), 30000); // Poll every 30 seconds
        },
        
        poll: function() {
            NoctisPro.ajax.get('/notifications/api/notifications/unread-count/')
                .done((data) => {
                    this.unreadCount = data.count || 0;
                    this.updateBadge();
                    if (this.unreadCount > 0) {
                        this.loadNotifications();
                    }
                });
        },
        
        updateBadge: function() {
            const badge = $('#notification-count');
            if (this.unreadCount > 0) {
                badge.text(this.unreadCount).show();
            } else {
                badge.hide();
            }
        },
        
        loadNotifications: function() {
            NoctisPro.ajax.get('/notifications/api/notifications/', { unread: true })
                .done((data) => {
                    const list = $('#notifications-list');
                    list.empty();
                    
                    if (data.results && data.results.length > 0) {
                        data.results.forEach((notification) => {
                            const item = this.createNotificationItem(notification);
                            list.append(item);
                        });
                        
                        list.append(`
                            <li class="dropdown-divider"></li>
                            <li class="dropdown-item text-center">
                                <a href="/notifications/" class="text-decoration-none">
                                    View All Notifications
                                </a>
                            </li>
                        `);
                    } else {
                        list.html('<li class="dropdown-item text-muted">No new notifications</li>');
                    }
                });
        },
        
        createNotificationItem: function(notification) {
            const priorityClass = {
                'urgent': 'text-danger',
                'high': 'text-warning',
                'normal': '',
                'low': 'text-muted'
            }[notification.priority] || '';
            
            return $(`
                <li>
                    <a class="dropdown-item ${priorityClass}" href="#" 
                       data-notification-id="${notification.id}">
                        <strong>${notification.title}</strong><br>
                        <small>${notification.message}</small><br>
                        <small class="text-muted">${this.timeAgo(notification.created_at)}</small>
                    </a>
                </li>
            `).on('click', function(e) {
                e.preventDefault();
                NoctisPro.notifications.markAsRead(notification.id);
                if (notification.action_url) {
                    window.location.href = notification.action_url;
                }
            });
        },
        
        markAsRead: function(notificationId) {
            NoctisPro.ajax.post(`/notifications/api/notifications/${notificationId}/mark-read/`)
                .done(() => {
                    this.poll();
                });
        },
        
        timeAgo: function(dateString) {
            const date = new Date(dateString);
            const seconds = Math.floor((new Date() - date) / 1000);
            
            let interval = seconds / 31536000;
            if (interval > 1) return Math.floor(interval) + ' years ago';
            
            interval = seconds / 2592000;
            if (interval > 1) return Math.floor(interval) + ' months ago';
            
            interval = seconds / 86400;
            if (interval > 1) return Math.floor(interval) + ' days ago';
            
            interval = seconds / 3600;
            if (interval > 1) return Math.floor(interval) + ' hours ago';
            
            interval = seconds / 60;
            if (interval > 1) return Math.floor(interval) + ' minutes ago';
            
            return Math.floor(seconds) + ' seconds ago';
        }
    };
    
    /**
     * UI Utilities
     */
    NoctisPro.ui = {
        showLoading: function(message = 'Loading...') {
            const loading = $(`
                <div class="noctispro-loading-overlay">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">${message}</span>
                    </div>
                    <p class="mt-2">${message}</p>
                </div>
            `);
            $('body').append(loading);
        },
        
        hideLoading: function() {
            $('.noctispro-loading-overlay').remove();
        },
        
        showModal: function(title, content, buttons = []) {
            const modal = $(`
                <div class="modal fade" tabindex="-1">
                    <div class="modal-dialog">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">${title}</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">${content}</div>
                            <div class="modal-footer"></div>
                        </div>
                    </div>
                </div>
            `);
            
            const footer = modal.find('.modal-footer');
            buttons.forEach(button => {
                const btn = $(`<button type="button" class="btn btn-${button.class || 'secondary'}">${button.text}</button>`);
                if (button.onClick) {
                    btn.on('click', button.onClick);
                }
                if (button.dismiss) {
                    btn.attr('data-bs-dismiss', 'modal');
                }
                footer.append(btn);
            });
            
            $('body').append(modal);
            const bsModal = new bootstrap.Modal(modal[0]);
            bsModal.show();
            
            modal.on('hidden.bs.modal', function() {
                modal.remove();
            });
            
            return bsModal;
        },
        
        confirm: function(message, onConfirm) {
            return this.showModal('Confirm Action', message, [
                { text: 'Cancel', class: 'secondary', dismiss: true },
                { 
                    text: 'Confirm', 
                    class: 'primary', 
                    onClick: function() {
                        onConfirm();
                        $(this).closest('.modal').modal('hide');
                    }
                }
            ]);
        },
        
        alert: function(title, message, type = 'info') {
            return this.showModal(title, message, [
                { text: 'OK', class: type, dismiss: true }
            ]);
        },
        
        toast: function(message, type = 'info') {
            const toast = $(`
                <div class="toast align-items-center text-white bg-${type} border-0" role="alert">
                    <div class="d-flex">
                        <div class="toast-body">${message}</div>
                        <button type="button" class="btn-close btn-close-white me-2 m-auto" 
                                data-bs-dismiss="toast"></button>
                    </div>
                </div>
            `);
            
            let container = $('.toast-container');
            if (container.length === 0) {
                container = $('<div class="toast-container position-fixed top-0 end-0 p-3"></div>');
                $('body').append(container);
            }
            
            container.append(toast);
            const bsToast = new bootstrap.Toast(toast[0]);
            bsToast.show();
            
            toast.on('hidden.bs.toast', function() {
                toast.remove();
            });
        }
    };
    
    /**
     * Form Validation
     */
    NoctisPro.forms = {
        validate: function(formId) {
            const form = document.getElementById(formId);
            if (!form) return false;
            
            if (!form.checkValidity()) {
                form.classList.add('was-validated');
                return false;
            }
            
            return true;
        },
        
        serialize: function(formId) {
            const form = $('#' + formId);
            const data = {};
            
            form.serializeArray().forEach(item => {
                data[item.name] = item.value;
            });
            
            return data;
        }
    };
    
    /**
     * Debounce function
     */
    NoctisPro.debounce = function(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    };
    
    /**
     * Format file size
     */
    NoctisPro.formatFileSize = function(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    };
    
    /**
     * Format date/time
     */
    NoctisPro.formatDateTime = function(dateString) {
        const date = new Date(dateString);
        return date.toLocaleString();
    };
    
    /**
     * Initialize on document ready
     */
    $(document).ready(function() {
        // Initialize tooltips
        const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
        tooltipTriggerList.map(function (tooltipTriggerEl) {
            return new bootstrap.Tooltip(tooltipTriggerEl);
        });
        
        // Initialize popovers
        const popoverTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="popover"]'));
        popoverTriggerList.map(function (popoverTriggerEl) {
            return new bootstrap.Popover(popoverTriggerEl);
        });
        
        // Initialize notifications
        if (typeof NoctisPro.user !== 'undefined' && NoctisPro.user.authenticated) {
            NoctisPro.notifications.init();
        }
        
        // Auto-dismiss alerts after 5 seconds
        setTimeout(function() {
            $('.alert:not(.alert-permanent)').fadeOut('slow', function() {
                $(this).remove();
            });
        }, 5000);
        
        console.log('NoctisPro PACS initialized');
    });
    
})();
