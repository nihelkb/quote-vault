/**
 * Tooltip utility
 * Creates a single tooltip element on <body> and repositions it via
 * position:fixed + getBoundingClientRect, so it is never clipped by
 * any ancestor with overflow:hidden.
 */

const SHOW_DELAY = 250; // ms before the tooltip appears
const GAP = 8; // px between trigger and bubble

let el = null;
let current = null;
let showTimer = null;

// ---------------------------------------------------------------------------
// Bubble element (created once, reused)
// ---------------------------------------------------------------------------
function ensureEl() {
    if (el) return;
    el = document.createElement('div');
    el.className = 'tooltip-bubble';
    el.setAttribute('aria-hidden', 'true');
    document.body.appendChild(el);
}

// ---------------------------------------------------------------------------
// Position calculation
// ---------------------------------------------------------------------------
function applyPosition(trigger) {
    const pos = trigger.getAttribute('data-tooltip-position') || 'top';
    el.setAttribute('data-position', pos);

    const tr = trigger.getBoundingClientRect();
    const tw = el.offsetWidth;
    const th = el.offsetHeight;

    let x, y;
    switch (pos) {
        case 'bottom':
            x = tr.left + tr.width / 2 - tw / 2;
            y = tr.bottom + GAP;
            break;
        case 'left':
            x = tr.left - tw - GAP;
            y = tr.top + tr.height / 2 - th / 2;
            break;
        case 'right':
            x = tr.right + GAP;
            y = tr.top + tr.height / 2 - th / 2;
            break;
        default: // top
            x = tr.left + tr.width / 2 - tw / 2;
            y = tr.top - th - GAP;
            break;
    }

    // Clamp to viewport so it never spills off-screen
    x = Math.max(4, Math.min(x, window.innerWidth - tw - 4));
    y = Math.max(4, Math.min(y, window.innerHeight - th - 4));

    el.style.left = x + 'px';
    el.style.top  = y + 'px';
}

// ---------------------------------------------------------------------------
// Show / hide
// ---------------------------------------------------------------------------
function show(trigger) {
    const text = trigger.getAttribute('data-tooltip');
    if (!text) return;

    ensureEl();
    el.textContent = text;

    // Reset opacity so transition can re-run even if already visible
    el.style.opacity = '0';
    // Force reflow so the browser registers the 0 before the next set
    void el.offsetWidth;

    applyPosition(trigger);

    el.style.opacity = '1';
}

function hide() {
    if (!el) return;
    el.style.opacity = '0';
}

// ---------------------------------------------------------------------------
// Event delegation  (mouseover / mouseout bubble; works on dynamic elements)
// ---------------------------------------------------------------------------
document.addEventListener('mouseover', (e) => {
    const trigger = e.target.closest('[data-tooltip]');
    if (!trigger || trigger === current) return;

    clearTimeout(showTimer);
    if (current) hide();

    current = trigger;
    showTimer = setTimeout(() => show(trigger), SHOW_DELAY);
});

document.addEventListener('mouseout', (e) => {
    if (!current) return;
    // Ignore if the mouse moved to a child of the same trigger
    if (e.relatedTarget && current.contains(e.relatedTarget)) return;

    clearTimeout(showTimer);
    hide();
    current = null;
});

// Keyboard: show immediately on focus-visible, hide on blur
document.addEventListener('focusin', (e) => {
    if (!e.target.matches(':focus-visible')) return;
    const trigger = e.target.closest('[data-tooltip]');
    if (!trigger) return;

    clearTimeout(showTimer);
    if (current) hide();
    current = trigger;
    show(trigger);
});

document.addEventListener('focusout', () => {
    if (!current) return;
    clearTimeout(showTimer);
    hide();
    current = null;
});
