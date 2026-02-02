/**
 * Blocker Modal - Shows a user-friendly message when Firebase is blocked
 */
import { i18n, t } from './i18n.js';
import { firebaseBlockerDetector } from './firebaseBlockerDetector.js';

let modalElement = null;

/**
 * Create and show the blocker modal
 */
export function showBlockerModal(onRetry = null) {
    // Don't show multiple modals
    if (modalElement) {
        return;
    }

    const locale = i18n.getLocale();
    const messages = firebaseBlockerDetector.getBlockedMessage(locale);

    modalElement = document.createElement('div');
    modalElement.className = 'blocker-modal-overlay';
    modalElement.innerHTML = `
        <div class="blocker-modal">
            <div class="blocker-modal-icon">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line>
                </svg>
            </div>
            <h2 class="blocker-modal-title">${messages.title}</h2>
            <p class="blocker-modal-description">${messages.description}</p>
            <ul class="blocker-modal-instructions">
                ${messages.instructions.map(instruction => `<li>${instruction}</li>`).join('')}
            </ul>
            <div class="blocker-modal-actions">
                <button class="btn btn-primary blocker-modal-retry">${messages.retry}</button>
                <button class="btn btn-secondary blocker-modal-dismiss">
                    ${locale === 'es' ? 'Cerrar' : 'Close'}
                </button>
            </div>
            <p class="blocker-modal-hint">
                ${locale === 'es'
                    ? 'Si el problema persiste, prueba con otro navegador o dispositivo.'
                    : 'If the problem persists, try another browser or device.'}
            </p>
        </div>
    `;

    document.body.appendChild(modalElement);

    // Add event listeners
    const retryBtn = modalElement.querySelector('.blocker-modal-retry');
    const dismissBtn = modalElement.querySelector('.blocker-modal-dismiss');

    retryBtn.addEventListener('click', async () => {
        retryBtn.disabled = true;
        retryBtn.textContent = locale === 'es' ? 'Verificando...' : 'Checking...';

        // Reset the detector and check again
        firebaseBlockerDetector.reset();
        const stillBlocked = await firebaseBlockerDetector.checkIfBlocked();

        if (!stillBlocked) {
            hideBlockerModal();
            if (onRetry) {
                onRetry();
            } else {
                // Reload the page to reinitialize
                window.location.reload();
            }
        } else {
            retryBtn.disabled = false;
            retryBtn.textContent = messages.retry;
            // Show a toast or shake the modal
            modalElement.querySelector('.blocker-modal').classList.add('shake');
            setTimeout(() => {
                modalElement.querySelector('.blocker-modal').classList.remove('shake');
            }, 500);
        }
    });

    dismissBtn.addEventListener('click', () => {
        hideBlockerModal();
    });

    // Add animation class after a frame
    requestAnimationFrame(() => {
        modalElement.classList.add('visible');
    });
}

/**
 * Hide and remove the blocker modal
 */
export function hideBlockerModal() {
    if (!modalElement) return;

    modalElement.classList.remove('visible');
    setTimeout(() => {
        if (modalElement && modalElement.parentNode) {
            modalElement.parentNode.removeChild(modalElement);
        }
        modalElement = null;
    }, 300);
}

/**
 * Check if the blocker modal is currently shown
 */
export function isBlockerModalVisible() {
    return modalElement !== null;
}

// Add styles dynamically
const styles = document.createElement('style');
styles.textContent = `
.blocker-modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
    opacity: 0;
    transition: opacity 0.3s ease;
    backdrop-filter: blur(4px);
}

.blocker-modal-overlay.visible {
    opacity: 1;
}

.blocker-modal {
    background: white;
    border-radius: 16px;
    padding: 32px;
    max-width: 480px;
    width: 90%;
    text-align: center;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    transform: scale(0.9);
    transition: transform 0.3s ease;
}

.blocker-modal-overlay.visible .blocker-modal {
    transform: scale(1);
}

.blocker-modal.shake {
    animation: shake 0.5s ease-in-out;
}

@keyframes shake {
    0%, 100% { transform: translateX(0); }
    20%, 60% { transform: translateX(-10px); }
    40%, 80% { transform: translateX(10px); }
}

.blocker-modal-icon {
    width: 80px;
    height: 80px;
    margin: 0 auto 20px;
    background: #fef2f2;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #dc2626;
}

.blocker-modal-title {
    font-family: 'Cormorant Garamond', serif;
    font-size: 1.75rem;
    font-weight: 600;
    margin: 0 0 12px;
    color: #1a1a1a;
}

.blocker-modal-description {
    color: #666;
    margin: 0 0 20px;
    line-height: 1.6;
}

.blocker-modal-instructions {
    text-align: left;
    margin: 0 0 24px;
    padding: 16px 20px 16px 36px;
    background: #f8f8f8;
    border-radius: 8px;
    list-style: none;
}

.blocker-modal-instructions li {
    position: relative;
    padding: 6px 0;
    color: #444;
    font-size: 0.9rem;
}

.blocker-modal-instructions li::before {
    content: '•';
    position: absolute;
    left: -16px;
    color: #2d2d2d;
}

.blocker-modal-actions {
    display: flex;
    gap: 12px;
    justify-content: center;
    margin-bottom: 16px;
}

.blocker-modal-actions .btn {
    min-width: 140px;
}

.blocker-modal-hint {
    font-size: 0.8rem;
    color: #999;
    margin: 0;
}
`;
document.head.appendChild(styles);
