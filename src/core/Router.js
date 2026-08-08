import { Component } from './Component.js';

/**
 * Router — Gestiona qué componente de feature está montado en el área de contenido.
 *
 * Principios SOLID aplicados:
 *  - S (Single Responsibility): solo gestiona qué componente está activo
 *    en su outlet y el ciclo mount/unmount al navegar.
 *  - L (Liskov Substitution): trabaja con cualquier subclase de Component,
 *    no depende de features concretas.
 *  - D (Dependency Inversion): recibe la clase de componente a montar como
 *    parámetro, no la instancia directamente.
 *
 * Uso:
 *   const router = new Router('#content-area');
 *   router.navigate(WikiFeature, { topicService, userId });
 *   // Más tarde:
 *   router.navigate(QuotesFeature, { quoteService, userId });
 *   // El WikiFeature se desmonta automáticamente antes de montar QuotesFeature.
 */
export class Router {
    /**
     * @param {HTMLElement | string} outlet - Elemento contenedor donde se montan los componentes.
     */
    constructor(outlet) {
        this._outlet = typeof outlet === 'string'
            ? document.querySelector(outlet)
            : outlet;

        if (!this._outlet) {
            throw new Error(
                `[Router] No se encontró el outlet: "${outlet}". ` +
                `El elemento debe existir en el DOM antes de crear el Router.`
            );
        }

        /** @type {Component | null} */
        this._current = null;
    }

    /**
     * Desmonta el componente actual (si existe) y monta uno nuevo.
     * @param {typeof Component} ComponentClass - La clase del componente a montar.
     * @param {object} [props={}] - Props que se pasan al nuevo componente.
     * @returns {Component} La instancia del componente recién montado.
     */
    navigate(ComponentClass, props = {}) {
        this._current?.unmount();
        this._current = new ComponentClass(this._outlet, props);
        this._current.mount();
        return this._current;
    }

    /**
     * Desmonta el componente actual sin montar otro.
     * Útil para limpiar el outlet al cerrar sesión.
     */
    unmountCurrent() {
        this._current?.unmount();
        this._current = null;
    }

    /**
     * Devuelve el componente actualmente montado, o null si no hay ninguno.
     * @returns {Component | null}
     */
    getCurrent() {
        return this._current;
    }
}
