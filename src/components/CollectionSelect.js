/**
 * CollectionSelect Component
 * Single Responsibility: Manages collection select dropdowns
 */
import { escapeHtml } from '../utils/helpers.js';
import { t } from '../utils/i18n.js';

/**
 * Update a collection select dropdown
 * @param {HTMLSelectElement} select - Select element
 * @param {Array} collections - Array of collections
 * @param {string} defaultTextKey - Translation key for default option text
 */
export function updateCollectionSelect(select, collections, defaultTextKey = 'quotes.noCollection') {
    const currentValue = select.value;

    select.innerHTML = `<option value="">${t(defaultTextKey)}</option>` +
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
        updateCollectionSelect(selects.filter, collections, 'quotes.allCollections');
    }
    if (selects.form) {
        updateCollectionSelect(selects.form, collections, 'quotes.noCollection');
    }
}
