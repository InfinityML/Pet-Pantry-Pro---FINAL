/**
 * ============================================================================
 * PAGE CONTROLLER: VET DASHBOARD (Atención Clínica)
 * ============================================================================
 */
import { StorageService } from '../services/StorageService.js';

class VetDashboard {
    constructor() {
        this.tablaAgenda = document.getElementById('tabla-agenda');
        this.panelAtencion = document.getElementById('panel-atencion');
        this.formAtencion = document.getElementById('form-atencion');
        
        // Elementos de UI reactiva
        this.labelPacienteActivo = document.getElementById('paciente-activo-nombre');
        this.inputIdPaciente = document.getElementById('atencion-paciente-id');
        
        // Estado local (Reactividad)
        this.pacienteActivo = null;
        this.agenda = [];
        
        this.init();
    }

    async init() {
        this.setupEventListeners();
        await this.loadAgenda();
    }

    setupEventListeners() {
        this.formAtencion.addEventListener('submit', (e) => this.handleSubmit(e));
    }

    async loadAgenda() {
        // Obtenemos la agenda desde nuestro StorageService
        const pacientes = await StorageService.getAll('agendaPacientes');
        
        // Filtramos solo los que están pendientes
        this.agenda = pacientes.filter(p => p.estado !== 'Atendido');

        if (this.agenda.length === 0) {
            this.tablaAgenda.innerHTML = `
                <tr><td colspan="3" class="text-muted text-center py-4">No hay pacientes en sala de espera.</td></tr>
            `;
            return;
        }

        this.tablaAgenda.innerHTML = this.agenda.map(p => `
            <tr>
                <td>
                    <div class="fw-medium">${p.nombre}</div>
                    <div class="text-small text-muted">${p.especie} • ${p.edad}</div>
                </td>
                <td>
                    <span class="badge ${p.tipo === 'Social' ? 'badge-success' : 'badge-primary'}">
                        ${p.tipo || 'Comercial'}
                    </span>
                </td>
                <td>
                    <button class="btn btn-outline btn-sm btn-atender" data-id="${p.id}">
                        Atender
                    </button>
                </td>
            </tr>
        `).join('');

        // Delegación de eventos para los botones de la tabla
        document.querySelectorAll('.btn-atender').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                this.activarPanelAtencion(id);
            });
        });
    }

    activarPanelAtencion(idPaciente) {
        // 1. Encontrar al paciente en nuestro estado local
        this.pacienteActivo = this.agenda.find(p => p.id === idPaciente);
        if (!this.pacienteActivo) return;

        // 2. UX: Habilitar y enfocar el panel derecho (Quitar opacidad y bloqueo)
        this.panelAtencion.style.opacity = '1';
        this.panelAtencion.style.pointerEvents = 'auto';
        
        // 3. Llenar los datos visuales e inputs ocultos
        this.labelPacienteActivo.textContent = `Atendiendo a: ${this.pacienteActivo.nombre} (${this.pacienteActivo.especie})`;
        this.inputIdPaciente.value = this.pacienteActivo.id;
        
        // Autoseleccionar el tipo de atención si ya venía predefinido en la cita
        if(this.pacienteActivo.tipo) {
            document.getElementById('atencion-tipo').value = this.pacienteActivo.tipo;
        }

        // Enfocar automáticamente el primer campo para ahorrarle clicks al doctor
        document.getElementById('atencion-notas').focus();
    }

    desactivarPanelAtencion() {
        this.pacienteActivo = null;
        this.formAtencion.reset();
        this.labelPacienteActivo.textContent = 'Ningún paciente seleccionado';
        this.panelAtencion.style.opacity = '0.5';
        this.panelAtencion.style.pointerEvents = 'none';
    }

    async handleSubmit(event) {
        event.preventDefault();

        if (!this.pacienteActivo) return;

        const notas = document.getElementById('atencion-notas').value;
        const farmaco = document.getElementById('atencion-farmaco').value;
        const cantidad = document.getElementById('atencion-cantidad').value;
        const tipoAtencion = document.getElementById('atencion-tipo').value;

        // 1. Construir la Orden Médica / Receta
        const registroMedico = {
            pacienteId: this.pacienteActivo.id,
            nombrePaciente: this.pacienteActivo.nombre,
            diagnostico: notas,
            farmacoRecetado: farmaco || null,
            cantidad: farmaco ? parseInt(cantidad) : 0,
            tipo: tipoAtencion,
            fecha: new Date().toISOString()
        };

        try {
            // 2. Guardar el registro clínico
            await StorageService.create('historiasClinicas', registroMedico);

            // 3. Si recetó fármaco, enviar una orden pendiente a Almacén
            if (farmaco) {
                await StorageService.create('ordenesFarmacia', {
                    paciente: this.pacienteActivo.nombre,
                    farmaco: farmaco,
                    cantidad: parseInt(cantidad),
                    tipo: tipoAtencion,
                    estado: 'Pendiente de Despacho'
                });
            }

            // 4. Actualizar el estado del paciente en la agenda a "Atendido"
            await StorageService.update('agendaPacientes', this.pacienteActivo.id, {
                estado: 'Atendido'
            });

            // 5. UX: Feedback y reset
            alert(`Consulta finalizada con éxito. ${farmaco ? 'Receta enviada a almacén.' : ''}`);
            this.desactivarPanelAtencion();
            await this.loadAgenda(); // Recargar la tabla izquierda (el paciente desaparecerá)

        } catch (error) {
            console.error("Error al procesar la atención:", error);
            alert("Error del sistema. Intente de nuevo.");
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new VetDashboard();
});