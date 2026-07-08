
// PAGE CONTROLLER: ALMACÉN / INVENTARIO (100% localStorage, sin backend)

import { StorageService } from '../services/StorageService.js';

const STOCK_CRITICO = 20;
const COLECCION = 'inventarioLotes';
const DIAS_ALERTA_VENCIMIENTO = 30; // días de anticipación para "Próximo a Vencer"

function calcularEstadoVencimiento(fechaVencimiento) {
    if (!fechaVencimiento) return { estado: 'normal', dias: null };

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const vence = new Date(fechaVencimiento);
    vence.setHours(0, 0, 0, 0);

    const dias = Math.ceil((vence - hoy) / (1000 * 60 * 60 * 24));

    if (dias < 0) return { estado: 'vencido', dias };
    if (dias <= DIAS_ALERTA_VENCIMIENTO) return { estado: 'proximo', dias };
    return { estado: 'normal', dias };
}

function badgeVencimiento(fechaVencimiento) {
    const { estado, dias } = calcularEstadoVencimiento(fechaVencimiento);

    if (estado === 'vencido') {
        return `<span style="color:#b91c1c; font-weight:700;">${fmtFecha(fechaVencimiento)} <span class="badge badge-danger" style="margin-left:4px;">VENCIDO</span></span>`;
    }
    if (estado === 'proximo') {
        return `<span style="color:#d97706; font-weight:700;">${fmtFecha(fechaVencimiento)} <span class="badge" style="background:#fffbeb; color:#d97706; margin-left:4px;">PRÓXIMO A VENCER (${dias}d)</span></span>`;
    }
    return fmtFecha(fechaVencimiento);
}

function fmtFecha(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    return isNaN(d.getTime()) ? iso : d.toLocaleDateString('es-PE');
}

function badgeTipo(tipo) {
    const social = (tipo || '').toLowerCase().startsWith('soc');
    return `<span class="badge ${social ? 'badge-success' : 'badge-primary'}">${social ? 'Social' : 'Comercial'}</span>`;
}

function badgeEstado(estado) {
    const map = {
        'Aprobado': 'badge-success',
        'Pendiente': 'badge-primary',
        'Rechazado': 'badge-danger'
    };
    return `<span class="badge ${map[estado] || 'badge-primary'}">${estado}</span>`;
}

// Los lotes usan "loteId" como llave primaria (heredado del SQL original),
// no el "id" genérico de StorageService, así que actualizamos manualmente.
function actualizarLote(loteId, cambios) {
    const lotes = StorageService.getAll(COLECCION);
    const index = lotes.findIndex(l => l.loteId == loteId);
    if (index === -1) return null;
    lotes[index] = { ...lotes[index], ...cambios };
    StorageService.saveAll(COLECCION, lotes);
    return lotes[index];
}

/* ------------------------- Resumen agregado por fármaco ------------------------- */
function calcularResumenPorFarmaco(lotesAprobados) {
    const mapa = new Map();
    lotesAprobados.forEach(l => {
        const actual = mapa.get(l.farmaco) || { farmaco: l.farmaco, total: 0, tipo: l.tipo, lotes: 0 };
        actual.total += l.cantidad;
        actual.lotes += 1;
        mapa.set(l.farmaco, actual);
    });
    return Array.from(mapa.values()).sort((a, b) => a.total - b.total);
}

/* ------------------------- Stock + Alertas ------------------------- */
function cargarStock() {
    const tbody = document.getElementById('tabla-inventario');
    const alerts = document.getElementById('alerts-container');
    const resumenContainer = document.getElementById('resumen-stock-container');

    const dataAprobada = StorageService.getAll(COLECCION).filter(l => l.estado === 'Aprobado');

    // Un lote vencido ya no cuenta como stock disponible real
    const dataDisponible = dataAprobada.filter(l => calcularEstadoVencimiento(l.vencimiento).estado !== 'vencido');
    const dataVencida = dataAprobada.filter(l => calcularEstadoVencimiento(l.vencimiento).estado === 'vencido');

    const resumen = calcularResumenPorFarmaco(dataDisponible);

    // --- Alertas de stock crítico (sobre el total disponible, sin vencidos) ---
    const criticos = resumen.filter(r => r.total <= STOCK_CRITICO);
    let alertasHtml = criticos.map(r => `
        <div class="alert alert-danger">
            <i data-lucide="alert-triangle" class="alert-icon"></i>
            <div class="alert-content">
                <div class="alert-title">Stock Crítico</div>
                <strong>${r.farmaco}</strong> tiene solo ${r.total} unidades disponibles en total. Solicite reposición.
            </div>
        </div>
    `).join('');

    // --- Alertas de vencimiento ---
    const proximosAVencer = dataAprobada.filter(l => calcularEstadoVencimiento(l.vencimiento).estado === 'proximo');
    alertasHtml += proximosAVencer.map(l => {
        const { dias } = calcularEstadoVencimiento(l.vencimiento);
        return `
        <div class="alert" style="background:#fffbeb; border-color:#fde68a;">
            <i data-lucide="clock" class="alert-icon" style="color:#d97706;"></i>
            <div class="alert-content">
                <div class="alert-title" style="color:#92400e;">Próximo a Vencer</div>
                <strong>${l.farmaco}</strong> (Lote ${l.lote}) vence en ${dias} día${dias === 1 ? '' : 's'}.
            </div>
        </div>`;
    }).join('');

    alertasHtml += dataVencida.map(l => `
        <div class="alert alert-danger">
            <i data-lucide="x-octagon" class="alert-icon"></i>
            <div class="alert-content">
                <div class="alert-title">Lote Vencido</div>
                <strong>${l.farmaco}</strong> (Lote ${l.lote}) está vencido y ya no cuenta como stock disponible.
            </div>
        </div>`).join('');

    alerts.innerHTML = alertasHtml;

    // --- Resumen visual por fármaco ---
    if (!resumen.length) {
        resumenContainer.innerHTML = '';
    } else {
        resumenContainer.innerHTML = resumen.map(r => {
            const critico = r.total <= STOCK_CRITICO;
            return `
            <div class="card" style="padding: 14px 16px; border-left: 4px solid ${critico ? '#ef4444' : '#10b981'};">
                <div style="font-size: 0.8rem; color: #64748b; margin-bottom: 4px;">${r.farmaco}</div>
                <div style="font-size: 1.4rem; font-weight: 800; color: ${critico ? '#b91c1c' : '#0f172a'};">
                    ${r.total} <span style="font-size: 0.8rem; font-weight: 500; color: #94a3b8;">unds.</span>
                </div>
                <div style="font-size: 0.75rem; color: #94a3b8;">${r.lotes} lote${r.lotes > 1 ? 's' : ''} activo${r.lotes > 1 ? 's' : ''}</div>
            </div>`;
        }).join('');
    }

    // --- Detalle por lote (incluye vencidos, para que el almacenero los vea y los dé de baja) ---
    if (!dataAprobada.length) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted" style="padding:24px;">No hay productos aprobados en el inventario.</td></tr>';
    } else {
        tbody.innerHTML = dataAprobada.map(i => {
            const { estado } = calcularEstadoVencimiento(i.vencimiento);
            const filaVencida = estado === 'vencido' ? 'background:#fef2f2;' : '';
            return `
            <tr style="${filaVencida}">
                <td class="fw-medium">${i.farmaco}</td>
                <td class="text-muted">${i.lote}</td>
                <td>${badgeVencimiento(i.vencimiento)}</td>
                <td>${badgeTipo(i.tipo)}</td>
                <td style="${i.cantidad <= STOCK_CRITICO ? 'color: var(--color-danger-600); font-weight:bold;' : ''}">${i.cantidad} unds.</td>
            </tr>`;
        }).join('');
    }
    if (window.lucide) lucide.createIcons();
}

/* ------------------------- Órdenes por despachar ------------------------- */
function cargarDespachos() {
    const tbody = document.getElementById('tabla-ordenes');

    const data = StorageService.getAll('ordenesFarmacia').filter(o => o.estado === 'Pendiente de Despacho');

    if (!data.length) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted" style="padding:24px;">No hay órdenes pendientes.</td></tr>';
        return;
    }
    tbody.innerHTML = data.map(o => `
        <tr>
            <td class="fw-medium">${o.paciente || '—'}</td>
            <td>${o.farmaco}</td>
            <td>${o.cantidad}</td>
            <td>${badgeTipo(o.tipo)}</td>
            <td>
                <button class="btn btn-primary btn-sm btn-despachar" data-id="${o.id}">
                    <i data-lucide="check-circle" style="width:16px;height:16px;"></i> Despachar
                </button>
            </td>
        </tr>
    `).join('');

    document.querySelectorAll('.btn-despachar').forEach(btn => {
        btn.addEventListener('click', () => despachar(btn.getAttribute('data-id')));
    });
    if (window.lucide) lucide.createIcons();
}

function despachar(id) {
    const orden = StorageService.getAll('ordenesFarmacia').find(o => o.id == id);
    if (!orden) return;

    const ordenEsSocial = (orden.tipo || '').toLowerCase().startsWith('soc');

    const lotes = StorageService.getAll(COLECCION);
    const lote = lotes.find(l =>
        l.estado === 'Aprobado' &&
        l.farmaco === orden.farmaco &&
        l.cantidad > 0 &&
        calcularEstadoVencimiento(l.vencimiento).estado !== 'vencido' &&
        ((l.tipo || '').toLowerCase().startsWith('soc')) === ordenEsSocial
    );

    if (!lote) {
        alert(`⚠️ No hay stock de "${orden.farmaco}" en inventario ${ordenEsSocial ? 'SOCIAL' : 'COMERCIAL'}. No se puede despachar tomando stock del otro fondo sin antes reclasificar o reponer el lote.`);
        return;
    }

    StorageService.update('ordenesFarmacia', id, { estado: 'Despachado', fechaDespacho: new Date().toISOString() });
    actualizarLote(lote.loteId, { cantidad: lote.cantidad - orden.cantidad });

    alert('Orden despachada con éxito.');
    cargarDespachos();
    cargarStock();
}

/* ------------------------- Historial de recepción ------------------------- */
function cargarHistorial() {
    const tbody = document.getElementById('tabla-historial-recepcion');
    if (!tbody) return;

    const data = StorageService.getAll(COLECCION);

    if (!data.length) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted" style="padding:24px;">No se han registrado ingresos.</td></tr>';
        return;
    }
    tbody.innerHTML = data.map(l => `
        <tr>
            <td>${fmtFecha(l.fechaIngreso)}</td>
            <td class="fw-medium">${l.farmaco}</td>
            <td>${l.lote}</td>
            <td>${badgeVencimiento(l.vencimiento)}</td>
            <td>${l.proveedor || '—'}</td>
            <td style="font-weight:700;">${l.cantidad}</td>
            <td>${badgeTipo(l.tipo)}</td>
            <td>${badgeEstado(l.estado)}</td>
        </tr>
    `).join('');
    if (window.lucide) lucide.createIcons();
}

/* ------------------------- Registrar nuevo lote ------------------------- */
function conectarFormularioIngreso() {
    const form = document.getElementById('form-ingreso-mercaderia');
    if (!form) return;

    form.addEventListener('submit', (e) => {
        e.preventDefault();

        const lotes = StorageService.getAll(COLECCION);
        const nuevoLote = {
            loteId: Date.now(),
            farmaco: document.getElementById('ingreso-nombre').value.trim(),
            lote: document.getElementById('ingreso-lote').value.trim(),
            vencimiento: document.getElementById('ingreso-vencimiento').value,
            cantidad: parseInt(document.getElementById('ingreso-cantidad').value) || 0,
            proveedor: document.getElementById('ingreso-proveedor').value.trim(),
            tipo: document.getElementById('ingreso-tipo').value,
            fechaIngreso: new Date().toISOString().slice(0, 10),
            estado: 'Pendiente' // Requiere aprobación en Panel Admin
        };
        lotes.push(nuevoLote);
        StorageService.saveAll(COLECCION, lotes);

        alert('Lote registrado con éxito. Queda pendiente de aprobación.');
        form.reset();
        cargarHistorial();
    });
}

/* ------------------------- Sincronización entre pestañas ------------------------- */
// Si el Admin aprueba/rechaza un lote en otra pestaña, esta vista se refresca sola.
window.addEventListener('storage', (e) => {
    if (e.key === 'inventarioLotes') {
        cargarStock();
        cargarHistorial();
    }
    if (e.key === 'ordenesFarmacia') {
        cargarDespachos();
    }
});

/* ------------------------- Init ------------------------- */
cargarStock();
cargarDespachos();
cargarHistorial();
conectarFormularioIngreso();