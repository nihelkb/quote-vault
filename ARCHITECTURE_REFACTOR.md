# Quote Vault — Plan de Refactorización: Arquitectura por Componentes (SOLID)

> **Estado actual:** `main.js` monolítico de ~5900 líneas con 200+ funciones, 60+ globales `window.*`, y un objeto `state` mutable compartido.
> **Objetivo:** Arquitectura modular basada en componentes (estilo Angular) aplicando principios SOLID.

---

## Tabla de Contenidos

1. [Diagnóstico del Estado Actual](#1-diagnóstico-del-estado-actual)
2. [Principios SOLID Aplicados](#2-principios-solid-aplicados)
3. [Infraestructura Core](#3-infraestructura-core)
   - [Component Base Class](#31-component-base-class)
   - [EventBus](#32-eventbus)
   - [StateManager](#33-statemanager)
   - [Router](#34-router)
4. [Nueva Estructura de Carpetas](#4-nueva-estructura-de-carpetas)
5. [Catálogo de Componentes](#5-catálogo-de-componentes)
6. [Patrones de Comunicación](#6-patrones-de-comunicación)
7. [Arquitectura CSS](#7-arquitectura-css)
8. [Mapeado de Funciones Actuales → Componentes](#8-mapeado-de-funciones-actuales--componentes)
9. [Eliminación de Globales `window.*`](#9-eliminación-de-globales-window)
10. [Estrategia de Migración Incremental](#10-estrategia-de-migración-incremental)
11. [Qué Reusar vs. Qué Reescribir](#11-qué-reusar-vs-qué-reescribir)

---

## 1. Diagnóstico del Estado Actual

### Problemas identificados en `main.js`

| Problema | Impacto |
|---|---|
| ~5900 líneas en un solo archivo | Cualquier cambio requiere entender el contexto entero |
| Estado global mutable (`const state = {}`) | Las mutaciones son invisibles; difícil trazar el origen de un bug |
| 60+ funciones expuestas en `window.*` | Contaminación del scope global; colisiones posibles |
| `onclick="..."` inline en templates de strings | Acoplamiento fuerte entre HTML y lógica JS |
| Un único `renderQuotes()` que hace filtrado + ordenado + construcción de árbol + renderizado | Viola SRP |
| Listeners de eventos registrados sin cleanup | Memory leaks al cambiar de sección |
| CSS en un único `styles.css` de ~6700 líneas | Sin encapsulamiento; cualquier cambio puede afectar todo |

### Lo que ya está bien (no tocar)

- `src/services/` — Capa de servicios bien estructurada (patrón Repository + Singleton).
- `src/utils/` — Utilidades bien aisladas (`i18n`, `toast`, `confirmModal`, etc.).
- `src/config/firebase.js` — Configuración limpia.
- `src/locales/` — Traducciones separadas.

---

## 2. Principios SOLID Aplicados

### S — Single Responsibility Principle
> *Cada módulo/clase debe tener una única razón para cambiar.*

**Violación actual:** `main.js` mezcla routing, gestión de estado, renderizado, eventos, lógica de negocio UI y llamadas a servicios.

**Solución:** Cada componente tiene una única responsabilidad declarada. Ejemplos:
- `QuoteCard` → renderizar una tarjeta de cita. Solo cambia si cambia el diseño de la tarjeta.
- `QuoteFiltersBar` → gestionar los controles de filtrado. Solo cambia si cambian los filtros disponibles.
- `YouTubePlayer` → ciclo de vida del iframe de YouTube. Solo cambia si cambia la API de YT.

---

### O — Open/Closed Principle
> *Abierto para extensión, cerrado para modificación.*

**Violación actual:** Para añadir un nuevo tipo de entrada en el Wiki hay que modificar `main.js`, `styles.css` y posiblemente `TopicService.js`.

**Solución:** La clase base `Component` es estable. Añadir nuevas vistas = crear nuevas subclases sin modificar la base. Los nuevos tipos de entrada del Wiki se añaden como nuevas subclases de `KnowledgeEntry`, no modificando la existente.

```js
// Extensión sin modificación:
class TimelineEntryCard extends Component { ... }
class ArgumentEntryCard extends Component { ... }
// La clase base Component nunca cambia para acomodar estos
```

---

### L — Liskov Substitution Principle
> *Las subclases deben poder reemplazar a su clase base sin alterar el comportamiento del programa.*

**Aplicación:** Todos los componentes son instancias de `Component`. El router y los orquestadores de feature trabajan con `Component` genérico; no les importa si es un `TopicCard` o un `InsightCard`.

```js
// El router solo sabe que monta un Component:
class Router {
    navigate(ComponentClass, props) {
        this._current?.unmount();
        this._current = new ComponentClass(this._outlet, props);
        this._current.mount();
    }
}
```

---

### I — Interface Segregation Principle
> *Los clientes no deben depender de interfaces que no usan.*

**Violación actual:** Todos los componentes tienen acceso implícito al objeto `state` completo y a todas las funciones globales.

**Solución:** Cada componente recibe vía `props` solo lo que necesita. Se suscribe al `EventBus` solo para los eventos relevantes. El `StateManager` permite suscribirse a claves individuales de estado.

```js
// QuoteCard solo recibe quote, collectionName y depth. Nada más.
new QuoteCard(container, { quote, collectionName, depth: 0 });

// QuoteFiltersBar solo escucha eventos de filtros:
this.on(Events.QUOTE_FILTER_CHANGED, () => this._rerender());
// No sabe nada de Insights ni del Wiki
```

---

### D — Dependency Inversion Principle
> *Los módulos de alto nivel no deben depender de los de bajo nivel. Ambos deben depender de abstracciones.*

**Violación actual:** `main.js` importa directamente `quoteService` y llama a sus métodos. Los componentes de renderizado acceden a `state.quotes` directamente.

**Solución:**
- Los componentes dependen de `StateManager` (abstracción), no de servicios concretos.
- Los feature orchestrators reciben los servicios como dependencias inyectadas en el constructor.
- `EventBus` desacopla emisores de receptores.

```js
// El componente depende de la abstracción StateManager:
class QuoteListView extends Component {
    onMount() {
        this._unsub = StateManager.subscribe('quotes', () => this._rerender());
    }
    onUnmount() { this._unsub(); }
}

// QuotesFeature inyecta el servicio concreto al StateManager:
quoteService.subscribe(userId, quotes => StateManager.set({ quotes }));
```

---

## 3. Infraestructura Core

### 3.1 Component Base Class

**Archivo:** `src/core/Component.js`

```js
// src/core/Component.js
export class Component {
    constructor(container, props = {}) {
        this._container = typeof container === 'string'
            ? document.querySelector(container)
            : container;
        this.props = props;
        this._children = [];
        this._listeners = [];    // { element, event, handler }
        this._stateSubs = [];    // funciones de desuscripción de StateManager
        this._busSubs = [];      // funciones de desuscripción de EventBus
        this._mounted = false;
    }

    // ── Lifecycle (sobreescribir en subclases) ──────────────────────────────

    /** HTML que se renderiza en el contenedor. Obligatorio sobreescribir. */
    render() { return ''; }

    /** Llamado una vez tras el primer render. Registrar listeners aquí. */
    onMount() {}

    /** Llamado antes de destruir el componente. Limpiar timers, etc. */
    onUnmount() {}

    /** Llamado en actualizaciones de props/state. Por defecto hace re-render completo. */
    onUpdate() { this._rerender(); }

    // ── API Pública ─────────────────────────────────────────────────────────

    mount() {
        this._container.innerHTML = this.render();
        this._mounted = true;
        this.onMount();
        return this;
    }

    unmount() {
        this.onUnmount();
        this._children.forEach(c => c.unmount());
        this._children = [];
        this._listeners.forEach(({ element, event, handler }) =>
            element.removeEventListener(event, handler));
        this._listeners = [];
        this._stateSubs.forEach(unsub => unsub());
        this._stateSubs = [];
        this._busSubs.forEach(unsub => unsub());
        this._busSubs = [];
        this._container.innerHTML = '';
        this._mounted = false;
    }

    update(newProps = {}) {
        this.props = { ...this.props, ...newProps };
        if (this._mounted) this.onUpdate();
    }

    // ── Helpers para subclases ──────────────────────────────────────────────

    /** Query dentro del propio contenedor */
    $(selector) { return this._container.querySelector(selector); }
    $$(selector) { return this._container.querySelectorAll(selector); }

    /** Registra un listener DOM que se limpia automáticamente al desmontar */
    listen(element, event, handler) {
        if (!element) return;
        element.addEventListener(event, handler);
        this._listeners.push({ element, event, handler });
    }

    /** Suscribe al EventBus con cleanup automático */
    on(eventName, handler) {
        const unsub = EventBus.on(eventName, handler);
        this._busSubs.push(unsub);
    }

    /** Suscribe al StateManager con cleanup automático */
    watchState(key, handler) {
        const unsub = StateManager.subscribe(key, handler);
        this._stateSubs.push(unsub);
    }

    /** Monta un hijo y lo registra para cleanup */
    mountChild(child) {
        this._children.push(child);
        return child.mount();
    }

    /** Re-render completo: limpia hijos y listeners, vuelve a renderizar */
    _rerender() {
        this._children.forEach(c => c.unmount());
        this._children = [];
        this._listeners.forEach(({ element, event, handler }) =>
            element.removeEventListener(event, handler));
        this._listeners = [];
        this._container.innerHTML = this.render();
        this.onMount();
    }
}
```

**Ciclo de vida visual:**
```
new Component(container, props)
        │
        ▼
    mount()  ──► innerHTML = render()  ──► onMount() ──► [listeners activos]
        │
    update(newProps)  ──► onUpdate() ──► _rerender() ──► onMount()
        │
    unmount()  ──► onUnmount()  ──► cleanup listeners  ──► innerHTML = ''
```

---

### 3.2 EventBus

**Archivo:** `src/core/EventBus.js`

Reemplaza los 60+ `window.*` globales y el acoplamiento directo entre funciones de distintas secciones.

```js
// src/core/EventBus.js
class EventBusClass {
    constructor() {
        this._handlers = new Map();
    }

    on(event, handler) {
        if (!this._handlers.has(event)) this._handlers.set(event, new Set());
        this._handlers.get(event).add(handler);
        return () => this._handlers.get(event)?.delete(handler); // unsub
    }

    once(event, handler) {
        const wrapper = payload => { handler(payload); this.off(event, wrapper); };
        return this.on(event, wrapper);
    }

    off(event, handler) { this._handlers.get(event)?.delete(handler); }

    emit(event, payload) {
        this._handlers.get(event)?.forEach(handler => {
            try { handler(payload); }
            catch (err) { console.error(`[EventBus] Error en "${event}":`, err); }
        });
    }
}

export const EventBus = new EventBusClass();

// Constantes de eventos (evitan typos en strings)
export const Events = {
    // Auth
    AUTH_STATE_CHANGED:      'auth:stateChanged',
    AUTH_LOGOUT_REQUESTED:   'auth:logoutRequested',

    // Navegación
    SECTION_SWITCH:          'nav:switchSection',    // payload: 'wiki'|'quotes'|'insights'
    TOPIC_OPEN:              'nav:openTopic',         // payload: topicId
    INSIGHT_OPEN:            'nav:openInsight',       // payload: insightId
    BACK_TO_LIST:            'nav:backToList',

    // Quotes
    QUOTE_OPEN_MODAL:        'quotes:openModal',      // payload: quoteId | null
    QUOTE_OPEN_REPLY:        'quotes:openReply',      // payload: { parentId, stance, collectionId }
    QUOTE_TOGGLE_FAVORITE:   'quotes:toggleFavorite', // payload: { id, value }
    QUOTE_DELETE:            'quotes:delete',          // payload: quoteId
    QUOTE_TOGGLE_REPLIES:    'quotes:toggleReplies',  // payload: toggleId
    QUOTE_VIEW_CHANGED:      'quotes:viewChanged',    // payload: 'list'|'compare'
    QUOTE_FILTER_CHANGED:    'quotes:filterChanged',

    // Collections
    COLLECTION_OPEN_MODAL:   'collections:openModal',

    // Wiki / Topics
    TOPIC_OPEN_MODAL:        'topics:openModal',      // payload: topic | null
    TOPIC_DELETE:            'topics:delete',          // payload: topicId
    SECTION_OPEN:            'sections:open',          // payload: sectionId
    SECTION_CREATE:          'sections:create',
    SECTION_DELETE:          'sections:delete',        // payload: sectionId
    SECTION_CONTENT_SAVED:   'sections:contentSaved', // payload: { sectionId, content }
    HIGHLIGHT_LINKED:        'sections:highlightLinked',

    // Insights
    INSIGHT_OPEN_MODAL:      'insights:openModal',    // payload: insight | null
    INSIGHT_DELETE:          'insights:delete',        // payload: insightId
    INSIGHT_STATUS_CHANGE:   'insights:statusChange', // payload: { insightId, status }
    INSIGHT_LINK_TOPIC:      'insights:linkTopic',    // payload: { insightId, topicId }
    HIGHLIGHT_ADD:           'insights:highlightAdd', // payload: { insightId, text, color }
    HIGHLIGHT_REMOVE:        'insights:highlightRemove',
    HIGHLIGHT_COLOR_CHANGE:  'insights:highlightColorChange',
    HIGHLIGHT_TO_QUOTE:      'insights:highlightToQuote',

    // i18n
    LOCALE_CHANGED:          'i18n:localeChanged',
};
```

---

### 3.3 StateManager

**Archivo:** `src/core/StateManager.js`

Reemplaza el objeto `const state = {}` global con una store reactiva.

```js
// src/core/StateManager.js
class StateManagerClass {
    constructor() {
        this._state = {
            quotes:          [],
            collections:     [],
            topics:          [],
            insights:        [],

            currentSection:  'wiki',    // 'wiki' | 'quotes' | 'insights'
            currentView:     'list',    // 'list' | 'compare'
            currentTopicId:  null,
            currentInsightId: null,

            insightStatusFilter: '',
            quoteFilters: {
                searchTerm:    '',
                collectionId:  '',
                stance:        '',
                favoriteOnly:  false,
                sortBy:        'newest',
            },

            currentUser:  null,
            authMode:     'login',
        };
        this._subscribers = new Map();
    }

    get(key) { return this._state[key]; }
    getAll() { return { ...this._state }; }

    set(updates) {
        Object.assign(this._state, updates);
        Object.keys(updates).forEach(key => {
            this._subscribers.get(key)?.forEach(fn => fn(this._state[key]));
        });
        this._subscribers.get('*')?.forEach(fn => fn(this._state));
    }

    /** @returns {Function} unsub */
    subscribe(key, handler) {
        if (!this._subscribers.has(key)) this._subscribers.set(key, new Set());
        this._subscribers.get(key).add(handler);
        return () => this._subscribers.get(key)?.delete(handler);
    }
}

export const StateManager = new StateManagerClass();
```

**Patrón de uso — reemplazando el antipatrón actual:**

```js
// ANTES (main.js):
quoteService.subscribe(userId, (quotes) => {
    state.quotes = quotes;  // mutación directa
    renderQuotes();         // llamada imperativa acoplada
    updateStats();
});

// DESPUÉS (QuotesFeature.js):
quoteService.subscribe(userId, (quotes) => {
    StateManager.set({ quotes });
    // QuoteListView y SidebarPanel reaccionan automáticamente
    // via sus propias suscripciones a StateManager
});
```

---

### 3.4 Router

**Archivo:** `src/core/Router.js`

Gestiona qué componente de feature está montado en el área de contenido.

```js
// src/core/Router.js
export class Router {
    constructor(outlet) {
        this._outlet = typeof outlet === 'string'
            ? document.querySelector(outlet)
            : outlet;
        this._current = null;
    }

    navigate(ComponentClass, props = {}) {
        this._current?.unmount();
        this._current = new ComponentClass(this._outlet, props);
        this._current.mount();
        return this._current;
    }

    unmountCurrent() {
        this._current?.unmount();
        this._current = null;
    }
}
```

---

## 4. Nueva Estructura de Carpetas

```
src/
├── core/                               # Infraestructura del "framework"
│   ├── Component.js                    # Clase base con lifecycle
│   ├── EventBus.js                     # Pub/sub + constantes de eventos
│   ├── StateManager.js                 # Store reactiva centralizada
│   └── Router.js                       # Enrutador de secciones
│
├── shared/                             # Componentes y estilos reutilizables
│   ├── components/
│   │   ├── Modal.js                    # Wrapper de modal genérico
│   │   ├── CustomSelect.js             # Dropdown custom (reemplaza setupCustomSelect)
│   │   └── IconPicker.js              # Selector de iconos SVG
│   └── styles/
│       ├── base.css                    # Variables CSS, reset, tipografía
│       ├── layout.css                  # Layout app, sidebar, área principal
│       ├── forms.css                   # Inputs, grupos de formulario, botones
│       ├── custom-select.css           # Estilos del dropdown custom
│       ├── modal.css                   # Estilos base de modales
│       ├── toast.css                   # Notificaciones toast
│       └── tooltip.css                 # Tooltips
│
├── features/
│   ├── auth/
│   │   ├── AuthScreen.js              # Pantalla login/registro
│   │   ├── VerifyScreen.js            # Pantalla verificación email
│   │   └── styles/auth.css
│   │
│   ├── layout/
│   │   ├── AppShell.js                # Root app: gestiona auth vs. main
│   │   ├── NavSidebar.js              # Sidebar izquierdo de navegación
│   │   ├── LanguageSelector.js        # Selector de idioma
│   │   ├── ProfileMenu.js             # Avatar + dropdown logout
│   │   └── styles/layout.css
│   │
│   ├── quotes/
│   │   ├── QuotesFeature.js           # Orquestador de la sección
│   │   ├── QuoteListView.js           # Vista en lista
│   │   ├── QuoteCard.js               # Tarjeta de cita individual
│   │   ├── CompareView.js             # Vista de debate (favor vs. contra)
│   │   ├── QuoteFiltersBar.js         # Barra de filtros (desktop)
│   │   ├── QuotesMobileFilters.js     # Panel de filtros + FAB (móvil)
│   │   ├── QuotesSidebarPanel.js      # Colecciones + tags en sidebar
│   │   ├── QuoteModal.js              # Formulario añadir/editar cita
│   │   ├── CollectionModal.js         # Formulario nueva colección
│   │   └── styles/quotes.css
│   │
│   ├── wiki/
│   │   ├── WikiFeature.js             # Orquestador de la sección
│   │   ├── WikiFiltersBar.js          # Cabecera wiki: búsqueda + nuevo tema
│   │   ├── WikiSidebarPanel.js        # Lista de temas en sidebar
│   │   ├── TopicsGrid.js              # Grid/masonry de tarjetas de temas
│   │   ├── TopicCard.js               # Tarjeta de tema individual
│   │   ├── TopicDetail.js             # Vista detalle de un tema
│   │   ├── CustomSectionCard.js       # Tarjeta de sección custom
│   │   ├── SectionEditorModal.js      # Editor completo de sección
│   │   ├── MarkdownEditor.js          # Toolbar + textarea + preview
│   │   ├── NewSectionModal.js         # Diálogo nueva sección
│   │   ├── TopicModal.js              # Formulario nuevo/editar tema
│   │   ├── InsightsSidebarInTopic.js  # Sidebar de insights vinculados al tema
│   │   └── styles/wiki.css
│   │
│   └── insights/
│       ├── InsightsFeature.js         # Orquestador de la sección
│       ├── InsightsFiltersBar.js      # Cabecera insights: filtros + capturar
│       ├── InsightsSidebarPanel.js    # Filtros de estado en sidebar
│       ├── InsightsGrid.js            # Grid de tarjetas de insights
│       ├── InsightCard.js             # Tarjeta de insight individual
│       ├── InsightDetail.js           # Vista detalle de un insight
│       ├── YouTubePlayer.js           # Lifecycle del iframe de YT
│       ├── TranscriptView.js          # Display de transcripción + selección
│       ├── HighlightPopup.js          # Popup de colores al seleccionar texto
│       ├── ColorPickerPopup.js        # Popup cambio de color en highlights
│       ├── HighlightsTab.js           # Tab con lista de highlights
│       ├── TimestampedNotes.js        # Notas con timestamps
│       ├── InsightModal.js            # Formulario capturar/editar insight
│       └── styles/insights.css
│
├── services/                           # SIN CAMBIOS — ya están bien
│   ├── AuthService.js
│   ├── QuoteService.js
│   ├── CollectionService.js
│   ├── TopicService.js
│   ├── InsightService.js
│   ├── KnowledgeEntryService.js
│   ├── TranscriptService.js
│   └── index.js
│
├── utils/                              # SIN CAMBIOS — solo añadir helpers
│   ├── i18n.js
│   ├── helpers.js                      # Añadir: getSectionIconSvg, slugify, etc.
│   ├── toast.js
│   ├── confirmModal.js
│   ├── tooltip.js
│   ├── firebaseBlockerDetector.js
│   ├── blockerModal.js
│   └── index.js
│
├── config/
│   └── firebase.js                     # SIN CAMBIOS
│
├── locales/                            # SIN CAMBIOS
│   ├── es.json
│   └── en.json
│
└── app.js                              # Punto de entrada (10 líneas)
```

**`app.js` al final de la migración:**
```js
import { AppShell } from './features/layout/AppShell.js';
import './utils/tooltip.js';

new AppShell(document.body).mount();
```

---

## 5. Catálogo de Componentes

Total: **37 componentes** organizados por capa.

### Core / Shared (3 componentes)

| Componente | Responsabilidad única |
|---|---|
| `Modal` | Overlay genérico con gestión de apertura/cierre/escape |
| `CustomSelect` | Comportamiento del dropdown `.custom-select` |
| `IconPicker` | Grid de iconos SVG para selector |

### Auth (2 componentes)

| Componente | Responsabilidad única |
|---|---|
| `AuthScreen` | Renderiza y gestiona el formulario login/registro con sus tabs |
| `VerifyScreen` | Renderiza y gestiona la pantalla de verificación de email |

### Layout (4 componentes)

| Componente | Responsabilidad única |
|---|---|
| `AppShell` | Orquestador raíz: muestra auth o app según estado de autenticación |
| `NavSidebar` | Sidebar izquierdo con tabs de sección y panels contextuales |
| `LanguageSelector` | Botón + dropdown para cambio de idioma |
| `ProfileMenu` | Avatar + dropdown de cierre de sesión |

### Quotes (9 componentes)

| Componente | Responsabilidad única |
|---|---|
| `QuotesFeature` | Monta y coordina todos los sub-componentes de la sección quotes |
| `QuoteListView` | Renderiza la lista plana de citas o estado vacío |
| `QuoteCard` | Renderiza una tarjeta de cita con sus acciones |
| `CompareView` | Renderiza la vista de debate en dos columnas |
| `QuoteFiltersBar` | Controles de búsqueda, filtrado y orden (desktop) |
| `QuotesMobileFilters` | Panel de filtros y FAB para móvil |
| `QuotesSidebarPanel` | Lista de colecciones y tags en el sidebar |
| `QuoteModal` | Formulario de creación/edición de citas (y modo reply) |
| `CollectionModal` | Diálogo para crear una nueva colección |

### Wiki (12 componentes)

| Componente | Responsabilidad única |
|---|---|
| `WikiFeature` | Orquestador: alterna entre grid de temas y detalle de un tema |
| `WikiFiltersBar` | Búsqueda y botón nuevo tema en la cabecera del Wiki |
| `WikiSidebarPanel` | Lista de temas en el sidebar de navegación |
| `TopicsGrid` | Masonry/grid de tarjetas de temas |
| `TopicCard` | Tarjeta de un tema con estadísticas y acciones |
| `TopicDetail` | Vista detalle: cabecera + masonry de secciones + sidebar de insights |
| `CustomSectionCard` | Tarjeta individual de una sección custom |
| `SectionEditorModal` | Modal de pantalla completa con editor, TOC y sidebar de highlights |
| `MarkdownEditor` | Toolbar de markdown + textarea + vista previa split |
| `NewSectionModal` | Diálogo para crear una nueva sección (nombre + icono) |
| `TopicModal` | Formulario nuevo/editar tema (nombre, descripción, icono, tags) |
| `InsightsSidebarInTopic` | Sidebar de insights vinculados con soporte drag-and-drop |

### Insights (10 componentes)

| Componente | Responsabilidad única |
|---|---|
| `InsightsFeature` | Orquestador: alterna entre grid y detalle de un insight |
| `InsightsFiltersBar` | Filtros de estado/tipo y botón de captura |
| `InsightsSidebarPanel` | Filtros de estado con contadores en el sidebar |
| `InsightsGrid` | Grid flex de tarjetas de insights |
| `InsightCard` | Tarjeta de insight con thumbnail, estado y acciones |
| `InsightDetail` | Vista detalle: player + workspace con tabs |
| `YouTubePlayer` | Lifecycle del iframe de YouTube y su API |
| `TranscriptView` | Display de transcripción con selección de texto para highlights |
| `HighlightPopup` | Popup de colores al seleccionar texto |
| `HighlightsTab` | Tab con lista de highlights y sus acciones |
| `TimestampedNotes` | Lista de notas con timestamps y input rápido |
| `InsightModal` | Formulario de captura/edición con fetch de metadatos |

---

## 6. Patrones de Comunicación

### 1. Props (Padre → Hijo)

```js
// WikiFeature.js crea un TopicDetail pasándole el topicId
const detail = new TopicDetail(this.$('#content-body'), {
    topicId: selectedId,
    topicService,
    insightService,
});
this.mountChild(detail);
```

### 2. EventBus (Hijo → Padre / Hermano a Hermano)

```js
// CustomSectionCard emite (no sabe quién escucha):
this.listen(this.$('[data-action="delete"]'), 'click', () => {
    EventBus.emit(Events.SECTION_DELETE, { sectionId: this.props.section.id });
});

// WikiFeature escucha (maneja la lógica de negocio):
this.on(Events.SECTION_DELETE, async ({ sectionId }) => {
    const ok = await confirmModal.confirmDelete();
    if (ok) await topicService.deleteCustomSection(this._currentTopicId, sectionId);
});
```

### 3. StateManager (Datos globales reactivos)

```js
// QuoteListView se suscribe a cambios en quotes:
class QuoteListView extends Component {
    onMount() {
        this.watchState('quotes', () => this._rerender());
        this.watchState('quoteFilters', () => this._rerender());
    }
    render() {
        const quotes = StateManager.get('quotes');
        const filters = StateManager.get('quoteFilters');
        const filtered = quoteService.filterQuotes(quotes, filters);
        return filtered.length > 0
            ? filtered.map(q => renderQuoteCard(q)).join('')
            : `<div class="empty-state">...</div>`;
    }
}
```

### 4. Servicios como dependencias inyectadas (DIP)

```js
// El orquestador inyecta el servicio al inicializar:
class QuotesFeature extends Component {
    constructor(container, { quoteService, collectionService, userId }) {
        super(container);
        this.quoteService = quoteService;
        this.collectionService = collectionService;
        this.userId = userId;
    }
    onMount() {
        // Suscripción al servicio → actualiza StateManager
        this._unsub = this.quoteService.subscribe(this.userId, quotes => {
            StateManager.set({ quotes });
        });
    }
    onUnmount() { this._unsub?.(); }
}
```

---

## 7. Arquitectura CSS

### División de `styles.css` por feature

| Archivo nuevo | Líneas aprox. en `styles.css` | Contenido |
|---|---|---|
| `shared/styles/base.css` | 1–36 | Variables CSS, `*`, `body`, tipografía |
| `shared/styles/layout.css` | 37–122, 1162–1213, 1486–1527 | App layout, sidebar toggle, área principal |
| `shared/styles/forms.css` | 338–469, 1023–1037 | Grupos de formulario, inputs, `.url-input-wrapper` |
| `shared/styles/custom-select.css` | 364–527 | Widget `.custom-select` |
| `shared/styles/modal.css` | 778–882, 962–1020 | Modal base, confirm modal |
| `shared/styles/toast.css` | 906–961 | Toast notifications |
| `shared/styles/tooltip.css` | 4676–4745 | Tooltips |
| `features/auth/styles/auth.css` | 123–301 | Pantalla auth, formulario, verify |
| `features/layout/styles/layout.css` | 1162–1698, 1954–1980 | NavSidebar, nav tabs, header, profile menu |
| `features/quotes/styles/quotes.css` | 528–777, 3840–4484 | QuoteCard, replies, compare, FAB, filtros móvil |
| `features/wiki/styles/wiki.css` | 1699–1980, 4808–6722 | Topics grid, topic detail, secciones, markdown editor |
| `features/insights/styles/insights.css` | 1981–3840 | Insights grid, cards, detail, transcript, highlights |

**Importación en los componentes:**
```js
// features/wiki/WikiFeature.js
import './styles/wiki.css';
```
Vite gestiona la deduplicación y el bundling automáticamente.

---

## 8. Mapeado de Funciones Actuales → Componentes

### `AppShell.js`
- `init()`, `handleAuthStateChange(user)`, `showAuthScreen()`, `showMainApp()`, `showVerifyScreen()`
- `subscribeToData()`, `unsubscribeFromData()`

### `AuthScreen.js`
- `setupAuthListeners()`, `showAuthError()`

### `NavSidebar.js`
- `setupNavSidebarListeners()`, `setupMainNavTabs()`, `switchSection(section)`, `renderNavSidebar()`

### `LanguageSelector.js`
- `setupLanguageListener()`, `closeAllLanguageSelectors()`, `updateLanguageSelector(locale)`

### `ProfileMenu.js`
- `setupHeaderProfileMenu()`, `logout()`

### `QuotesFeature.js`
- Suscripción a `quoteService` y `collectionService` → `StateManager.set`

### `QuoteListView.js`
- `renderQuotes()`, `renderListView()`, `renderCompareViewMode()`, `getFilters()`, `updateStats()`

### `QuoteFiltersBar.js`
- `setupFilterListeners()` (parte quotes: búsqueda, stance, favoritos, orden)

### `QuotesMobileFilters.js`
- `setupMobileListeners()`, `initMobileFiltersPanel()`, `updateMobileFiltersPanel()`
- `openFiltersPanel()`, `closeFiltersPanel()`, `clearMobileFilters()`, `applyMobileFilters()`
- `syncCustomSelectUI()`, `updateFilterBadge()`, `attachChipHandlers()`
- `mobileFiltersState` → estado local del componente

### `QuoteModal.js`
- `openModal(quoteId)`, `closeModal()`, `handleQuoteSubmit()`, `openReplyModal()`

### `CollectionModal.js`
- `openNewCollectionModal()`, `closeCollectionModal()`, `createCollection()`

### `QuotesSidebarPanel.js`
- `renderSidebarCollections()`, `renderSidebarTags()`

### `WikiFeature.js`
- Suscripción a `topicService` y `insightService` → `StateManager.set`

### `WikiFiltersBar.js`
- `setupFilterListeners()` (parte wiki: `wikiSearchInput`, `topicSortSelect`)

### `WikiSidebarPanel.js`
- `renderSidebarTopics()`

### `TopicsGrid.js`
- `renderWikiView()`, `renderTopicsList()`, `getTopicStats(topic)`, `getRelativeTime(dateString)`

### `TopicCard.js`
- Template de tarjeta; emite `Events.TOPIC_DELETE`, `Events.TOPIC_OPEN_MODAL`, `Events.TOPIC_OPEN`

### `TopicDetail.js`
- `openTopicView(topicId)`, `renderTopicDetailView(topic, linkedQuotes, linkedInsights)`
- `toggleInsightsSidebar()`, `setupTopicDetailListeners()`, `filterTopicSections(searchTerm)`

### `CustomSectionCard.js`
- `renderCustomSectionCard(section, index)`, `getContentPreview(content)`
- Emite `Events.SECTION_OPEN`, `Events.SECTION_DELETE`

### `SectionEditorModal.js`
- `openCustomSectionModal(sectionId)`, `closeCustomSectionModal()`, `toggleSectionEditMode(sectionId)`
- `saveCustomSectionContent(sectionId)`, `updateSidebarTOC(content)`, `initTocScrollSpy()`
- `toggleSectionHighlightsSidebar()`, `linkHighlightToSection()`, `unlinkHighlightFromSection()`

### `MarkdownEditor.js`
- `insertMarkdown(prefix, suffix, options)`, `insertLink()`, `insertHeading(level)`
- `toggleHeadingDropdown()`, `handleMarkdownShortcuts(e)`

### `NewSectionModal.js`
- `openNewSectionModal()`, `closeNewSectionModal()`, `createCustomSection()`

### `TopicModal.js`
- `openTopicModal(topicToEdit)`, `closeTopicModal()`, `handleTopicSubmit()`

### `InsightsSidebarInTopic.js`
- `renderInsightSidebarCard(insight)`, `toggleInsightExpand(insightId)`
- `setupHighlightDragAndDrop()`, handlers de drag/drop

### `InsightsFeature.js`
- Suscripción a `insightService` → `StateManager.set`

### `InsightsFiltersBar.js`
- `setupFilterListeners()` (parte insights: estado, tipo, búsqueda)

### `InsightsSidebarPanel.js`
- `updateInsightsCounts()`, `updateInsightStatusActive()`

### `InsightsGrid.js`
- `renderInsightsView()`, `renderInsightsList()`, ResizeObserver para columnas

### `InsightCard.js`
- Template de tarjeta; emite `Events.INSIGHT_DELETE`, `Events.INSIGHT_OPEN_MODAL`, `Events.INSIGHT_OPEN`

### `InsightDetail.js`
- `openInsightView(insightId)`, `setupInsightDetailTabs()`, `setupResizeHandle()`
- `toggleStatusDropdown()`, `changeInsightStatus()`, `toggleTopicSelector()`, `linkInsightToTopic()`

### `YouTubePlayer.js`
- `loadYouTubeAPI()`, `initYouTubePlayer(videoId)`, `getYouTubeCurrentTime()`, `seekToTime(seconds)`

### `TranscriptView.js`
- `setupTranscriptHighlighting(insightId)`, `refreshTranscriptContent(insight)`
- `showTranscriptInput()`, `saveTranscript()`, `fetchYouTubeTranscript()`

### `HighlightPopup.js`
- `showHighlightPopup(insightId, text, selection)`, `addHighlightToInsight()`

### `HighlightsTab.js`
- `refreshHighlightsTab(insight)`, `removeHighlight()`, `convertHighlightToQuote()`

### `TimestampedNotes.js`
- `renderTimestampedNotes()`, `insertTimestampNote()`, `addTimestampedNote()`
- `deleteTimestampedNote()`, `toggleTodoNote()`, `setupQuickNoteInput()`

### `InsightModal.js`
- `openInsightModal(insightToEdit)`, `closeInsightModal()`, `handleInsightSubmit()`
- `fetchUrlMetadata(url)`, `showSourcePreview(data)`

### Helpers a mover a `utils/helpers.js`
- `getSectionIconSvg(iconName, size)`
- `getTopicIconSvg(iconName, size)`
- `getHighlightColor(color)`
- `extractHeadingsFromMarkdown(markdown)`
- `slugify(text)`
- `renderMarkdown(markdown)`
- `formatTimestamp(seconds)` (versión de insights, diferente a la de helpers)
- `getRelativeTime(dateString)`

---

## 9. Eliminación de Globales `window.*`

### Problema actual

```js
// main.js expone 60+ funciones globales:
window.openModal = openModal;
window.deleteQuote = deleteQuote;
window.toggleFavorite = toggleFavorite;
// ... etc.

// Los templates los invocan directamente:
`<button onclick="deleteQuote('${quote.id}')">Eliminar</button>`
```

### Solución: Data Attributes + Delegación de Eventos

```js
// ANTES — template con onclick inline:
render() {
    return `
        <button onclick="openCustomSectionModal('${section.id}')">Abrir</button>
        <button onclick="deleteCustomSection('${section.id}')">Borrar</button>
    `;
}

// DESPUÉS — data attributes + un único listener delegado:
render() {
    return `
        <button data-action="open">Abrir</button>
        <button data-action="delete">Borrar</button>
    `;
}

onMount() {
    this.listen(this._container, 'click', (e) => {
        const action = e.target.closest('[data-action]')?.dataset.action;
        if (!action) return;

        switch (action) {
            case 'open':
                EventBus.emit(Events.SECTION_OPEN, { sectionId: this.props.section.id });
                break;
            case 'delete':
                EventBus.emit(Events.SECTION_DELETE, { sectionId: this.props.section.id });
                break;
        }
    });
}
```

**Resultado:** Cero contaminación del scope global. Cero `window.*`. Los componentes se comunican exclusivamente via `EventBus`.

---

## 10. Estrategia de Migración Incremental

La app nunca se rompe entre fases. Cada fase es independientemente desplegable.

### Fase 1 — Infraestructura Core (1–2 días)
- Crear `src/core/Component.js`, `EventBus.js`, `StateManager.js`, `Router.js`
- **Sin cambios en `main.js`**. Los archivos core existen pero no están conectados aún.
- Verificar: la app funciona igual que antes.

### Fase 2 — Extracción de Helpers (2–3 días)
- Mover `getSectionIconSvg`, `slugify`, `extractHeadingsFromMarkdown`, `renderMarkdown`, `getRelativeTime`, `getHighlightColor`, `formatTimestamp` a `utils/helpers.js`.
- Importarlos de vuelta en `main.js` temporalmente:
  ```js
  import { getSectionIconSvg, slugify } from './utils/helpers.js';
  ```
- **Sin cambios de comportamiento**, solo reorganización de archivos.

### Fase 3 — Componentes Shared (2–3 días)
- Crear `CustomSelect`, `IconPicker`, `Modal` base.
- Reemplazar `setupCustomSelect()` en `main.js` con `new CustomSelect(el).mount()`.
- Verificar que todos los dropdowns funcionan.

### Fase 4 — Feature Auth (3–5 días)
- Crear `AuthScreen`, `VerifyScreen`, `AppShell`.
- `AppShell` se convierte en el punto de entrada: `new AppShell(document.body).mount()`.
- Mover toda la lógica de auth de `main.js` a estos componentes.
- `main.js` pierde ~400 líneas.

### Fase 5 — Feature Quotes (5–7 días)
- Crear todos los componentes de quotes (9 componentes).
- Conectar via `EventBus` y `StateManager`.
- `main.js` pierde ~1500 líneas.

### Fase 6 — Feature Wiki (7–10 días)
- Extraer por orden de complejidad:
  1. `TopicsGrid` + `TopicCard`
  2. `TopicModal` + `WikiFiltersBar` + `WikiSidebarPanel`
  3. `TopicDetail` + `InsightsSidebarInTopic`
  4. `CustomSectionCard` + `NewSectionModal`
  5. `MarkdownEditor` + `SectionEditorModal` (más complejo)
- `main.js` pierde ~2000 líneas.

### Fase 7 — Feature Insights (7–10 días)
- Extraer por orden:
  1. `InsightCard` + `InsightsGrid`
  2. `InsightModal`
  3. `YouTubePlayer`
  4. `TranscriptView` + `HighlightPopup`
  5. `HighlightsTab` + `TimestampedNotes`
  6. `InsightDetail` + `InsightsFeature`
- `main.js` → renombrar a `app.js` (~10 líneas).

---

## 11. Qué Reusar vs. Qué Reescribir

| Código | Decisión | Razón |
|---|---|---|
| `src/services/*.js` | **Reusar sin cambios** | Ya siguen SOLID: Singleton + Repository pattern |
| `src/utils/*.js` | **Reusar sin cambios** | Bien aislados y con responsabilidad única |
| `src/config/firebase.js` | **Reusar sin cambios** | Solo configuración |
| `src/locales/*.json` | **Reusar sin cambios** | |
| `src/components/QuoteCard.js` | **Extender** | Convertir de función pura a subclase de `Component` |
| `src/components/CompareView.js` | **Extender** | Igual que QuoteCard |
| `src/components/CollectionSelect.js` | **Reemplazar** | Integrar en `CustomSelect` + `CollectionModal` |
| Funciones de render de `main.js` | **Extraer** | Mover cada función a su componente correspondiente |
| Event setups de `main.js` | **Reemplazar** | Convertir a `this.listen()` + `this.on()` en cada componente |
| `styles.css` | **Dividir** | Mapear secciones a archivos CSS por feature |
| `onclick="..."` inline | **Reemplazar** | Event delegation con `data-action` |
| `window.*` globales (60+) | **Eliminar** | Reemplazar con `EventBus.emit()` |
| Objeto `state` global | **Reemplazar** | `StateManager` como única fuente de verdad |
| Cache `elements` global | **Eliminar** | Cada componente usa `this.$()` en su propio DOM |
| `index.html` (modales estáticos) | **Refactorizar** | Los modales pasan a ser renderizados por sus componentes |

---

*Documento generado el 2026-02-19. Basado en análisis de `main.js` (v2 branch), principios SOLID, y arquitectura de componentes estilo Angular para Vanilla JS con Vite.*
