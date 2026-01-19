/**
 * Toast Notification System
 * Single Responsibility: Manages visual notifications
 */

class ToastManager {
    constructor() {
        this.container = null;
        this.defaultDuration = 3000;
    }

    /**
     * Initialize the toast container
     */
    init(containerId = 'toastContainer') {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.warn(`Toast container #${containerId} not found`);
        }
    }

    /**
     * Show a toast notification
     * @param {string} message - Message to display
     * @param {string} type - Type: 'info', 'success', 'error', 'warning'
     * @param {number} duration - Duration in ms
     */
    show(message, type = 'info', duration = this.defaultDuration) {
        if (!this.container) {
            console.warn('Toast container not initialized');
            return;
        }

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        this.container.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('exiting');
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }

    /**
     * Shortcuts for common types
     */
    success(message) {
        this.show(message, 'success');
    }

    error(message) {
        this.show(message, 'error');
    }

    info(message) {
        this.show(message, 'info');
    }

    warning(message) {
        this.show(message, 'warning');
    }
}

// Singleton
export const toast = new ToastManager();
