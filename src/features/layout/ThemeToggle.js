import { Component } from '../../core/Component.js';

const THEME_KEY = 'quotevault-theme';

/**
 * ThemeToggle — Gestiona todos los botones de toggle de tema (claro/oscuro).
 *
 * Behavioral wrapper: actúa sobre los elementos `.theme-toggle-btn` existentes
 * en el DOM (definidos en index.html). No genera HTML propio.
 *
 * Responsabilidades:
 *  - Aplicar el tema actual al `<html>` via `data-theme`
 *  - Persistir la preferencia en localStorage
 *  - Registrar listeners en todos los botones `.theme-toggle-btn`
 *  - Actualizar los tooltips/aria-label de todos los botones al cambiar
 *
 * @example
 * const themeToggle = new ThemeToggle(document.body);
 * themeToggle.mount();
 */
export class ThemeToggle extends Component {
    // Behavioral wrapper: no reemplazar HTML existente
    mount() {
        if (this._mounted) return this;
        this._mounted = true;
        this.onMount();
        return this;
    }

    onMount() {
        // Aplica el tema inicial (puede venir del anti-flash inline de index.html)
        this._applyTheme(this._getCurrentTheme());

        document.querySelectorAll('.theme-toggle-btn').forEach(btn => {
            this.listen(btn, 'click', () => this._toggle());
        });
    }

    // ── Internos ─────────────────────────────────────────────────────────────

    _getCurrentTheme() {
        // Respeta lo que el script anti-flash ya escribió en el <html>
        const fromHtml = document.documentElement.dataset.theme;
        if (fromHtml === 'light' || fromHtml === 'dark') return fromHtml;

        try {
            const stored = localStorage.getItem(THEME_KEY);
            if (stored === 'light' || stored === 'dark') return stored;
        } catch { /* sin acceso a localStorage */ }

        return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }

    _applyTheme(theme) {
        document.documentElement.dataset.theme = theme;
        const tooltip = `Cambiar a modo ${theme === 'dark' ? 'claro' : 'oscuro'}`;
        document.querySelectorAll('.theme-toggle-btn').forEach(btn => {
            btn.setAttribute('aria-label', tooltip);
            btn.dataset.tooltip = tooltip;
        });
    }

    _toggle() {
        const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
        this._applyTheme(next);
        try { localStorage.setItem(THEME_KEY, next); } catch { /* ignorar */ }
    }
}
