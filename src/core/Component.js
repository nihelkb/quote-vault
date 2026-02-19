import { EventBus } from './EventBus.js';
import { StateManager } from './StateManager.js';

/**
 * Component — Clase base para todos los componentes de la UI.
 *
 * Principios SOLID aplicados:
 *  - S (Single Responsibility): cada subclase tiene una única razón para cambiar
 *    (su propia vista). Esta clase base solo gestiona el lifecycle.
 *  - O (Open/Closed): extensible mediante subclases sin modificar esta clase.
 *  - L (Liskov Substitution): cualquier subclase puede usarse donde se espera
 *    un Component (el Router, el AppShell, etc. trabajan con Component genérico).
 *  - I (Interface Segregation): las subclases solo implementan los hooks que
 *    necesitan (onMount, onUnmount, onUpdate son opcionales).
 *  - D (Dependency Inversion): depende de EventBus y StateManager como
 *    abstracciones, no de servicios concretos.
 *
 * Ciclo de vida:
 *   new Component(container, props)
 *       │
 *       ▼
 *   mount()  ──► innerHTML = render()  ──► onMount() ──► [listeners activos]
 *       │
 *   update(newProps)  ──► onUpdate() ──► _rerender() ──► onMount()
 *       │
 *   unmount()  ──► onUnmount()  ──► cleanup listeners  ──► innerHTML = ''
 */
export class Component {
    /**
     * @param {HTMLElement | string} container - Elemento DOM o selector CSS.
     * @param {object} [props={}] - Propiedades iniciales pasadas por el padre.
     */
    constructor(container, props = {}) {
        this._container = typeof container === 'string'
            ? document.querySelector(container)
            : container;

        if (!this._container) {
            throw new Error(
                `[Component] No se encontró el contenedor: "${container}". ` +
                `Asegúrate de que el elemento existe en el DOM antes de instanciar el componente.`
            );
        }

        this.props = props;

        /** @type {Component[]} Componentes hijo registrados para cleanup automático */
        this._children = [];

        /** @type {Array<{element: Element, event: string, handler: Function}>} */
        this._listeners = [];

        /** @type {Function[]} Desuscriptores de StateManager */
        this._stateSubs = [];

        /** @type {Function[]} Desuscriptores de EventBus */
        this._busSubs = [];

        this._mounted = false;
    }

    // ── Lifecycle — sobreescribir en subclases ──────────────────────────────

    /**
     * Devuelve el HTML que se inyecta en el contenedor.
     * Las subclases DEBEN sobreescribir este método.
     * @returns {string}
     */
    render() {
        return '';
    }

    /**
     * Se llama una vez tras el primer render.
     * Aquí se registran los event listeners y se montan componentes hijo.
     */
    onMount() {}

    /**
     * Se llama justo antes de destruir el componente.
     * Aquí se limpian timers externos, suscripciones externas, etc.
     */
    onUnmount() {}

    /**
     * Se llama cuando cambian las props o el estado.
     * Por defecto hace un re-render completo. Sobreescribir para actualizaciones quirúrgicas.
     */
    onUpdate() {
        this._rerender();
    }

    // ── API Pública ─────────────────────────────────────────────────────────

    /**
     * Renderiza el componente en el contenedor y llama a onMount.
     * @returns {this}
     */
    mount() {
        this._container.innerHTML = this.render();
        this._mounted = true;
        this.onMount();
        return this;
    }

    /**
     * Destruye el componente: limpia listeners, hijos y vaía el contenedor.
     */
    unmount() {
        if (!this._mounted) return;

        this.onUnmount();

        // Desmontar hijos
        this._children.forEach(child => child.unmount());
        this._children = [];

        // Eliminar listeners DOM
        this._listeners.forEach(({ element, event, handler }) => {
            element.removeEventListener(event, handler);
        });
        this._listeners = [];

        // Cancelar suscripciones a StateManager
        this._stateSubs.forEach(unsub => unsub());
        this._stateSubs = [];

        // Cancelar suscripciones a EventBus
        this._busSubs.forEach(unsub => unsub());
        this._busSubs = [];

        this._container.innerHTML = '';
        this._mounted = false;
    }

    /**
     * Actualiza las props y dispara onUpdate (re-render por defecto).
     * @param {object} newProps - Props parciales a mezclar con las actuales.
     */
    update(newProps = {}) {
        this.props = { ...this.props, ...newProps };
        if (this._mounted) {
            this.onUpdate();
        }
    }

    // ── Helpers para subclases ──────────────────────────────────────────────

    /**
     * Busca un elemento dentro del contenedor propio del componente.
     * @param {string} selector
     * @returns {HTMLElement | null}
     */
    $(selector) {
        return this._container.querySelector(selector);
    }

    /**
     * Busca todos los elementos dentro del contenedor propio del componente.
     * @param {string} selector
     * @returns {NodeListOf<HTMLElement>}
     */
    $$(selector) {
        return this._container.querySelectorAll(selector);
    }

    /**
     * Registra un listener DOM que se eliminará automáticamente al desmontar.
     * @param {HTMLElement | Window | Document} element
     * @param {string} event
     * @param {Function} handler
     * @param {object} [options] - Opciones de addEventListener (capture, once, etc.)
     */
    listen(element, event, handler, options) {
        if (!element) return;
        element.addEventListener(event, handler, options);
        this._listeners.push({ element, event, handler });
    }

    /**
     * Se suscribe a un evento del EventBus. La suscripción se cancela automáticamente
     * al desmontar el componente.
     * @param {string} eventName - Usar las constantes de Events de EventBus.js
     * @param {Function} handler
     */
    on(eventName, handler) {
        const unsub = EventBus.on(eventName, handler);
        this._busSubs.push(unsub);
    }

    /**
     * Se suscribe a cambios de una clave del StateManager. La suscripción se cancela
     * automáticamente al desmontar el componente.
     * @param {string} key - Clave del estado (ej: 'quotes', 'currentSection')
     * @param {Function} handler - Llamada con el nuevo valor cuando cambia
     */
    watchState(key, handler) {
        const unsub = StateManager.subscribe(key, handler);
        this._stateSubs.push(unsub);
    }

    /**
     * Monta un componente hijo y lo registra para que se desmonte automáticamente
     * cuando este componente se desmonte.
     * @param {Component} child
     * @returns {Component} El mismo hijo, para encadenar
     */
    mountChild(child) {
        this._children.push(child);
        child.mount();
        return child;
    }

    // ── Internos ────────────────────────────────────────────────────────────

    /**
     * Re-render completo: limpia hijos y listeners DOM, vuelve a renderizar
     * e invoca onMount. Las suscripciones a StateManager y EventBus se mantienen.
     * @private
     */
    _rerender() {
        // Desmontar hijos (sus subs se limpian solas)
        this._children.forEach(c => c.unmount());
        this._children = [];

        // Limpiar listeners DOM (se re-registrarán en onMount)
        this._listeners.forEach(({ element, event, handler }) => {
            element.removeEventListener(event, handler);
        });
        this._listeners = [];

        this._container.innerHTML = this.render();
        this.onMount();
    }
}
