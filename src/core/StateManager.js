/**
 * StateManager — Store reactiva centralizada.
 *
 * Principios SOLID aplicados:
 *  - S (Single Responsibility): única fuente de verdad del estado de la app.
 *  - D (Dependency Inversion): los componentes dependen de StateManager
 *    (abstracción), no del objeto `state` global mutable de main.js.
 *
 * Reemplaza:
 *  - El objeto global `const state = { quotes, collections, ... }` de main.js
 *  - Las mutaciones directas: state.quotes = quotes; renderQuotes();
 *  - El cache de elementos `const elements = { ... }`
 */

class StateManagerClass {
    constructor() {
        this._state = {
            // ── Datos ─────────────────────────────────────────────────────────
            quotes:           [],
            collections:      [],
            topics:           [],
            insights:         [],

            // ── Navegación ────────────────────────────────────────────────────
            /** @type {'wiki' | 'quotes' | 'insights'} */
            currentSection:   'wiki',
            /** @type {'list' | 'compare'} */
            currentView:      'list',
            currentTopicId:   null,
            currentInsightId: null,

            // ── Filtros Quotes ─────────────────────────────────────────────────
            quoteFilters: {
                searchTerm:    '',
                collectionId:  '',
                stance:        '',
                favoriteOnly:  false,
                sortBy:        'newest',
            },

            // ── Filtros Wiki ───────────────────────────────────────────────────
            wikiSearchTerm:   '',
            wikiSortBy:       'newest',

            // ── Filtros Insights ───────────────────────────────────────────────
            insightFilters: {
                status:       '',
                sourceType:   '',
                searchTerm:   '',
            },

            // ── Auth ──────────────────────────────────────────────────────────
            currentUser:      null,
            /** @type {'login' | 'register'} */
            authMode:         'login',
        };

        /** @type {Map<string, Set<Function>>} */
        this._subscribers = new Map();
    }

    /**
     * Lee el valor de una clave del estado.
     * @template {keyof typeof this._state} K
     * @param {K} key
     * @returns {typeof this._state[K]}
     */
    get(key) {
        return this._state[key];
    }

    /**
     * Devuelve una copia superficial del estado completo (solo lectura).
     * @returns {object}
     */
    getAll() {
        return { ...this._state };
    }

    /**
     * Actualiza una o más claves del estado y notifica a los suscriptores.
     * @param {Partial<typeof this._state>} updates
     */
    set(updates) {
        const changedKeys = Object.keys(updates);
        Object.assign(this._state, updates);

        // Notificar suscriptores de cada clave modificada
        changedKeys.forEach(key => {
            this._subscribers.get(key)?.forEach(fn => {
                try {
                    fn(this._state[key]);
                } catch (err) {
                    console.error(`[StateManager] Error en suscriptor de "${key}":`, err);
                }
            });
        });

        // Notificar suscriptores wildcard (escuchan todos los cambios)
        this._subscribers.get('*')?.forEach(fn => {
            try {
                fn(this._state);
            } catch (err) {
                console.error('[StateManager] Error en suscriptor wildcard:', err);
            }
        });
    }

    /**
     * Se suscribe a los cambios de una clave específica del estado.
     * @param {string} key - Clave del estado, o '*' para escuchar cualquier cambio.
     * @param {Function} handler - Función llamada con el nuevo valor al cambiar.
     * @returns {Function} Función de desuscripción — llamarla para dejar de escuchar.
     *
     * @example
     * const unsub = StateManager.subscribe('quotes', (quotes) => renderList(quotes));
     * // Más tarde:
     * unsub();
     */
    subscribe(key, handler) {
        if (!this._subscribers.has(key)) {
            this._subscribers.set(key, new Set());
        }
        this._subscribers.get(key).add(handler);
        return () => this._subscribers.get(key)?.delete(handler);
    }
}

export const StateManager = new StateManagerClass();
