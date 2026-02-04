/**
 * QuoteCard Component
 * Single Responsibility: Renders a quote card with nested replies support
 * Liskov Substitution Principle: Can be replaced by any component that generates HTML
 */
import { escapeHtml, getStanceLabel } from '../utils/helpers.js';
import { t } from '../utils/i18n.js';

/**
 * Get the opposite stance for counterarguments
 */
function getOppositeStance(stance) {
    if (stance === 'favor') return 'contra';
    if (stance === 'contra') return 'favor';
    return 'neutral';
}

/**
 * Generate HTML for a quote card
 * @param {Object} quote - Quote data (may include replies array)
 * @param {string} collectionName - Collection name (optional)
 * @param {number} depth - Nesting depth for replies (0 = root)
 * @param {Object} options - Additional options { allQuotes, collections }
 * @returns {string} - Card HTML
 */
export function renderQuoteCard(quote, collectionName = null, depth = 0, options = {}) {
    const favoriteClass = quote.favorite ? 'active' : '';
    const favoriteFill = quote.favorite ? 'currentColor' : 'none';
    const favoriteTitle = quote.favorite ? t('quotes.removeFromFavorites') : t('quotes.addToFavorites');
    const isReply = depth > 0;
    const cardClass = isReply ? 'quote-card quote-reply' : 'quote-card';
    const replies = quote.replies || [];
    const hasReplies = replies.length > 0;

    const replyBtnLabel = isReply ? t('replies.addCounter') : t('replies.addReply');
    const oppositeStance = getOppositeStance(quote.stance);

    return `
        <article class="${cardClass}" data-quote-id="${quote.id}" data-depth="${depth}">
            <div class="quote-header">
                ${isReply ? `<span class="reply-indicator" data-tooltip="${t('replies.replyTo')}" data-tooltip-position="right">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="9 14 4 9 9 4"></polyline>
                        <path d="M20 20v-7a4 4 0 0 0-4-4H4"></path>
                    </svg>
                </span>` : ''}
                <button
                    class="favorite-btn ${favoriteClass}"
                    onclick="toggleFavorite('${quote.id}', ${!quote.favorite})"
                    data-tooltip="${favoriteTitle}"
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
            ${quote.notes ? `<div class="quote-notes"><strong>${t('quotes.notes')}</strong> ${escapeHtml(quote.notes)}</div>` : ''}
            <div class="quote-actions">
                <button class="action-btn reply-btn" onclick="openReplyModal('${quote.id}', '${oppositeStance}', '${quote.collectionId || ''}')" data-tooltip="${replyBtnLabel}">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="9 14 4 9 9 4"></polyline>
                        <path d="M20 20v-7a4 4 0 0 0-4-4H4"></path>
                    </svg>
                    ${replyBtnLabel}
                </button>
                <button class="action-btn" onclick="openModal('${quote.id}')">${t('quotes.edit')}</button>
                <button class="action-btn delete" onclick="deleteQuote('${quote.id}')">${t('quotes.delete')}</button>
            </div>
            ${hasReplies ? renderRepliesSection(quote, replies, depth, options) : ''}
        </article>
    `;
}

/**
 * Render the replies section with toggle
 */
function renderRepliesSection(parentQuote, replies, depth, options) {
    const replyCount = countAllReplies(replies);
    const toggleId = `replies-${parentQuote.id}`;

    return `
        <div class="quote-replies-section">
            <button class="replies-toggle" onclick="toggleReplies('${toggleId}')" data-expanded="true">
                <svg class="toggle-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
                <span class="replies-count">${replyCount} ${replyCount === 1 ? t('replies.reply') : t('replies.replies')}</span>
            </button>
            <div class="quote-replies" id="${toggleId}">
                ${renderReplies(replies, depth + 1, options)}
            </div>
        </div>
    `;
}

/**
 * Count all replies recursively
 */
function countAllReplies(replies) {
    let count = replies.length;
    replies.forEach(reply => {
        if (reply.replies && reply.replies.length > 0) {
            count += countAllReplies(reply.replies);
        }
    });
    return count;
}

/**
 * Render nested replies
 */
function renderReplies(replies, depth, options) {
    const { collections = [] } = options;
    return replies.map(reply => {
        const collectionName = reply.collectionId
            ? collections.find(c => c.id === reply.collectionId)?.name
            : null;
        return renderQuoteCard(reply, collectionName, depth, options);
    }).join('');
}

/**
 * Render tags
 */
function renderTags(tags) {
    if (!tags || tags.length === 0) return '';
    return tags.map(t => `<span class="tag">${escapeHtml(t)}</span>`).join('');
}

/**
 * Generate HTML for quote list with tree structure
 * @param {Array} quotes - Array of quotes (tree structure with replies)
 * @param {Array} collections - Array of collections to get names
 * @returns {string} - HTML for all cards
 */
export function renderQuoteList(quotes, collections) {
    const options = { collections };
    return quotes.map(quote => {
        const collectionName = quote.collectionId
            ? collections.find(c => c.id === quote.collectionId)?.name
            : null;
        return renderQuoteCard(quote, collectionName, 0, options);
    }).join('');
}
