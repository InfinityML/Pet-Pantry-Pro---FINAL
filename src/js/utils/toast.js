/**
 * TOAST — Notificaciones no intrusivas (reemplazan a alert()).
 * Uso:  toast('Mensaje');   toast('Error...', 'error');
 * Cárgalo como script normal (NO module) ANTES de los demás scripts.
 */
(function () {
    if (window.toast) return;

    const style = document.createElement('style');
    style.textContent = `
    .ppp-toast-container{position:fixed;top:20px;right:20px;z-index:99999;display:flex;flex-direction:column;gap:10px;max-width:340px}
    .ppp-toast{display:flex;align-items:flex-start;gap:10px;padding:12px 14px;border-radius:10px;box-shadow:0 10px 25px rgba(0,0,0,.15);font-size:.88rem;line-height:1.4;color:#fff;opacity:0;transform:translateX(24px);transition:opacity .25s ease,transform .25s ease;white-space:pre-line;font-family:inherit}
    .ppp-toast.show{opacity:1;transform:translateX(0)}
    .ppp-toast.success{background:#059669}
    .ppp-toast.error{background:#dc2626}
    .ppp-toast.info{background:#2563eb}
    .ppp-toast .ppp-x{margin-left:auto;cursor:pointer;opacity:.85;font-weight:700}
    `;
    document.head.appendChild(style);

    const container = document.createElement('div');
    container.className = 'ppp-toast-container';
    const mount = () => { if (!container.parentNode && document.body) document.body.appendChild(container); };
    document.addEventListener('DOMContentLoaded', mount);
    mount();

    function detectar(msg) {
        const m = (msg || '').toLowerCase();
        if (/error|no se pudo|incorrect|obligatori|no hay|inv[aá]lid|fall|debe |no coinciden|ya (existe|fue|est[aá])|conexi[oó]n|no encontrad|insuficiente/.test(m)) return 'error';
        return 'success';
    }

    window.toast = function (message, type) {
        mount();
        type = type || detectar(message);
        const el = document.createElement('div');
        el.className = 'ppp-toast ' + type;
        const span = document.createElement('span'); span.textContent = String(message);
        const x = document.createElement('span'); x.className = 'ppp-x'; x.textContent = '✕';
        el.appendChild(span); el.appendChild(x);
        container.appendChild(el);
        requestAnimationFrame(() => el.classList.add('show'));
        const quitar = () => { el.classList.remove('show'); setTimeout(() => el.remove(), 250); };
        x.addEventListener('click', quitar);
        setTimeout(quitar, 4000);
    };
})();