/**
 * General utilities - Pure functions without external dependencies
 * Single Responsibility Principle: each function has a single task
 */

import { t, i18n } from './i18n.js';

/**
 * Escape HTML to prevent XSS
 */
export function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Get stance label (translated)
 */
export function getStanceLabel(stance) {
    const key = `stances.${stance}`;
    return t(key);
}

/**
 * Format date to readable format
 */
export function formatDate(isoString) {
    const date = new Date(isoString);
    const locale = i18n.getLocale() === 'es' ? 'es-ES' : 'en-US';
    return date.toLocaleDateString(locale, {
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
