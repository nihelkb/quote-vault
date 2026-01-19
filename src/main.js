import { auth, db, googleProvider } from './config/firebase.js';
import {
    onAuthStateChanged,
    signInWithPopup,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    sendEmailVerification,
    updateProfile,
    signOut
} from 'firebase/auth';
import {
    collection,
    doc,
    addDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    onSnapshot
} from 'firebase/firestore';

let currentUser = null;
let quotes = [];
let collections = [];
let unsubscribe = null;
let unsubscribeCollections = null;
let currentView = 'list';

// Toast notifications
const toastContainer = document.getElementById('toastContainer');

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    toastContainer.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('exiting');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Confirm modal
const confirmModal = document.getElementById('confirmModal');
const confirmTitle = document.getElementById('confirmTitle');
const confirmMessage = document.getElementById('confirmMessage');
const confirmActionBtn = document.getElementById('confirmAction');
const confirmCancel = document.getElementById('confirmCancel');

let confirmCallback = null;

function showConfirm(title, message, actionText, callback) {
    confirmTitle.textContent = title;
    confirmMessage.textContent = message;
    confirmActionBtn.textContent = actionText;
    confirmCallback = callback;
    confirmModal.classList.add('active');
}

confirmCancel.addEventListener('click', () => {
    confirmModal.classList.remove('active');
    confirmCallback = null;
});

confirmActionBtn.addEventListener('click', async () => {
    if (confirmCallback) {
        await confirmCallback();
    }
    confirmModal.classList.remove('active');
    confirmCallback = null;
});

confirmModal.addEventListener('click', (e) => {
    if (e.target === confirmModal) {
        confirmModal.classList.remove('active');
        confirmCallback = null;
    }
});

// DOM Elements
const loadingScreen = document.getElementById('loadingScreen');
const authScreen = document.getElementById('authScreen');
const mainApp = document.getElementById('mainApp');
const verifyScreen = document.getElementById('verifyScreen');

// Auth elements
const googleBtn = document.getElementById('googleSignIn');
const authError = document.getElementById('authError');
const authTabs = document.querySelectorAll('.auth-tab');
const authForm = document.getElementById('authForm');
const authSubmit = document.getElementById('authSubmit');
const displayNameGroup = document.getElementById('displayNameGroup');
const passwordHint = document.getElementById('passwordHint');
const resendVerification = document.getElementById('resendVerification');

let authMode = 'login';

// Auth tabs (login/register)
authTabs.forEach(tab => {
    tab.addEventListener('click', () => {
        authTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        authMode = tab.dataset.tab;
        const isRegister = authMode === 'register';
        authSubmit.textContent = isRegister ? 'Crear cuenta' : 'Iniciar sesión';
        displayNameGroup.classList.toggle('hidden', !isRegister);
        passwordHint.classList.toggle('hidden', !isRegister);
        authError.classList.remove('show');
    });
});

// Google Sign In
googleBtn.addEventListener('click', async () => {
    googleBtn.disabled = true;
    authError.classList.remove('show');

    try {
        await signInWithPopup(auth, googleProvider);
    } catch (error) {
        let message = 'Error de autenticación';
        if (error.code === 'auth/popup-closed-by-user') message = 'Inicio de sesión cancelado';
        if (error.code === 'auth/popup-blocked') message = 'El popup fue bloqueado. Permite popups para este sitio.';

        authError.textContent = message;
        authError.classList.add('show');
    }

    googleBtn.disabled = false;
});

// Email/Password Auth
authForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('authEmail').value;
    const password = document.getElementById('authPassword').value;
    const displayName = document.getElementById('authDisplayName')?.value;

    authSubmit.disabled = true;
    authError.classList.remove('show');

    try {
        if (authMode === 'login') {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            if (!userCredential.user.emailVerified) {
                showVerifyScreen(userCredential.user);
            }
        } else {
            // Validate password strength
            if (!isPasswordStrong(password)) {
                throw { code: 'auth/weak-password-custom' };
            }

            const userCredential = await createUserWithEmailAndPassword(auth, email, password);

            // Set display name
            await updateProfile(userCredential.user, { displayName });

            // Send verification email
            await sendEmailVerification(userCredential.user);

            showVerifyScreen(userCredential.user);
        }
    } catch (error) {
        let message = 'Error de autenticación';
        if (error.code === 'auth/user-not-found') message = 'Usuario no encontrado';
        if (error.code === 'auth/wrong-password') message = 'Contraseña incorrecta';
        if (error.code === 'auth/invalid-credential') message = 'Credenciales inválidas';
        if (error.code === 'auth/email-already-in-use') message = 'Este email ya está registrado';
        if (error.code === 'auth/weak-password') message = 'La contraseña debe tener al menos 6 caracteres';
        if (error.code === 'auth/weak-password-custom') message = 'La contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula y un número';
        if (error.code === 'auth/invalid-email') message = 'Email inválido';

        authError.textContent = message;
        authError.classList.add('show');
    }

    authSubmit.disabled = false;
});

// Password strength validation
function isPasswordStrong(password) {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    return password.length >= minLength && hasUpperCase && hasLowerCase && hasNumber;
}

// Show verification screen
function showVerifyScreen(user) {
    authScreen.classList.add('hidden');
    mainApp.classList.add('hidden');
    verifyScreen.classList.remove('hidden');
    document.getElementById('verifyEmail').textContent = user.email;
}

// Resend verification email
resendVerification.addEventListener('click', async () => {
    resendVerification.disabled = true;
    resendVerification.textContent = 'Enviando...';

    try {
        await sendEmailVerification(auth.currentUser);
        resendVerification.textContent = 'Email enviado';
        setTimeout(() => {
            resendVerification.textContent = 'Reenviar email';
            resendVerification.disabled = false;
        }, 3000);
    } catch (error) {
        resendVerification.textContent = 'Error al enviar';
        setTimeout(() => {
            resendVerification.textContent = 'Reenviar email';
            resendVerification.disabled = false;
        }, 3000);
    }
});

// Auth state observer
onAuthStateChanged(auth, (user) => {
    loadingScreen.classList.add('hidden');

    if (user) {
        // Check if email needs verification (only for email/password users)
        const isEmailProvider = user.providerData.some(p => p.providerId === 'password');
        if (isEmailProvider && !user.emailVerified) {
            showVerifyScreen(user);
            return;
        }

        currentUser = user;
        const displayName = user.displayName || user.email;
        document.getElementById('userEmail').textContent = displayName;
        authScreen.classList.add('hidden');
        verifyScreen.classList.add('hidden');
        mainApp.classList.remove('hidden');
        subscribeToQuotes();
    } else {
        currentUser = null;
        if (unsubscribe) unsubscribe();
        authScreen.classList.remove('hidden');
        verifyScreen.classList.add('hidden');
        mainApp.classList.add('hidden');
    }
});

// Logout
window.logout = async () => {
    await signOut(auth);
};

// Subscribe to quotes
function subscribeToQuotes() {
    const q = query(
        collection(db, 'quotes'),
        where('userId', '==', currentUser.uid),
        orderBy('createdAt', 'desc')
    );

    unsubscribe = onSnapshot(q, (snapshot) => {
        quotes = snapshot.docs.map(d => ({
            id: d.id,
            ...d.data()
        }));
        renderQuotes();
        updateStats();
    });

    // Subscribe to collections
    const collectionsQuery = query(
        collection(db, 'collections'),
        where('userId', '==', currentUser.uid)
    );

    unsubscribeCollections = onSnapshot(collectionsQuery, (snapshot) => {
        collections = snapshot.docs.map(d => ({
            id: d.id,
            ...d.data()
        }));
        // Sort by name in client
        collections.sort((a, b) => a.name.localeCompare(b.name));
        updateCollectionSelects();
    });
}

// Update collection dropdowns
function updateCollectionSelects() {
    const selects = [
        document.getElementById('filterCollection'),
        document.getElementById('quoteCollection')
    ];

    selects.forEach((select, index) => {
        const currentValue = select.value;
        const defaultOption = index === 0 ? 'Todas las colecciones' : 'Sin colección';

        select.innerHTML = `<option value="">${defaultOption}</option>` +
            collections.map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('');

        select.value = currentValue;
    });
}

// Modal functions
window.openModal = (quoteId = null) => {
    const modal = document.getElementById('modal');
    const form = document.getElementById('quoteForm');
    const title = document.getElementById('modalTitle');

    form.reset();
    document.getElementById('quoteId').value = '';
    document.getElementById('quoteCollection').value = '';

    if (quoteId) {
        const quote = quotes.find(q => q.id === quoteId);
        if (quote) {
            title.textContent = 'Editar cita';
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
        title.textContent = 'Nueva cita';
    }

    modal.classList.add('active');
};

window.closeModal = () => {
    document.getElementById('modal').classList.remove('active');
};

// Form submission
document.getElementById('quoteForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const saveBtn = document.getElementById('saveBtn');
    saveBtn.disabled = true;
    saveBtn.textContent = 'Guardando...';

    const id = document.getElementById('quoteId').value;
    const collectionId = document.getElementById('quoteCollection').value;

    const quoteData = {
        text: document.getElementById('quoteText').value.trim(),
        author: document.getElementById('quoteAuthor').value.trim(),
        source: document.getElementById('quoteSource').value.trim(),
        collectionId: collectionId || null,
        stance: document.getElementById('quoteStance').value,
        tags: document.getElementById('quoteTags').value
            .split(',')
            .map(t => t.trim().toLowerCase())
            .filter(Boolean),
        notes: document.getElementById('quoteNotes').value.trim(),
        userId: currentUser.uid,
        updatedAt: new Date().toISOString()
    };

    try {
        if (id) {
            await updateDoc(doc(db, 'quotes', id), quoteData);
        } else {
            quoteData.createdAt = new Date().toISOString();
            quoteData.favorite = false;
            await addDoc(collection(db, 'quotes'), quoteData);
        }
        closeModal();
        showToast(id ? 'Cita actualizada' : 'Cita guardada', 'success');
    } catch (error) {
        console.error('Error saving quote:', error);
        showToast('Error al guardar la cita', 'error');
    }

    saveBtn.disabled = false;
    saveBtn.textContent = 'Guardar';
});

// Delete quote
window.deleteQuote = (id) => {
    showConfirm(
        '¿Eliminar esta cita?',
        'Esta acción no se puede deshacer.',
        'Eliminar',
        async () => {
            try {
                await deleteDoc(doc(db, 'quotes', id));
                showToast('Cita eliminada', 'success');
            } catch (error) {
                console.error('Error deleting quote:', error);
                showToast('Error al eliminar la cita', 'error');
            }
        }
    );
};

// Render quotes
function renderQuotes() {
    if (currentView === 'compare') {
        renderCompareView();
        return;
    }

    const list = document.getElementById('quotesList');
    const emptyState = document.getElementById('emptyState');
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const filterCollection = document.getElementById('filterCollection').value;
    const filterStance = document.getElementById('filterStance').value;
    const filterFavorite = document.getElementById('filterFavorite').value;
    const sortBy = document.getElementById('sortBy').value;

    let filtered = quotes.filter(q => {
        const matchesSearch = !searchTerm ||
            q.text.toLowerCase().includes(searchTerm) ||
            q.author.toLowerCase().includes(searchTerm) ||
            (q.source && q.source.toLowerCase().includes(searchTerm)) ||
            (q.tags && q.tags.some(t => t.includes(searchTerm)));
        const matchesCollection = !filterCollection || q.collectionId === filterCollection;
        const matchesStance = !filterStance || q.stance === filterStance;
        const matchesFavorite = !filterFavorite || q.favorite === true;
        return matchesSearch && matchesCollection && matchesStance && matchesFavorite;
    });

    // Sort
    filtered.sort((a, b) => {
        if (sortBy === 'oldest') return new Date(a.createdAt) - new Date(b.createdAt);
        if (sortBy === 'author') return a.author.localeCompare(b.author);
        return new Date(b.createdAt) - new Date(a.createdAt); // newest
    });

    if (filtered.length === 0) {
        list.innerHTML = '';
        emptyState.classList.remove('hidden');
        return;
    }

    emptyState.classList.add('hidden');

    list.innerHTML = filtered.map(q => {
        const collectionName = q.collectionId ? collections.find(c => c.id === q.collectionId)?.name : null;
        return `
        <article class="quote-card">
            <div class="quote-header">
                <button class="favorite-btn ${q.favorite ? 'active' : ''}" onclick="toggleFavorite('${q.id}', ${!q.favorite})" title="${q.favorite ? 'Quitar de destacados' : 'Destacar'}">
                    <svg viewBox="0 0 24 24" fill="${q.favorite ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                    </svg>
                </button>
            </div>
            <p class="quote-text">${escapeHtml(q.text)}</p>
            <div class="quote-meta">
                <div>
                    <div class="quote-author">— ${escapeHtml(q.author)}</div>
                    ${q.source ? `<div class="quote-source">${escapeHtml(q.source)}</div>` : ''}
                </div>
                <div class="quote-tags">
                    ${collectionName ? `<span class="collection-tag">${escapeHtml(collectionName)}</span>` : ''}
                    <span class="stance stance-${q.stance}">${getStanceLabel(q.stance)}</span>
                    ${(q.tags || []).map(t => `<span class="tag">${escapeHtml(t)}</span>`).join('')}
                </div>
            </div>
            ${q.notes ? `<div class="quote-notes"><strong>Notas:</strong> ${escapeHtml(q.notes)}</div>` : ''}
            <div class="quote-actions">
                <button class="action-btn" onclick="openModal('${q.id}')">Editar</button>
                <button class="action-btn delete" onclick="deleteQuote('${q.id}')">Eliminar</button>
            </div>
        </article>
    `}).join('');
}

// Render compare view (favor vs contra)
function renderCompareView() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const filterCollection = document.getElementById('filterCollection').value;

    let filtered = quotes.filter(q => {
        const matchesSearch = !searchTerm ||
            q.text.toLowerCase().includes(searchTerm) ||
            q.author.toLowerCase().includes(searchTerm);
        const matchesCollection = !filterCollection || q.collectionId === filterCollection;
        return matchesSearch && matchesCollection && (q.stance === 'favor' || q.stance === 'contra');
    });

    const favor = filtered.filter(q => q.stance === 'favor');
    const against = filtered.filter(q => q.stance === 'contra');

    document.getElementById('quotesFavor').innerHTML = favor.length > 0
        ? favor.map(q => `
            <div class="compare-quote">
                <p class="quote-text">${escapeHtml(q.text)}</p>
                <div class="quote-author">— ${escapeHtml(q.author)}</div>
            </div>
        `).join('')
        : '<p class="empty-compare">No hay citas a favor</p>';

    document.getElementById('quotesAgainst').innerHTML = against.length > 0
        ? against.map(q => `
            <div class="compare-quote">
                <p class="quote-text">${escapeHtml(q.text)}</p>
                <div class="quote-author">— ${escapeHtml(q.author)}</div>
            </div>
        `).join('')
        : '<p class="empty-compare">No hay citas en contra</p>';
}

// Toggle favorite
window.toggleFavorite = async (id, value) => {
    try {
        await updateDoc(doc(db, 'quotes', id), { favorite: value });
        showToast(value ? 'Cita destacada' : 'Cita sin destacar', 'success');
    } catch (error) {
        console.error('Error updating favorite:', error);
        showToast('Error al actualizar', 'error');
    }
};

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function getStanceLabel(stance) {
    const labels = {
        favor: 'A favor',
        contra: 'En contra',
        neutral: 'Neutral'
    };
    return labels[stance] || stance;
}

function updateStats() {
    document.getElementById('totalQuotes').textContent = quotes.length;
}

// Event listeners for filters
document.getElementById('searchInput').addEventListener('input', renderQuotes);
document.getElementById('filterCollection').addEventListener('change', renderQuotes);
document.getElementById('filterStance').addEventListener('change', renderQuotes);
document.getElementById('filterFavorite').addEventListener('change', renderQuotes);
document.getElementById('sortBy').addEventListener('change', renderQuotes);

// View toggle
document.getElementById('viewList').addEventListener('click', () => {
    currentView = 'list';
    document.getElementById('viewList').classList.add('active');
    document.getElementById('viewCompare').classList.remove('active');
    document.getElementById('quotesList').classList.remove('hidden');
    document.getElementById('quotesCompare').classList.add('hidden');
    renderQuotes();
});

document.getElementById('viewCompare').addEventListener('click', () => {
    currentView = 'compare';
    document.getElementById('viewCompare').classList.add('active');
    document.getElementById('viewList').classList.remove('active');
    document.getElementById('quotesList').classList.add('hidden');
    document.getElementById('quotesCompare').classList.remove('hidden');
    renderQuotes();
});

// Collection modal functions
window.openNewCollectionModal = () => {
    document.getElementById('newCollectionName').value = '';
    document.getElementById('collectionModal').classList.add('active');
};

window.closeCollectionModal = () => {
    document.getElementById('collectionModal').classList.remove('active');
};

window.createCollection = async () => {
    const name = document.getElementById('newCollectionName').value.trim();
    if (!name) {
        showToast('Ingresa un nombre para la colección', 'error');
        return;
    }

    try {
        await addDoc(collection(db, 'collections'), {
            name,
            userId: currentUser.uid,
            createdAt: new Date().toISOString()
        });
        showToast('Colección creada', 'success');
        closeCollectionModal();
    } catch (error) {
        console.error('Error creating collection:', error);
        showToast('Error al crear colección', 'error');
    }
};

// Close modal on overlay click
document.getElementById('modal').addEventListener('click', function(e) {
    if (e.target === this) closeModal();
});

document.getElementById('collectionModal').addEventListener('click', function(e) {
    if (e.target === this) closeCollectionModal();
});

// Escape key closes modals
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeModal();
        closeCollectionModal();
    }
});
