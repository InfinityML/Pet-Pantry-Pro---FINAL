import { StorageService } from '../services/StorageService.js';

let mascotasActuales = [];

function badgeEstadoMascota(estado) {
    const disp = estado === 'Disponible';
    const proceso = estado === 'En proceso de evaluación' || estado === 'En Proceso';
    const bg = disp ? '#ecfdf5' : (proceso ? '#eff6ff' : '#fef2f2');
    const color = disp ? '#059669' : (proceso ? '#2563eb' : '#b91c1c');
    return `<span style="background:${bg}; color:${color}; padding:4px 10px; border-radius:99px; font-size:0.7rem; font-weight:700;">${(estado || '').toUpperCase()}</span>`;
}

function leerImagenComoBase64(file) {
    return new Promise((resolve, reject) => {
        if (!file) { resolve(null); return; }
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// 1. PUBLICAR MASCOTA (guardado local, sin backend)
function conectarFormulario() {
    const form = document.getElementById('form-adopcion');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const fileInput = document.getElementById('mascota-foto');
        const foto = fileInput.files.length > 0 ? await leerImagenComoBase64(fileInput.files[0]) : '';

        const nuevaMascota = {
            nombre: document.getElementById('mascota-nombre').value.trim(),
            edad: document.getElementById('mascota-edad').value.trim(),
            raza: document.getElementById('mascota-raza').value.trim(),
            tamano: document.getElementById('mascota-tamano').value,
            historia: document.getElementById('mascota-historia').value.trim(),
            estado: 'Disponible',
            foto: foto
        };

        StorageService.create('mascotasAdopcion', nuevaMascota);

        alert('Mascota publicada con éxito.');
        form.reset();
        cargarMascotas();
    });
}

// 2. CARGAR MASCOTAS EN EL GRID
function cargarMascotas() {
    const grid = document.getElementById('grid-adopciones');
    if (!grid) return;

    mascotasActuales = StorageService.getAll('mascotasAdopcion');

    if (!mascotasActuales.length) {
        grid.innerHTML = '<p class="text-muted">No hay mascotas publicadas actualmente.</p>';
        return;
    }

    grid.innerHTML = mascotasActuales.map(m => `
        <div class="card" style="background:#fff; border-radius:12px; overflow:hidden; border:1px solid #e2e8f0; display:flex; flex-direction:column; height: 100%;">
            <div style="height:180px; overflow:hidden; background:#f8fafc; flex-shrink: 0;">
                <img src="${m.foto || 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?q=80&w=600'}" alt="${m.nombre}" style="width:100%; height:100%; object-fit:cover;">
            </div>
            <div class="card-body" style="padding:16px; display:flex; flex-direction:column; flex-grow: 1;">
                <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px;">
                    <h3 style="margin:0; font-size:1.1rem; color:#0f172a;">${m.nombre}</h3>
                    ${badgeEstadoMascota(m.estado)}
                </div>
                <p class="text-small text-muted" style="margin-bottom:8px;">${m.raza || 'Mestizo'} • ${m.tamano || '—'} • ${m.edad || '—'}</p>
                <p style="font-size: 0.85rem; color: #475569; margin-bottom: 16px; flex-grow: 1; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; text-overflow: ellipsis;">
                    ${m.historia || 'Sin descripción disponible.'}
                </p>
                <div style="display:flex; gap:8px; border-top: 1px solid #e2e8f0; padding-top: 12px; margin-top: auto;">
                    <button class="btn btn-outline btn-editar" style="flex:1; padding:6px; font-size:0.85rem;" data-id="${m.id}">Editar</button>
                    <button class="btn btn-eliminar" style="flex:1; background:#ef4444; color:white; border:none; padding:6px; font-size:0.85rem; border-radius:6px;" data-id="${m.id}">Eliminar</button>
                </div>
            </div>
        </div>
    `).join('');

    document.querySelectorAll('.btn-editar').forEach(b => b.addEventListener('click', () => window.abrirModalMascota(b.getAttribute('data-id'))));
    document.querySelectorAll('.btn-eliminar').forEach(b => b.addEventListener('click', () => window.eliminarMascota(b.getAttribute('data-id'))));

    if (window.lucide) lucide.createIcons();
}

// 3. EDITAR MASCOTA
window.abrirModalMascota = (id) => {
    const m = mascotasActuales.find(x => x.id == id);
    if (!m) return;

    document.getElementById('edit-id').value = id;
    document.getElementById('edit-nombre').value = m.nombre;
    document.getElementById('edit-edad').value = m.edad;
    document.getElementById('edit-raza').value = m.raza;
    document.getElementById('edit-tamano').value = m.tamano;
    document.getElementById('edit-estado').value = m.estado;
    document.getElementById('edit-historia').value = m.historia;
    document.getElementById('edit-foto').value = '';

    document.getElementById('modalEditarMascota').style.display = 'flex';
};

window.cerrarModalMascota = () => { document.getElementById('modalEditarMascota').style.display = 'none'; };

document.getElementById('form-editar-mascota').addEventListener('submit', async function (e) {
    e.preventDefault();
    const id = document.getElementById('edit-id').value;

    const fileInput = document.getElementById('edit-foto');
    const nuevaFoto = fileInput.files.length > 0 ? await leerImagenComoBase64(fileInput.files[0]) : null;

    const cambios = {
        nombre: document.getElementById('edit-nombre').value.trim(),
        edad: document.getElementById('edit-edad').value.trim(),
        raza: document.getElementById('edit-raza').value.trim(),
        tamano: document.getElementById('edit-tamano').value,
        estado: document.getElementById('edit-estado').value,
        historia: document.getElementById('edit-historia').value.trim()
    };
    if (nuevaFoto) cambios.foto = nuevaFoto;

    StorageService.update('mascotasAdopcion', id, cambios);

    alert('Mascota actualizada con éxito.');
    window.cerrarModalMascota();
    cargarMascotas();
});

// 4. ELIMINAR MASCOTA
window.eliminarMascota = (id) => {
    if (!confirm('¿Estás seguro de que deseas eliminar esta mascota del sistema?')) return;
    StorageService.remove('mascotasAdopcion', id);
    alert('Mascota eliminada.');
    cargarMascotas();
};

// ============================================
// LÓGICA DE POSTULACIONES (guardadas por public-catalog.js)
// ============================================
function cargarPostulaciones() {
    const tbody = document.getElementById('tabla-postulaciones');
    if (!tbody) return;

    const data = StorageService.getAll('postulacionesAdopcion');

    if (!data.length) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted" style="padding:24px;">No hay postulaciones pendientes.</td></tr>';
        return;
    }

    tbody.innerHTML = data.map(p => `
        <tr>
            <td class="fw-medium">${p.mascotaNombre}</td>
            <td>${p.nombre}<div class="text-small text-muted">${p.email}</div></td>
            <td>${p.dni}</td>
            <td>${p.motivo || '—'}</td>
            <td style="display:flex; gap:8px;">
                <button class="btn btn-primary btn-sm btn-aprobar" data-id="${p.id}">Aprobar</button>
                <button class="btn btn-outline btn-sm btn-rechazar" data-id="${p.id}">Rechazar</button>
            </td>
        </tr>
    `).join('');

    document.querySelectorAll('.btn-aprobar').forEach(b => b.addEventListener('click', () => resolver(b.getAttribute('data-id'), 'aprobar')));
    document.querySelectorAll('.btn-rechazar').forEach(b => b.addEventListener('click', () => resolver(b.getAttribute('data-id'), 'rechazar')));
}

function resolver(id, accion) {
    const postulaciones = StorageService.getAll('postulacionesAdopcion');
    const postulacion = postulaciones.find(p => p.id == id);
    if (!postulacion) return;

    if (accion === 'aprobar') {
        StorageService.update('postulacionesAdopcion', id, { estado: 'Aprobada' });
        StorageService.update('mascotasAdopcion', postulacion.mascotaId, { estado: 'Reservado' });
    } else {
        StorageService.update('postulacionesAdopcion', id, { estado: 'Rechazada' });
    }

    alert(`Postulación ${accion === 'aprobar' ? 'aprobada' : 'rechazada'} con éxito.`);
    cargarPostulaciones();
    cargarMascotas();
}

// Iniciar app
conectarFormulario();
cargarMascotas();
cargarPostulaciones();