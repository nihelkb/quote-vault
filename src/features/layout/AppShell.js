import { Component } from '../../core/Component.js';
import { EventBus, Events } from '../../core/EventBus.js';
import { AuthScreen } from '../auth/AuthScreen.js';
import { VerifyScreen } from '../auth/VerifyScreen.js';
import { NavSidebar } from './NavSidebar.js';
import { LanguageSelector } from './LanguageSelector.js';
import { ProfileMenu } from './ProfileMenu.js';
import { ThemeToggle } from './ThemeToggle.js';
import { toast } from '../../utils/toast.js';
import { confirmModal } from '../../utils/confirmModal.js';
import { t } from '../../utils/i18n.js';

/**
 * AppShell — Componente raíz de la aplicación.
 *
 * Orchestrates:
 *  1. Inicialización de servicios base (i18n, toast, confirmModal)
 *  2. Auth state → muestra AuthScreen / VerifyScreen / app principal
 *  3. Datos → llama subscribeToData / unsubscribeFromData
 *  4. Navegación de secciones (escucha SECTION_SWITCH)
 *  5. Bridge de eventos hacia funciones que aún residen en main.js
 *     (se irá limpiando en T-08 → T-28 a medida que se extraigan features)
 *
 * Behavioral wrapper: no reemplaza el HTML del body (index.html lo define).
 * Sobreescribe mount() para saltarse el paso innerHTML = render().
 *
 * Props bridge (temporales, se eliminan conforme avance la migración):
 *  - state                      objeto de estado global de main.js
 *  - subscribeToData(uid)       callback de main.js
 *  - unsubscribeFromData()      callback de main.js
 *  - renderQuotes()             callback de main.js
 *  - renderWikiView()           callback de main.js
 *  - renderInsightsView()       callback de main.js
 *  - onMainAppReady()           invoca los setup*() restantes de main.js
 */
export class AppShell extends Component {
    constructor(container, props = {}) {
        super(container, props);
        this._authScreen   = null;
        this._verifyScreen = null;
        this._navSidebar   = null;
        this._langSelector = null;
        this._profileMenu  = null;
        this._themeToggle  = null;
        this._mainAppReady = false;
        this._activeUserId = null;
    }

    // Behavioral wrapper: no borrar el body
    mount() {
        if (this._mounted) return this;
        this._mounted = true;
        this.onMount();
        return this;
    }

    onMount() {
        const { authService, i18n } = this.props;

        // ── 1. Servicios base ──────────────────────────────────────────────
        i18n.init();
        toast.init('toastContainer');
        confirmModal.init();

        // ── 2. Componentes de pantalla auth ────────────────────────────────
        const authScreenEl   = document.getElementById('authScreen');
        const verifyScreenEl = document.getElementById('verifyScreen');

        this._authScreen = new AuthScreen(authScreenEl, {
            authService,
            onNeedsVerification: (user) => this._showVerifyScreen(user)
        });
        this._authScreen.mount();

        this._verifyScreen = new VerifyScreen(verifyScreenEl, {
            authService,
            onVerified: (user) => this._handleAuthChange(user)
        });
        this._verifyScreen.mount();
        i18n.translatePage();

        // ── 3. Componentes de layout (sidebar, lang, perfil) ──────────────
        this._navSidebar = new NavSidebar(document.getElementById('navSidebar'), {
            onInsightStatusFilter: (status) => {
                this.props.state.insightStatusFilter = status;
                this.props.renderInsightsView?.();
            },
            onInsightStatusFilterToggle: (status) => {
                const s = this.props.state;
                s.insightStatusFilter = s.insightStatusFilter === status ? '' : status;
                this.props.renderInsightsView?.();
            }
        });
        this._navSidebar.mount();

        this._langSelector = new LanguageSelector(document.body, { i18n });
        this._langSelector.mount();

        this._profileMenu = new ProfileMenu(document.body, { authService });
        this._profileMenu.mount();

        this._themeToggle = new ThemeToggle(document.body);
        this._themeToggle.mount();

        // ── 4. Escuchar cambios de sección ─────────────────────────────────
        this.on(Events.SECTION_SWITCH, (section) => this._switchSection(section));

        // ── 5. Bridges hacia funciones que aún viven en main.js ───────────
        // (serán reemplazados por feature components en T-11, T-15, T-22)
        this.on(Events.COLLECTION_OPEN_MODAL, () => window.openNewCollectionModal?.());
        this.on(Events.TOPIC_OPEN_MODAL,      () => window.openTopicModal?.());
        this.on(Events.INSIGHT_OPEN_MODAL,    () => window.openInsightModal?.());

        // ── 6. Locale change → re-renderizar contenido dinámico ───────────
        i18n.onLocaleChange(() => {
            const s = this.props.state;
            switch (s.currentSection) {
                case 'wiki':
                    s.currentTopicId
                        ? window.openTopicView?.(s.currentTopicId)
                        : this.props.renderWikiView?.();
                    break;
                case 'insights':
                    s.currentInsightId
                        ? window.openInsightView?.(s.currentInsightId)
                        : this.props.renderInsightsView?.();
                    break;
                default:
                    this.props.renderQuotes?.();
            }
            window.renderSidebarCollections?.();
            window.renderSidebarTags?.();
            window.renderSidebarTopics?.();
            window.updateInsightsCounts?.();
            window.updateStats?.();
            window.updateCollectionSelects?.();
            window.updateMobileFiltersPanel?.();
        });

        // ── 7. Auth state observer ─────────────────────────────────────────
        const unsubAuth = authService.onAuthStateChange(user => this._handleAuthChange(user));
        this._busSubs.push(unsubAuth); // limpieza automática al unmount
    }

    // ── Auth state ────────────────────────────────────────────────────────────

    _handleAuthChange(user) {
        document.getElementById('loadingScreen')?.classList.add('hidden');

        const nextUserId = user?.uid ?? null;
        if (this._activeUserId !== nextUserId) {
            this.props.unsubscribeFromData?.();
            this.props.clearSensitiveState?.();
            this._activeUserId = nextUserId;
        }

        if (user) {
            if (this.props.authService.needsEmailVerification(user)) {
                this._showVerifyScreen(user);
            } else {
                this._showMainApp(user);
                this.props.subscribeToData?.(user.uid);
            }
        } else {
            this._showAuthScreen();
        }
    }

    _showAuthScreen() {
        document.getElementById('authScreen')?.classList.remove('hidden');
        document.getElementById('verifyScreen')?.classList.add('hidden');
        document.getElementById('mainApp')?.classList.add('hidden');
    }

    _showVerifyScreen(user) {
        document.getElementById('authScreen')?.classList.add('hidden');
        document.getElementById('mainApp')?.classList.add('hidden');
        this._verifyScreen.show(user);
    }

    _showMainApp(user) {
        document.getElementById('authScreen')?.classList.add('hidden');
        document.getElementById('verifyScreen')?.classList.add('hidden');
        document.getElementById('mainApp')?.classList.remove('hidden');

        // Actualizar avatar / nombre
        const displayName = this.props.authService.getDisplayName(user);
        const photoURL    = this.props.authService.getPhotoURL(user);
        this._profileMenu?.updateUser(user, displayName, photoURL);

        // Setup de listeners que aún viven en main.js (solo la primera vez)
        if (!this._mainAppReady) {
            this._mainAppReady = true;
            this.props.onMainAppReady?.();

            // Exponer switchSection en window para onclick handlers renderizados
            window.switchSection = (section) => this._switchSection(section);
        }

        this._switchSection(this.props.state.currentSection || 'wiki');
    }

    // ── Navegación de secciones ───────────────────────────────────────────────

    _switchSection(section) {
        const s = this.props.state;
        s.currentSection   = section;
        s.currentInsightId = null;
        s.currentTopicId   = null;

        // Actualizar tabs del sidebar
        this._navSidebar?.setActiveSection(section);

        // Cabeceras
        const desktopHeader  = document.querySelector('.content-header.desktop-header');
        const wikiHeader     = document.querySelector('.wiki-header');
        const insightsHeader = document.querySelector('.insights-header');

        if (desktopHeader)  desktopHeader.style.display  = 'none';
        if (wikiHeader)     wikiHeader.style.display     = 'none';
        if (insightsHeader) insightsHeader.style.display = 'none';

        const quotesList    = document.getElementById('quotesList');
        const quotesCompare = document.getElementById('quotesCompare');
        const emptyState    = document.getElementById('emptyState');
        const viewControls  = document.querySelector('.view-controls');

        switch (section) {
            case 'wiki':
                if (wikiHeader) wikiHeader.style.display = 'flex';
                viewControls?.style.setProperty('display', 'none');
                quotesList?.classList.add('hidden');
                quotesCompare?.classList.add('hidden');
                emptyState?.classList.add('hidden');
                this.props.renderWikiView?.();
                break;

            case 'insights':
                if (insightsHeader) insightsHeader.style.display = 'flex';
                viewControls?.style.setProperty('display', 'none');
                quotesList?.classList.add('hidden');
                quotesCompare?.classList.add('hidden');
                emptyState?.classList.add('hidden');
                this.props.renderInsightsView?.();
                break;

            case 'quotes':
            default:
                this._restoreQuotesView();
                if (desktopHeader) desktopHeader.style.display = 'flex';
                document.querySelector('.view-controls')?.style.setProperty('display', 'flex');
                quotesList?.classList.remove('hidden');
                if (s.currentView === 'compare') quotesCompare?.classList.remove('hidden');
                this.props.renderQuotes?.();
                break;
        }
    }

    _restoreQuotesView() {
        const contentBody = document.querySelector('.content-body');
        if (!contentBody) return;
        if (document.getElementById('quotesList')) return; // ya existe

        const s = this.props.state;
        contentBody.innerHTML = `
            <div class="view-controls">
                <button class="view-btn ${s.currentView === 'list' ? 'active' : ''}" id="viewList"
                    data-tooltip="${t('tooltips.listView')}">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="3" y1="6" x2="21" y2="6"></line>
                        <line x1="3" y1="12" x2="21" y2="12"></line>
                        <line x1="3" y1="18" x2="21" y2="18"></line>
                    </svg>
                </button>
                <button class="view-btn ${s.currentView === 'compare' ? 'active' : ''}" id="viewCompare"
                    data-tooltip="${t('tooltips.compareView')}">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="3" y="3" width="7" height="18"></rect>
                        <rect x="14" y="3" width="7" height="18"></rect>
                    </svg>
                </button>
            </div>
            <div class="quotes-list" id="quotesList"></div>
            <div class="quotes-compare hidden" id="quotesCompare">
                <div class="compare-column favor">
                    <h3 data-i18n="stances.favor">A favor</h3>
                    <div class="compare-quotes" id="quotesFavor"></div>
                </div>
                <div class="compare-column against">
                    <h3 data-i18n="stances.contra">En contra</h3>
                    <div class="compare-quotes" id="quotesAgainst"></div>
                </div>
            </div>
            <div class="empty-state hidden" id="emptyState">
                <h3 data-i18n="quotes.emptyTitle">Tu colección está vacía</h3>
                <p data-i18n="quotes.emptyMessage">Comienza añadiendo tu primera cita memorable</p>
            </div>
        `;

        // Re-cachear refs de elementos en main.js (usa elements.* internamente)
        window._recacheQuotesElements?.();
        // Re-registrar listeners de vista con los nuevos elementos
        window.setupViewListeners?.();
    }
}
