/**
 * Firebase Blocker Detector
 * Detects if ad blockers or browser extensions are blocking Firebase requests
 * and provides utilities for handling these situations
 */

const FIREBASE_TEST_ENDPOINTS = [
    'https://firestore.googleapis.com',
    'https://www.googleapis.com',
    'https://firebase.googleapis.com'
];

class FirebaseBlockerDetector {
    constructor() {
        this.isBlocked = null;
        this.blockCheckPromise = null;
    }

    /**
     * Check if Firebase requests are being blocked
     * Returns cached result if already checked
     */
    async checkIfBlocked() {
        // Return cached result if available
        if (this.isBlocked !== null) {
            return this.isBlocked;
        }

        // If check is in progress, wait for it
        if (this.blockCheckPromise) {
            return this.blockCheckPromise;
        }

        this.blockCheckPromise = this._performBlockCheck();
        this.isBlocked = await this.blockCheckPromise;
        this.blockCheckPromise = null;

        return this.isBlocked;
    }

    /**
     * Perform the actual block detection
     */
    async _performBlockCheck() {
        try {
            // Try to fetch a simple resource from Firebase
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);

            const response = await fetch('https://www.googleapis.com/generate_204', {
                method: 'HEAD',
                mode: 'no-cors',
                signal: controller.signal
            });

            clearTimeout(timeoutId);
            return false; // Not blocked
        } catch (error) {
            // Check if it's specifically a block error
            if (error.name === 'TypeError' ||
                error.message?.includes('blocked') ||
                error.message?.includes('ERR_BLOCKED')) {
                return true;
            }
            // Network errors might not be blocking
            return false;
        }
    }

    /**
     * Reset the cached result (useful after user disables blocker)
     */
    reset() {
        this.isBlocked = null;
        this.blockCheckPromise = null;
    }

    /**
     * Get user-friendly message for blocked requests
     */
    getBlockedMessage(locale = 'es') {
        const messages = {
            es: {
                title: 'Conexión bloqueada',
                description: 'Parece que un bloqueador de anuncios o extensión del navegador está bloqueando la conexión con nuestros servidores.',
                instructions: [
                    'Desactiva tu bloqueador de anuncios para este sitio',
                    'Añade este dominio a la lista blanca de tu extensión',
                    'Prueba en una ventana de incógnito sin extensiones',
                    'Desactiva temporalmente las extensiones del navegador'
                ],
                retry: 'Reintentar conexión'
            },
            en: {
                title: 'Connection blocked',
                description: 'It seems an ad blocker or browser extension is blocking the connection to our servers.',
                instructions: [
                    'Disable your ad blocker for this site',
                    'Add this domain to your extension\'s whitelist',
                    'Try in an incognito window without extensions',
                    'Temporarily disable browser extensions'
                ],
                retry: 'Retry connection'
            }
        };

        return messages[locale] || messages.es;
    }
}

/**
 * Retry utility with exponential backoff
 */
export async function withRetry(fn, options = {}) {
    const {
        maxRetries = 3,
        initialDelay = 1000,
        maxDelay = 10000,
        backoffFactor = 2,
        onRetry = null,
        shouldRetry = (error) => true
    } = options;

    let lastError;
    let delay = initialDelay;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;

            // Check if error is due to blocking
            if (isBlockedError(error)) {
                throw new FirebaseBlockedError(error.message);
            }

            // Check if we should retry
            if (attempt === maxRetries || !shouldRetry(error)) {
                throw error;
            }

            // Notify retry callback
            if (onRetry) {
                onRetry(attempt + 1, maxRetries, error);
            }

            // Wait before retrying
            await sleep(delay);
            delay = Math.min(delay * backoffFactor, maxDelay);
        }
    }

    throw lastError;
}

/**
 * Check if an error is due to request blocking
 */
export function isBlockedError(error) {
    if (!error) return false;

    const blockedIndicators = [
        'ERR_BLOCKED_BY_CLIENT',
        'ERR_BLOCKED_BY_RESPONSE',
        'blocked',
        'net::ERR_BLOCKED',
        'NS_ERROR_FAILURE',
        'NetworkError',
        'Failed to fetch'
    ];

    const errorString = error.toString() + (error.message || '');
    return blockedIndicators.some(indicator =>
        errorString.toLowerCase().includes(indicator.toLowerCase())
    );
}

/**
 * Custom error for blocked requests
 */
export class FirebaseBlockedError extends Error {
    constructor(message) {
        super(message);
        this.name = 'FirebaseBlockedError';
        this.isBlocked = true;
    }
}

/**
 * Sleep utility
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Wrap a Firebase operation with blocking detection and retry logic
 */
export async function safeFirebaseOperation(operation, options = {}) {
    const detector = firebaseBlockerDetector;

    // First check if we already know Firebase is blocked
    const wasBlocked = await detector.checkIfBlocked();
    if (wasBlocked) {
        throw new FirebaseBlockedError('Firebase requests are being blocked by client');
    }

    try {
        return await withRetry(operation, {
            maxRetries: options.maxRetries || 3,
            initialDelay: options.initialDelay || 1000,
            onRetry: options.onRetry,
            shouldRetry: (error) => {
                // Don't retry if it's a blocking error
                if (isBlockedError(error)) {
                    return false;
                }
                // Retry on network errors
                return error.name === 'TypeError' ||
                       error.code === 'unavailable' ||
                       error.code === 'resource-exhausted';
            }
        });
    } catch (error) {
        if (isBlockedError(error)) {
            // Mark as blocked for future checks
            detector.isBlocked = true;
            throw new FirebaseBlockedError(error.message);
        }
        throw error;
    }
}

// Singleton instance
export const firebaseBlockerDetector = new FirebaseBlockerDetector();
