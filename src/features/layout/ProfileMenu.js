import { Component } from '../../core/Component.js';
import { toast } from '../../utils/toast.js';
import { t } from '../../utils/i18n.js';

/**
 * ProfileMenu — Gestiona los menús de perfil (avatar + dropdown logout).
 *
 * Behavioral wrapper sobre todos los elementos `.header-profile-menu`
 * del DOM existente. Maneja apertura/cierre del dropdown y el logout.
 *
 * @example
 * const profile = new ProfileMenu(document.body, { authService });
 * profile.mount();
 */
export class ProfileMenu extends Component {
    // Behavioral wrapper: no reemplazar HTML existente
    mount() {
        if (this._mounted) return this;
        this._mounted = true;
        this.onMount();
        return this;
    }

    onMount() {
        const menus = document.querySelectorAll('.header-profile-menu');
        if (!menus.length) return;

        const closeAll = () => menus.forEach(m => m.classList.remove('open'));

        menus.forEach(menu => {
            const btn = menu.querySelector('.header-profile-btn');
            if (btn) {
                this.listen(btn, 'click', (e) => {
                    e.stopPropagation();
                    const wasOpen = menu.classList.contains('open');
                    closeAll();
                    if (!wasOpen) menu.classList.add('open');
                });
            }

            const logoutBtn = menu.querySelector('.header-profile-logout');
            if (logoutBtn) {
                this.listen(logoutBtn, 'click', async () => {
                    closeAll();
                    try {
                        await this.props.authService.logout();
                    } catch (error) {
                        console.error('Unable to log out:', error);
                        toast.error(t('auth.errors.default'));
                    }
                });
            }
        });

        // Cerrar al hacer click fuera
        this.listen(document, 'click', (e) => {
            menus.forEach(menu => {
                if (!menu.contains(e.target)) menu.classList.remove('open');
            });
        });
    }

    /**
     * Actualiza el avatar y nombre de usuario en todos los menús de perfil.
     * @param {object} user - Firebase user
     * @param {string} displayName
     * @param {string|null} photoURL
     */
    updateUser(user, displayName, photoURL) {
        const initials = displayName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
        const avatarHtml = photoURL
            ? `<img src="${photoURL}" alt="" referrerpolicy="no-referrer">`
            : `<span>${initials}</span>`;

        // Avatar principal + clones en cabeceras wiki / insights
        const headerAvatar = document.getElementById('headerAvatar');
        if (headerAvatar) headerAvatar.innerHTML = avatarHtml;
        document.querySelectorAll('.header-avatar-clone').forEach(el => { el.innerHTML = avatarHtml; });

        // Nombre en cabecera principal + clones
        const headerUsername = document.getElementById('headerUsername');
        if (headerUsername) headerUsername.textContent = displayName;
        document.querySelectorAll('.header-username-clone').forEach(el => { el.textContent = displayName; });

        // Móvil
        const userEmailMobile = document.getElementById('userEmailMobile');
        if (userEmailMobile) userEmailMobile.textContent = displayName;
    }
}
