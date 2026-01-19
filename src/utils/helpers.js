/**
 * General utilities - Pure functions without external dependencies
 * Single Responsibility Principle: each function has a single task
 */

/**
 * Escape HTML to prevent XSS
 */
export function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Get stance label in Spanish
 */
export function getStanceLabel(stance) {
    const labels = {
        favor: 'A favor',
        contra: 'En contra',
        neutral: 'Neutral'
    };
    return labels[stance] || stance;
}

/**
 * Format date to readable format
 */
export function formatDate(isoString) {
    const date = new Date(isoString);
    return date.toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    });
}

/**
 * Debounce to optimize frequent events
 */
export function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}
