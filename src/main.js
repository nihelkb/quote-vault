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
    newCollectionName: document.getElementById('newCollectionName')
};

// ============================================================================
// Initialization
// ============================================================================
function init() {
    toast.init('toastContainer');
    confirmModal.init();
    setupAuthListeners();
    setupQuoteListeners();
    setupFilterListeners();
    setupViewListeners();
    setupModalListeners();

    // Auth state observer
    authService.onAuthStateChange(handleAuthStateChange);
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
    elements.userEmail.textContent = authService.getDisplayName(user);
}

function setupAuthListeners() {
    // Auth tabs
    elements.authTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            elements.authTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            state.authMode = tab.dataset.tab;

            const isRegister = state.authMode === 'register';
            elements.authSubmit.textContent = isRegister ? 'Crear cuenta' : 'Iniciar sesión';
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
        elements.resendVerification.textContent = 'Enviando...';

        try {
            await authService.resendVerificationEmail();
            elements.resendVerification.textContent = 'Email enviado';
        } catch (error) {
            elements.resendVerification.textContent = 'Error al enviar';
        }

        setTimeout(() => {
            elements.resendVerification.textContent = 'Reenviar email';
            elements.resendVerification.disabled = false;
        }, 3000);
    });
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
}

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
    elements.saveBtn.textContent = 'Guardando...';

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
            toast.success('Cita actualizada');
        } else {
            await quoteService.create(quoteData, user.uid);
            toast.success('Cita guardada');
        }
        closeModal();
    } catch (error) {
        console.error('Error saving quote:', error);
        toast.error('Error al guardar la cita');
    }

    elements.saveBtn.disabled = false;
    elements.saveBtn.textContent = 'Guardar';
}

// ============================================================================
// Filter & View Listeners
// ============================================================================
function setupFilterListeners() {
    elements.searchInput.addEventListener('input', renderQuotes);
    elements.filterCollection.addEventListener('change', renderQuotes);
    elements.filterStance.addEventListener('change', renderQuotes);
    elements.filterFavorite.addEventListener('change', renderQuotes);
    elements.sortBy.addEventListener('change', renderQuotes);
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
}

// ============================================================================
// Global Functions (exposed to window for onclick handlers)
// ============================================================================
window.openModal = (quoteId = null) => {
    const form = elements.quoteForm;
    form.reset();
    document.getElementById('quoteId').value = '';
    document.getElementById('quoteCollection').value = '';

    if (quoteId) {
        const quote = state.quotes.find(q => q.id === quoteId);
        if (quote) {
            elements.modalTitle.textContent = 'Editar cita';
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
        elements.modalTitle.textContent = 'Nueva cita';
    }

    elements.modal.classList.add('active');
};

window.closeModal = () => {
    elements.modal.classList.remove('active');
};

window.deleteQuote = (id) => {
    confirmModal.show({
        title: '¿Eliminar esta cita?',
        message: 'Esta acción no se puede deshacer.',
        actionText: 'Eliminar',
        onConfirm: async () => {
            try {
                await quoteService.delete(id);
                toast.success('Cita eliminada');
            } catch (error) {
                console.error('Error deleting quote:', error);
                toast.error('Error al eliminar la cita');
            }
        }
    });
};

window.toggleFavorite = async (id, value) => {
    try {
        await quoteService.toggleFavorite(id, value);
        toast.success(value ? 'Cita destacada' : 'Cita sin destacar');
    } catch (error) {
        console.error('Error updating favorite:', error);
        toast.error('Error al actualizar');
    }
};

window.openNewCollectionModal = () => {
    elements.newCollectionName.value = '';
    elements.collectionModal.classList.add('active');
};

window.closeCollectionModal = () => {
    elements.collectionModal.classList.remove('active');
};

window.createCollection = async () => {
    const name = elements.newCollectionName.value.trim();
    if (!name) {
        toast.error('Ingresa un nombre para la colección');
        return;
    }

    try {
        const user = authService.getCurrentUser();
        await collectionService.create(name, user.uid);
        toast.success('Colección creada');
        closeCollectionModal();
    } catch (error) {
        console.error('Error creating collection:', error);
        toast.error('Error al crear colección');
    }
};

window.logout = async () => {
    await authService.logout();
};

// ============================================================================
// Start Application
// ============================================================================
init();
