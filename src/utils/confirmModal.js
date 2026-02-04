/**
 * Confirm Modal Manager
 * Single Responsibility: Manages confirmation modals
 * Open/Closed Principle: Extensible for different confirmation types
 */

import { t } from './i18n.js';

class ConfirmModalManager {
    constructor() {
        this.modal = null;
        this.titleEl = null;
        this.messageEl = null;
        this.actionBtn = null;
        this.cancelBtn = null;
        this.pendingCallback = null;
    }

    /**
     * Initialize the confirm modal
     */
    init(config = {}) {
        const {
            modalId = 'confirmModal',
            titleId = 'confirmTitle',
            messageId = 'confirmMessage',
            actionBtnId = 'confirmAction',
            cancelBtnId = 'confirmCancel'
        } = config;

        this.modal = document.getElementById(modalId);
        this.titleEl = document.getElementById(titleId);
        this.messageEl = document.getElementById(messageId);
        this.actionBtn = document.getElementById(actionBtnId);
        this.cancelBtn = document.getElementById(cancelBtnId);

        this.setupEventListeners();
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        if (this.cancelBtn) {
            this.cancelBtn.addEventListener('click', () => this.close());
        }

        if (this.actionBtn) {
            this.actionBtn.addEventListener('click', async () => {
                if (this.pendingCallback) {
                    await this.pendingCallback();
                }
                this.close();
            });
        }

        if (this.modal) {
            this.modal.addEventListener('click', (e) => {
                if (e.target === this.modal) {
                    this.close();
                }
            });
        }
    }

    /**
     * Show confirmation modal
     * @param {Object} options - Modal options
     * @param {string} options.title - Title
     * @param {string} options.message - Message
     * @param {string} options.actionText - Action button text
     * @param {Function} options.onConfirm - Callback on confirm
     */
    show({ title, message, actionText, onConfirm }) {
        if (!this.modal) {
            console.warn('Confirm modal not initialized');
            return;
        }

        this.titleEl.textContent = title;
        this.messageEl.textContent = message;
        this.actionBtn.textContent = actionText;
        this.pendingCallback = onConfirm;
        this.modal.classList.add('active');
    }

    /**
     * Close the modal
     */
    close() {
        if (this.modal) {
            this.modal.classList.remove('active');
        }
        this.pendingCallback = null;
    }

    /**
     * Shortcut for delete confirmation
     */
    confirmDelete(itemName, onConfirm) {
        this.show({
            title: t('confirm.deleteItem', { item: itemName }),
            message: t('confirm.cannotUndo'),
            actionText: t('quotes.delete'),
            onConfirm
        });
    }
}

// Singleton
export const confirmModal = new ConfirmModalManager();
