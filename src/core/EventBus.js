/**
 * EventBus — Pub/sub centralizado para comunicación entre componentes.
 *
 * Principios SOLID aplicados:
 *  - I (Interface Segregation): los componentes solo se suscriben a los eventos
 *    que necesitan, no a un objeto de estado global completo.
 *  - D (Dependency Inversion): los componentes dependen del EventBus (abstracción),
 *    no unos de otros directamente.
 *
 * Reemplaza:
 *  - Los 60+ window.* globals (window.openModal, window.deleteQuote, etc.)
 *  - El acoplamiento directo entre funciones de distintas secciones
 *  - Los onclick="..." inline que invocan funciones globales
 */

class EventBusClass {
    constructor() {
        /** @type {Map<string, Set<Function>>} */
        this._handlers = new Map();
    }

    /**
     * Suscribe un handler a un evento.
     * @param {string} event
     * @param {Function} handler
     * @returns {Function} Función de desuscripción
     */
    on(event, handler) {
        if (!this._handlers.has(event)) {
            this._handlers.set(event, new Set());
        }
        this._handlers.get(event).add(handler);
        return () => this._handlers.get(event)?.delete(handler);
    }

    /**
     * Suscribe un handler que se ejecuta una sola vez.
     * @param {string} event
     * @param {Function} handler
     * @returns {Function} Función de desuscripción
     */
    once(event, handler) {
        const wrapper = (payload) => {
            handler(payload);
            this._handlers.get(event)?.delete(wrapper);
        };
        return this.on(event, wrapper);
    }

    /**
     * Desuscribe un handler de un evento.
     * @param {string} event
     * @param {Function} handler
     */
    off(event, handler) {
        this._handlers.get(event)?.delete(handler);
    }

    /**
     * Emite un evento con un payload opcional.
     * @param {string} event
     * @param {*} payload
     */
    emit(event, payload) {
        this._handlers.get(event)?.forEach(handler => {
            try {
                handler(payload);
            } catch (err) {
                console.error(`[EventBus] Error en el handler de "${event}":`, err);
            }
        });
    }
}

export const EventBus = new EventBusClass();

/**
 * Constantes de nombres de evento.
 * Usar siempre estas constantes en lugar de strings literales para evitar typos.
 */
export const Events = {
    // ── Auth ──────────────────────────────────────────────────────────────────
    AUTH_STATE_CHANGED:      'auth:stateChanged',      // payload: user | null
    AUTH_LOGOUT_REQUESTED:   'auth:logoutRequested',

    // ── Navegación ────────────────────────────────────────────────────────────
    SECTION_SWITCH:          'nav:switchSection',       // payload: 'wiki' | 'quotes' | 'insights'
    TOPIC_OPEN:              'nav:openTopic',            // payload: topicId
    INSIGHT_OPEN:            'nav:openInsight',          // payload: insightId
    BACK_TO_LIST:            'nav:backToList',

    // ── Quotes ────────────────────────────────────────────────────────────────
    QUOTE_OPEN_MODAL:        'quotes:openModal',        // payload: quoteId | null
    QUOTE_OPEN_REPLY:        'quotes:openReply',        // payload: { parentId, stance, collectionId }
    QUOTE_TOGGLE_FAVORITE:   'quotes:toggleFavorite',   // payload: { id, value }
    QUOTE_DELETE:            'quotes:delete',            // payload: quoteId
    QUOTE_TOGGLE_REPLIES:    'quotes:toggleReplies',    // payload: toggleId
    QUOTE_VIEW_CHANGED:      'quotes:viewChanged',      // payload: 'list' | 'compare'
    QUOTE_FILTER_CHANGED:    'quotes:filterChanged',

    // ── Collections ───────────────────────────────────────────────────────────
    COLLECTION_OPEN_MODAL:   'collections:openModal',

    // ── Wiki / Topics ─────────────────────────────────────────────────────────
    TOPIC_OPEN_MODAL:        'topics:openModal',        // payload: topic | null
    TOPIC_DELETE:            'topics:delete',            // payload: topicId
    SECTION_OPEN:            'sections:open',            // payload: sectionId
    SECTION_CREATE:          'sections:create',
    SECTION_DELETE:          'sections:delete',          // payload: sectionId
    SECTION_CONTENT_SAVED:   'sections:contentSaved',   // payload: { sectionId, content }
    HIGHLIGHT_LINKED:        'sections:highlightLinked',

    // ── Insights ──────────────────────────────────────────────────────────────
    INSIGHT_OPEN_MODAL:      'insights:openModal',      // payload: insight | null
    INSIGHT_DELETE:          'insights:delete',          // payload: insightId
    INSIGHT_STATUS_CHANGE:   'insights:statusChange',   // payload: { insightId, status }
    INSIGHT_LINK_TOPIC:      'insights:linkTopic',      // payload: { insightId, topicId }
    HIGHLIGHT_ADD:           'insights:highlightAdd',   // payload: { insightId, text, color }
    HIGHLIGHT_REMOVE:        'insights:highlightRemove',
    HIGHLIGHT_COLOR_CHANGE:  'insights:highlightColorChange',
    HIGHLIGHT_TO_QUOTE:      'insights:highlightToQuote',
    SEEK_TO_TIME:            'insights:seekToTime',     // payload: seconds

    // ── i18n ──────────────────────────────────────────────────────────────────
    LOCALE_CHANGED:          'i18n:localeChanged',      // payload: locale string ('es' | 'en')
};
