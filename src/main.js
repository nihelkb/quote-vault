/**
 * Main Application Entry Point
 * Single Responsibility Principle: Orchestrates components and services
 * Dependency Inversion Principle: Depends on abstractions (services)
 */

// Services
import { authService } from './services/AuthService.js';
import { quoteService } from './services/QuoteService.js';
import { collectionService } from './services/CollectionService.js';

// Components
import { renderQuoteList } from './components/QuoteCard.js';
import { updateCompareView, filterForCompare } from './components/CompareView.js';
import { updateAllCollectionSelects } from './components/CollectionSelect.js';

// Utils
import { toast } from './utils/toast.js';
import { confirmModal } from './utils/confirmModal.js';
import { i18n, t } from './utils/i18n.js';

// ============================================================================
// Application State
// ============================================================================
const state = {
    quotes: [],
    collections: [],
    currentView: 'list',
    authMode: 'login'
};

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
    collectionSelect: document.getElementById('collectionSelect'),
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

    // Auth state observer
    authService.onAuthStateChange(handleAuthStateChange);

    // Listen for locale changes to re-render dynamic content
    i18n.onLocaleChange(() => {
        renderQuotes();
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
    });
}

function unsubscribeFromData() {
    quoteService.unsubscribeAll();
    collectionService.unsubscribeAll();
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
    let filtered = quoteService.filterQuotes(state.quotes, filters);
    filtered = quoteService.sortQuotes(filtered, filters.sortBy);

    if (filtered.length === 0) {
        elements.quotesList.innerHTML = '';
        elements.emptyState.classList.remove('hidden');
        return;
    }

    elements.emptyState.classList.add('hidden');
    elements.quotesList.innerHTML = renderQuoteList(filtered, state.collections);
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
    elements.totalQuotesMobile.textContent = state.quotes.length;
}

function updateCollectionSelects() {
    updateAllCollectionSelects({
        filter: elements.filterCollection,
        form: elements.quoteCollection
    }, state.collections, elements.collectionSelect);
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
        notes: document.getElementById('quoteNotes').value
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
    setupCustomSelect(elements.collectionSelect, elements.filterCollection);

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

// Expose functions to window for onclick handlers in rendered HTML
window.openModal = openModal;
window.closeModal = closeModal;
window.deleteQuote = deleteQuote;
window.toggleFavorite = toggleFavorite;
window.openNewCollectionModal = openNewCollectionModal;
window.closeCollectionModal = closeCollectionModal;
window.createCollection = createCollection;
window.logout = logout;

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
    syncCustomSelectUI(elements.collectionSelect, mobileFiltersState.collection);
    syncCustomSelectUI(elements.stanceSelect, mobileFiltersState.stance);
    syncCustomSelectUI(elements.favoriteSelect, mobileFiltersState.favorite);
    syncCustomSelectUI(elements.sortSelect, mobileFiltersState.sort);

    // Update filter badge
    updateFilterBadge();

    // Render and close
    renderQuotes();
    closeFiltersPanel();
}

function syncCustomSelectUI(customSelect, value) {
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
