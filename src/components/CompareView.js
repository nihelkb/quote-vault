/**
 * CompareView Component
 * Single Responsibility: Renders the compare view for quotes (favor vs against)
 */
import { escapeHtml } from '../utils/helpers.js';

/**
 * Generate HTML for a quote in compare view (simplified)
 */
function renderCompareQuote(quote) {
    return `
        <div class="compare-quote">
            <p class="quote-text">${escapeHtml(quote.text)}</p>
            <div class="quote-author">— ${escapeHtml(quote.author)}</div>
        </div>
    `;
}

/**
 * Generate HTML for empty quote column
 */
function renderEmptyColumn(stance) {
    const messages = {
        favor: 'No hay citas a favor',
        contra: 'No hay citas en contra'
    };
    return `<p class="empty-compare">${messages[stance] || 'No hay citas'}</p>`;
}

/**
 * Render quote column
 */
function renderColumn(quotes, stance) {
    if (quotes.length === 0) {
        return renderEmptyColumn(stance);
    }
    return quotes.map(renderCompareQuote).join('');
}

/**
 * Update the compare view
 * @param {Array} quotes - Filtered quotes (favor and against only)
 * @param {Object} elements - DOM element references { favorEl, againstEl }
 */
export function updateCompareView(quotes, elements) {
    const favorQuotes = quotes.filter(q => q.stance === 'favor');
    const againstQuotes = quotes.filter(q => q.stance === 'contra');

    elements.favorEl.innerHTML = renderColumn(favorQuotes, 'favor');
    elements.againstEl.innerHTML = renderColumn(againstQuotes, 'contra');
}

/**
 * Filter quotes for compare view (exclude neutral)
 */
export function filterForCompare(quotes) {
    return quotes.filter(q => q.stance === 'favor' || q.stance === 'contra');
}
