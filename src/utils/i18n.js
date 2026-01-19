/**
 * Internationalization (i18n) Utility
 * Simple JSON-based translation system
 */

import es from '../locales/es.json';
import en from '../locales/en.json';

const translations = { es, en };
const STORAGE_KEY = 'quote-vault-language';
const DEFAULT_LOCALE = 'es';

class I18n {
    constructor() {
        this.locale = this.getSavedLocale();
        this.listeners = [];
    }

    /**
     * Get saved locale from localStorage or default
     */
    getSavedLocale() {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved && translations[saved]) {
            return saved;
        }
        // Try to detect browser language
        const browserLang = navigator.language?.split('-')[0];
        if (browserLang && translations[browserLang]) {
            return browserLang;
        }
        return DEFAULT_LOCALE;
    }

    /**
     * Get current locale
     */
    getLocale() {
        return this.locale;
    }

    /**
     * Set locale and save to localStorage
     */
    setLocale(locale) {
        if (!translations[locale]) {
            console.warn(`Locale "${locale}" not found, using default`);
            locale = DEFAULT_LOCALE;
        }
        this.locale = locale;
        localStorage.setItem(STORAGE_KEY, locale);
        document.documentElement.lang = locale;
        this.translatePage();
        this.notifyListeners();
    }

    /**
     * Get translation by key path (e.g., 'auth.login')
     * @param {string} key - Dot-separated key path
     * @param {Object} params - Optional parameters for interpolation
     */
    t(key, params = {}) {
        const keys = key.split('.');
        let value = translations[this.locale];

        for (const k of keys) {
            if (value && typeof value === 'object' && k in value) {
                value = value[k];
            } else {
                console.warn(`Translation key "${key}" not found for locale "${this.locale}"`);
                return key;
            }
        }

        // Handle interpolation {param}
        if (typeof value === 'string' && Object.keys(params).length > 0) {
            return value.replace(/\{(\w+)\}/g, (match, paramKey) => {
                return params[paramKey] !== undefined ? params[paramKey] : match;
            });
        }

        return value;
    }

    /**
     * Get available locales
     */
    getAvailableLocales() {
        return Object.keys(translations);
    }

    /**
     * Subscribe to locale changes
     */
    onLocaleChange(callback) {
        this.listeners.push(callback);
        return () => {
            this.listeners = this.listeners.filter(l => l !== callback);
        };
    }

    /**
     * Notify listeners of locale change
     */
    notifyListeners() {
        this.listeners.forEach(callback => callback(this.locale));
    }

    /**
     * Translate all elements with data-i18n attribute
     */
    translatePage() {
        // Translate text content
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            el.textContent = this.t(key);
        });

        // Translate placeholders
        document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
            const key = el.getAttribute('data-i18n-placeholder');
            el.placeholder = this.t(key);
        });

        // Translate titles
        document.querySelectorAll('[data-i18n-title]').forEach(el => {
            const key = el.getAttribute('data-i18n-title');
            el.title = this.t(key);
        });

        // Translate option values
        document.querySelectorAll('[data-i18n-options]').forEach(select => {
            const optionsKey = select.getAttribute('data-i18n-options');
            const options = select.querySelectorAll('option[data-i18n]');
            options.forEach(option => {
                const key = option.getAttribute('data-i18n');
                option.textContent = this.t(key);
            });
        });
    }

    /**
     * Initialize i18n - call after DOM is ready
     */
    init() {
        document.documentElement.lang = this.locale;
        this.translatePage();
    }
}

// Singleton instance
export const i18n = new I18n();

// Shorthand function for translations
export const t = (key, params) => i18n.t(key, params);
