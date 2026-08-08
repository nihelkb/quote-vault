import { Component } from '../../core/Component.js';
import { getSectionIconSvg, getTopicIconSvg } from '../../utils/helpers.js';

/**
 * IconPicker — Componente de selección de iconos SVG.
 *
 * Renderiza un grid de botones de icono y notifica al consumidor
 * cuál ha sido seleccionado. Unifica el comportamiento de los
 * anteriores `setupIconPicker` y `setupSvgIconPicker` de main.js.
 *
 * Principios SOLID aplicados:
 *  - S (Single Responsibility): solo gestiona la selección visual
 *    de un icono; no conoce el formulario al que pertenece.
 *  - O (Open/Closed): se amplía el catálogo de iconos en helpers.js
 *    sin modificar esta clase.
 *  - D (Dependency Inversion): el callback `onSelect` es inyectado,
 *    no hardcodeado.
 *
 * @example
 * const picker = new IconPicker(formEl, {
 *     variant: 'topic',
 *     selectedIcon: 'folder',
 *     onSelect: (icon) => { hiddenInput.value = icon; }
 * });
 * picker.mount();
 */
export class IconPicker extends Component {
    /**
     * @param {HTMLElement|string} container - Elemento donde se renderiza el picker
     * @param {object} [props={}]
     * @param {'section'|'topic'} [props.variant='section'] - Conjunto de iconos
     * @param {string} [props.selectedIcon='']              - Icono preseleccionado
     * @param {Function} [props.onSelect]                   - Callback (iconName: string) => void
     */
    constructor(container, props = {}) {
        super(container, props);
    }

    // ── Icono sets ───────────────────────────────────────────────────────────

    static SECTION_ICONS = [
        'document', 'list', 'bookmark', 'book', 'lightbulb',
        'star', 'globe', 'compass', 'layers', 'hash', 'clock', 'users'
    ];

    static TOPIC_ICONS = [
        'folder', 'globe', 'coin', 'scale', 'building', 'flask',
        'code', 'brain', 'book', 'target', 'heart', 'star'
    ];

    // ── Lifecycle ────────────────────────────────────────────────────────────

    render() {
        const { variant = 'section', selectedIcon = '' } = this.props;
        const icons = variant === 'topic' ? IconPicker.TOPIC_ICONS : IconPicker.SECTION_ICONS;
        const getIcon = variant === 'topic' ? getTopicIconSvg : getSectionIconSvg;

        const buttons = icons.map(name => {
            const selected = name === selectedIcon ? ' selected' : '';
            return `<button type="button" class="icon-btn${selected}" data-icon="${name}">${getIcon(name, 20)}</button>`;
        }).join('');

        return `<div class="icon-picker-grid">${buttons}</div>`;
    }

    onMount() {
        this.listen(this.$('.icon-picker-grid'), 'click', (e) => {
            const btn = e.target.closest('.icon-btn');
            if (!btn) return;

            // Actualizar estado visual
            this.$$('.icon-btn').forEach(b => b.classList.toggle('selected', b === btn));

            // Notificar al consumidor
            this.props.onSelect?.(btn.dataset.icon);
        });
    }

    // ── API Pública ──────────────────────────────────────────────────────────

    /**
     * Cambia el icono seleccionado programáticamente.
     * @param {string} iconName
     */
    setSelected(iconName) {
        this.$$('.icon-btn').forEach(b => {
            b.classList.toggle('selected', b.dataset.icon === iconName);
        });
    }

    /**
     * Devuelve el nombre del icono actualmente seleccionado.
     * @returns {string}
     */
    getSelected() {
        return this.$('.icon-btn.selected')?.dataset.icon ?? '';
    }
}
