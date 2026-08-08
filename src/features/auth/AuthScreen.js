import { Component } from '../../core/Component.js';
import { t } from '../../utils/i18n.js';

/**
 * AuthScreen — Pantalla de autenticación (login / registro).
 *
 * Renderiza el formulario de auth y gestiona:
 *  - Tabs login / registro
 *  - Google Sign In
 *  - Formulario email + contraseña
 *  - Mensajes de error
 *
 * El contenedor externo (`.auth-screen#authScreen`) y su clase `hidden`
 * son gestionados por AppShell; este componente solo rellena el interior.
 *
 * @example
 * const authScreen = new AuthScreen(document.getElementById('authScreen'), {
 *     authService,
 *     onNeedsVerification: (user) => verifyScreen.show(user)
 * });
 * authScreen.mount();
 */
export class AuthScreen extends Component {
    constructor(container, props = {}) {
        super(container, props);
        this._mode = 'login'; // 'login' | 'register'
    }

    render() {
        return `
            <div class="auth-box">
                <h1 data-i18n="app.title">Quote Vault</h1>
                <p data-i18n="app.subtitle">Tu repositorio personal de citas</p>

                <button class="btn-google" id="authGoogleSignIn" type="button">
                    <svg viewBox="0 0 24 24" width="20" height="20">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    <span data-i18n="auth.continueWithGoogle">Continuar con Google</span>
                </button>

                <div class="auth-divider">
                    <span data-i18n="auth.or">o</span>
                </div>

                <div class="auth-tabs">
                    <button type="button" class="auth-tab active" data-tab="login" data-i18n="auth.login">Iniciar sesión</button>
                    <button type="button" class="auth-tab" data-tab="register" data-i18n="auth.register">Registrarse</button>
                </div>

                <form class="auth-form" id="authFormInner">
                    <div class="form-group hidden" id="displayNameGroupInner">
                        <input type="text" id="authDisplayNameInner" data-i18n-aria-label="auth.displayNameLabel"
                            data-i18n-placeholder="auth.displayNamePlaceholder"
                            placeholder="Tu nombre o apodo" minlength="2">
                    </div>
                    <div class="form-group">
                        <input type="email" id="authEmailInner" data-i18n-aria-label="auth.emailLabel"
                            data-i18n-placeholder="auth.emailPlaceholder"
                            placeholder="Email" required>
                    </div>
                    <div class="form-group">
                        <input type="password" id="authPasswordInner" data-i18n-aria-label="auth.passwordLabel"
                            data-i18n-placeholder="auth.passwordPlaceholder"
                            placeholder="Contraseña" required minlength="8">
                        <small class="password-hint hidden" id="passwordHintInner"
                            data-i18n="auth.passwordHint">
                            Mínimo 8 caracteres, una mayúscula, una minúscula y un número
                        </small>
                    </div>
                    <button type="submit" class="btn btn-primary" id="authSubmitInner"
                        data-i18n="auth.login">Iniciar sesión</button>
                </form>

                <p class="auth-error" id="authErrorInner" role="alert" aria-live="assertive"></p>
            </div>
        `;
    }

    onMount() {
        const { authService } = this.props;

        const tabs       = this.$$('.auth-tab');
        const form       = this.$('#authFormInner');
        const googleBtn  = this.$('#authGoogleSignIn');
        const submitBtn  = this.$('#authSubmitInner');
        const nameGroup  = this.$('#displayNameGroupInner');
        const passHint   = this.$('#passwordHintInner');

        // ── Tab switching ──────────────────────────────────────────────────
        tabs.forEach(tab => {
            this.listen(tab, 'click', () => {
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                this._mode = tab.dataset.tab;

                const isRegister = this._mode === 'register';
                submitBtn.textContent = isRegister ? t('auth.createAccount') : t('auth.login');
                nameGroup.classList.toggle('hidden', !isRegister);
                passHint.classList.toggle('hidden', !isRegister);
                this._clearError();
            });
        });

        // ── Google Sign In ─────────────────────────────────────────────────
        this.listen(googleBtn, 'click', async () => {
            googleBtn.disabled = true;
            googleBtn.setAttribute('aria-busy', 'true');
            this._clearError();
            try {
                await authService.signInWithGoogle();
            } catch (error) {
                this._showError(error.code);
            }
            googleBtn.disabled = false;
            googleBtn.removeAttribute('aria-busy');
        });

        // ── Email / Password ───────────────────────────────────────────────
        this.listen(form, 'submit', async (e) => {
            e.preventDefault();
            const email       = this.$('#authEmailInner').value;
            const password    = this.$('#authPasswordInner').value;
            const displayName = this.$('#authDisplayNameInner')?.value;

            submitBtn.disabled = true;
            submitBtn.setAttribute('aria-busy', 'true');
            this._clearError();

            try {
                if (this._mode === 'login') {
                    const user = await authService.signInWithEmail(email, password);
                    if (authService.needsEmailVerification(user)) {
                        this.props.onNeedsVerification?.(user);
                    }
                } else {
                    await authService.registerWithEmail(email, password, displayName);
                }
            } catch (error) {
                this._showError(error.code);
            }
            submitBtn.disabled = false;
            submitBtn.removeAttribute('aria-busy');
        });
    }

    // ── API Pública ──────────────────────────────────────────────────────────

    show() { this._container.classList.remove('hidden'); }
    hide() { this._container.classList.add('hidden'); }

    // ── Internos ─────────────────────────────────────────────────────────────

    _showError(errorCode) {
        const el = this.$('#authErrorInner');
        if (el) {
            el.textContent = this.props.authService.getErrorMessage(errorCode);
            el.classList.add('show');
        }
    }

    _clearError() {
        this.$('#authErrorInner')?.classList.remove('show');
    }
}
