/**
 * CollectionSelect Component
 * Single Responsibility: Manages collection select dropdowns
 */
import { escapeHtml } from '../utils/helpers.js';

/**
 * Update a collection select dropdown
 * @param {HTMLSelectElement} select - Select element
 * @param {Array} collections - Array of collections
 * @param {string} defaultText - Default option text
 */
export function updateCollectionSelect(select, collections, defaultText = 'Sin colección') {
    const currentValue = select.value;

    select.innerHTML = `<option value="">${defaultText}</option>` +
        collections.map(c =>
            `<option value="${c.id}">${escapeHtml(c.name)}</option>`
        ).join('');

    // Keep current selection if it still exists
    if (currentValue && collections.some(c => c.id === currentValue)) {
        select.value = currentValue;
    }
}

/**
 * Update multiple collection select dropdowns
 * @param {Object} selects - Object with selects { filter, form }
 * @param {Array} collections - Array of collections
 */
export function updateAllCollectionSelects(selects, collections) {
    if (selects.filter) {
        updateCollectionSelect(selects.filter, collections, 'Todas las colecciones');
    }
    if (selects.form) {
        updateCollectionSelect(selects.form, collections, 'Sin colección');
    }
}
