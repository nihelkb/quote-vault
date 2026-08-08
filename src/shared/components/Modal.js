import { Component } from '../../core/Component.js';

/**
 * Modal — Clase base para modales de la aplicación.
 *
 * Genera la estructura overlay + panel y gestiona el ciclo de vida
 * (abrir, cerrar, Escape, click fuera). Las subclases sobreescriben
 * `renderBody()` para añadir el contenido específico del modal.
 *
 * Principios SOLID aplicados:
 *  - S (Single Responsibility): solo gestiona estructura base y
 *    comportamiento común de modales (open/close/escape/overlay-click).
 *  - O (Open/Closed): extensible mediante subclases que implementan
 *    `renderBody()` sin modificar esta clase.
 *  - L (Liskov Substitution): cualquier subclase puede usarse donde
 *    se espera un Modal.
 *
 * @example
 * class MyModal extends Modal {
 *     renderBody() {
 *         return `<form>...</form>`;
 *     }
 * }
 * const modal = new MyModal(document.body, { title: 'My modal' });
 * modal.mount();
 * modal.open();
 */
export class Modal extends Component {
    /**
     * @param {HTMLElement|string} container - Elemento donde se renderiza el modal
     * @param {object} [props={}]
     * @param {string} [props.id]       - id HTML del overlay (opcional)
     * @param {string} [props.title]    - Título del modal (opcional)
     * @param {Function} [props.onClose] - Callback al cerrar
     */
    constructor(container, props = {}) {
        super(container, props);
        this._overlay = null;
    }

    // ── Lifecycle ────────────────────────────────────────────────────────────

    render() {
        const { id = '', title = '' } = this.props;
        const idAttr = id ? ` id="${id}"` : '';
        return `
            <div class="modal-overlay"${idAttr}>
                <div class="modal">
                    ${title ? `<h2>${title}</h2>` : ''}
                    ${this.renderBody()}
                </div>
            </div>
        `;
    }

    /**
     * Contenido específico del modal. Sobreescribir en subclases.
     * @returns {string} HTML que va dentro de `.modal`
     */
    renderBody() {
        return '';
    }

    onMount() {
        this._overlay = this.$('.modal-overlay');

        // Cerrar con Escape
        this.listen(document, 'keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen()) this.close();
        });

        // Cerrar al hacer click en el overlay (fuera del panel)
        this.listen(this._overlay, 'click', (e) => {
            if (e.target === this._overlay) this.close();
        });
    }

    // ── API Pública ──────────────────────────────────────────────────────────

    /** Abre el modal añadiendo la clase `active` al overlay. */
    open() {
        this._overlay?.classList.add('active');
    }

    /** Cierra el modal y llama al callback `onClose` si existe. */
    close() {
        this._overlay?.classList.remove('active');
        this.props.onClose?.();
    }

    /** Devuelve `true` si el modal está visible. */
    isOpen() {
        return this._overlay?.classList.contains('active') ?? false;
    }
}
