# Quote Vault — Tareas de Refactorización para Claude Code

> Cada tarea es **independiente y deja la app en estado funcional** al terminar.
> Ejecutar en orden. Antes de empezar cualquier tarea, leer los archivos indicados en "Contexto previo".
> Referencia de arquitectura completa: `ARCHITECTURE_REFACTOR.md`

---

## Índice de Tareas

| # | Tarea | Fase | Impacto en `main.js` |
|---|---|---|---|
| [T-01](#t-01--infraestructura-core) | Crear infraestructura core | 1 | Sin cambios |
| [T-02](#t-02--extracción-de-helpers-a-utilshelpers) | Extraer helpers puros a `utils/helpers.js` | 2 | Importa en vez de definir |
| [T-03](#t-03--componente-shared-customselect) | Componente `CustomSelect` | 3 | Reemplaza `setupCustomSelect()` |
| [T-04](#t-04--componente-shared-modal-base) | Componente `Modal` base | 3 | Sin cambios |
| [T-05](#t-05--componente-shared-iconpicker) | Componente `IconPicker` | 3 | Sin cambios |
| [T-06](#t-06--feature-auth--authscreen--verifyscreen) | Feature Auth: `AuthScreen` + `VerifyScreen` | 4 | Sin cambios |
| [T-07](#t-07--feature-layout--appshell--navsidebar--languageselector--profilemenu) | Feature Layout: `AppShell` + `NavSidebar` + `LanguageSelector` + `ProfileMenu` | 4 | `main.js` → punto entrada delegado |
| [T-08](#t-08--feature-quotes--quotessidebarpanel--quotefiltersbar) | Feature Quotes: `QuotesSidebarPanel` + `QuoteFiltersBar` | 5 | Elimina funciones de sidebar/filtros quotes |
| [T-09](#t-09--feature-quotes--quotecardjs--compareviewjs-como-componentes) | Feature Quotes: `QuoteCard` + `CompareView` como componentes | 5 | Reemplaza los existentes en `components/` |
| [T-10](#t-10--feature-quotes--quotelistview) | Feature Quotes: `QuoteListView` | 5 | Elimina `renderQuotes()`, `renderListView()` |
| [T-11](#t-11--feature-quotes--quotemodal--collectionmodal) | Feature Quotes: `QuoteModal` + `CollectionModal` | 5 | Elimina funciones de modales quotes |
| [T-12](#t-12--feature-quotes--quotesmobilefilters) | Feature Quotes: `QuotesMobileFilters` | 5 | Elimina lógica de filtros móvil |
| [T-13](#t-13--feature-quotes--quotesfeature-orquestador) | Feature Quotes: `QuotesFeature` orquestador | 5 | Sección quotes completa fuera de `main.js` |
| [T-14](#t-14--feature-wiki--topiccard--topicsgrid) | Feature Wiki: `TopicCard` + `TopicsGrid` | 6 | Elimina `renderTopicsList()` |
| [T-15](#t-15--feature-wiki--topicmodal--wikifiltersbar--wikisidebarpanel) | Feature Wiki: `TopicModal` + `WikiFiltersBar` + `WikiSidebarPanel` | 6 | Elimina funciones de topic modal y sidebar wiki |
| [T-16](#t-16--feature-wiki--insightssidebarintopic--topicdetail) | Feature Wiki: `InsightsSidebarInTopic` + `TopicDetail` | 6 | Elimina `openTopicView()` y renderizado detalle |
| [T-17](#t-17--feature-wiki--customsectioncard--newsectionmodal) | Feature Wiki: `CustomSectionCard` + `NewSectionModal` | 6 | Elimina funciones de secciones |
| [T-18](#t-18--feature-wiki--markdowneditor) | Feature Wiki: `MarkdownEditor` | 6 | Elimina funciones de markdown |
| [T-19](#t-19--feature-wiki--sectioneditormodal) | Feature Wiki: `SectionEditorModal` | 6 | Elimina `openCustomSectionModal()` y TOC |
| [T-20](#t-20--feature-wiki--wikifeature-orquestador) | Feature Wiki: `WikiFeature` orquestador | 6 | Sección wiki completa fuera de `main.js` |
| [T-21](#t-21--feature-insights--insightcard--insightsgrid) | Feature Insights: `InsightCard` + `InsightsGrid` | 7 | Elimina `renderInsightsList()` |
| [T-22](#t-22--feature-insights--insightmodal) | Feature Insights: `InsightModal` | 7 | Elimina modal de captura |
| [T-23](#t-23--feature-insights--youtubeplayer) | Feature Insights: `YouTubePlayer` | 7 | Elimina lógica del iframe YT |
| [T-24](#t-24--feature-insights--transcriptview--highlightpopup) | Feature Insights: `TranscriptView` + `HighlightPopup` | 7 | Elimina funciones de transcripción |
| [T-25](#t-25--feature-insights--highlightstab--timestampednotes) | Feature Insights: `HighlightsTab` + `TimestampedNotes` | 7 | Elimina tabs de highlights y notas |
| [T-26](#t-26--feature-insights--insightdetail--insightsfeature-orquestador) | Feature Insights: `InsightDetail` + `InsightsFeature` | 7 | Sección insights completa fuera de `main.js` |
| [T-27](#t-27--división-del-css-en-archivos-por-feature) | División CSS por feature | CSS | Sin cambios en JS |
| [T-28](#t-28--limpieza-final--mainjs--appjs) | Limpieza final: `main.js` → `app.js` | Final | `main.js` desaparece |

---

## Instrucciones Generales para Claude Code

Antes de ejecutar cualquier tarea:
1. Leer `ARCHITECTURE_REFACTOR.md` completo para entender la arquitectura objetivo.
2. Leer los archivos indicados en "Contexto previo" de cada tarea.
3. **Nunca modificar** `src/services/`, `src/utils/`, `src/config/`, `src/locales/` salvo que la tarea lo indique explícitamente.
4. **Verificar** que la app sigue funcionando (`npm run dev`) al finalizar cada tarea.
5. Las funciones extraídas de `main.js` deben **eliminarse de `main.js`** y sustituirse por imports.

---

## T-01 — Infraestructura Core

**Fase:** 1 | **Impacto:** Solo crea archivos nuevos. `main.js` no cambia.

### Contexto previo
Leer:
- `ARCHITECTURE_REFACTOR.md` (sección 3 completa)
- `src/main.js` (líneas 1–50, para entender el `state` actual)

### Qué hacer

Crear la carpeta `src/core/` con 4 archivos nuevos:

**`src/core/Component.js`** — Clase base con lifecycle. Usar exactamente el código del apartado 3.1 del `ARCHITECTURE_REFACTOR.md`.

**`src/core/EventBus.js`** — Pub/sub + constantes de eventos. Usar exactamente el código del apartado 3.2 del `ARCHITECTURE_REFACTOR.md`.

**`src/core/StateManager.js`** — Store reactiva. Usar exactamente el código del apartado 3.3 del `ARCHITECTURE_REFACTOR.md`.

**`src/core/Router.js`** — Enrutador de secciones. Usar exactamente el código del apartado 3.4 del `ARCHITECTURE_REFACTOR.md`.

**`src/core/index.js`** — Barrel export:
```js
export { Component } from './Component.js';
export { EventBus, Events } from './EventBus.js';
export { StateManager } from './StateManager.js';
export { Router } from './Router.js';
```

### Qué NO hacer
- No modificar ningún archivo existente.
- No importar los módulos core en `main.js` todavía.

### Criterio de éxito
- Los 5 archivos existen en `src/core/`.
- `npm run dev` no muestra errores.
- La app funciona exactamente igual que antes.

---

## T-02 — Extracción de Helpers a `utils/helpers.js`

**Fase:** 2 | **Impacto:** `main.js` importa en vez de definir estas funciones.

### Contexto previo
Leer:
- `src/utils/helpers.js` (contenido actual)
- `src/main.js` (buscar las funciones listadas abajo)

### Qué hacer

Mover las siguientes funciones de `main.js` a `src/utils/helpers.js`, añadiéndolas al final del archivo con `export`:

- `getSectionIconSvg(iconName, size)` — genera SVG de icono para secciones
- `getTopicIconSvg(iconName, size)` — genera SVG de icono para temas
- `getHighlightColor(color)` — devuelve la clase CSS de un color de highlight
- `extractHeadingsFromMarkdown(markdown)` — extrae encabezados H1-H6 de markdown
- `slugify(text)` — convierte texto a slug URL-friendly
- `renderMarkdown(markdown)` — convierte markdown a HTML (usa marked o similar)
- `getRelativeTime(dateString)` — "hace 2 días", "ayer", etc.

Después, en `main.js`:
1. Eliminar las definiciones de esas funciones.
2. Añadir al principio del archivo:
```js
import { getSectionIconSvg, getTopicIconSvg, getHighlightColor,
         extractHeadingsFromMarkdown, slugify, renderMarkdown,
         getRelativeTime } from './utils/helpers.js';
```

### Qué NO hacer
- No cambiar la firma ni el comportamiento de ninguna función.
- No modificar el resto de `main.js`.

### Criterio de éxito
- Las funciones exportadas en `helpers.js` son idénticas a las originales de `main.js`.
- `npm run dev` no muestra errores.
- La app funciona exactamente igual que antes (mismos iconos, fechas, etc.).

---

## T-03 — Componente Shared: `CustomSelect`

**Fase:** 3 | **Impacto:** `main.js` delega la inicialización de dropdowns al componente.

### Contexto previo
Leer:
- `src/main.js` (buscar `setupCustomSelect`, `CustomSelect`, `.custom-select`)
- `src/components/CollectionSelect.js`
- `src/core/Component.js` (creado en T-01)

### Qué hacer

**Crear `src/shared/components/CustomSelect.js`:**

Clase `CustomSelect extends Component` que encapsula el comportamiento del dropdown `.custom-select` actual. El componente debe:
- Recibir por `props`: `{ element, options, value, onChange, placeholder }`
- O bien, funcionar como un wrapper que inicializa el comportamiento en un elemento `.custom-select` ya existente en el DOM
- Gestionar la apertura/cierre del panel, la selección de opciones y el click fuera para cerrar
- Emitir el callback `onChange(value)` al seleccionar
- Limpiar los listeners en `onUnmount()`

**Crear `src/shared/components/index.js`:**
```js
export { CustomSelect } from './CustomSelect.js';
```

**En `main.js`:**
- Importar `CustomSelect` desde `src/shared/components/index.js`
- Reemplazar todas las llamadas a `setupCustomSelect(element, ...)` con `new CustomSelect(element, { ... }).mount()`
- Eliminar la función `setupCustomSelect()` de `main.js`

### Qué NO hacer
- No cambiar la estructura HTML de los dropdowns existentes.
- No cambiar los estilos CSS.

### Criterio de éxito
- Todos los dropdowns custom de la app (filtros de quotes, selector de colección, etc.) siguen funcionando.
- `npm run dev` sin errores.

---

## T-04 — Componente Shared: `Modal` Base

**Fase:** 3 | **Impacto:** Sin cambios en `main.js`. Solo crea el archivo.

### Contexto previo
Leer:
- `src/main.js` (buscar `openModal`, `closeModal`, gestión de modales existente)
- `index.html` (buscar los elementos `.modal` y su estructura HTML)
- `src/core/Component.js`

### Qué hacer

**Crear `src/shared/components/Modal.js`:**

Clase `Modal extends Component` que sirve como wrapper genérico para cualquier modal:
- `props`: `{ id, title, onClose }`
- `render()`: genera la estructura base del overlay + panel (usar la misma estructura HTML que los modales actuales de `index.html`)
- `onMount()`: registra listener de tecla Escape y click fuera del panel
- `open()`: método público que muestra el modal
- `close()`: método público que oculta el modal y llama `props.onClose` si existe
- Las subclases sobreescriben `renderBody()` para el contenido interior

Añadir la export a `src/shared/components/index.js`.

### Qué NO hacer
- No migrar los modales existentes todavía. Este archivo solo crea la clase base.
- No modificar `main.js`.

### Criterio de éxito
- El archivo `src/shared/components/Modal.js` existe y exporta correctamente.
- `npm run dev` sin errores (el archivo puede existir sin ser usado aún).

---

## T-05 — Componente Shared: `IconPicker`

**Fase:** 3 | **Impacto:** Sin cambios en `main.js`. Solo crea el archivo.

### Contexto previo
Leer:
- `src/main.js` (buscar `setupSvgIconPicker`, `setupIconPicker`, listado de iconos SVG)
- `src/core/Component.js`

### Qué hacer

**Crear `src/shared/components/IconPicker.js`:**

Clase `IconPicker extends Component`:
- `props`: `{ selectedIcon, onSelect }` (callback cuando el usuario elige un icono)
- `render()`: genera el grid HTML de iconos SVG (extraer el listado de iconos de `main.js`)
- `onMount()`: registra click en cada icono → llama `props.onSelect(iconName)`
- El icono seleccionado tiene clase `active`

Añadir la export a `src/shared/components/index.js`.

### Qué NO hacer
- No conectar el IconPicker a los formularios todavía.
- No modificar `main.js`.

### Criterio de éxito
- El archivo existe y exporta la clase.
- `npm run dev` sin errores.

---

## T-06 — Feature Auth: `AuthScreen` + `VerifyScreen`

**Fase:** 4 | **Impacto:** Sin cambios en `main.js`. Solo crea los componentes.

### Contexto previo
Leer:
- `src/main.js` (buscar `setupAuthListeners`, `showAuthError`, `showAuthScreen`, `showVerifyScreen`, `authMode`)
- `index.html` (buscar el HTML del auth screen y verify screen)
- `src/services/AuthService.js`
- `src/core/Component.js`

### Qué hacer

**Crear `src/features/auth/AuthScreen.js`:**

Clase `AuthScreen extends Component`:
- `props`: `{ authService, i18n, onAuthenticated }`
- `render()`: genera el HTML completo de la pantalla login/registro (tabs login/registro, formularios, botón Google)
- `onMount()`: registra todos los listeners de auth (submit, tab switch, Google btn, toggle password)
- Gestiona internamente el estado `mode: 'login' | 'register'`
- Al autenticarse correctamente llama `props.onAuthenticated(user)`
- Muestra errores con `showError(message)` interno

**Crear `src/features/auth/VerifyScreen.js`:**

Clase `VerifyScreen extends Component`:
- `props`: `{ authService, i18n, onVerified, onLogout }`
- `render()`: genera el HTML de la pantalla de verificación de email
- `onMount()`: listener del botón "reenviar email" y "logout"

**Crear `src/features/auth/index.js`:**
```js
export { AuthScreen } from './AuthScreen.js';
export { VerifyScreen } from './VerifyScreen.js';
```

### Qué NO hacer
- No modificar `main.js`.
- No cambiar `AuthService.js`.

### Criterio de éxito
- Los archivos existen y son importables sin errores.
- `npm run dev` sin errores.

---

## T-07 — Feature Layout: `AppShell` + `NavSidebar` + `LanguageSelector` + `ProfileMenu`

**Fase:** 4 | **Impacto:** `main.js` delega su función `init()` al `AppShell`.

### Contexto previo
Leer:
- `src/main.js` (funciones: `init`, `handleAuthStateChange`, `showAuthScreen`, `showMainApp`, `showVerifyScreen`, `subscribeToData`, `unsubscribeFromData`, `switchSection`, `setupNavSidebarListeners`, `setupLanguageListener`, `setupHeaderProfileMenu`, `logout`)
- `index.html` (estructura HTML del sidebar y header)
- `src/features/auth/AuthScreen.js` y `VerifyScreen.js` (T-06)
- `src/core/Component.js`, `EventBus.js`, `StateManager.js`
- `src/services/AuthService.js`

### Qué hacer

**Crear `src/features/layout/NavSidebar.js`:**
- Gestiona el sidebar izquierdo: tabs de sección (wiki/quotes/insights), collapse/expand
- Al cambiar de tab emite `EventBus.emit(Events.SECTION_SWITCH, section)`
- Recibe por props el panel contextual a mostrar según la sección activa
- Renderiza el panel dinámico (lo recibirá del AppShell)

**Crear `src/features/layout/LanguageSelector.js`:**
- Botón de idioma + dropdown (desktop y móvil)
- Al seleccionar idioma: llama `i18n.setLocale()` y emite `Events.LOCALE_CHANGED`

**Crear `src/features/layout/ProfileMenu.js`:**
- Avatar con iniciales del usuario + dropdown con botón logout
- Al hacer logout: llama `authService.logout()`

**Crear `src/features/layout/AppShell.js`:**
- Es el componente raíz. `props`: `{ authService, quoteService, collectionService, topicService, insightService, i18n }`
- `onMount()`: se suscribe a `authService.onAuthStateChange()`
  - Sin usuario → monta `AuthScreen` en `#app`
  - Con usuario no verificado → monta `VerifyScreen` en `#app`
  - Con usuario verificado → monta la app principal (sidebar + área de contenido)
- Cuando monta la app principal: inicia suscripciones a datos via `StateManager`

**Crear `src/features/layout/index.js`**

**En `main.js`:**
- Importar `AppShell` y los servicios
- Reemplazar toda la función `init()` y el `document.addEventListener('DOMContentLoaded', init)` con:
```js
import { AppShell } from './features/layout/index.js';
// ... imports de servicios existentes ...
document.addEventListener('DOMContentLoaded', () => {
    new AppShell(document.body, {
        authService, quoteService, collectionService,
        topicService, insightService, i18n
    }).mount();
});
```
- Eliminar de `main.js`: `init()`, `handleAuthStateChange()`, `showAuthScreen()`, `showMainApp()`, `showVerifyScreen()`, `setupNavSidebarListeners()`, `setupMainNavTabs()`, `switchSection()`, `setupLanguageListener()`, `setupHeaderProfileMenu()`, `logout()`

### Criterio de éxito
- El login, registro, verificación de email funcionan.
- El sidebar navega entre secciones.
- El selector de idioma cambia el idioma.
- El botón de logout funciona.
- `npm run dev` sin errores de consola.

---

## T-08 — Feature Quotes: `QuotesSidebarPanel` + `QuoteFiltersBar`

**Fase:** 5 | **Impacto:** Elimina funciones de sidebar y filtros de quotes de `main.js`.

### Contexto previo
Leer:
- `src/main.js` (funciones: `renderSidebarCollections`, `renderSidebarTags`, `setupFilterListeners` —parte quotes—)
- `src/core/Component.js`, `EventBus.js`, `StateManager.js`
- `src/services/CollectionService.js`, `QuoteService.js`

### Qué hacer

**Crear `src/features/quotes/QuotesSidebarPanel.js`:**
- Renderiza la lista de colecciones y la nube de tags en el sidebar
- Se suscribe a `StateManager` en `quotes` y `collections`
- Al hacer click en una colección/tag: actualiza `StateManager.set({ quoteFilters: { ... } })`
- Emite `Events.QUOTE_FILTER_CHANGED`

**Crear `src/features/quotes/QuoteFiltersBar.js`:**
- Renderiza la barra superior de la sección quotes: buscador, select de stance, checkbox favoritos, select de orden, botón "Nueva cita", botones de vista (lista/debate)
- Usa `CustomSelect` (T-03) para los dropdowns
- Al cambiar cualquier filtro: actualiza `StateManager.set({ quoteFilters: { ... } })`
- Al cambiar vista: emite `Events.QUOTE_VIEW_CHANGED`
- Al click "Nueva cita": emite `Events.QUOTE_OPEN_MODAL` con `null`

**Crear `src/features/quotes/index.js`** (vacío por ahora, se irá completando)

**En `main.js`:** eliminar `renderSidebarCollections()`, `renderSidebarTags()`, y la parte de quotes de `setupFilterListeners()`.

### Criterio de éxito
- El sidebar de quotes muestra colecciones y tags correctamente.
- Los filtros de la barra superior siguen funcionando (búsqueda, stance, favoritos, orden).
- Los botones de vista lista/debate siguen funcionando.
- `npm run dev` sin errores.

---

## T-09 — Feature Quotes: `QuoteCard` + `CompareView` como Componentes

**Fase:** 5 | **Impacto:** Reemplaza los archivos en `src/components/`.

### Contexto previo
Leer:
- `src/components/QuoteCard.js` (funciones actuales)
- `src/components/CompareView.js` (funciones actuales)
- `src/main.js` (buscar `toggleReplies`, `deleteQuote`, `toggleFavorite`, `openReplyModal`)
- `src/core/Component.js`, `EventBus.js`
- `src/utils/helpers.js`, `src/utils/i18n.js`

### Qué hacer

**Crear `src/features/quotes/QuoteCard.js`** (reemplaza `src/components/QuoteCard.js`):
- Clase `QuoteCard extends Component`
- `props`: `{ quote, collectionName, depth, allQuotes }`
- `render()`: genera el HTML de la tarjeta (mismo HTML que el actual)
- `onMount()`: listener delegado en el contenedor con `data-action`:
  - `data-action="toggle-favorite"` → emite `Events.QUOTE_TOGGLE_FAVORITE`
  - `data-action="delete"` → emite `Events.QUOTE_DELETE`
  - `data-action="reply"` → emite `Events.QUOTE_OPEN_REPLY`
  - `data-action="edit"` → emite `Events.QUOTE_OPEN_MODAL`
  - `data-action="toggle-replies"` → expande/colapsa replies (estado local)
- Renderiza replies anidadas recursivamente montando `QuoteCard` hijos

**Crear `src/features/quotes/CompareView.js`** (reemplaza `src/components/CompareView.js`):
- Clase `CompareView extends Component`
- `props`: `{ quotes, collections }`
- `render()`: genera el HTML de la vista de debate (columna favor + columna contra)
- `onMount()`: mismos data-actions que `QuoteCard`

**Actualizar `src/components/index.js`:** exportar desde las nuevas rutas.

**En `main.js`:** eliminar `toggleReplies()`, y las referencias a los window globals de quotes (`window.deleteQuote`, `window.toggleFavorite`, `window.openReplyModal`).

### Criterio de éxito
- Las tarjetas de citas se renderizan con el mismo aspecto.
- Los botones de favorito, borrar, reply y editar funcionan.
- Los replies anidados se muestran y colapsan correctamente.
- La vista de debate muestra favor/contra correctamente.
- `npm run dev` sin errores.

---

## T-10 — Feature Quotes: `QuoteListView`

**Fase:** 5 | **Impacto:** Elimina `renderQuotes()`, `renderListView()`, `renderCompareViewMode()` de `main.js`.

### Contexto previo
Leer:
- `src/main.js` (funciones: `renderQuotes`, `renderListView`, `renderCompareViewMode`, `updateStats`, `getFilters`)
- `src/features/quotes/QuoteCard.js` (T-09)
- `src/features/quotes/CompareView.js` (T-09)
- `src/core/Component.js`, `StateManager.js`
- `src/services/QuoteService.js`

### Qué hacer

**Crear `src/features/quotes/QuoteListView.js`:**
- Clase `QuoteListView extends Component`
- `props`: `{ quoteService, collectionService }`
- `render()`: lee `StateManager.get('quotes')`, `StateManager.get('collections')`, `StateManager.get('quoteFilters')`, `StateManager.get('currentView')`
  - Aplica filtros: `quoteService.filterQuotes(quotes, filters)`
  - Aplica orden: `quoteService.sortQuotes(filtered, filters.sortBy)`
  - Si `currentView === 'compare'`: renderiza `CompareView`
  - Si `currentView === 'list'`: construye árbol con `quoteService.buildQuoteTree(sorted)` y renderiza `QuoteCard` para cada raíz
  - Si no hay citas: muestra estado vacío con texto i18n
- `onMount()`:
  - `this.watchState('quotes', () => this._rerender())`
  - `this.watchState('quoteFilters', () => this._rerender())`
  - `this.watchState('currentView', () => this._rerender())`
  - Escucha `Events.QUOTE_TOGGLE_FAVORITE` → llama a `quoteService.toggleFavorite()`
  - Escucha `Events.QUOTE_DELETE` → llama a `confirmModal.confirmDelete()` + `quoteService.deleteWithReplies()`

**En `main.js`:** eliminar `renderQuotes()`, `renderListView()`, `renderCompareViewMode()`, `updateStats()`, `getFilters()`.

### Criterio de éxito
- La lista de citas se actualiza en tiempo real cuando cambian los datos.
- Los filtros y el orden funcionan.
- La vista de debate funciona.
- El estado vacío se muestra cuando no hay citas.
- `npm run dev` sin errores.

---

## T-11 — Feature Quotes: `QuoteModal` + `CollectionModal`

**Fase:** 5 | **Impacto:** Elimina funciones de modales de quotes de `main.js`.

### Contexto previo
Leer:
- `src/main.js` (funciones: `openModal`, `closeModal`, `handleQuoteSubmit`, `openReplyModal`, `openNewCollectionModal`, `closeCollectionModal`, `createCollection`)
- `index.html` (HTML de los modales de cita y colección)
- `src/shared/components/Modal.js` (T-04)
- `src/shared/components/CustomSelect.js` (T-03)
- `src/services/QuoteService.js`, `CollectionService.js`

### Qué hacer

**Crear `src/features/quotes/QuoteModal.js`:**
- Clase `QuoteModal extends Modal`
- Gestiona el formulario de creación/edición de citas
- Dos modos: `mode: 'create' | 'edit' | 'reply'`
- `open(quoteId)`: si `quoteId` existe, carga los datos del quote en el form
- `open({ parentId, stance, collectionId })`: modo reply, preselecciona stance opuesta
- `handleSubmit()`: valida y llama a `quoteService.create()` o `quoteService.update()`
- Usa `CustomSelect` para el selector de colección y de stance

**Crear `src/features/quotes/CollectionModal.js`:**
- Clase `CollectionModal extends Modal`
- Formulario simple: input de nombre + botón guardar
- `handleSubmit()`: llama a `collectionService.create()`

**En `main.js`:**
- Escuchar `Events.QUOTE_OPEN_MODAL` → instanciar y abrir `QuoteModal`
- Escuchar `Events.QUOTE_OPEN_REPLY` → instanciar y abrir `QuoteModal` en modo reply
- Escuchar `Events.COLLECTION_OPEN_MODAL` → instanciar y abrir `CollectionModal`
- Eliminar: `openModal()`, `closeModal()`, `handleQuoteSubmit()`, `openReplyModal()`, `openNewCollectionModal()`, `closeCollectionModal()`, `createCollection()`

### Criterio de éxito
- Crear, editar y borrar citas funciona.
- Crear citas como replies funciona.
- Crear colecciones funciona.
- `npm run dev` sin errores.

---

## T-12 — Feature Quotes: `QuotesMobileFilters`

**Fase:** 5 | **Impacto:** Elimina lógica de filtros móvil de `main.js`.

### Contexto previo
Leer:
- `src/main.js` (funciones: `setupMobileListeners`, `initMobileFiltersPanel`, `updateMobileFiltersPanel`, `openFiltersPanel`, `closeFiltersPanel`, `clearMobileFilters`, `applyMobileFilters`, `syncCustomSelectUI`, `updateFilterBadge`, `attachChipHandlers`, objeto `mobileFiltersState`)
- `index.html` (HTML del FAB y panel de filtros móvil)
- `src/core/Component.js`, `StateManager.js`

### Qué hacer

**Crear `src/features/quotes/QuotesMobileFilters.js`:**
- Clase `QuotesMobileFilters extends Component`
- Gestiona el FAB flotante y el panel de filtros que se despliega en móvil
- Estado local interno: `{ isOpen, selectedStance, selectedCollectionId, selectedTags, favoriteOnly, sortBy }`
- `render()`: genera el FAB + el panel deslizante con chips de colección, stance, etc.
- `onMount()`: listeners de FAB, chips, "Aplicar", "Limpiar"
- Al aplicar: actualiza `StateManager.set({ quoteFilters: { ... } })` y emite `Events.QUOTE_FILTER_CHANGED`
- Muestra badge con número de filtros activos

**En `main.js`:** eliminar todas las funciones listadas en "contexto previo".

### Criterio de éxito
- En móvil, el FAB aparece y el panel de filtros se abre/cierra.
- Los chips de filtro funcionan.
- Los filtros aplicados se reflejan en la lista de citas.
- El badge del FAB muestra el número correcto de filtros activos.
- `npm run dev` sin errores.

---

## T-13 — Feature Quotes: `QuotesFeature` Orquestador

**Fase:** 5 | **Impacto:** La sección quotes queda completamente fuera de `main.js`.

### Contexto previo
Leer:
- Todos los componentes creados en T-08 a T-12
- `src/core/Component.js`, `EventBus.js`, `StateManager.js`
- `src/features/layout/AppShell.js`

### Qué hacer

**Crear `src/features/quotes/QuotesFeature.js`:**
- Clase `QuotesFeature extends Component`
- `props`: `{ quoteService, collectionService, userId }`
- `onMount()`:
  - Inicia suscripción a `quoteService.subscribe(userId, quotes => StateManager.set({ quotes }))`
  - Inicia suscripción a `collectionService.subscribe(userId, collections => StateManager.set({ collections }))`
  - Monta: `QuoteFiltersBar`, `QuoteListView`, `QuotesMobileFilters` en sus contenedores correspondientes
  - Escucha `Events.QUOTE_VIEW_CHANGED` → actualiza `StateManager.set({ currentView })`
- `onUnmount()`: cancela suscripciones a los servicios

**Actualizar `src/features/quotes/index.js`** con todos los exports.

**En `AppShell.js`:** cuando el usuario navega a la sección quotes, navegar con el `Router` a `QuotesFeature`.

**En `main.js`:** eliminar toda la lógica de suscripción a datos de quotes.

### Criterio de éxito
- La sección quotes completa funciona: lista, filtros, modales, compare view, móvil.
- Al navegar a otras secciones y volver, los datos siguen correctos.
- No hay funciones de quotes en `main.js`.
- `npm run dev` sin errores.

---

## T-14 — Feature Wiki: `TopicCard` + `TopicsGrid`

**Fase:** 6 | **Impacto:** Elimina `renderTopicsList()` de `main.js`.

### Contexto previo
Leer:
- `src/main.js` (funciones: `renderWikiView`, `renderTopicsList`, `getTopicStats`)
- `src/utils/helpers.js` (funciones: `getTopicIconSvg`, `getRelativeTime` — extraídas en T-02)
- `src/services/TopicService.js`
- `src/core/Component.js`, `EventBus.js`

### Qué hacer

**Crear `src/features/wiki/TopicCard.js`:**
- Clase `TopicCard extends Component`
- `props`: `{ topic, quotes, insights }` (para calcular estadísticas)
- `render()`: genera la tarjeta de tema con icono, nombre, descripción, badges de estadísticas, estado (in_progress/consolidated) y acciones
- `onMount()`: listener delegado:
  - `data-action="open"` → emite `Events.TOPIC_OPEN`
  - `data-action="edit"` → emite `Events.TOPIC_OPEN_MODAL`
  - `data-action="delete"` → emite `Events.TOPIC_DELETE`
- Método `getTopicStats(topic, quotes, insights)` interno

**Crear `src/features/wiki/TopicsGrid.js`:**
- Clase `TopicsGrid extends Component`
- `props`: `{ topicService }`
- `render()`: lee `StateManager.get('topics')`, `StateManager.get('quotes')`, `StateManager.get('insights')`, aplica búsqueda/orden del state
  - Si hay temas: genera la grid de `TopicCard`
  - Si no hay temas: muestra estado vacío
- `onMount()`: `this.watchState('topics', () => this._rerender())` etc.

**Crear `src/features/wiki/index.js`** (vacío)

**En `main.js`:** eliminar `renderWikiView()`, `renderTopicsList()`, `getTopicStats()`.

### Criterio de éxito
- El grid de temas se renderiza correctamente con sus estadísticas.
- Los botones de editar y borrar en las tarjetas funcionan (aunque los modales vengan en T-15).
- `npm run dev` sin errores.

---

## T-15 — Feature Wiki: `TopicModal` + `WikiFiltersBar` + `WikiSidebarPanel`

**Fase:** 6 | **Impacto:** Elimina funciones de modal de tema, filtros wiki y sidebar wiki de `main.js`.

### Contexto previo
Leer:
- `src/main.js` (funciones: `openTopicModal`, `closeTopicModal`, `handleTopicSubmit`, `renderSidebarTopics`, parte wiki de `setupFilterListeners`)
- `index.html` (HTML del modal de tema)
- `src/shared/components/Modal.js`, `IconPicker.js` (T-04, T-05)
- `src/services/TopicService.js`

### Qué hacer

**Crear `src/features/wiki/TopicModal.js`:**
- Clase `TopicModal extends Modal`
- Formulario: nombre, descripción, icono (usa `IconPicker`), tags
- `open(topic)`: si `topic` existe, edición; si no, creación
- `handleSubmit()`: llama a `topicService.create()` o `topicService.update()`
- Escucha `Events.TOPIC_OPEN_MODAL` para abrirse

**Crear `src/features/wiki/WikiFiltersBar.js`:**
- Buscador de temas + select de orden + botón "Nuevo Tema"
- Al buscar: actualiza un estado de búsqueda en `StateManager` (añadir `wikiSearchTerm` y `wikiSortBy` al `StateManager`)
- Al click "Nuevo Tema": emite `Events.TOPIC_OPEN_MODAL` con `null`

**Crear `src/features/wiki/WikiSidebarPanel.js`:**
- Lista los temas en el sidebar de navegación
- Se suscribe a `StateManager` en `topics`
- Al hacer click en un tema: emite `Events.TOPIC_OPEN`

**En `main.js`:** eliminar las funciones indicadas.

### Criterio de éxito
- Crear y editar temas funciona (con selector de icono).
- La búsqueda de temas funciona.
- El sidebar muestra los temas.
- `npm run dev` sin errores.

---

## T-16 — Feature Wiki: `InsightsSidebarInTopic` + `TopicDetail`

**Fase:** 6 | **Impacto:** Elimina `openTopicView()` y el renderizado de detalle de tema de `main.js`.

### Contexto previo
Leer:
- `src/main.js` (funciones: `openTopicView`, `renderTopicDetailView`, `toggleInsightsSidebar`, `setupTopicDetailListeners`, `filterTopicSections`, `renderInsightSidebarCard`, `toggleInsightExpand`, `setupHighlightDragAndDrop` y handlers de drag/drop)
- `src/services/TopicService.js`, `InsightService.js`, `QuoteService.js`
- `src/core/Component.js`, `EventBus.js`, `StateManager.js`

### Qué hacer

**Crear `src/features/wiki/InsightsSidebarInTopic.js`:**
- Clase `InsightsSidebarInTopic extends Component`
- `props`: `{ topicId, insightService }`
- `render()`: lista de tarjetas de insight colapsables con sus highlights
- `onMount()`: toggle de expand, y la lógica de drag-and-drop de highlights hacia las secciones

**Crear `src/features/wiki/TopicDetail.js`:**
- Clase `TopicDetail extends Component`
- `props`: `{ topicId, topicService, insightService, quoteService }`
- `render()`: cabecera del tema + masonry de secciones + sidebar de insights (toggle)
- `onMount()`:
  - Carga el tema por `topicId`
  - Monta `InsightsSidebarInTopic` como hijo
  - Listener de búsqueda de secciones
  - Escucha `Events.BACK_TO_LIST` → desmontarse y volver al grid

**En `main.js`:** eliminar las funciones indicadas.

### Criterio de éxito
- Hacer click en un tema abre su vista detalle.
- Las secciones del tema se muestran en la masonry.
- El sidebar de insights vinculados funciona.
- El drag-and-drop de highlights funciona.
- El botón de volver regresa al grid de temas.
- `npm run dev` sin errores.

---

## T-17 — Feature Wiki: `CustomSectionCard` + `NewSectionModal`

**Fase:** 6 | **Impacto:** Elimina funciones de gestión de secciones de `main.js`.

### Contexto previo
Leer:
- `src/main.js` (funciones: `renderCustomSectionCard`, `getContentPreview`, `openNewSectionModal`, `closeNewSectionModal`, `createCustomSection`, `deleteCustomSection`)
- `src/utils/helpers.js` (`getSectionIconSvg`)
- `src/shared/components/Modal.js`, `IconPicker.js`

### Qué hacer

**Crear `src/features/wiki/CustomSectionCard.js`:**
- Clase `CustomSectionCard extends Component`
- `props`: `{ section, topicId }`
- `render()`: tarjeta de sección con icono, nombre, preview de contenido, badges de highlights vinculados
- `onMount()`: listener delegado:
  - `data-action="open"` → emite `Events.SECTION_OPEN`
  - `data-action="delete"` → emite `Events.SECTION_DELETE`

**Crear `src/features/wiki/NewSectionModal.js`:**
- Clase `NewSectionModal extends Modal`
- Formulario: nombre, tipo (document/list), icono (usa `IconPicker`)
- `handleSubmit()`: llama a `topicService.addCustomSection()`
- Escucha `Events.SECTION_CREATE` para abrirse

**En `main.js`:** eliminar las funciones indicadas.
**En `TopicDetail.js`** (T-16): usar `CustomSectionCard` para renderizar cada sección.

### Criterio de éxito
- Las tarjetas de sección se renderizan correctamente con su preview.
- Crear y borrar secciones funciona.
- `npm run dev` sin errores.

---

## T-18 — Feature Wiki: `MarkdownEditor`

**Fase:** 6 | **Impacto:** Elimina funciones de edición de markdown de `main.js`.

### Contexto previo
Leer:
- `src/main.js` (funciones: `insertMarkdown`, `insertLink`, `insertHeading`, `toggleHeadingDropdown`, `handleMarkdownShortcuts`)
- `src/utils/helpers.js` (`renderMarkdown`, `extractHeadingsFromMarkdown`)
- `src/core/Component.js`

### Qué hacer

**Crear `src/features/wiki/MarkdownEditor.js`:**
- Clase `MarkdownEditor extends Component`
- `props`: `{ initialContent, onChange, readOnly }`
- `render()`: toolbar (botones H1-H6, negrita, cursiva, lista, enlace, imagen) + textarea + panel de preview (split)
- `onMount()`:
  - Listeners de todos los botones de la toolbar
  - Listener de atajos de teclado (`Ctrl+B`, `Ctrl+I`, etc.)
  - Al cambiar el textarea: llama `props.onChange(content)` (debounced)
- `insertMarkdown(prefix, suffix, options)`: método interno que inserta texto en la posición del cursor
- `setContent(content)`: método público para actualizar el contenido programáticamente
- `getContent()`: método público para leer el contenido actual
- `togglePreview()`: alterna el modo split preview

**En `main.js`:** eliminar las funciones indicadas.

### Criterio de éxito
- El editor markdown renderiza la toolbar.
- Los botones de toolbar insertan el markdown correcto.
- Los atajos de teclado funcionan.
- El modo split preview funciona.
- `npm run dev` sin errores.

---

## T-19 — Feature Wiki: `SectionEditorModal`

**Fase:** 6 | **Impacto:** Elimina `openCustomSectionModal()`, TOC y lógica de highlights de secciones de `main.js`.

### Contexto previo
Leer:
- `src/main.js` (funciones: `openCustomSectionModal`, `closeCustomSectionModal`, `toggleSectionEditMode`, `saveCustomSectionContent`, `updateSidebarTOC`, `initTocScrollSpy`, `scrollToHeading`, `setActiveTocItem`, `toggleSplitPreview`, `toggleSectionHighlightsSidebar`, `linkHighlightToSection`, `unlinkHighlightFromSection`, `copyHighlightToClipboard`)
- `src/features/wiki/MarkdownEditor.js` (T-18)
- `src/services/TopicService.js`

### Qué hacer

**Crear `src/features/wiki/SectionEditorModal.js`:**
- Clase `SectionEditorModal extends Component` (modal de pantalla completa, no usa el Modal base)
- `props`: `{ topicId, topicService, insightService }`
- `open(sectionId)`: carga la sección y abre el modal
- `render()`: estructura de 3 columnas: TOC (izq) + editor (centro) + sidebar highlights (der)
- Monta `MarkdownEditor` como hijo en el área central
- `onMount()`:
  - Botones: guardar (Ctrl+S), editar/preview, cerrar, toggle TOC, toggle highlights sidebar
  - TOC: `updateSidebarTOC(content)` al cambiar el contenido, `initTocScrollSpy()`
  - Highlights sidebar: lista de highlights del insight vinculado con botones para vincular/desvincular/copiar
  - Autosave cada 30s
- Escucha `Events.SECTION_OPEN` para abrirse

**En `main.js`:** eliminar todas las funciones indicadas.

### Criterio de éxito
- Hacer click en una sección abre el editor.
- El TOC se genera y actualiza automáticamente.
- Guardar contenido funciona (Ctrl+S y botón).
- El sidebar de highlights funciona: vincular/desvincular/copiar.
- `npm run dev` sin errores.

---

## T-20 — Feature Wiki: `WikiFeature` Orquestador

**Fase:** 6 | **Impacto:** La sección wiki queda completamente fuera de `main.js`.

### Contexto previo
Leer:
- Todos los componentes de wiki creados en T-14 a T-19
- `src/core/Component.js`, `EventBus.js`, `StateManager.js`, `Router.js`
- `src/features/layout/AppShell.js`

### Qué hacer

**Crear `src/features/wiki/WikiFeature.js`:**
- Clase `WikiFeature extends Component`
- `props`: `{ topicService, insightService, quoteService, userId }`
- `onMount()`:
  - Inicia suscripción a `topicService.subscribe(userId, topics => StateManager.set({ topics }))`
  - Estado interno: `currentView: 'grid' | 'detail'`, `currentTopicId: null`
  - Monta `WikiFiltersBar` y `TopicsGrid` (vista grid)
  - Escucha `Events.TOPIC_OPEN` → cambia a vista detalle montando `TopicDetail`
  - Escucha `Events.BACK_TO_LIST` → vuelve a vista grid montando `TopicsGrid`
  - Escucha `Events.TOPIC_DELETE` → `confirmModal.confirmDelete()` + `topicService.delete()`
  - Escucha `Events.TOPIC_OPEN_MODAL` → monta `TopicModal`
  - Escucha `Events.SECTION_CREATE` → monta `NewSectionModal`
  - Escucha `Events.SECTION_DELETE` → `confirmModal.confirmDelete()` + eliminar sección
  - Escucha `Events.SECTION_OPEN` → monta `SectionEditorModal`
- `onUnmount()`: cancela suscripciones

**Actualizar `src/features/wiki/index.js`** con todos los exports.

**En `AppShell.js`:** cuando el usuario navega a wiki, usar `Router` con `WikiFeature`.

**En `main.js`:** eliminar toda la lógica de wiki restante.

### Criterio de éxito
- La sección wiki completa funciona: grid, detalle, secciones, editor.
- Al navegar a otras secciones y volver, los datos persisten.
- No hay funciones de wiki en `main.js`.
- `npm run dev` sin errores.

---

## T-21 — Feature Insights: `InsightCard` + `InsightsGrid`

**Fase:** 7 | **Impacto:** Elimina `renderInsightsList()` de `main.js`.

### Contexto previo
Leer:
- `src/main.js` (funciones: `renderInsightsView`, `renderInsightsList`, el ResizeObserver de columnas)
- `src/services/InsightService.js`
- `src/core/Component.js`, `EventBus.js`, `StateManager.js`
- `src/utils/helpers.js`

### Qué hacer

**Crear `src/features/insights/InsightCard.js`:**
- Clase `InsightCard extends Component`
- `props`: `{ insight }`
- `render()`: tarjeta con thumbnail, tipo de fuente, título, canal, estado (badge), descripción corta, tags, acciones
- `onMount()`: listener delegado:
  - `data-action="open"` → emite `Events.INSIGHT_OPEN`
  - `data-action="edit"` → emite `Events.INSIGHT_OPEN_MODAL`
  - `data-action="delete"` → emite `Events.INSIGHT_DELETE`

**Crear `src/features/insights/InsightsGrid.js`:**
- Clase `InsightsGrid extends Component`
- `props`: `{ insightService }`
- `render()`: lee insights de `StateManager`, aplica filtros de estado/tipo/búsqueda, renderiza grid de `InsightCard`
- `onMount()`:
  - `this.watchState('insights', () => this._rerender())`
  - Escucha `Events.INSIGHT_DELETE` → `confirmModal.confirmDelete()` + `insightService.delete()`
  - ResizeObserver para ajustar el número de columnas del grid

**Crear `src/features/insights/index.js`** (vacío)

**En `main.js`:** eliminar las funciones indicadas.

### Criterio de éxito
- El grid de insights se renderiza correctamente.
- Los filtros de estado funcionan.
- Borrar insights funciona.
- `npm run dev` sin errores.

---

## T-22 — Feature Insights: `InsightModal`

**Fase:** 7 | **Impacto:** Elimina funciones de modal de captura de `main.js`.

### Contexto previo
Leer:
- `src/main.js` (funciones: `openInsightModal`, `closeInsightModal`, `setupInsightModalListeners`, `handleInsightSubmit`, `fetchUrlMetadata`, `showSourcePreview`, `setFetchButtonState`, `updateInsightTopicsDropdown`, `saveInsightNotes`)
- `index.html` (HTML del modal de insight)
- `src/shared/components/Modal.js`, `CustomSelect.js`
- `src/services/InsightService.js`

### Qué hacer

**Crear `src/features/insights/InsightModal.js`:**
- Clase `InsightModal extends Modal`
- Formulario: URL, tipo de fuente, título (auto-fetch), thumbnail preview, estado inicial, topic vinculado, tags
- `fetchMetadata(url)`: llama al endpoint de metadatos y rellena el formulario
- Muestra preview del thumbnail/título tras fetch
- Botón de fetch con estado: idle / loading / error
- `handleSubmit()`: llama a `insightService.create()` o `insightService.update()`
- Escucha `Events.INSIGHT_OPEN_MODAL` para abrirse

**En `main.js`:** eliminar las funciones indicadas.

### Criterio de éxito
- Capturar un nuevo insight funciona.
- El auto-fetch de metadatos de YouTube y artículos funciona.
- Editar insights funciona.
- `npm run dev` sin errores.

---

## T-23 — Feature Insights: `YouTubePlayer`

**Fase:** 7 | **Impacto:** Elimina lógica del iframe de YouTube de `main.js`.

### Contexto previo
Leer:
- `src/main.js` (funciones: `loadYouTubeAPI`, `initYouTubePlayer`, `getYouTubeCurrentTime`, `seekToTime`)
- `src/core/Component.js`

### Qué hacer

**Crear `src/features/insights/YouTubePlayer.js`:**
- Clase `YouTubePlayer extends Component`
- `props`: `{ videoId, onReady, onTimeUpdate }`
- `onMount()`: carga la API de YouTube si no está cargada, inicializa el player en su contenedor
- `seekTo(seconds)`: método público para saltar a un timestamp
- `getCurrentTime()`: método público para obtener el tiempo actual
- `onUnmount()`: destruye el player de YouTube limpiamente
- Internamente gestiona el estado del player (ready, playing, paused)

**En `main.js`:** eliminar las funciones indicadas.

### Criterio de éxito
- El player de YouTube se inicializa y reproduce el video.
- Los timestamps en las notas hacen seek al tiempo correcto.
- Al desmontar el componente, el player se destruye limpiamente.
- `npm run dev` sin errores.

---

## T-24 — Feature Insights: `TranscriptView` + `HighlightPopup`

**Fase:** 7 | **Impacto:** Elimina funciones de transcripción y popup de color de `main.js`.

### Contexto previo
Leer:
- `src/main.js` (funciones: `setupTranscriptHighlighting`, `refreshTranscriptContent`, `showTranscriptInput`, `hideTranscriptInput`, `saveTranscript`, `clearTranscript`, `fetchYouTubeTranscript`, `showHighlightPopup`, `addHighlightToInsight`, `showColorPicker`, `changeHighlightColor`)
- `src/services/InsightService.js`, `TranscriptService.js`
- `src/core/Component.js`, `EventBus.js`

### Qué hacer

**Crear `src/features/insights/HighlightPopup.js`:**
- Clase `HighlightPopup extends Component` (se monta sobre el `document.body`)
- Aparece al seleccionar texto en la transcripción
- Muestra paleta de colores
- Al elegir color: emite `Events.HIGHLIGHT_ADD` con el texto y color seleccionados

**Crear `src/features/insights/ColorPickerPopup.js`:**
- Similar a `HighlightPopup` pero para cambiar el color de un highlight existente
- Al elegir color: emite `Events.HIGHLIGHT_COLOR_CHANGE`

**Crear `src/features/insights/TranscriptView.js`:**
- Clase `TranscriptView extends Component`
- `props`: `{ insight, insightService, transcriptService }`
- `render()`: muestra la transcripción con los highlights aplicados como `<mark>` con color
- `onMount()`:
  - Listener de selección de texto (`mouseup`) → muestra `HighlightPopup`
  - Listener de click en highlights → muestra `ColorPickerPopup`
  - Escucha `Events.HIGHLIGHT_ADD` → llama a `insightService.addHighlight()`
  - Escucha `Events.HIGHLIGHT_COLOR_CHANGE` → llama a `insightService.updateHighlightColor()`
  - Botón fetch transcripción: llama a `transcriptService.fetchTranscript()` y guarda con `insightService.saveTranscript()`
  - Botón input manual: muestra textarea para pegar transcripción

**En `main.js`:** eliminar las funciones indicadas.

### Criterio de éxito
- La transcripción se muestra con highlights coloreados.
- Al seleccionar texto aparece el popup de color.
- Al hacer click en un highlight aparece el popup de cambio de color.
- Fetch de transcripción de YouTube funciona.
- `npm run dev` sin errores.

---

## T-25 — Feature Insights: `HighlightsTab` + `TimestampedNotes`

**Fase:** 7 | **Impacto:** Elimina tabs de highlights y notas de `main.js`.

### Contexto previo
Leer:
- `src/main.js` (funciones: `refreshHighlightsTab`, `updateHighlightsTabCount`, `removeHighlight`, `convertHighlightToQuote`, `renderTimestampedNotes`, `insertTimestampNote`, `addTimestampedNote`, `deleteTimestampedNote`, `toggleTodoNote`, `refreshTimestampedNotes`, `setupQuickNoteInput`)
- `src/services/InsightService.js`
- `src/core/Component.js`, `EventBus.js`

### Qué hacer

**Crear `src/features/insights/HighlightsTab.js`:**
- Clase `HighlightsTab extends Component`
- `props`: `{ insight, insightService, quoteService }`
- `render()`: lista de highlights con su texto, color (badge), botones: copiar, convertir a cita, eliminar
- `onMount()`:
  - Escucha `Events.HIGHLIGHT_REMOVE` → llama a `insightService.removeHighlight()`, re-renderiza
  - Escucha `Events.HIGHLIGHT_TO_QUOTE` → abre `QuoteModal` prefillado con el texto del highlight
  - Botón copiar: `navigator.clipboard.writeText(text)`

**Crear `src/features/insights/TimestampedNotes.js`:**
- Clase `TimestampedNotes extends Component`
- `props`: `{ insight, insightService, videoId, getPlayerTime }`
- `render()`: lista de notas con timestamp clickable, checkbox todo, texto, botón eliminar + input rápido de nueva nota
- `onMount()`:
  - Botón "Añadir nota": si hay video, obtiene el tiempo con `props.getPlayerTime()`, crea la nota
  - Click en timestamp: llama a `Events.SEEK_TO_TIME` (que el `YouTubePlayer` escucha)
  - Toggle checkbox: llama a `insightService.toggleTodoNote()`
  - Borrar nota: llama a `insightService.deleteTimestampedNote()`

**En `main.js`:** eliminar las funciones indicadas.

### Criterio de éxito
- La pestaña de highlights muestra todos los highlights correctamente.
- Copiar, convertir a cita y eliminar highlights funciona.
- La pestaña de notas muestra las notas con timestamps.
- Añadir una nota con timestamp del video funciona.
- Click en timestamp navega al tiempo en el video.
- `npm run dev` sin errores.

---

## T-26 — Feature Insights: `InsightDetail` + `InsightsFeature` Orquestador

**Fase:** 7 | **Impacto:** La sección insights queda completamente fuera de `main.js`.

### Contexto previo
Leer:
- `src/main.js` (funciones: `openInsightView`, `setupInsightDetailTabs`, `setupResizeHandle`, `toggleStatusDropdown`, `changeInsightStatus`, `toggleTopicSelector`, `linkInsightToTopic`, `updateInsightsCounts`, `updateInsightStatusActive`)
- Todos los componentes de insights creados en T-21 a T-25
- `src/core/Component.js`, `EventBus.js`, `StateManager.js`

### Qué hacer

**Crear `src/features/insights/InsightDetail.js`:**
- Clase `InsightDetail extends Component`
- `props`: `{ insightId, insightService, topicService }`
- `render()`: layout de detalle: header (título, fuente, estado, link a topic) + área de contenido en dos paneles con handle resize
- El panel izquierdo: video/thumbnail si es YouTube, o metadatos de la fuente
- El panel derecho: tabs (Transcripción, Highlights, Notas)
- `onMount()`:
  - Si es YouTube: monta `YouTubePlayer` como hijo
  - Monta `TranscriptView`, `HighlightsTab`, `TimestampedNotes` en sus pestañas
  - Gestión de tabs (clic → muestra pestaña)
  - Handle resize entre paneles (drag)
  - Dropdown de estado: escucha `Events.INSIGHT_STATUS_CHANGE` → `insightService.updateStatus()`
  - Selector de topic: escucha `Events.INSIGHT_LINK_TOPIC` → `insightService.linkToTopic()`

**Crear `src/features/insights/InsightsSidebarPanel.js`:**
- Clase `InsightsSidebarPanel extends Component`
- Muestra los contadores de insights por estado en el sidebar (draft, reviewed, integrated, discarded)
- Se suscribe a `StateManager` en `insights`

**Crear `src/features/insights/InsightsFiltersBar.js`:**
- Barra de filtros: filtro por estado, filtro por tipo de fuente, búsqueda, botón "Capturar"
- Al cambiar filtros: actualiza `StateManager` (añadir `insightFilters` al `StateManager`)
- Al click "Capturar": emite `Events.INSIGHT_OPEN_MODAL` con `null`

**Crear `src/features/insights/InsightsFeature.js`:**
- Clase `InsightsFeature extends Component`
- `props`: `{ insightService, topicService, quoteService, userId }`
- `onMount()`:
  - Inicia suscripción a `insightService.subscribe(userId, insights => StateManager.set({ insights }), handleError)`
  - Monta `InsightsFiltersBar` y `InsightsGrid` (vista grid)
  - Escucha `Events.INSIGHT_OPEN` → cambia a vista detalle con `InsightDetail`
  - Escucha `Events.BACK_TO_LIST` → vuelve a vista grid
  - Escucha `Events.INSIGHT_DELETE` → confirmación + `insightService.delete()`
  - Escucha `Events.INSIGHT_OPEN_MODAL` → monta `InsightModal`
- `onUnmount()`: cancela suscripción

**Actualizar `src/features/insights/index.js`** con todos los exports.

**En `AppShell.js`:** cuando el usuario navega a insights, usar `Router` con `InsightsFeature`.

**En `main.js`:** eliminar toda la lógica de insights restante.

### Criterio de éxito
- La sección insights completa funciona: grid, detalle, transcripción, highlights, notas, video.
- Cambiar el estado de un insight funciona.
- Vincular un insight a un tema funciona.
- No hay funciones de insights en `main.js`.
- `npm run dev` sin errores.

---

## T-27 — División del CSS en Archivos por Feature

**Fase:** CSS (puede ejecutarse en paralelo con otras tareas desde T-01)

> Esta tarea **no cambia comportamientos**, solo reorganiza el CSS. La app debe tener el mismo aspecto exacto al terminar.

### Contexto previo
Leer:
- `src/styles.css` completo
- `ARCHITECTURE_REFACTOR.md` sección 7 (tabla de división CSS)

### Qué hacer

Crear los siguientes archivos CSS copiando los bloques correspondientes de `styles.css`:

| Archivo a crear | Líneas de origen en `styles.css` |
|---|---|
| `src/shared/styles/base.css` | 1–36 |
| `src/shared/styles/layout.css` | 37–122, 1162–1213, 1486–1527 |
| `src/shared/styles/forms.css` | 338–469, 1023–1037 |
| `src/shared/styles/custom-select.css` | 364–527 |
| `src/shared/styles/modal.css` | 778–882, 962–1020 |
| `src/shared/styles/toast.css` | 906–961 |
| `src/shared/styles/tooltip.css` | 4676–4745 |
| `src/features/auth/styles/auth.css` | 123–301 |
| `src/features/layout/styles/layout.css` | 1162–1698, 1954–1980 |
| `src/features/quotes/styles/quotes.css` | 528–777, 3840–4484 |
| `src/features/wiki/styles/wiki.css` | 1699–1980, 4808–6722 |
| `src/features/insights/styles/insights.css` | 1981–3840 |

Importar los nuevos archivos CSS en el orquestador de cada feature (cuando existan) o en `main.js` temporalmente si el componente todavía no existe:
```js
import './shared/styles/base.css';
import './shared/styles/layout.css';
// etc.
```

Mantener `styles.css` original durante la migración. Una vez todos los features estén migrados y todos los CSS importados desde sus componentes, eliminar `styles.css` y su `<link>` en `index.html`.

### Criterio de éxito
- La app tiene **exactamente el mismo aspecto visual** que antes.
- `npm run dev` sin errores.
- No hay reglas CSS perdidas.

---

## T-28 — Limpieza Final: `main.js` → `app.js`

**Fase:** Final (ejecutar solo cuando T-13, T-20, T-26 y T-27 estén completas)

### Contexto previo
Leer:
- `src/main.js` (lo que quede)
- `src/features/layout/AppShell.js`
- `index.html`

### Qué hacer

1. Verificar que `main.js` solo contiene el bootstrap mínimo (la creación y mount del `AppShell`).
2. Renombrar `src/main.js` → `src/app.js`.
3. Actualizar `index.html` para apuntar a `src/app.js`:
   ```html
   <script type="module" src="/src/app.js"></script>
   ```
4. Verificar que `vite.config.js` (o equivalente) no tiene referencias hardcodeadas a `main.js`.
5. Eliminar `styles.css` de `index.html` si ya no se usa (fue reemplazado por los imports en T-27).
6. Eliminar `src/styles.css` si está vacío o todos sus estilos fueron migrados.
7. Eliminar `src/components/` si todos sus archivos fueron reemplazados por los de `src/features/`.

**`src/app.js` final:**
```js
import { AppShell } from './features/layout/index.js';

document.addEventListener('DOMContentLoaded', () => {
    new AppShell(document.body).mount();
});
```

### Criterio de éxito
- `src/app.js` tiene ~10 líneas.
- `src/main.js` no existe.
- `npm run build` genera el bundle sin errores ni warnings.
- La app funciona completamente en producción.
- No hay referencias a `window.*` en ningún archivo de `src/features/` ni `src/core/`.

---

## Resumen de Dependencias entre Tareas

```
T-01 (Core)
  └─► T-02 (Helpers)
        └─► T-03 (CustomSelect)
              └─► T-04 (Modal base)
                    └─► T-05 (IconPicker)
                          ├─► T-06 (Auth components)
                          │     └─► T-07 (AppShell + Layout)
                          │           ├─► T-08..T-12 (Quotes components) ──► T-13 (QuotesFeature)
                          │           ├─► T-14..T-19 (Wiki components) ──► T-20 (WikiFeature)
                          │           └─► T-21..T-25 (Insights components) ──► T-26 (InsightsFeature)
                          └─► T-27 (CSS split) ──► puede ejecutarse en paralelo desde T-01

T-13 + T-20 + T-26 + T-27 ──► T-28 (Limpieza final)
```

**Tareas que pueden ejecutarse en paralelo** (una vez sus dependencias están completas):
- T-08 a T-12 (Quotes components) son independientes entre sí.
- T-14 a T-19 (Wiki components) son independientes entre sí.
- T-21 a T-25 (Insights components) son independientes entre sí.
- T-27 (CSS) puede hacerse en cualquier momento tras T-01.
