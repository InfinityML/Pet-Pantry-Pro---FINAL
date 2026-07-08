/**
 * ============================================================================
 * PAGE CONTROLLER: GESTIÓN DE PRODUCTOS DE LA TIENDA
 * ============================================================================
 * CRUD 100% en el cliente sobre la colección 'tiendaProductos'.
 * Estos productos son los que consume el Catálogo Público y el Panel Cliente
 * (ver public-catalog.js), así que cualquier cambio aquí se refleja allá.
 */
import { StorageService } from '../services/StorageService.js';

const COLECCION = 'tiendaProductos';
let productosActuales = [];

const NOMBRE_CATEGORIA = {
    alimentos: 'Alimentos',
    accesorios: 'Accesorios',
    farmacia: 'Farmacia'
};

function leerImagenComoBase64(file) {
    return new Promise((resolve, reject) => {
        if (!file) { resolve(null); return; }
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

function badgeCategoria(categoria) {
    const colores = {
        alimentos: { bg: '#ecfdf5', color: '#059669' },
        accesorios: { bg: '#eff6ff', color: '#2563eb' },
        farmacia: { bg: '#fef2f2', color: '#b91c1c' }
    };
    const c = colores[categoria] || { bg: '#f1f5f9', color: '#475569' };
    return `<span style="background:${c.bg}; color:${c.color}; padding:4px 10px; border-radius:99px; font-size:0.7rem; font-weight:700;">${(NOMBRE_CATEGORIA[categoria] || categoria || '—').toUpperCase()}</span>`;
}

/* ------------------------------------------------------------------ */
/* 1. PUBLICAR NUEVO PRODUCTO                                          */
/* ------------------------------------------------------------------ */
function conectarFormulario() {
    const form = document.getElementById('form-producto');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const fileInput = document.getElementById('producto-imagen');
        const img = fileInput.files.length > 0 ? await leerImagenComoBase64(fileInput.files[0]) : '';

        const nombre = document.getElementById('producto-nombre').value.trim();
        const categoria = document.getElementById('producto-categoria').value;
        const precioNum = parseFloat(document.getElementById('producto-precio').value) || 0;
        const descripcion = document.getElementById('producto-descripcion').value.trim();

        const nuevoProducto = {
            nombre,
            categoria,
            descripcion,
            precioNum,
            precio: `S/ ${precioNum.toFixed(2)}`,
            img
        };

        StorageService.create(COLECCION, nuevoProducto);

        window.toast ? toast('Producto publicado con éxito.', 'success') : alert('Producto publicado con éxito.');
        form.reset();
        cargarProductos();
    });
}

/* ------------------------------------------------------------------ */
/* 2. LISTAR PRODUCTOS                                                  */
/* ------------------------------------------------------------------ */
function cargarProductos() {
    const grid = document.getElementById('grid-productos');
    if (!grid) return;

    productosActuales = StorageService.getAll(COLECCION);

    if (!productosActuales.length) {
        grid.innerHTML = '<p class="text-muted">No hay productos publicados actualmente.</p>';
        return;
    }

    grid.innerHTML = productosActuales.map(p => `
        <div class="card" style="background:#fff; border-radius:12px; overflow:hidden; border:1px solid #e2e8f0; display:flex; flex-direction:column; height: 100%;">
            <div style="height:160px; overflow:hidden; background:#f8fafc; flex-shrink: 0; padding: 12px;">
                <img src="${p.img || 'https://images.unsplash.com/photo-1601758228041-f3b2795255f1?q=80&w=600'}" alt="${p.nombre}" style="width:100%; height:100%; object-fit:contain;">
            </div>
            <div class="card-body" style="padding:16px; display:flex; flex-direction:column; flex-grow: 1;">
                <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px; gap:8px;">
                    <h3 style="margin:0; font-size:1rem; color:#0f172a;">${p.nombre}</h3>
                    ${badgeCategoria(p.categoria)}
                </div>
                <p style="font-size: 0.85rem; color: #475569; margin-bottom: 12px; flex-grow: 1; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; text-overflow: ellipsis;">
                    ${p.descripcion || 'Sin descripción disponible.'}
                </p>
                <p style="font-size: 1.1rem; font-weight: 800; color: var(--color-primary-600); margin: 0 0 12px 0;">
                    ${p.precio || `S/ ${(p.precioNum || 0).toFixed(2)}`}
                </p>
                <div style="display:flex; gap:8px; border-top: 1px solid #e2e8f0; padding-top: 12px; margin-top: auto;">
                    <button class="btn btn-outline btn-editar-producto" style="flex:1; padding:6px; font-size:0.85rem;" data-id="${p.id}">Editar</button>
                    <button class="btn btn-eliminar-producto" style="flex:1; background:#ef4444; color:white; border:none; padding:6px; font-size:0.85rem; border-radius:6px;" data-id="${p.id}">Eliminar</button>
                </div>
            </div>
        </div>
    `).join('');

    document.querySelectorAll('.btn-editar-producto').forEach(b => b.addEventListener('click', () => window.abrirModalProducto(b.getAttribute('data-id'))));
    document.querySelectorAll('.btn-eliminar-producto').forEach(b => b.addEventListener('click', () => window.eliminarProducto(b.getAttribute('data-id'))));

    if (window.lucide) lucide.createIcons();
}

/* ------------------------------------------------------------------ */
/* 3. EDITAR PRODUCTO                                                   */
/* ------------------------------------------------------------------ */
window.abrirModalProducto = (id) => {
    const p = productosActuales.find(x => x.id == id);
    if (!p) return;

    document.getElementById('edit-producto-id').value = id;
    document.getElementById('edit-producto-nombre').value = p.nombre;
    document.getElementById('edit-producto-categoria').value = p.categoria;
    document.getElementById('edit-producto-precio').value = p.precioNum;
    document.getElementById('edit-producto-descripcion').value = p.descripcion;
    document.getElementById('edit-producto-imagen').value = '';

    document.getElementById('modalEditarProducto').style.display = 'flex';
};

window.cerrarModalProducto = () => { document.getElementById('modalEditarProducto').style.display = 'none'; };

function conectarFormularioEdicion() {
    const form = document.getElementById('form-editar-producto');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('edit-producto-id').value;

        const fileInput = document.getElementById('edit-producto-imagen');
        const nuevaImagen = fileInput.files.length > 0 ? await leerImagenComoBase64(fileInput.files[0]) : null;

        const precioNum = parseFloat(document.getElementById('edit-producto-precio').value) || 0;

        const cambios = {
            nombre: document.getElementById('edit-producto-nombre').value.trim(),
            categoria: document.getElementById('edit-producto-categoria').value,
            descripcion: document.getElementById('edit-producto-descripcion').value.trim(),
            precioNum,
            precio: `S/ ${precioNum.toFixed(2)}`
        };
        if (nuevaImagen) cambios.img = nuevaImagen;

        StorageService.update(COLECCION, id, cambios);

        window.toast ? toast('Producto actualizado con éxito.', 'success') : alert('Producto actualizado con éxito.');
        window.cerrarModalProducto();
        cargarProductos();
    });
}

/* ------------------------------------------------------------------ */
/* 4. ELIMINAR PRODUCTO                                                 */
/* ------------------------------------------------------------------ */
window.eliminarProducto = (id) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este producto de la tienda?')) return;
    StorageService.remove(COLECCION, id);
    window.toast ? toast('Producto eliminado.', 'success') : alert('Producto eliminado.');
    cargarProductos();
};

/* ------------------------------------------------------------------ */
/* Sincronización entre pestañas (si se edita en otra pestaña abierta) */
/* ------------------------------------------------------------------ */
window.addEventListener('storage', (e) => {
    if (e.key === COLECCION) cargarProductos();
});

/* ------------------------------------------------------------------ */
/* INIT                                                                 */
/* ------------------------------------------------------------------ */
conectarFormulario();
conectarFormularioEdicion();
cargarProductos();
