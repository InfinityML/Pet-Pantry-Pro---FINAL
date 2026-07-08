import { StorageService } from '../services/StorageService.js';

export function inicializarBaseDeDatosLocal() {

    // LIMPIEZA INTELIGENTE: Si detecta la contraseña vieja de SQL, la resetea

    const usuariosActuales = StorageService.getAll('usuarios') || [];
    const carlos = usuariosActuales.find(u => u.usuario === 'carlos');
    if (carlos && carlos.password !== '123') {
        console.log("Limpiando base de datos antigua de C#...");
        localStorage.removeItem('usuarios'); 
    }

    // 1. USUARIOS (Extraídos de tu SQL)
    if (!StorageService.getAll('usuarios').length) {
        const usuariosSQL = [
            { id: 1, usuario: 'carlos', password: '123', nombre: 'Dr. Carlos Vise', rol: 'administrador', telefono: '', direccion: '' },
            { id: 2, usuario: 'elena', password: '123', nombre: 'Dra. Elena', rol: 'veterinario', telefono: '', direccion: '' },
            { id: 3, usuario: 'marcos', password: '123', nombre: 'Marcos Peña', rol: 'almacenero', telefono: '', direccion: '' },
            { id: 4, usuario: 'Italo.Arquiñego@gmail.com', password: '123', nombre: 'Italo Arquiñego', rol: 'cliente', telefono: '999999999', direccion: 'Mz A5 Lote 16F - Calle el sol' }
        ];
        StorageService.saveAll('usuarios', usuariosSQL);
    }

    // 2. MASCOTAS EN ADOPCIÓN (Extraídas de tu SQL)
    if (!StorageService.getAll('mascotasAdopcion').length) {
        const mascotasSQL = [
            { id: 1, nombre: 'Rocky', raza: 'Mestizo', edad: '1 año', tamano: 'Mediano', estado: 'Disponible', foto: 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?q=80&w=600', historia: 'Rescatado de un abandono.' },
            { id: 2, mascotaId: 2, nombre: 'Luna', raza: 'Siamés', edad: '3 meses', tamano: 'Pequeño', estado: 'Disponible', foto: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?q=80&w=600', historia: 'Tímida al principio, pero ronronea mucho.' },
            { id: 3, mascotaId: 3, nombre: 'Simba', raza: 'Golden Retriever', edad: '2 años', tamano: 'Grande', estado: 'Disponible', foto: 'https://images.unsplash.com/photo-1552053831-71594a27632d?q=80&w=600', historia: 'Leal, protector y excelente con los niños.' }
        ];
        StorageService.saveAll('mascotasAdopcion', mascotasSQL);
    }

    // 3. INVENTARIO Y LOTES (Extraídos de tu SQL)
    if (!StorageService.getAll('inventarioLotes').length) {
        const lotesSQL = [
            { loteId: 1, farmaco: 'Amoxicilina 500mg', lote: 'L-101', cantidad: 150, fechaIngreso: '2026-07-03', tipo: 'Comercial', estado: 'Aprobado' },
            { loteId: 2, farmaco: 'Vacuna Séxtuple', lote: 'V-001', cantidad: 12, fechaIngreso: '2026-07-03', tipo: 'Comercial', estado: 'Aprobado' },
            { loteId: 3, farmaco: 'Antiparasitario Interno', lote: 'L-205', cantidad: 85, fechaIngreso: '2026-07-03', tipo: 'Social', estado: 'Aprobado' },
            { loteId: 4, farmaco: 'Vendas Elásticas', lote: 'M-10', cantidad: 18, fechaIngreso: '2026-07-03', tipo: 'Social', estado: 'Aprobado' },
            { loteId: 5, farmaco: 'Repriman 250gr', lote: 'L-102', cantidad: 90, fechaIngreso: '2026-07-06', tipo: 'Comercial', estado: 'Pendiente' },
            { loteId: 6, farmaco: 'Repriman 250gr', lote: 'L-102', cantidad: 105, fechaIngreso: '2026-07-06', tipo: 'Comercial', estado: 'Pendiente' }
        ];
        StorageService.saveAll('inventarioLotes', lotesSQL);
    }

    // 4. PRODUCTOS DE LA TIENDA (Para tu nuevo panel)
    if (!StorageService.getAll('tiendaProductos').length) {
        const productosTienda = [
            { id: 101, categoria: 'alimentos', nombre: 'Royal Canin Mini Adult', descripcion: 'Alimento Seco Premium • 3kg. Nutrición balanceada.', precioNum: 120.00, precio: 'S/ 120.00', img: 'https://images.unsplash.com/photo-1589924691995-400dc9ecc119?q=80&w=600' },
            { id: 102, categoria: 'alimentos', nombre: 'ProPlan Gato Esterilizado', descripcion: 'Alimento Seco • 1.5kg. Control de peso.', precioNum: 85.00, precio: 'S/ 85.00', img: '../../src/img/proplan.jpg' },
            { id: 103, categoria: 'accesorios', nombre: 'Correa Reflectiva 2m', descripcion: 'Paseo Seguro • PetSafe. Con hilos reflectivos.', precioNum: 45.00, precio: 'S/ 45.00', img: 'https://images.unsplash.com/photo-1602491453631-e2a5ad90a131?q=80&w=600' },
            { id: 105, categoria: 'farmacia', nombre: 'Antipulgas Bravecto', descripcion: 'Protección 12 semanas • 10-20kg. Tableta masticable.', precioNum: 115.00, precio: 'S/ 115.00', img: 'https://images.unsplash.com/photo-1584017911766-d451b3d0e843?q=80&w=600' }
        ];
        StorageService.saveAll('tiendaProductos', productosTienda);
    }

    // 5. FONDO SOCIAL (monto base histórico antes de que existiera el sistema de donaciones)
    if (localStorage.getItem('fondoSocialBase') === null) {
        localStorage.setItem('fondoSocialBase', '4500.50');
    }

    // 6. DONACIONES AL FONDO SOCIAL (historial de ejemplo para el Reporte de Impacto Social)
    if (!StorageService.getAll('donacionesFondoSocial').length) {
        const donacionesSQL = [
            { id: 1001, tipo: 'Donación única', usuario: 'Italo.Arquiñego@gmail.com', monto: 50.00, fecha: '2026-06-10T10:00:00.000Z' },
            { id: 1002, tipo: 'Suscripción Padrino', usuario: 'Italo.Arquiñego@gmail.com', monto: 29.90, fecha: '2026-06-15T10:00:00.000Z' },
            { id: 1003, tipo: 'Donación única', usuario: 'Anónimo', monto: 100.00, fecha: '2026-06-22T10:00:00.000Z' },
            { id: 1004, tipo: 'Suscripción Padrino', usuario: 'Italo.Arquiñego@gmail.com', monto: 29.90, fecha: '2026-07-01T10:00:00.000Z' },
            { id: 1005, tipo: 'Donación única', usuario: 'Anónimo', monto: 75.50, fecha: '2026-07-05T10:00:00.000Z' }
        ];
        StorageService.saveAll('donacionesFondoSocial', donacionesSQL);
    }

    // 7. HISTORIAS CLÍNICAS (atenciones de ejemplo, incluye casos sociales para el Reporte de Impacto)
    if (!StorageService.getAll('historiasClinicas').length) {
        const historiasSQL = [
            { id: 2001, pacienteId: 1, nombrePaciente: 'Rocky', diagnostico: 'Control post-rescate, buen estado general', farmacoRecetado: 'Antiparasitario Interno', cantidad: 1, tipo: 'Social', fecha: '2026-06-12T09:30:00.000Z' },
            { id: 2002, pacienteId: 2, nombrePaciente: 'Luna', diagnostico: 'Vacunación esquema inicial', farmacoRecetado: 'Vacuna Séxtuple', cantidad: 1, tipo: 'Social', fecha: '2026-06-20T11:00:00.000Z' },
            { id: 2003, pacienteId: 3, nombrePaciente: 'Simba', diagnostico: 'Chequeo general antes de adopción', farmacoRecetado: null, cantidad: 0, tipo: 'Social', fecha: '2026-06-28T15:00:00.000Z' }
        ];
        StorageService.saveAll('historiasClinicas', historiasSQL);
    }

    // 8. ÓRDENES DE FARMACIA (despachos ya completados, para trazabilidad y reportes)
    if (!StorageService.getAll('ordenesFarmacia').length) {
        const ordenesSQL = [
            { id: 3001, paciente: 'Rocky', farmaco: 'Antiparasitario Interno', cantidad: 1, tipo: 'Social', estado: 'Despachado', fechaDespacho: '2026-06-12T10:00:00.000Z' },
            { id: 3002, paciente: 'Luna', farmaco: 'Vacuna Séxtuple', cantidad: 1, tipo: 'Social', estado: 'Despachado', fechaDespacho: '2026-06-20T12:00:00.000Z' }
        ];
        StorageService.saveAll('ordenesFarmacia', ordenesSQL);
    }

    // 9. VENTAS DE TIENDA (historial de ejemplo para el Reporte de Ventas)
    if (!StorageService.getAll('ventasTienda').length) {
        const ventasSQL = [
            { id: 4001, usuario: 'Italo.Arquiñego@gmail.com', canal: 'Panel Cliente', items: [{ nombre: 'Royal Canin Mini Adult', cantidad: 1, precioUnit: 120.00, subtotal: 120.00 }], totalItems: 1, total: 120.00, metodoPago: 'Simulado', fecha: '2026-06-14T16:20:00.000Z' },
            { id: 4002, usuario: 'Invitado', canal: 'Catálogo Público', items: [{ nombre: 'Antipulgas Bravecto', cantidad: 2, precioUnit: 115.00, subtotal: 230.00 }], totalItems: 2, total: 230.00, metodoPago: 'Simulado', fecha: '2026-06-25T12:00:00.000Z' },
            { id: 4003, usuario: 'Italo.Arquiñego@gmail.com', canal: 'Panel Cliente', items: [{ nombre: 'Correa Reflectiva 2m', cantidad: 1, precioUnit: 45.00, subtotal: 45.00 }, { nombre: 'ProPlan Gato Esterilizado', cantidad: 1, precioUnit: 85.00, subtotal: 85.00 }], totalItems: 2, total: 130.00, metodoPago: 'Simulado', fecha: '2026-07-02T09:10:00.000Z' },
            { id: 4004, usuario: 'Invitado', canal: 'Catálogo Público', items: [{ nombre: 'Royal Canin Mini Adult', cantidad: 1, precioUnit: 120.00, subtotal: 120.00 }], totalItems: 1, total: 120.00, metodoPago: 'Simulado', fecha: '2026-07-06T18:45:00.000Z' }
        ];
        StorageService.saveAll('ventasTienda', ventasSQL);
    }

    // 10. UNA MASCOTA YA ADOPTADA (para que el reporte de impacto social muestre historial de adopciones)
    const mascotasExistentes = StorageService.getAll('mascotasAdopcion');
    if (mascotasExistentes.length && !mascotasExistentes.some(m => m.nombre === 'Toby')) {
        mascotasExistentes.push({
            id: 4, nombre: 'Toby', raza: 'Mestizo', edad: '2 años', tamano: 'Mediano', estado: 'Adoptado',
            foto: 'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?q=80&w=600',
            historia: 'Rescatado y rehabilitado gracias al fondo social.', fechaAdopcion: '2026-06-18'
        });
        StorageService.saveAll('mascotasAdopcion', mascotasExistentes);
    }
}

inicializarBaseDeDatosLocal();
export const runDataSeeder = inicializarBaseDeDatosLocal;