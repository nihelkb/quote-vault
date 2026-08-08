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

/**
 * Convert text to URL-friendly slug
 * Used by renderMarkdown and extractHeadingsFromMarkdown for heading IDs
 */
export function slugify(text) {
    return text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').trim();
}

/**
 * Extract H1-H3 headings from markdown text (used for TOC generation)
 * @param {string} markdown
 * @returns {Array<{level: number, text: string, id: string}>}
 */
export function extractHeadingsFromMarkdown(markdown) {
    if (!markdown) return [];
    const headings = [];
    const lines = markdown.split('\n');
    for (const line of lines) {
        const match = line.match(/^(#{1,3})\s+(.+)$/);
        if (match) {
            const text = match[2].trim();
            headings.push({
                level: match[1].length,
                text: text,
                id: 'heading-' + slugify(escapeHtml(text))
            });
        }
    }
    return headings;
}

/**
 * Simple markdown renderer (basic support)
 * Converts markdown to HTML with support for headers, bold, italic,
 * code blocks, lists, blockquotes, links, strikethrough and horizontal rules.
 * @param {string} markdown
 * @returns {string} HTML string
 */
export function renderMarkdown(markdown) {
    let html = escapeHtml(markdown);

    // Fenced code blocks (must be before inline code)
    html = html.replace(/```\n?([\s\S]*?)```/g, '<pre><code>$1</code></pre>');

    // Headers (with IDs for TOC linking)
    html = html.replace(/^### (.+)$/gm, (_, text) => `<h3 id="heading-${slugify(text)}">${text}</h3>`);
    html = html.replace(/^## (.+)$/gm, (_, text) => `<h2 id="heading-${slugify(text)}">${text}</h2>`);
    html = html.replace(/^# (.+)$/gm, (_, text) => `<h1 id="heading-${slugify(text)}">${text}</h1>`);

    // Horizontal rules (before bold/italic to avoid conflicts with ***)
    html = html.replace(/^---$/gm, '<hr>');
    html = html.replace(/^\*\*\*$/gm, '<hr>');

    // Bold
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

    // Strikethrough
    html = html.replace(/~~(.+?)~~/g, '<del>$1</del>');

    // Italic
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

    // Links
    html = html.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');

    // Inline code
    html = html.replace(/`(.+?)`/g, '<code>$1</code>');

    // Ordered lists
    html = html.replace(/^\d+\. (.+)$/gm, '<li data-ol>$1</li>');
    html = html.replace(/((?:<li data-ol>[\s\S]*?<\/li>\n?)+)/g, '<ol>$1</ol>');
    html = html.replace(/ data-ol/g, '');

    // Unordered lists
    html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
    html = html.replace(/((?:<li>[\s\S]*?<\/li>\n?)+)/g, '<ul>$1</ul>');

    // Blockquotes
    html = html.replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>');

    // Line breaks
    html = html.replace(/\n\n/g, '</p><p>');
    html = '<p>' + html + '</p>';

    // Clean up empty paragraphs and unwanted p wrapping
    html = html.replace(/<p><\/p>/g, '');
    html = html.replace(/<p>(<h[123]>)/g, '$1');
    html = html.replace(/(<\/h[123]>)<\/p>/g, '$1');
    html = html.replace(/<p>(<ul>)/g, '$1');
    html = html.replace(/(<\/ul>)<\/p>/g, '$1');
    html = html.replace(/<p>(<ol>)/g, '$1');
    html = html.replace(/(<\/ol>)<\/p>/g, '$1');
    html = html.replace(/<p>(<blockquote>)/g, '$1');
    html = html.replace(/(<\/blockquote>)<\/p>/g, '$1');
    html = html.replace(/<p>(<pre>)/g, '$1');
    html = html.replace(/(<\/pre>)<\/p>/g, '$1');
    html = html.replace(/<p>(<hr>)/g, '$1');
    html = html.replace(/(<hr>)<\/p>/g, '$1');

    return html;
}

/**
 * Generate SVG icon markup for custom wiki sections
 * @param {string} iconName - Icon identifier key
 * @param {number} [size=20] - SVG dimensions in pixels
 * @returns {string} SVG HTML string
 */
export function getSectionIconSvg(iconName, size = 20) {
    const icons = {
        document: `<path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>`,
        list: `<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>`,
        bookmark: `<path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/>`,
        book: `<path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/>`,
        lightbulb: `<path d="M9 18h6M10 22h4M12 2a7 7 0 00-4 12.7V16a1 1 0 001 1h6a1 1 0 001-1v-1.3A7 7 0 0012 2z"/>`,
        star: `<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>`,
        globe: `<circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/>`,
        compass: `<circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/>`,
        layers: `<polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>`,
        hash: `<line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/><line x1="10" y1="3" x2="8" y2="21"/><line x1="16" y1="3" x2="14" y2="21"/>`,
        clock: `<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>`,
        users: `<path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>`
    };

    const iconPath = icons[iconName] || icons.document;
    return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">${iconPath}</svg>`;
}

/**
 * Generate SVG icon markup for wiki topics
 * @param {string} iconName - Icon identifier key
 * @param {number} [size=18] - SVG dimensions in pixels
 * @returns {string} SVG HTML string
 */
export function getTopicIconSvg(iconName, size = 18) {
    const icons = {
        folder: `<path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/>`,
        globe: `<circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/>`,
        coin: `<circle cx="12" cy="12" r="10"/><path d="M12 6v12M9 9h6M9 15h6"/>`,
        scale: `<path d="M12 3v18M5 8l7-5 7 5M5 8v5a7 7 0 007 7 7 7 0 007-7V8"/><circle cx="5" cy="11" r="2"/><circle cx="19" cy="11" r="2"/>`,
        building: `<path d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-4"/><path d="M9 9v.01M9 12v.01M9 15v.01M9 18v.01"/>`,
        flask: `<path d="M9 3h6M10 3v7.4a2 2 0 01-.5 1.3L4 19a2 2 0 001.5 3h13a2 2 0 001.5-3l-5.5-7.3a2 2 0 01-.5-1.3V3"/>`,
        code: `<polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>`,
        brain: `<path d="M12 5a3 3 0 00-3 3c0 1.5 1.5 3 1.5 3s-2.5.5-2.5 3a3 3 0 003 3"/><path d="M12 5a3 3 0 013 3c0 1.5-1.5 3-1.5 3s2.5.5 2.5 3a3 3 0 01-3 3"/><path d="M12 5V3M12 17v4"/>`,
        book: `<path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/>`,
        target: `<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>`,
        heart: `<path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>`,
        star: `<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>`
    };

    const iconPath = icons[iconName] || icons.folder;
    return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">${iconPath}</svg>`;
}

/**
 * Return the hex color value for a highlight color name
 * @param {string} color - 'yellow' | 'green' | 'blue' | 'pink'
 * @returns {string} CSS hex color
 */
export function getHighlightColor(color) {
    const colors = {
        yellow: '#fef08a',
        green:  '#bbf7d0',
        blue:   '#bfdbfe',
        pink:   '#fbcfe8'
    };
    return colors[color] || colors.yellow;
}

/**
 * Return a human-readable relative time string ("hace 2 días", "ayer", etc.)
 * @param {string} dateString - ISO date string
 * @returns {string}
 */
export function getRelativeTime(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return t('time.today');
    if (diffDays === 1) return t('time.yesterday');
    if (diffDays < 7) return t('time.daysAgo', { count: diffDays });
    if (diffDays < 30) return t('time.weeksAgo', { count: Math.floor(diffDays / 7) });
    return date.toLocaleDateString();
}
