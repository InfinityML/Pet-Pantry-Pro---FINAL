import { StorageService } from '../services/StorageService.js';
// Ya no usamos API_ADOP porque el backend fue eliminado
import { Validators } from '../utils/validators.js';

class PublicCatalog {
    constructor() {
        this.grid = document.getElementById('catalog-grid');
        this.modal = document.getElementById('adoption-modal');
        this.form = document.getElementById('form-postulacion');
        this.petNameLabel = document.getElementById('modal-pet-name');
        
        this.currentPetSelection = null;
        this.tabBtns = document.querySelectorAll('.tab-btn');
        this.currentTab = 'adopcion'; 

        // Conexión a la barra de búsqueda
        this.inputBusqueda = document.getElementById('input-busqueda');
        this.btnBuscar = document.getElementById('btn-buscar');
        
        // Elementos del Carrito (Offcanvas)
        this.cartItemsContainer = document.getElementById('cart-items-container');
        this.cartTotalPrice = document.getElementById('cart-total-price');
        this.btnProcesarPago = document.getElementById('btn-procesar-pago');
        this.carrito = []; // Arreglo que guardará las compras
        
        // Los productos ahora viven en localStorage (colección 'tiendaProductos'),
        // gestionados desde el Panel Admin > Productos (crear / editar / eliminar).
        // Se leen "en vivo" con obtenerProductos() para reflejar siempre los cambios.

        this.init();
    }

    obtenerProductos() {
        return StorageService.getAll('tiendaProductos') || [];
    }

    async init() {
        this.setupEventListeners();
        await this.loadCatalog(this.currentTab);
        
        // Recuperar carrito si se refresca la página
        const carritoGuardado = localStorage.getItem('carritoCliente');
        if (carritoGuardado) {
            this.carrito = JSON.parse(carritoGuardado);
            this.actualizarUIcarrito();
        }
    }

    setupEventListeners() {
        document.getElementById('btn-close-modal')?.addEventListener('click', () => this.closeModal());
        document.getElementById('btn-cancel-modal')?.addEventListener('click', () => this.closeModal());
        this.modal?.addEventListener('click', (e) => { if (e.target === this.modal) this.closeModal(); });
        this.form?.addEventListener('submit', (e) => this.handleSubmit(e));

        this.tabBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.tabBtns.forEach(b => { b.classList.remove('btn-primary'); b.classList.add('btn-outline'); });
                e.currentTarget.classList.remove('btn-outline');
                e.currentTarget.classList.add('btn-primary');
                
                this.currentTab = e.currentTarget.id.replace('tab-', '');
                this.inputBusqueda.value = ''; 
                this.loadCatalog(this.currentTab);
            });
        });

        this.btnBuscar?.addEventListener('click', () => this.buscarGlobalmente());
        this.inputBusqueda?.addEventListener('keyup', (e) => {
            if (e.key === 'Enter') this.buscarGlobalmente(); 
        });

        this.btnProcesarPago?.addEventListener('click', () => this.procesarPago());
    }

    // ==========================================
    // LÓGICA DEL CARRITO DE COMPRAS (Intacta)
    // ==========================================
    agregarAlCarrito(productoId) {
        const producto = this.obtenerProductos().find(p => String(p.id) === String(productoId));
        if (!producto) return;

        const itemExistente = this.carrito.find(item => String(item.id) === String(producto.id));
        
        if (itemExistente) {
            itemExistente.cantidad += 1;
        } else {
            this.carrito.push({
                id: producto.id,
                nombre: producto.nombre,
                precioNum: producto.precioNum,
                img: producto.img,
                cantidad: 1
            });
        }

        this.guardarCarritoEnStorage();
        this.actualizarUIcarrito();
        if (typeof abrirCarrito === 'function') abrirCarrito(); 
    }

    eliminarDelCarrito(productoId) {
        this.carrito = this.carrito.filter(item => String(item.id) !== String(productoId));
        this.guardarCarritoEnStorage();
        this.actualizarUIcarrito();
    }

    guardarCarritoEnStorage() {
        localStorage.setItem('carritoCliente', JSON.stringify(this.carrito));
    }

    actualizarUIcarrito() {
        if (!this.cartItemsContainer) return;

        this.cartItemsContainer.innerHTML = '';
        let total = 0;

        if (this.carrito.length === 0) {
            this.cartItemsContainer.innerHTML = `
                <div class="empty-cart-msg" id="empty-cart-msg">
                    <i data-lucide="shopping-bag" style="width: 48px; height: 48px; color: #cbd5e1;"></i>
                    <p>Tu carrito está vacío.</p>
                    <button class="btn btn-outline" onclick="cerrarCarrito()" style="font-size: 0.8rem; margin-top: 8px;">Seguir explorando</button>
                </div>
            `;
            this.cartTotalPrice.innerText = 'S/ 0.00';
            this.btnProcesarPago.disabled = true;
            if (window.lucide) lucide.createIcons();
            return;
        }

        this.carrito.forEach(item => {
            const subtotal = item.precioNum * item.cantidad;
            total += subtotal;

            const htmlItem = `
                <div style="display: flex; gap: 12px; background: #fff; padding: 12px; border-radius: 8px; border: 1px solid #e2e8f0; align-items: center;">
                    <img src="${item.img}" style="width: 60px; height: 60px; object-fit: contain; background: #f8fafc; border-radius: 6px;">
                    <div style="flex: 1;">
                        <h4 style="margin: 0 0 4px 0; font-size: 0.9rem; color: #0f172a;">${item.nombre}</h4>
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <span style="font-size: 0.8rem; color: #64748b;">Cant: ${item.cantidad}</span>
                            <span style="font-size: 0.95rem; font-weight: 700; color: var(--color-primary-600);">S/ ${subtotal.toFixed(2)}</span>
                        </div>
                    </div>
                    <button onclick="window.catalogoInstancia.eliminarDelCarrito('${item.id}')" style="background: none; border: none; color: #ef4444; cursor: pointer; padding: 4px;">
                        <i data-lucide="trash-2" style="width: 18px; height: 18px;"></i>
                    </button>
                </div>
            `;
            this.cartItemsContainer.insertAdjacentHTML('beforeend', htmlItem);
        });

        this.cartTotalPrice.innerText = `S/ ${total.toFixed(2)}`;
        this.btnProcesarPago.disabled = false;
        if (window.lucide) lucide.createIcons();
    }

    procesarPago() {
        const telefono = document.getElementById('perfil-telefono')?.value.trim();
        const direccion = document.getElementById('perfil-direccion')?.value.trim();

        if (document.getElementById('perfil-telefono') && (!telefono || !direccion)) {
            alert('📦 ¡Para poder enviar tus productos necesitamos tu dirección y teléfono! Por favor, actualiza tu perfil.');
            if (typeof window.cerrarCarrito === 'function') window.cerrarCarrito();
            if (typeof window.cambiarPestana === 'function') window.cambiarPestana('perfil');
            const btnEditar = document.getElementById('btn-editar-perfil');
            if (btnEditar) btnEditar.click();
            return; 
        }

        const totalPagar = this.carrito.reduce((sum, item) => sum + (item.precioNum * item.cantidad), 0);
        const totalItems = this.carrito.reduce((sum, item) => sum + item.cantidad, 0);

        // Registramos la venta para que quede reflejada en el Reporte de Ventas del panel admin
        const venta = {
            usuario: localStorage.getItem('usuarioActivo') || 'Invitado',
            canal: window.location.pathname.includes('panel-cliente') ? 'Panel Cliente' : 'Catálogo Público',
            items: this.carrito.map(item => ({
                nombre: item.nombre,
                cantidad: item.cantidad,
                precioUnit: item.precioNum,
                subtotal: item.precioNum * item.cantidad
            })),
            totalItems,
            total: totalPagar,
            metodoPago: 'Simulado',
            fecha: new Date().toISOString()
        };
        StorageService.create('ventasTienda', venta);

        alert(`Todo en orden. Redirigiendo a Pasarela de Pago Pet Pantry Pro.\nTotal a cobrar: S/ ${totalPagar.toFixed(2)}`);

        // Limpiamos el carrito tras "pagar" (antes quedaba con los productos aunque ya se hubiera pagado)
        this.carrito = [];
        this.guardarCarritoEnStorage();
        this.actualizarUIcarrito();
        if (typeof window.cerrarCarrito === 'function') window.cerrarCarrito();
    }

    // ==========================================
    // MÉTODOS EXISTENTES (Modificados para OFFLINE)
    // ==========================================
    async buscarGlobalmente() {
        const query = this.inputBusqueda.value.toLowerCase().trim();
        
        // Si borran la búsqueda, recargamos la pestaña actual
        if (!query) { 
            this.loadCatalog(this.currentTab); 
            return; 
        }

        this.grid.style.opacity = '0.5';
        
        // BUSCAR EN AMBAS FUENTES
        const mascotas = StorageService.getAll('mascotasAdopcion') || [];
        const mascotasResult = mascotas.filter(m => 
            (m.nombre && m.nombre.toLowerCase().includes(query)) || 
            (m.raza && m.raza.toLowerCase().includes(query))
        );
        
        const productosResult = this.obtenerProductos().filter(p => 
            (p.nombre && p.nombre.toLowerCase().includes(query)) || 
            (p.categoria && p.categoria.toLowerCase().includes(query))
        );

        let htmlNuevo = '';
        if (mascotasResult.length === 0 && productosResult.length === 0) {
            htmlNuevo = `<div style="grid-column: 1 / -1; text-align: center; padding: 40px;"><p>No encontramos resultados para "${query}".</p></div>`;
        } else {
            // Unimos mascotas y productos encontrados
            htmlNuevo = mascotasResult.map(m => this.generarHTMLMascota(m)).reverse().join('') + 
                        productosResult.map(p => this.generarHTMLProducto(p)).join('');
        }

        this.grid.innerHTML = htmlNuevo;
        this.enlazarBotonesTarjetas();
        if (window.lucide) lucide.createIcons();
        this.grid.style.opacity = '1';
    }

    async loadCatalog(categoria) {
        this.grid.style.opacity = '0.5';
        let htmlNuevo = '';

        // SEPARACIÓN LÓGICA: Adopción es una cosa, Tienda es otra
        if (categoria === 'adopcion') {
            const mascotas = StorageService.getAll('mascotasAdopcion') || [];
            if (mascotas.length === 0) {
                htmlNuevo = `<div style="grid-column: 1/-1; text-align: center; padding: 40px;"><p>No hay mascotas registradas.</p></div>`;
            } else {
                htmlNuevo = mascotas.map(m => this.generarHTMLMascota(m)).reverse().join('');
            }
        } else {
            // SOLO filtros de productos aquí
            const items = this.obtenerProductos().filter(p => p.categoria === categoria);
            if (items.length === 0) {
                htmlNuevo = `<div style="grid-column: 1/-1; text-align: center; padding: 40px;"><p>No hay productos en esta categoría.</p></div>`;
            } else {
                htmlNuevo = items.map(p => this.generarHTMLProducto(p)).join('');
            }
        }

        this.grid.innerHTML = htmlNuevo;
        this.enlazarBotonesTarjetas();
        if (window.lucide) lucide.createIcons();
        this.grid.style.opacity = '1';
    }

    // ==========================================
    // CREADORES DE HTML (Intactos)
    // ==========================================
    generarHTMLMascota(m) {
        const isAvailable = m.estado === 'Disponible' || m.estado === 'DISPONIBLE';
        const badgeColor = isAvailable ? '#059669' : '#d97706';
        const badgeBg = isAvailable ? '#ecfdf5' : '#fffbeb';
        const estadoTexto = m.estado ? m.estado.toUpperCase() : 'DESCONOCIDO';
        const historiaLimpia = m.historia ? m.historia : 'Esta hermosa mascota está a la espera de una familia que le brinde mucho amor y cuidado.';
        const imagenSegura = m.foto ? m.foto : 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?q=80&w=600';
        
        return `
            <div class="card card-interactive" style="background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); border: 1px solid #e2e8f0; display: flex; flex-direction: column; height: 100%;">
                <div style="height: 220px; overflow: hidden; background: #f8fafc;">
                    <img src="${imagenSegura}" alt="${m.nombre}" style="width: 100%; height: 100%; object-fit: cover;">
                </div>
                <div class="card-body" style="padding: 20px; display: flex; flex-direction: column; flex: 1;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
                        <h3 class="card-title" style="margin: 0; font-size: 1.2rem; color: #0f172a;">${m.nombre}</h3>
                        <span style="background-color: ${badgeBg}; color: ${badgeColor}; padding: 4px 10px; border-radius: 99px; font-size: 0.7rem; font-weight: 700; border: 1px solid ${badgeColor}40;">
                            ${estadoTexto}
                        </span>
                    </div>
                    <p class="text-small text-muted" style="margin: 0 0 16px 0; font-size: 0.85rem; color: #64748b;">
                        ${m.raza || 'Mestizo'} • ${m.tamano || 'Mediano'} • ${m.edad || 'Desconocida'}
                    </p>
                    <p class="text-small" style="margin: 0 0 20px 0; font-size: 0.9rem; color: #475569; line-height: 1.4; flex: 1; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;">
                        ${historiaLimpia}
                    </p>
                    <button class="btn ${isAvailable ? 'btn-primary' : 'btn-outline'} w-100 btn-postular" 
                            data-id="${m.id}" data-name="${m.nombre}" ${!isAvailable ? 'disabled' : ''} 
                            style="padding: 10px; border-radius: 8px; font-weight: 600;">
                        ${isAvailable ? 'Postular a Adopción' : 'Mascota Reservada'}
                    </button>
                </div>
            </div>
        `;
    }

    generarHTMLProducto(p) {
        const imagenSegura = p.img || 'https://images.unsplash.com/photo-1601758228041-f3b2795255f1?q=80&w=600';
        return `
            <div class="card card-interactive" style="background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); border: 1px solid #e2e8f0; display: flex; flex-direction: column; height: 100%;">
                <div style="height: 220px; overflow: hidden; background: #ffffff; padding: 16px;">
                    <img src="${imagenSegura}" alt="${p.nombre}" style="width: 100%; height: 100%; object-fit: contain;">
                </div>
                <div class="card-body" style="padding: 20px; display: flex; flex-direction: column; border-top: 1px solid #f1f5f9; flex: 1;">
                    <h3 class="card-title" style="margin: 0 0 8px 0; font-size: 1.1rem; color: #0f172a;">${p.nombre}</h3>
                    <p class="text-small text-muted" style="margin: 0 0 16px 0; font-size: 0.85rem; color: #64748b;">${p.descripcion}</p>
                    <div style="margin-top: auto; margin-bottom: 16px;">
                        <span style="font-size: 1.25rem; font-weight: 800; color: var(--color-primary-600);">${p.precio}</span>
                    </div>
                    <button class="btn btn-outline w-100 btn-comprar" data-id="${p.id}" style="border-color: var(--color-primary-600); color: var(--color-primary-600); padding: 10px; border-radius: 8px; font-weight: 600;">
                        <i data-lucide="shopping-cart" style="width: 16px; margin-right: 8px;"></i> Añadir al Carrito
                    </button>
                </div>
            </div>
        `;
    }

    enlazarBotonesTarjetas() {
        document.querySelectorAll('.btn-postular').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.openModal(e.currentTarget.getAttribute('data-name'), e.currentTarget.getAttribute('data-id'));
            });
        });

        document.querySelectorAll('.btn-comprar').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const productoId = e.currentTarget.getAttribute('data-id');
                this.agregarAlCarrito(productoId);
            });
        });
    }

    // ==========================================
    // LÓGICA DE POSTULACIÓN OFFLINE
    // ==========================================
    openModal(petName, petId) {
        this.currentPetSelection = { name: petName, id: petId };
        if(this.petNameLabel) this.petNameLabel.textContent = petName;
        if(this.modal) this.modal.classList.add('is-open');
        document.body.style.overflow = 'hidden'; 
    }

    closeModal() {
        if(this.modal) this.modal.classList.remove('is-open');
        if(this.form) this.form.reset();
        this.currentPetSelection = null;
        document.body.style.overflow = '';
    }

    async handleSubmit(event) {
        event.preventDefault();
        const payload = {
            mascotaId: this.currentPetSelection.id,
            mascotaNombre: this.currentPetSelection.name,
            nombre: document.getElementById('postulacion-nombre').value.trim(),
            dni: document.getElementById('postulacion-dni').value.trim(),
            email: document.getElementById('postulacion-email').value.trim(),
            motivo: document.getElementById('postulacion-motivo').value.trim(),
            estado: 'Pendiente'
        };

        // CORRECCIÓN: Guardamos la postulación en la memoria en vez de usar fetch
        const postulaciones = StorageService.getAll('postulacionesAdopcion') || [];
        postulaciones.push({ ...payload, id: Date.now(), fecha: new Date().toLocaleDateString('es-PE') });
        StorageService.saveAll('postulacionesAdopcion', postulaciones);

        alert('¡Solicitud enviada con éxito! Nos comunicaremos contigo pronto.');
        this.closeModal();
        this.loadCatalog('adopcion');
    }
}

// Inicialización global
document.addEventListener('DOMContentLoaded', () => { 
    window.catalogoInstancia = new PublicCatalog(); 
});

// Si el Admin crea/edita/elimina productos en otra pestaña, el catálogo se refresca solo.
window.addEventListener('storage', (e) => {
    if (e.key === 'tiendaProductos' && window.catalogoInstancia && window.catalogoInstancia.currentTab !== 'adopcion') {
        window.catalogoInstancia.loadCatalog(window.catalogoInstancia.currentTab);
    }
});