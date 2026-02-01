/**
 * Main Application Entry Point
 * Single Responsibility Principle: Orchestrates components and services
 * Dependency Inversion Principle: Depends on abstractions (services)
 */

// Services
import { authService } from './services/AuthService.js';
import { quoteService } from './services/QuoteService.js';
import { collectionService } from './services/CollectionService.js';
import { topicService } from './services/TopicService.js';
import { insightService } from './services/InsightService.js';
import { transcriptService } from './services/TranscriptService.js';

// Components
import { renderQuoteList } from './components/QuoteCard.js';
import { updateCompareView, filterForCompare } from './components/CompareView.js';
import { updateAllCollectionSelects } from './components/CollectionSelect.js';

// Utils
import { toast } from './utils/toast.js';
import { confirmModal } from './utils/confirmModal.js';
import { i18n, t } from './utils/i18n.js';
import { escapeHtml } from './utils/helpers.js';

// ============================================================================
// Application State
// ============================================================================
const state = {
    quotes: [],
    collections: [],
    topics: [],
    insights: [],
    currentView: 'list', // list, compare
    currentSection: 'quotes', // wiki, insights, quotes
    currentInsightId: null, // Currently viewing insight
    insightStatusFilter: '',
    authMode: 'login'
};

// State for reply modal
let replyParentId = null;

// ============================================================================
// DOM Elements
// ============================================================================
const elements = {
    // Screens
    loadingScreen: document.getElementById('loadingScreen'),
    authScreen: document.getElementById('authScreen'),
    mainApp: document.getElementById('mainApp'),
    verifyScreen: document.getElementById('verifyScreen'),

    // Auth
    googleBtn: document.getElementById('googleSignIn'),
    authError: document.getElementById('authError'),
    authTabs: document.querySelectorAll('.auth-tab'),
    authForm: document.getElementById('authForm'),
    authSubmit: document.getElementById('authSubmit'),
    displayNameGroup: document.getElementById('displayNameGroup'),
    passwordHint: document.getElementById('passwordHint'),
    resendVerification: document.getElementById('resendVerification'),
    verifyEmail: document.getElementById('verifyEmail'),
    userEmail: document.getElementById('userEmail'),
    useAnotherAccount: document.getElementById('useAnotherAccount'),
    logoutBtn: document.getElementById('logoutBtn'),

    // Quotes
    quotesList: document.getElementById('quotesList'),
    emptyState: document.getElementById('emptyState'),
    totalQuotes: document.getElementById('totalQuotes'),

    // Navigation Sidebar
    navSidebar: document.getElementById('navSidebar'),
    sidebarToggle: document.getElementById('sidebarToggle'),
    sidebarOpenBtn: document.getElementById('sidebarOpenBtn'),

    // Main navigation tabs
    navWikiTab: document.getElementById('navWikiTab'),
    navInsightsTab: document.getElementById('navInsightsTab'),
    navQuotesTab: document.getElementById('navQuotesTab'),

    // View content containers
    navWikiContent: document.getElementById('navWikiContent'),
    navInsightsContent: document.getElementById('navInsightsContent'),
    navQuotesContent: document.getElementById('navQuotesContent'),

    // Wiki/Topics elements
    sidebarTopics: document.getElementById('sidebarTopics'),
    totalTopics: document.getElementById('totalTopics'),
    navNewTopicBtn: document.getElementById('navNewTopicBtn'),

    // Insights elements
    allInsightsHeader: document.getElementById('allInsightsHeader'),
    totalInsights: document.getElementById('totalInsights'),
    insightsDraftBadge: document.getElementById('insightsDraftBadge'),
    insightsDraftCount: document.getElementById('insightsDraftCount'),
    insightsReviewedCount: document.getElementById('insightsReviewedCount'),
    insightsIntegratedCount: document.getElementById('insightsIntegratedCount'),
    insightStatusHeader: document.getElementById('insightStatusHeader'),
    sidebarInsightStatus: document.getElementById('sidebarInsightStatus'),
    navNewInsightBtn: document.getElementById('navNewInsightBtn'),

    // Quotes sidebar elements
    sidebarCollections: document.getElementById('sidebarCollections'),
    sidebarTags: document.getElementById('sidebarTags'),
    collectionsHeader: document.getElementById('collectionsHeader'),
    tagsHeader: document.getElementById('tagsHeader'),
    navNewCollectionBtn: document.getElementById('navNewCollectionBtn'),

    // Compare View
    quotesCompare: document.getElementById('quotesCompare'),
    quotesFavor: document.getElementById('quotesFavor'),
    quotesAgainst: document.getElementById('quotesAgainst'),

    // Filters
    searchInput: document.getElementById('searchInput'),
    filterCollection: document.getElementById('filterCollection'),
    filterStance: document.getElementById('filterStance'),
    filterFavorite: document.getElementById('filterFavorite'),
    sortBy: document.getElementById('sortBy'),

    // Custom selects
    stanceSelect: document.getElementById('stanceSelect'),
    favoriteSelect: document.getElementById('favoriteSelect'),
    sortSelect: document.getElementById('sortSelect'),

    // View controls
    viewList: document.getElementById('viewList'),
    viewCompare: document.getElementById('viewCompare'),

    // Modals
    modal: document.getElementById('modal'),
    modalTitle: document.getElementById('modalTitle'),
    quoteForm: document.getElementById('quoteForm'),
    quoteCollection: document.getElementById('quoteCollection'),
    saveBtn: document.getElementById('saveBtn'),
    collectionModal: document.getElementById('collectionModal'),
    newCollectionName: document.getElementById('newCollectionName'),
    newQuoteBtn: document.getElementById('newQuoteBtn'),
    cancelModalBtn: document.getElementById('cancelModalBtn'),
    newCollectionBtn: document.getElementById('newCollectionBtn'),
    cancelCollectionBtn: document.getElementById('cancelCollectionBtn'),
    createCollectionBtn: document.getElementById('createCollectionBtn'),

    // Insight Modal
    insightModal: document.getElementById('insightModal'),
    insightModalTitle: document.getElementById('insightModalTitle'),
    insightForm: document.getElementById('insightForm'),
    insightId: document.getElementById('insightId'),
    insightSourceUrl: document.getElementById('insightSourceUrl'),
    insightNotes: document.getElementById('insightNotes'),
    insightTags: document.getElementById('insightTags'),
    insightLinkedTopic: document.getElementById('insightLinkedTopic'),
    fetchMetadataBtn: document.getElementById('fetchMetadataBtn'),
    sourcePreview: document.getElementById('sourcePreview'),
    sourceThumbnail: document.getElementById('sourceThumbnail'),
    sourceTypeBadge: document.getElementById('sourceTypeBadge'),
    sourceTitle: document.getElementById('sourceTitle'),
    sourceChannel: document.getElementById('sourceChannel'),
    cancelInsightBtn: document.getElementById('cancelInsightBtn'),

    // Topic Modal
    topicModal: document.getElementById('topicModal'),
    topicModalTitle: document.getElementById('topicModalTitle'),
    topicForm: document.getElementById('topicForm'),
    topicId: document.getElementById('topicId'),
    topicName: document.getElementById('topicName'),
    topicDescription: document.getElementById('topicDescription'),
    topicIconValue: document.getElementById('topicIconValue'),
    iconPicker: document.getElementById('iconPicker'),
    cancelTopicBtn: document.getElementById('cancelTopicBtn'),

    // Language
    languageSelector: document.getElementById('languageSelector'),
    languageBtn: document.getElementById('languageBtn'),
    languageDropdown: document.getElementById('languageDropdown'),
    currentLang: document.getElementById('currentLang'),

    // Mobile elements
    mobileSearchInput: document.getElementById('mobileSearchInput'),
    mobileMenuBtn: document.getElementById('mobileMenuBtn'),
    mobileMenu: document.getElementById('mobileMenu'),
    userEmailMobile: document.getElementById('userEmailMobile'),
    totalQuotesMobile: document.getElementById('totalQuotesMobile'),
    logoutBtnMobile: document.getElementById('logoutBtnMobile'),
    filterToggleBtn: document.getElementById('filterToggleBtn'),
    filtersPanel: document.getElementById('filtersPanel'),
    filtersOverlay: document.getElementById('filtersOverlay'),
    closeFiltersBtn: document.getElementById('closeFiltersBtn'),
    clearFiltersBtn: document.getElementById('clearFiltersBtn'),
    applyFiltersBtn: document.getElementById('applyFiltersBtn'),
    filterBadge: document.getElementById('filterBadge'),
    mobileFab: document.getElementById('mobileFab'),
    languageSelectorMobile: document.getElementById('languageSelectorMobile'),
    languageBtnMobile: document.getElementById('languageBtnMobile'),
    languageDropdownMobile: document.getElementById('languageDropdownMobile'),
    currentLangMobile: document.getElementById('currentLangMobile')
};

// ============================================================================
// Initialization
// ============================================================================
function init() {
    // Initialize i18n first
    i18n.init();
    updateLanguageSelector(i18n.getLocale());

    toast.init('toastContainer');
    confirmModal.init();
    setupAuthListeners();
    setupQuoteListeners();
    setupFilterListeners();
    setupViewListeners();
    setupModalListeners();
    setupLanguageListener();
    setupMobileListeners();
    initMobileFiltersPanel();
    setupInsightModalListeners();
    setupTopicModalListeners();

    // Auth state observer
    authService.onAuthStateChange(handleAuthStateChange);

    // Listen for locale changes to re-render dynamic content
    i18n.onLocaleChange(() => {
        // Re-render current section
        switch (state.currentSection) {
            case 'wiki':
                renderWikiView();
                break;
            case 'insights':
                renderInsightsView();
                break;
            case 'quotes':
            default:
                renderQuotes();
                break;
        }
        // Update sidebar elements
        renderSidebarCollections();
        renderSidebarTags();
        renderSidebarTopics();
        updateInsightsCounts();
        updateStats();
        // Update filters and selects
        updateCollectionSelects();
        updateMobileFiltersPanel();
    });
}

// ============================================================================
// Language Handler
// ============================================================================
const languageConfig = {
    es: {
        label: 'ES',
        flagSvg: '<path fill="#c60b1e" d="M0 0h640v480H0z"/><path fill="#ffc400" d="M0 120h640v240H0z"/>'
    },
    en: {
        label: 'EN',
        flagSvg: '<path fill="#012169" d="M0 0h640v480H0z"/><path fill="#FFF" d="m75 0 244 181L562 0h78v62L400 241l240 178v61h-80L320 301 81 480H0v-60l239-178L0 64V0h75z"/><path fill="#C8102E" d="m424 281 216 159v40L369 281h55zm-184 20 6 35L54 480H0l240-179zM640 0v3L391 191l2-44L590 0h50zM0 0l239 176h-60L0 42V0z"/><path fill="#FFF" d="M241 0v480h160V0H241zM0 160v160h640V160H0z"/><path fill="#C8102E" d="M0 193v96h640v-96H0zM273 0v480h96V0h-96z"/>'
    }
};

function setupLanguageListener() {
    // Toggle dropdown
    elements.languageBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        elements.languageSelector.classList.toggle('open');
    });

    // Language options
    elements.languageDropdown.querySelectorAll('.language-option').forEach(option => {
        option.addEventListener('click', () => {
            const lang = option.dataset.lang;
            i18n.setLocale(lang);
            updateLanguageSelector(lang);
            elements.languageSelector.classList.remove('open');
        });
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!elements.languageSelector.contains(e.target)) {
            elements.languageSelector.classList.remove('open');
        }
    });
}

function updateLanguageSelector(locale) {
    const config = languageConfig[locale] || languageConfig.es;
    elements.currentLang.textContent = config.label;
    if (elements.currentLangMobile) {
        elements.currentLangMobile.textContent = config.label;
    }

    // Update active state in dropdown (desktop)
    elements.languageDropdown.querySelectorAll('.language-option').forEach(option => {
        option.classList.toggle('active', option.dataset.lang === locale);
    });

    // Update active state in dropdown (mobile)
    if (elements.languageDropdownMobile) {
        elements.languageDropdownMobile.querySelectorAll('.language-option').forEach(option => {
            option.classList.toggle('active', option.dataset.lang === locale);
        });
    }
}

// ============================================================================
// Auth Handlers
// ============================================================================
function handleAuthStateChange(user) {
    elements.loadingScreen.classList.add('hidden');

    if (user) {
        if (authService.needsEmailVerification(user)) {
            showVerifyScreen(user);
            return;
        }

        showMainApp(user);
        subscribeToData(user.uid);
    } else {
        showAuthScreen();
        unsubscribeFromData();
    }
}

function showAuthScreen() {
    elements.authScreen.classList.remove('hidden');
    elements.verifyScreen.classList.add('hidden');
    elements.mainApp.classList.add('hidden');
}

function showVerifyScreen(user) {
    elements.authScreen.classList.add('hidden');
    elements.mainApp.classList.add('hidden');
    elements.verifyScreen.classList.remove('hidden');
    elements.verifyEmail.textContent = user.email;
}

function showMainApp(user) {
    elements.authScreen.classList.add('hidden');
    elements.verifyScreen.classList.add('hidden');
    elements.mainApp.classList.remove('hidden');
    const displayName = authService.getDisplayName(user);
    elements.userEmail.textContent = displayName;
    elements.userEmailMobile.textContent = displayName;
}

function setupAuthListeners() {
    // Auth tabs
    elements.authTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            elements.authTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            state.authMode = tab.dataset.tab;

            const isRegister = state.authMode === 'register';
            elements.authSubmit.textContent = isRegister ? t('auth.createAccount') : t('auth.login');
            elements.displayNameGroup.classList.toggle('hidden', !isRegister);
            elements.passwordHint.classList.toggle('hidden', !isRegister);
            elements.authError.classList.remove('show');
        });
    });

    // Google Sign In
    elements.googleBtn.addEventListener('click', async () => {
        elements.googleBtn.disabled = true;
        elements.authError.classList.remove('show');

        try {
            await authService.signInWithGoogle();
        } catch (error) {
            showAuthError(error.code);
        }

        elements.googleBtn.disabled = false;
    });

    // Email/Password Auth
    elements.authForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = document.getElementById('authEmail').value;
        const password = document.getElementById('authPassword').value;
        const displayName = document.getElementById('authDisplayName')?.value;

        elements.authSubmit.disabled = true;
        elements.authError.classList.remove('show');

        try {
            if (state.authMode === 'login') {
                const user = await authService.signInWithEmail(email, password);
                if (authService.needsEmailVerification(user)) {
                    showVerifyScreen(user);
                }
            } else {
                await authService.registerWithEmail(email, password, displayName);
            }
        } catch (error) {
            showAuthError(error.code);
        }

        elements.authSubmit.disabled = false;
    });

    // Resend verification
    elements.resendVerification.addEventListener('click', async () => {
        elements.resendVerification.disabled = true;
        elements.resendVerification.textContent = t('auth.sending');

        try {
            await authService.resendVerificationEmail();
            elements.resendVerification.textContent = t('auth.emailSent');
        } catch (error) {
            elements.resendVerification.textContent = t('auth.sendError');
        }

        setTimeout(() => {
            elements.resendVerification.textContent = t('auth.resendEmail');
            elements.resendVerification.disabled = false;
        }, 3000);
    });

    // Use another account
    elements.useAnotherAccount.addEventListener('click', logout);

    // Logout button
    elements.logoutBtn.addEventListener('click', logout);
}

function showAuthError(errorCode) {
    elements.authError.textContent = authService.getErrorMessage(errorCode);
    elements.authError.classList.add('show');
}

// ============================================================================
// Data Subscriptions
// ============================================================================
function subscribeToData(userId) {
    quoteService.subscribe(userId, (quotes) => {
        state.quotes = quotes;
        renderQuotes();
        updateStats();
    });

    collectionService.subscribe(userId, (collections) => {
        state.collections = collections;
        updateCollectionSelects();
        renderSidebarCollections();
    });

    topicService.subscribe(userId, (topics) => {
        state.topics = topics;
        renderSidebarTopics();
        if (state.currentSection === 'wiki') {
            renderWikiView();
        }
    });

    insightService.subscribe(userId, (insights) => {
        state.insights = insights;
        updateInsightsCounts();

        // Only render the list view if we're NOT viewing a specific insight detail
        // This prevents the detail view from being replaced when highlights are updated
        if (state.currentSection === 'insights' && !state.currentInsightId) {
            renderInsightsView();
        }
    });
}

function unsubscribeFromData() {
    quoteService.unsubscribeAll();
    collectionService.unsubscribeAll();
    topicService.unsubscribeAll();
    insightService.unsubscribeAll();
}

// ============================================================================
// Quote Rendering
// ============================================================================
function renderQuotes() {
    if (state.currentView === 'compare') {
        renderCompareViewMode();
        return;
    }

    renderListView();
}

function renderListView() {
    const filters = getFilters();
    // Filter root quotes only (replies are nested)
    const rootQuotes = quoteService.getRootQuotes(state.quotes);
    let filtered = quoteService.filterQuotes(rootQuotes, filters);
    filtered = quoteService.sortQuotes(filtered, filters.sortBy);

    if (filtered.length === 0) {
        elements.quotesList.innerHTML = '';
        elements.emptyState.classList.remove('hidden');
        return;
    }

    // Build tree structure with replies
    const quotesWithReplies = filtered.map(quote =>
        quoteService.buildQuoteNode(quote, state.quotes)
    );

    elements.emptyState.classList.add('hidden');
    elements.quotesList.innerHTML = renderQuoteList(quotesWithReplies, state.collections);
}

function renderCompareViewMode() {
    const filters = getFilters();
    let filtered = quoteService.filterQuotes(state.quotes, {
        searchTerm: filters.searchTerm,
        collectionId: filters.collectionId
    });
    filtered = filterForCompare(filtered);

    updateCompareView(filtered, {
        favorEl: elements.quotesFavor,
        againstEl: elements.quotesAgainst
    });
}

function getFilters() {
    return {
        searchTerm: elements.searchInput.value.toLowerCase(),
        collectionId: elements.filterCollection.value,
        stance: elements.filterStance.value,
        favoriteOnly: elements.filterFavorite.value === 'true',
        sortBy: elements.sortBy.value
    };
}

function updateStats() {
    elements.totalQuotes.textContent = state.quotes.length;
    if (elements.totalQuotesMobile) {
        elements.totalQuotesMobile.textContent = state.quotes.length;
    }

    // Update navigation sidebar
    renderNavSidebar();
}

function renderNavSidebar() {
    renderSidebarCollections();
    renderSidebarTags();
    setupNavSidebarListeners();
}

function renderSidebarCollections() {
    if (!elements.sidebarCollections) return;

    if (state.collections.length === 0) {
        elements.sidebarCollections.innerHTML = `<span class="nav-empty">${t('sidebar.noCollections')}</span>`;
        return;
    }

    // Count quotes per collection
    const collectionCounts = {};
    state.quotes.forEach(quote => {
        if (quote.collectionId) {
            collectionCounts[quote.collectionId] = (collectionCounts[quote.collectionId] || 0) + 1;
        }
    });

    const currentFilter = elements.filterCollection.value;

    const html = state.collections.map(collection => {
        const count = collectionCounts[collection.id] || 0;
        const isActive = currentFilter === collection.id;
        return `
            <button class="nav-item${isActive ? ' active' : ''}" data-collection-id="${collection.id}">
                <span>${escapeHtml(collection.name)}</span>
                <span class="item-count">${count}</span>
            </button>
        `;
    }).join('');

    elements.sidebarCollections.innerHTML = html;

    // Add click handlers
    elements.sidebarCollections.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            const collectionId = item.dataset.collectionId;
            const currentValue = elements.filterCollection.value;

            // Toggle filter
            if (currentValue === collectionId) {
                elements.filterCollection.value = '';
            } else {
                elements.filterCollection.value = collectionId;
            }

            renderQuotes();
            renderSidebarCollections();
        });
    });
}

function renderSidebarTags() {
    if (!elements.sidebarTags) return;

    // Collect all tags and count occurrences
    const tagCounts = {};
    state.quotes.forEach(quote => {
        if (quote.tags && Array.isArray(quote.tags)) {
            quote.tags.forEach(tag => {
                const normalizedTag = tag.toLowerCase().trim();
                if (normalizedTag) {
                    tagCounts[normalizedTag] = (tagCounts[normalizedTag] || 0) + 1;
                }
            });
        }
    });

    // Sort by count and take top 10
    const sortedTags = Object.entries(tagCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

    if (sortedTags.length === 0) {
        elements.sidebarTags.innerHTML = `<span class="nav-empty">${t('sidebar.noTags')}</span>`;
        return;
    }

    const html = sortedTags.map(([tag, count]) => `
        <button class="nav-tag" data-tag="${escapeHtml(tag)}" title="${count} ${t('sidebar.quotes')}">
            ${escapeHtml(tag)}
        </button>
    `).join('');

    elements.sidebarTags.innerHTML = html;

    // Add click handlers to filter by tag
    elements.sidebarTags.querySelectorAll('.nav-tag').forEach(tagEl => {
        tagEl.addEventListener('click', () => {
            const tag = tagEl.dataset.tag;
            const currentSearch = elements.searchInput.value;

            if (currentSearch === tag) {
                elements.searchInput.value = '';
                tagEl.classList.remove('active');
            } else {
                // Remove active from all tags
                elements.sidebarTags.querySelectorAll('.nav-tag').forEach(t => t.classList.remove('active'));
                elements.searchInput.value = tag;
                tagEl.classList.add('active');
            }
            renderQuotes();
        });
    });
}

function renderSidebarTopics() {
    if (!elements.sidebarTopics) return;

    // Update total count
    if (elements.totalTopics) {
        elements.totalTopics.textContent = state.topics.length;
    }

    if (state.topics.length === 0) {
        elements.sidebarTopics.innerHTML = `<span class="nav-empty">${t('sidebar.noTopics')}</span>`;
        return;
    }

    const html = state.topics.map(topic => `
        <button class="nav-item" data-topic-id="${topic.id}">
            <span class="topic-icon-small">${topic.icon || '📁'}</span>
            <span class="topic-name">${escapeHtml(topic.name)}</span>
            <span class="topic-status-dot ${topic.status}"></span>
        </button>
    `).join('');

    elements.sidebarTopics.innerHTML = html;

    // Add click handlers
    elements.sidebarTopics.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            const topicId = item.dataset.topicId;
            openTopicView(topicId);
        });
    });
}

function openTopicView(topicId) {
    const topic = state.topics.find(t => t.id === topicId);
    if (!topic) return;

    // For now, show a detail view - full wiki view will be Phase 3
    const contentBody = document.querySelector('.content-body');
    if (!contentBody) return;

    const linkedQuotes = state.quotes.filter(q => q.topicId === topicId);

    contentBody.innerHTML = `
        <div class="topic-detail-view">
            <div class="topic-detail-header">
                <button class="btn btn-secondary btn-back" onclick="switchSection('wiki')">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="15 18 9 12 15 6"></polyline>
                    </svg>
                    ${t('sidebar.topics')}
                </button>
                <div class="topic-detail-title">
                    <span class="topic-icon-large">${topic.icon || '📁'}</span>
                    <div>
                        <h1>${escapeHtml(topic.name)}</h1>
                        <span class="topic-status ${topic.status}">${topic.status === 'consolidated' ? t('topics.consolidated') : t('topics.inProgress')}</span>
                    </div>
                </div>
                <div class="topic-detail-actions">
                    <button class="btn btn-secondary" onclick="editTopic('${topic.id}')">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                        ${t('quotes.edit')}
                    </button>
                </div>
            </div>
            ${topic.description ? `<p class="topic-detail-description">${escapeHtml(topic.description)}</p>` : ''}

            <div class="topic-sections">
                <div class="topic-section">
                    <h2>${t('topics.sections.quotes')} (${linkedQuotes.length})</h2>
                    ${linkedQuotes.length > 0 ? `
                        <div class="topic-quotes-list">
                            ${linkedQuotes.map(q => `
                                <div class="topic-quote-item">
                                    <blockquote>"${escapeHtml(q.text)}"</blockquote>
                                    <cite>— ${escapeHtml(q.author)}</cite>
                                </div>
                            `).join('')}
                        </div>
                    ` : `<p class="empty-section">${t('quotes.noQuotes')}</p>`}
                </div>
            </div>

            <p class="coming-soon-notice">Las secciones de contexto histórico, argumentos, datos y fuentes estarán disponibles próximamente.</p>
        </div>
    `;
}

function openInsightView(insightId) {
    const insight = state.insights.find(i => i.id === insightId);
    if (!insight) return;

    // Store current insight ID for later reference
    state.currentInsightId = insightId;

    const contentBody = document.querySelector('.content-body');
    if (!contentBody) return;

    const linkedTopic = insight.linkedTopicId ? state.topics.find(t => t.id === insight.linkedTopicId) : null;
    const videoId = insightService.extractYouTubeVideoId(insight.sourceUrl);
    const isYouTube = insight.sourceType === 'youtube' && videoId;

    contentBody.innerHTML = `
        <div class="insight-detail-view">
            <div class="insight-detail-header">
                <button class="btn btn-secondary btn-back" onclick="switchSection('insights')">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="15 18 9 12 15 6"></polyline>
                    </svg>
                </button>
                <div class="insight-detail-title">
                    <h1>${escapeHtml(insight.sourceTitle || 'Sin título')}</h1>
                    <div class="insight-detail-meta">
                        <span class="insight-status-badge ${insight.status}">${t('insights.' + insight.status)}</span>
                        ${linkedTopic ? `<span class="insight-linked-topic">${linkedTopic.icon} ${escapeHtml(linkedTopic.name)}</span>` : ''}
                    </div>
                </div>
                <div class="insight-detail-actions">
                    ${insight.sourceUrl ? `
                        <a href="${escapeHtml(insight.sourceUrl)}" target="_blank" rel="noopener" class="btn btn-secondary">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                                <polyline points="15 3 21 3 21 9"></polyline>
                                <line x1="10" y1="14" x2="21" y2="3"></line>
                            </svg>
                            ${isYouTube ? 'Abrir en YouTube' : 'Abrir fuente'}
                        </a>
                    ` : ''}
                    <button class="btn btn-secondary" onclick="editInsight('${insight.id}')">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                        Editar info
                    </button>
                </div>
            </div>

            <div class="insight-detail-content" id="insightDetailContent">
                ${isYouTube ? `
                    <div class="insight-video-section" id="insightVideoSection">
                        <div class="video-container">
                            <iframe
                                src="https://www.youtube.com/embed/${videoId}"
                                frameborder="0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowfullscreen>
                            </iframe>
                        </div>
                        <div class="video-notes-section">
                            <div class="video-notes-header">
                                <h3>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                        <polyline points="14 2 14 8 20 8"></polyline>
                                        <line x1="16" y1="13" x2="8" y2="13"></line>
                                        <line x1="16" y1="17" x2="8" y2="17"></line>
                                    </svg>
                                    Mis notas
                                </h3>
                                <span class="notes-count">${(insight.timestampedNotes || []).length} notas</span>
                            </div>

                            <!-- Quick note input -->
                            <div class="quick-note-input">
                                <div class="quick-note-type-selector">
                                    <button class="note-type-btn active" data-type="key" title="Punto clave">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                                        </svg>
                                    </button>
                                    <button class="note-type-btn" data-type="question" title="Pregunta">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <circle cx="12" cy="12" r="10"></circle>
                                            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                                            <line x1="12" y1="17" x2="12.01" y2="17"></line>
                                        </svg>
                                    </button>
                                    <button class="note-type-btn" data-type="idea" title="Idea">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <line x1="9" y1="18" x2="15" y2="18"></line>
                                            <line x1="10" y1="22" x2="14" y2="22"></line>
                                            <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14"></path>
                                        </svg>
                                    </button>
                                    <button class="note-type-btn" data-type="todo" title="Pendiente">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                                        </svg>
                                    </button>
                                </div>
                                <div class="quick-note-field">
                                    <input
                                        type="text"
                                        id="quickNoteInput"
                                        placeholder="Añade una nota... (Enter para guardar)"
                                        data-insight-id="${insight.id}"
                                        data-video-id="${videoId}"
                                    />
                                    <button class="btn-timestamp" onclick="insertTimestampNote('${insight.id}', '${videoId}')" title="Añadir con timestamp actual">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <circle cx="12" cy="12" r="10"></circle>
                                            <polyline points="12 6 12 12 16 14"></polyline>
                                        </svg>
                                    </button>
                                </div>
                            </div>

                            <!-- Timestamped notes list -->
                            <div class="timestamped-notes-list" id="timestampedNotesList">
                                ${renderTimestampedNotes(insight.timestampedNotes || [], insight.id, videoId)}
                            </div>

                            <!-- Collapsible free notes -->
                            <details class="free-notes-section">
                                <summary>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <line x1="21" y1="10" x2="3" y2="10"></line>
                                        <line x1="21" y1="6" x2="3" y2="6"></line>
                                        <line x1="21" y1="14" x2="3" y2="14"></line>
                                        <line x1="21" y1="18" x2="3" y2="18"></line>
                                    </svg>
                                    Notas libres
                                </summary>
                                <div class="free-notes-content">
                                    <textarea
                                        id="insightNotesEditor"
                                        class="video-notes-textarea"
                                        placeholder="Espacio para notas más extensas, resúmenes o reflexiones..."
                                        data-insight-id="${insight.id}"
                                    >${escapeHtml(insight.structuredNotes || insight.rawNotes || '')}</textarea>
                                    <button class="btn btn-secondary btn-sm" onclick="saveInsightNotes('${insight.id}')">
                                        Guardar notas libres
                                    </button>
                                </div>
                            </details>
                        </div>
                    </div>
                    <div class="resize-handle" id="resizeHandle">
                        <div class="resize-handle-line"></div>
                    </div>
                ` : ''}

                <div class="insight-workspace" id="insightWorkspace">
                    <div class="insight-tabs">
                        <button class="insight-tab active" data-tab="transcript">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                                <line x1="9" y1="9" x2="15" y2="9"></line>
                                <line x1="9" y1="13" x2="15" y2="13"></line>
                                <line x1="9" y1="17" x2="12" y2="17"></line>
                            </svg>
                            Transcripción
                        </button>
                        <button class="insight-tab" data-tab="highlights">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
                                <path d="M2 17l10 5 10-5"></path>
                                <path d="M2 12l10 5 10-5"></path>
                            </svg>
                            Destacados (${(insight.highlights || []).length})
                        </button>
                    </div>

                    <div class="insight-tab-content" id="insightTabContent">
                        <!-- Transcript tab (default) -->
                        <div class="tab-pane active" data-pane="transcript">
                            <div class="transcript-container">
                                ${insight.transcript ? `
                                    <div class="transcript-toolbar">
                                        <div class="transcript-toolbar-left">
                                            <span class="transcript-hint">
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                                    <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
                                                    <path d="M2 17l10 5 10-5"></path>
                                                </svg>
                                                Selecciona texto para destacarlo
                                            </span>
                                        </div>
                                        <div class="transcript-toolbar-right">
                                            ${isYouTube ? `
                                                <button class="btn btn-secondary btn-sm" onclick="fetchYouTubeTranscript('${insight.id}', '${videoId}')" title="Recargar transcripción">
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                                        <polyline points="23 4 23 10 17 10"></polyline>
                                                        <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
                                                    </svg>
                                                </button>
                                            ` : ''}
                                            <button class="btn btn-secondary btn-sm" onclick="clearTranscript('${insight.id}')">
                                                Borrar
                                            </button>
                                        </div>
                                    </div>
                                    <div class="transcript-article" id="transcriptText">
                                        ${renderTranscriptArticle(insight)}
                                    </div>
                                ` : `
                                    <div class="transcript-empty">
                                        <div class="transcript-empty-icon">
                                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                                                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                                                <line x1="9" y1="9" x2="15" y2="9"></line>
                                                <line x1="9" y1="13" x2="15" y2="13"></line>
                                                <line x1="9" y1="17" x2="12" y2="17"></line>
                                            </svg>
                                        </div>
                                        <h3>No hay transcripción disponible</h3>
                                        <p class="transcript-hint">Obtén la transcripción automáticamente o pégala manualmente.</p>
                                        <div class="transcript-actions">
                                            ${isYouTube ? `
                                                <button class="btn btn-primary" onclick="fetchYouTubeTranscript('${insight.id}', '${videoId}')">
                                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                                        <polyline points="23 4 23 10 17 10"></polyline>
                                                        <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
                                                    </svg>
                                                    Obtener de YouTube
                                                </button>
                                            ` : ''}
                                            <button class="btn btn-secondary" onclick="showTranscriptInput()">
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                                    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
                                                    <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
                                                </svg>
                                                Pegar manualmente
                                            </button>
                                        </div>
                                        <div class="transcript-input-container hidden" id="transcriptInputContainer">
                                            <textarea id="transcriptInput" class="transcript-input" placeholder="Pega aquí la transcripción del video..."></textarea>
                                            <div class="transcript-input-actions">
                                                <button class="btn btn-secondary btn-sm" onclick="hideTranscriptInput()">Cancelar</button>
                                                <button class="btn btn-primary btn-sm" onclick="saveTranscript('${insight.id}')">Guardar transcripción</button>
                                            </div>
                                        </div>
                                    </div>
                                `}
                            </div>
                        </div>

                        <!-- Highlights tab -->
                        <div class="tab-pane" data-pane="highlights">
                            <div class="highlights-container">
                                ${(insight.highlights || []).length > 0 ? `
                                    <div class="highlights-list">
                                        ${(insight.highlights || []).map(h => `
                                            <div class="highlight-item" data-highlight-id="${h.id}">
                                                <div class="highlight-color" style="background: ${getHighlightColor(h.color)}"></div>
                                                <div class="highlight-content">
                                                    <p class="highlight-text">"${escapeHtml(h.text)}"</p>
                                                    ${h.note ? `<p class="highlight-note">${escapeHtml(h.note)}</p>` : ''}
                                                    ${h.timestamp ? `<span class="highlight-timestamp">${h.timestamp}</span>` : ''}
                                                </div>
                                                <div class="highlight-actions">
                                                    <button class="btn-icon" onclick="convertHighlightToQuote('${insight.id}', '${h.id}')" title="Convertir a cita">
                                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                                                        </svg>
                                                    </button>
                                                    <button class="btn-icon btn-danger" onclick="removeHighlight('${insight.id}', '${h.id}')" title="Eliminar">
                                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                                            <polyline points="3 6 5 6 21 6"></polyline>
                                                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                                        </svg>
                                                    </button>
                                                </div>
                                            </div>
                                        `).join('')}
                                    </div>
                                ` : `
                                    <div class="highlights-empty">
                                        <p>No hay texto destacado aún.</p>
                                        <p class="highlight-hint">Ve a la pestaña de Transcripción y selecciona texto para destacarlo.</p>
                                    </div>
                                `}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Setup tab switching
    setupInsightDetailTabs();

    // Setup transcript text selection for highlighting
    setupTranscriptHighlighting(insight.id);

    // Setup resize handle for video/workspace split
    setupResizeHandle();

    // Setup quick note input
    setupQuickNoteInput();
}

function setupInsightDetailTabs() {
    const tabs = document.querySelectorAll('.insight-tab');
    const panes = document.querySelectorAll('.tab-pane');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetPane = tab.dataset.tab;

            // Update tabs
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            // Update panes
            panes.forEach(p => {
                p.classList.toggle('active', p.dataset.pane === targetPane);
            });
        });
    });
}

function setupResizeHandle() {
    const container = document.getElementById('insightDetailContent');
    const handle = document.getElementById('resizeHandle');
    const videoSection = document.getElementById('insightVideoSection');

    if (!container || !handle || !videoSection) return;

    let isResizing = false;
    let startX = 0;
    let startWidth = 0;

    handle.addEventListener('mousedown', (e) => {
        isResizing = true;
        startX = e.clientX;
        startWidth = videoSection.offsetWidth;
        container.classList.add('resizing');
        handle.classList.add('dragging');
        e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
        if (!isResizing) return;

        const containerRect = container.getBoundingClientRect();
        const deltaX = e.clientX - startX;
        const newWidth = startWidth + deltaX;

        // Calculate percentage
        const containerWidth = containerRect.width;
        const minWidth = 300;
        const maxWidth = containerWidth * 0.8;

        if (newWidth >= minWidth && newWidth <= maxWidth) {
            const percentage = (newWidth / containerWidth) * 100;
            videoSection.style.flex = `0 0 ${percentage}%`;
            videoSection.style.maxWidth = `${percentage}%`;
        }
    });

    document.addEventListener('mouseup', () => {
        if (isResizing) {
            isResizing = false;
            container.classList.remove('resizing');
            handle.classList.remove('dragging');
        }
    });

    // Also support touch for tablets
    handle.addEventListener('touchstart', (e) => {
        isResizing = true;
        startX = e.touches[0].clientX;
        startWidth = videoSection.offsetWidth;
        container.classList.add('resizing');
        handle.classList.add('dragging');
        e.preventDefault();
    });

    document.addEventListener('touchmove', (e) => {
        if (!isResizing) return;

        const containerRect = container.getBoundingClientRect();
        const deltaX = e.touches[0].clientX - startX;
        const newWidth = startWidth + deltaX;

        const containerWidth = containerRect.width;
        const minWidth = 300;
        const maxWidth = containerWidth * 0.8;

        if (newWidth >= minWidth && newWidth <= maxWidth) {
            const percentage = (newWidth / containerWidth) * 100;
            videoSection.style.flex = `0 0 ${percentage}%`;
            videoSection.style.maxWidth = `${percentage}%`;
        }
    });

    document.addEventListener('touchend', () => {
        if (isResizing) {
            isResizing = false;
            container.classList.remove('resizing');
            handle.classList.remove('dragging');
        }
    });
}

function setupTranscriptHighlighting(insightId) {
    const transcriptText = document.getElementById('transcriptText');
    if (!transcriptText) return;

    transcriptText.addEventListener('mouseup', () => {
        const selection = window.getSelection();
        const selectedText = selection.toString().trim();

        if (selectedText.length > 5) {
            showHighlightPopup(insightId, selectedText, selection);
        }
    });
}

function showHighlightPopup(insightId, text, selection) {
    // Remove existing popup
    const existingPopup = document.querySelector('.highlight-popup');
    if (existingPopup) existingPopup.remove();

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    const popup = document.createElement('div');
    popup.className = 'highlight-popup';
    popup.innerHTML = `
        <button class="highlight-btn" data-color="yellow" style="background: #fef08a" title="Amarillo"></button>
        <button class="highlight-btn" data-color="green" style="background: #bbf7d0" title="Verde"></button>
        <button class="highlight-btn" data-color="blue" style="background: #bfdbfe" title="Azul"></button>
        <button class="highlight-btn" data-color="pink" style="background: #fbcfe8" title="Rosa"></button>
    `;

    popup.style.position = 'fixed';
    popup.style.left = `${rect.left + rect.width / 2}px`;
    popup.style.top = `${rect.top - 40}px`;
    popup.style.transform = 'translateX(-50%)';

    document.body.appendChild(popup);

    // Handle color selection
    popup.querySelectorAll('.highlight-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const color = btn.dataset.color;
            await addHighlightToInsight(insightId, text, color);
            popup.remove();
            selection.removeAllRanges();
        });
    });

    // Close popup on click outside
    setTimeout(() => {
        document.addEventListener('click', function closePopup(e) {
            if (!popup.contains(e.target)) {
                popup.remove();
                document.removeEventListener('click', closePopup);
            }
        });
    }, 100);
}

async function addHighlightToInsight(insightId, text, color) {
    try {
        await insightService.addHighlight(insightId, { text, color });
        toast.success('Texto destacado');

        // Update local state WITHOUT reloading the entire view (keeps video playing)
        const insight = state.insights.find(i => i.id === insightId);
        if (insight) {
            // Re-fetch to get updated highlights
            const updated = await insightService.getById(insightId);
            Object.assign(insight, updated);

            // Only refresh the transcript and highlights sections (not the video!)
            refreshTranscriptContent(insight);
            refreshHighlightsTab(insight);
            updateHighlightsTabCount(insight.highlights?.length || 0);
        }
    } catch (error) {
        console.error('Error adding highlight:', error);
        toast.error('Error al destacar texto');
    }
}

/**
 * Refresh only the transcript content without reloading the video
 */
function refreshTranscriptContent(insight) {
    const transcriptContainer = document.getElementById('transcriptText');
    if (transcriptContainer) {
        transcriptContainer.innerHTML = renderTranscriptArticle(insight);
        // Re-setup highlighting
        setupTranscriptHighlighting(insight.id);
    }
}

/**
 * Refresh only the highlights tab content
 */
function refreshHighlightsTab(insight) {
    const highlightsPane = document.querySelector('.tab-pane[data-pane="highlights"]');
    if (!highlightsPane) return;

    const highlights = insight.highlights || [];

    if (highlights.length > 0) {
        highlightsPane.innerHTML = `
            <div class="highlights-container">
                <div class="highlights-list">
                    ${highlights.map(h => `
                        <div class="highlight-item" data-highlight-id="${h.id}">
                            <div class="highlight-color" style="background: ${getHighlightColor(h.color)}"></div>
                            <div class="highlight-content">
                                <p class="highlight-text">"${escapeHtml(h.text)}"</p>
                                ${h.note ? `<p class="highlight-note">${escapeHtml(h.note)}</p>` : ''}
                                ${h.timestamp ? `<span class="highlight-timestamp">${h.timestamp}</span>` : ''}
                            </div>
                            <div class="highlight-actions">
                                <button class="btn-icon" onclick="convertHighlightToQuote('${insight.id}', '${h.id}')" title="Convertir a cita">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                                    </svg>
                                </button>
                                <button class="btn-icon btn-danger" onclick="removeHighlight('${insight.id}', '${h.id}')" title="Eliminar">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <polyline points="3 6 5 6 21 6"></polyline>
                                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                    </svg>
                                </button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    } else {
        highlightsPane.innerHTML = `
            <div class="highlights-container">
                <div class="highlights-empty">
                    <p>No hay texto destacado aún.</p>
                    <p class="highlight-hint">Ve a la pestaña de Transcripción y selecciona texto para destacarlo.</p>
                </div>
            </div>
        `;
    }
}

/**
 * Update highlights count in tab
 */
function updateHighlightsTabCount(count) {
    const highlightsTab = document.querySelector('.insight-tab[data-tab="highlights"]');
    if (highlightsTab) {
        highlightsTab.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
                <path d="M2 17l10 5 10-5"></path>
                <path d="M2 12l10 5 10-5"></path>
            </svg>
            Destacados (${count})
        `;
    }
}

async function removeHighlight(insightId, highlightId) {
    try {
        await insightService.removeHighlight(insightId, highlightId);
        toast.success('Destacado eliminado');

        // Update local state WITHOUT reloading the view
        const insight = state.insights.find(i => i.id === insightId);
        if (insight) {
            insight.highlights = (insight.highlights || []).filter(h => h.id !== highlightId);
            refreshTranscriptContent(insight);
            refreshHighlightsTab(insight);
            updateHighlightsTabCount(insight.highlights?.length || 0);
        }
    } catch (error) {
        console.error('Error removing highlight:', error);
        toast.error('Error al eliminar destacado');
    }
}

async function convertHighlightToQuote(insightId, highlightId) {
    const insight = state.insights.find(i => i.id === insightId);
    if (!insight) return;

    const highlight = (insight.highlights || []).find(h => h.id === highlightId);
    if (!highlight) return;

    // Open quote modal pre-filled with highlight data
    replyParentId = null;
    const form = elements.quoteForm;
    form.reset();
    document.getElementById('quoteId').value = '';
    document.getElementById('quoteText').value = highlight.text;
    document.getElementById('quoteAuthor').value = insight.sourceChannel || insight.sourceTitle || '';
    document.getElementById('quoteSource').value = insight.sourceUrl || '';
    document.getElementById('quoteNotes').value = highlight.note || `Extraído de: ${insight.sourceTitle}`;

    // If insight is linked to a topic, try to find a matching collection
    // (for now, leave collection empty)

    elements.modalTitle.textContent = t('quotes.newQuote');
    elements.modal.classList.add('active');
}

// ============================================================================
// Timestamped Notes Functions
// ============================================================================

function renderTimestampedNotes(notes, insightId, videoId) {
    if (!notes || notes.length === 0) {
        return `
            <div class="timestamped-notes-empty">
                <p>No hay notas todavía</p>
                <span>Usa el campo de arriba para añadir notas mientras ves el video</span>
            </div>
        `;
    }

    // Sort by timestamp
    const sortedNotes = [...notes].sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

    return sortedNotes.map(note => {
        const typeIcons = {
            key: `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                  </svg>`,
            question: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"></circle>
                        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                        <line x1="12" y1="17" x2="12.01" y2="17"></line>
                      </svg>`,
            idea: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="9" y1="18" x2="15" y2="18"></line>
                    <line x1="10" y1="22" x2="14" y2="22"></line>
                    <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14"></path>
                   </svg>`,
            todo: note.completed
                ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                    <polyline points="9 11 12 14 22 4"></polyline>
                   </svg>`
                : `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                   </svg>`
        };
        const typeClasses = {
            key: 'note-type-key',
            question: 'note-type-question',
            idea: 'note-type-idea',
            todo: 'note-type-todo'
        };

        const icon = typeIcons[note.type] || `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
        </svg>`;
        const typeClass = typeClasses[note.type] || '';
        const timestamp = note.timestamp !== null ? formatTimestamp(note.timestamp) : null;
        const completedClass = note.type === 'todo' && note.completed ? 'completed' : '';

        return `
            <div class="timestamped-note ${typeClass} ${completedClass}" data-note-id="${note.id}">
                ${timestamp !== null ? `
                    <button class="note-timestamp" onclick="seekToTime(${note.timestamp})" title="Ir a ${timestamp}">
                        ${timestamp}
                    </button>
                ` : ''}
                <span class="note-type-icon" ${note.type === 'todo' ? `onclick="toggleTodoNote('${insightId}', '${note.id}')"` : ''}>${icon}</span>
                <span class="note-text">${escapeHtml(note.text)}</span>
                <button class="note-delete" onclick="deleteTimestampedNote('${insightId}', '${note.id}')" title="Eliminar">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            </div>
        `;
    }).join('');
}

async function insertTimestampNote(insightId, videoId) {
    const input = document.getElementById('quickNoteInput');
    const text = input.value.trim();

    if (!text) {
        input.focus();
        return;
    }

    // Get selected note type
    const activeTypeBtn = document.querySelector('.note-type-btn.active');
    const noteType = activeTypeBtn ? activeTypeBtn.dataset.type : 'key';

    // Get current video time
    let currentTime = 0;
    try {
        const iframe = document.querySelector('.video-container iframe');
        if (iframe) {
            // Try to get time from YouTube API (if available)
            // For now, we'll use 0 as fallback since YouTube iframe API needs special setup
            currentTime = await getYouTubeCurrentTime() || 0;
        }
    } catch (e) {
        console.warn('Could not get video time:', e);
    }

    await addTimestampedNote(insightId, {
        text,
        type: noteType,
        timestamp: currentTime
    });

    input.value = '';
    input.focus();
}

async function addTimestampedNote(insightId, noteData) {
    try {
        const insight = state.insights.find(i => i.id === insightId);
        if (!insight) return;

        const notes = insight.timestampedNotes || [];
        const newNote = {
            id: Date.now().toString(),
            text: noteData.text,
            type: noteData.type || 'key',
            timestamp: noteData.timestamp !== undefined ? noteData.timestamp : null,
            completed: false,
            createdAt: new Date().toISOString()
        };

        notes.push(newNote);

        await insightService.update(insightId, { timestampedNotes: notes });

        // Update local state
        insight.timestampedNotes = notes;

        // Re-render notes list
        refreshTimestampedNotes(insightId);

    } catch (error) {
        console.error('Error adding note:', error);
        showNotification('Error al añadir la nota', 'error');
    }
}

async function deleteTimestampedNote(insightId, noteId) {
    try {
        const insight = state.insights.find(i => i.id === insightId);
        if (!insight) return;

        const notes = (insight.timestampedNotes || []).filter(n => n.id !== noteId);

        await insightService.update(insightId, { timestampedNotes: notes });

        // Update local state
        insight.timestampedNotes = notes;

        // Re-render notes list
        refreshTimestampedNotes(insightId);

    } catch (error) {
        console.error('Error deleting note:', error);
        showNotification('Error al eliminar la nota', 'error');
    }
}

async function toggleTodoNote(insightId, noteId) {
    try {
        const insight = state.insights.find(i => i.id === insightId);
        if (!insight) return;

        const notes = (insight.timestampedNotes || []).map(n =>
            n.id === noteId ? { ...n, completed: !n.completed } : n
        );

        await insightService.update(insightId, { timestampedNotes: notes });

        // Update local state
        insight.timestampedNotes = notes;

        // Re-render notes list
        refreshTimestampedNotes(insightId);

    } catch (error) {
        console.error('Error toggling todo:', error);
    }
}

function refreshTimestampedNotes(insightId) {
    const insight = state.insights.find(i => i.id === insightId);
    if (!insight) return;

    const videoId = insightService.extractYouTubeVideoId(insight.sourceUrl);
    const container = document.getElementById('timestampedNotesList');
    const countEl = document.querySelector('.notes-count');

    if (container) {
        container.innerHTML = renderTimestampedNotes(insight.timestampedNotes || [], insightId, videoId);
    }

    if (countEl) {
        const count = (insight.timestampedNotes || []).length;
        countEl.textContent = `${count} nota${count !== 1 ? 's' : ''}`;
    }
}

function setupQuickNoteInput() {
    const input = document.getElementById('quickNoteInput');
    if (!input) return;

    input.addEventListener('keypress', async (e) => {
        if (e.key === 'Enter') {
            const insightId = input.dataset.insightId;
            const videoId = input.dataset.videoId;
            await insertTimestampNote(insightId, videoId);
        }
    });

    // Note type buttons
    const typeButtons = document.querySelectorAll('.note-type-btn');
    typeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            typeButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            input.focus();
        });
    });
}

// YouTube time helper (simplified - for full support would need YouTube IFrame API)
let ytPlayer = null;

function getYouTubeCurrentTime() {
    return new Promise((resolve) => {
        // If we have access to the YouTube player, get current time
        if (ytPlayer && typeof ytPlayer.getCurrentTime === 'function') {
            resolve(ytPlayer.getCurrentTime());
        } else {
            // Fallback: prompt user or use 0
            resolve(0);
        }
    });
}

function renderTranscriptArticle(insight) {
    const transcript = insight.transcript;
    const highlights = insight.highlights || [];
    const paragraphs = insight.transcriptParagraphs;

    if (!transcript) return '';

    // If we have pre-formatted paragraphs, use them
    if (paragraphs && paragraphs.length > 0) {
        return paragraphs.map(p => {
            const timestamp = formatTimestamp(p.startTime);
            const highlightedText = applyHighlightsToText(p.text, highlights);

            return `
                <div class="transcript-paragraph" data-time="${p.startTime}">
                    <button class="transcript-timestamp" onclick="seekToTime(${p.startTime})" title="Ir a ${timestamp}">
                        ${timestamp}
                    </button>
                    <p>${highlightedText}</p>
                </div>
            `;
        }).join('');
    }

    // Fallback: format raw transcript into paragraphs
    const rawParagraphs = transcript.split(/\n\n+/).filter(p => p.trim());

    if (rawParagraphs.length > 1) {
        return rawParagraphs.map(p => {
            const highlightedText = applyHighlightsToText(p.trim(), highlights);
            return `
                <div class="transcript-paragraph">
                    <p>${highlightedText}</p>
                </div>
            `;
        }).join('');
    }

    // Single block of text - split by sentences for readability
    const sentences = transcript.match(/[^.!?]+[.!?]+/g) || [transcript];
    const chunks = [];
    let currentChunk = '';

    sentences.forEach(sentence => {
        if (currentChunk.length + sentence.length > 400) {
            if (currentChunk) chunks.push(currentChunk.trim());
            currentChunk = sentence;
        } else {
            currentChunk += ' ' + sentence;
        }
    });
    if (currentChunk) chunks.push(currentChunk.trim());

    return chunks.map(chunk => {
        const highlightedText = applyHighlightsToText(chunk, highlights);
        return `
            <div class="transcript-paragraph">
                <p>${highlightedText}</p>
            </div>
        `;
    }).join('');
}

function applyHighlightsToText(text, highlights) {
    if (!highlights || highlights.length === 0) {
        return escapeHtml(text);
    }

    let result = escapeHtml(text);

    // Sort highlights by text length (longest first) to avoid partial replacements
    const sortedHighlights = [...highlights].sort((a, b) => b.text.length - a.text.length);

    sortedHighlights.forEach(h => {
        const escapedText = escapeHtml(h.text);
        const color = getHighlightColor(h.color);
        // Use word boundaries to avoid partial matches
        const regex = new RegExp(escapedText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
        result = result.replace(regex, `<mark style="background: ${color}" data-highlight-id="${h.id}">${escapedText}</mark>`);
    });

    return result;
}

function formatTimestamp(seconds) {
    if (!seconds && seconds !== 0) return '';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hrs > 0) {
        return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function seekToTime(seconds) {
    // Find the YouTube iframe
    const iframe = document.querySelector('.video-container iframe');
    if (iframe && iframe.src.includes('youtube.com')) {
        // Update iframe src to seek to time
        const currentSrc = iframe.src;
        const baseUrl = currentSrc.split('?')[0];
        const videoId = baseUrl.split('/').pop();

        // Use YouTube's embed URL with start parameter
        iframe.src = `https://www.youtube.com/embed/${videoId}?start=${Math.floor(seconds)}&autoplay=1`;

        toast.info(`Saltando a ${formatTimestamp(seconds)}`);
    }
}

function getHighlightColor(color) {
    const colors = {
        yellow: '#fef08a',
        green: '#bbf7d0',
        blue: '#bfdbfe',
        pink: '#fbcfe8'
    };
    return colors[color] || colors.yellow;
}

function showTranscriptInput() {
    const container = document.getElementById('transcriptInputContainer');
    if (container) {
        container.classList.remove('hidden');
    }
}

function hideTranscriptInput() {
    const container = document.getElementById('transcriptInputContainer');
    if (container) {
        container.classList.add('hidden');
    }
}

async function saveTranscript(insightId) {
    const textarea = document.getElementById('transcriptInput');
    if (!textarea) return;

    const transcript = textarea.value.trim();
    if (!transcript) {
        toast.warning('Pega la transcripción primero');
        return;
    }

    try {
        await insightService.saveTranscript(insightId, transcript);
        toast.success('Transcripción guardada');
        // Update local state and refresh
        const insight = state.insights.find(i => i.id === insightId);
        if (insight) {
            insight.transcript = transcript;
            openInsightView(insightId);
            const transcriptTab = document.querySelector('.insight-tab[data-tab="transcript"]');
            if (transcriptTab) transcriptTab.click();
        }
    } catch (error) {
        console.error('Error saving transcript:', error);
        toast.error('Error al guardar la transcripción');
    }
}

async function clearTranscript(insightId) {
    confirmModal.show({
        title: '¿Borrar transcripción?',
        message: 'Se eliminarán también todos los destacados asociados.',
        actionText: 'Borrar',
        onConfirm: async () => {
            try {
                await insightService.update(insightId, { transcript: '', highlights: [] });
                const insight = state.insights.find(i => i.id === insightId);
                if (insight) {
                    insight.transcript = '';
                    insight.highlights = [];
                    openInsightView(insightId);
                    const transcriptTab = document.querySelector('.insight-tab[data-tab="transcript"]');
                    if (transcriptTab) transcriptTab.click();
                }
                toast.success('Transcripción eliminada');
            } catch (error) {
                console.error('Error clearing transcript:', error);
                toast.error('Error al eliminar la transcripción');
            }
        }
    });
}

async function saveInsightNotes(insightId) {
    const textarea = document.getElementById('insightNotesEditor');
    if (!textarea) return;

    try {
        await insightService.saveNotes(insightId, textarea.value);
        toast.success('Notas guardadas');
        // Update local state
        const insight = state.insights.find(i => i.id === insightId);
        if (insight) {
            insight.structuredNotes = textarea.value;
        }
    } catch (error) {
        console.error('Error saving notes:', error);
        toast.error('Error al guardar las notas');
    }
}

async function fetchYouTubeTranscript(insightId, videoId) {
    const fetchBtn = document.querySelector('[onclick*="fetchYouTubeTranscript"]');
    if (fetchBtn) {
        fetchBtn.disabled = true;
        fetchBtn.innerHTML = `
            <svg class="spinner" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10" stroke-opacity="0.25"></circle>
                <path d="M12 2a10 10 0 0 1 10 10" stroke-linecap="round"></path>
            </svg>
            Obteniendo...
        `;
    }

    try {
        toast.info('Obteniendo transcripción... Esto puede demorar unos segundos.');

        const result = await transcriptService.fetchTranscript(videoId);

        if (result && result.raw) {
            // Save the formatted transcript
            await insightService.update(insightId, {
                transcript: result.raw,
                transcriptFormatted: result.formatted,
                transcriptParagraphs: result.paragraphs
            });

            // Update local state
            const insight = state.insights.find(i => i.id === insightId);
            if (insight) {
                insight.transcript = result.raw;
                insight.transcriptFormatted = result.formatted;
                insight.transcriptParagraphs = result.paragraphs;
            }

            toast.success('Transcripción obtenida correctamente');

            // Refresh the view
            openInsightView(insightId);
            // Switch to transcript tab
            setTimeout(() => {
                const transcriptTab = document.querySelector('.insight-tab[data-tab="transcript"]');
                if (transcriptTab) transcriptTab.click();
            }, 100);
        } else {
            throw new Error('No se encontró transcripción para este video');
        }
    } catch (error) {
        console.error('Error fetching transcript:', error);
        toast.error(error.message || 'No se pudo obtener la transcripción');

        // Show manual input as fallback
        const container = document.getElementById('transcriptInputContainer');
        if (container) {
            container.classList.remove('hidden');
            const textarea = document.getElementById('transcriptInput');
            if (textarea) {
                textarea.placeholder = 'No se pudo obtener automáticamente. Para copiar manualmente:\n1. Abre el video en YouTube\n2. Haz clic en los 3 puntos (...) bajo el video\n3. Selecciona "Mostrar transcripción"\n4. Copia todo el texto y pégalo aquí';
            }
        }
    } finally {
        if (fetchBtn) {
            fetchBtn.disabled = false;
            fetchBtn.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="23 4 23 10 17 10"></polyline>
                    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
                </svg>
                Obtener de YouTube
            `;
        }
    }
}

function editTopic(topicId) {
    const topic = state.topics.find(t => t.id === topicId);
    if (topic) {
        openTopicModal(topic);
    }
}

function editInsight(insightId) {
    const insight = state.insights.find(i => i.id === insightId);
    if (insight) {
        openInsightModal(insight);
    }
}

function deleteTopic(topicId) {
    const topic = state.topics.find(t => t.id === topicId);
    if (!topic) return;

    confirmModal.show({
        title: t('confirm.deleteItem', { item: topic.name }),
        message: t('confirm.cannotUndo'),
        actionText: t('quotes.delete'),
        onConfirm: async () => {
            try {
                await topicService.delete(topicId);
                toast.success('Tema eliminado');
                if (state.currentSection === 'wiki') {
                    renderWikiView();
                }
            } catch (error) {
                console.error('Error deleting topic:', error);
                toast.error('Error al eliminar el tema');
            }
        }
    });
}

function deleteInsight(insightId) {
    const insight = state.insights.find(i => i.id === insightId);
    if (!insight) return;

    confirmModal.show({
        title: t('confirm.areYouSure'),
        message: t('confirm.cannotUndo'),
        actionText: t('quotes.delete'),
        onConfirm: async () => {
            try {
                await insightService.delete(insightId);
                toast.success('Insight eliminado');
                if (state.currentSection === 'insights') {
                    renderInsightsView();
                }
            } catch (error) {
                console.error('Error deleting insight:', error);
                toast.error('Error al eliminar el insight');
            }
        }
    });
}

function updateInsightsCounts() {
    const counts = insightService.getStatusCounts(state.insights);

    // Update total
    if (elements.totalInsights) {
        elements.totalInsights.textContent = counts.total;
    }

    // Update draft badge (shown on tab)
    if (elements.insightsDraftBadge) {
        if (counts.draft > 0) {
            elements.insightsDraftBadge.textContent = counts.draft;
            elements.insightsDraftBadge.classList.remove('hidden');
        } else {
            elements.insightsDraftBadge.classList.add('hidden');
        }
    }

    // Update individual counts
    if (elements.insightsDraftCount) {
        elements.insightsDraftCount.textContent = counts.draft;
    }
    if (elements.insightsReviewedCount) {
        elements.insightsReviewedCount.textContent = counts.reviewed;
    }
    if (elements.insightsIntegratedCount) {
        elements.insightsIntegratedCount.textContent = counts.integrated;
    }
}

function setupNavSidebarListeners() {
    // Sidebar toggle button (close)
    if (elements.sidebarToggle) {
        elements.sidebarToggle.onclick = () => {
            elements.navSidebar.classList.toggle('collapsed');
            document.querySelector('.app-layout').classList.toggle('sidebar-collapsed');
        };
    }

    // Sidebar open button (reopen when collapsed)
    if (elements.sidebarOpenBtn) {
        elements.sidebarOpenBtn.onclick = () => {
            elements.navSidebar.classList.remove('collapsed');
            document.querySelector('.app-layout').classList.remove('sidebar-collapsed');
        };
    }

    // Main navigation tabs
    setupMainNavTabs();

    // Collapsible sections
    if (elements.collectionsHeader) {
        elements.collectionsHeader.onclick = () => {
            elements.collectionsHeader.classList.toggle('collapsed');
            elements.sidebarCollections.classList.toggle('collapsed');
        };
    }

    if (elements.tagsHeader) {
        elements.tagsHeader.onclick = () => {
            elements.tagsHeader.classList.toggle('collapsed');
            elements.sidebarTags.classList.toggle('collapsed');
        };
    }

    if (elements.insightStatusHeader) {
        elements.insightStatusHeader.onclick = () => {
            elements.insightStatusHeader.classList.toggle('collapsed');
            elements.sidebarInsightStatus.classList.toggle('collapsed');
        };
    }

    if (elements.allInsightsHeader) {
        elements.allInsightsHeader.onclick = () => {
            state.insightStatusFilter = '';
            updateInsightStatusActive();
            renderInsightsView();
        };
    }

    if (elements.sidebarInsightStatus) {
        elements.sidebarInsightStatus.querySelectorAll('.nav-item').forEach(item => {
            item.onclick = () => {
                const status = item.dataset.status || '';
                state.insightStatusFilter = state.insightStatusFilter === status ? '' : status;
                updateInsightStatusActive();
                renderInsightsView();
            };
        });
    }

    // New collection button in sidebar
    if (elements.navNewCollectionBtn) {
        elements.navNewCollectionBtn.onclick = () => {
            elements.collectionModal.classList.add('active');
            elements.newCollectionName.focus();
        };
    }

    // New topic button
    if (elements.navNewTopicBtn) {
        elements.navNewTopicBtn.onclick = () => {
            openTopicModal();
        };
    }

    // New insight button
    if (elements.navNewInsightBtn) {
        elements.navNewInsightBtn.onclick = () => {
            openInsightModal();
        };
    }
}

function updateInsightStatusActive() {
    if (!elements.sidebarInsightStatus) return;

    elements.sidebarInsightStatus.querySelectorAll('.nav-item').forEach(item => {
        const status = item.dataset.status || '';
        item.classList.toggle('active', !!state.insightStatusFilter && status === state.insightStatusFilter);
    });
}

function setupMainNavTabs() {
    const tabs = [
        { el: elements.navWikiTab, view: 'wiki' },
        { el: elements.navInsightsTab, view: 'insights' },
        { el: elements.navQuotesTab, view: 'quotes' }
    ];

    tabs.forEach(({ el, view }) => {
        if (el) {
            el.onclick = () => switchSection(view);
        }
    });
}

function switchSection(section) {
    state.currentSection = section;

    // Clear detail view state when switching sections
    state.currentInsightId = null;

    // Update tab active states
    [elements.navWikiTab, elements.navInsightsTab, elements.navQuotesTab].forEach(tab => {
        if (tab) tab.classList.remove('active');
    });

    // Hide all sidebar content sections
    [elements.navWikiContent, elements.navInsightsContent, elements.navQuotesContent].forEach(content => {
        if (content) content.style.display = 'none';
    });

    // Get main content elements
    const desktopHeader = document.querySelector('.content-header.desktop-header');

    // Show active section
    switch (section) {
        case 'wiki':
            if (elements.navWikiTab) elements.navWikiTab.classList.add('active');
            if (elements.navWikiContent) elements.navWikiContent.style.display = 'block';
            // Hide quote-specific elements
            if (desktopHeader) desktopHeader.style.display = 'none';
            const viewControlsWiki = document.querySelector('.view-controls');
            if (viewControlsWiki) viewControlsWiki.style.display = 'none';
            if (elements.quotesList) elements.quotesList.classList.add('hidden');
            if (elements.quotesCompare) elements.quotesCompare.classList.add('hidden');
            if (elements.emptyState) elements.emptyState.classList.add('hidden');
            renderWikiView();
            break;
        case 'insights':
            if (elements.navInsightsTab) elements.navInsightsTab.classList.add('active');
            if (elements.navInsightsContent) elements.navInsightsContent.style.display = 'block';
            // Hide quote-specific elements
            if (desktopHeader) desktopHeader.style.display = 'none';
            const viewControlsInsights = document.querySelector('.view-controls');
            if (viewControlsInsights) viewControlsInsights.style.display = 'none';
            if (elements.quotesList) elements.quotesList.classList.add('hidden');
            if (elements.quotesCompare) elements.quotesCompare.classList.add('hidden');
            if (elements.emptyState) elements.emptyState.classList.add('hidden');
            renderInsightsView();
            break;
        case 'quotes':
        default:
            if (elements.navQuotesTab) elements.navQuotesTab.classList.add('active');
            if (elements.navQuotesContent) elements.navQuotesContent.style.display = 'block';
            // Restore quotes view content if it was replaced by wiki/insights
            restoreQuotesView();
            // Show quote-specific elements (get viewControls after restore)
            if (desktopHeader) desktopHeader.style.display = 'flex';
            const viewControlsQuotes = document.querySelector('.view-controls');
            if (viewControlsQuotes) viewControlsQuotes.style.display = 'flex';
            elements.quotesList.classList.remove('hidden');
            if (state.currentView === 'compare') {
                elements.quotesCompare.classList.remove('hidden');
            }
            renderQuotes();
            break;
    }
}

// Restore quotes view if content-body was replaced by wiki/insights
function restoreQuotesView() {
    const contentBody = document.querySelector('.content-body');
    if (!contentBody) return;

    // Check if quotes elements exist, if not, recreate them
    if (!document.getElementById('quotesList')) {
        contentBody.innerHTML = `
            <div class="view-controls">
                <button class="view-btn ${state.currentView === 'list' ? 'active' : ''}" id="viewList" data-i18n-title="quotes.listView" title="Vista lista">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="3" y1="6" x2="21" y2="6"></line>
                        <line x1="3" y1="12" x2="21" y2="12"></line>
                        <line x1="3" y1="18" x2="21" y2="18"></line>
                    </svg>
                </button>
                <button class="view-btn ${state.currentView === 'compare' ? 'active' : ''}" id="viewCompare" data-i18n-title="quotes.compareView" title="Vista comparativa">
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

        // Re-cache the DOM elements
        elements.quotesList = document.getElementById('quotesList');
        elements.quotesCompare = document.getElementById('quotesCompare');
        elements.quotesFavor = document.getElementById('quotesFavor');
        elements.quotesAgainst = document.getElementById('quotesAgainst');
        elements.emptyState = document.getElementById('emptyState');

        // Re-attach view toggle event listeners
        const viewList = document.getElementById('viewList');
        const viewCompare = document.getElementById('viewCompare');
        if (viewList) {
            viewList.onclick = () => {
                state.currentView = 'list';
                viewList.classList.add('active');
                if (viewCompare) viewCompare.classList.remove('active');
                elements.quotesCompare.classList.add('hidden');
                elements.quotesList.classList.remove('hidden');
                renderQuotes();
            };
        }
        if (viewCompare) {
            viewCompare.onclick = () => {
                state.currentView = 'compare';
                viewCompare.classList.add('active');
                if (viewList) viewList.classList.remove('active');
                elements.quotesList.classList.add('hidden');
                elements.quotesCompare.classList.remove('hidden');
                renderQuotes();
            };
        }
    }
}

// Wiki and Insights views
function renderWikiView() {
    // TODO: Implement wiki view rendering
    const contentBody = document.querySelector('.content-body');
    if (contentBody && state.currentSection === 'wiki') {
        if (state.topics.length === 0) {
            contentBody.innerHTML = `
                <div class="empty-state">
                    <h3>${t('sidebar.noTopics')}</h3>
                    <p>Crea tu primer tema para comenzar a organizar tu conocimiento</p>
                    <button class="btn btn-primary" onclick="openTopicModal()">
                        ${t('sidebar.newTopic')}
                    </button>
                </div>
            `;
        } else {
            renderTopicsList();
        }
    }
}

function renderTopicsList() {
    const contentBody = document.querySelector('.content-body');
    if (!contentBody) return;

    // Count quotes per topic
    const quoteCounts = {};
    state.quotes.forEach(quote => {
        if (quote.topicId) {
            quoteCounts[quote.topicId] = (quoteCounts[quote.topicId] || 0) + 1;
        }
    });

    const html = state.topics.map(topic => `
        <div class="topic-card" data-topic-id="${topic.id}">
            <div class="topic-icon">${topic.icon || '📁'}</div>
            <div class="topic-info">
                <h3 class="topic-name">${escapeHtml(topic.name)}</h3>
                <p class="topic-description">${escapeHtml(topic.description || '')}</p>
                <div class="topic-meta">
                    <span class="topic-status ${topic.status}">${topic.status === 'consolidated' ? t('topics.consolidated') : t('topics.inProgress')}</span>
                    ${quoteCounts[topic.id] ? `<span class="topic-quote-count">${quoteCounts[topic.id]} ${t('sidebar.quotes').toLowerCase()}</span>` : ''}
                </div>
            </div>
            <div class="topic-actions">
                <button class="btn-icon" onclick="event.stopPropagation(); editTopic('${topic.id}')" title="${t('quotes.edit')}">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                    </svg>
                </button>
                <button class="btn-icon btn-danger" onclick="event.stopPropagation(); deleteTopic('${topic.id}')" title="${t('quotes.delete')}">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                </button>
            </div>
        </div>
    `).join('');

    contentBody.innerHTML = `
        <div class="topics-grid">
            ${html}
        </div>
    `;

    // Add click handlers to open topic detail
    contentBody.querySelectorAll('.topic-card').forEach(card => {
        card.addEventListener('click', () => {
            const topicId = card.dataset.topicId;
            openTopicView(topicId);
        });
    });
}

function renderInsightsView() {
    // TODO: Implement insights view rendering
    const contentBody = document.querySelector('.content-body');
    if (contentBody && state.currentSection === 'insights') {
        const filteredInsights = insightService.filterByStatus(state.insights, state.insightStatusFilter);

        updateInsightStatusActive();

        if (filteredInsights.length === 0) {
            contentBody.innerHTML = `
                <div class="empty-state">
                    <h3>No hay insights</h3>
                    <p>${state.insightStatusFilter ? 'No hay insights en este estado.' : 'Captura tu primer insight de un video o artículo'}</p>
                    <button class="btn btn-primary" onclick="openInsightModal()">
                        ${t('sidebar.captureInsight')}
                    </button>
                </div>
            `;
        } else {
            renderInsightsList();
        }
    }
}

function renderInsightsList() {
    const contentBody = document.querySelector('.content-body');
    if (!contentBody) return;

    const filteredInsights = insightService.filterByStatus(state.insights, state.insightStatusFilter);

    const html = filteredInsights.map(insight => {
        const linkedTopic = insight.linkedTopicId ? state.topics.find(t => t.id === insight.linkedTopicId) : null;
        const notesCount = (insight.timestampedNotes || []).length;
        const highlightsCount = (insight.highlights || []).length;

        // Source type icons
        const sourceIcons = {
            youtube: `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                      </svg>`,
            article: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        <polyline points="14 2 14 8 20 8"></polyline>
                      </svg>`,
            podcast: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
                        <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                        <line x1="12" y1="19" x2="12" y2="23"></line>
                      </svg>`,
            book: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                     <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                     <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
                   </svg>`,
            other: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <circle cx="12" cy="12" r="10"></circle>
                      <line x1="12" y1="16" x2="12" y2="12"></line>
                      <line x1="12" y1="8" x2="12.01" y2="8"></line>
                    </svg>`
        };

        const sourceIcon = sourceIcons[insight.sourceType] || sourceIcons.other;

        return `
            <div class="insight-card" data-insight-id="${insight.id}">
                <div class="insight-card-thumbnail">
                    ${insight.sourceThumbnail
                        ? `<img src="${insight.sourceThumbnail}" alt="" loading="lazy">`
                        : `<div class="insight-card-placeholder">
                             ${sourceIcon}
                           </div>`
                    }
                    <div class="insight-card-source-badge ${insight.sourceType}">
                        ${sourceIcon}
                        <span>${insight.sourceType || 'other'}</span>
                    </div>
                    <div class="insight-card-actions">
                        <button class="insight-card-action" onclick="event.stopPropagation(); editInsight('${insight.id}')" title="${t('quotes.edit')}">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                            </svg>
                        </button>
                        <button class="insight-card-action danger" onclick="event.stopPropagation(); deleteInsight('${insight.id}')" title="${t('quotes.delete')}">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="3 6 5 6 21 6"></polyline>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            </svg>
                        </button>
                    </div>
                </div>
                <div class="insight-card-body">
                    <div class="insight-card-status-line">
                        <span class="insight-status-dot ${insight.status}"></span>
                        <span class="insight-status-text">${t('insights.' + insight.status)}</span>
                        <span class="insight-card-date">${new Date(insight.createdAt).toLocaleDateString()}</span>
                    </div>
                    <h3 class="insight-card-title">${escapeHtml(insight.sourceTitle || 'Sin título')}</h3>
                    ${linkedTopic ? `
                        <div class="insight-card-topic">
                            <span>${linkedTopic.icon}</span>
                            <span>${escapeHtml(linkedTopic.name)}</span>
                        </div>
                    ` : ''}
                    <div class="insight-card-stats">
                        ${notesCount > 0 ? `
                            <span class="insight-stat" title="${notesCount} notas">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                    <polyline points="14 2 14 8 20 8"></polyline>
                                </svg>
                                ${notesCount}
                            </span>
                        ` : ''}
                        ${highlightsCount > 0 ? `
                            <span class="insight-stat" title="${highlightsCount} destacados">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
                                    <path d="M2 17l10 5 10-5"></path>
                                </svg>
                                ${highlightsCount}
                            </span>
                        ` : ''}
                        ${insight.transcript ? `
                            <span class="insight-stat" title="Tiene transcripción">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                                    <line x1="9" y1="9" x2="15" y2="9"></line>
                                    <line x1="9" y1="13" x2="15" y2="13"></line>
                                </svg>
                            </span>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    }).join('');

    contentBody.innerHTML = `
        <div class="insights-grid">
            ${filteredInsights.length > 0 ? html : `
                <div class="insights-empty">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path>
                    </svg>
                    <p>No hay insights en esta categoría</p>
                    <span>Captura un nuevo insight para empezar</span>
                </div>
            `}
        </div>
    `;

    // Add click handlers to open insight detail
    contentBody.querySelectorAll('.insight-card').forEach(card => {
        card.addEventListener('click', () => {
            const insightId = card.dataset.insightId;
            openInsightView(insightId);
        });
    });
}

function openTopicModal(topicToEdit = null) {
    // Reset form
    elements.topicForm.reset();
    elements.topicId.value = '';
    elements.topicIconValue.value = '📁';

    // Reset icon picker
    elements.iconPicker.querySelectorAll('.icon-option').forEach(btn => {
        btn.classList.toggle('selected', btn.dataset.icon === '📁');
    });

    if (topicToEdit) {
        elements.topicModalTitle.textContent = t('topics.editTopic');
        elements.topicId.value = topicToEdit.id;
        elements.topicName.value = topicToEdit.name;
        elements.topicDescription.value = topicToEdit.description || '';
        elements.topicIconValue.value = topicToEdit.icon || '📁';

        // Update icon picker
        elements.iconPicker.querySelectorAll('.icon-option').forEach(btn => {
            btn.classList.toggle('selected', btn.dataset.icon === topicToEdit.icon);
        });
    } else {
        elements.topicModalTitle.textContent = t('topics.newTopic');
    }

    elements.topicModal.classList.add('active');
    elements.topicName.focus();
}

function closeTopicModal() {
    elements.topicModal.classList.remove('active');
    elements.topicForm.reset();
}

function openInsightModal(insightToEdit = null) {
    // Reset form
    elements.insightForm.reset();
    elements.insightId.value = '';
    elements.sourcePreview.classList.add('hidden');

    // Populate topics dropdown
    updateInsightTopicsDropdown();

    if (insightToEdit) {
        elements.insightModalTitle.textContent = t('insights.editInsight') || 'Editar insight';
        elements.insightId.value = insightToEdit.id;
        elements.insightSourceUrl.value = insightToEdit.sourceUrl || '';
        elements.insightNotes.value = insightToEdit.rawNotes || '';
        elements.insightTags.value = (insightToEdit.tags || []).join(', ');
        elements.insightLinkedTopic.value = insightToEdit.linkedTopicId || '';

        // Show preview if we have source info
        if (insightToEdit.sourceTitle) {
            showSourcePreview({
                title: insightToEdit.sourceTitle,
                type: insightToEdit.sourceType,
                thumbnail: insightToEdit.sourceThumbnail,
                channel: insightToEdit.sourceChannel
            });
        }
    } else {
        elements.insightModalTitle.textContent = t('insights.capture');
    }

    elements.insightModal.classList.add('active');
    elements.insightSourceUrl.focus();
}

function closeInsightModal() {
    elements.insightModal.classList.remove('active');
    elements.insightForm.reset();
    elements.sourcePreview.classList.add('hidden');
}

function updateInsightTopicsDropdown() {
    const select = elements.insightLinkedTopic;
    if (!select) return;

    // Keep the first "no link" option
    select.innerHTML = '<option value="">Sin vincular</option>';

    state.topics.forEach(topic => {
        const option = document.createElement('option');
        option.value = topic.id;
        option.textContent = `${topic.icon || '📁'} ${topic.name}`;
        select.appendChild(option);
    });
}

function showSourcePreview(data) {
    if (!data.title) return;

    elements.sourceTitle.textContent = data.title;
    elements.sourceTypeBadge.textContent = data.type || 'article';
    elements.sourceTypeBadge.className = `source-type-badge ${data.type || 'article'}`;
    elements.sourceChannel.textContent = data.channel || '';

    if (data.thumbnail) {
        elements.sourceThumbnail.src = data.thumbnail;
        elements.sourceThumbnail.style.display = 'block';
    } else {
        elements.sourceThumbnail.style.display = 'none';
    }

    elements.sourcePreview.classList.remove('hidden');
}

async function fetchUrlMetadata(url) {
    if (!url) return null;

    const sourceType = insightService.detectSourceType(url);

    // For YouTube, extract video info using oEmbed
    if (sourceType === 'youtube') {
        const videoId = insightService.extractYouTubeVideoId(url);
        if (videoId) {
            try {
                const response = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
                if (response.ok) {
                    const data = await response.json();
                    return {
                        title: data.title,
                        channel: data.author_name,
                        thumbnail: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
                        type: 'youtube'
                    };
                }
            } catch (err) {
                console.warn('Error fetching YouTube metadata:', err);
            }
        }
    }

    // For other URLs, just return basic info
    return {
        title: url,
        type: sourceType,
        thumbnail: null,
        channel: null
    };
}

// Setup modal listeners
function setupInsightModalListeners() {
    // Cancel button
    if (elements.cancelInsightBtn) {
        elements.cancelInsightBtn.onclick = closeInsightModal;
    }

    // Close on overlay click
    if (elements.insightModal) {
        elements.insightModal.onclick = (e) => {
            if (e.target === elements.insightModal) {
                closeInsightModal();
            }
        };
    }

    // Fetch metadata button
    if (elements.fetchMetadataBtn) {
        elements.fetchMetadataBtn.onclick = async () => {
            const url = elements.insightSourceUrl.value.trim();
            if (!url) {
                toast.warning('Ingresa una URL primero');
                return;
            }

            elements.fetchMetadataBtn.disabled = true;
            try {
                const metadata = await fetchUrlMetadata(url);
                if (metadata) {
                    showSourcePreview(metadata);
                }
            } catch (err) {
                toast.error('No se pudo obtener información de la URL');
            } finally {
                elements.fetchMetadataBtn.disabled = false;
            }
        };
    }

    // Form submit
    if (elements.insightForm) {
        elements.insightForm.onsubmit = async (e) => {
            e.preventDefault();
            await handleInsightSubmit();
        };
    }
}

async function handleInsightSubmit() {
    const url = elements.insightSourceUrl.value.trim();
    const notes = elements.insightNotes.value.trim();

    if (!notes && !url) {
        toast.warning('Añade una URL o apuntes');
        return;
    }

    const insightId = elements.insightId.value;
    const sourceType = insightService.detectSourceType(url);

    // Get metadata from preview if available
    const sourceTitle = elements.sourceTitle.textContent || url || 'Sin título';
    const sourceChannel = elements.sourceChannel.textContent || null;
    const sourceThumbnail = elements.sourceThumbnail.src || null;

    const data = {
        sourceUrl: url,
        sourceTitle: sourceTitle,
        sourceType: sourceType,
        sourceChannel: sourceChannel,
        sourceThumbnail: sourceThumbnail && !sourceThumbnail.includes('data:') ? sourceThumbnail : null,
        rawNotes: notes,
        tags: elements.insightTags.value.split(',').map(t => t.trim().toLowerCase()).filter(Boolean),
        linkedTopicId: elements.insightLinkedTopic.value || null,
        status: 'draft'
    };

    try {
        if (insightId) {
            await insightService.update(insightId, data);
            toast.success('Insight actualizado');
        } else {
            await insightService.create(data, authService.getCurrentUser().uid);
            toast.success('Insight guardado');
        }
        closeInsightModal();

        // Switch to insights view
        if (state.currentSection !== 'insights') {
            switchSection('insights');
        }
    } catch (err) {
        console.error('Error saving insight:', err);
        toast.error('Error al guardar el insight');
    }
}

function setupTopicModalListeners() {
    // Cancel button
    if (elements.cancelTopicBtn) {
        elements.cancelTopicBtn.onclick = closeTopicModal;
    }

    // Close on overlay click
    if (elements.topicModal) {
        elements.topicModal.onclick = (e) => {
            if (e.target === elements.topicModal) {
                closeTopicModal();
            }
        };
    }

    // Icon picker
    if (elements.iconPicker) {
        elements.iconPicker.onclick = (e) => {
            const btn = e.target.closest('.icon-option');
            if (btn) {
                elements.iconPicker.querySelectorAll('.icon-option').forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
                elements.topicIconValue.value = btn.dataset.icon;
            }
        };
    }

    // Form submit
    if (elements.topicForm) {
        elements.topicForm.onsubmit = async (e) => {
            e.preventDefault();
            await handleTopicSubmit();
        };
    }
}

async function handleTopicSubmit() {
    const name = elements.topicName.value.trim();
    if (!name) {
        toast.warning('El nombre es requerido');
        return;
    }

    const topicId = elements.topicId.value;
    const data = {
        name: name,
        description: elements.topicDescription.value.trim(),
        icon: elements.topicIconValue.value || '📁'
    };

    try {
        if (topicId) {
            await topicService.update(topicId, data);
            toast.success('Tema actualizado');
        } else {
            await topicService.create(data, authService.getCurrentUser().uid);
            toast.success('Tema creado');
        }
        closeTopicModal();

        // Switch to wiki view
        if (state.currentSection !== 'wiki') {
            switchSection('wiki');
        }
    } catch (err) {
        console.error('Error saving topic:', err);
        toast.error('Error al guardar el tema');
    }
}

// Make functions globally available for onclick handlers
window.openTopicModal = openTopicModal;
window.openInsightModal = openInsightModal;

function updateCollectionSelects() {
    updateAllCollectionSelects({
        filter: elements.filterCollection,
        form: elements.quoteCollection
    }, state.collections);
}

// ============================================================================
// Quote Event Handlers
// ============================================================================
function setupQuoteListeners() {
    elements.quoteForm.addEventListener('submit', handleQuoteSubmit);
}

async function handleQuoteSubmit(e) {
    e.preventDefault();

    elements.saveBtn.disabled = true;
    elements.saveBtn.textContent = t('form.saving');

    const id = document.getElementById('quoteId').value;
    const formData = {
        text: document.getElementById('quoteText').value,
        author: document.getElementById('quoteAuthor').value,
        source: document.getElementById('quoteSource').value,
        collectionId: document.getElementById('quoteCollection').value,
        stance: document.getElementById('quoteStance').value,
        tags: document.getElementById('quoteTags').value,
        notes: document.getElementById('quoteNotes').value,
        parentId: replyParentId
    };

    const quoteData = quoteService.prepareQuoteData(formData);

    try {
        const user = authService.getCurrentUser();
        if (id) {
            await quoteService.update(id, { ...quoteData, userId: user.uid });
            toast.success(t('toast.quoteUpdated'));
        } else {
            await quoteService.create(quoteData, user.uid);
            toast.success(t('toast.quoteSaved'));
        }
        closeModal();
    } catch (error) {
        console.error('Error saving quote:', error);
        toast.error(t('toast.errorSavingQuote'));
    }

    elements.saveBtn.disabled = false;
    elements.saveBtn.textContent = t('form.save');
}

// ============================================================================
// Filter & View Listeners
// ============================================================================
function setupFilterListeners() {
    elements.searchInput.addEventListener('input', renderQuotes);

    // Setup custom selects
    setupCustomSelect(elements.stanceSelect, elements.filterStance);
    setupCustomSelect(elements.favoriteSelect, elements.filterFavorite);
    setupCustomSelect(elements.sortSelect, elements.sortBy);
    // Collection filter is now controlled by sidebar navigation

    // Close all dropdowns when clicking outside
    document.addEventListener('click', (e) => {
        document.querySelectorAll('.custom-select.open').forEach(select => {
            if (!select.contains(e.target)) {
                select.classList.remove('open');
            }
        });
    });
}

function setupCustomSelect(customSelect, hiddenSelect) {
    if (!customSelect || !hiddenSelect) return;

    const btn = customSelect.querySelector('.custom-select-btn');
    const dropdown = customSelect.querySelector('.custom-select-dropdown');
    const selectedText = btn.querySelector('.selected-text');

    // Toggle dropdown
    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        // Close other dropdowns
        document.querySelectorAll('.custom-select.open').forEach(s => {
            if (s !== customSelect) s.classList.remove('open');
        });
        customSelect.classList.toggle('open');
    });

    // Handle option selection
    dropdown.querySelectorAll('.custom-select-option').forEach(option => {
        option.addEventListener('click', () => {
            const value = option.dataset.value;
            const text = option.querySelector('span').textContent;

            // Update hidden select
            hiddenSelect.value = value;

            // Update button text
            selectedText.textContent = text;

            // Update active state
            dropdown.querySelectorAll('.custom-select-option').forEach(opt => {
                opt.classList.toggle('active', opt === option);
            });

            // Close dropdown
            customSelect.classList.remove('open');

            // Trigger change event
            hiddenSelect.dispatchEvent(new Event('change'));
            renderQuotes();
        });
    });
}

function setupViewListeners() {
    elements.viewList.addEventListener('click', () => {
        state.currentView = 'list';
        elements.viewList.classList.add('active');
        elements.viewCompare.classList.remove('active');
        elements.quotesList.classList.remove('hidden');
        elements.quotesCompare.classList.add('hidden');
        renderQuotes();
    });

    elements.viewCompare.addEventListener('click', () => {
        state.currentView = 'compare';
        elements.viewCompare.classList.add('active');
        elements.viewList.classList.remove('active');
        elements.quotesList.classList.add('hidden');
        elements.quotesCompare.classList.remove('hidden');
        renderQuotes();
    });
}

// ============================================================================
// Modal Handlers
// ============================================================================
function setupModalListeners() {
    // Close on overlay click
    elements.modal.addEventListener('click', (e) => {
        if (e.target === elements.modal) closeModal();
    });

    elements.collectionModal.addEventListener('click', (e) => {
        if (e.target === elements.collectionModal) closeCollectionModal();
    });

    // Escape key closes modals
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeModal();
            closeCollectionModal();
        }
    });

    // New quote button
    elements.newQuoteBtn.addEventListener('click', () => openModal());

    // Cancel modal button
    elements.cancelModalBtn.addEventListener('click', closeModal);

    // New collection button
    elements.newCollectionBtn.addEventListener('click', openNewCollectionModal);

    // Cancel collection modal button
    elements.cancelCollectionBtn.addEventListener('click', closeCollectionModal);

    // Create collection button
    elements.createCollectionBtn.addEventListener('click', createCollection);
}

// ============================================================================
// Global Functions (exposed to window for onclick handlers in rendered HTML)
// ============================================================================
function openModal(quoteId = null) {
    replyParentId = null; // Reset reply state
    const form = elements.quoteForm;
    form.reset();
    document.getElementById('quoteId').value = '';
    document.getElementById('quoteCollection').value = '';

    if (quoteId) {
        const quote = state.quotes.find(q => q.id === quoteId);
        if (quote) {
            elements.modalTitle.textContent = t('quotes.editQuote');
            document.getElementById('quoteId').value = quote.id;
            document.getElementById('quoteText').value = quote.text;
            document.getElementById('quoteAuthor').value = quote.author;
            document.getElementById('quoteSource').value = quote.source || '';
            document.getElementById('quoteCollection').value = quote.collectionId || '';
            document.getElementById('quoteStance').value = quote.stance;
            document.getElementById('quoteTags').value = (quote.tags || []).join(', ');
            document.getElementById('quoteNotes').value = quote.notes || '';
        }
    } else {
        elements.modalTitle.textContent = t('quotes.newQuote');
    }

    elements.modal.classList.add('active');
}

function closeModal() {
    elements.modal.classList.remove('active');
    replyParentId = null; // Reset reply state
}

function deleteQuote(id) {
    confirmModal.show({
        title: t('confirm.deleteQuote'),
        message: t('confirm.cannotUndo'),
        actionText: t('quotes.delete'),
        onConfirm: async () => {
            try {
                await quoteService.delete(id);
                toast.success(t('toast.quoteDeleted'));
            } catch (error) {
                console.error('Error deleting quote:', error);
                toast.error(t('toast.errorDeletingQuote'));
            }
        }
    });
}

async function toggleFavorite(id, value) {
    try {
        await quoteService.toggleFavorite(id, value);
        toast.success(value ? t('toast.quoteFavorited') : t('toast.quoteUnfavorited'));
    } catch (error) {
        console.error('Error updating favorite:', error);
        toast.error(t('toast.errorUpdating'));
    }
}

function openNewCollectionModal() {
    elements.newCollectionName.value = '';
    elements.collectionModal.classList.add('active');
}

function closeCollectionModal() {
    elements.collectionModal.classList.remove('active');
}

async function createCollection() {
    const name = elements.newCollectionName.value.trim();
    if (!name) {
        toast.error(t('toast.enterCollectionName'));
        return;
    }

    try {
        const user = authService.getCurrentUser();
        await collectionService.create(name, user.uid);
        toast.success(t('toast.collectionCreated'));
        closeCollectionModal();
    } catch (error) {
        console.error('Error creating collection:', error);
        toast.error(t('toast.errorCreatingCollection'));
    }
}

async function logout() {
    await authService.logout();
}

function openReplyModal(parentId, suggestedStance, collectionId) {
    const parentQuote = state.quotes.find(q => q.id === parentId);
    if (!parentQuote) return;

    replyParentId = parentId;

    const form = elements.quoteForm;
    form.reset();
    document.getElementById('quoteId').value = '';
    document.getElementById('quoteCollection').value = collectionId || '';
    document.getElementById('quoteStance').value = suggestedStance;

    // Update modal title to show it's a reply
    elements.modalTitle.innerHTML = `
        ${t('replies.newReply')}
        <div class="reply-context">
            <small>${t('replies.replyingTo')}</small>
            <blockquote>"${parentQuote.text.substring(0, 100)}${parentQuote.text.length > 100 ? '...' : ''}"</blockquote>
        </div>
    `;

    elements.modal.classList.add('active');
}

function toggleReplies(toggleId) {
    const repliesContainer = document.getElementById(toggleId);
    const toggleBtn = repliesContainer?.previousElementSibling;

    if (!repliesContainer || !toggleBtn) return;

    const isExpanded = toggleBtn.dataset.expanded === 'true';

    if (isExpanded) {
        repliesContainer.classList.add('collapsed');
        toggleBtn.dataset.expanded = 'false';
        toggleBtn.querySelector('.toggle-icon').style.transform = 'rotate(-90deg)';
    } else {
        repliesContainer.classList.remove('collapsed');
        toggleBtn.dataset.expanded = 'true';
        toggleBtn.querySelector('.toggle-icon').style.transform = 'rotate(0deg)';
    }
}

// Expose functions to window for onclick handlers in rendered HTML
window.openModal = openModal;
window.closeModal = closeModal;
window.deleteQuote = deleteQuote;
window.toggleFavorite = toggleFavorite;
window.openNewCollectionModal = openNewCollectionModal;
window.closeCollectionModal = closeCollectionModal;
window.createCollection = createCollection;
window.logout = logout;
window.openReplyModal = openReplyModal;
window.toggleReplies = toggleReplies;
window.switchSection = switchSection;
window.editTopic = editTopic;
window.deleteTopic = deleteTopic;
window.editInsight = editInsight;
window.deleteInsight = deleteInsight;
window.saveInsightNotes = saveInsightNotes;
window.showTranscriptInput = showTranscriptInput;
window.hideTranscriptInput = hideTranscriptInput;
window.saveTranscript = saveTranscript;
window.clearTranscript = clearTranscript;
window.fetchYouTubeTranscript = fetchYouTubeTranscript;
window.removeHighlight = removeHighlight;
window.convertHighlightToQuote = convertHighlightToQuote;
window.seekToTime = seekToTime;
window.insertTimestampNote = insertTimestampNote;
window.deleteTimestampedNote = deleteTimestampedNote;
window.toggleTodoNote = toggleTodoNote;

// ============================================================================
// Mobile Handlers
// ============================================================================
const mobileFiltersState = {
    collection: '',
    stance: '',
    favorite: '',
    sort: 'newest'
};

function setupMobileListeners() {
    // Mobile search input - sync with desktop
    elements.mobileSearchInput.addEventListener('input', (e) => {
        elements.searchInput.value = e.target.value;
        renderQuotes();
    });

    // Sync desktop search to mobile
    elements.searchInput.addEventListener('input', () => {
        elements.mobileSearchInput.value = elements.searchInput.value;
    });

    // Mobile menu toggle
    elements.mobileMenuBtn.addEventListener('click', () => {
        elements.mobileMenu.classList.toggle('hidden');
    });

    // Mobile logout
    elements.logoutBtnMobile.addEventListener('click', logout);

    // Filter panel toggle
    elements.filterToggleBtn.addEventListener('click', openFiltersPanel);
    elements.closeFiltersBtn.addEventListener('click', closeFiltersPanel);
    elements.filtersOverlay.addEventListener('click', closeFiltersPanel);

    // Filter actions
    elements.clearFiltersBtn.addEventListener('click', clearMobileFilters);
    elements.applyFiltersBtn.addEventListener('click', applyMobileFilters);

    // Mobile FAB
    elements.mobileFab.addEventListener('click', () => openModal());

    // Mobile language selector
    elements.languageBtnMobile.addEventListener('click', (e) => {
        e.stopPropagation();
        elements.languageSelectorMobile.classList.toggle('open');
    });

    elements.languageDropdownMobile.querySelectorAll('.language-option').forEach(option => {
        option.addEventListener('click', () => {
            const lang = option.dataset.lang;
            i18n.setLocale(lang);
            updateLanguageSelector(lang);
            elements.languageSelectorMobile.classList.remove('open');
        });
    });

    // Close mobile language dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!elements.languageSelectorMobile.contains(e.target)) {
            elements.languageSelectorMobile.classList.remove('open');
        }
    });
}

function initMobileFiltersPanel() {
    const content = elements.filtersPanel.querySelector('.filters-panel-content');

    content.innerHTML = `
        <div class="filter-group" data-filter="collection">
            <span class="filter-group-label">${t('filters.collection')}</span>
            <div class="filter-chips" id="mobileCollectionChips">
                <button type="button" class="filter-chip active" data-value="">${t('quotes.allCollections')}</button>
            </div>
        </div>
        <div class="filter-group" data-filter="stance">
            <span class="filter-group-label">${t('filters.stance')}</span>
            <div class="filter-chips" id="mobileStanceChips">
                <button type="button" class="filter-chip active" data-value="">${t('quotes.allStances')}</button>
                <button type="button" class="filter-chip" data-value="favor">${t('stances.favor')}</button>
                <button type="button" class="filter-chip" data-value="contra">${t('stances.contra')}</button>
                <button type="button" class="filter-chip" data-value="neutral">${t('stances.neutral')}</button>
            </div>
        </div>
        <div class="filter-group" data-filter="favorite">
            <span class="filter-group-label">${t('filters.favorites')}</span>
            <div class="filter-chips" id="mobileFavoriteChips">
                <button type="button" class="filter-chip active" data-value="">${t('quotes.all')}</button>
                <button type="button" class="filter-chip" data-value="true">${t('quotes.favorites')}</button>
            </div>
        </div>
        <div class="filter-group" data-filter="sort">
            <span class="filter-group-label">${t('filters.sort')}</span>
            <div class="filter-chips" id="mobileSortChips">
                <button type="button" class="filter-chip active" data-value="newest">${t('quotes.newest')}</button>
                <button type="button" class="filter-chip" data-value="oldest">${t('quotes.oldest')}</button>
                <button type="button" class="filter-chip" data-value="author">${t('quotes.byAuthor')}</button>
            </div>
        </div>
    `;

    // Setup chip click handlers
    content.querySelectorAll('.filter-chips').forEach(chipsContainer => {
        chipsContainer.querySelectorAll('.filter-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                // Remove active from siblings
                chipsContainer.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
                chip.classList.add('active');

                // Update mobile filters state
                const filterType = chip.closest('.filter-group').dataset.filter;
                mobileFiltersState[filterType] = chip.dataset.value;
            });
        });
    });
}

function updateMobileFiltersPanel() {
    // Update collection chips
    const collectionChips = document.getElementById('mobileCollectionChips');
    if (collectionChips) {
        collectionChips.innerHTML = `
            <button type="button" class="filter-chip ${!mobileFiltersState.collection ? 'active' : ''}" data-value="">${t('quotes.allCollections')}</button>
            ${state.collections.map(c => `
                <button type="button" class="filter-chip ${mobileFiltersState.collection === c.id ? 'active' : ''}" data-value="${c.id}">${c.name}</button>
            `).join('')}
        `;

        // Re-attach handlers
        collectionChips.querySelectorAll('.filter-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                collectionChips.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
                chip.classList.add('active');
                mobileFiltersState.collection = chip.dataset.value;
            });
        });
    }

    // Update labels for other filters (on language change)
    const stanceChips = document.getElementById('mobileStanceChips');
    if (stanceChips) {
        const stanceOptions = [
            { value: '', label: t('quotes.allStances') },
            { value: 'favor', label: t('stances.favor') },
            { value: 'contra', label: t('stances.contra') },
            { value: 'neutral', label: t('stances.neutral') }
        ];
        stanceChips.innerHTML = stanceOptions.map(opt =>
            `<button type="button" class="filter-chip ${mobileFiltersState.stance === opt.value ? 'active' : ''}" data-value="${opt.value}">${opt.label}</button>`
        ).join('');
        attachChipHandlers(stanceChips, 'stance');
    }

    const favoriteChips = document.getElementById('mobileFavoriteChips');
    if (favoriteChips) {
        favoriteChips.innerHTML = `
            <button type="button" class="filter-chip ${!mobileFiltersState.favorite ? 'active' : ''}" data-value="">${t('quotes.all')}</button>
            <button type="button" class="filter-chip ${mobileFiltersState.favorite === 'true' ? 'active' : ''}" data-value="true">${t('quotes.favorites')}</button>
        `;
        attachChipHandlers(favoriteChips, 'favorite');
    }

    const sortChips = document.getElementById('mobileSortChips');
    if (sortChips) {
        const sortOptions = [
            { value: 'newest', label: t('quotes.newest') },
            { value: 'oldest', label: t('quotes.oldest') },
            { value: 'author', label: t('quotes.byAuthor') }
        ];
        sortChips.innerHTML = sortOptions.map(opt =>
            `<button type="button" class="filter-chip ${mobileFiltersState.sort === opt.value ? 'active' : ''}" data-value="${opt.value}">${opt.label}</button>`
        ).join('');
        attachChipHandlers(sortChips, 'sort');
    }
}

function attachChipHandlers(container, filterType) {
    container.querySelectorAll('.filter-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            container.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            mobileFiltersState[filterType] = chip.dataset.value;
        });
    });
}

function openFiltersPanel() {
    // Sync current filter state
    mobileFiltersState.collection = elements.filterCollection.value;
    mobileFiltersState.stance = elements.filterStance.value;
    mobileFiltersState.favorite = elements.filterFavorite.value;
    mobileFiltersState.sort = elements.sortBy.value;

    updateMobileFiltersPanel();
    elements.filtersPanel.classList.remove('hidden');
    elements.filtersOverlay.classList.remove('hidden');
    setTimeout(() => {
        elements.filtersPanel.classList.add('active');
        elements.filtersOverlay.classList.add('active');
    }, 10);
    document.body.style.overflow = 'hidden';
}

function closeFiltersPanel() {
    elements.filtersPanel.classList.remove('active');
    elements.filtersOverlay.classList.remove('active');
    setTimeout(() => {
        elements.filtersPanel.classList.add('hidden');
        elements.filtersOverlay.classList.add('hidden');
    }, 300);
    document.body.style.overflow = '';
}

function clearMobileFilters() {
    mobileFiltersState.collection = '';
    mobileFiltersState.stance = '';
    mobileFiltersState.favorite = '';
    mobileFiltersState.sort = 'newest';
    updateMobileFiltersPanel();
}

function applyMobileFilters() {
    // Apply to hidden selects
    elements.filterCollection.value = mobileFiltersState.collection;
    elements.filterStance.value = mobileFiltersState.stance;
    elements.filterFavorite.value = mobileFiltersState.favorite;
    elements.sortBy.value = mobileFiltersState.sort;

    // Update custom selects UI
    syncCustomSelectUI(elements.stanceSelect, mobileFiltersState.stance);
    syncCustomSelectUI(elements.favoriteSelect, mobileFiltersState.favorite);
    syncCustomSelectUI(elements.sortSelect, mobileFiltersState.sort);
    // Update sidebar collections selection
    renderSidebarCollections();

    // Update filter badge
    updateFilterBadge();

    // Render and close
    renderQuotes();
    closeFiltersPanel();
}

function syncCustomSelectUI(customSelect, value) {
    if (!customSelect) return;

    const options = customSelect.querySelectorAll('.custom-select-option');
    const selectedText = customSelect.querySelector('.selected-text');

    options.forEach(opt => {
        const isActive = opt.dataset.value === value;
        opt.classList.toggle('active', isActive);
        if (isActive) {
            selectedText.textContent = opt.querySelector('span').textContent;
        }
    });
}

function updateFilterBadge() {
    let count = 0;
    if (elements.filterCollection.value) count++;
    if (elements.filterStance.value) count++;
    if (elements.filterFavorite.value) count++;
    if (elements.sortBy.value !== 'newest') count++;

    if (count > 0) {
        elements.filterBadge.textContent = count;
        elements.filterBadge.classList.remove('hidden');
    } else {
        elements.filterBadge.classList.add('hidden');
    }
}

// ============================================================================
// Start Application
// ============================================================================
init();
