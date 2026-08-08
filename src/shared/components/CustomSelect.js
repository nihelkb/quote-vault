/**
 * CustomSelect — Wrapper de comportamiento para el widget .custom-select.
 *
 * Inicializa la lógica del dropdown sobre elementos ya renderizados en el DOM
 * (los .custom-select están en index.html o generados como strings en templates).
 * No renderiza HTML propio; actúa como adaptador de comportamiento.
 *
 * Principios SOLID aplicados:
 *  - S (Single Responsibility): encapsula solo el comportamiento del dropdown.
 *    Abrir/cerrar, seleccionar opción, posicionarse dentro de modales.
 *  - O (Open/Closed): extensible subclasificando; no hay que tocar esta clase
 *    para añadir nuevos tipos de select.
 *  - D (Dependency Inversion): el callback onChange es inyectado, no hardcodeado.
 *
 * Reemplaza: setupCustomSelect(customSelect, hiddenSelect, onChangeCallback)
 *
 * @example
 * const select = new CustomSelect(
 *     document.getElementById('stanceSelect'),
 *     document.getElementById('filterStance'),
 *     () => renderQuotes()
 * );
 * select.mount();
 * // Más tarde:
 * select.unmount();
 */
export class CustomSelect {
    /**
     * @param {HTMLElement|string} element    - El .custom-select wrapper
     * @param {HTMLElement|string} hiddenSelect - El <select> hidden subyacente
     * @param {Function|null} [onChange=null] - Callback al seleccionar una opción
     */
    constructor(element, hiddenSelect, onChange = null) {
        this._element = typeof element === 'string'
            ? document.querySelector(element)
            : element;
        this._hidden = typeof hiddenSelect === 'string'
            ? document.querySelector(hiddenSelect)
            : hiddenSelect;
        this._onChange = onChange;
        this._listeners = [];
        this._mounted = false;
    }

    /**
     * Inicializa los event listeners del dropdown.
     * @returns {this}
     */
    mount() {
        if (!this._element || !this._hidden) return this;

        const btn          = this._element.querySelector('.custom-select-btn');
        const dropdown     = this._element.querySelector('.custom-select-dropdown');
        const selectedText = btn?.querySelector('.selected-text');

        if (!btn || !dropdown || !selectedText) return this;

        // ── Abrir/cerrar al hacer click en el botón ────────────────────────
        const onBtnClick = (e) => {
            e.stopPropagation();

            // Cerrar otros dropdowns abiertos
            document.querySelectorAll('.custom-select.open').forEach(s => {
                if (s !== this._element) s.classList.remove('open');
            });

            const isOpening  = !this._element.classList.contains('open');
            const isInModal  = !!this._element.closest('.modal');

            // Posicionamiento fixed cuando está dentro de un modal
            // (evita que el overflow:hidden del modal lo recorte)
            if (isInModal && isOpening) {
                const rect = btn.getBoundingClientRect();
                dropdown.style.transition = 'none';
                dropdown.style.position   = 'fixed';
                dropdown.style.top        = `${rect.bottom + 4}px`;
                dropdown.style.left       = `${rect.left}px`;
                dropdown.style.width      = `${rect.width}px`;
                dropdown.offsetHeight;         // force reflow antes de re-habilitar transición
                dropdown.style.transition = '';
            }

            this._element.classList.toggle('open');
        };

        // ── Seleccionar opción (delegación sobre el dropdown) ──────────────
        const onDropdownClick = (e) => {
            const option = e.target.closest('.custom-select-option');
            if (!option) return;

            const value = option.dataset.value;
            const label = option.querySelector('span')?.textContent ?? '';

            // Actualizar el <select> hidden (fuente de verdad del valor)
            this._hidden.value = value;

            // Actualizar texto del botón
            selectedText.textContent = label;

            // Marcar opción activa
            dropdown.querySelectorAll('.custom-select-option').forEach(opt => {
                opt.classList.toggle('active', opt === option);
            });

            // Cerrar dropdown
            this._element.classList.remove('open');

            // Limpiar estilos fixed tras la animación de cierre
            if (dropdown.style.position === 'fixed') {
                setTimeout(() => {
                    if (!this._element.classList.contains('open')) {
                        dropdown.style.position = '';
                        dropdown.style.top      = '';
                        dropdown.style.left     = '';
                        dropdown.style.width    = '';
                    }
                }, 200); // debe coincidir con la duración de la transición CSS
            }

            // Propagar el cambio al <select> hidden para compatibilidad
            this._hidden.dispatchEvent(new Event('change'));

            // Llamar al callback del consumidor
            this._onChange?.();
        };

        // ── Cerrar al hacer click fuera ────────────────────────────────────
        const onDocClick = () => {
            this._element.classList.remove('open');
        };

        btn.addEventListener('click', onBtnClick);
        dropdown.addEventListener('click', onDropdownClick);
        document.addEventListener('click', onDocClick);

        this._listeners = [
            { el: btn,       event: 'click', handler: onBtnClick },
            { el: dropdown,  event: 'click', handler: onDropdownClick },
            { el: document,  event: 'click', handler: onDocClick },
        ];

        this._mounted = true;
        return this;
    }

    /**
     * Elimina todos los event listeners registrados.
     */
    unmount() {
        this._listeners.forEach(({ el, event, handler }) => {
            el.removeEventListener(event, handler);
        });
        this._listeners = [];
        this._element?.classList.remove('open');
        this._mounted = false;
    }

    /**
     * Establece el valor seleccionado programáticamente y actualiza la UI.
     * @param {string} value
     */
    setValue(value) {
        if (!this._element || !this._hidden) return;
        const dropdown     = this._element.querySelector('.custom-select-dropdown');
        const selectedText = this._element.querySelector('.selected-text');

        this._hidden.value = value;

        const option = dropdown?.querySelector(`[data-value="${CSS.escape(value)}"]`);
        if (option && selectedText) {
            selectedText.textContent = option.querySelector('span')?.textContent ?? '';
            dropdown.querySelectorAll('.custom-select-option').forEach(opt => {
                opt.classList.toggle('active', opt === option);
            });
        }
    }

    /**
     * Devuelve el valor actualmente seleccionado.
     * @returns {string}
     */
    getValue() {
        return this._hidden?.value ?? '';
    }
}
