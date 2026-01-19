/**
 * AuthService - Single Responsibility: Handles all authentication logic
 * Open/Closed Principle: Extensible for new providers without modifying existing code
 */
import { auth, googleProvider } from '../config/firebase.js';
import {
    onAuthStateChanged,
    signInWithPopup,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    sendEmailVerification,
    updateProfile,
    signOut
} from 'firebase/auth';
import { t } from '../utils/i18n.js';

class AuthService {
    constructor() {
        this.currentUser = null;
        this.listeners = [];
    }

    /**
     * Subscribe to authentication state changes
     * @param {Function} callback - Function to execute when state changes
     * @returns {Function} - Unsubscribe function
     */
    onAuthStateChange(callback) {
        this.listeners.push(callback);

        const unsubscribe = onAuthStateChanged(auth, (user) => {
            this.currentUser = user;
            this.listeners.forEach(listener => listener(user));
        });

        return () => {
            this.listeners = this.listeners.filter(l => l !== callback);
            unsubscribe();
        };
    }

    /**
     * Sign in with Google
     */
    async signInWithGoogle() {
        const result = await signInWithPopup(auth, googleProvider);
        return result.user;
    }

    /**
     * Sign in with email and password
     */
    async signInWithEmail(email, password) {
        const result = await signInWithEmailAndPassword(auth, email, password);
        return result.user;
    }

    /**
     * Register new user with email and password
     */
    async registerWithEmail(email, password, displayName) {
        if (!this.isPasswordStrong(password)) {
            throw { code: 'auth/weak-password-custom' };
        }

        const result = await createUserWithEmailAndPassword(auth, email, password);

        if (displayName) {
            await updateProfile(result.user, { displayName });
        }

        await sendEmailVerification(result.user);
        return result.user;
    }

    /**
     * Resend verification email
     */
    async resendVerificationEmail() {
        if (auth.currentUser) {
            await sendEmailVerification(auth.currentUser);
        }
    }

    /**
     * Sign out
     */
    async logout() {
        await signOut(auth);
        this.currentUser = null;
    }

    /**
     * Check if password meets security requirements
     */
    isPasswordStrong(password) {
        const minLength = 8;
        const hasUpperCase = /[A-Z]/.test(password);
        const hasLowerCase = /[a-z]/.test(password);
        const hasNumber = /[0-9]/.test(password);
        return password.length >= minLength && hasUpperCase && hasLowerCase && hasNumber;
    }

    /**
     * Check if user needs email verification
     */
    needsEmailVerification(user) {
        if (!user) return false;
        const isEmailProvider = user.providerData.some(p => p.providerId === 'password');
        return isEmailProvider && !user.emailVerified;
    }

    /**
     * Get current user
     */
    getCurrentUser() {
        return this.currentUser;
    }

    /**
     * Get user display name
     */
    getDisplayName(user = this.currentUser) {
        if (!user) return '';
        return user.displayName || user.email;
    }

    /**
     * Translate Firebase error codes to localized messages
     */
    getErrorMessage(errorCode) {
        const errorKeys = {
            'auth/user-not-found': 'auth.errors.userNotFound',
            'auth/wrong-password': 'auth.errors.wrongPassword',
            'auth/invalid-credential': 'auth.errors.invalidCredential',
            'auth/email-already-in-use': 'auth.errors.emailInUse',
            'auth/weak-password': 'auth.errors.weakPassword',
            'auth/weak-password-custom': 'auth.errors.weakPasswordCustom',
            'auth/invalid-email': 'auth.errors.invalidEmail',
            'auth/popup-closed-by-user': 'auth.errors.popupClosed',
            'auth/popup-blocked': 'auth.errors.popupBlocked'
        };
        const key = errorKeys[errorCode] || 'auth.errors.default';
        return t(key);
    }
}

// Singleton pattern - single service instance
export const authService = new AuthService();
