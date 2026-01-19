/**
 * QuoteCard Component
 * Single Responsibility: Renders a quote card
 * Liskov Substitution Principle: Can be replaced by any component that generates HTML
 */
import { escapeHtml, getStanceLabel } from '../utils/helpers.js';

/**
 * Generate HTML for a quote card
 * @param {Object} quote - Quote data
 * @param {string} collectionName - Collection name (optional)
 * @returns {string} - Card HTML
 */
export function renderQuoteCard(quote, collectionName = null) {
    const favoriteClass = quote.favorite ? 'active' : '';
    const favoriteFill = quote.favorite ? 'currentColor' : 'none';
    const favoriteTitle = quote.favorite ? 'Quitar de destacados' : 'Destacar';

    return `
        <article class="quote-card">
            <div class="quote-header">
                <button
                    class="favorite-btn ${favoriteClass}"
                    onclick="toggleFavorite('${quote.id}', ${!quote.favorite})"
                    title="${favoriteTitle}"
                >
                    <svg viewBox="0 0 24 24" fill="${favoriteFill}" stroke="currentColor" stroke-width="2">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                    </svg>
                </button>
            </div>
            <p class="quote-text">${escapeHtml(quote.text)}</p>
            <div class="quote-meta">
                <div>
                    <div class="quote-author">— ${escapeHtml(quote.author)}</div>
                    ${quote.source ? `<div class="quote-source">${escapeHtml(quote.source)}</div>` : ''}
                </div>
                <div class="quote-tags">
                    ${collectionName ? `<span class="collection-tag">${escapeHtml(collectionName)}</span>` : ''}
                    <span class="stance stance-${quote.stance}">${getStanceLabel(quote.stance)}</span>
                    ${renderTags(quote.tags)}
                </div>
            </div>
            ${quote.notes ? `<div class="quote-notes"><strong>Notas:</strong> ${escapeHtml(quote.notes)}</div>` : ''}
            <div class="quote-actions">
                <button class="action-btn" onclick="openModal('${quote.id}')">Editar</button>
                <button class="action-btn delete" onclick="deleteQuote('${quote.id}')">Eliminar</button>
            </div>
        </article>
    `;
}

/**
 * Render tags
 */
function renderTags(tags) {
    if (!tags || tags.length === 0) return '';
    return tags.map(t => `<span class="tag">${escapeHtml(t)}</span>`).join('');
}

/**
 * Generate HTML for quote list
 * @param {Array} quotes - Array of quotes
 * @param {Array} collections - Array of collections to get names
 * @returns {string} - HTML for all cards
 */
export function renderQuoteList(quotes, collections) {
    return quotes.map(quote => {
        const collectionName = quote.collectionId
            ? collections.find(c => c.id === quote.collectionId)?.name
            : null;
        return renderQuoteCard(quote, collectionName);
    }).join('');
}
