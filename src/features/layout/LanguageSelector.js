import { Component } from '../../core/Component.js';

/**
 * LanguageSelector — Gestiona todos los selectores de idioma de la app.
 *
 * Behavioral wrapper: trabaja sobre el DOM existente (index.html).
 * Gestiona: selector del sidebar, selector móvil y los selectores
 * duplicados en las cabeceras de wiki e insights.
 *
 * @example
 * const langSel = new LanguageSelector(document.body, { i18n });
 * langSel.mount();
 */
export class LanguageSelector extends Component {
    static _langConfig = {
        es: {
            label: 'ES',
            flagSvg: '<path fill="#c60b1e" d="M0 0h640v480H0z"/><path fill="#ffc400" d="M0 120h640v240H0z"/>'
        },
        en: {
            label: 'EN',
            flagSvg: '<path fill="#012169" d="M0 0h640v480H0z"/><path fill="#FFF" d="m75 0 244 181L562 0h78v62L400 241l240 178v61h-80L320 301 81 480H0v-60l239-178L0 64V0h75z"/><path fill="#C8102E" d="m424 281 216 159v40L369 281h55zm-184 20 6 35L54 480H0l240-179zM640 0v3L391 191l2-44L590 0h50zM0 0l239 176h-60L0 42V0z"/><path fill="#FFF" d="M241 0v480h160V0H241zM0 160v160h640V160H0z"/><path fill="#C8102E" d="M0 193v96h640v-96H0zM273 0v480h96V0h-96z"/>'
        }
    };

    // Behavioral wrapper: no reemplazar HTML existente
    mount() {
        if (this._mounted) return this;
        this._mounted = true;
        this.onMount();
        return this;
    }

    onMount() {
        const { i18n } = this.props;

        // Aplica el locale inicial a todos los selectores
        this._updateAll(i18n.getLocale());

        // ── Selector del sidebar ───────────────────────────────────────────
        this._setupSelector(
            document.getElementById('languageSelector'),
            document.getElementById('languageBtn'),
            document.getElementById('languageDropdown'),
            i18n
        );

        // ── Selector móvil ─────────────────────────────────────────────────
        this._setupSelector(
            document.getElementById('languageSelectorMobile'),
            document.getElementById('languageBtnMobile'),
            document.getElementById('languageDropdownMobile'),
            i18n
        );

        // ── Selectores en cabeceras (wiki / insights) ──────────────────────
        document.querySelectorAll('.header-language-selector').forEach(wrapper => {
            this._setupSelector(
                wrapper,
                wrapper.querySelector('.language-btn'),
                wrapper.querySelector('.language-dropdown'),
                i18n
            );
        });

        // ── Cerrar al hacer click fuera ────────────────────────────────────
        this.listen(document, 'click', () => this._closeAll());
    }

    // ── Internos ─────────────────────────────────────────────────────────────

    _setupSelector(wrapper, btn, dropdown, i18n) {
        if (!wrapper || !btn || !dropdown) return;

        this.listen(btn, 'click', (e) => {
            e.stopPropagation();
            this._closeAll();
            wrapper.classList.toggle('open');
        });

        dropdown.querySelectorAll('.language-option').forEach(option => {
            this.listen(option, 'click', (e) => {
                e.stopPropagation();
                const lang = option.dataset.lang;
                i18n.setLocale(lang);
                this._updateAll(lang);
                this._closeAll();
            });
        });
    }

    _closeAll() {
        document.querySelectorAll('.language-selector, .header-language-selector')
            .forEach(el => el.classList.remove('open'));
    }

    _updateAll(locale) {
        const cfg = LanguageSelector._langConfig[locale] || LanguageSelector._langConfig.es;

        // Actualizar labels
        const currentLang = document.getElementById('currentLang');
        if (currentLang) currentLang.textContent = cfg.label;

        const currentLangMobile = document.getElementById('currentLangMobile');
        if (currentLangMobile) currentLangMobile.textContent = cfg.label;

        // Actualizar active en todos los dropdowns
        document.querySelectorAll('.language-dropdown .language-option').forEach(opt => {
            opt.classList.toggle('active', opt.dataset.lang === locale);
        });
    }
}
