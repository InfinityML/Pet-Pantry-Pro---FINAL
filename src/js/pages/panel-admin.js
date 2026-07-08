/**
 * ============================================================================
 * PAGE CONTROLLER: ADMIN DASHBOARD
 * ============================================================================
 */
import { StorageService } from '../services/StorageService.js';
import { formatCurrency, formatDate } from '../utils/formatters.js';

class AdminDashboard {
    constructor() {
        this.init();
    }

    async init() {
        await this.loadData();
    }

    async loadData() {
        this.renderKPIs();
        this.renderTrazabilidad();
    }

    renderKPIs() {
        const fondoBase = parseFloat(localStorage.getItem('fondoSocialBase')) || 0;
        const donaciones = StorageService.getAll('donacionesFondoSocial');
        const totalDonado = donaciones.reduce((sum, d) => sum + (d.monto || 0), 0);
        const fondoActual = fondoBase + totalDonado;

        const postulaciones = StorageService.getAll('postulacionesAdopcion');
        const adopcionesPendientes = postulaciones.filter(p => p.estado === 'Pendiente').length;

        document.getElementById('kpi-fondo').textContent = formatCurrency(fondoActual);
        document.getElementById('kpi-adopciones').textContent = adopcionesPendientes;
    }

    renderTrazabilidad() {
        const tabla = document.getElementById('tabla-trazabilidad');

        // Unimos movimientos de inventario + donaciones/suscripciones reales
        const movimientosLotes = StorageService.getAll('inventarioLotes').map(l => ({
            fecha: l.fechaIngreso,
            accion: (l.tipo || '').toLowerCase() === 'social' ? 'Despacho Social' : 'Ingreso de Inventario',
            insumo: l.farmaco,
            impacto: (l.tipo || '').toLowerCase() === 'social' ? 0 : null,
            estado: l.estado
        }));

        const movimientosFondo = StorageService.getAll('donacionesFondoSocial').map(d => ({
            fecha: d.fecha,
            accion: d.tipo,
            insumo: `Aporte de ${d.usuario}`,
            impacto: d.monto,
            estado: 'Completado'
        }));

        const transacciones = [...movimientosLotes, ...movimientosFondo]
            .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
            .slice(0, 8);

        if (!transacciones.length) {
            tabla.innerHTML = '<tr><td colspan="5" class="text-center text-muted" style="padding:24px;">Sin movimientos registrados.</td></tr>';
            return;
        }

        tabla.innerHTML = transacciones.map(t => `
            <tr>
                <td class="text-muted">${formatDate(t.fecha)}</td>
                <td class="fw-medium">${t.accion}</td>
                <td>${t.insumo}</td>
                <td class="${t.impacto === 0 || t.impacto === null ? 'text-muted' : 'text-success'}">
                    ${t.impacto === 0 ? 'Fondo Social' : (t.impacto === null ? '—' : formatCurrency(t.impacto))}
                </td>
                <td>
                    <span class="badge ${t.estado === 'Aprobado' ? 'badge-primary' : 'badge-success'}">
                        ${t.estado}
                    </span>
                </td>
            </tr>
        `).join('');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new AdminDashboard();
});

// ============================================================================
// LÓGICA DE APROBACIÓN DE INVENTARIO (localStorage, sin backend)
// ============================================================================
function actualizarLote(loteId, cambios) {
    const lotes = StorageService.getAll('inventarioLotes');
    const index = lotes.findIndex(l => l.loteId == loteId);
    if (index === -1) return null;
    lotes[index] = { ...lotes[index], ...cambios };
    StorageService.saveAll('inventarioLotes', lotes);
    return lotes[index];
}

function cargarLotesPorAprobar() {
    const tbody = document.getElementById('tabla-lotes-pendientes');
    if (!tbody) return;

    const pendientes = StorageService.getAll('inventarioLotes').filter(l => l.estado === 'Pendiente');

    if (pendientes.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted" style="padding:24px;">No hay lotes pendientes de aprobación.</td></tr>';
        return;
    }

    tbody.innerHTML = pendientes.map(l => `
        <tr>
            <td class="text-muted">${formatDate(l.fechaIngreso)}</td>
            <td style="font-weight:600; color:#0f172a;">${l.farmaco}</td>
            <td>${l.lote}</td>
            <td style="font-weight:700;">${l.cantidad} und.</td>
            <td>
                <span class="badge" style="background:${(l.tipo || '').toLowerCase() === 'social' ? '#ecfdf5' : '#fffbeb'}; color:${(l.tipo || '').toLowerCase() === 'social' ? '#059669' : '#d97706'}; padding:4px 8px; font-size:0.7rem; font-weight:700;">
                    ${(l.tipo || 'COMERCIAL').toUpperCase()}
                </span>
            </td>
            <td>
                <div style="display:flex; gap:8px;">
                    <button class="btn" style="background:#10b981; color:white; border:none; padding:6px 12px; border-radius:6px; cursor:pointer; font-size:0.85rem;" onclick="window.resolverLote(${l.loteId}, 'aprobar')">Aprobar</button>
                    <button class="btn" style="background:#ef4444; color:white; border:none; padding:6px 12px; border-radius:6px; cursor:pointer; font-size:0.85rem;" onclick="window.resolverLote(${l.loteId}, 'rechazar')">Rechazar</button>
                </div>
            </td>
        </tr>
    `).join('');

    if (window.lucide) lucide.createIcons();
}

window.resolverLote = (id, accion) => {
    if (!confirm(`¿Estás seguro de que deseas ${accion.toUpperCase()} este lote de inventario?`)) return;

    const nuevoEstado = accion === 'aprobar' ? 'Aprobado' : 'Rechazado';
    actualizarLote(id, { estado: nuevoEstado });

    alert(`Lote ${nuevoEstado.toLowerCase()} con éxito.`);
    cargarLotesPorAprobar();
};

cargarLotesPorAprobar();

/* ------------------------- Sincronización entre pestañas ------------------------- */
window.addEventListener('storage', (e) => {
    if (e.key === 'inventarioLotes') {
        cargarLotesPorAprobar();
    }
});