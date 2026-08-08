import { Component } from '../../core/Component.js';
import { EventBus, Events } from '../../core/EventBus.js';

/**
 * NavSidebar — Gestiona el comportamiento del sidebar de navegación izquierdo.
 *
 * Behavioral wrapper: no genera HTML propio; actúa sobre el DOM existente
 * de `#navSidebar` (definido en index.html). Sobreescribe `mount()` para
 * no reemplazar el innerHTML del contenedor.
 *
 * Responsabilidades:
 *  - Colapsar / expandir el sidebar
 *  - Cambiar de sección (wiki / insights / quotes) → emite SECTION_SWITCH
 *  - Secciones colapsables (colecciones, tags, estado de insights)
 *  - Botones "Nuevo" → emite los eventos correspondientes
 *  - Filtro de estado de insights → llama props.onInsightStatusFilterToggle
 *
 * @example
 * const nav = new NavSidebar(document.getElementById('navSidebar'), {
 *     onInsightStatusFilter:       (status) => { ... },
 *     onInsightStatusFilterToggle: (status) => { ... }
 * });
 * nav.mount();
 */
export class NavSidebar extends Component {
    // Behavioral wrapper: no reemplazar el HTML existente del sidebar
    mount() {
        if (this._mounted) return this;
        this._mounted = true;
        this.onMount();
        return this;
    }

    onMount() {
        const el = this._container; // #navSidebar

        // ── Colapsar / expandir ────────────────────────────────────────────
        const sidebarToggle  = document.getElementById('sidebarToggle');
        const sidebarOpenBtn = document.getElementById('sidebarOpenBtn');
        const appLayout      = document.querySelector('.app-layout');

        if (sidebarToggle) {
            this.listen(sidebarToggle, 'click', () => {
                el.classList.toggle('collapsed');
                appLayout?.classList.toggle('sidebar-collapsed');
            });
        }
        if (sidebarOpenBtn) {
            this.listen(sidebarOpenBtn, 'click', () => {
                el.classList.remove('collapsed');
                appLayout?.classList.remove('sidebar-collapsed');
            });
        }

        // ── Tabs principales de sección ────────────────────────────────────
        [
            { id: 'navWikiTab',     view: 'wiki' },
            { id: 'navInsightsTab', view: 'insights' },
            { id: 'navQuotesTab',   view: 'quotes' }
        ].forEach(({ id, view }) => {
            const tab = document.getElementById(id);
            if (tab) this.listen(tab, 'click', () => EventBus.emit(Events.SECTION_SWITCH, view));
        });

        // ── Secciones colapsables ──────────────────────────────────────────
        [
            { headerId: 'collectionsHeader', itemsId: 'sidebarCollections' },
            { headerId: 'tagsHeader',         itemsId: 'sidebarTags' },
            { headerId: 'insightStatusHeader', itemsId: 'sidebarInsightStatus' }
        ].forEach(({ headerId, itemsId }) => {
            const header = document.getElementById(headerId);
            const items  = document.getElementById(itemsId);
            if (header && items) {
                this.listen(header, 'click', () => {
                    header.classList.toggle('collapsed');
                    items.classList.toggle('collapsed');
                });
            }
        });

        // ── Filtro "Todos los insights" ────────────────────────────────────
        const allInsightsHeader = document.getElementById('allInsightsHeader');
        if (allInsightsHeader) {
            this.listen(allInsightsHeader, 'click', () => {
                this.props.onInsightStatusFilter?.('');
            });
        }

        // ── Filtros por estado de insights ────────────────────────────────
        const sidebarInsightStatus = document.getElementById('sidebarInsightStatus');
        if (sidebarInsightStatus) {
            sidebarInsightStatus.querySelectorAll('.nav-item').forEach(item => {
                this.listen(item, 'click', () => {
                    this.props.onInsightStatusFilterToggle?.(item.dataset.status || '');
                });
            });
        }

        // ── Botones "Nuevo" ────────────────────────────────────────────────
        const navNewCollectionBtn = document.getElementById('navNewCollectionBtn');
        if (navNewCollectionBtn) {
            this.listen(navNewCollectionBtn, 'click', () =>
                EventBus.emit(Events.COLLECTION_OPEN_MODAL));
        }

        const navNewTopicBtn = document.getElementById('navNewTopicBtn');
        if (navNewTopicBtn) {
            this.listen(navNewTopicBtn, 'click', () =>
                EventBus.emit(Events.TOPIC_OPEN_MODAL));
        }

        const navNewInsightBtn = document.getElementById('navNewInsightBtn');
        if (navNewInsightBtn) {
            this.listen(navNewInsightBtn, 'click', () =>
                EventBus.emit(Events.INSIGHT_OPEN_MODAL));
        }
    }

    /**
     * Actualiza visualmente qué tab de sección está activa.
     * Llamado por AppShell tras cambiar de sección.
     * @param {'wiki'|'insights'|'quotes'} section
     */
    setActiveSection(section) {
        const tabMap = {
            wiki:     'navWikiTab',
            insights: 'navInsightsTab',
            quotes:   'navQuotesTab'
        };
        const contentMap = {
            wiki:     'navWikiContent',
            insights: 'navInsightsContent',
            quotes:   'navQuotesContent'
        };

        Object.values(tabMap).forEach(id => {
            document.getElementById(id)?.classList.remove('active');
        });
        Object.values(contentMap).forEach(id => {
            const el = document.getElementById(id);
            if (el) el.style.display = 'none';
        });

        const activeTab     = document.getElementById(tabMap[section]);
        const activeContent = document.getElementById(contentMap[section]);
        if (activeTab)     activeTab.classList.add('active');
        if (activeContent) activeContent.style.display = 'block';
    }
}
