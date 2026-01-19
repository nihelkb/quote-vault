/**
 * CollectionSelect Component
 * Single Responsibility: Manages collection select dropdowns
 */
import { escapeHtml } from '../utils/helpers.js';
import { t } from '../utils/i18n.js';

/**
 * Update a collection select dropdown (hidden select + custom dropdown)
 * @param {HTMLSelectElement} select - Hidden select element
 * @param {Array} collections - Array of collections
 * @param {string} defaultTextKey - Translation key for default option text
 * @param {HTMLElement} customSelect - Custom select container (optional)
 */
export function updateCollectionSelect(select, collections, defaultTextKey = 'quotes.noCollection', customSelect = null) {
    const currentValue = select.value;

    // Update hidden select
    select.innerHTML = `<option value="">${t(defaultTextKey)}</option>` +
        collections.map(c =>
            `<option value="${c.id}">${escapeHtml(c.name)}</option>`
        ).join('');

    // Keep current selection if it still exists
    if (currentValue && collections.some(c => c.id === currentValue)) {
        select.value = currentValue;
    }

    // Update custom dropdown if provided
    if (customSelect) {
        updateCustomDropdown(customSelect, collections, defaultTextKey, currentValue);
    }
}

/**
 * Update custom dropdown options
 */
function updateCustomDropdown(customSelect, collections, defaultTextKey, currentValue) {
    const dropdown = customSelect.querySelector('.custom-select-dropdown');
    const selectedText = customSelect.querySelector('.selected-text');

    // Generate options HTML
    const checkIcon = `<svg class="check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="20 6 9 17 4 12"></polyline>
    </svg>`;

    const defaultOption = `
        <button type="button" class="custom-select-option ${!currentValue ? 'active' : ''}" data-value="">
            <span>${t(defaultTextKey)}</span>
            ${checkIcon}
        </button>
    `;

    const collectionOptions = collections.map(c => `
        <button type="button" class="custom-select-option ${currentValue === c.id ? 'active' : ''}" data-value="${c.id}">
            <span>${escapeHtml(c.name)}</span>
            ${checkIcon}
        </button>
    `).join('');

    dropdown.innerHTML = defaultOption + collectionOptions;

    // Update selected text
    if (currentValue) {
        const selectedCollection = collections.find(c => c.id === currentValue);
        selectedText.textContent = selectedCollection ? selectedCollection.name : t(defaultTextKey);
    } else {
        selectedText.textContent = t(defaultTextKey);
    }

    // Re-attach event listeners
    dropdown.querySelectorAll('.custom-select-option').forEach(option => {
        option.addEventListener('click', () => {
            const value = option.dataset.value;
            const text = option.querySelector('span').textContent;
            const hiddenSelect = customSelect.querySelector('select');

            // Update hidden select
            hiddenSelect.value = value;

            // Update button text
            selectedText.textContent = text;

            // Update active state
            dropdown.querySelectorAll('.custom-select-option').forEach(opt => {
                opt.classList.toggle('active', opt === option);
            });

            // Close dropdown
            customSelect.classList.remove('open');

            // Trigger change event
            hiddenSelect.dispatchEvent(new Event('change'));
        });
    });
}

/**
 * Update multiple collection select dropdowns
 * @param {Object} selects - Object with selects { filter, form }
 * @param {Array} collections - Array of collections
 * @param {HTMLElement} customFilterSelect - Custom select for filter (optional)
 */
export function updateAllCollectionSelects(selects, collections, customFilterSelect = null) {
    if (selects.filter) {
        updateCollectionSelect(selects.filter, collections, 'quotes.allCollections', customFilterSelect);
    }
    if (selects.form) {
        updateCollectionSelect(selects.form, collections, 'quotes.noCollection');
    }
}
