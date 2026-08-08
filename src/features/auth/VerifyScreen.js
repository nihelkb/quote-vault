import { Component } from '../../core/Component.js';
import { t } from '../../utils/i18n.js';

/**
 * VerifyScreen — Pantalla de verificación de email.
 *
 * Muestra el email del usuario, el botón para reenviar el correo de
 * verificación y el enlace para usar otra cuenta (logout).
 *
 * El contenedor externo (`.auth-screen#verifyScreen`) y su visibilidad
 * son gestionados por AppShell.
 *
 * @example
 * const verifyScreen = new VerifyScreen(document.getElementById('verifyScreen'), {
 *     authService,
 *     onLogout: () => {} // handled by auth state change
 * });
 * verifyScreen.mount();
 * verifyScreen.show(user);
 */
export class VerifyScreen extends Component {
    render() {
        return `
            <div class="auth-box">
                <h1 data-i18n="auth.verifyEmail">Verifica tu email</h1>
                <p data-i18n="auth.verificationSent">Hemos enviado un enlace de verificación a:</p>
                <p class="verify-email" id="verifyEmailInner"></p>
                <p class="verify-instructions" data-i18n="auth.verificationInstructions">
                    Revisa tu bandeja de entrada (y spam) y haz clic en el enlace para activar tu cuenta.
                </p>
                <button class="btn btn-secondary" id="resendVerificationInner"
                    data-i18n="auth.resendEmail">Reenviar email</button>
                <button class="btn btn-primary" id="checkVerificationInner"
                    data-i18n="auth.alreadyVerified">Ya he verificado</button>
                <button class="btn-link" id="useAnotherAccountInner"
                    data-i18n="auth.useAnotherAccount">Usar otra cuenta</button>
                <p class="auth-error" id="verifyStatusInner" role="status" aria-live="polite"></p>
            </div>
        `;
    }

    onMount() {
        const { authService } = this.props;
        const resendBtn = this.$('#resendVerificationInner');
        const checkBtn  = this.$('#checkVerificationInner');
        const otherBtn  = this.$('#useAnotherAccountInner');
        const statusEl  = this.$('#verifyStatusInner');

        // ── Reenviar verificación ──────────────────────────────────────────
        this.listen(resendBtn, 'click', async () => {
            resendBtn.disabled = true;
            resendBtn.textContent = t('auth.sending');
            try {
                await authService.resendVerificationEmail();
                resendBtn.textContent = t('auth.emailSent');
            } catch {
                resendBtn.textContent = t('auth.sendError');
            }
            this._resendTimer = setTimeout(() => {
                resendBtn.textContent = t('auth.resendEmail');
                resendBtn.disabled = false;
            }, 3000);
        });

        this.listen(checkBtn, 'click', async () => {
            checkBtn.disabled = true;
            statusEl.textContent = t('auth.checkingVerification');
            try {
                const user = await authService.refreshCurrentUser();
                if (user?.emailVerified) {
                    statusEl.textContent = t('auth.verified');
                    this.props.onVerified?.(user);
                } else {
                    statusEl.textContent = t('auth.notVerifiedYet');
                }
            } catch (error) {
                statusEl.textContent = authService.getErrorMessage(error.code);
            } finally {
                checkBtn.disabled = false;
            }
        });

        // ── Usar otra cuenta (logout) ──────────────────────────────────────
        this.listen(otherBtn, 'click', async () => {
            try { await authService.logout(); }
            catch (error) { statusEl.textContent = authService.getErrorMessage(error.code); }
        });
    }

    onUnmount() { clearTimeout(this._resendTimer); }

    // ── API Pública ──────────────────────────────────────────────────────────

    show(user) {
        const emailEl = this.$('#verifyEmailInner');
        if (emailEl) emailEl.textContent = user?.email ?? '';
        this._container.classList.remove('hidden');
    }

    hide() {
        this._container.classList.add('hidden');
    }
}
