/**
 * ============================================================================
 * PAGE CONTROLLER: REPORTES (Impacto Social y Ventas/Operaciones)
 * ============================================================================
 * Todo se calcula 100% en el cliente a partir de localStorage (sin backend).
 */
import { StorageService } from '../services/StorageService.js';
import { formatCurrency, formatDate } from '../utils/formatters.js';

/* ------------------------------------------------------------------ */
/* Utilidades comunes                                                  */
/* ------------------------------------------------------------------ */

function toDateOnly(iso) {
    if (!iso) return null;
    const d = new Date(iso);
    if (isNaN(d.getTime())) return null;
    d.setHours(0, 0, 0, 0);
    return d;
}

function dentroDeRango(fechaIso, desde, hasta) {
    const fecha = toDateOnly(fechaIso);
    if (!fecha) return false;
    if (desde && fecha < desde) return false;
    if (hasta && fecha > hasta) return false;
    return true;
}

function leerRango(idDesde, idHasta) {
    const desdeVal = document.getElementById(idDesde).value;
    const hastaVal = document.getElementById(idHasta).value;
    const desde = desdeVal ? toDateOnly(desdeVal) : null;
    const hasta = hastaVal ? toDateOnly(hastaVal) : null;
    return { desde, hasta };
}

function mostrarVacio(tbody, colspan, mensaje) {
    tbody.innerHTML = `<tr><td colspan="${colspan}" class="empty-state">${mensaje}</td></tr>`;
}

function mesEtiqueta(iso) {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '—';
    return new Intl.DateTimeFormat('es-PE', { month: 'short', year: 'numeric' }).format(d);
}

/* Paleta de colores compartida por los gráficos */
const PALETA_GRAFICOS = ['#2563eb', '#f97316', '#10b981', '#d97706', '#7c3aed', '#dc2626', '#059669', '#0ea5e9'];

/* Guarda instancias de Chart.js activas para poder destruirlas antes de re-renderizar */
const chartsActivos = {};

function renderOVaciarChart(canvasId, tieneDatos, config) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const wrap = canvas.closest('.chart-wrap');

    if (chartsActivos[canvasId]) {
        chartsActivos[canvasId].destroy();
        delete chartsActivos[canvasId];
    }

    if (!tieneDatos) {
        wrap.innerHTML = '<div class="chart-empty">Sin datos suficientes para graficar en el rango seleccionado.</div>';
        return;
    }

    // Restaurar el canvas si antes se mostró el estado vacío
    if (!wrap.querySelector('canvas')) {
        wrap.innerHTML = `<canvas id="${canvasId}"></canvas>`;
    }
    const ctx = document.getElementById(canvasId).getContext('2d');
    chartsActivos[canvasId] = new Chart(ctx, config);
}

/* ------------------------------------------------------------------ */
/* REPORTE 1: IMPACTO SOCIAL                                           */
/* ------------------------------------------------------------------ */

let filasImpactoActual = []; // guarda las filas visibles para exportar exactamente lo mismo que se ve

function construirMovimientosImpacto(desde, hasta) {
    const movimientos = [];

    // 1. Donaciones y suscripciones (Fondo Social)
    StorageService.getAll('donacionesFondoSocial')
        .filter(d => dentroDeRango(d.fecha, desde, hasta))
        .forEach(d => {
            movimientos.push({
                fecha: d.fecha,
                tipo: d.tipo || 'Donación',
                detalle: d.tipo === 'Suscripción Padrino' ? 'Cuota mensual de padrinazgo' : 'Aporte voluntario al fondo social',
                actor: d.usuario || 'Anónimo',
                valorTexto: formatCurrency(d.monto || 0),
                valorNumero: d.monto || 0,
                unidad: 'monto'
            });
        });

    // 2. Adopciones concretadas
    StorageService.getAll('mascotasAdopcion')
        .filter(m => m.estado === 'Adoptado' && dentroDeRango(m.fechaAdopcion || m.updatedAt || m.createdAt, desde, hasta))
        .forEach(m => {
            movimientos.push({
                fecha: m.fechaAdopcion || m.updatedAt || m.createdAt,
                tipo: 'Adopción Concretada',
                detalle: `${m.nombre} (${m.raza || 'Mestizo'})`,
                actor: 'Nueva familia',
                valorTexto: '—',
                valorNumero: 0,
                unidad: 'adopcion'
            });
        });

    // 3. Atenciones médicas sociales
    StorageService.getAll('historiasClinicas')
        .filter(h => (h.tipo || '').toLowerCase() === 'social' && dentroDeRango(h.fecha, desde, hasta))
        .forEach(h => {
            movimientos.push({
                fecha: h.fecha,
                tipo: 'Atención Médica Social',
                detalle: h.diagnostico || 'Consulta social',
                actor: h.nombrePaciente || '—',
                valorTexto: '—',
                valorNumero: 0,
                unidad: 'atencion'
            });
        });

    // 4. Insumos/medicamentos entregados vía fondo social
    StorageService.getAll('ordenesFarmacia')
        .filter(o => (o.tipo || '').toLowerCase() === 'social' && o.estado === 'Despachado' && dentroDeRango(o.fechaDespacho, desde, hasta))
        .forEach(o => {
            movimientos.push({
                fecha: o.fechaDespacho,
                tipo: 'Entrega de Insumos',
                detalle: o.farmaco,
                actor: o.paciente || '—',
                valorTexto: `${o.cantidad} unds.`,
                valorNumero: o.cantidad || 0,
                unidad: 'insumo'
            });
        });

    return movimientos.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
}

function renderReporteImpacto() {
    const { desde, hasta } = leerRango('impacto-desde', 'impacto-hasta');
    const movimientos = construirMovimientosImpacto(desde, hasta);
    filasImpactoActual = movimientos;

    // --- KPIs ---
    const donaciones = movimientos.filter(m => m.unidad === 'monto');
    const totalRecaudado = donaciones.reduce((s, m) => s + m.valorNumero, 0);
    const adopciones = movimientos.filter(m => m.unidad === 'adopcion').length;
    const atenciones = movimientos.filter(m => m.unidad === 'atencion').length;
    const insumos = movimientos.filter(m => m.unidad === 'insumo').reduce((s, m) => s + m.valorNumero, 0);

    document.getElementById('ki-recaudado').textContent = formatCurrency(totalRecaudado);
    document.getElementById('ki-donaciones').textContent = donaciones.length;
    document.getElementById('ki-adoptadas').textContent = adopciones;
    document.getElementById('ki-atenciones').textContent = atenciones;
    document.getElementById('ki-insumos').textContent = `${insumos} unds.`;

    // --- Tabla ---
    const tbody = document.getElementById('tabla-impacto');
    if (!movimientos.length) {
        mostrarVacio(tbody, 5, 'No hay movimientos de impacto social en el rango seleccionado.');
        return;
    }

    tbody.innerHTML = movimientos.map(m => `
        <tr>
            <td class="text-muted">${formatDate(m.fecha)}</td>
            <td class="fw-medium">${m.tipo}</td>
            <td>${m.detalle}</td>
            <td>${m.actor}</td>
            <td class="${m.unidad === 'monto' ? 'text-success' : ''}" style="${m.unidad === 'monto' ? 'font-weight:700;' : ''}">${m.valorTexto}</td>
        </tr>
    `).join('');

    renderGraficosImpacto(movimientos);
}

function renderGraficosImpacto(movimientos) {
    // --- Gráfico circular: movimientos por tipo ---
    const conteoTipos = new Map();
    movimientos.forEach(m => conteoTipos.set(m.tipo, (conteoTipos.get(m.tipo) || 0) + 1));
    const etiquetasTipo = [...conteoTipos.keys()];
    const valoresTipo = [...conteoTipos.values()];

    renderOVaciarChart('chart-impacto-pie', etiquetasTipo.length > 0, {
        type: 'pie',
        data: {
            labels: etiquetasTipo,
            datasets: [{ data: valoresTipo, backgroundColor: PALETA_GRAFICOS }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } } }
        }
    });

    // --- Gráfico de barras: recaudación por mes ---
    const recaudacionPorMes = new Map();
    movimientos.filter(m => m.unidad === 'monto').forEach(m => {
        const etiqueta = mesEtiqueta(m.fecha);
        recaudacionPorMes.set(etiqueta, (recaudacionPorMes.get(etiqueta) || 0) + m.valorNumero);
    });
    // Orden cronológico: se reconstruye ordenando por la fecha original
    const mesesOrdenados = [...recaudacionPorMes.keys()];

    renderOVaciarChart('chart-impacto-barras', mesesOrdenados.length > 0, {
        type: 'bar',
        data: {
            labels: mesesOrdenados,
            datasets: [{
                label: 'Recaudado (S/)',
                data: mesesOrdenados.map(m => recaudacionPorMes.get(m)),
                backgroundColor: '#2563eb',
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true } }
        }
    });
}

/* ------------------------------------------------------------------ */
/* REPORTE 2: VENTAS Y OPERACIONES                                     */
/* ------------------------------------------------------------------ */

let filasVentasActual = [];

function construirVentas(desde, hasta) {
    return StorageService.getAll('ventasTienda')
        .filter(v => dentroDeRango(v.fecha, desde, hasta))
        .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
}

function renderReporteVentas() {
    const { desde, hasta } = leerRango('ventas-desde', 'ventas-hasta');
    const ventas = construirVentas(desde, hasta);
    filasVentasActual = ventas;

    // --- KPIs ---
    const totalVendido = ventas.reduce((s, v) => s + (v.total || 0), 0);
    const numVentas = ventas.length;
    const ticketPromedio = numVentas ? totalVendido / numVentas : 0;

    const conteoProductos = new Map();
    ventas.forEach(v => (v.items || []).forEach(it => {
        conteoProductos.set(it.nombre, (conteoProductos.get(it.nombre) || 0) + it.cantidad);
    }));
    let productoTop = '—';
    let maxCant = 0;
    conteoProductos.forEach((cant, nombre) => {
        if (cant > maxCant) { maxCant = cant; productoTop = nombre; }
    });

    document.getElementById('kv-total').textContent = formatCurrency(totalVendido);
    document.getElementById('kv-ventas').textContent = numVentas;
    document.getElementById('kv-ticket').textContent = formatCurrency(ticketPromedio);
    document.getElementById('kv-top').textContent = productoTop;

    // --- Tabla ---
    const tbody = document.getElementById('tabla-ventas');
    if (!ventas.length) {
        mostrarVacio(tbody, 6, 'No hay ventas registradas en el rango seleccionado.');
        return;
    }

    tbody.innerHTML = ventas.map(v => {
        const resumenProductos = (v.items || []).map(it => `${it.nombre} (x${it.cantidad})`).join(', ');
        return `
        <tr>
            <td class="text-muted">${formatDate(v.fecha)}</td>
            <td class="fw-medium">${v.usuario || 'Invitado'}</td>
            <td><span class="badge badge-primary">${v.canal || '—'}</span></td>
            <td style="white-space:normal; max-width:320px;">${resumenProductos || '—'}</td>
            <td>${v.totalItems || 0}</td>
            <td class="text-success" style="font-weight:700;">${formatCurrency(v.total || 0)}</td>
        </tr>`;
    }).join('');

    renderGraficosVentas(ventas, conteoProductos);
}

function renderGraficosVentas(ventas, conteoProductos) {
    // --- Gráfico circular: ventas por canal ---
    const conteoCanales = new Map();
    ventas.forEach(v => {
        const canal = v.canal || 'Sin canal';
        conteoCanales.set(canal, (conteoCanales.get(canal) || 0) + 1);
    });
    const etiquetasCanal = [...conteoCanales.keys()];
    const valoresCanal = [...conteoCanales.values()];

    renderOVaciarChart('chart-ventas-pie', etiquetasCanal.length > 0, {
        type: 'pie',
        data: {
            labels: etiquetasCanal,
            datasets: [{ data: valoresCanal, backgroundColor: PALETA_GRAFICOS }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } } }
        }
    });

    // --- Gráfico de barras: top 5 productos más vendidos ---
    const topProductos = [...conteoProductos.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

    renderOVaciarChart('chart-ventas-barras', topProductos.length > 0, {
        type: 'bar',
        data: {
            labels: topProductos.map(p => p[0]),
            datasets: [{
                label: 'Unidades vendidas',
                data: topProductos.map(p => p[1]),
                backgroundColor: '#f97316',
                borderRadius: 4
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { x: { beginAtZero: true } }
        }
    });
}

/* ------------------------------------------------------------------ */
/* EXPORTACIÓN: EXCEL (ExcelJS) y PDF (jsPDF + autotable)               */
/* Ambas exportaciones incluyen: tabla con formato de cuadro (bordes,   */
/* encabezado resaltado, columnas ajustadas) + imágenes de los gráficos */
/* ------------------------------------------------------------------ */

const COLOR_MARCA_EXCEL = 'FFEA580C'; // naranja de marca en formato ARGB
const BORDE_FINO = { style: 'thin', color: { argb: 'FFB0B7C3' } };

function descargarArchivo(contenido, nombre, tipoMime) {
    const blob = new Blob([contenido], { type: tipoMime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nombre;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function base64DeChart(canvasId) {
    const chart = chartsActivos[canvasId];
    if (!chart) return null;
    const dataUrl = chart.toBase64Image('image/png', 1);
    return dataUrl.split(',')[1]; // quita el prefijo "data:image/png;base64,"
}

/**
 * Aplica el formato de "cuadro ordenado" a la tabla de un reporte en ExcelJS:
 * encabezado resaltado, bordes en todas las celdas, columnas autoajustadas,
 * fila de encabezado fija y autofiltro.
 */
function formatearTablaExcel(worksheet, columnas, filas) {
    worksheet.columns = columnas;

    filas.forEach(fila => worksheet.addRow(fila));

    const filaEncabezado = worksheet.getRow(1);
    filaEncabezado.eachCell(celda => {
        celda.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        celda.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_MARCA_EXCEL } };
        celda.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
        celda.border = { top: BORDE_FINO, left: BORDE_FINO, right: BORDE_FINO, bottom: BORDE_FINO };
    });
    filaEncabezado.height = 22;

    worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return;
        row.eachCell({ includeEmpty: true }, celda => {
            celda.border = { top: BORDE_FINO, left: BORDE_FINO, right: BORDE_FINO, bottom: BORDE_FINO };
            celda.alignment = { vertical: 'middle', wrapText: true };
        });
        if (rowNumber % 2 === 0) {
            row.eachCell({ includeEmpty: true }, celda => {
                celda.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
            });
        }
    });

    worksheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: columnas.length } };
    worksheet.views = [{ state: 'frozen', ySplit: 1 }];
}

/**
 * Agrega una hoja "Gráficos" con las imágenes de los charts indicados.
 */
function agregarHojaGraficos(workbook, titulo, graficos) {
    const hoja = workbook.addWorksheet('Gráficos');
    hoja.getCell('B2').value = titulo;
    hoja.getCell('B2').font = { bold: true, size: 14 };

    let filaActual = 4;
    graficos.forEach(({ canvasId, etiqueta }) => {
        const base64 = base64DeChart(canvasId);
        if (!base64) return;
        hoja.getCell(`B${filaActual}`).value = etiqueta;
        hoja.getCell(`B${filaActual}`).font = { bold: true };
        const imageId = workbook.addImage({ base64, extension: 'png' });
        hoja.addImage(imageId, { tl: { col: 1, row: filaActual }, ext: { width: 480, height: 300 } });
        filaActual += 18;
    });
}

async function exportarExcelImpacto() {
    if (!filasImpactoActual.length) { window.toast && toast('No hay datos para exportar en el rango seleccionado.', 'error'); return; }

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Pet Pantry Pro';
    workbook.created = new Date();

    const hojaDatos = workbook.addWorksheet('Impacto Social');
    formatearTablaExcel(
        hojaDatos,
        [
            { header: 'Fecha', key: 'fecha', width: 16 },
            { header: 'Tipo de Aporte / Acción', key: 'tipo', width: 24 },
            { header: 'Detalle', key: 'detalle', width: 34 },
            { header: 'Donante / Beneficiario', key: 'actor', width: 24 },
            { header: 'Valor', key: 'valor', width: 16 }
        ],
        filasImpactoActual.map(m => ({
            fecha: formatDate(m.fecha),
            tipo: m.tipo,
            detalle: m.detalle,
            actor: m.actor,
            valor: m.valorTexto
        }))
    );

    agregarHojaGraficos(workbook, 'Impacto Social — Gráficos', [
        { canvasId: 'chart-impacto-pie', etiqueta: 'Movimientos por tipo' },
        { canvasId: 'chart-impacto-barras', etiqueta: 'Recaudación por mes (S/)' }
    ]);

    const buffer = await workbook.xlsx.writeBuffer();
    descargarArchivo(buffer, `reporte-impacto-social-${new Date().toISOString().slice(0, 10)}.xlsx`,
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    window.toast && toast('Reporte de Impacto Social exportado a Excel.', 'success');
}

function exportarPDFImpacto() {
    if (!filasImpactoActual.length) { window.toast && toast('No hay datos para exportar en el rango seleccionado.', 'error'); return; }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'landscape' });

    doc.setFontSize(14);
    doc.text('Pet Pantry Pro — Reporte de Impacto Social', 14, 16);
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text(`Generado el ${new Date().toLocaleDateString('es-PE')}`, 14, 22);

    let finGraficos = 26;
    const piePng = chartsActivos['chart-impacto-pie'] && chartsActivos['chart-impacto-pie'].toBase64Image('image/png', 1);
    const barPng = chartsActivos['chart-impacto-barras'] && chartsActivos['chart-impacto-barras'].toBase64Image('image/png', 1);

    if (piePng || barPng) {
        const anchoImg = 128, altoImg = 78;
        if (piePng) doc.addImage(piePng, 'PNG', 14, 28, anchoImg, altoImg);
        if (barPng) doc.addImage(barPng, 'PNG', 150, 28, anchoImg, altoImg);
        finGraficos = 28 + altoImg + 8;
    }

    doc.autoTable({
        startY: finGraficos,
        head: [['Fecha', 'Tipo de Aporte / Acción', 'Detalle', 'Donante / Beneficiario', 'Valor']],
        body: filasImpactoActual.map(m => [formatDate(m.fecha), m.tipo, m.detalle, m.actor, m.valorTexto]),
        theme: 'grid',
        headStyles: { fillColor: [234, 88, 12] },
        styles: { fontSize: 8, lineColor: [200, 200, 200], lineWidth: 0.2 }
    });

    doc.save(`reporte-impacto-social-${new Date().toISOString().slice(0, 10)}.pdf`);
    window.toast && toast('Reporte de Impacto Social exportado a PDF.', 'success');
}

async function exportarExcelVentas() {
    if (!filasVentasActual.length) { window.toast && toast('No hay datos para exportar en el rango seleccionado.', 'error'); return; }

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Pet Pantry Pro';
    workbook.created = new Date();

    const hojaDatos = workbook.addWorksheet('Ventas');
    formatearTablaExcel(
        hojaDatos,
        [
            { header: 'Fecha', key: 'fecha', width: 16 },
            { header: 'Cliente', key: 'cliente', width: 20 },
            { header: 'Canal', key: 'canal', width: 16 },
            { header: 'Productos', key: 'productos', width: 40 },
            { header: 'N° Items', key: 'items', width: 12 },
            { header: 'Total (S/)', key: 'total', width: 16 }
        ],
        filasVentasActual.map(v => ({
            fecha: formatDate(v.fecha),
            cliente: v.usuario || 'Invitado',
            canal: v.canal || '—',
            productos: (v.items || []).map(it => `${it.nombre} (x${it.cantidad})`).join(', '),
            items: v.totalItems || 0,
            total: Number((v.total || 0).toFixed(2))
        }))
    );
    hojaDatos.getColumn('total').numFmt = '"S/" #,##0.00';

    agregarHojaGraficos(workbook, 'Ventas y Operaciones — Gráficos', [
        { canvasId: 'chart-ventas-pie', etiqueta: 'Ventas por canal' },
        { canvasId: 'chart-ventas-barras', etiqueta: 'Top 5 productos más vendidos' }
    ]);

    const buffer = await workbook.xlsx.writeBuffer();
    descargarArchivo(buffer, `reporte-ventas-${new Date().toISOString().slice(0, 10)}.xlsx`,
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    window.toast && toast('Reporte de Ventas exportado a Excel.', 'success');
}

function exportarPDFVentas() {
    if (!filasVentasActual.length) { window.toast && toast('No hay datos para exportar en el rango seleccionado.', 'error'); return; }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'landscape' });

    doc.setFontSize(14);
    doc.text('Pet Pantry Pro — Reporte de Ventas y Operaciones', 14, 16);
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text(`Generado el ${new Date().toLocaleDateString('es-PE')}`, 14, 22);

    let finGraficos = 26;
    const piePng = chartsActivos['chart-ventas-pie'] && chartsActivos['chart-ventas-pie'].toBase64Image('image/png', 1);
    const barPng = chartsActivos['chart-ventas-barras'] && chartsActivos['chart-ventas-barras'].toBase64Image('image/png', 1);

    if (piePng || barPng) {
        const anchoImg = 128, altoImg = 78;
        if (piePng) doc.addImage(piePng, 'PNG', 14, 28, anchoImg, altoImg);
        if (barPng) doc.addImage(barPng, 'PNG', 150, 28, anchoImg, altoImg);
        finGraficos = 28 + altoImg + 8;
    }

    doc.autoTable({
        startY: finGraficos,
        head: [['Fecha', 'Cliente', 'Canal', 'Productos', 'N° Items', 'Total']],
        body: filasVentasActual.map(v => [
            formatDate(v.fecha),
            v.usuario || 'Invitado',
            v.canal || '—',
            (v.items || []).map(it => `${it.nombre} (x${it.cantidad})`).join(', '),
            v.totalItems || 0,
            formatCurrency(v.total || 0)
        ]),
        theme: 'grid',
        headStyles: { fillColor: [234, 88, 12] },
        styles: { fontSize: 8, lineColor: [200, 200, 200], lineWidth: 0.2 }
    });

    doc.save(`reporte-ventas-${new Date().toISOString().slice(0, 10)}.pdf`);
    window.toast && toast('Reporte de Ventas exportado a PDF.', 'success');
}

/* ------------------------------------------------------------------ */
/* NAVEGACIÓN ENTRE PESTAÑAS                                           */
/* ------------------------------------------------------------------ */

function activarTab(nombre) {
    document.querySelectorAll('.reportes-tab').forEach(b => b.classList.toggle('active', b.dataset.reporte === nombre));
    document.getElementById('panel-impacto').classList.toggle('active', nombre === 'impacto');
    document.getElementById('panel-ventas').classList.toggle('active', nombre === 'ventas');
}

/* ------------------------------------------------------------------ */
/* INIT                                                                 */
/* ------------------------------------------------------------------ */

document.addEventListener('DOMContentLoaded', () => {
    renderReporteImpacto();
    renderReporteVentas();

    document.getElementById('tab-impacto').addEventListener('click', () => activarTab('impacto'));
    document.getElementById('tab-ventas').addEventListener('click', () => activarTab('ventas'));

    document.getElementById('impacto-aplicar').addEventListener('click', renderReporteImpacto);
    document.getElementById('impacto-limpiar').addEventListener('click', () => {
        document.getElementById('impacto-desde').value = '';
        document.getElementById('impacto-hasta').value = '';
        renderReporteImpacto();
    });
    document.getElementById('impacto-excel').addEventListener('click', exportarExcelImpacto);
    document.getElementById('impacto-pdf').addEventListener('click', exportarPDFImpacto);

    document.getElementById('ventas-aplicar').addEventListener('click', renderReporteVentas);
    document.getElementById('ventas-limpiar').addEventListener('click', () => {
        document.getElementById('ventas-desde').value = '';
        document.getElementById('ventas-hasta').value = '';
        renderReporteVentas();
    });
    document.getElementById('ventas-excel').addEventListener('click', exportarExcelVentas);
    document.getElementById('ventas-pdf').addEventListener('click', exportarPDFVentas);

    if (window.lucide) lucide.createIcons();
});

/* Sincronización entre pestañas del navegador (si se generan ventas/donaciones en otra pestaña) */
window.addEventListener('storage', (e) => {
    if (['donacionesFondoSocial', 'mascotasAdopcion', 'historiasClinicas', 'ordenesFarmacia'].includes(e.key)) {
        renderReporteImpacto();
    }
    if (e.key === 'ventasTienda') {
        renderReporteVentas();
    }
});
