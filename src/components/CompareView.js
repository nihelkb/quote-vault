/**
 * CompareView Component
 * Single Responsibility: Renders the compare view for quotes (favor vs against)
 * Enhanced to show arguments with their counterarguments
 */
import { escapeHtml } from '../utils/helpers.js';
import { t } from '../utils/i18n.js';

/**
 * Generate HTML for a quote in compare view with its counterarguments
 */
function renderCompareQuote(quote, allQuotes) {
    const counterarguments = getCounterarguments(quote, allQuotes);
    const hasCounters = counterarguments.length > 0;

    return `
        <div class="compare-quote ${hasCounters ? 'has-counters' : ''}" data-quote-id="${quote.id}">
            <div class="compare-quote-main">
                <p class="quote-text">${escapeHtml(quote.text)}</p>
                <div class="quote-author">— ${escapeHtml(quote.author)}</div>
                ${quote.source ? `<div class="quote-source">${escapeHtml(quote.source)}</div>` : ''}
            </div>
            ${hasCounters ? renderCounterarguments(counterarguments, allQuotes) : renderNoCounters(quote)}
        </div>
    `;
}

/**
 * Get direct counterarguments (replies with opposite stance)
 */
function getCounterarguments(quote, allQuotes) {
    return allQuotes.filter(q =>
        q.parentId === quote.id &&
        ((quote.stance === 'favor' && q.stance === 'contra') ||
         (quote.stance === 'contra' && q.stance === 'favor'))
    );
}

/**
 * Render counterarguments section
 */
function renderCounterarguments(counters, allQuotes) {
    return `
        <div class="compare-counters">
            <div class="counters-header">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="9 14 4 9 9 4"></polyline>
                    <path d="M20 20v-7a4 4 0 0 0-4-4H4"></path>
                </svg>
                <span>${counters.length} ${counters.length === 1 ? t('replies.reply') : t('replies.replies')}</span>
            </div>
            <div class="counters-list">
                ${counters.map(counter => renderCounterQuote(counter, allQuotes)).join('')}
            </div>
        </div>
    `;
}

/**
 * Render a single counterargument
 */
function renderCounterQuote(counter, allQuotes) {
    const nestedCounters = getCounterarguments(counter, allQuotes);
    const hasNested = nestedCounters.length > 0;

    return `
        <div class="counter-quote">
            <p class="counter-text">${escapeHtml(counter.text)}</p>
            <div class="counter-author">— ${escapeHtml(counter.author)}</div>
            ${hasNested ? `
                <div class="nested-counters">
                    ${nestedCounters.map(nc => `
                        <div class="nested-counter">
                            <p class="counter-text">${escapeHtml(nc.text)}</p>
                            <div class="counter-author">— ${escapeHtml(nc.author)}</div>
                        </div>
                    `).join('')}
                </div>
            ` : ''}
        </div>
    `;
}

/**
 * Render "add counterargument" hint when no counters exist
 */
function renderNoCounters(quote) {
    const oppositeStance = quote.stance === 'favor' ? 'contra' : 'favor';
    return `
        <button class="add-counter-hint" onclick="openReplyModal('${quote.id}', '${oppositeStance}', '${quote.collectionId || ''}')">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            <span>${t('replies.addReply')}</span>
        </button>
    `;
}

/**
 * Generate HTML for empty quote column
 */
function renderEmptyColumn(stance) {
    const messages = {
        favor: t('quotes.noQuotesFavor'),
        contra: t('quotes.noQuotesAgainst')
    };
    return `<p class="empty-compare">${messages[stance] || t('quotes.noQuotes')}</p>`;
}

/**
 * Render quote column with counterarguments support
 */
function renderColumn(quotes, allQuotes, stance) {
    if (quotes.length === 0) {
        return renderEmptyColumn(stance);
    }
    return quotes.map(q => renderCompareQuote(q, allQuotes)).join('');
}

/**
 * Update the compare view
 * @param {Array} quotes - All quotes (to find counterarguments)
 * @param {Object} elements - DOM element references { favorEl, againstEl }
 */
export function updateCompareView(quotes, elements) {
    // Get root quotes only (not replies)
    const rootQuotes = quotes.filter(q => !q.parentId);
    const favorQuotes = rootQuotes.filter(q => q.stance === 'favor');
    const againstQuotes = rootQuotes.filter(q => q.stance === 'contra');

    elements.favorEl.innerHTML = renderColumn(favorQuotes, quotes, 'favor');
    elements.againstEl.innerHTML = renderColumn(againstQuotes, quotes, 'contra');
}

/**
 * Filter quotes for compare view (exclude neutral)
 */
export function filterForCompare(quotes) {
    return quotes.filter(q => q.stance === 'favor' || q.stance === 'contra');
}
